import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.COURTS_API_PORT || 3002);
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COURTS_PATH = path.join(ROOT_DIR, 'src', 'data', 'courts.kyiv.osm.json');
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache = null;
let cacheLoadedAt = 0;

async function readCourtsDb() {
  const now = Date.now();

  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cache;
  }

  try {
    const raw = await fs.readFile(COURTS_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    cache = {
      generatedAt: typeof parsed?.generatedAt === 'string' ? parsed.generatedAt : new Date().toISOString(),
      bbox: parsed?.bbox && typeof parsed.bbox === 'object' ? parsed.bbox : null,
      defaults: parsed?.defaults && typeof parsed.defaults === 'object' ? parsed.defaults : null,
      courts: Array.isArray(parsed?.courts) ? parsed.courts : [],
    };
    cacheLoadedAt = now;

    return cache;
  } catch (error) {
    console.error('Failed to read courts database:', error);
    return {
      generatedAt: new Date().toISOString(),
      bbox: null,
      defaults: null,
      courts: [],
    };
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  response.end(message);
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function toNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function applySearch(courts, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return courts;
  }

  return courts.filter((court) => {
    const name = normalizeText(court?.name);
    const address = normalizeText(court?.address);
    const sport = normalizeText(court?.sport);
    const type = normalizeText(court?.typeLabel);

    return [name, address, sport, type].some((field) => field.includes(normalizedQuery));
  });
}

function applyBounds(courts, searchParams) {
  const south = toNumber(searchParams.get('south'));
  const north = toNumber(searchParams.get('north'));
  const west = toNumber(searchParams.get('west'));
  const east = toNumber(searchParams.get('east'));

  if ([south, north, west, east].some((value) => value === null)) {
    return courts;
  }

  return courts.filter((court) => {
    const lat = toNumber(court?.lat);
    const lon = toNumber(court?.lon);

    if (lat === null || lon === null) {
      return false;
    }

    return lat >= south && lat <= north && lon >= west && lon <= east;
  });
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    response.end();
    return;
  }

  if (request.method !== 'GET') {
    sendText(response, 405, 'Method not allowed');
    return;
  }

  if (url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'courts-api' });
    return;
  }

  if (url.pathname === '/api/courts') {
    const db = await readCourtsDb();
    const filteredByBounds = applyBounds(db.courts, url.searchParams);
    const filteredBySearch = applySearch(filteredByBounds, url.searchParams.get('q'));

    sendJson(response, 200, {
      ok: true,
      total: db.courts.length,
      count: filteredBySearch.length,
      generatedAt: db.generatedAt,
      bbox: db.bbox,
      defaults: db.defaults,
      courts: filteredBySearch,
    });
    return;
  }

  const courtMatch = url.pathname.match(/^\/api\/courts\/([^/]+)$/);
  if (courtMatch) {
    const courtId = decodeURIComponent(courtMatch[1]);
    const db = await readCourtsDb();
    const court = db.courts.find((item) => item?.id === courtId);

    if (!court) {
      sendJson(response, 404, { ok: false, error: 'Court not found' });
      return;
    }

    sendJson(response, 200, { ok: true, court, generatedAt: db.generatedAt });
    return;
  }

  if (url.pathname === '/') {
    sendText(
      response,
      200,
      'Courts JSON API is running. Use /api/health, /api/courts, or /api/courts/:courtId.'
    );
    return;
  }

  sendText(response, 404, 'Not found');
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error('Courts API request failed:', error);
    sendJson(response, 500, { ok: false, error: 'Internal server error' });
  });
});

async function isApiHealthy() {
  try {
    const response = await fetch(`http://127.0.0.1:${PORT}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    (async () => {
      if (await isApiHealthy()) {
        console.log(`Courts API already running on http://localhost:${PORT}`);
        process.exit(0);
      }

      console.error(`Port ${PORT} is already in use, but no healthy courts API was found.`);
      process.exit(1);
    })();
    return;
  }

  console.error(error);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Courts JSON API listening on http://localhost:${PORT}`);
});