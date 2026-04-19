const API_BASE = '/api';

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

function buildCommentsUrl(courtId) {
  return `${API_BASE}/courts/${encodeURIComponent(courtId)}/comments`;
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