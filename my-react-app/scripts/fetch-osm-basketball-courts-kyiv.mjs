#!/usr/bin/env node
/*
Fetch street basketball courts in Kyiv from OpenStreetMap via Overpass API.

Why this source:
- OpenStreetMap is free/open data and has good coverage for sports facilities.
- Overpass API lets us query for objects tagged with sport=basketball.

Usage:
  node scripts/fetch-osm-basketball-courts-kyiv.mjs
  node scripts/fetch-osm-basketball-courts-kyiv.mjs --out src/data/courts.kyiv.osm.json --limit 150
  node scripts/fetch-osm-basketball-courts-kyiv.mjs --bbox "50.30,30.30,50.55,30.75" --out src/data/courts.kyiv.osm.json

Output:
- Writes a JSON file compatible with the app's `COURTS` model.

License:
- Data © OpenStreetMap contributors, ODbL 1.0
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';

const KYIV_BBOX = {
  // south, west, north, east
  south: 50.30,
  west: 30.30,
  north: 50.55,
  east: 30.75,
};

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
];

class HttpError extends Error {
  constructor({ url, statusCode, body }) {
    super(`HTTP ${statusCode} for ${url}${body ? `\n${body}` : ''}`);
    this.name = 'HttpError';
    this.url = url;
    this.statusCode = statusCode;
    this.body = body;
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[i + 1];
    const hasValue = next && !next.startsWith('--');

    args[key] = hasValue ? next : true;
    if (hasValue) i += 1;
  }
  return args;
}

function parseBbox(bboxStr) {
  const parts = String(bboxStr)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => Number(p));

  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    throw new Error('Invalid --bbox. Expected: "south,west,north,east" (numbers).');
  }

  const [south, west, north, east] = parts;
  if (south >= north || west >= east) {
    throw new Error('Invalid --bbox: south must be < north and west must be < east.');
  }

  return { south, west, north, east };
}

function buildUserAgent() {
  return 'StreetCourts/0.2 (https://github.com/Cammp3r/StreetCourts)';
}

function requestJson(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Failed to parse JSON from ${url}: ${String(e)}`));
            }
            return;
          }
          reject(new HttpError({ url, statusCode: res.statusCode ?? 0, body: data }));
        });
      }
    );

    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

function buildOverpassQuery({ south, west, north, east }) {
  const bbox = `${south},${west},${north},${east}`;

  // NOTE: keep it strict to outdoor basketball courts: leisure=pitch + sport=basketball
  // This is lighter than querying all sport=basketball objects.
  // `out tags center qt;` gives centers for ways/relations and uses quick timestamps.
  return `
[out:json][timeout:90];
(
  nwr["leisure"="pitch"]["sport"="basketball"](${bbox});
);
out tags center qt;
`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableOverpassError(err) {
  if (err?.name !== 'HttpError') return false;
  const code = err.statusCode;
  return code === 429 || code === 502 || code === 503 || code === 504;
}

async function fetchFromOverpass(endpoint, bbox) {
  const query = buildOverpassQuery(bbox);
  const body = new URLSearchParams({ data: query }).toString();

  return await requestJson(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': buildUserAgent(),
    },
    body,
  });
}

async function fetchFromAnyOverpass(bbox, { endpoints = OVERPASS_ENDPOINTS, retriesPerEndpoint = 2 } = {}) {
  let lastErr;

  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt <= retriesPerEndpoint; attempt += 1) {
      try {
        if (attempt > 0) {
          // simple backoff: 1s, 2s, 3s...
          await sleep(1000 * (attempt + 1));
        }
        return await fetchFromOverpass(endpoint, bbox);
      } catch (err) {
        lastErr = err;
        if (!isRetryableOverpassError(err)) {
          throw err;
        }
      }
    }
  }

  throw lastErr ?? new Error('Failed to fetch from Overpass');
}

function pickLatLon(element) {
  if (typeof element?.lat === 'number' && typeof element?.lon === 'number') {
    return { lat: element.lat, lon: element.lon };
  }
  if (typeof element?.center?.lat === 'number' && typeof element?.center?.lon === 'number') {
    return { lat: element.center.lat, lon: element.center.lon };
  }
  return null;
}

function pickName(tags) {
  if (!tags) return 'Баскетбольний майданчик';
  return tags['name:uk'] || tags['name'] || 'Баскетбольний майданчик';
}

function buildAddress(tags) {
  if (!tags) return 'Київ (адреса невідома)';

  const street = tags['addr:street'];
  const house = tags['addr:housenumber'];
  const city = tags['addr:city'];

  const streetPart = [street, house].filter(Boolean).join(', ');
  const parts = [];
  if (streetPart) parts.push(streetPart);
  if (city) parts.push(city);

  return parts.join(' • ') || 'Київ (адреса невідома)';
}

function normalizeToAppCourt(element) {
  const pos = pickLatLon(element);
  if (!pos) return null;

  const tags = element.tags ?? {};

  return {
    id: `osm-${element.type}-${element.id}`,

    // meta
    source: 'osm',
    osmType: element.type,
    osmId: element.id,

    // UI fields
    typeLabel: 'Баскетбол',
    badgeClassName: 'court-type-badge badge-basket',
    name: pickName(tags),
    address: buildAddress(tags),
    image:
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=200&q=80',
    statusDotClassName: 'dot free',
    statusText: 'Зараз: Невідомо (OSM)',
    selected: false,

    // geo
    lat: pos.lat,
    lon: pos.lon,
  };
}

function dedupeById(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function sortCourts(courts) {
  return [...courts].sort((a, b) => {
    const an = String(a.name ?? '');
    const bn = String(b.name ?? '');
    const cmp = an.localeCompare(bn, 'uk');
    if (cmp !== 0) return cmp;
    return String(a.id).localeCompare(String(b.id));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const outPath = typeof args.out === 'string' ? args.out : 'src/data/courts.kyiv.osm.json';
  const limit = args.limit ? Number(args.limit) : undefined;

  if (limit !== undefined && (Number.isNaN(limit) || limit <= 0)) {
    throw new Error('Invalid --limit. Must be a positive number.');
  }

  const bbox = typeof args.bbox === 'string' ? parseBbox(args.bbox) : KYIV_BBOX;

  const overpass = await fetchFromAnyOverpass(bbox);
  const elements = Array.isArray(overpass?.elements) ? overpass.elements : [];

  let courts = sortCourts(dedupeById(elements.map(normalizeToAppCourt)));
  if (limit !== undefined) courts = courts.slice(0, limit);
  if (courts.length > 0) courts[0].selected = true;

  const payload = {
    city: 'Kyiv',
    country: 'UA',
    source: 'OpenStreetMap via Overpass API',
    license: 'ODbL-1.0',
    generatedAt: new Date().toISOString(),
    bbox,
    count: courts.length,
    courts,
  };

  const resolvedOut = path.isAbsolute(outPath)
    ? outPath
    : path.resolve(process.cwd(), outPath);

  await fs.mkdir(path.dirname(resolvedOut), { recursive: true });
  await fs.writeFile(resolvedOut, JSON.stringify(payload, null, 2), 'utf8');

  process.stdout.write(`Saved ${courts.length} Kyiv basketball courts -> ${outPath}\n`);
}

main().catch((err) => {
  process.stderr.write(String(err?.stack ?? err) + '\n');
  process.exitCode = 1;
});
