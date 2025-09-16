import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { put, list, del } from '@vercel/blob';
import type { SavedPlan } from '../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { action, payload } = req.body;

  try {
    // getPlans, savePlan, deletePlan 로직은 이전과 동일합니다.
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
      const filePathToDelete = `plans/${planId}.json`;
      try {
        const { blobs } = await list({ prefix: 'plans/' });
        const blobToDelete = blobs.find(blob => blob.pathname === filePathToDelete);
        if (blobToDelete) {
          await del(blobToDelete.url);
        }
      } catch (error) {
        console.error(`[deletePlan] Error during deletion process for ${filePathToDelete}:`, error);
      }

      const updatedBlobs = (await list({ prefix: 'plans/' })).blobs;
      const plans: SavedPlan[] = await Promise.all(updatedBlobs.map(async (blob) => (await fetch(blob.url)).json()));
      plans.sort((a, b) => b.id - a.id);
      return res.status(200).json(plans);
    }

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
        
        // --- 여기부터 프롬프트 수정 ---
        const prompt = `
            당신은 일본 전문 여행 플래너입니다. ${startDate}부터 ${endDate}까지 ${destination}으로 떠나는 여행을 위한 상세한 계획을 세워주세요. 출발지는 대한민국 서울입니다.
            ${mustVisitText}
            ${hotelInstruction}
            
            **주요 지침:**
            1.  **숙소와 맛집:** 실제 존재하는 장소의 이름으로, 각각 최소 5개 이상 추천해주세요.
            2.  **평점:** 모든 추천 장소에 5점 만점의 평점(rating)을 반드시 포함하고, 평점이 높은 순으로 정렬해주세요.
            3.  **상세 일정:** 하루 일정을 아침, 점심, 저녁 식사를 포함하여 최소 5개 이상의 시간대로 세분화하여 계획해주세요.
            4.  **교통편:** 각 일정(schedule) 항목마다 이동을 위한 구체적인 교통편 정보(예: 지하철 노선, 버스 번호, 도보 등), 예상 소요 시간, 예상 요금을 'transportation' 필드에 상세히 작성해주세요.
            5.  **일정 내용:** 각 활동 및 방문 장소에 대한 구체적인 설명, 예상 소요 시간, 팁 등을 **다섯 문장 이상**으로 아주 상세하게 작성해주세요.
            6.  **동선:** 논리적이고 효율적인 동선으로 일정을 계획하고, 모든 필수 방문 장소를 포함해야 합니다.
            7.  **출력 형식:** 결과는 다른 설명이나 markdown 포맷 없이, 아래와 같은 순수한 JSON 형식으로만 반환해주세요.

            **JSON 출력 형식 예시:**
            {
              "tripTitle": "오사카 미식과 교토의 고즈넉함을 담은 3박 4일",
              "dailyItinerary": [{ 
                "day": "1일차", 
                "date": "2025-09-15", 
                "theme": "오사카 도착과 도톤보리의 밤", 
                "schedule": [
                  { 
                    "time": "15:00", 
                    "activity": "간사이 국제공항 도착 및 난카이 전철 탑승", 
                    "description": "간사이 국제공항에 도착하여 입국 심사를 마친 후, 수하물을 찾습니다. 공항 내 표지판을 따라 난카이 전철역으로 이동하세요. 미리 예매한 티켓을 교환하거나 현장에서 티켓을 구매하여 '라피트' 특급열차에 탑승합니다. 지정된 좌석에 앉아 편안하게 난바역까지 약 40분간 이동하며 창밖 풍경을 감상할 수 있습니다. 난바역 도착 후에는 숙소 방향 출구를 미리 확인해두면 편리합니다.",
                    "transportation": "난카이 공항선 급행 (난바 행), 약 45분 소요, 930엔"
                  }
                ] 
              }],
              "hotelRecommendations": [{ "name": "호텔 닛코 오사카", "area": "신사이바시", "priceRange": "20만원 ~ 30만원", "rating": 4.5, "notes": "신사이바시 역과 직접 연결되어 교통이 매우 편리하며, 쇼핑과 관광에 최적의 위치를 자랑합니다." }],
              "transportationGuide": "이 여행에서는 오사카 주유패스와 간사이 쓰루패스를 활용하는 것이 좋습니다. 오사카 시내에서는 주유패스로 대부분의 지하철과 버스를 무제한 이용할 수 있으며, 교토 이동 및 관광 시에는 간사이 쓰루패스가 유용합니다. 각 패스의 가격, 구매처, 사용 가능 노선 등 상세 정보는 여행 전 미리 확인하는 것을 추천합니다.",
              "restaurantRecommendations": [{ "name": "이치란 도톤보리점", "area": "도톤보리", "rating": 4.4, "notes": "개인 맞춤형 주문이 가능한 돈코츠 라멘 전문점. 항상 대기 줄이 길 수 있으니 식사 시간을 피해 방문하는 것이 좋습니다." }]
            }
        `;
        // --- 여기까지 프롬프트 수정 ---

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