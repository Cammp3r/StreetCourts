import {
  abortableDelay,
  isAbortError,
  throwIfAborted,
  yieldToEventLoop,
} from './abortUtils';

function toCourtsArray(courts) {
  return Array.isArray(courts) ? courts : [];
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

async function maybeYield(iteration, options = {}) {
  const { signal, yieldEvery = 25, yieldDelayMs = 0 } = options;
  if (!yieldEvery) return;
  if (iteration % yieldEvery !== 0) return;
  throwIfAborted(signal);
  await yieldToEventLoop(yieldDelayMs);
}

async function addPopularityToCourtsBatch(courts, batchSize = 5, options = {}) {
  const { signal } = options;
  const courtsArray = toCourtsArray(courts);
  const safeBatchSize = toPositiveInt(batchSize, 5);
  const results = [];

  for (let i = 0; i < courtsArray.length; i += safeBatchSize) {
    throwIfAborted(signal);
    await maybeYield(Math.floor(i / safeBatchSize) + 1, options);

    const batch = courtsArray.slice(i, i + safeBatchSize);
    const batchResults = [];

    for (const court of batch) {
      throwIfAborted(signal);
      const popularity = Math.floor(Math.random() * 100) + 1;
      if (court && typeof court === 'object') {
        batchResults.push({
          ...court,
          popularity,
        });
      } else {
        batchResults.push({ value: court, popularity });
      }
    }

    results.push(...batchResults);
  }

  throwIfAborted(signal);
  return results;
}

function normalizeAddress(address) {
  return (address || '').toLowerCase().trim();
}

function matchesSearchQuery(normalizedAddress, normalizedQuery) {
  return normalizedAddress.includes(normalizedQuery);
}

async function checkStreetMatch(court, searchQuery, options = {}) {
  const { signal } = options;
  throwIfAborted(signal);
  try {
    if (!court || typeof court !== 'object') return false;
    if (!court.address) return false;
    const normalizedAddress = normalizeAddress(court.address);
    const normalizedQuery = normalizeAddress(searchQuery);
    return matchesSearchQuery(normalizedAddress, normalizedQuery);
  } catch (error) {
    if (isAbortError(error)) throw error;
    return false;
  }
}

// ---- фільтрування по вулиці на базі промісів ----
async function filterStreetByQuery(courts, searchQuery, options = {}) {
  const { signal } = options;
  throwIfAborted(signal);

  const courtsArray = toCourtsArray(courts);

  const matches = [];
  let index = 0;
  try {
    for (const court of courtsArray) {
      index += 1;
      throwIfAborted(signal);
      await maybeYield(index, options);
      matches.push(await checkStreetMatch(court, searchQuery, { signal }));
    }

    throwIfAborted(signal);
    return courtsArray.filter((_, index) => matches[index]);
  } catch (error) {
    if (isAbortError(error)) throw error;
    return courtsArray;
  }
}

async function filterAlphabetically(courts, searchQuery, options = {}) {
  const courtsArray = toCourtsArray(courts);
  try {
    const start = Date.now();
    const filtered = await filterStreetByQuery(courtsArray, searchQuery, options);

    const minDurationMs = options?.minDurationMs ?? 0;
    if (minDurationMs > 0) {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, minDurationMs - elapsed);
      await abortableDelay(remaining, options);
    }

    return filtered;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return courtsArray;
  }
}

function isValidThreshold(threshold) {
  if (threshold === '' || threshold === null || threshold === undefined) {
    return false;
  }
  const parsed = parseInt(threshold, 10);
  return !isNaN(parsed);
}

// ---- фільтрування по популярності на базі callbackів ----
function meetsPopularityThreshold(court, threshold) {
  return (court.popularity || 0) >= threshold;
}

async function filterPopularityByThresholdAsync(courts, threshold, options = {}) {
  const { signal } = options;
  throwIfAborted(signal);

  const courtsArray = toCourtsArray(courts);

  const result = [];
  let index = 0;
  try {
    for (const court of courtsArray) {
      index += 1;
      throwIfAborted(signal);
      await maybeYield(index, options);
      if (meetsPopularityThreshold(court, threshold)) {
        result.push(court);
      }
    }

    throwIfAborted(signal);
    return result;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return courtsArray;
  }
}

async function filterPopularityQueryAsync(courts, threshold, options = {}) {
  if (!isValidThreshold(threshold)) {
    return courts;
  }

  const courtsArray = toCourtsArray(courts);
  try {
    const start = Date.now();
    const parsedThreshold = parseInt(threshold, 10);
    const filtered = await filterPopularityByThresholdAsync(courtsArray, parsedThreshold, options);

    const minDurationMs = options?.minDurationMs ?? 0;
    if (minDurationMs > 0) {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, minDurationMs - elapsed);
      await abortableDelay(remaining, options);
    }

    return filtered;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return courtsArray;
  }
}

export { filterAlphabetically, addPopularityToCourtsBatch, filterPopularityQueryAsync };