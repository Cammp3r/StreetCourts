export function consumeIteratorWithTimeout(
  iterator,
  timeoutSec,
  onValue,
  intervalMs = 1000
) {
  const startTime = Date.now();

  const timer = setInterval(() => {
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs >= timeoutSec * 1000) {
      clearInterval(timer);
      return;
    }

    const { value, done } = iterator.next();
    if (done) {
      clearInterval(timer);
      return;
    }

    if (typeof onValue === "function") {
      onValue(value);
    }
  }, intervalMs);

  return () => clearInterval(timer);
}
