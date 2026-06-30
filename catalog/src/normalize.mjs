import { curatedProvenance, externalProvenance, sourceRef } from './provenance.mjs';

const FORMAT_CLASSES = [
  { id: 'ff', w: 36, h: 24, names: ['35mm film', 'full frame'] },
  { id: 'apsc', w: 23.5, h: 15.6, names: ['aps-c'] },
  { id: 'apsc-canon', w: 22.3, h: 14.9, names: ['aps-c canon'] },
  { id: 'mft', w: 17.3, h: 13, names: ['four thirds', 'micro four thirds'] },
  { id: 'compact-1in', w: 13.2, h: 8.8, names: ['1"'] },
  { id: 'compact-2-3', w: 8.8, h: 6.6, names: ['2/3"'] },
  { id: 'compact-1-1.7', w: 7.53, h: 5.64, names: ['1/1.7"'] },
  { id: 'compact-1-2.3', w: 6.16, h: 4.62, names: ['1/2.3"'] },
];

const IMPORTANT_COMPACT_RE = new RegExp(
  [
    'Ricoh GR',
    'Sony Cyber-shot DSC-RX1',
    'Sony RX1R',
    'Sony Cyber-shot DSC-RX100',
    'Sony Cyber-shot DSC-RX10',
    'Fujifilm X100',
    'Leica Q',
    'Leica D-Lux',
    'Panasonic Lumix DMC-LX100',
    'Panasonic Lumix DC-LX100',
    'Canon PowerShot G[0-9]',
  ].join('|'),
  'i',
);

export function normalizeCompactRecords(records, sourceMetaById = {}) {
  const cameras = [];
  const lenses = [];
  const bindings = [];
  const seen = new Set();

  for (const record of records) {
    const normalized = normalizeCompactRecord(record, sourceMetaById);
    if (!normalized) continue;
    if (seen.has(normalized.camera.id)) continue;
    seen.add(normalized.camera.id);
    cameras.push(normalized.camera);
    lenses.push(normalized.lens);
    bindings.push(normalized.binding);
  }

  return {
    cameras: cameras.sort(byMakerName),
    lenses: lenses.sort(byMakerName),
    bindings: bindings.sort((a, b) => a.cameraId.localeCompare(b.cameraId)),
  };
}

function normalizeCompactRecord(record, sourceMetaById) {
  const maker = clean(record.Brand);
  const model = clean(record.Model);
  if (!maker || !model) return null;
  const display = `${maker} ${model}`;
  if (!IMPORTANT_COMPACT_RE.test(display)) return null;

  const focalEq = parseRange(record['Focal length (35mm equiv.)']);
  const aperture = parseApertureRange(record['Max aperture']);
  const crop = parseNumber(record['Crop factor']);
  if (!focalEq || !aperture || !crop || crop <= 0) return null;

  const sensor = parseSensorSize(record['Sensor size']);
  const formatId = formatIdForSensor(sensor, crop, maker);
  if (!formatId) return null;

  const id = slug(`${maker}-${model}`);
  const mount = `fixed-${id}`;
  const focalMin = round(focalEq.min / crop, 1);
  const focalMax = round(focalEq.max / crop, 1);
  const apWide = aperture.min;
  const apTele = aperture.max ?? aperture.min;
  const lensName = fixedLensName(focalMin, focalMax, apWide, apTele, focalEq);

  const camera = {
    id,
    name: model,
    maker,
    mount,
    formatId,
    fixedLensId: `${id}-fixed-lens`,
    year: parseInteger(record.Year),
    ...compactProvenance(record, id, ['identity', 'formatId', 'fixedLensId', 'year'], sourceMetaById),
  };

  const aperturePoints =
    focalMin === focalMax
      ? [{ focal: focalMin, maxAperture: apWide }]
      : [
          { focal: focalMin, maxAperture: apWide },
          { focal: focalMax, maxAperture: apTele },
        ];

  const lens = {
    id: camera.fixedLensId,
    name: lensName,
    maker,
    type: focalMin === focalMax ? 'prime' : 'zoom',
    focalMin,
    focalMax,
    apMax: apWide,
    apMin: 16,
    mounts: [mount],
    coversFormatIds: [formatId],
    af: true,
    thirdParty: false,
    fixed: true,
    aperturePoints,
    ...compactProvenance(record, `${id}-fixed-lens`, ['identity', 'fixedLens', 'coverage', 'focal', 'aperture'], sourceMetaById),
  };

  return {
    camera,
    lens,
    binding: {
      cameraId: camera.id,
      lensId: lens.id,
      type: 'fixed',
    },
  };
}

function compactProvenance(record, recordId, fields, sourceMetaById) {
  const sourceId = clean(record.source) || 'camera-database';
  if (sourceId.startsWith('curated-')) {
    return curatedProvenance(recordId, 'missing-from-current-external-sources', fields);
  }
  const sourceMeta = sourceMetaById[sourceId] ?? {};
  return externalProvenance(sourceRef({
    id: sourceId,
    recordId,
    url: sourceMeta.url,
    license: sourceMeta.license,
    fetchedAt: sourceMeta.fetchedAt,
    confidence: 0.84,
    fields,
  }));
}

function fixedLensName(focalMin, focalMax, apWide, apTele, focalEq) {
  const focal = focalMin === focalMax ? `${focalMin}mm` : `${focalMin}-${focalMax}mm`;
  const ap = apWide === apTele ? `F${apWide}` : `F${apWide}-${apTele}`;
  const eq = focalEq.min === focalEq.max ? `${focalEq.min}mm equiv.` : `${focalEq.min}-${focalEq.max}mm equiv.`;
  return `Fixed ${focal} ${ap} (${eq})`;
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
  return { w: Number(match[1]), h: Number(match[2]) };
}

function parseRange(value) {
  const nums = numbers(value);
  if (nums.length === 0) return null;
  return { min: nums[0], max: nums[1] ?? nums[0] };
}

function parseApertureRange(value) {
  const nums = numbers(value);
  if (nums.length === 0) return null;
  return { min: nums[0], max: nums[1] ?? nums[0] };
}

function parseNumber(value) {
  const n = numbers(value)[0];
  return Number.isFinite(n) ? n : null;
}

function parseInteger(value) {
  const n = parseNumber(value);
  return n == null ? undefined : Math.round(n);
}

function numbers(value) {
  return String(value ?? '')
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter(Number.isFinite) ?? [];
}

function diagonal({ w, h }) {
  return Math.hypot(w, h);
}

function close(a, b) {
  return Math.abs(a - b) < 0.35;
}

function clean(value) {
  const text = String(value ?? '').trim();
  return text && text !== 'null' ? text : '';
}

function round(value, digits) {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
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

function byMakerName(a, b) {
  return a.maker.localeCompare(b.maker) || a.name.localeCompare(b.name);
}
