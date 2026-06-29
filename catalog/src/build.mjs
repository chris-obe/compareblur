import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fetchCameraDatabase } from './source-camera-database.mjs';
import { fetchLensDb } from './source-lensdb.mjs';
import { buildFullCatalog } from './full-catalog.mjs';
import { COMPACT_CAMERA_OVERRIDES } from './overrides/compact-cameras.mjs';
import { BODY_CAMERAS, CURATED_LENSES } from './overrides/curated-gear.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const outPath = resolve(root, 'app/public/catalog.fallback.json');

function sourceHash(text) {
  return createHash('sha256').update(text).digest('hex');
}

const [cameraDb, lensDb] = await Promise.all([fetchCameraDatabase(), fetchLensDb()]);
const catalog = buildFullCatalog({
  cameraDatabaseRecords: cameraDb.records,
  lensDbRecords: lensDb.records,
});

const generated = {
  generatedAt: new Date().toISOString(),
  sources: [
    {
      id: cameraDb.source,
      url: cameraDb.url,
      fetchedAt: cameraDb.fetchedAt,
      sha256: sourceHash(cameraDb.text),
      license: 'MIT',
    },
    {
      id: lensDb.source,
      url: lensDb.url,
      fetchedAt: lensDb.fetchedAt,
      sha256: sourceHash(lensDb.text),
      license: 'CC BY-NC-SA 4.0',
    },
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
  ],
  cameras: catalog.cameras,
  lenses: catalog.lenses,
  bindings: catalog.bindings,
  compact: catalog.compact,
  stats: catalog.stats,
};

await mkdir(resolve(outPath, '..'), { recursive: true });
await writeFile(outPath, `${JSON.stringify(generated, null, 2)}\n`);

console.log(
  [
    `Wrote ${outPath}`,
    `cameras: ${catalog.cameras.length}`,
    `lenses: ${catalog.lenses.length}`,
    `fixed bindings: ${catalog.bindings.length}`,
    `compact cameras: ${catalog.compact.cameras.length}`,
  ].join('\n'),
);
