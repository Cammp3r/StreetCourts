import { AUTH_METHODS, createAuthProxy } from './proxy';

const API_BASE = import.meta.env.VITE_COURTS_API_URL || 'http://localhost:3002/api';

const configuredMaxRequests = Number(import.meta.env.VITE_COURTS_API_RATE_LIMIT_REQUESTS);
const configuredWindowMs = Number(import.meta.env.VITE_COURTS_API_RATE_LIMIT_WINDOW_MS);
const rateLimitMaxRequests = Number.isFinite(configuredMaxRequests) && configuredMaxRequests > 0
  ? configuredMaxRequests
  : Number.POSITIVE_INFINITY;
const rateLimitWindowMs = Number.isFinite(configuredWindowMs) && configuredWindowMs > 0
  ? configuredWindowMs
  : 60_000;

const courtsApiProxy = createAuthProxy({
  enableLogging: import.meta.env.VITE_COURTS_API_LOGGING !== 'false',
  rateLimit: {
    maxRequests: rateLimitMaxRequests,
    windowMs: rateLimitWindowMs,
  },
});

let isProxyConfigured = false;

function getEnvValue(name) {
  const value = import.meta.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function parseAuthMethod(rawMethod) {
  const method = String(rawMethod || '').trim().toUpperCase();
  if (method === AUTH_METHODS.OAUTH) return AUTH_METHODS.OAUTH;
  if (method === AUTH_METHODS.JWT) return AUTH_METHODS.JWT;
  if (method === AUTH_METHODS.API_KEY) return AUTH_METHODS.API_KEY;
  return AUTH_METHODS.NONE;
}

function buildRefreshHandler() {
  const refreshUrl = getEnvValue('VITE_COURTS_API_REFRESH_URL');
  if (!refreshUrl) return undefined;

  return async () => {
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to refresh API token');
    }

    const payload = await response.json();
    return payload?.accessToken || payload?.token || null;
  };
}

function createEnvStrategy() {
  const method = parseAuthMethod(getEnvValue('VITE_COURTS_API_AUTH_METHOD'));
  if (method === AUTH_METHODS.NONE) {
    return { type: AUTH_METHODS.NONE };
  }

  if (method === AUTH_METHODS.API_KEY) {
    return {
      type: AUTH_METHODS.API_KEY,
      apiKey: getEnvValue('VITE_COURTS_API_KEY'),
      headerName: getEnvValue('VITE_COURTS_API_KEY_HEADER') || 'x-api-key',
      queryParamName: getEnvValue('VITE_COURTS_API_KEY_QUERY_PARAM') || undefined,
    };
  }

  return {
    type: method,
    token: getEnvValue('VITE_COURTS_API_TOKEN'),
    tokenType: getEnvValue('VITE_COURTS_API_TOKEN_TYPE') || 'Bearer',
    headerName: getEnvValue('VITE_COURTS_API_AUTH_HEADER') || 'Authorization',
    refreshToken: buildRefreshHandler(),
  };
}

function ensureProxyConfigured() {
  if (isProxyConfigured) return;
  courtsApiProxy.setStrategy(createEnvStrategy());
  isProxyConfigured = true;
}

export function configureCourtsApiAuth(strategy) {
  courtsApiProxy.setStrategy(strategy);
  isProxyConfigured = true;
}

export function setCourtsApiAuthMethod(method, credential, options = {}) {
  courtsApiProxy.setAuthMethod(method, credential, options);
  isProxyConfigured = true;
}

export function getCourtsApiProxyMetrics() {
  return courtsApiProxy.getMetrics();
}

export function resetCourtsApiProxyMetrics() {
  courtsApiProxy.resetMetrics();
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

export async function fetchCourts({ signal } = {}) {
  ensureProxyConfigured();
  const response = await courtsApiProxy.get(`${API_BASE}/courts`, { signal });

  if (!response.ok) {
    throw new Error('Не вдалося завантажити список площадок');
  }

  const data = await readJson(response);
  return Array.isArray(data?.courts) ? data.courts : [];
}

export async function fetchCourtById(courtId, { signal } = {}) {
  if (!courtId) return null;

  ensureProxyConfigured();
  const response = await courtsApiProxy.get(`${API_BASE}/courts/${encodeURIComponent(courtId)}`, {
    signal,
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Не вдалося завантажити площадку');
  }

  const data = await readJson(response);
  return data?.court ?? null;
}