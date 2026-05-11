import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.COMMENTS_API_PORT || 3001);
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DB_DIR, 'comments.db.json');
const NDJSON_DIR = path.join(DB_DIR, 'comments-ndjson');

async function ensureDbFile() {
  await fs.mkdir(DB_DIR, { recursive: true });

  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify({ courts: {} }, null, 2), 'utf8');
  }
}

async function readDb() {
  await ensureDbFile();

  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
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

async function writeDb(db) {
  await ensureDbFile();

  const tempPath = `${DB_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(tempPath, DB_PATH);
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

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const courtId = getCourtIdFromPath(url.pathname);
  const streamCourtId = getCourtIdFromStreamPath(url.pathname);

  if (request.method === 'GET' && url.pathname === '/') {
    sendText(
      response,
      200,
      'Comments JSON API is running. Use /api/health or /api/courts/:courtId/comments.'
    );
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
      // If something fails mid-stream, just end the response.
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

    const db = await readDb();
    const nextComments = [comment, ...(Array.isArray(db.courts[courtId]) ? db.courts[courtId] : [])];

    db.courts[courtId] = nextComments;
    await writeDb(db);

    const filePath = await ensureCourtNdjson(courtId);
    await prependNdjsonLine(filePath, JSON.stringify(comment));

    sendJson(response, 201, { courtId, comment, comments: nextComments });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true });
    return;
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
        console.log(
          `Comments JSON API already running on http://localhost:${PORT} (skipping new instance).`
        );
        process.exit(0);
      }

      console.error(
        `Port ${PORT} is already in use, and no healthy Comments API was detected on /api/health.`
      );
      process.exit(1);
    })();
    return;
  }

  console.error(error);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Comments JSON API listening on http://localhost:${PORT}`);
});