const DEFAULT_REQUIRED_CAMERAS = [
  'sony-a7iv',
  'canon-r5',
  'fuji-gfx100s',
  'leica-m9',
  'ricoh-gr-iii',
  'ricoh-gr1',
  'sony-cyber-shot-dsc-rx1r-ii',
];

const DEFAULT_REQUIRED_LENSES = [
  'gf-110-2',
  'ef-50-18',
  'vm-35-14-nokton-classic-ii',
  'vm-50-15-nokton-ii',
  '7artisans-mf-75mm-f28-ii-fisheye',
];

const REQUIRED_STAT_KEYS = [
  'bodyCameras',
  'sourceBodyCameras',
  'compactCameras',
  'curatedLenses',
  'lensDbLenses',
  'fixedCompactLenses',
  'mergedCameraDuplicates',
  'mergedLensDuplicates',
];

export function validateCatalogExport(catalog, options = {}) {
  const errors = [];
  const cameras = arrayAt(catalog, 'cameras', errors);
  const lenses = arrayAt(catalog, 'lenses', errors);
  const bindings = arrayAt(catalog, 'bindings', errors);
  const sources = arrayAt(catalog, 'sources', errors);
  const compact = objectAt(catalog, 'compact', errors);
  const stats = objectAt(catalog, 'stats', errors);
  const reconReport = objectAt(catalog, 'reconReport', errors);
  const compactCameras = arrayAt(catalog, 'compact.cameras', errors);
  const compactLenses = arrayAt(catalog, 'compact.lenses', errors);
  const compactBindings = arrayAt(catalog, 'compact.bindings', errors);
  const lensesById = new Map(lenses.map((lens) => [lens.id, lens]));
  const camerasById = new Map(cameras.map((camera) => [camera.id, camera]));

  if (catalog?.generatedAt != null && !isNonEmptyString(catalog.generatedAt)) {
    errors.push('Catalog generatedAt must be a string when present');
  }

  validateSources(sources, errors);
  validateStats(stats, errors);
  validateReconReport(reconReport, errors);

  for (const camera of cameras) {
    validateCamera(camera, errors);
  }

  for (const lens of lenses) {
    validateLens(lens, errors);
  }

  for (const binding of bindings) {
    validateBinding(binding, camerasById, lensesById, errors);
  }

  for (const binding of compactBindings) {
    validateBinding(binding, camerasById, lensesById, errors, 'Compact binding');
  }

  for (const camera of compactCameras) {
    if (!bindings.some((binding) => binding.cameraId === camera.id && binding.lensId === camera.fixedLensId)) {
      errors.push(`Compact camera ${camera.id} has no matching fixed binding`);
    }
  }

  for (const lens of compactLenses) {
    if (!lensesById.has(lens.id)) errors.push(`Compact lens ${lens.id} is missing from top-level lenses`);
  }

  validateRequiredRecords(camerasById, lensesById, errors, options);
  validateOpticalDuplicates(lenses, errors);

  const minCameras = options.minCameras ?? 150;
  const minLenses = options.minLenses ?? 700;
  if (cameras.length < minCameras) errors.push(`Expected full camera catalog, got ${cameras.length}`);
  if (lenses.length < minLenses) errors.push(`Expected full lens catalog, got ${lenses.length}`);

  return errors;
}

export function assertCatalogExportValid(catalog, options = {}) {
  const errors = validateCatalogExport(catalog, options);
  if (errors.length) {
    const label = options.label ? `${options.label} validation failed` : 'Catalog export validation failed';
    throw new Error(`${label}:\n${errors.join('\n')}`);
  }
}

export function catalogExportCounts(catalog) {
  return {
    cameras: catalog?.cameras?.length ?? 0,
    lenses: catalog?.lenses?.length ?? 0,
    fixedBindings: catalog?.bindings?.length ?? 0,
    compactCameras: catalog?.compact?.cameras?.length ?? 0,
  };
}

