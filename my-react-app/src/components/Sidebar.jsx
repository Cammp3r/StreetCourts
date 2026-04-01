import { useMemo, useState } from 'react';
import { CourtCardMini } from './CourtCardMini';
import { memoize } from '../utils/memoize';

// Чиста функція для фільтрації майданчиків за видом спорту
function filterCourtsBySport(courts, sport) {
  if (!Array.isArray(courts)) return [];
  if (sport === 'all') return courts;

  if (sport === 'basketball') {
    return courts.filter((court) => court?.sport === 'basketball' || court?.typeLabel === 'Баскетбол');
  }

  if (sport === 'football') {
    return courts.filter((court) => court?.sport === 'football' || court?.typeLabel === 'Футбол');
  }

  // інші фільтри поки не реалізовані
  return courts;
}

// Мемоізована версія з обмеженим розміром кэшу
const memoizedFilterCourtsBySport = memoize(filterCourtsBySport, {
  maxSize: 10,
});

export function Sidebar({ courts }) {
  const [activeSport, setActiveSport] = useState('basketball');

  const visibleCourts = useMemo(
    () => memoizedFilterCourtsBySport(courts, activeSport),
    [courts, activeSport]
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Знайди гру поруч</h2>
        <div className="filters">
          <button
            className={`filter-btn ${activeSport === 'basketball' ? 'active-basketball' : ''}`}
            onClick={() => setActiveSport('basketball')}
          >
            🏀 Баскетбол
          </button>
          <button
            className={`filter-btn ${activeSport === 'football' ? 'active-football' : ''}`}
            onClick={() => setActiveSport('football')}
          >
            ⚽ Футбол
          </button>
          <button
            className={`filter-btn ${activeSport === 'all' ? 'active-all' : ''}`}
            onClick={() => setActiveSport('all')}
          >
            🏐 Волей
          </button>
        </div>
      </div>

      <div className="courts-list">
        {visibleCourts.map((court) => (
          <CourtCardMini key={court.id} court={court} />
        ))}
      </div>
    </div>
  );
}
