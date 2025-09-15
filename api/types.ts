export enum Destination {
  OSAKA_KYOTO = '오사카 & 교토',
  TOKYO = '도쿄',
  FUKUOKA = '후쿠오카',
}

export interface ScheduleItem {
  time: string;
  activity: string;
  description: string;
}

export interface DailyPlan {
  day: string;
  date: string;
  theme: string;
  schedule: ScheduleItem[];
}

export interface Recommendation {
    name: string;
    area: string;
    notes: string;
    rating: number;
}

export interface HotelRecommendation extends Recommendation {
    priceRange: string;
}

export interface TravelPlan {
  tripTitle: string;
  dailyItinerary: DailyPlan[];
  hotelRecommendations: HotelRecommendation[];
  transportationGuide: string;
  restaurantRecommendations: Recommendation[];
}

export interface SavedPlan {
  id: number;
  plan: TravelPlan;
  destination: Destination;
  startDate: string;
  endDate: string;
}