// Для стрічки імен (Прийматиме реальний масив з БД пізніше)
export function* arrayCycler(array) {
  let index = 0;
  while (true) {
    yield array[index % array.length];
    index++;
  }
}

// Зробити генератор кольорів для рамки

//Тайм-аут функція (двигун)
export function runEngine(iterator, callback, interval) {
  const timer = setInterval(() => {
    const next = iterator.next();
    callback(next.value);
  }, interval);
  return () => clearInterval(timer);
}