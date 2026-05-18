import fs from 'node:fs/promises';
import path from 'node:path';

const KYIV_BBOX = {
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

const DEFAULTS = {
  typeLabel: 'Баскетбол',
  badgeClassName: 'court-type-badge badge-basket',
  image:
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=200&q=80',
  statusDotClassName: 'dot free',
  statusText: 'Зараз: Невідомо (OSM)',
};

const SPORT_DEFAULTS = {
  basketball: {
    typeLabel: 'Баскетбол',
    badgeClassName: 'court-type-badge badge-basket',
    fallbackName: 'Баскетбольний майданчик',
  },
  volleyball: {
    typeLabel: 'Волейбол',
    badgeClassName: 'court-type-badge badge-volley',
    fallbackName: 'Волейбольний майданчик',
    image:
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=200&q=80',
  },
};

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

function buildOverpassQuery({ south, west, north, east }) {
  const bbox = `${south},${west},${north},${east}`;

  return `
[out:json][timeout:90];
(
  nwr["leisure"="pitch"]["sport"="basketball"](${bbox});
  nwr["leisure"="pitch"]["sport"="volleyball"](${bbox});
);
out tags center qt;
`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableStatus(code) {
  return code === 429 || code === 502 || code === 503 || code === 504;
}

async function fetchFromAnyOverpass(bbox, { endpoints = OVERPASS_ENDPOINTS, retriesPerEndpoint = 2 } = {}) {
  const query = buildOverpassQuery(bbox);
  let lastErr;

  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt <= retriesPerEndpoint; attempt += 1) {
      try {
        if (attempt > 0) await sleep(1000 * (attempt + 1));

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': buildUserAgent(),
          },
          body: new URLSearchParams({ data: query }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          const err = new Error(`HTTP ${res.status} for ${endpoint}${text ? `\n${text}` : ''}`);
          err.statusCode = res.status;
          throw err;
        }

        return await res.json();
      } catch (err) {
        lastErr = err;
        const statusCode = err?.statusCode;
        if (!isRetryableStatus(statusCode)) throw err;
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

function pickSport(tags) {
  const sport = String(tags?.sport ?? '').toLowerCase();
  return sport === 'volleyball' ? 'volleyball' : 'basketball';
}

function pickName(tags, sport) {
  const defaults = SPORT_DEFAULTS[sport] ?? SPORT_DEFAULTS.basketball;
  if (!tags) return defaults.fallbackName;
  return tags['name:uk'] || tags['name'] || defaults.fallbackName;
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

  const osm_addr = parts.join(' • ');
  if (osm_addr && osm_addr !== '') return osm_addr;

  const name = tags['name'] || tags['name:uk'];
  if (name && name !== '') return name;

  return 'Київ (адреса невідома)';
}

async function getAddressFromNominatim(lat, lon) {
  try {
    await sleep(100);

    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lon);
    url.searchParams.set('zoom', 18);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', 1);
    url.searchParams.set('accept-language', 'uk');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': buildUserAgent(),
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.address) return null;

    const addr = data.address;

    const parts = [];

    if (addr.road || addr.street) {
      const road = addr.road || addr.street;
      const house = addr.house_number || '';
      if (house) parts.push(road + ', ' + house);
      else parts.push(road);
    }

    if (addr.neighbourhood || addr.suburb) {
      parts.push(addr.neighbourhood || addr.suburb);
    }

    if (addr.city || addr.town || addr.village) {
      parts.push(addr.city || addr.town || addr.village);
    }

    return parts.length > 0 ? parts.join(' • ') : null;
  } catch (err) {
    return null;
  }
}

async function normalizeToCourt(element) {
  const pos = pickLatLon(element);
  if (!pos) return null;

  const tags = element.tags ?? {};
  const sport = pickSport(tags);
  const defaults = SPORT_DEFAULTS[sport] ?? SPORT_DEFAULTS.basketball;

  let address = buildAddress(tags);

  if (address === 'Київ (адреса невідома)') {
    const nominatimAddr = await getAddressFromNominatim(pos.lat, pos.lon);
    if (nominatimAddr) {
      address = nominatimAddr;
    }
  }

  return {
    id: `osm-${element.type}-${element.id}`,
    sport,
    typeLabel: defaults.typeLabel,
    badgeClassName: defaults.badgeClassName,
    ...(defaults.image ? { image: defaults.image } : {}),
    name: pickName(tags, sport),
    address,
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

function limitCourtsBySport(courts, limit) {
  if (limit === undefined || courts.length <= limit) return courts;

  const grouped = new Map();
  for (const court of courts) {
    const sport = court?.sport || 'basketball';
    if (!grouped.has(sport)) grouped.set(sport, []);
    grouped.get(sport).push(court);
  }

  const groups = [...grouped.values()];
  const out = [];
  let index = 0;

  while (out.length < limit && groups.some((group) => index < group.length)) {
    for (const group of groups) {
      if (out.length >= limit) break;
      if (index < group.length) out.push(group[index]);
    }
    index += 1;
  }

  return out;
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

  const courtsWithNulls = await Promise.all(elements.map(normalizeToCourt));
  let courts = dedupeById(courtsWithNulls);
  courts = limitCourtsBySport(courts, limit);

  const payload = {
    generatedAt: new Date().toISOString(),
    bbox,
    defaults: DEFAULTS,
    courts,
  };

  const resolvedOut = path.isAbsolute(outPath) ? outPath : path.resolve(process.cwd(), outPath);
  await fs.mkdir(path.dirname(resolvedOut), { recursive: true });
  await fs.writeFile(resolvedOut, JSON.stringify(payload, null, 2), 'utf8');

  process.stdout.write(`Saved ${courts.length} Kyiv basketball/volleyball courts -> ${outPath}\n`);
}

main().catch((err) => {
  process.stderr.write(String(err?.stack ?? err) + '\n');
  process.exitCode = 1;
});
