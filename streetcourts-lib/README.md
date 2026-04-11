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

### `displayFriendsWithRotation(friends, onFriendShow, intervalMs)`

```js
import { displayFriendsWithRotation } from "streetcourts-lib";

const stop = displayFriendsWithRotation(
  [{ name: "Oleg" }, { name: "Andrii" }],
  (friend) => console.log("now showing:", friend?.name),
  1000
);

setTimeout(stop, 2500);
```
