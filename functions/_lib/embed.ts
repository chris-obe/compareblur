import { cleanId, photoFromRow, type GalleryEnv, type GalleryRow } from './gallery';

export type GalleryAlbumStatus = 'draft' | 'published';
export type EmbedTheme = 'light' | 'dark' | 'system';
export type EmbedDensity = 'compact' | 'comfortable';
export type EmbedFrameStyle = 'minimal' | 'technical' | 'editorial';
export type EmbedImageFit = 'cover' | 'contain';
export type EmbedMetadataPlacement = 'bottom' | 'left' | 'right';

export const EMBED_FIELD_IDS = [
  'camera',
  'lens',
  'focal',
  'aperture',
  'shutter',
  'iso',
  'capturedAt',
  'format',
  'subject',
] as const;

export type EmbedFieldId = typeof EMBED_FIELD_IDS[number];

export interface EmbedTemplate {
  theme: EmbedTheme;
  density: EmbedDensity;
  frameStyle: EmbedFrameStyle;
  imageFit: EmbedImageFit;
  maxLongEdge: number;
  metadataPlacement: EmbedMetadataPlacement;
  showMetadata: boolean;
  defaultTargetFormatId: string;
  visibleFields: EmbedFieldId[];
  ctaLabel: string;
  showEquivalent: boolean;
}

