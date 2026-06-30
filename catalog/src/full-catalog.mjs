import { BODY_CAMERAS, CURATED_LENSES } from './overrides/curated-gear.mjs';
import { COMPACT_CAMERA_OVERRIDES } from './overrides/compact-cameras.mjs';
import { normalizeCameraDatabaseBodies } from './normalize-camera-bodies.mjs';
import { normalizeCompactRecords } from './normalize.mjs';
import { normalizeLensDbRecords } from './normalize-lensdb.mjs';
import { mergeProvenance } from './provenance.mjs';

export function buildFullCatalog({
  cameraDatabaseRecords,
  lensDbRecords,
  lensfunRecords = [],
  sensorSourceSummaries = [],
  sourceMetaById = {},
}) {
  const compact = normalizeCompactRecords(
    [...cameraDatabaseRecords, ...COMPACT_CAMERA_OVERRIDES],
    sourceMetaById,
  );
  const cameraDbBodies = normalizeCameraDatabaseBodies(cameraDatabaseRecords, sourceMetaById['camera-database']);
  const lensDbLenses = normalizeLensDbRecords(lensDbRecords, sourceMetaById['lens-db']);

  const cameraJoin = joinCameras([...BODY_CAMERAS, ...cameraDbBodies, ...compact.cameras]);
  const lensJoin = joinLenses([...CURATED_LENSES, ...lensDbLenses, ...compact.lenses]);

  const cameras = cameraJoin.items.sort(byMakerName);
  const lenses = lensJoin.items.sort(byMakerName);
  const reconReport = buildReconReport({
    cameras,
    lenses,
    compact,
    cameraDbBodies,
    lensDbLenses,
    lensfunRecords,
    sensorSourceSummaries,
    cameraJoin,
    lensJoin,
  });

  return {
    cameras,
    lenses,
    bindings: compact.bindings,
    compact,
    stats: {
      bodyCameras: BODY_CAMERAS.length,
      sourceBodyCameras: cameraDbBodies.length,
      compactCameras: compact.cameras.length,
      curatedLenses: CURATED_LENSES.length,
      lensDbLenses: lensDbLenses.length,
      fixedCompactLenses: compact.lenses.length,
      mergedCameraDuplicates: cameraJoin.duplicatesMerged,
      mergedLensDuplicates: lensJoin.duplicatesMerged,
    },
    reconReport,
  };
}

function joinCameras(records) {
  const map = new Map();
  const rejected = [];
  let duplicatesMerged = 0;

  for (const record of records) {
    if (!record.id || !record.maker || !record.name || !record.mount || !record.formatId) {
      rejected.push({ id: record.id, reason: 'missing-camera-gate-or-identity' });
      continue;
    }
    const key = cameraKey(record);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, record);
      continue;
    }
    duplicatesMerged += 1;
    map.set(key, mergeCamera(existing, record));
  }

  return { items: [...map.values()], duplicatesMerged, rejected };
}

function joinLenses(records) {
  const map = new Map();
  const rejected = [];
  let duplicatesMerged = 0;

  for (const record of records) {
    if (!record.id || !record.maker || !record.name || !Array.isArray(record.mounts) || !Array.isArray(record.coversFormatIds)) {
      rejected.push({ id: record.id, reason: 'missing-lens-gate-or-identity' });
      continue;
    }
    const key = record.fixed ? `fixed:${record.id}` : lensOpticalKey(record);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, record);
      continue;
    }
    duplicatesMerged += 1;
    map.set(key, mergeLens(existing, record));
  }

  return { items: [...map.values()], duplicatesMerged, rejected };
}

function mergeCamera(existing, next) {
  const preferred = preferExternal(existing, next);
  const fallback = preferred === existing ? next : existing;
  return {
    ...fallback,
    ...preferred,
    id: existing.id,
    name: preferred.name ?? existing.name,
    maker: preferred.maker ?? existing.maker,
    mount: preferred.mount ?? existing.mount,
    formatId: preferred.formatId ?? existing.formatId,
    year: preferred.year ?? fallback.year,
    ...mergeProvenance(existing, next),
  };
}

function mergeLens(existing, next) {
  const preferred = preferExternal(existing, next);
  const fallback = preferred === existing ? next : existing;
  const aperturePoints = mergeAperturePoints(existing.aperturePoints, next.aperturePoints);
  return {
    ...fallback,
    ...preferred,
    id: existing.id,
    name: preferred.name ?? existing.name,
    maker: preferred.maker ?? existing.maker,
    mounts: union(existing.mounts, next.mounts),
    coversFormatIds: union(existing.coversFormatIds, next.coversFormatIds),
    aperturePoints,
    price: preferred.price ?? fallback.price,
    ...mergeProvenance(existing, next),
  };
}

