export function canSubmitComment(commentText, existingComments = []) {
  if (typeof commentText !== 'string') return false;

  const normalizedText = commentText.trim();
  if (normalizedText.length === 0) return false;

  const normalizedKey = normalizedText.toLowerCase();
  const stack = Array.isArray(existingComments) ? existingComments : [];
  const isDuplicate = stack.some((comment) => {
    if (!comment || typeof comment.text !== 'string') return false;
    return comment.text.trim().toLowerCase() === normalizedKey;
  });

  if (isDuplicate) {
    alert('Такий коментар уже є.');
    return false;
  }

  return true;
}

// Backward-compatible export used by CourtPage.
export const memoizedIsCommentLongEnough = canSubmitComment;

