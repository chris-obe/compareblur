const MOUNT_MAP = {
  'Sony E': 'E',
  'Canon RF': 'RF',
  'Nikon Z': 'Z',
  'L-Mount': 'L',
  'Fujifilm X': 'X',
  'Micro Four Thirds': 'MFT',
  'Leica M': 'M',
};

const COVERAGE = {
  'Full Frame': ['ff', 'apsc', 'apsc-canon', 'film-135'],
  'APS-C': ['apsc', 'apsc-canon'],
  MFT: ['mft'],
  'Medium Format': ['gfx'],
};

const THIRD_PARTY = new Set([
  'Sigma', 'Tamron', 'Samyang', 'Zeiss', 'Viltrox', 'Voigtländer', 'Voigtlander',
  'Laowa', 'Tokina', 'Rokinon', 'TTArtisan', '7Artisans', 'Meike', 'Yongnuo',
  'Cosina', 'Venus Optics', 'Lensbaby',
]);

export function normalizeLensDbRecords(records, sourceMeta = {}) {
  return records
    .map((record) => toLens(record, sourceMeta))
    .filter((lens) => lens.mounts.length > 0 && lens.coversFormatIds.length > 0)
    .sort(byMakerName);
}

function toLens(record, sourceMeta) {
  const mounts = record.mounts.map((mount) => MOUNT_MAP[mount]).filter(Boolean);
  const price =
    record.priceUSD != null || record.priceMSRPUSD != null
      ? { usd: record.priceUSD ?? undefined, msrpUsd: record.priceMSRPUSD ?? undefined }
      : undefined;
  const apWide = Number(record.apertureMaxWide);
  const apTele = Number(record.apertureMaxTele ?? record.apertureMaxWide);
  const focalMin = Number(record.focalMin);
  const focalMax = Number(record.focalMax);

  const source = sourceRef({
    id: 'lens-db',
    recordId: record.id,
    url: record.productUrl ?? sourceMeta.url,
    license: sourceMeta.license ?? 'CC BY-NC-SA 4.0',
    fetchedAt: sourceMeta.fetchedAt,
    confidence: 0.9,
    fields: ['identity', 'mounts', 'coverage', 'focal', 'aperture', 'price'],
  });

  return {
    id: record.id,
    name: record.model,
    maker: record.brand,
    type: record.lensType === 'Zoom' ? 'zoom' : 'prime',
    focalMin,
    focalMax,
    apMax: apWide,
    apMin: record.apertureMin ?? 22,
    mounts,
    coversFormatIds: COVERAGE[record.format] ?? [],
    af: record.autofocus !== false,
    thirdParty: THIRD_PARTY.has(record.brand),
    aperturePoints: aperturePoints(focalMin, focalMax, apWide, apTele),
    price,
    ...externalProvenance(source),
  };
}

function aperturePoints(focalMin, focalMax, apWide, apTele) {
  if (!Number.isFinite(focalMin) || !Number.isFinite(focalMax) || !Number.isFinite(apWide)) return [];
  if (focalMin === focalMax) return [{ focal: focalMin, maxAperture: apWide }];
  return [
    { focal: focalMin, maxAperture: apWide },
    { focal: focalMax, maxAperture: Number.isFinite(apTele) ? apTele : apWide },
  ];
}

function byMakerName(a, b) {
  return a.maker.localeCompare(b.maker) || a.name.localeCompare(b.name);
}
import { externalProvenance, sourceRef } from './provenance.mjs';