function preferExternal(a, b) {
  const rank = (item) => ({ external: 3, derived: 2, curated: 1 }[item.sourceType] ?? 0);
  return rank(b) > rank(a) ? b : a;
}

function buildReconReport({
  cameras,
  lenses,
  compact,
  cameraDbBodies,
  lensDbLenses,
  lensfunRecords,
  sensorSourceSummaries,
  cameraJoin,
  lensJoin,
}) {
  const lensfunCameras = lensfunRecords.filter((record) => record.kind === 'camera');
  const lensfunLenses = lensfunRecords.filter((record) => record.kind === 'lens');
  const lensfunMounts = lensfunRecords.filter((record) => record.kind === 'mount');
  const curatedCameras = cameras.filter((record) => record.sourceType === 'curated');
  const curatedLenses = lenses.filter((record) => record.sourceType === 'curated');

  return {
    generatedBy: 'source-first-recon-v1',
    sourceBakeoff: [
      {
        id: 'lensfun',
        role: 'compatibility-backbone-candidate',
        records: lensfunRecords.length,
        cameras: lensfunCameras.length,
        lenses: lensfunLenses.length,
        mounts: lensfunMounts.length,
        license: 'LGPL-3.0-or-later / CC-BY-SA style project database terms',
        status: lensfunRecords.length ? 'available' : 'unavailable',
        selectedAsCanonical: false,
      },
      {
        id: 'lens-db',
        role: 'lens-spec-source',
        records: lensDbLenses.length,
        license: 'CC BY-NC-SA 4.0',
        status: lensDbLenses.length ? 'available' : 'unavailable',
        selectedAsCanonical: false,
      },
      {
        id: 'camera-database',
        role: 'camera-body-and-compact-source',
        records: cameraDbBodies.length + compact.cameras.length,
        bodyCameras: cameraDbBodies.length,
        fixedLensCameras: compact.cameras.length,
        license: 'MIT',
        status: cameraDbBodies.length || compact.cameras.length ? 'available' : 'unavailable',
        selectedAsCanonical: false,
      },
      ...sensorSourceSummaries,
    ],
    countsBySourceType: countBy([...cameras, ...lenses], (item) => item.sourceType ?? 'unknown'),
    countsByPrimarySource: countBy([...cameras, ...lenses], (item) => item.source ?? 'unknown'),
    curatedGaps: {
      cameras: curatedCameras.length,
      lenses: curatedLenses.length,
      sampleCameraIds: curatedCameras.slice(0, 10).map((item) => item.id),
      sampleLensIds: curatedLenses.slice(0, 10).map((item) => item.id),
    },
    duplicatesMerged: {
      cameras: cameraJoin.duplicatesMerged,
      lenses: lensJoin.duplicatesMerged,
    },
    rejectedRecords: {
      cameras: cameraJoin.rejected,
      lenses: lensJoin.rejected,
    },
    coverageDeltas: {
      cameraBodyRecordsFromSources: cameraDbBodies.length,
      lensRecordsFromSources: lensDbLenses.length,
      fixedLensBindings: compact.bindings.length,
    },
  };
}

function cameraKey(camera) {
  return [
    makerKey(camera.maker),
    modelKey(camera.name),
    camera.mount,
    camera.formatId,
  ].join('|');
}

function lensOpticalKey(lens) {
  return [
    makerKey(lens.maker),
    modelKey(lens.name),
    lens.type,
    lens.focalMin,
    lens.focalMax,
    lens.apMax,
  ].join('|');
}

function makerKey(value) {
  return normalize(value)
    .replace(/^om system olympus$/, 'olympus')
    .replace(/^om system$/, 'olympus')
    .replace(/^leica camera ag$/, 'leica');
}

function modelKey(value) {
  return normalize(value)
    .replace(/\b(eos|lumix|dc|dmc|leica|digital camera|camera)\b/g, ' ')
    .replace(/\bmark ii\b/g, 'ii')
    .replace(/\bmark iii\b/g, 'iii')
    .replace(/\bmark iv\b/g, 'iv')
    .replace(/\btyp\b/g, 'type')
    .replace(/\btype\s+(\d+)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[α]/gi, 'a')
    .replace(/[^\w.\s-]/g, ' ')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergeAperturePoints(a = [], b = []) {
  const map = new Map();
  for (const point of [...a, ...b]) {
    if (Number.isFinite(point?.focal) && Number.isFinite(point?.maxAperture)) {
      map.set(point.focal, point);
    }
  }
  return [...map.values()].sort((x, y) => x.focal - y.focal);
}

function union(a = [], b = []) {
  return [...new Set([...a, ...b])].sort();
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function byMakerName(a, b) {
  return a.maker.localeCompare(b.maker) || a.name.localeCompare(b.name);
}
