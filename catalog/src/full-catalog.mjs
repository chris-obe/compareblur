import { BODY_CAMERAS, CURATED_LENSES } from './overrides/curated-gear.mjs';
import { COMPACT_CAMERA_OVERRIDES } from './overrides/compact-cameras.mjs';
import { normalizeCompactRecords } from './normalize.mjs';
import { normalizeLensDbRecords } from './normalize-lensdb.mjs';

export function buildFullCatalog({ cameraDatabaseRecords, lensDbRecords }) {
  const compact = normalizeCompactRecords([
    ...cameraDatabaseRecords,
    ...COMPACT_CAMERA_OVERRIDES,
  ]);

  const lensDbLenses = normalizeLensDbRecords(lensDbRecords);
  const cameras = mergeById(BODY_CAMERAS, compact.cameras).sort(byMakerName);
  const lenses = mergeById([...CURATED_LENSES, ...lensDbLenses], compact.lenses).sort(byMakerName);

  return {
    cameras,
    lenses,
    bindings: compact.bindings,
    compact,
    stats: {
      bodyCameras: BODY_CAMERAS.length,
      compactCameras: compact.cameras.length,
      curatedLenses: CURATED_LENSES.length,
      lensDbLenses: lensDbLenses.length,
      fixedCompactLenses: compact.lenses.length,
    },
  };
}

function mergeById(base, extra) {
  const map = new Map();
  for (const item of [...base, ...extra]) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
}

function byMakerName(a, b) {
  return a.maker.localeCompare(b.maker) || a.name.localeCompare(b.name);
}