function validateCamera(camera, errors) {
  if (!camera || typeof camera !== 'object') {
    errors.push(`Camera must be an object: ${JSON.stringify(camera)}`);
    return;
  }
  if (!camera.id || !camera.maker || !camera.name) errors.push(`Camera is missing identity: ${JSON.stringify(camera)}`);
  if (!camera.formatId) errors.push(`Camera ${camera.id} has no formatId`);
  if (!camera.mount) errors.push(`Camera ${camera.id} has no mount`);
  if (camera.mount?.startsWith('fixed-') && !camera.fixedLensId) errors.push(`Fixed camera ${camera.id} has no fixedLensId`);
  checkProvenance('Camera', camera, errors);
}

function validateLens(lens, errors) {
  if (!lens || typeof lens !== 'object') {
    errors.push(`Lens must be an object: ${JSON.stringify(lens)}`);
    return;
  }
  if (!lens.id || !lens.maker || !lens.name) errors.push(`Lens is missing identity: ${JSON.stringify(lens)}`);
  if (!Array.isArray(lens.aperturePoints) || lens.aperturePoints.length === 0) {
    errors.push(`Lens ${lens.id} has no aperturePoints`);
  } else {
    for (const point of lens.aperturePoints) {
      if (!Number.isFinite(Number(point?.focal)) || !Number.isFinite(Number(point?.maxAperture))) {
        errors.push(`Lens ${lens.id} has invalid aperture point: ${JSON.stringify(point)}`);
      }
    }
  }
  if (!Array.isArray(lens.mounts) || lens.mounts.length === 0) {
    errors.push(`Lens ${lens.id} has no mounts`);
  }
  if (!Array.isArray(lens.coversFormatIds) || lens.coversFormatIds.length === 0) {
    errors.push(`Lens ${lens.id} has no coversFormatIds`);
  }
  if (lens.fixed && (lens.mounts.length !== 1 || !lens.mounts[0].startsWith('fixed-'))) {
    errors.push(`Fixed compact lens ${lens.id} has invalid mount`);
  }
  if (Number(lens.focalMax) < Number(lens.focalMin)) errors.push(`Lens ${lens.id} has inverted focal range`);
  checkProvenance('Lens', lens, errors);
}

function validateBinding(binding, camerasById, lensesById, errors, label = 'Binding') {
  if (!binding || typeof binding !== 'object') {
    errors.push(`${label} must be an object: ${JSON.stringify(binding)}`);
    return;
  }
  if (binding.type !== 'fixed') errors.push(`${label} ${JSON.stringify(binding)} is not fixed`);
  if (!camerasById.has(binding.cameraId)) errors.push(`${label} references missing camera ${binding.cameraId}`);
  if (!lensesById.has(binding.lensId)) errors.push(`${label} references missing lens ${binding.lensId}`);
}

function validateSources(sources, errors) {
  if (sources.length === 0) errors.push('Catalog has no source metadata');
  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      errors.push(`Source metadata must be an object: ${JSON.stringify(source)}`);
      continue;
    }
    if (!isNonEmptyString(source.id)) errors.push(`Source is missing id: ${JSON.stringify(source)}`);
    if (!isNonEmptyString(source.license)) errors.push(`Source ${source.id} is missing license`);
    if (!Number.isFinite(Number(source.records))) errors.push(`Source ${source.id} is missing numeric records`);
    if (source.status != null && !isNonEmptyString(source.status)) errors.push(`Source ${source.id} has invalid status`);
  }
}

function validateStats(stats, errors) {
  for (const key of REQUIRED_STAT_KEYS) {
    if (!Number.isFinite(Number(stats[key]))) errors.push(`Stats missing numeric ${key}`);
  }
}

function validateReconReport(reconReport, errors) {
  if (!isNonEmptyString(reconReport.generatedBy)) errors.push('Recon report is missing generatedBy');
  if (!Array.isArray(reconReport.sourceBakeoff) || reconReport.sourceBakeoff.length === 0) {
    errors.push('Recon report is missing sourceBakeoff rows');
  }
  for (const key of ['countsBySourceType', 'countsByPrimarySource', 'curatedGaps', 'duplicatesMerged', 'rejectedRecords', 'coverageDeltas']) {
    if (!reconReport[key] || typeof reconReport[key] !== 'object' || Array.isArray(reconReport[key])) {
      errors.push(`Recon report is missing object ${key}`);
    }
  }
}

