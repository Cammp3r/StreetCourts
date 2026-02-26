export function runEngine(iterator, callback, interval) {
  const timer = setInterval(() => {
    const next = iterator.next();
    if (next.done) {
      clearInterval(timer);
      return;
    }
    callback(next.value);
  }, interval);

  return () => clearInterval(timer);
}
