// для стрічки імен, прийматиме реальний масив з бд пізніше

// універсальний генератор, який циклічно перебирає будь-який масив (нескінченний генератор)
export function* arrayCycler(array) {
  let i = 0;
  while (true) {
    yield array[i % array.length];
    i += 1;
  }
}

// генератор кольорів для рамки (приклад використання нескінченного генератора)
export function* colorCycle(colors = ["red", "green", "blue"]) {
  let i = 0;
  while (true) {
    yield colors[i % colors.length];
    i += 1;
  }
}

// iterator   - будь-який ітератор / генератор
// callback   - що робити з кожним значенням
// interval   - як часто викликати next() (мс)
// timeoutSec - скільки секунд працювати (опціонально).
// Якщо timeoutSec не передано, двигун працює доки його явно не зупинять.
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
///----------------------------------------------------------//
export function* courtRecommender(courts) {
  if (!Array.isArray(courts) || courts.length === 0) {
   
    while (true) {
      yield null;
    }
  }

  let index = 0;
  while (true) {
    yield courts[index % courts.length];
    index += 1;
  }
}