export interface GalleryAlbumRow {
  slug: string;
  title: string;
  description: string;
  status: GalleryAlbumStatus;
  owner_sub: string | null;
  cover_photo_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface GalleryEmbedSettingsRow {
  id: string;
  template_json: string;
  created_at: string;
  updated_at: string;
}

export interface GalleryAlbumPhotoRow {
  album_slug: string;
  photo_id: string;
  sort_order: number;
  caption: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryAlbumPhotoInput {
  photoId: string;
  caption?: string | null;
}

export const DEFAULT_EMBED_TEMPLATE: EmbedTemplate = {
  theme: 'light',
  density: 'comfortable',
  frameStyle: 'minimal',
  imageFit: 'contain',
  maxLongEdge: 960,
  metadataPlacement: 'bottom',
  showMetadata: true,
  defaultTargetFormatId: 'ff',
  visibleFields: ['camera', 'lens', 'focal', 'aperture', 'format', 'capturedAt'],
  ctaLabel: 'Open in blur',
  showEquivalent: false,
};

export function publicJson(body: unknown, maxAge = 60) {
  return Response.json(body, {
    headers: {
      'cache-control': `public, max-age=${maxAge}`,
    },
  });
}

export function normalizeAlbumStatus(value: unknown, fallback: GalleryAlbumStatus = 'draft'): GalleryAlbumStatus {
  return value === 'published' || value === 'draft' ? value : fallback;
}

export function cleanAlbumSlug(value: unknown, fallbackTitle = ''): string {
  const raw = typeof value === 'string' && value.trim() ? value : fallbackTitle;
  return cleanId(raw);
}

export function albumFromRow(row: GalleryAlbumRow, photos: unknown[] = []) {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status,
    ownerSub: row.owner_sub ?? undefined,
    coverPhotoId: row.cover_photo_id ?? undefined,
    photos,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
  };
}

export async function getEmbedTemplate(env: GalleryEnv): Promise<EmbedTemplate> {
  const row = await env.GALLERY_DB.prepare('SELECT * FROM gallery_embed_settings WHERE id = ?')
    .bind('default')
    .first<GalleryEmbedSettingsRow>();
  if (!row) return DEFAULT_EMBED_TEMPLATE;
  try {
    return normalizeEmbedTemplate(JSON.parse(row.template_json));
  } catch {
    return DEFAULT_EMBED_TEMPLATE;
  }
}

export async function saveEmbedTemplate(env: GalleryEnv, input: unknown): Promise<EmbedTemplate> {
  const template = normalizeEmbedTemplate(input);
  const now = new Date().toISOString();
  await env.GALLERY_DB.prepare(
    `INSERT INTO gallery_embed_settings (id, template_json, created_at, updated_at)
     VALUES ('default', ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET template_json = excluded.template_json, updated_at = excluded.updated_at`,
  )
    .bind(JSON.stringify(template), now, now)
    .run();
  return template;
}

export function normalizeEmbedTemplate(input: unknown): EmbedTemplate {
  const value = isRecord(input) ? input : {};
  const visible = Array.isArray(value.visibleFields)
    ? value.visibleFields.filter((field): field is EmbedFieldId => EMBED_FIELD_IDS.includes(field as EmbedFieldId))
    : DEFAULT_EMBED_TEMPLATE.visibleFields;

  return {
    theme: oneOf(value.theme, ['light', 'dark', 'system'], DEFAULT_EMBED_TEMPLATE.theme),
    density: oneOf(value.density, ['compact', 'comfortable'], DEFAULT_EMBED_TEMPLATE.density),
    frameStyle: oneOf(value.frameStyle, ['minimal', 'technical', 'editorial'], DEFAULT_EMBED_TEMPLATE.frameStyle),
    imageFit: oneOf(value.imageFit, ['cover', 'contain'], DEFAULT_EMBED_TEMPLATE.imageFit),
    maxLongEdge: numberInRange(value.maxLongEdge, 320, 1600, DEFAULT_EMBED_TEMPLATE.maxLongEdge),
    metadataPlacement: oneOf(value.metadataPlacement, ['bottom', 'left', 'right'], DEFAULT_EMBED_TEMPLATE.metadataPlacement),
    showMetadata: typeof value.showMetadata === 'boolean' ? value.showMetadata : DEFAULT_EMBED_TEMPLATE.showMetadata,
    defaultTargetFormatId: stringValue(value.defaultTargetFormatId, DEFAULT_EMBED_TEMPLATE.defaultTargetFormatId),
    visibleFields: visible.length > 0 ? [...new Set(visible)].slice(0, 6) : DEFAULT_EMBED_TEMPLATE.visibleFields,
    ctaLabel: stringValue(value.ctaLabel, DEFAULT_EMBED_TEMPLATE.ctaLabel).slice(0, 80),
    showEquivalent: typeof value.showEquivalent === 'boolean' ? value.showEquivalent : DEFAULT_EMBED_TEMPLATE.showEquivalent,
  };
}

export async function publicAlbumWithPhotos(env: GalleryEnv, slug: string) {
  const row = await env.GALLERY_DB.prepare('SELECT * FROM gallery_albums WHERE slug = ? AND status = ?')
    .bind(slug, 'published')
    .first<GalleryAlbumRow>();
  if (!row) return null;
  const photos = await albumPhotos(env, slug, false);
  return albumFromRow(row, photos);
}

export async function adminAlbumWithPhotos(env: GalleryEnv, row: GalleryAlbumRow) {
  const photos = await albumPhotos(env, row.slug, true);
  return albumFromRow(row, photos);
}

export async function albumContainsApprovedPhoto(env: GalleryEnv, slug: string, photoId: string): Promise<boolean> {
  const row = await env.GALLERY_DB.prepare(
    `SELECT gallery_photos.id
     FROM gallery_album_photos
     JOIN gallery_photos ON gallery_photos.id = gallery_album_photos.photo_id
     JOIN gallery_albums ON gallery_albums.slug = gallery_album_photos.album_slug
     WHERE gallery_album_photos.album_slug = ? AND gallery_album_photos.photo_id = ?
       AND gallery_photos.status = 'approved' AND gallery_albums.status = 'published'`,
  )
    .bind(slug, photoId)
    .first<{ id: string }>();
  return !!row;
}

export async function replaceAlbumPhotos(
  env: GalleryEnv,
  slug: string,
  photos: GalleryAlbumPhotoInput[],
  options: { ownerSub?: string; approvedOnly?: boolean } = { approvedOnly: true },
) {
  const now = new Date().toISOString();
  const normalized = photos
    .map((photo) => ({ photoId: String(photo.photoId).trim(), caption: stringOrNull(photo.caption) }))
    .filter((photo) => photo.photoId);

  await env.GALLERY_DB.prepare('DELETE FROM gallery_album_photos WHERE album_slug = ?').bind(slug).run();

  for (let index = 0; index < normalized.length; index += 1) {
    const photo = normalized[index];
    const query = options.approvedOnly === false && options.ownerSub
      ? 'SELECT id FROM gallery_photos WHERE id = ? AND submitted_by = ?'
      : 'SELECT id FROM gallery_photos WHERE id = ? AND status = ?';
    const match = await env.GALLERY_DB.prepare(query)
      .bind(photo.photoId, options.approvedOnly === false && options.ownerSub ? options.ownerSub : 'approved')
      .first<{ id: string }>();
    if (!match) continue;
    await env.GALLERY_DB.prepare(
      `INSERT INTO gallery_album_photos (album_slug, photo_id, sort_order, caption, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(slug, photo.photoId, index, photo.caption, now, now)
      .run();
  }
}

export async function ownedAlbumWithPhotos(env: GalleryEnv, slug: string, ownerSub: string) {
  const row = await env.GALLERY_DB.prepare('SELECT * FROM gallery_albums WHERE slug = ? AND owner_sub = ?')
    .bind(slug, ownerSub)
    .first<GalleryAlbumRow>();
  if (!row) return null;
  const photos = await ownedAlbumPhotos(env, slug, ownerSub);
  return albumFromRow(row, photos);
}

export async function ownedAlbumPhotos(env: GalleryEnv, slug: string, ownerSub: string) {
  const rows = await env.GALLERY_DB.prepare(
    `SELECT gallery_photos.*
     FROM gallery_album_photos
     JOIN gallery_photos ON gallery_photos.id = gallery_album_photos.photo_id
     WHERE gallery_album_photos.album_slug = ?
       AND gallery_photos.submitted_by = ?
     ORDER BY gallery_album_photos.sort_order ASC, gallery_album_photos.created_at ASC`,
  )
    .bind(slug, ownerSub)
    .all<GalleryRow>();
  return (rows.results ?? []).map((photo) => photoFromRow(photo, true));
}

export function normalizePhotoInputs(value: unknown): GalleryAlbumPhotoInput[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): GalleryAlbumPhotoInput | null => {
      if (typeof item === 'string') return { photoId: item };
      if (typeof item === 'object' && item != null && 'photoId' in item) {
        return {
          photoId: String((item as { photoId: unknown }).photoId),
          caption: typeof (item as { caption?: unknown }).caption === 'string' ? (item as { caption: string }).caption : null,
        };
      }
      return null;
    })
    .filter((item): item is GalleryAlbumPhotoInput => !!item);
}

async function albumPhotos(env: GalleryEnv, slug: string, admin: boolean) {
  const rows = await env.GALLERY_DB.prepare(
    `SELECT gallery_photos.*
     FROM gallery_album_photos
     JOIN gallery_photos ON gallery_photos.id = gallery_album_photos.photo_id
     WHERE gallery_album_photos.album_slug = ?
       ${admin ? '' : "AND gallery_photos.status = 'approved'"}
     ORDER BY gallery_album_photos.sort_order ASC, gallery_album_photos.created_at ASC`,
  )
    .bind(slug)
    .all<GalleryRow>();
  return (rows.results ?? []).map((photo) => photoFromRow(photo, admin));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberInRange(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
