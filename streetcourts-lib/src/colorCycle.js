export function* colorCycle(colors = ["red", "green", "blue"]) {
  let i = 0;
  while (true) {
    yield colors[i % colors.length];
    i += 1;
  }
}