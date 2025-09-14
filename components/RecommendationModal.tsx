import React, { useEffect } from 'react';
import type { Recommendation, HotelRecommendation } from '../types';

interface RecommendationModalProps {
  item: Recommendation | HotelRecommendation;
  onClose: () => void;
}

const XIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;


const RecommendationModal: React.FC<RecommendationModalProps> = ({ item, onClose }) => {
  // 'Escape' 키를 누르면 모달을 닫습니다.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
  
  // 항목이 HotelRecommendation 타입인지 확인하는 타입 가드
  const isHotel = (item: Recommendation | HotelRecommendation): item is HotelRecommendation => {
    return 'priceRange' in item;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recommendation-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative m-4 transform transition-transform duration-300 scale-95 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Close modal"
        >
          <XIcon className="w-6 h-6" />
        </button>
        
        <div className="p-6 sm:p-8">
            <h3 id="recommendation-title" className="text-2xl font-bold text-gray-800 mb-2">{item.name}</h3>
            <div className="flex items-center text-sm text-gray-500 mb-4 border-b pb-3">
                <span className="font-semibold">{item.area}</span>
                {isHotel(item) && item.priceRange && (
                    <>
                        <span className="mx-2">|</span>
                        <span>{item.priceRange}</span>
                    </>
                )}
            </div>
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{item.notes}</p>
        </div>
      </div>
       <style>{`
        @keyframes scale-in {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
            animation: scale-in 0.2s ease-out forwards;
        }
    `}</style>
    </div>
  );
};

export default RecommendationModal;
