import { useMemo, useState, useEffect, useRef } from 'react';
import { CourtCardMini } from './CourtCardMini';
import { memoize } from '../utils/memoize';
import { filterAlphabetically, addPopularityToCourtsBatch, filterPopularityQueryAsync } from '../utils/asyncFilter';
import { streamArrayChunks } from '../utils/streams';
import { getCourtBookingsCount } from '../utils/bookingStorage';
import { PriorityQueue } from '../utils/priorityQueue';

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

export function Sidebar({ courts, selectedCourtId, onSelectCourt }) {
  const [activeSport, setActiveSport] = useState('basketball');
  const [courtsWithPopularity, setCourtsWithPopularity] = useState([]);
  const [popularityThreshold, setPopularityThreshold] = useState('');
  const [filteredByCourtsPopularity, setFilteredByPopularity] = useState([]);
  const [streetSearch, setStreetSearch] = useState('');
  const [filteredByStreet, setFilteredByStreet] = useState([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [chunkedVisibleCourts, setChunkedVisibleCourts] = useState([]);
  
  // AbortControllers для скасування операцій
  const popularityAbortController = useRef(null);
  const popularityFilterAbortController = useRef(null);
  const streetAbortController = useRef(null);
  const visibleCourtsStreamAbortController = useRef(null);

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
    if (visibleCourtsStreamAbortController.current) {
      visibleCourtsStreamAbortController.current.abort();
      visibleCourtsStreamAbortController.current = null;
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
        if (error.name !== 'AbortError') {
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
        if (error.name !== 'AbortError') {
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
        if (error.name !== 'AbortError') {
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

  const visibleCourts = useMemo(() => {
    const base = memoizedFilterCourtsBySport(filteredByStreet, activeSport);

    const queue = new PriorityQueue();
    base.forEach((court) => {
      const popularity = Number(court?.popularity);
      const priority = Number.isFinite(popularity)
        ? popularity
        : (Number(getCourtBookingsCount(court?.id)) || 0);
      queue.enqueue(court, priority);
    });

    const sorted = [];
    while (true) {
      const next = queue.dequeue();
      if (!next) break;
      sorted.push(next);
    }

    return sorted;
  }, [filteredByStreet, activeSport]);

  useEffect(() => {
    if (visibleCourtsStreamAbortController.current) {
      visibleCourtsStreamAbortController.current.abort();
    }

    visibleCourtsStreamAbortController.current = new AbortController();
    const signal = visibleCourtsStreamAbortController.current.signal;

    setChunkedVisibleCourts([]);

    const isDev = import.meta.env.DEV;
    const streamChunkSize = isDev ? 8 : 25;
    const streamYieldDelayMs = isDev ? 16 : 0;

    const run = async () => {
      try {
        for await (const chunk of streamArrayChunks(visibleCourts, {
          chunkSize: streamChunkSize,
          signal,
          strategy: 'animationFrame',
          yieldDelayMs: streamYieldDelayMs,
        })) {
          if (signal.aborted) return;
          setChunkedVisibleCourts((current) => current.concat(chunk));
        }
      } catch (error) {
        console.error('Error streaming courts:', error);
      }
    };

    run();

    return () => {
      if (visibleCourtsStreamAbortController.current) {
        visibleCourtsStreamAbortController.current.abort();
      }
    };
  }, [visibleCourts]);

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

        <div className="street-search-filter">
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
        {chunkedVisibleCourts.map((court) => (
          <CourtCardMini
            key={court.id}
            court={court}
            isSelected={court.id === selectedCourtId}
            onSelect={onSelectCourt}
          />
        ))}
      </div>
    </div>
  );
}
