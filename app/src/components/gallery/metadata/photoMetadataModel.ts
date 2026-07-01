import type { GalleryModerationStatus, GalleryAlbumPhotoVisibility, AdminGalleryPhoto } from '../../../lib/galleryApi';
import { GALLERY_FORMAT_OPTIONS, formatOptionLabel, resolveGalleryFormat } from '../../../lib/galleryFormat';
import { DEFAULT_SUBJECT_DISTANCE_PRESET_ID } from '../../../lib/subjectDistance';
import { cameraFormat, defaultFocal, lensesForCamera, maxApertureAtFocal, type Camera, type CatalogLens } from '../../../lib/gear';

export type PhotoMetadataContext = 'album' | 'gallery-upload' | 'admin-edit';

export type PhotoMetadataColumnKey =
  | 'preview'
  | 'title'
  | 'author'
  | 'camera'
  | 'lens'
  | 'formatId'
  | 'focal'
  | 'aperture'
  | 'subjectPreset'
  | 'shutterSpeed'
  | 'iso'
  | 'capturedAt'
  | 'tags'
  | 'albumVisibility'
  | 'galleryStatus'
  | 'notes';

export interface PhotoMetadataRow {
  id: string;
  previewSrc?: string;
  previewLabel?: string;
  title: string;
  author: string;
  camera: string;
  cameraCatalogId: string;
  lens: string;
  lensCatalogId: string;
  formatId: string;
  focal: string;
  aperture: string;
  subjectPreset: string;
  shutterSpeed: string;
  iso: string;
  capturedAt: string;
  tags: string[];
  albumVisibility?: GalleryAlbumPhotoVisibility;
  galleryStatus?: GalleryModerationStatus;
  notes: string;
}

export interface PhotoMetadataCatalog {
  cameras: Camera[];
  lenses: CatalogLens[];
}

export interface PhotoMetadataOption {
  value: string;
  label: string;
  detail?: string;
  maker?: string;
}

export const GALLERY_STATUS_OPTIONS: PhotoMetadataOption[] = [
  { value: 'pending', label: 'pending' },
  { value: 'approved', label: 'approved' },
  { value: 'not_submitted', label: 'library only' },
  { value: 'rejected', label: 'rejected' },
];

export const ALBUM_VISIBILITY_OPTIONS: PhotoMetadataOption[] = [
  { value: 'visible', label: 'visible in album' },
  { value: 'hidden', label: 'hidden from album' },
];

export function formatNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

