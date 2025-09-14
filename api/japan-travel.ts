import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { put, list, del } from '@vercel/blob';
import type { SavedPlan } from './types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { action, payload } = req.body;

  try {
    if (action === 'getPlans') {
      const { blobs } = await list({ prefix: 'plans/' });
      const plans: SavedPlan[] = await Promise.all(
        blobs.map(async (blob) => {
          const response = await fetch(blob.url);
          return response.json();
        })
      );
      plans.sort((a, b) => b.id - a.id);
      return res.status(200).json(plans);
    }

    if (action === 'savePlan') {
      const newPlan = payload as SavedPlan;
      const fileName = `plans/${newPlan.id}.json`;
      await put(fileName, JSON.stringify(newPlan), { access: 'public', contentType: 'application/json' });
      
      const { blobs } = await list({ prefix: 'plans/' });
      const plans: SavedPlan[] = await Promise.all(blobs.map(async (blob) => (await fetch(blob.url)).json()));
      plans.sort((a, b) => b.id - a.id);
      return res.status(200).json(plans);
    }
    
    if (action === 'deletePlan') {
      const { planId } = payload;
      const { blobs } = await list({ prefix: `plans/${planId}.json` });
      
      if (blobs.length > 0) {
        // del 함수는 URL 배열을 받아 처리합니다.
        await del(blobs.map(blob => blob.url));
      }

      const updatedBlobs = (await list({ prefix: 'plans/' })).blobs;
      const plans: SavedPlan[] = await Promise.all(updatedBlobs.map(async (blob) => (await fetch(blob.url)).json()));
      plans.sort((a, b) => b.id - a.id);
      return res.status(200).json(plans);
    }

    // --- 이하 Gemini API 관련 코드는 동일 ---
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: "서버에 API 키가 설정되지 않았습니다." });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ]
    });

    if (action === 'generatePlan') {
        const { destination, startDate, endDate, mustVisitPlaces } = payload;
        
        const mustVisitText = mustVisitPlaces.length > 0
            ? `사용자가 꼭 방문하고 싶어하는 장소는 다음과 같습니다:\n- ${mustVisitPlaces.join('\n- ')}\n이 장소들을 반드시 일정에 포함시켜 주세요.`
            : '사용자가 지정한 필수 방문 장소는 없습니다.';
      
        const hotelInstruction = destination === '오사카 & 교토' 
            ? `\n**숙소 추천에 대한 특별 요청:**\n- 오사카역, 난바역, 교토역 근처 중심으로 추천해주세요.\n- 중학생 딸과 함께 지내기 좋은 곳이어야 합니다.\n- 가성비를 가장 중요한 요소로 고려해주세요.`
            : `\n**숙소 추천에 대한 일반 요청:**\n- 교통이 편리한 중심가에 위치한 호텔을 추천해주세요.\n- 가성비를 중요한 요소로 고려해주세요.`;
        
        const prompt = `
            당신은 일본 전문 여행 플래너입니다. ${startDate}부터 ${endDate}까지 ${destination}으로 떠나는 여행을 위한 상세한 계획을 세워주세요. 출발지는 대한민국 서울입니다.
            ${mustVisitText}
            ${hotelInstruction}
            **숙소와 맛집은 다양한 선택지를 제공할 수 있도록 각각 최소 5개 이상 추천해주세요.**
            논리적이고 효율적인 동선으로 일정을 계획하고, 모든 필수 방문 장소를 포함해야 합니다. 실용적이고 유용한 팁도 함께 제공해주세요.
            결과는 반드시 아래와 같은 순수한 JSON 형식으로만 제공해야 합니다. 다른 설명이나 markdown 포맷 없이 오직 JSON 객체만 반환해주세요.
            {
              "tripTitle": "여행 제목",
              "dailyItinerary": [{ "day": "1일차", "date": "YYYY-MM-DD", "theme": "테마", "schedule": [{ "time": "HH:MM", "activity": "활동", "description": "설명" }] }],
              "hotelRecommendations": [{ "name": "호텔 이름", "area": "지역", "priceRange": "가격대", "notes": "추천 이유" }],
              "transportationGuide": "교통편 안내",
              "restaurantRecommendations": [{ "name": "음식점 이름", "area": "지역", "notes": "추천 메뉴" }]
            }
        `;

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();

        try {
            const cleanedResponse = textResponse.replace(/^```json\s*|```\s*$/g, '');
            const parsedJson = JSON.parse(cleanedResponse);
            return res.status(200).json(parsedJson);
        } catch (e) {
            console.error("AI 응답을 JSON으로 파싱하는데 실패했습니다:", textResponse);
            return res.status(500).json({ error: "AI가 여행 계획을 생성하는 데 실패했습니다. 잠시 후 다시 시도해 주세요." });
        }
    }

    if (action === 'searchInfo') {
        const { query } = payload;
        const prompt = `일본 여행과 관련된 다음 질문에 대해 간결하고 유용한 답변을 한국어로 제공해주세요: "${query}"`;
        const result = await model.generateContent(prompt);
        return res.status(200).json({ result: result.response.text() });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error("API Error:", error);
    const message = error instanceof Error ? error.message : "요청 처리 중 알 수 없는 오류가 발생했습니다.";
    return res.status(500).json({ error: message });
  }
}