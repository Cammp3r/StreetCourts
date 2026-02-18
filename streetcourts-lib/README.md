# streetcourts-lib

A small JS library (ESM) with iterator/generator utilities used by the StreetCourts app.

## Install (local, for this repo)

From `my-react-app/`:

```bash
npm install
```

This repo uses a local dependency link: `"streetcourts-lib": "file:../streetcourts-lib"`.

## Usage examples

### `arrayCycler(array, step)`

```js
import { arrayCycler } from "streetcourts-lib";

const gen = arrayCycler(["Max", "Oleg", "Andrii"], 1);
console.log(gen.next().value); // "Max"
console.log(gen.next().value); // "Oleg"
```

### `colorCycle(colors)`

```js
import { colorCycle } from "streetcourts-lib";

const gen = colorCycle(["red", "green", "blue"]);
console.log(gen.next().value); // "red"
```

### `runEngine(iterator, callback, intervalMs)`

```js
import { colorCycle, runEngine } from "streetcourts-lib";

const stop = runEngine(colorCycle(["red", "green"]), (color) => {
  console.log("color:", color);
}, 500);

setTimeout(stop, 2000);
```

### `courtRecommender(courts)`

```js
import { courtRecommender } from "streetcourts-lib";

const gen = courtRecommender([{ name: "Court A" }, { name: "Court B" }]);
console.log(gen.next().value.name); // "Court A"
```

### `consumeIteratorWithTimeout(iterator, timeoutSec, onValue, intervalMs)`

```js
import { arrayCycler, consumeIteratorWithTimeout } from "streetcourts-lib";

const gen = arrayCycler(["A", "B", "C"]);
const stop = consumeIteratorWithTimeout(gen, 3, (value) => {
  console.log("value:", value);
}, 500);

// optional early stop
setTimeout(stop, 1500);
```
