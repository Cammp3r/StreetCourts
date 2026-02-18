export function* arrayCycler(array, step = 1) {
  let i = 0;
  while (true) {
    yield array[i % array.length];
    i += step;
  }
}
