import { Destination, type TravelPlan } from '../types';

// API 엔드포인트 URL
// Vercel에 배포된 서버리스 함수를 가리키는 상대 경로입니다.
const API_BASE_URL = '/api/japan-travel';

/**
 * 서버 API에 요청을 보내는 범용 함수
 * @param action 수행할 작업 (예: 'generatePlan', 'searchInfo')
 * @param payload 작업에 필요한 데이터
 * @returns API 응답 (JSON)
 */
async function fetchFromApi(action: string, payload: any) {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
    });

    // 응답이 성공적이지 않으면 에러를 처리합니다.
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '서버 응답을 파싱할 수 없습니다.' }));
      throw new Error(errorData.error || `서버 오류: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API 요청 실패 (${action}):`, error);
    // 에러를 다시 던져서 호출한 쪽에서 처리할 수 있도록 합니다.
    throw error;
  }
}

/**
 * AI 여행 계획 생성을 요청하는 함수
 */
export const generateTravelPlan = async (
  destination: Destination,
  startDate: string,
  endDate: string,
  mustVisitPlaces: string[]
): Promise<TravelPlan> => {
  try {
    // 'generatePlan' 액션으로 서버에 여행 계획 생성을 요청합니다.
    const plan = await fetchFromApi('generatePlan', { destination, startDate, endDate, mustVisitPlaces });
    return plan;
  } catch (error) {
     // 사용자에게 표시될 에러 메시지
     throw new Error("AI 여행 계획 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
};

/**
 * 간단한 정보 검색을 요청하는 함수
 */
export const searchInformation = async (query: string): Promise<string> => {
  try {
    // 'searchInfo' 액션으로 서버에 정보 검색을 요청합니다.
    const data = await fetchFromApi('searchInfo', { query });
    return data.result;
  } catch (error) {
    // 사용자에게 표시될 에러 메시지
    throw new Error("정보 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
};