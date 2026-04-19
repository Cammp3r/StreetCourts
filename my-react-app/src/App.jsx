import './App.css';
import { useState, useEffect } from 'react';
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
const [borderColor, setBorderColor] = useState("#333");
const [recommendedCourt, setRecommendedCourt] = useState(null); // Task1: рекомендована площадка

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

    let availabilityBoost = 8;
    if (statusClass.includes('free')) availabilityBoost = 25;
    if (statusClass.includes('medium')) availabilityBoost = 14;
    if (statusClass.includes('busy')) availabilityBoost = 4;

    return popularityScore + bookingScore + availabilityBoost;
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
    
    
    <div className="app">
      {/* навігація */}
      <Navbar />

      

      {/* live рамка тих хто чекіниться */}
      <LastCheckinBanner activeUser={activeUser} borderColor={borderColor} />

      {/* рекомендована площадка, що змінюється раз на 5 секунд */}
      {recommendedCourt && (
        <div style={{
          marginTop: '10px',
          padding: '10px 12px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          maxWidth: '360px'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
             Рекомендована площадка 
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{recommendedCourt.name}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{recommendedCourt.address}</div>
          <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>{recommendedCourt.statusText}</div>
        </div>
      )}

      {/* головний контейнер */}
      <div className="main-container">
        
        {/* лівий сайдбар */}
        <Sidebar courts={COURTS} />

        {/* права частина карта */}
        <MapView />

      </div>
    </div>
  );
}

export default App;