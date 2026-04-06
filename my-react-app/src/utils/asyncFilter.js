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

async function filterPop(courts, batchSize = 5) {
  return await filterAsyncBatch(courts, async (court) => {
    const randomPopularity = Math.random() * 100;
    
    return randomPopularity > 50;
  }, batchSize);
}

async function filterAlphabetically(courts) {
  return courts.sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return nameA.localeCompare(nameB, 'uk');
  });
}

export { filterAsyncBatch, filterPop, filterAlphabetically, addPopularityToCourtsBatch };