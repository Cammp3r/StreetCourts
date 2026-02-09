// --- 1. ГЕНЕРАТОРИ ---

// Генерує випадкове число людей (від 5 до 20)
export function* randomNumberGenerator() {
  while (true) {
    yield Math.floor(Math.random() * (20 - 5 + 1) + 5);
  }
}



// --- 2. ITERATOR WITH TIMEOUT ---

/**
 * Ця функція приймає ітератор і "споживає" його протягом певного часу.
 * callback - це функція, яка оновлює React State (замість print).
 * intervalMs - швидкість оновлення.
 */
export function runIteratorWithTimeout(iterator, durationSeconds, callback, intervalMs = 1000) {
  const startTime = Date.now();
  const endTime = startTime + (durationSeconds * 1000);

  console.log(`[Start] Iterator started for ${durationSeconds}s`);

  // Використовуємо setInterval, щоб не "заморозити" браузер (React)
  const intervalId = setInterval(() => {
    const now = Date.now();
    
    // Перевірка тайм-ауту
    if (now >= endTime) {
      clearInterval(intervalId);
      console.log("[Stop] Timeout reached");
      return;
    }

    // Отримуємо наступне значення з генератора
    const nextItem = iterator.next();
    
    if (!nextItem.done) {
      callback(nextItem.value); // Передаємо значення в React компонент
    }
  }, intervalMs);

  // Повертаємо функцію очищення (якщо компонент закриється раніше)
  return () => clearInterval(intervalId);
}