import './App.css';
import { useState, useEffect } from 'react';
import { arrayCycler, runEngine, colorCycle } from 'streetcourts-lib';
import { Navbar } from './components/Navbar';
import { LastCheckinBanner } from './components/LastCheckinBanner';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { COURTS, COURT_DETAIL, REAL_DB_USERS } from './data/mockData';
import { PriorityQueue } from './utils/priorityQueue';
import { getCourtStatusText } from './utils/courtPresentation';



function App() { 
const [borderColor, setBorderColor] = useState("#333");
const [recommendedCourt, setRecommendedCourt] = useState(null); // Task1: рекомендована площадка

useEffect(() => {
  const colorGen = colorCycle(["red", "green", "blue"]);
  const stopColors = runEngine(colorGen, setBorderColor, 500 ); 

  return () => {
    stopColors();
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

  const buildQueue = () => {
    const q = new PriorityQueue();
    courtsWithAddress.forEach((court) => {
      q.enqueue(court, court.popularity || 50);
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