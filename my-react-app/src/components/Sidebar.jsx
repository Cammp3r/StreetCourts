import { useMemo, useState } from 'react';
import { CourtCardMini } from './CourtCardMini';
import { memoize } from '../utils/memoize';

function filterCourtsBySport(courts, sport) {
  if (!Array.isArray(courts)) return [];
  
  let filtered = courts;
  
  if (sport !== 'all') {
    if (sport === 'basketball') {
      filtered = courts.filter((court) => court?.sport === 'basketball' || court?.typeLabel === 'Баскетбол');
    } else if (sport === 'football') {
      filtered = courts.filter((court) => court?.sport === 'football' || court?.typeLabel === 'Футбол');
    }
  }

  return filtered.filter((court) => court?.address && court.address !== 'Київ (адреса невідома)');
}

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
