import React, { useState, useCallback, useEffect } from 'react';
import { DESTINATIONS } from './constants';
import { Destination } from './types';
import type { TravelPlan, SavedPlan } from './types';
import { generateTravelPlan, searchInformation } from './services/geminiService';
import LoadingSpinner from './components/LoadingSpinner';
import PlanDisplay from './components/PlanDisplay';
import SavedPlansModal from './components/SavedPlansModal';
import SearchResultDisplay from './components/SearchResultDisplay';

const today = new Date().toISOString().split('T')[0];

function App() {
  const [destination, setDestination] = useState<Destination | null>(null);
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>('');
  const [mustVisitInput, setMustVisitInput] = useState<string>('');
  const [mustVisitPlaces, setMustVisitPlaces] = useState<string[]>([]);
  
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [isSavedPlansModalOpen, setIsSavedPlansModalOpen] = useState(false);

  useEffect(() => {
    try {
      const storedPlans = localStorage.getItem('japan-travel-plans');
      if (storedPlans) {
        setSavedPlans(JSON.parse(storedPlans));
      }
    } catch (e) {
      console.error("Failed to load or parse saved plans:", e);
      localStorage.removeItem('japan-travel-plans');
    }
  }, []);

  const updateSavedPlans = (newPlans: SavedPlan[]) => {
    setSavedPlans(newPlans);
    localStorage.setItem('japan-travel-plans', JSON.stringify(newPlans));
  };

  const handleSavePlan = useCallback(() => {
    if (!plan || !destination) return;

    if (savedPlans.some(p => p.plan.tripTitle === plan.tripTitle)) {
        alert('이 계획은 이미 저장되었습니다.');
        return;
    }
    
    const newSavedPlan: SavedPlan = {
      id: Date.now(),
      plan,
      destination,
      startDate,
      endDate,
    };
    
    const newPlans = [...savedPlans, newSavedPlan];
    updateSavedPlans(newPlans);
    alert('여행 계획이 저장되었습니다!');
  }, [plan, destination, startDate, endDate, savedPlans]);

  const handleLoadPlan = (planToLoad: SavedPlan) => {
    setPlan(planToLoad.plan);
    setDestination(planToLoad.destination);
    setStartDate(planToLoad.startDate);
    setEndDate(planToLoad.endDate);
    setMustVisitPlaces([]);
    setSearchResult(null);
    setSearchError(null);
    setError(null);
    setIsSavedPlansModalOpen(false);
  };
  
  const handleDeletePlan = (planId: number) => {
    if (window.confirm('정말로 이 계획을 삭제하시겠습니까?')) {
        const newPlans = savedPlans.filter(p => p.id !== planId);
        updateSavedPlans(newPlans);
    }
  };


  const handleAddMustVisit = () => {
    if (mustVisitInput.trim() && !mustVisitPlaces.includes(mustVisitInput.trim())) {
      setMustVisitPlaces([...mustVisitPlaces, mustVisitInput.trim()]);
      setMustVisitInput('');
    }
  };

  const handleRemoveMustVisit = (placeToRemove: string) => {
    setMustVisitPlaces(mustVisitPlaces.filter(place => place !== placeToRemove));
  };
  
  const handleGeneratePlan = useCallback(async () => {
    if (!destination || !startDate || !endDate) {
      setError("여행지, 시작일, 종료일을 모두 선택해주세요.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
        setError("종료일은 시작일보다 빠를 수 없습니다.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setPlan(null);

    try {
      const generatedPlan = await generateTravelPlan(destination, startDate, endDate, mustVisitPlaces);
      setPlan(generatedPlan);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [destination, startDate, endDate, mustVisitPlaces]);
  
  const handleSearch = useCallback(async () => {
    if(!searchQuery.trim()){
      setSearchError('검색어를 입력해주세요.');
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);
    try {
        const result = await searchInformation(searchQuery);
        setSearchResult(result);
    } catch (e: unknown) {
        setSearchError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
        setIsSearching(false);
    }
  }, [searchQuery]);

  const tripDuration = (() => {
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end >= start) {
            const diffTime = end.getTime() - start.getTime();
            const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (nights < 0) return null;
            const days = nights + 1;
            return `${nights}박 ${days}일`;
        }
    }
    return null;
  })();

  const SearchIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
  const PlusIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
  const XIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
  const FolderIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-rose-500 whitespace-nowrap">🌸 AI 일본 여행 플래너</h1>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setIsSavedPlansModalOpen(true)}
                className="p-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                title="저장된 계획 불러오기"
                aria-label="저장된 계획 불러오기"
              >
                <FolderIcon className="w-6 h-6"/>
              </button>
              <div className="relative w-full sm:max-w-xs lg:max-w-sm">
                  <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="'유니버셜 스튜디오' 등 질문"
                      className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                  />
                  <button onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-rose-500 rounded-full transition-colors">
                      <SearchIcon className="w-5 h-5" />
                  </button>
              </div>
            </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-lg border border-gray-200 self-start">
            <div className="space-y-6">
              <div>
                <label htmlFor="destination-select" className="block text-lg font-semibold mb-2 text-gray-700">1. 여행지 선택</label>
                <div className="relative">
                  <select
                    id="destination-select"
                    value={destination || ''}
                    onChange={(e) => setDestination(e.target.value as Destination)}
                    className="w-full p-3 appearance-none bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-400 cursor-pointer"
                    aria-label="여행지 선택"
                  >
                    <option value="" disabled>여행지를 선택하세요</option>
                    {DESTINATIONS.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="block text-lg font-semibold text-gray-700">2. 날짜 선택</label>
                  {tripDuration && (
                    <span className="text-sm text-rose-600 font-bold">{tripDuration}</span>
                  )}
                </div>
                <div className="flex flex-row gap-2 items-center">
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    min={today} 
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-400"
                  />
                  <span className="text-gray-500 font-semibold">~</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    min={startDate || today} 
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-lg font-semibold mb-2 text-gray-700">3. 여행 조건 추가 (선택)</label>
                 <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={mustVisitInput}
                        onChange={(e) => setMustVisitInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMustVisit()}
                        placeholder="예: 유아 동반, 맛집 위주"
                        className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-400 min-w-0"
                    />
                    <button onClick={handleAddMustVisit} className="bg-rose-500 text-white p-2 rounded-md hover:bg-rose-600 transition-colors flex-shrink-0">
                        <PlusIcon className="w-6 h-6"/>
                    </button>
                 </div>
                 <div className="mt-3 flex flex-wrap gap-2">
                    {mustVisitPlaces.map(place => (
                        <span key={place} className="flex items-center bg-rose-100 text-rose-800 text-sm font-medium px-2.5 py-1 rounded-full">
                            {place}
                            <button onClick={() => handleRemoveMustVisit(place)} className="ml-1.5">
                                <XIcon className="w-4 h-4 text-rose-500 hover:text-rose-700"/>
                            </button>
                        </span>
                    ))}
                 </div>
              </div>
              
              <button
                onClick={handleGeneratePlan}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '계획 생성 중...' : '나만의 여행 계획 만들기'}
              </button>
              {error && <p className="text-red-500 text-center">{error}</p>}
            </div>
          </aside>

          <section className="lg:col-span-8 bg-white/50 p-4 sm:p-6 rounded-2xl min-h-[60vh] flex items-center justify-center">
             {searchResult || searchError || isSearching ? (
                 <div className="w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold">검색 결과</h2>
                      <button onClick={() => { setSearchResult(null); setSearchError(null); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm font-semibold w-full sm:w-auto">
                          계획으로 돌아가기
                      </button>
                    </div>
                    {isSearching && <LoadingSpinner />}
                    {searchError && <p className="text-red-500">{searchError}</p>}
                    {searchResult && <SearchResultDisplay result={searchResult} />}
                 </div>
             ) : isLoading ? (
              <LoadingSpinner />
            ) : plan && destination ? (
              <PlanDisplay plan={plan} destination={destination} startDate={startDate} endDate={endDate} onSavePlan={handleSavePlan} />
            ) : (
              <div className="text-center text-gray-500 px-4">
                <div className="text-5xl sm:text-6xl mb-4">🗺️</div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">여행 계획을 생성해보세요!</h2>
                <p className="text-base">옵션을 선택하고 버튼을 누르면 AI가 맞춤 여행을 설계해 드립니다.</p>
              </div>
            )}
          </section>
        </div>
      </main>
      <SavedPlansModal 
        isOpen={isSavedPlansModalOpen}
        onClose={() => setIsSavedPlansModalOpen(false)}
        savedPlans={savedPlans}
        onLoadPlan={handleLoadPlan}
        onDeletePlan={handleDeletePlan}
      />
    </div>
  );
}

export default App;