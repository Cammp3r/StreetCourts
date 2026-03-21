export function memoize(
  fn,
  {
    maxSize = Infinity,
    keyFn = (...args) => JSON.stringify(args),
  } = {}
) {
  const cache = new Map(); 

  const effectiveMaxSize = Number.isFinite(maxSize) ? maxSize : Infinity;

  function ensureCapacity() {
    if (!Number.isFinite(effectiveMaxSize)) return;
    if (cache.size < effectiveMaxSize) return;

    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }

  function memoized(...args) {
    const key = keyFn(...args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const value = fn(...args);

    ensureCapacity();
    cache.set(key, value);

    return value;
  }

  return memoized;
}
