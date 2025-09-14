import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, GenerateContentRequest } from '@google/generative-ai';
import type { TravelPlan, Destination } from '../src/types';

// Vercel 환경 변수에서 API 키를 가져옵니다.
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// 안전 설정
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const generationConfig: GenerationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

// 여행 계획 생성을 위한 스키마 (기존 geminiService.ts에서 가져옴)
const travelPlanSchema = {
    type: "OBJECT",
    properties: {
        tripTitle: { type: "STRING", description: "여행에 대한 창의적인 제목" },
        dailyItinerary: {
            type: "ARRAY",
            description: "일일 여행 일정",
            items: {
                type: "OBJECT",
                properties: {
                    day: { type: "STRING", description: "여행일(예: '1일차')" },
                    date: { type: "STRING", description: "해당 날짜" },
                    theme: { type: "STRING", description: "그날의 테마 (예: '역사적인 교토 탐험')" },
                    schedule: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                time: { type: "STRING", description: "시간 (예: '09:00 AM')" },
                                activity: { type: "STRING", description: "활동" },
                                description: { type: "STRING", description: "활동에 대한 간략한 설명" },
                            },
                        },
                    },
                },
            },
        },
        hotelRecommendations: {
            type: "ARRAY",
            description: "추천 호텔 목록",
            items: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING", description: "호텔 이름" },
                    area: { type: "STRING", description: "호텔 위치 지역" },
                    priceRange: { type: "STRING", description: "가격대" },
                    notes: { type: "STRING", description: "추천 이유" },
                },
            },
        },
        transportationGuide: {
            type: "STRING",
            description: "여행지 내 교통편 안내 (추천 패스 등)",
        },
        restaurantRecommendations: {
            type: "ARRAY",
            description: "추천 음식점 목록",
            items: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING", description: "음식점 이름" },
                    area: { type: "STRING", description: "음식점 위치 지역" },
                    notes: { type: "STRING", description: "추천 메뉴 또는 특징" },
                },
            },
        },
    },
};


export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정 (다른 도메인에서의 요청을 허용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
    
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, payload } = req.body;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      // safetySettings, // 필요시 안전 설정 활성화
      // generationConfig, // 필요시 생성 설정 활성화
    });

    if (action === 'generatePlan') {
      const { destination, startDate, endDate, mustVisitPlaces } = payload;
      
      const mustVisitText = mustVisitPlaces.length > 0
        ? `사용자가 꼭 방문하고 싶어하는 장소는 다음과 같습니다:\n- ${mustVisitPlaces.join('\n- ')}\n이 장소들을 반드시 일정에 포함시켜 주세요.`
        : '사용자가 지정한 필수 방문 장소는 없습니다.';
      
      let hotelInstruction = destination === '오사카 & 교토' 
        ? `\n**숙소 추천에 대한 특별 요청:**\n- 오사카역, 난바역, 교토역 근처 중심으로 추천해주세요.\n- 중학생 딸과 함께 지내기 좋은 곳이어야 합니다.\n- 가성비를 가장 중요한 요소로 고려해주세요.`
        : `\n**숙소 추천에 대한 일반 요청:**\n- 교통이 편리한 중심가에 위치한 호텔을 추천해주세요.\n- 가성비를 중요한 요소로 고려해주세요.`;
      
      const prompt = `
        당신은 일본 전문 여행 플래너입니다. ${startDate}부터 ${endDate}까지 ${destination}으로 떠나는 여행을 위한 상세한 계획을 세워주세요. 출발지는 대한민국 서울입니다.
        ${mustVisitText}
        ${hotelInstruction}
        논리적이고 효율적인 동선으로 일정을 계획하고, 모든 필수 방문 장소를 포함해야 합니다. 실용적이고 유용한 팁도 함께 제공해주세요.
        결과는 반드시 지정된 JSON 형식으로만 제공해야 합니다. 다른 설명은 추가하지 마세요.
      `;

      const reqBody: GenerateContentRequest = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ functionDeclarations: [{ name: "travelPlan", description: "Returns the travel plan", parameters: travelPlanSchema }] }],
        toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["travelPlan"] } }
      };
      
      const result = await model.generateContent(reqBody);
      const call = result.response.functionCalls()?.[0];
      
      if (!call) {
        // 때때로 모델이 함수 호출 대신 텍스트를 반환할 수 있습니다.
        const textResponse = result.response.text();
        try {
            // 텍스트 응답이 JSON 형식인지 확인
            const parsedJson = JSON.parse(textResponse);
            return res.status(200).json(parsedJson);
        } catch(e) {
            console.error("Failed to parse text response as JSON:", textResponse);
            throw new Error("AI가 유효한 여행 계획을 생성하지 못했습니다. (텍스트 응답)");
        }
      }

      const plan: TravelPlan = call.args as any;
      return res.status(200).json(plan);

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
    res.status(500).json({ error: "AI 요청 처리 중 오류가 발생했습니다." });
  }
}