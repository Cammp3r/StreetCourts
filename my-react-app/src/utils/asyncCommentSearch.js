function createAbortError() {
  try {
    return new DOMException('The operation was aborted.', 'AbortError');
  } catch {
    const error = new Error('The operation was aborted.');
    error.name = 'AbortError';
    return error;
  }
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

export async function findCommentByAuthorAsync(comments, authorName, options = {}) {
  if (!Array.isArray(comments)) {
    throw new TypeError('comments must be an array');
  }

  if (typeof authorName !== 'string') {
    throw new TypeError('authorName must be a string');
  }

  const { signal, delayMs = 0 } = options;
  const searchName = authorName.toLowerCase().trim();

  try {
    throwIfAborted(signal);

    for (let i = 0; i < comments.length; i++) {
      throwIfAborted(signal);

      const comment = comments[i];
      const commentAuthor = (comment?.author || '').toLowerCase().trim();

      if (commentAuthor.includes(searchName)) {
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        return comment;
      }

      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return null;
  } catch (error) {
    if (signal?.aborted) {
      throw createAbortError();
    }
    throw error;
  }
}

export function findCommentByContentCallback(comments, searchText, callback, options = {}) {
  if (!Array.isArray(comments)) {
    throw new TypeError('comments must be an array');
  }

  if (typeof searchText !== 'string') {
    throw new TypeError('searchText must be a string');
  }

  if (typeof callback !== 'function') {
    throw new TypeError('callback must be a function');
  }

  const { signal, delayMs = 0 } = options;
  const searchQuery = searchText.toLowerCase().trim();
  let finished = false;
  let index = 0;

  const finish = (error, result) => {
    if (finished) return;
    finished = true;
    callback(error, result);
  };

  const processNext = () => {
    if (finished) return;

    try {
      throwIfAborted(signal);

      if (index >= comments.length) {
        finish(null, null);
        return;
      }

      const comment = comments[index];
      const commentText = (comment?.text || '').toLowerCase();
      index += 1;

      if (commentText.includes(searchQuery)) {
        if (delayMs > 0) {
          setTimeout(() => finish(null, comment), delayMs);
        } else {
          finish(null, comment);
        }
        return;
      }

      if (index % 10 === 0) {
        setTimeout(processNext, 0);
      } else {
        processNext();
      }
    } catch (error) {
      finish(error, null);
    }
  };

  processNext();
}
