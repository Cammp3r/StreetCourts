export function isCommentLongEnough(commentText, minLength = 4) {
  if (typeof commentText !== 'string') return false;
  return commentText.trim().length >= minLength;
}

export function memoize(
    fn,
    {
        limit = 5,
        keyFn = (...args) => JSON.stringify(args),
    } = {}
) {
    const cache = new Map();

    return function memoized(...args) {
        const key = keyFn(...args);
        if (cache.has(key)) {
            console.log('Cache hit for key:');
            return cache.get(key);

        }

        if (cache.size >= limit) {
            cache.clear();
        }

        const value = fn(...args);
        cache.set(key, value);
        return value;
    };
}

