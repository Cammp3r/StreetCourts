import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Single process serving: the built frontend (dist/), the courts API, and
// the comments/check-ins API. Same-origin means no CORS setup is needed —
// this is the file to run in production (after `npm run build`).

const PORT = Number(process.env.PORT || process.env.COMMENTS_API_PORT || 3001);
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DB_DIR, 'comments.db.json');
const NDJSON_DIR = path.join(DB_DIR, 'comments-ndjson');
const CHECKINS_DB_PATH = path.join(DB_DIR, 'checkins.db.json');
const COURTS_PATH = path.join(ROOT_DIR, 'src', 'data', 'courts.kyiv.osm.json');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const COURTS_CACHE_TTL_MS = 5 * 60 * 1000;

// --- generic JSON "database" helpers (shared by comments + check-ins) ---

async function ensureDbFile(dbPath) {
  await fs.mkdir(DB_DIR, { recursive: true });

  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify({ courts: {} }, null, 2), 'utf8');
  }
}

async function readDb(dbPath = DB_PATH) {
  await ensureDbFile(dbPath);

  try {
    const raw = await fs.readFile(dbPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { courts: {} };
    }

    return {
      courts: parsed.courts && typeof parsed.courts === 'object' && !Array.isArray(parsed.courts)
        ? parsed.courts
        : {},
    };
  } catch {
    return { courts: {} };
  }
}