function validateRequiredRecords(camerasById, lensesById, errors, options) {
  const requiredCameras = options.requiredCameras ?? DEFAULT_REQUIRED_CAMERAS;
  const requiredLenses = options.requiredLenses ?? DEFAULT_REQUIRED_LENSES;

  for (const required of requiredCameras) {
    if (!camerasById.has(required)) errors.push(`Required camera missing: ${required}`);
  }

  for (const required of requiredLenses) {
    if (!lensesById.has(required)) errors.push(`Required lens missing: ${required}`);
  }

  const leicaM9 = camerasById.get('leica-m9');
  if (leicaM9 && !hasSource(leicaM9, 'camera-database')) {
    errors.push('Required camera leica-m9 must be source-backed by camera-database');
  }

  for (const required of ['vm-35-14-nokton-classic-ii', 'vm-50-15-nokton-ii']) {
    const lens = lensesById.get(required);
    if (lens && (lens.sourceType !== 'curated' || lens.curatedReason !== 'missing-from-current-external-sources')) {
      errors.push(`Required VM lens ${required} must remain marked as a curated external-source gap`);
    }
  }
}

function validateOpticalDuplicates(lenses, errors) {
  const opticalKeys = new Map();
  for (const lens of lenses) {
    if (lens.fixed) continue;
    const key = lensOpticalKey(lens);
    const current = opticalKeys.get(key) ?? [];
    current.push(lens);
    opticalKeys.set(key, current);
  }
  for (const [key, matches] of opticalKeys.entries()) {
    if (matches.length > 1) {
      errors.push(`Duplicate non-fixed optical lens key ${key}: ${matches.map((lens) => lens.id).join(', ')}`);
    }
  }
}

function checkProvenance(kind, item, errors) {
  if (!['external', 'curated', 'derived'].includes(item.sourceType)) {
    errors.push(`${kind} ${item.id} has invalid sourceType: ${item.sourceType}`);
  }
  if (!Array.isArray(item.sources) || item.sources.length === 0) {
    errors.push(`${kind} ${item.id} has no sources`);
  } else {
    for (const source of item.sources) {
      if (!isNonEmptyString(source.id)) errors.push(`${kind} ${item.id} has source without id`);
      if (!isNonEmptyString(source.license)) errors.push(`${kind} ${item.id} source ${source.id} has no license`);
      if (source.confidence != null && !Number.isFinite(Number(source.confidence))) {
        errors.push(`${kind} ${item.id} source ${source.id} has invalid confidence`);
      }
      if (source.fetchedAt != null && !isNonEmptyString(source.fetchedAt)) {
        errors.push(`${kind} ${item.id} source ${source.id} has invalid fetchedAt`);
      }
    }
  }
  if (item.sourceType === 'curated' && !item.curatedReason) {
    errors.push(`${kind} ${item.id} is curated without curatedReason`);
  }
  if (item.sourceType === 'derived' && (!Array.isArray(item.derivedFrom) || item.derivedFrom.length === 0)) {
    errors.push(`${kind} ${item.id} is derived without derivedFrom`);
  }
}

function arrayAt(parent, path, errors) {
  const value = getPath(parent, path);
  if (!Array.isArray(value)) {
    errors.push(`Catalog ${path} must be an array`);
    return [];
  }
  return value;
}

function objectAt(parent, path, errors) {
  const value = getPath(parent, path);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`Catalog ${path} must be an object`);
    return {};
  }
  return value;
}

function getPath(parent, path) {
  return path.split('.').reduce((value, key) => value?.[key], parent);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasSource(item, sourceId) {
  return item.source === sourceId || item.sources?.some((source) => source.id === sourceId);
}

function lensOpticalKey(lens) {
  return [
    normalize(lens.maker),
    normalize(lens.name),
    lens.type,
    lens.focalMin,
    lens.focalMax,
    lens.apMax,
  ].join('|');
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.\s-]/g, ' ')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
