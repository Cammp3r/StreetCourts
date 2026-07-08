import { useEffect, useMemo, useState } from 'react';
import { CourtCardMini } from './CourtCardMini';
import { fetchAllCheckins } from '../utils/checkinsApi';
import { normalizeSport } from '../utils/courtPresentation';

function filterCourtsBySport(courts, sport) {
  if (!Array.isArray(courts)) return [];

  let filtered = courts;

  if (sport !== 'all') {
    filtered = courts.filter((court) => normalizeSport(court) === sport);
  }

  return filtered.filter((court) => court?.address && court.address !== 'Київ (адреса невідома)');
}

function normalize(value) {
  return String(value ?? '').toLowerCase();
}

export function Sidebar({ courts, selectedCourtId, onSelectCourt, user }) {
  const [activeSport, setActiveSport] = useState('basketball');
  const [streetSearch, setStreetSearch] = useState('');
  const [checkinCounts, setCheckinCounts] = useState({});

  useEffect(() => {
    const controller = new AbortController();

    fetchAllCheckins({ signal: controller.signal })
      .then((checkins) => {
        if (controller.signal.aborted) return;
        const counts = checkins.reduce((acc, item) => {
          acc[item.courtId] = (acc[item.courtId] || 0) + 1;
          return acc;
        }, {});
        setCheckinCounts(counts);
      })
      .catch((error) => {
        if (!controller.signal.aborted) console.error('Failed to load check-in counts:', error);
      });

    return () => controller.abort();
  }, [courts]);

  const visibleCourts = useMemo(() => {
    const bySport = filterCourtsBySport(courts, activeSport);

    const normalizedSearch = normalize(streetSearch);
    const bySearch = normalizedSearch
      ? bySport.filter(
          (court) => normalize(court?.name).includes(normalizedSearch) || normalize(court?.address).includes(normalizedSearch)
        )
      : bySport;

    return bySearch
      .map((court, index) => ({ court, index, count: checkinCounts[court.id] || 0 }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.index - b.index;
      })
      .map(({ court }) => court);
  }, [courts, activeSport, streetSearch, checkinCounts]);

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
            className={`filter-btn ${activeSport === 'volleyball' ? 'active-volleyball' : ''}`}
            onClick={() => setActiveSport('volleyball')}
          >
            🏐 Волей
          </button>
        </div>

        <div className="street-search-filter">
          <label htmlFor="street-search">Пошук по вулиці: </label>
          <input
            id="street-search"
            type="text"
            placeholder="Введіть назву вулиці"
            value={streetSearch}
            onChange={(e) => setStreetSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="courts-list">
        {visibleCourts.map((court) => (
          <CourtCardMini
            key={court.id}
            court={court}
            isSelected={court.id === selectedCourtId}
            onSelect={onSelectCourt}
            userName={user?.name}
          />
        ))}
      </div>
    </div>
  );
}
