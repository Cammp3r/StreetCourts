import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.COMMENTS_API_PORT || 3001);
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DB_DIR, 'comments.db.json');

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

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const courtId = getCourtIdFromPath(url.pathname);

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

server.listen(PORT, () => {
  console.log(`Comments JSON API listening on http://localhost:${PORT}`);
});