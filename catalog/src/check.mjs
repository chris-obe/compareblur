import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname);
const catalogPath = resolve(root, 'app/public/catalog.fallback.json');
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));

const cameras = catalog.cameras ?? [];
const lenses = catalog.lenses ?? [];
const bindings = catalog.bindings ?? [];
const compactCameras = catalog.compact?.cameras ?? [];
const lensesById = new Map(lenses.map((lens) => [lens.id, lens]));
const camerasById = new Map(cameras.map((camera) => [camera.id, camera]));

const errors = [];

for (const camera of cameras) {
  if (!camera.id || !camera.maker || !camera.name) errors.push(`Camera is missing identity: ${JSON.stringify(camera)}`);
  if (!camera.formatId) errors.push(`Camera ${camera.id} has no formatId`);
  if (camera.mount?.startsWith('fixed-') && !camera.fixedLensId) errors.push(`Fixed camera ${camera.id} has no fixedLensId`);
}

for (const lens of lenses) {
  if (!lens.id || !lens.maker || !lens.name) errors.push(`Lens is missing identity: ${JSON.stringify(lens)}`);
  if (!Array.isArray(lens.aperturePoints) || lens.aperturePoints.length === 0) {
    errors.push(`Lens ${lens.id} has no aperturePoints`);
  }
  if (!Array.isArray(lens.mounts) || lens.mounts.length === 0) {
    errors.push(`Lens ${lens.id} has no mounts`);
  }
  if (lens.fixed && (lens.mounts.length !== 1 || !lens.mounts[0].startsWith('fixed-'))) {
    errors.push(`Fixed compact lens ${lens.id} has invalid mount`);
  }
  if (lens.focalMax < lens.focalMin) errors.push(`Lens ${lens.id} has inverted focal range`);
}

for (const binding of bindings) {
  if (binding.type !== 'fixed') errors.push(`Binding ${JSON.stringify(binding)} is not fixed`);
  if (!camerasById.has(binding.cameraId)) errors.push(`Binding references missing camera ${binding.cameraId}`);
  if (!lensesById.has(binding.lensId)) errors.push(`Binding references missing lens ${binding.lensId}`);
}

for (const camera of compactCameras) {
  if (!bindings.some((binding) => binding.cameraId === camera.id && binding.lensId === camera.fixedLensId)) {
    errors.push(`Camera ${camera.id} has no matching fixed binding`);
  }
}

for (const required of ['sony-a7iv', 'canon-r5', 'fuji-gfx100s', 'ricoh-gr-iii', 'ricoh-gr1', 'sony-cyber-shot-dsc-rx1r-ii']) {
  if (!camerasById.has(required)) errors.push(`Required camera missing: ${required}`);
}

for (const required of ['gf-110-2', 'ef-50-18', '7artisans-mf-75mm-f28-ii-fisheye']) {
  if (!lensesById.has(required)) errors.push(`Required lens missing: ${required}`);
}

if (cameras.length < 150) {
  errors.push(`Expected full camera catalog, got ${cameras.length}`);
}

if (lenses.length < 700) {
  errors.push(`Expected full lens catalog, got ${lenses.length}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(
  [
    'Catalog check passed',
    `cameras: ${cameras.length}`,
    `lenses: ${lenses.length}`,
    `fixed bindings: ${bindings.length}`,
    `compact cameras: ${compactCameras.length}`,
  ].join('\n'),
);
