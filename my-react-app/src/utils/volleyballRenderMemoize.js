const VOLLEYBALL_SPORT = 'volleyball';
const VOLLEYBALL_LABEL = 'Волейбол';
const UNKNOWN_KYIV_ADDRESS = 'Київ (адреса невідома)';

function getVolleyballRenderCacheKey(courts) {
  if (!Array.isArray(courts)) return '';

  return courts
    .map((court) => `${court?.id}:${court?.sport}:${court?.typeLabel}:${court?.address}`)
    .join('|');
}

function isVolleyballCourt(court) {
  return court?.sport === VOLLEYBALL_SPORT || court?.typeLabel === VOLLEYBALL_LABEL;
}

function hasKnownAddress(court) {
  return court?.address && court.address !== UNKNOWN_KYIV_ADDRESS;
}

function filterVolleyballCourtsForRender(courts) {
  if (!Array.isArray(courts)) return [];

  return courts
    .filter(isVolleyballCourt)
    .filter(hasKnownAddress);
}

export function createVolleyballRenderMemoizer({ maxSize = 5 } = {}) {
  const cache = new Map();
  const safeMaxSize = Number.isFinite(maxSize) && maxSize > 0 ? maxSize : Infinity;

  function trimCache() {
    if (!Number.isFinite(safeMaxSize)) return;
    if (cache.size < safeMaxSize) return;

    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }

  return function memoizedFilterVolleyballCourtsForRender(courts) {
    const key = getVolleyballRenderCacheKey(courts);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const value = filterVolleyballCourtsForRender(courts);
    trimCache();
    cache.set(key, value);

    return value;
  };
}

export const memoizedFilterVolleyballCourtsForRender = createVolleyballRenderMemoizer();
