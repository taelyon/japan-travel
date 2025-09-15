import React, { useState } from 'react';
import type { TravelPlan, Recommendation, HotelRecommendation, Destination } from '../types';
import { DESTINATION_AIRPORTS } from '../constants';

interface PlanDisplayProps {
  plan: TravelPlan;
  startDate: string;
  endDate: string;
  destination: Destination;
  onSavePlan: () => void;
}

const IconMap: { [key: string]: React.FC<{className?: string}> } = {
  Hotel: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0v-4a2 2 0 012-2h6a2 2 0 012 2v4m-6 0h-2" /></svg>,
  Restaurant: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18M3 7h18M3 11h18M3 15h18M3 19h18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20" /></svg>,
  Transport: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
  Flight: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>,
  Save: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
  Share: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.19.02.38.05.57.092m0 0a2.25 2.25 0 1 1-3.182 3.182m3.182-3.182a2.25 2.25 0 0 0 3.182 3.182M12 18a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5m0 0c.19.02.38.05.57.092m0 0a2.25 2.25 0 1 1-3.182-3.182m3.182 3.182a2.25 2.25 0 0 0 3.182-3.182m-3.182-3.182c-.19.02-.38.05-.57.092m0 0a2.25 2.25 0 1 1 3.182-3.182M12 6a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0 4.5m0 0c-.19.02-.38.05-.57.092m0 0a2.25 2.25 0 1 1 3.182 3.182" /></svg>,
};
const CalendarIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ClockIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const formatPlanForSharing = (plan: TravelPlan, destination: Destination, startDate: string, endDate: string): string => {
    let text = `🌸 **${plan.tripTitle}** 🌸\n\n`;
    text += `✈️ **여행지:** ${destination}\n`;
    text += `🗓️ **기간:** ${startDate} ~ ${endDate}\n\n`;

    text += "--- **상세 일정** ---\n\n";
    plan.dailyItinerary.forEach(day => {
        text += `**${day.day} (${day.date}): ${day.theme}**\n`;
        day.schedule.forEach(item => {
            text += `  - **${item.time}**: ${item.activity} (${item.description})\n`;
        });
        text += "\n";
    });

    text += "--- **추천 숙소** ---\n";
    plan.hotelRecommendations.forEach(hotel => {
        text += `- ${hotel.name} (${hotel.area}, ${hotel.priceRange}) - ${hotel.notes}\n`;
    });
    text += "\n";
    
    text += "--- **추천 맛집** ---\n";
    plan.restaurantRecommendations.forEach(resto => {
        text += `- ${resto.name} (${resto.area}) - ${resto.notes}\n`;
    });
    text += "\n";

    text += `--- **교통편 가이드** ---\n${plan.transportationGuide}\n\n`;
    text += "AI 일본 여행 플래너로 생성됨";

    return text;
};


