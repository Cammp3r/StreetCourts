import './App.css';
import { useState, useEffect, useRef } from 'react';
import { arrayCycler, runEngine, colorCycle } from 'streetcourts-lib';
import { Navbar } from './components/Navbar';
import { LastCheckinBanner } from './components/LastCheckinBanner';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { COURTS, COURT_DETAIL, REAL_DB_USERS } from './data/mockData';
import { BiDirectionalPriorityQueue, task4 } from './utils/biDirectionalPriorityQueue';
import { getCourtStatusText } from './utils/courtPresentation';



function App() { 
const [borderColor, setBorderColor] = useState("#333");
const [recommendedCourt, setRecommendedCourt] = useState(null); // Task1: рекомендована площадка
const runTask4 = useRef(false);


 useEffect(() => {
    if (runTask4.current) return;
    runTask4.current = true;

    task4();
  }, []);

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


  const names = runEngine(nameGen, setActiveUser, 2000);

  return () => {
    names();
  };
}, []);


useEffect(() => {
  if (COURTS.length === 0) return;

  const courtsWithAddress = COURTS.filter(
    (court) => court?.address && court.address !== 'Київ (адреса невідома)'
  );

  if (courtsWithAddress.length === 0) return;

  const priorityQueue = new BiDirectionalPriorityQueue();
  
  courtsWithAddress.forEach((court) => {
    priorityQueue.enqueue(court, court.popularity || 50);
  });

  function* recommendationGenerator() {
    while (true) {
      const highest = priorityQueue.dequeue('highest');
      if (highest) {
        yield highest;
        priorityQueue.enqueue(highest, highest.popularity || 50);
      }
      
      const lowest = priorityQueue.dequeue('lowest');
      if (lowest) {
        yield lowest;
        priorityQueue.enqueue(lowest, lowest.popularity || 50);
      }
    }
  }

  const courtsGen = recommendationGenerator();
  
  const stopRecommend = runEngine(courtsGen, (court) => {
    if (court) setRecommendedCourt(court);
  }, 5000);

  return () => {
    stopRecommend();
  };
}, []);

  return (
    
    
    <div className="app">
      <Navbar />

      <LastCheckinBanner activeUser={activeUser} borderColor={borderColor} />

      {recommendedCourt && (
        <div style={{
          marginTop: '10px',
          padding: '10px 12px',
          borderRadius: '8px',
          backgroundColor: '#111',
          border: '1px solid #333',
          color: '#eee',
          maxWidth: '360px'
        }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
             Рекомендована площадка 
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{recommendedCourt.name}</div>
          <div style={{ fontSize: '13px', color: '#bbb' }}>{recommendedCourt.address}</div>
          <div style={{ fontSize: '12px', marginTop: '4px', color: '#aaa' }}>{getCourtStatusText(recommendedCourt)}</div>
        </div>
      )}

      <div className="main-container">

        <Sidebar courts={COURTS} />

        <MapView detail={COURT_DETAIL} />

      </div>
    </div>
  );
}

export default App;