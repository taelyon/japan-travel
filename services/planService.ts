import type { SavedPlan } from '../types';

const API_BASE_URL = '/api/japan-travel';

async function fetchFromApi(action: string, payload?: any) {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '서버 응답 오류' }));
      throw new Error(errorData.error || '알 수 없는 서버 오류');
    }
    return await response.json();
  } catch (error) {
    console.error(`API 요청 실패 (${action}):`, error);
    throw error;
  }
}

/**
 * 저장된 모든 여행 계획을 서버에서 가져옵니다.
 */
export const getSavedPlans = async (): Promise<SavedPlan[]> => {
    return fetchFromApi('getPlans');
};

/**
 * 새로운 여행 계획을 서버에 저장(업로드)합니다.
 */
export const savePlan = async (newPlan: SavedPlan): Promise<SavedPlan[]> => {
    return fetchFromApi('savePlan', newPlan);
};

/**
 * 특정 여행 계획을 서버에서 삭제합니다.
 */
export const deletePlan = async (planId: number): Promise<SavedPlan[]> => {
    return fetchFromApi('deletePlan', { planId });
};