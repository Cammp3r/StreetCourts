function createAbortError() {
  try {
    return new DOMException('The operation was aborted.', 'AbortError');
  } catch {
    const error = new Error('The operation was aborted.');
    error.name = 'AbortError';
    return error;
  }
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function abortableDelay(delayMs, options = {}) {
  const { signal } = options;
  if (!delayMs || delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, delayMs);

    const onAbort = () => {
      cleanup();
      reject(createAbortError());
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function yieldToEventLoop(delayMs = 0) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
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
  const results = [];

  for (let i = 0; i < courts.length; i += batchSize) {
    throwIfAborted(signal);
    await maybeYield(Math.floor(i / batchSize) + 1, options);

    const batch = courts.slice(i, i + batchSize);
    const batchResults = [];

    for (const court of batch) {
      throwIfAborted(signal);
      batchResults.push({
        ...court,
        popularity: Math.floor(Math.random() * 100) + 1,
      });
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
  const normalizedAddress = normalizeAddress(court.address);
  const normalizedQuery = normalizeAddress(searchQuery);
  return matchesSearchQuery(normalizedAddress, normalizedQuery);
}

// ---- фільтрування по вулиці на базі промісів ----
async function filterStreetByQuery(courts, searchQuery, options = {}) {
  const { signal } = options;
  throwIfAborted(signal);

  const matches = [];
  let index = 0;
  for (const court of courts) {
    index += 1;
    throwIfAborted(signal);
    await maybeYield(index, options);
    matches.push(await checkStreetMatch(court, searchQuery, { signal }));
  }

  throwIfAborted(signal);
  return courts.filter((_, index) => matches[index]);
}

async function filterAlphabetically(courts, searchQuery, options = {}) {
  const start = Date.now();
  const filtered = await filterStreetByQuery(courts, searchQuery, options);

  const minDurationMs = options?.minDurationMs ?? 0;
  if (minDurationMs > 0) {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, minDurationMs - elapsed);
    await abortableDelay(remaining, options);
  }

  return filtered;
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

function filterPopularityByThreshold(courts, threshold) {
  const callback = (court) => meetsPopularityThreshold(court, threshold);
  return courts.filter(callback);
}

async function filterPopularityByThresholdAsync(courts, threshold, options = {}) {
  const { signal } = options;
  throwIfAborted(signal);

  const result = [];
  let index = 0;
  for (const court of courts) {
    index += 1;
    throwIfAborted(signal);
    await maybeYield(index, options);
    if (meetsPopularityThreshold(court, threshold)) {
      result.push(court);
    }
  }

  throwIfAborted(signal);
  return result;
}

function filterPopularityQuery(courts, threshold) {
  if (!isValidThreshold(threshold)) {
    return courts;
  }
  const parsedThreshold = parseInt(threshold, 10);
  return filterPopularityByThreshold(courts, parsedThreshold);
}

async function filterPopularityQueryAsync(courts, threshold, options = {}) {
  if (!isValidThreshold(threshold)) {
    return courts;
  }

  const start = Date.now();
  const parsedThreshold = parseInt(threshold, 10);
  const filtered = await filterPopularityByThresholdAsync(courts, parsedThreshold, options);

  const minDurationMs = options?.minDurationMs ?? 0;
  if (minDurationMs > 0) {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, minDurationMs - elapsed);
    await abortableDelay(remaining, options);
  }

  return filtered;
}

export { filterAlphabetically, addPopularityToCourtsBatch, normalizeAddress, matchesSearchQuery, checkStreetMatch, filterStreetByQuery, isValidThreshold, meetsPopularityThreshold, filterPopularityByThreshold, filterPopularityQuery, filterPopularityByThresholdAsync, filterPopularityQueryAsync };