import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { catalogExportCounts, validateCatalogExport } from './validate-export.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const catalogPath = resolve(root, 'app/public/catalog.fallback.json');
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const errors = validateCatalogExport(catalog);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const counts = catalogExportCounts(catalog);
console.log(
  [
    'Catalog check passed',
    `cameras: ${counts.cameras}`,
    `lenses: ${counts.lenses}`,
    `fixed bindings: ${counts.fixedBindings}`,
    `compact cameras: ${counts.compactCameras}`,
  ].join('\n'),
);
