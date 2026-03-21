import { runEngine } from "./runEngine.js";

export function* friendsRotator(friends = []) {
  if (!Array.isArray(friends) || friends.length === 0) {
    while (true) {
      yield null;
    }
  }
  let index = 0;
  while (true) {
    yield friends[index % friends.length];
    index += 1;
  }
}


export function displayFriendsWithRotation(friends, onFriendShow, intervalMs = 3000) {
  const friendsGen = friendsRotator(friends);
  return runEngine(friendsGen, onFriendShow, intervalMs);
}