async function writeDb(db, dbPath = DB_PATH) {
  await ensureDbFile(dbPath);

  const tempPath = `${dbPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(tempPath, dbPath);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(message);
}

function parseJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Payload too large'));
        request.destroy();
      }
    });

    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    request.on('error', reject);
  });
}

// --- comments ---

function normalizeComment({ author, text }) {
  const trimmedText = typeof text === 'string' ? text.trim() : '';
  const trimmedAuthor = typeof author === 'string' ? author.trim() : '';

  if (trimmedText.length < 4) {
    return null;
  }

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    author: trimmedAuthor || 'Анонім',
    text: trimmedText,
    createdAt: new Date().toISOString(),
  };
}

function getCourtIdFromPath(pathname) {
  const match = pathname.match(/^\/api\/courts\/([^/]+)\/comments$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getCourtIdFromStreamPath(pathname) {
  const match = pathname.match(/^\/api\/courts\/([^/]+)\/comments\/stream$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function safeCourtFileName(courtId) {
  return String(courtId).replace(/[^a-z0-9_-]/gi, '_');
}

function courtNdjsonPath(courtId) {
  return path.join(NDJSON_DIR, `${safeCourtFileName(courtId)}.ndjson`);
}

async function ensureCourtNdjson(courtId) {
  await fs.mkdir(NDJSON_DIR, { recursive: true });
  const filePath = courtNdjsonPath(courtId);

  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    // Bootstrap from JSON DB (small/legacy path). After that, streaming uses NDJSON.
    const db = await readDb();
    const comments = Array.isArray(db.courts[courtId]) ? db.courts[courtId] : [];
    const payload = comments.length
      ? `${comments.map((item) => JSON.stringify(item)).join('\n')}\n`
      : '';
    await fs.writeFile(filePath, payload, 'utf8');
    return filePath;
  }
}

async function prependNdjsonLine(filePath, line) {
  const tempPath = `${filePath}.tmp`;

  await new Promise((resolve, reject) => {
    const writer = createWriteStream(tempPath, { encoding: 'utf8' });
    writer.on('error', reject);
    writer.write(`${line}\n`);

    const reader = createReadStream(filePath);
    reader.on('error', reject);
    writer.on('finish', resolve);

    reader.pipe(writer);
  });

  await fs.rename(tempPath, filePath);
}

// --- check-ins ---

function getCourtIdFromCheckinsPath(pathname) {
  const match = pathname.match(/^\/api\/courts\/([^/]+)\/checkins$/);
  return match ? decodeURIComponent(match[1]) : null;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_SLOT_PATTERN = /^\d{2}:\d{2}$/;

function normalizeCheckinInput({ userName, day, timeSlot }) {
  const trimmedUserName = typeof userName === 'string' ? userName.trim() : '';
  const trimmedDay = typeof day === 'string' ? day.trim() : '';
  const trimmedTimeSlot = typeof timeSlot === 'string' ? timeSlot.trim() : '';

  if (!trimmedUserName || trimmedUserName.length > 60) return null;
  if (!DAY_PATTERN.test(trimmedDay)) return null;
  if (!TIME_SLOT_PATTERN.test(trimmedTimeSlot)) return null;

  const slotDate = new Date(`${trimmedDay}T${trimmedTimeSlot}:00`);
  if (Number.isNaN(slotDate.getTime()) || slotDate < new Date()) return null;

  return { userName: trimmedUserName, day: trimmedDay, timeSlot: trimmedTimeSlot };
}

// --- courts ---

let courtsCache = null;
let courtsCacheLoadedAt = 0;

async function readCourtsDb() {
  const now = Date.now();

  if (courtsCache && now - courtsCacheLoadedAt < COURTS_CACHE_TTL_MS) {
    return courtsCache;
  }

  try {
    const raw = await fs.readFile(COURTS_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    courtsCache = {
      generatedAt: typeof parsed?.generatedAt === 'string' ? parsed.generatedAt : new Date().toISOString(),
      bbox: parsed?.bbox && typeof parsed.bbox === 'object' ? parsed.bbox : null,
      defaults: parsed?.defaults && typeof parsed.defaults === 'object' ? parsed.defaults : null,
      courts: Array.isArray(parsed?.courts) ? parsed.courts : [],
    };
    courtsCacheLoadedAt = now;

    return courtsCache;
  } catch (error) {
    console.error('Failed to read courts database:', error);
    return { generatedAt: new Date().toISOString(), bbox: null, defaults: null, courts: [] };
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function applyCourtsSearch(courts, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return courts;

  return courts.filter((court) => {
    const name = normalizeText(court?.name);
    const address = normalizeText(court?.address);
    const sport = normalizeText(court?.sport);
    const type = normalizeText(court?.typeLabel);

    return [name, address, sport, type].some((field) => field.includes(normalizedQuery));
  });
}

function applyCourtsBounds(courts, searchParams) {
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
    if (lat === null || lon === null) return false;
    return lat >= south && lat <= north && lon >= west && lon <= east;
  });
}

// --- static file serving (production build) ---

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function serveStaticFile(response, filePath) {
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    response.end(data);
    return true;
  } catch {
    return false;
  }
}

// Falls back to index.html for unknown non-API GET routes so client-side
// routes (e.g. /courts/:id, /profile) work after a hard refresh.
async function tryServeFrontend(request, response, pathname) {
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(DIST_DIR, safePath);

  if (filePath.startsWith(DIST_DIR) && pathname !== '/' && (await serveStaticFile(response, filePath))) {
    return true;
  }

  return serveStaticFile(response, path.join(DIST_DIR, 'index.html'));
}

// --- routing ---

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const courtId = getCourtIdFromPath(url.pathname);
  const streamCourtId = getCourtIdFromStreamPath(url.pathname);
  const checkinsCourtId = getCourtIdFromCheckinsPath(url.pathname);

  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/courts') {
    const db = await readCourtsDb();
    const filteredByBounds = applyCourtsBounds(db.courts, url.searchParams);
    const filteredBySearch = applyCourtsSearch(filteredByBounds, url.searchParams.get('q'));

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

  const singleCourtMatch = url.pathname.match(/^\/api\/courts\/([^/]+)$/);
  if (request.method === 'GET' && singleCourtMatch) {
    const id = decodeURIComponent(singleCourtMatch[1]);
    const db = await readCourtsDb();
    const court = db.courts.find((item) => item?.id === id);

    if (!court) {
      sendJson(response, 404, { ok: false, error: 'Court not found' });
      return;
    }

    sendJson(response, 200, { ok: true, court, generatedAt: db.generatedAt });
    return;
  }

  if (request.method === 'GET' && courtId) {
    const db = await readDb();
    const comments = Array.isArray(db.courts[courtId]) ? db.courts[courtId] : [];
    sendJson(response, 200, { courtId, comments });
    return;
  }

  if (request.method === 'GET' && streamCourtId) {
    const filePath = await ensureCourtNdjson(streamCourtId);

    response.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
    });

    const readStream = createReadStream(filePath);
    request.on('close', () => readStream.destroy());
    readStream.on('error', (error) => {
      console.error(error);
      try {
        response.end();
      } catch {
        // ignore
      }
    });

    readStream.pipe(response);
    return;
  }

  if (request.method === 'POST' && courtId) {
    const payload = await parseJsonBody(request);
    const comment = normalizeComment(payload);

    if (!comment) {
      sendJson(response, 400, { error: 'Comment text is too short' });
      return;
    }

    const filePath = await ensureCourtNdjson(courtId);

    const db = await readDb();
    const nextComments = [comment, ...(Array.isArray(db.courts[courtId]) ? db.courts[courtId] : [])];

    db.courts[courtId] = nextComments;
    await writeDb(db);

    await prependNdjsonLine(filePath, JSON.stringify(comment));

    sendJson(response, 201, { courtId, comment, comments: nextComments });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/checkins') {
    const db = await readDb(CHECKINS_DB_PATH);
    const checkins = Object.values(db.courts).flat();
    sendJson(response, 200, { checkins });
    return;
  }

  if (request.method === 'GET' && checkinsCourtId) {
    const db = await readDb(CHECKINS_DB_PATH);
    const checkins = Array.isArray(db.courts[checkinsCourtId]) ? db.courts[checkinsCourtId] : [];
    sendJson(response, 200, { courtId: checkinsCourtId, checkins });
    return;
  }

  if (request.method === 'POST' && checkinsCourtId) {
    const payload = await parseJsonBody(request);
    const normalized = normalizeCheckinInput(payload);

    if (!normalized) {
      sendJson(response, 400, { error: 'Invalid userName, day or timeSlot' });
      return;
    }

    const db = await readDb(CHECKINS_DB_PATH);
    const existingCheckins = Array.isArray(db.courts[checkinsCourtId]) ? db.courts[checkinsCourtId] : [];
    const dedupeKey = `${normalized.day}|${normalized.timeSlot}|${normalized.userName.toLowerCase()}`;
    const existing = existingCheckins.find(
      (item) => `${item.day}|${item.timeSlot}|${String(item.userName).toLowerCase()}` === dedupeKey
    );

    const checkin = existing || {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      courtId: checkinsCourtId,
      userName: normalized.userName,
      day: normalized.day,
      timeSlot: normalized.timeSlot,
      createdAt: new Date().toISOString(),
    };

    if (!existing) {
      db.courts[checkinsCourtId] = [checkin, ...existingCheckins];
      await writeDb(db, CHECKINS_DB_PATH);
    }

    sendJson(response, existing ? 200 : 201, {
      courtId: checkinsCourtId,
      checkin,
      checkins: db.courts[checkinsCourtId],
    });
    return;
  }

  if (request.method === 'GET' && !url.pathname.startsWith('/api/')) {
    if (await tryServeFrontend(request, response, url.pathname)) return;
  }

  sendText(response, 404, 'Not found');
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(error);
    sendJson(response, 500, { error: 'Internal server error' });
  });
});

async function isExistingApiHealthy() {
  try {
    const response = await fetch(`http://localhost:${PORT}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    (async () => {
      const healthy = await isExistingApiHealthy();
      if (healthy) {
        console.log(`StreetCourts server already running on http://localhost:${PORT} (skipping new instance).`);
        process.exit(0);
      }

      console.error(`Port ${PORT} is already in use, and no healthy server was detected on /api/health.`);
      process.exit(1);
    })();
    return;
  }

  console.error(error);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`StreetCourts server listening on http://localhost:${PORT}`);
});
