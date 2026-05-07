import './App.css';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { arrayCycler, runEngine, colorCycle } from 'streetcourts-lib';
import { Navbar } from './components/Navbar';
import { LastCheckinBanner } from './components/LastCheckinBanner';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { COURTS, REAL_DB_USERS } from './data/mockData';
import { MaxPriorityQueue } from './utils/maxPriorityQueue';
import { getCourtBookingsCount } from './utils/bookingStorage';
import { getCourtStatusDotClassName, getCourtStatusText } from './utils/courtPresentation';

function App() { 
const location = useLocation();
const isCourtPage = location.pathname.startsWith('/courts/');
const [borderColor, setBorderColor] = useState("#333");
const [recommendedCourt, setRecommendedCourt] = useState(null); // Task1: рекомендована площадка
const [selectedCourtId, setSelectedCourtId] = useState(null);

useEffect(() => {
  const colorGen = colorCycle(["red", "green", "blue"]);
  const stopColors = runEngine(colorGen, setBorderColor, 500 ); 

  return () => {
    stopColors(); // на всякий випадок очищаємо при анмаунті
  };
}, []);
 const [activeUser, setActiveUser] = useState('Завантаження...');

useEffect(() => {
  // генератор імен
  const nameGen = arrayCycler(REAL_DB_USERS);


  const names = runEngine(nameGen, setActiveUser, 2000); // міняємо ім'я кожні 2 сек

  return () => {
    names();
  };
}, []);


useEffect(() => {
  if (!Array.isArray(COURTS) || COURTS.length === 0) return;

  const courtsWithAddress = COURTS.filter(
    (court) => court?.address && court.address !== 'Київ (адреса невідома)'
  );

  if (courtsWithAddress.length === 0) return;

  const calculatePriority = (court) => {
    const popularityScore = Number(court?.popularity) || 0;
    const bookingScore = Math.min(getCourtBookingsCount(court.id), 40);
    const statusClass = getCourtStatusDotClassName(court);

    let loadBoost = 10;
    if (statusClass.includes('busy')) loadBoost = 28;
    if (statusClass.includes('medium')) loadBoost = 18;
    if (statusClass.includes('free')) loadBoost = 6;

    return popularityScore + bookingScore + loadBoost;
  };

  const buildQueue = () => {
    const q = new MaxPriorityQueue();
    courtsWithAddress.forEach((court) => {
      q.enqueue(court, calculatePriority(court));
    });
    return q;
  };

  let priorityQueue = buildQueue();

  function* recommendationGenerator() {
    while (true) {
      const next = priorityQueue.dequeue();
      if (!next) {
        priorityQueue = buildQueue();
        continue;
      }
      yield next;
    }
  }

  const courtsGen = recommendationGenerator();

  const stopRecommend = runEngine(
    courtsGen,
    (court) => {
      if (court) {
        setRecommendedCourt({
          ...court,
          statusText: getCourtStatusText(court),
        });
      }
    },
    5000
  );

  return () => {
    stopRecommend();
  };
}, []);

  return (
    
    
    <div className={`app${isCourtPage ? ' app--court-page' : ''}`}>
      {/* навігація */}
      <Navbar />

      

      {/* live рамка тих хто чекіниться */}
      <LastCheckinBanner activeUser={activeUser} borderColor={borderColor} />

      {/* рекомендована площадка, що змінюється раз на 5 секунд */}
      {!isCourtPage && (
        <div className="recommended-court-banner">
          {recommendedCourt ? (
            <>
              <div className="recommended-label">Рекомендована площадка</div>
              <div className="recommended-name">{recommendedCourt.name}</div>
              <div className="recommended-address">{recommendedCourt.address}</div>
              <div className="recommended-status">{recommendedCourt.statusText}</div>
            </>
          ) : (
            <div className="recommended-placeholder">Завантаження рекомендованої площадки...</div>
          )}
        </div>
      )}

      {/* головний контейнер */}
      <div className="main-container">
        
        {/* лівий сайдбар */}
        {!isCourtPage && (
          <Sidebar
            courts={COURTS}
            selectedCourtId={selectedCourtId}
            onSelectCourt={(court) => setSelectedCourtId(court?.id ?? null)}
          />
        )}

        {/* права частина карта */}
        {!isCourtPage && (
          <MapView
            courts={COURTS}
            selectedCourtId={selectedCourtId}
            onSelectCourt={(court) => setSelectedCourtId(court?.id ?? null)}
          />
        )}

      </div>
    </div>
  );
}

export default App;