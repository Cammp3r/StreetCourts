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