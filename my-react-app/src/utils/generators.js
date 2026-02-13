// для стрічки імен, прийматиме реальний масив з бд пізніше


export function* arrayCycler(array, step = 1) {
 let i = 0;
  while (true) {
    yield array[i % array.length];
    i += step;
  }
}

// зробити генератор кольорів для рамки

// тайм аут функція двигун
export function runEngine(iterator, callback, interval) {
  const timer = setInterval(() => {
    const next = iterator.next();
    callback(next.value);
  }, interval);
  
  return () => clearInterval(timer);
}