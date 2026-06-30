import { externalProvenance, sourceRef } from './provenance.mjs';

const SUPPORTED_MOUNTS = new Set(['E', 'RF', 'Z', 'L', 'X', 'G', 'MFT', 'M', 'EF', 'F', 'K', 'A']);

const FORMAT_CLASSES = [
  { id: 'ff', w: 36, h: 24 },
  { id: 'apsc', w: 23.5, h: 15.6 },
  { id: 'apsc-canon', w: 22.3, h: 14.9 },
  { id: 'mft', w: 17.3, h: 13 },
  { id: 'gfx', w: 44, h: 33 },
  { id: 'compact-1in', w: 13.2, h: 8.8 },
  { id: 'compact-2-3', w: 8.8, h: 6.6 },
  { id: 'compact-1-1.7', w: 7.53, h: 5.64 },
  { id: 'compact-1-2.3', w: 6.16, h: 4.62 },
];

export function normalizeCameraDatabaseBodies(records, sourceMeta = {}) {
  const out = [];
  const seen = new Set();

  for (const record of records) {
    const normalized = normalizeBodyRecord(record, sourceMeta);
    if (!normalized) continue;
    if (seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    out.push(normalized);
  }

  return out.sort(byMakerName);
}

function normalizeBodyRecord(record, sourceMeta) {
  const maker = clean(record.Brand);
  const name = clean(record.Model);
  if (!maker || !name) return null;
  if (clean(record['Focal length (35mm equiv.)']) || clean(record['Max aperture'])) return null;

  const mount = mountForCamera(maker, name);
  if (!mount || !SUPPORTED_MOUNTS.has(mount)) return null;

  const sensor = parseSensorSize(record['Sensor size']);
  const crop = parseNumber(record['Crop factor']);
  const formatId = formatIdForSensor(sensor, crop, maker);
  if (!formatId || formatId.startsWith('compact-')) return null;

  const id = canonicalCameraId(maker, name);
  const source = sourceRef({
    id: 'camera-database',
    recordId: `${maker}:${name}`,
    url: sourceMeta.url,
    license: sourceMeta.license ?? 'MIT',
    fetchedAt: sourceMeta.fetchedAt,
    confidence: 0.86,
    fields: ['maker', 'name', 'formatId', 'year'],
  });

  return {
    id,
    name: displayCameraName(maker, name),
    maker: displayMaker(maker),
    mount,
    formatId,
    year: parseInteger(record.Year),
    ...externalProvenance(source),
  };
}

function mountForCamera(maker, model) {
  const brand = normalize(maker);
  const text = normalize(model);

  if (brand === 'canon') {
    if (/^eos r/.test(text)) return 'RF';
    if (/^eos( |-|)?m/.test(text)) return null;
    if (/^eos|rebel|kiss|digital rebel/.test(text)) return 'EF';
  }

  if (brand === 'nikon') {
    if (/^z[0-9f r]|^zr$/.test(text)) return 'Z';
    if (/^d[0-9]|^df$/.test(text)) return 'F';
  }

  if (brand === 'sony') {
    if (/^(a|α)?[1679][0-9]|^a7|^a9|^a1|^zv-e|^fx|^nex|^ilce/.test(text)) return 'E';
    if (/^dslr-a|^slt-a|^a[0-9]{2}$/.test(text)) return 'A';
  }

  if (brand === 'fujifilm') {
    if (/^gfx/.test(text)) return 'G';
    if (/^x-|^x[0-9]|^finepix x/.test(text)) return 'X';
  }

  if (brand === 'panasonic') {
    if (/lumix (dc-|dmc-)?s|^s[0-9]|^lumix s/.test(text)) return 'L';
    if (/lumix (dc-|dmc-)?(g|gh|gm|gx|gf)|^g[0-9]|^gh|^gx|^gm|^gf/.test(text)) return 'MFT';
  }

  if (brand === 'olympus') {
    if (/^om-|om-d|pen|e-m|e-p|e-pl|e-pm/.test(text)) return 'MFT';
  }

  if (brand === 'leica') {
    if (/^sl|^cl$|^tl|^t /.test(text)) return 'L';
    if (/^m($|[0-9 -])|^m-|^leica m/.test(text)) return 'M';
  }

  if (brand === 'pentax') {
    if (/^k-|^k[0-9]|^kp$|^kf$|^ist|^\*ist/.test(text)) return 'K';
  }

  if (brand === 'sigma') {
    if (/^fp|^bf$/.test(text)) return 'L';
  }

  return null;
}

function displayMaker(maker) {
  return maker === 'Olympus' ? 'OM System / Olympus' : maker;
}

function displayCameraName(maker, name) {
  if (maker === 'Leica' && name === 'M9 Digital Camera') return 'M9';
  return name;
}

function formatIdForSensor(sensor, crop, maker) {
  if (sensor) {
    const exact = FORMAT_CLASSES.find((f) => close(f.w, sensor.w) && close(f.h, sensor.h));
    if (exact) return exact.id === 'apsc' && maker === 'Canon' ? 'apsc-canon' : exact.id;
    const nearest = FORMAT_CLASSES
      .map((f) => ({ id: f.id, err: Math.abs(diagonal(f) - diagonal(sensor)) }))
      .sort((a, b) => a.err - b.err)[0];
    if (nearest && nearest.err < 1.2) return nearest.id === 'apsc' && maker === 'Canon' ? 'apsc-canon' : nearest.id;
  }
  if (!crop) return null;
  if (crop < 1.08) return 'ff';
  if (crop < 1.7) return maker === 'Canon' ? 'apsc-canon' : 'apsc';
  if (crop < 2.2) return 'mft';
  if (crop < 3.4) return 'compact-1in';
  if (crop < 4.6) return 'compact-2-3';
  if (crop < 5.4) return 'compact-1-1.7';
  if (crop < 6.4) return 'compact-1-2.3';
  return null;
}

function parseSensorSize(value) {
  const text = clean(value);
  if (!text) return null;
  const match = text.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*mm/i);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  return { w: Math.max(a, b), h: Math.min(a, b) };
}

function parseNumber(value) {
  const n = String(value ?? '').match(/\d+(?:\.\d+)?/)?.[0];
  return n == null ? null : Number(n);
}

function parseInteger(value) {
  const n = parseNumber(value);
  return n == null ? undefined : Math.round(n);
}

function canonicalCameraId(maker, model) {
  return slug(`${maker}-${model}`)
    .replace(/^sony-a-/, 'sony-a')
    .replace(/^sony-α/, 'sony-a')
    .replace(/-digital-camera$/, '')
    .replace(/^leica-m9$/, 'leica-m9');
}

function slug(value) {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

function normalize(value) {
  return clean(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function clean(value) {
  const text = String(value ?? '').trim();
  return text && text !== 'null' ? text : '';
}

function diagonal({ w, h }) {
  return Math.hypot(w, h);
}

function close(a, b) {
  return Math.abs(a - b) < 0.35;
}

function byMakerName(a, b) {
  return a.maker.localeCompare(b.maker) || a.name.localeCompare(b.name);
}
