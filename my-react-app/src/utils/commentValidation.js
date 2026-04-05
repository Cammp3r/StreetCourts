import { memoize } from './memoize';

export function isCommentLongEnough(commentText, minLength = 4) {
  if (typeof commentText !== 'string') return false;
  return commentText.trim().length >= minLength;
}

export const memoizedIsCommentLongEnough = memoize(isCommentLongEnough, {
  maxSize: 5,
});