const PlanDisplay: React.FC<PlanDisplayProps> = ({ plan, startDate, endDate, destination, onSavePlan }) => {
  const [copySuccess, setCopySuccess] = useState('');

  const departureAirport = 'ICN';
  const destinationAirport = DESTINATION_AIRPORTS[destination];
  const flightSearchUrl = `https://www.google.com/flights?hl=ko&q=${departureAirport}%20to%20${destinationAirport}%20on%20${startDate}%20through%20${endDate}`;

   const handleShare = async () => {
    const formattedPlan = formatPlanForSharing(plan, destination, startDate, endDate);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: plan.tripTitle,
          text: formattedPlan,
        });
      } catch (error) {
        console.error('공유 기능 에러:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(formattedPlan);
        setCopySuccess('클립보드에 복사되었습니다!');
        setTimeout(() => setCopySuccess(''), 2000);
      } catch (error) {
        console.error('클립보드 복사 에러:', error);
        setCopySuccess('복사에 실패했습니다.');
        setTimeout(() => setCopySuccess(''), 2000);
      }
    }
  };

  return (
    <div className="w-full divide-y divide-gray-200">
      <header className="text-center relative pb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-800 tracking-tight">{plan.tripTitle}</h1>
        <div className="flex items-center justify-center sm:justify-end gap-2 mt-4 sm:absolute sm:top-0 sm:right-0 sm:mt-0">
          <button
            onClick={onSavePlan}
            className="bg-white border border-rose-500 text-rose-500 p-2 rounded-full shadow-md hover:bg-rose-50 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
            title="이 여행 계획 저장하기"
            aria-label="이 여행 계획 저장하기"
          >
            <IconMap.Save className="w-6 h-6" />
          </button>
           <button
            onClick={handleShare}
            className="bg-white border border-blue-500 text-blue-500 p-2 rounded-full shadow-md hover:bg-blue-50 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
            title="여행 계획 공유하기"
            aria-label="여행 계획 공유하기"
          >
            <IconMap.Share className="w-6 h-6" />
          </button>
          {copySuccess && <span className="absolute -bottom-8 text-sm bg-gray-800 text-white px-2 py-1 rounded-md shadow-lg transition-opacity duration-300">{copySuccess}</span>}
        </div>
      </header>
      
      <section className="py-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <CalendarIcon className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500" />
          상세 일정
        </h2>
        <div className="space-y-8">
          {plan.dailyItinerary.map((day, index) => (
            <div key={index} className="sm:bg-white sm:p-4 sm:p-6 rounded-xl sm:shadow-md sm:border sm:border-gray-200">
              <div className="mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-rose-600">{day.day} <span className="text-gray-500 font-medium text-lg sm:text-xl">({day.date})</span></h3>
                <p className="text-base sm:text-lg text-gray-600 italic">"{day.theme}"</p>
              </div>
              <div className="relative border-l-2 border-rose-200 ml-3 pl-6 space-y-6">
                {day.schedule.map((item, i) => (
                  <div key={i} className="relative">
                     <div className="absolute -left-[34px] top-1.5 w-4 h-4 bg-white rounded-full border-2 border-rose-500"></div>
                     <p className="font-semibold text-gray-800 flex items-center gap-2"><ClockIcon className="w-5 h-5 text-gray-500"/>{item.time} - {item.activity}</p>
                     <p className="text-gray-600 pl-1">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 flex items-center gap-3">
              <IconMap.Flight className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500" />
              항공권 조회
          </h2>
          <p className="text-gray-600 mb-4 text-sm sm:text-base">
              서울({departureAirport})에서 {destination}({destinationAirport})까지의 {startDate} ~ {endDate} 기간 항공권을 확인해보세요.
          </p>
          <a
              href={flightSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full sm:w-auto bg-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-600 transform hover:-translate-y-0.5 transition-all duration-300"
          >
              <IconMap.Flight className="w-5 h-5 mr-2" />
              Google Flights에서 최저가 찾기
          </a>
      </section>

      <div className="py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecommendationCard 
          title="숙소 추천" 
          Icon={IconMap.Hotel} 
          items={plan.hotelRecommendations} 
        />
        <RecommendationCard 
          title="맛집 추천" 
          Icon={IconMap.Restaurant} 
          items={plan.restaurantRecommendations}
        />
      </div>

       <section className="pt-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 flex items-center gap-3">
             <IconMap.Transport className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500" />
            교통편 가이드
          </h2>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{plan.transportationGuide}</p>
      </section>
      
    </div>
  );
};

interface RecommendationCardProps {
    title: string;
    Icon: React.FC<{className?: string}>;
    items: (HotelRecommendation | Recommendation)[];
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ title, Icon, items }) => {
    const handleItemClick = (item: HotelRecommendation | Recommendation) => {
        const query = encodeURIComponent(`${item.name}, ${item.area}`);
        const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        // ✨ 이 부분의 클래스를 수정했습니다.
        <div className="sm:bg-white sm:p-6 sm:rounded-xl sm:shadow-md sm:border sm:border-gray-200">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500" />
                {title}
            </h2>
            <ul className="space-y-2">
                {items.map((item, index) => (
                    <li 
                      key={index} 
                      className="border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-rose-50 p-3 rounded-lg transition-colors -mx-3 sm:mx-0"
                      onClick={() => handleItemClick(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleItemClick(item)}
                      title={`${item.name} 정보 Google 지도에서 보기`}
                    >
                        <h4 className="font-bold text-base sm:text-lg text-gray-800">{item.name}</h4>
                        <p className="text-sm text-gray-500">{item.area}{'priceRange' in item && ` - ${item.priceRange}`}</p>
                        <p className="text-gray-600 mt-1 whitespace-pre-wrap text-sm sm:text-base">{item.notes}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default PlanDisplay;