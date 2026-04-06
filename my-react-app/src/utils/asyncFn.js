// 1-а функція фільтрувати площадки за популярністю(рандомною)
// 2-а функція фільтрувати площадки за алфавітом

/**
 * Фільтрує масив за допомогою асинхронного колбека з обмеженням одночасних операцій
 * @param {Array} array - Масив для фільтрації
 * @param {Function} asyncCallback - Асинхронна функція що повертає boolean
 * @param {number} batchSize - Кількість одночасних операцій (за замовчуванням 5)
 * @returns {Promise<Array>} Відфільтрований масив
 */
async function filterAsyncBatch(array, asyncCallback, batchSize = 5) {
  const results = [];
  
  // Обробляємо по `batchSize` одночасно
  for (let i = 0; i < array.length; i += batchSize) {
    const batch = array.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => asyncCallback(item))
    );
    results.push(...batchResults);
  }
  
  // Фільтруємо оригінальний масив за результатами
  return array.filter((_, index) => results[index]);
}

/**
 * Добавляє популярність до кожної площадки (рандомно від 1 до 100)
 * @param {Array} courts - Масив площадок
 * @param {number} batchSize - Кількість одночасних операцій
 * @returns {Promise<Array>} Площадки з полем popularity
 */
async function addPopularityToCourtsBatch(courts, batchSize = 5) {
  const results = [];
  
  for (let i = 0; i < courts.length; i += batchSize) {
    const batch = courts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(court => Promise.resolve({
        ...court,
        popularity: Math.floor(Math.random() * 100) + 1
      }))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Фільтрує площадки за популярністю (рандомно)
 * @param {Array} courts - Масив площадок
 * @param {number} batchSize - Кількість одночасних перевірок
 * @returns {Promise<Array>} Відсортовані площадки за популярністю
 */
async function filterPop(courts, batchSize = 5) {
  return await filterAsyncBatch(courts, async (court) => {
    // Генеруємо рандомну популярність для кожної площадки
    const randomPopularity = Math.random() * 100;
    // Повертаємо true якщо популярність > 50 (можна змінити поріг)
    return randomPopularity > 50;
  }, batchSize);
}

/**
 * Фільтрує площадки за алфавітним порядком
 * (Сортує за назвою площадки по алфавіту, потім повертає)
 * @param {Array} courts - Масив площадок
 * @returns {Promise<Array>} Відсортовані площадки по алфавіту
 */
async function filterAlphabetically(courts) {
  return courts.sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return nameA.localeCompare(nameB, 'uk');
  });
}

export { filterAsyncBatch, filterPop, filterAlphabetically, addPopularityToCourtsBatch };