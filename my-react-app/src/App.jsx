import './App.css';
import { useState, useEffect } from 'react';
import { arrayCycler, colorCycle, runEngine } from './utils/generators';
import { Navbar } from './components/Navbar';
import { LastCheckinBanner } from './components/LastCheckinBanner';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';

import { COURTS, COURT_DETAIL, REAL_DB_USERS } from './data/mockData';

function App() { 
const [borderColor, setBorderColor] = useState("#333");

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

  // зробити ефект пульсації кольору рамки

  const names = runEngine(nameGen, setActiveUser, 2000); // міняємо ім'я кожні 2 сек

  return () => {
    names();
  };
}, []);

  return (
    
    <div className="app">
      {/* навігація */}
      <Navbar />

      {/* live рамка тих хто чекіниться */}
      <LastCheckinBanner activeUser={activeUser} borderColor={borderColor} />

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