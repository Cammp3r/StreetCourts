const API_BASE = import.meta.env.VITE_COURTS_API_URL || 'http://localhost:3002/api';

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

export async function fetchCourts({ signal } = {}) {
  const response = await fetch(`${API_BASE}/courts`, { signal });

  if (!response.ok) {
    throw new Error('Не вдалося завантажити список площадок');
  }

  const data = await readJson(response);
  return Array.isArray(data?.courts) ? data.courts : [];
}

export async function fetchCourtById(courtId, { signal } = {}) {
  if (!courtId) return null;

  const response = await fetch(`${API_BASE}/courts/${encodeURIComponent(courtId)}`, {
    signal,
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Не вдалося завантажити площадку');
  }

  const data = await readJson(response);
  return data?.court ?? null;
}