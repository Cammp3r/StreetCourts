import { useMemo, useState, useEffect, useRef } from 'react';
import { CourtCardMini } from './CourtCardMini';
import { memoize } from '../utils/memoize';
import { filterAlphabetically, addPopularityToCourtsBatch, filterPopularityQueryAsync } from '../utils/asyncFilter';

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
  const [popularityThreshold, setPopularityThreshold] = useState('');
  const [filteredByCourtsPopularity, setFilteredByPopularity] = useState([]);
  const [streetSearch, setStreetSearch] = useState('');
  const [filteredByStreet, setFilteredByStreet] = useState([]);
  const [isFiltering, setIsFiltering] = useState(false);
  
  // AbortControllers для скасування операцій
  const popularityAbortController = useRef(null);
  const popularityFilterAbortController = useRef(null);
  const streetAbortController = useRef(null);

  // Функція для скасування всіх операцій
  const cancelAllOperations = () => {
    if (popularityAbortController.current) {
      popularityAbortController.current.abort();
      popularityAbortController.current = null;
    }
    if (popularityFilterAbortController.current) {
      popularityFilterAbortController.current.abort();
      popularityFilterAbortController.current = null;
    }
    if (streetAbortController.current) {
      streetAbortController.current.abort();
      streetAbortController.current = null;
    }
    setIsFiltering(false);
  };

  useEffect(() => {
    if (!courts || courts.length === 0) return;

    if (popularityAbortController.current) {
      popularityAbortController.current.abort();
    }

    popularityAbortController.current = new AbortController();
    const signal = popularityAbortController.current.signal;

    const loadPopularity = async () => {
      setIsFiltering(true);
      try {
        const courtsWithPop = await addPopularityToCourtsBatch(courts, 5, {
          signal,
          yieldEvery: 1,
          yieldDelayMs: 0,
        });
        if (!signal.aborted) {
          setCourtsWithPopularity(courtsWithPop);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Popularity loading cancelled');
        } else {
          console.error('Error loading popularity:', error);
        }
      } finally {
        if (!signal.aborted) {
          setIsFiltering(false);
        }
      }
    };

    loadPopularity();

    // Cleanup
    return () => {
      if (popularityAbortController.current) {
        popularityAbortController.current.abort();
      }
    };
  }, [courts]);

  // Фільтрування по популярності
  useEffect(() => {
    if (popularityFilterAbortController.current) {
      popularityFilterAbortController.current.abort();
    }

    popularityFilterAbortController.current = new AbortController();
    const signal = popularityFilterAbortController.current.signal;

    const filterByPopularity = async () => {
      try {
        if (!courtsWithPopularity || courtsWithPopularity.length === 0) {
          setFilteredByPopularity([]);
          return;
        }

        setIsFiltering(true);
        const filtered = await filterPopularityQueryAsync(courtsWithPopularity, popularityThreshold, {
          signal,
          minDurationMs: 3000,
          yieldEvery: 100,
          yieldDelayMs: 0,
        });

        if (!signal.aborted) {
          setFilteredByPopularity(filtered);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Popularity filtering cancelled');
        } else {
          console.error('Error filtering by popularity:', error);
        }
      } finally {
        if (!signal.aborted) {
          setIsFiltering(false);
        }
      }
    };

    filterByPopularity();

    return () => {
      if (popularityFilterAbortController.current) {
        popularityFilterAbortController.current.abort();
      }
    };
  }, [courtsWithPopularity, popularityThreshold]);

  // Фільтрування по вулиці
  useEffect(() => {
    if (streetAbortController.current) {
      streetAbortController.current.abort();
    }

    streetAbortController.current = new AbortController();
    const signal = streetAbortController.current.signal;

    const filterByStreetName = async () => {
      try {
        if (streetSearch === '') {
          setFilteredByStreet(filteredByCourtsPopularity);
          return;
        }

        setIsFiltering(true);
        const filtered = await filterAlphabetically(filteredByCourtsPopularity, streetSearch, {
          signal,
          minDurationMs: 3000,
          yieldEvery: 150,
          yieldDelayMs: 0,
        });
        if (!signal.aborted) {
          setFilteredByStreet(filtered);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Street filtering cancelled');
        } else {
          console.error('Error filtering by street:', error);
        }
      } finally {
        if (!signal.aborted) {
          setIsFiltering(false);
        }
      }
    };

    filterByStreetName();

    return () => {
      if (streetAbortController.current) {
        streetAbortController.current.abort();
      }
    };
  }, [streetSearch, filteredByCourtsPopularity]);

  const visibleCourts = useMemo(
    () => memoizedFilterCourtsBySport(filteredByStreet, activeSport),
    [filteredByStreet, activeSport]
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

        <div className="popularity-filter">
          <label htmlFor="popularity-input">Кількість людей: </label>
          <input
            id="popularity-input"
            type="number"
            min="0"
            max="100"
            placeholder="Введіть число (0-100)"
            value={popularityThreshold}
            onChange={(e) => setPopularityThreshold(e.target.value)}
          />
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

        {isFiltering && (
          <div className="cancel-operations">
            <button 
              className="cancel-btn" 
              onClick={cancelAllOperations}
            >
              ✕ Скасувати фільтрування
            </button>
          </div>
        )}
      </div>

      <div className="courts-list">
        {visibleCourts.map((court) => (
          <CourtCardMini key={court.id} court={court} />
        ))}
      </div>
    </div>
  );
}
