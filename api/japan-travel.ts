import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { TravelPlan, Destination } from './types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
    
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // --- API 키 확인 로직을 핸들러 함수 안으로 이동 ---
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    console.error("GEMINI_API_KEY environment variable not set");
    return res.status(500).json({ error: "서버 설정에 오류가 발생했습니다. 관리자에게 문의하세요." });
  }
  // --- 수정 완료 ---

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
  });

  const { action, payload } = req.body;

  try {
    if (action === 'generatePlan') {
      const { destination, startDate, endDate, mustVisitPlaces } = payload as {
        destination: Destination;
        startDate: string;
        endDate: string;
        mustVisitPlaces: string[];
      };
      
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
        논리적이고 효율적인 동선으로 일정을 계획하고, 모든 필수 방문 장소를 포함해야 합니다. 실용적이고 유용한 팁도 함께 제공해주세요.
        결과는 반드시 아래와 같은 JSON 형식으로만 제공해야 합니다. 다른 설명이나 markdown 포맷 없이 순수한 JSON 객체만 반환해주세요.
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
        const parsedJson: TravelPlan = JSON.parse(textResponse);
        return res.status(200).json(parsedJson);
      } catch(e) {
        console.error("AI 응답을 JSON으로 파싱하는데 실패했습니다:", textResponse);
        throw new Error("AI가 유효한 여행 계획을 생성하지 못했습니다.");
      }

    } else if (action === 'searchInfo') {
      const { query } = payload;
      const prompt = `일본 여행과 관련된 다음 질문에 대해 간결하고 유용한 답변을 한국어로 제공해주세요: "${query}"`;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return res.status(200).json({ result: text });

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error("API Error:", error);
    const message = error instanceof Error ? error.message : "AI 요청 처리 중 오류가 발생했습니다.";
    res.status(500).json({ error: message });
  }
}