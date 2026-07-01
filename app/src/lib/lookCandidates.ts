import { cropFactor, getFormat, type Format } from './engine';
import { apertureRangeLabel, cameraFormat, lensesForCamera, maxApertureAtFocal, type Camera, type CatalogLens } from './gear';
import { resolveGalleryFormat } from './galleryFormat';
import type { CompareSystem } from '../store/CompareProvider';
import type { GalleryItem, OwnedCamera, OwnedLens } from './types';
import type { LookCandidate, LookSource, ReferenceLook } from './lookMatching';

export interface KitComboCandidate {
  id: string;
  label: string;
  bodyName: string;
  lensName: string;
  formatId: string;
  focalMin: number;
  focalMax: number;
  apMax: number;
  apMin: number;
  aperturePoints?: CatalogLens['aperturePoints'];
  type: CatalogLens['type'];
  mount?: string;
  cameraId?: string;
  lensId?: string;
  cameraCatalogId?: string;
  lensCatalogId?: string;
}

const shortFormat = (format: Format) => format.name.replace(/\s*\(.*?\)\s*/g, '').trim();

export function kitComboCandidates(cameras: OwnedCamera[], lenses: OwnedLens[]): KitComboCandidate[] {
  const combos: KitComboCandidate[] = [];

  for (const lens of lenses) {
    const compatibleBodies = cameras.filter(
      (camera) => camera.mount === lens.mount && lens.coversFormatIds.includes(camera.formatId),
    );
    const bodies = compatibleBodies.length ? compatibleBodies : [null];

    for (const body of bodies) {
      const formatId = body?.formatId ?? lens.coversFormatIds[0] ?? 'ff';
      const format = getFormat(formatId);
      const bodyName = body ? body.name : shortFormat(format);
      combos.push({
        id: `${lens.id}|${body?.id ?? 'native'}`,
        label: `${bodyName} · ${lens.name} · ${cropFactor(format).toFixed(1)}x`,
        bodyName,
        lensName: lens.name,
        formatId,
        focalMin: lens.focalMin,
        focalMax: lens.focalMax,
        apMax: lens.apMax,
        apMin: lens.apMin,
        aperturePoints: lens.aperturePoints,
        type: lens.type,
        mount: lens.mount,
        cameraId: body?.id,
        lensId: lens.id,
        cameraCatalogId: body?.catalogId,
        lensCatalogId: lens.catalogId,
      });
    }
  }

  return combos;
}

export function kitLookCandidates(cameras: OwnedCamera[], lenses: OwnedLens[]): LookCandidate[] {
  return kitComboCandidates(cameras, lenses).map((combo) => ({
    id: `kit:${combo.id}`,
    label: combo.label,
    detail: `${rangeLabel(combo)} · ${apertureRangeLabel(combo)}`,
    bodyName: combo.bodyName,
    lensName: combo.lensName,
    format: getFormat(combo.formatId),
    focalMin: combo.focalMin,
    focalMax: combo.focalMax,
    apMax: combo.apMax,
    apMin: combo.apMin,
    aperturePoints: combo.aperturePoints,
    type: combo.type,
    group: 'kit',
    source: {
      type: 'kit',
      cameraId: combo.cameraId,
      lensId: combo.lensId,
      cameraCatalogId: combo.cameraCatalogId,
      lensCatalogId: combo.lensCatalogId,
      mount: combo.mount,
    },
  }));
}

export function catalogLookCandidatesForCamera(camera: Camera | null | undefined, lenses: CatalogLens[]): LookCandidate[] {
  if (!camera) return [];
  return lensesForCamera(camera, lenses).map((lens) => ({
    id: `catalog:${camera.id}:${lens.id}`,
    label: `${camera.name} · ${lens.maker} ${lens.name}`,
    detail: `${rangeLabel(lens)} · ${apertureRangeLabel(lens)} · ${camera.mount}`,
    bodyName: camera.name,
    lensName: `${lens.maker} ${lens.name}`,
    format: cameraFormat(camera),
    focalMin: lens.focalMin,
    focalMax: lens.focalMax,
    apMax: lens.apMax,
    apMin: lens.apMin,
    aperturePoints: lens.aperturePoints,
    type: lens.type,
    group: 'mount',
    source: { type: 'catalog', cameraId: camera.id, lensId: lens.id, mount: camera.mount },
  }));
}

export function compareSystemToReference(system: CompareSystem, subjectWidthM: number, focusDistanceM: number | null): ReferenceLook {
  return {
    id: system.id,
    label: system.context,
    detail: `${Math.round(system.focal)}mm · ƒ/${round1(system.aperture)}`,
    format: system.format,
    focal: system.focal,
    aperture: system.aperture,
    subjectWidthM: system.subjectWidthM ?? subjectWidthM,
    focusDistanceM,
    source: system.source ?? { type: 'manual' },
  };
}

export function galleryItemToReference(item: GalleryItem): ReferenceLook {
  const { format } = resolveGalleryFormat(item.formatId);
  return {
    id: `photo:${item.id}`,
    label: item.title,
    detail: `${item.camera} · ${item.lens}`,
    format,
    focal: item.focal,
    aperture: item.aperture,
    subjectWidthM: item.subjectWidthM ?? 2,
    source: { type: 'gallery', photoId: item.id },
  };
}

export function compareSourceFromKitCombo(combo: KitComboCandidate): Extract<LookSource, { type: 'kit' }> {
  return {
    type: 'kit',
    cameraId: combo.cameraId,
    lensId: combo.lensId,
    cameraCatalogId: combo.cameraCatalogId,
    lensCatalogId: combo.lensCatalogId,
    mount: combo.mount,
  };
}

export function focalForCandidateDefault(candidate: Pick<LookCandidate, 'focalMin' | 'focalMax' | 'apMax' | 'aperturePoints'>): {
  focal: number;
  aperture: number;
} {
  const focal = candidate.focalMin;
  return { focal, aperture: maxApertureAtFocal(candidate, focal) };
}

export function lensOptionLabel(lens: Pick<CatalogLens, 'name' | 'focalMin' | 'focalMax' | 'apMax' | 'apMin' | 'aperturePoints'>): string {
  return `${lens.name} · ${rangeLabel(lens)} · ${apertureRangeLabel(lens)}`;
}

function rangeLabel(lens: Pick<CatalogLens, 'focalMin' | 'focalMax'>): string {
  return lens.focalMin === lens.focalMax ? `${lens.focalMin}mm` : `${lens.focalMin}-${lens.focalMax}mm`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
