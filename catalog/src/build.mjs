import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fetchCameraDatabase } from './source-camera-database.mjs';
import { fetchLensDb } from './source-lensdb.mjs';
import { fetchLensfun } from './source-lensfun.mjs';
import { fetchSensorSourceSummaries } from './source-sensor-databases.mjs';
import { buildFullCatalog } from './full-catalog.mjs';
import { COMPACT_CAMERA_OVERRIDES } from './overrides/compact-cameras.mjs';
import { BODY_CAMERAS, CURATED_LENSES } from './overrides/curated-gear.mjs';
import { assertCatalogExportValid } from './validate-export.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const outPath = resolve(root, 'app/public/catalog.fallback.json');

function sourceHash(text) {
  return createHash('sha256').update(text).digest('hex');
}

const [cameraDb, lensDb, lensfun, sensorSourceSummaries] = await Promise.all([
  fetchCameraDatabase(),
  fetchLensDb(),
  fetchOptionalLensfun(),
  fetchSensorSourceSummaries(),
]);

const sources = [
  sourceSummary(cameraDb, 'MIT'),
  sourceSummary(lensDb, 'CC BY-NC-SA 4.0'),
  sourceSummary(lensfun, 'LGPL-3.0-or-later / Lensfun database terms'),
  {
    id: 'curated-compact-overrides',
    license: 'Project curated data',
    records: COMPACT_CAMERA_OVERRIDES.length,
  },
  {
    id: 'curated-body-cameras',
    license: 'Project curated data',
    records: BODY_CAMERAS.length,
  },
  {
    id: 'curated-lenses',
    license: 'Project curated data',
    records: CURATED_LENSES.length,
  },
  ...sensorSourceSummaries,
];

const sourceMetaById = Object.fromEntries(sources.map((source) => [source.id, source]));
const catalog = buildFullCatalog({
  cameraDatabaseRecords: cameraDb.records,
  lensDbRecords: lensDb.records,
  lensfunRecords: lensfun.records,
  sensorSourceSummaries,
  sourceMetaById,
});

const generated = {
  generatedAt: new Date().toISOString(),
  sources,
  cameras: catalog.cameras,
  lenses: catalog.lenses,
  bindings: catalog.bindings,
  compact: catalog.compact,
  stats: catalog.stats,
  reconReport: catalog.reconReport,
};

assertCatalogExportValid(generated, { label: 'Local catalog export' });

await mkdir(resolve(outPath, '..'), { recursive: true });
await writeFile(outPath, `${JSON.stringify(generated, null, 2)}\n`);

console.log(
  [
    `Wrote ${outPath}`,
    `cameras: ${catalog.cameras.length}`,
    `lenses: ${catalog.lenses.length}`,
    `fixed bindings: ${catalog.bindings.length}`,
    `compact cameras: ${catalog.compact.cameras.length}`,
    `merged camera duplicates: ${catalog.stats.mergedCameraDuplicates}`,
    `merged lens duplicates: ${catalog.stats.mergedLensDuplicates}`,
  ].join('\n'),
);

function sourceSummary(source, license) {
  return {
    id: source.source,
    url: source.url,
    fetchedAt: source.fetchedAt,
    sha256: sourceHash(source.text),
    license,
    records: source.records?.length,
    status: source.status,
    error: source.error,
  };
}

async function fetchOptionalLensfun() {
  try {
    return { ...(await fetchLensfun()), status: 'available' };
  } catch (error) {
    return {
      source: 'lensfun',
      url: 'https://github.com/lensfun/lensfun/tree/master/data/db',
      fetchedAt: new Date().toISOString(),
      records: [],
      status: 'unavailable',
      error: error.message ?? String(error),
      text: JSON.stringify({ error: error.message ?? String(error) }),
    };
  }
}
