import { useMemo, useState, useEffect } from 'react';
import { CourtCardMini } from './CourtCardMini';
import { memoize } from '../utils/memoize';
import { addPopularityToCourtsBatch } from '../utils/asyncFilter';

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
  const [courtsWithPopularity, setCourtsWithPopularity] = useState([]);
  const [sortBy, setSortBy] = useState('default');

  useEffect(() => {
    const loadPopularity = async () => {
      const courtsWithPop = await addPopularityToCourtsBatch(courts);
      setCourtsWithPopularity(courtsWithPop);
    };
    
    if (courts.length > 0) {
      loadPopularity();
    }
  }, [courts]);

  const sortCourts = (courtsToSort) => {
    if (sortBy === 'popularity') {
      return [...courtsToSort].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }
    if (sortBy === 'alphabet') {
      return [...courtsToSort].sort((a, b) => {
        const nameA = (a.address || '').trim().toLowerCase();
        const nameB = (b.address || '').trim().toLowerCase();
        return nameA.localeCompare(nameB, 'uk');
      });
    }
    return courtsToSort;
  };

  const visibleCourts = useMemo(
    () => sortCourts(memoizedFilterCourtsBySport(courtsWithPopularity, activeSport)),
    [courtsWithPopularity, activeSport, sortBy]
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

        <div className="sort-filters">
          <button
            className={`sort-btn ${sortBy === 'default' ? 'active-sort' : ''}`}
            onClick={() => setSortBy('default')}
          >
            За замовчуванням
          </button>
          <button
            className={`sort-btn ${sortBy === 'popularity' ? 'active-sort' : ''}`}
            onClick={() => setSortBy('popularity')}
          >
            📊 Популярність
          </button>
          <button
            className={`sort-btn ${sortBy === 'alphabet' ? 'active-sort' : ''}`}
            onClick={() => setSortBy('alphabet')}
          >
            🔤 Алфавіт
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
