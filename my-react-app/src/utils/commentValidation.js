import { memoize } from './memoize';

export function isCommentLongEnough(commentText, minLength = 4) {
  if (typeof commentText !== 'string') return false;
  return commentText.trim().length >= minLength;
}

// Мемоізована версія: якщо результат в кеші - не викликає isCommentLongEnough
// Якщо не в кеші - викликає isCommentLongEnough та кеширує результат
export const memoizedIsCommentLongEnough = memoize(isCommentLongEnough, {
  maxSize: 5,
});