export function numberOrFallback(value: string, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function numberOrOptional(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizedFormatId(value: string): string {
  return resolveGalleryFormat(value).format.id;
}

export function dateInputValue(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

export function cameraOptions(cameras: Camera[]): PhotoMetadataOption[] {
  return cameras.map((camera) => ({
    value: camera.id,
    label: camera.name,
    maker: camera.maker,
    detail: camera.formatId,
  }));
}

export function lensOptionsForRow(row: PhotoMetadataRow, catalog: PhotoMetadataCatalog): PhotoMetadataOption[] {
  const camera = catalog.cameras.find((item) => item.id === row.cameraCatalogId);
  const available = camera ? lensesForCamera(camera, catalog.lenses) : catalog.lenses;
  return available.map((lens) => ({
    value: lens.id,
    label: lens.name,
    maker: lens.maker,
    detail: lens.type === 'zoom' ? `${lens.focalMin}-${lens.focalMax}mm` : `${lens.focalMin}mm`,
  }));
}

export function formatOptions(): PhotoMetadataOption[] {
  return GALLERY_FORMAT_OPTIONS.map((format) => ({
    value: format.id,
    label: formatOptionLabel(format),
  }));
}

export function emptyMetadataRow(id: string): PhotoMetadataRow {
  return {
    id,
    title: '',
    author: '',
    camera: '',
    cameraCatalogId: '',
    lens: '',
    lensCatalogId: '',
    formatId: 'ff',
    focal: '50',
    aperture: '1.8',
    subjectPreset: DEFAULT_SUBJECT_DISTANCE_PRESET_ID,
    shutterSpeed: '',
    iso: '',
    capturedAt: '',
    tags: [],
    notes: '',
  };
}

export function metadataRowFromPhoto(photo: AdminGalleryPhoto, overrides: Partial<PhotoMetadataRow> = {}): PhotoMetadataRow {
  return {
    id: photo.id,
    previewSrc: photo.src,
    previewLabel: photo.title,
    title: photo.title,
    author: photo.author ?? '',
    camera: photo.camera,
    cameraCatalogId: photo.cameraCatalogId ?? '',
    lens: photo.lens,
    lensCatalogId: photo.lensCatalogId ?? '',
    formatId: normalizedFormatId(photo.formatId),
    focal: String(photo.focal),
    aperture: String(photo.aperture),
    subjectPreset: photo.subjectPreset ?? DEFAULT_SUBJECT_DISTANCE_PRESET_ID,
    shutterSpeed: photo.shutterSpeed ?? '',
    iso: photo.iso != null ? String(photo.iso) : '',
    capturedAt: dateInputValue(photo.capturedAt),
    tags: photo.tags ?? [],
    galleryStatus: photo.galleryStatus,
    notes: photo.notes ?? '',
    ...overrides,
  };
}

export function applyCameraSelection(row: PhotoMetadataRow, camera: Camera, catalog: PhotoMetadataCatalog): PhotoMetadataRow {
  const compatible = row.lensCatalogId
    ? lensesForCamera(camera, catalog.lenses).some((lens) => lens.id === row.lensCatalogId)
    : true;
  return {
    ...row,
    camera: camera.name,
    cameraCatalogId: camera.id,
    formatId: cameraFormat(camera).id,
    lens: compatible ? row.lens : '',
    lensCatalogId: compatible ? row.lensCatalogId : '',
  };
}

export function applyLensSelection(row: PhotoMetadataRow, lens: CatalogLens): PhotoMetadataRow {
  const currentFocal = Number(row.focal);
  const focal = Number.isFinite(currentFocal) && currentFocal >= lens.focalMin && currentFocal <= lens.focalMax
    ? currentFocal
    : defaultFocal(lens);
  return {
    ...row,
    lens: lens.name,
    lensCatalogId: lens.id,
    focal: formatNumber(focal),
    aperture: row.aperture || formatNumber(maxApertureAtFocal(lens, focal)),
  };
}

export function applyMetadataCellValue(
  row: PhotoMetadataRow,
  field: PhotoMetadataColumnKey,
  value: string | string[] | null,
  catalog: PhotoMetadataCatalog,
  selectedId?: string,
): PhotoMetadataRow {
  if (field === 'preview') return row;
  if (field === 'tags') return { ...row, tags: Array.isArray(value) ? value : splitTags(value ?? '') };
  if (field === 'camera') {
    const camera = selectedId ? catalog.cameras.find((item) => item.id === selectedId) : null;
    if (camera) return applyCameraSelection(row, camera, catalog);
    return { ...row, camera: String(value ?? ''), cameraCatalogId: '' };
  }
  if (field === 'lens') {
    const lens = selectedId ? catalog.lenses.find((item) => item.id === selectedId) : null;
    if (lens) return applyLensSelection(row, lens);
    return { ...row, lens: String(value ?? ''), lensCatalogId: '' };
  }
  if (field === 'formatId') return { ...row, formatId: normalizedFormatId(String(value ?? '')) };
  if (field === 'albumVisibility') {
    return { ...row, albumVisibility: value === 'hidden' ? 'hidden' : 'visible' };
  }
  if (field === 'galleryStatus') {
    const next = GALLERY_STATUS_OPTIONS.some((option) => option.value === value) ? value as GalleryModerationStatus : row.galleryStatus;
    return { ...row, galleryStatus: next };
  }
  return { ...row, [field]: String(value ?? '') };
}

export function photoMetadataUpdatePayload(photo: AdminGalleryPhoto, row: PhotoMetadataRow): Partial<AdminGalleryPhoto> & Record<string, unknown> {
  return {
    title: row.title,
    author: row.author,
    camera: row.camera,
    cameraCatalogId: row.cameraCatalogId,
    lens: row.lens,
    lensCatalogId: row.lensCatalogId,
    formatId: normalizedFormatId(row.formatId),
    focal: numberOrFallback(row.focal, photo.focal),
    aperture: numberOrFallback(row.aperture, photo.aperture),
    subjectPreset: row.subjectPreset,
    shutterSpeed: row.shutterSpeed || null,
    iso: numberOrOptional(row.iso),
    capturedAt: row.capturedAt || null,
    tags: row.tags,
    notes: row.notes,
  };
}

export function photoMetadataChanged(photo: AdminGalleryPhoto, row: PhotoMetadataRow): boolean {
  const next = photoMetadataUpdatePayload(photo, row);
  return next.title !== photo.title
    || next.author !== (photo.author ?? '')
    || next.camera !== photo.camera
    || next.cameraCatalogId !== (photo.cameraCatalogId ?? '')
    || next.lens !== photo.lens
    || next.lensCatalogId !== (photo.lensCatalogId ?? '')
    || next.formatId !== normalizedFormatId(photo.formatId)
    || next.focal !== photo.focal
    || next.aperture !== photo.aperture
    || next.subjectPreset !== (photo.subjectPreset ?? DEFAULT_SUBJECT_DISTANCE_PRESET_ID)
    || next.shutterSpeed !== (photo.shutterSpeed ?? null)
    || next.iso !== (photo.iso ?? null)
    || next.capturedAt !== (photo.capturedAt ?? null)
    || JSON.stringify(next.tags ?? []) !== JSON.stringify(photo.tags ?? [])
    || next.notes !== (photo.notes ?? '');
}

export function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase().replace(/\s+/g, ' '))
    .filter(Boolean);
}
