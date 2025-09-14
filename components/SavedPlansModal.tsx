import React from 'react';
import type { SavedPlan } from '../types';

interface SavedPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedPlans: SavedPlan[];
  onLoadPlan: (plan: SavedPlan) => void;
  onDeletePlan: (planId: number) => void;
}

const XIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const TrashIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

const SavedPlansModal: React.FC<SavedPlansModalProps> = ({ isOpen, onClose, savedPlans, onLoadPlan, onDeletePlan }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-plans-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative m-4 transform transition-transform duration-300 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Close modal"
        >
          <XIcon className="w-6 h-6" />
        </button>
        <div className="p-6">
          <h2 id="saved-plans-title" className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">저장된 여행 계획</h2>
          {savedPlans.length === 0 ? (
            <p className="text-gray-500 text-center py-8">저장된 계획이 없습니다.</p>
          ) : (
            <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {savedPlans.map(savedPlan => (
                <li key={savedPlan.id} className="bg-gray-50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border border-gray-200">
                  <div>
                    <h3 className="font-bold text-rose-600">{savedPlan.plan.tripTitle}</h3>
                    <p className="text-sm text-gray-600">{savedPlan.destination} | {savedPlan.startDate} ~ {savedPlan.endDate}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
                    <button onClick={() => onLoadPlan(savedPlan)} className="bg-blue-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-600 transition-colors text-sm">
                      불러오기
                    </button>
                    <button onClick={() => onDeletePlan(savedPlan.id)} className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition-colors" aria-label={`'${savedPlan.plan.tripTitle}' 계획 삭제`}>
                       <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default SavedPlansModal;
