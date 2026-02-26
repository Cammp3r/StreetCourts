import './App.css';
import { useState, useEffect } from 'react';
import {
  arrayCycler,
  runEngine,

} from 'streetcourts-lib';
import { colorCycle, courtRecommender, consumeIteratorWithTimeout } from "./utils/generators";
import { Navbar } from './components/Navbar';
import { LastCheckinBanner } from './components/LastCheckinBanner';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { COURTS, COURT_DETAIL, REAL_DB_USERS } from './data/mockData';

function App() { 
const [borderColor, setBorderColor] = useState("#333");
const [recommendedCourt, setRecommendedCourt] = useState(null);

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


  const names = runEngine(nameGen, setActiveUser, 2000); // міняємо ім'я кожні 2 сек

  return () => {
    names();
  };
}, []);


useEffect(() => {
  // demo: показує використання consumeIteratorWithTimeout (без змін UI)
  const demoGen = arrayCycler(['demo-A', 'demo-B', 'demo-C']);
  const stop = consumeIteratorWithTimeout(
    demoGen,
    3,
    (value) => console.log('[streetcourts-lib demo]', value),
    500
  );

  return () => stop();
}, []);


useEffect(() => {
  
  const courtsGen = courtRecommender(COURTS); // нескінченний генератор майданчиків

  // раз на 5 секунд беремо наступну площадку — без таймауту, працює постійно
  const stopRecommend = runEngine(courtsGen, (court) => {
    if (court) setRecommendedCourt(court);
  }, 5000);

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
          <div style={{ fontSize: '12px', marginTop: '4px', color: '#aaa' }}>{recommendedCourt.statusText}</div>
        </div>
      )}

      {/* головний контейнер */}
      <div className="main-container">
        
        {/* лівий сайдбар */}
        <Sidebar courts={COURTS} />

        {/* права частина карта */}
        <MapView detail={COURT_DETAIL} />

      </div>
    </div>
  );
}

export default App;