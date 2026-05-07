export function createAbortError() {
  try {
    return new DOMException('The operation was aborted.', 'AbortError');
  } catch {
    const error = new Error('The operation was aborted.');
    error.name = 'AbortError';
    return error;
  }
}

export function isAbortError(error) {
  return error?.name === 'AbortError';
}

export function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

export function abortableDelay(delayMs, options = {}) {
  const { signal } = options;
  if (!delayMs || delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, delayMs);

    const onAbort = () => {
      cleanup();
      reject(createAbortError());
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function yieldToEventLoop(delayMs = 0) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
