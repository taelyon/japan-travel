import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { put, list, del } from '@vercel/blob'; // Blob 사용을 위해 import
import type { TravelPlan, Destination, SavedPlan } from './types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { action, payload } = req.body;

  try {
    // --- 저장된 모든 계획 파일 불러오기 ---
    if (action === 'getPlans') {
      const { blobs } = await list({ prefix: 'plans/', mode: 'folded' });
      const plans: SavedPlan[] = await Promise.all(
        blobs.map(async (blob) => {
          const response = await fetch(blob.url);
          return response.json();
        })
      );
      // 최신순으로 정렬
      plans.sort((a, b) => b.id - a.id);
      return res.status(200).json(plans);
    }

    // --- 새로운 계획을 JSON 파일로 저장하기 ---
    if (action === 'savePlan') {
      const newPlan = payload as SavedPlan;
      const fileName = `plans/${newPlan.id}.json`;
      
      await put(fileName, JSON.stringify(newPlan), {
        access: 'public',
        contentType: 'application/json',
      });
      // 저장 후 전체 목록을 다시 불러와서 반환
      const { blobs } = await list({ prefix: 'plans/', mode: 'folded' });
      const plans: SavedPlan[] = await Promise.all(blobs.map(async (blob) => (await fetch(blob.url)).json()));
      plans.sort((a, b) => b.id - a.id);
      return res.status(200).json(plans);
    }
    
    // --- 기존 계획 파일 삭제하기 ---
    if (action === 'deletePlan') {
      const { planId } = payload;
      const { blobs } = await list({ prefix: `plans/${planId}.json`, mode: 'folded' });
      
      if(blobs.length === 0) {
        return res.status(404).json({ error: '삭제할 파일을 찾을 수 없습니다.' });
      }
      // 해당 URL의 파일을 삭제
      await del(blobs.map(blob => blob.url));

      // 삭제 후 전체 목록을 다시 불러와서 반환
      const updatedBlobs = (await list({ prefix: 'plans/', mode: 'folded' })).blobs;
      const plans: SavedPlan[] = await Promise.all(updatedBlobs.map(async (blob) => (await fetch(blob.url)).json()));
      plans.sort((a, b) => b.id - a.id);
      return res.status(200).json(plans);
    }

    // --- AI 여행 계획 생성 (기존 코드와 유사) ---
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: "서버 설정 오류" });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    if (action === 'generatePlan') {
        const { destination, startDate, endDate, mustVisitPlaces } = payload;
        const prompt = `
            일본 ${destination}으로 ${startDate}부터 ${endDate}까지 여행 계획을 짜줘.
            필수 방문 장소: ${mustVisitPlaces.join(', ')}.
            숙소와 맛집은 각각 5개 이상 추천해줘.
            결과는 반드시 JSON 형식으로만 반환해줘. 설명은 생략해줘.`;
        
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().replace(/^```json\s*|```\s*$/g, '');
        return res.status(200).json(JSON.parse(text));
    }

    if (action === 'searchInfo') {
        const { query } = payload;
        const prompt = `일본 여행 관련 질문 "${query}"에 대해 간결하게 답변해줘.`;
        const result = await model.generateContent(prompt);
        return res.status(200).json({ result: result.response.text() });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error("API Error:", error);
    const message = error instanceof Error ? error.message : "요청 처리 중 오류 발생";
    return res.status(500).json({ error: message });
  }
}