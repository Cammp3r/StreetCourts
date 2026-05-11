const API_BASE = '/api';

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

function buildCommentsUrl(courtId) {
  return `${API_BASE}/courts/${encodeURIComponent(courtId)}/comments`;
}

function buildCommentsStreamUrl(courtId) {
  return `${API_BASE}/courts/${encodeURIComponent(courtId)}/comments/stream`;
}

async function* streamNdjson(responseBody, { signal } = {}) {
  const reader = responseBody.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
        return;
      }

      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          yield JSON.parse(trimmed);
        } catch {
          // ignore malformed line
        }
      }
    }

    buffer += decoder.decode();
    const tail = buffer.trim();
    if (tail) {
      try {
        yield JSON.parse(tail);
      } catch {
        // ignore
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}

export async function fetchCourtComments(courtId, { signal } = {}) {
  if (!courtId) return [];

  const response = await fetch(buildCommentsUrl(courtId), { signal });
  if (!response.ok) {
    throw new Error('Не вдалося завантажити коментарі');
  }

  const data = await readJson(response);
  return Array.isArray(data?.comments) ? data.comments : [];
}

// Async Iterator streaming: consumes NDJSON incrementally without loading the full dataset.
export async function* streamCourtComments(courtId, { signal } = {}) {
  if (!courtId) return;

  const response = await fetch(buildCommentsStreamUrl(courtId), { signal });
  if (!response.ok) {
    throw new Error('Не вдалося завантажити коментарі (stream)');
  }

  if (!response.body) {
    return;
  }

  yield* streamNdjson(response.body, { signal });
}

export async function createCourtComment(courtId, { author, text }, { signal } = {}) {
  if (!courtId) {
    throw new Error('Не вказано майданчик');
  }

  const response = await fetch(buildCommentsUrl(courtId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ author, text }),
    signal,
  });

  if (!response.ok) {
    throw new Error('Не вдалося зберегти коментар');
  }

  const data = await readJson(response);
  return data?.comment ?? null;
}