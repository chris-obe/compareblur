import { cleanId, photoFromRow, type GalleryEnv, type GalleryRow } from './gallery';

export type GalleryAlbumStatus = 'draft' | 'published';
export type GalleryAlbumPhotoVisibility = 'visible' | 'hidden';
export type EmbedTheme = 'light' | 'dark' | 'system';
export type EmbedDensity = 'compact' | 'comfortable';
export type EmbedFrameStyle = 'minimal' | 'technical' | 'editorial';
export type EmbedImageFit = 'cover' | 'contain';
export type EmbedImagePosition = 'auto' | 'center' | 'top' | 'bottom';
export type EmbedMetadataPlacement = 'bottom' | 'left' | 'right';
export type EmbedAlbumLayout = 'grid' | 'carousel';
export type EmbedOpenButtonPlacement = 'metadata' | 'below' | 'top-right';
export type EmbedFrameColor = 'black' | 'white' | 'mono' | 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'teal';

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
  imagePosition: EmbedImagePosition;
  frameWidth: number;
  frameColor: EmbedFrameColor;
  squareImages: boolean;
  maxLongEdge: number;
  metadataPlacement: EmbedMetadataPlacement;
  showMetadata: boolean;
  defaultTargetFormatId: string;
  visibleFields: EmbedFieldId[];
  ctaLabel: string;
  showOpenButton: boolean;
  openButtonPlacement: EmbedOpenButtonPlacement;
  showEquivalent: boolean;
  /** multi-image embed layout for album auto-select + selected-set */
  albumLayout: EmbedAlbumLayout;
  /** default number of frames an album auto-select embed packs */
  albumCount: number;
  /** columns used when albumLayout === 'grid' */
  albumColumns: number;
  showAlbumHeader: boolean;
  showCarouselControls: boolean;
  image: EmbedModeTemplate;
  gallery: EmbedGalleryModeTemplate;
}

export interface EmbedModeTemplate {
  theme: EmbedTheme;
  density: EmbedDensity;
  frameStyle: EmbedFrameStyle;
  imageFit: EmbedImageFit;
  imagePosition: EmbedImagePosition;
  frameWidth: number;
  frameColor: EmbedFrameColor;
  squareImages: boolean;
  maxLongEdge: number;
  metadataPlacement: EmbedMetadataPlacement;
  showMetadata: boolean;
  defaultTargetFormatId: string;
  visibleFields: EmbedFieldId[];
  ctaLabel: string;
  showOpenButton: boolean;
  openButtonPlacement: EmbedOpenButtonPlacement;
  showEquivalent: boolean;
}

export interface EmbedGalleryModeTemplate extends EmbedModeTemplate {
  albumLayout: EmbedAlbumLayout;
  albumCount: number;
  albumColumns: number;
  showAlbumHeader: boolean;
  showCarouselControls: boolean;
}

export interface GalleryAlbumRow {
  slug: string;
  title: string;
  description: string;
  status: GalleryAlbumStatus;
  owner_sub: string | null;
  owner_name: string | null;
  cover_photo_id: string | null;
  password_hash: string | null;
  password_salt: string | null;
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
  visibility: GalleryAlbumPhotoVisibility | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryAlbumPhotoInput {
  photoId: string;
  caption?: string | null;
  visibility?: GalleryAlbumPhotoVisibility | null;
}

interface JoinedAlbumPhotoRow extends GalleryRow {
  album_caption: string | null;
  album_visibility: string | null;
  album_sort_order: number | null;
}

const ALBUM_IMAGE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_EMBED_TEMPLATE: EmbedTemplate = {
  theme: 'light',
  density: 'comfortable',
  frameStyle: 'minimal',
  imageFit: 'contain',
  imagePosition: 'auto',
  frameWidth: 10,
  frameColor: 'black',
  squareImages: false,
  maxLongEdge: 960,
  metadataPlacement: 'bottom',
  showMetadata: true,
  defaultTargetFormatId: 'ff',
  visibleFields: ['camera', 'lens', 'focal', 'aperture', 'format', 'capturedAt'],
  ctaLabel: 'Open in blur',
  showOpenButton: true,
  openButtonPlacement: 'metadata',
  showEquivalent: false,
  albumLayout: 'grid',
  albumCount: 6,
  albumColumns: 3,
  showAlbumHeader: true,
  showCarouselControls: true,
  image: {
    theme: 'light',
    density: 'comfortable',
    frameStyle: 'minimal',
    imageFit: 'contain',
    imagePosition: 'auto',
    frameWidth: 10,
    frameColor: 'black',
    squareImages: false,
    maxLongEdge: 960,
    metadataPlacement: 'bottom',
    showMetadata: true,
    defaultTargetFormatId: 'ff',
    visibleFields: ['camera', 'lens', 'focal', 'aperture', 'format', 'capturedAt'],
    ctaLabel: 'Open in blur',
    showOpenButton: true,
    openButtonPlacement: 'metadata',
    showEquivalent: false,
  },
  gallery: {
    theme: 'light',
    density: 'compact',
    frameStyle: 'minimal',
    imageFit: 'cover',
    imagePosition: 'auto',
    frameWidth: 10,
    frameColor: 'black',
    squareImages: false,
    maxLongEdge: 960,
    metadataPlacement: 'bottom',
    showMetadata: false,
    defaultTargetFormatId: 'ff',
    visibleFields: ['camera', 'lens', 'focal', 'aperture'],
    ctaLabel: 'Open in blur',
    showOpenButton: true,
    openButtonPlacement: 'below',
    showEquivalent: false,
    albumLayout: 'grid',
    albumCount: 9,
    albumColumns: 3,
    showAlbumHeader: true,
    showCarouselControls: true,
  },
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

export function albumFromRow(
  row: GalleryAlbumRow,
  photos: unknown[] = [],
  options: { coverPhotoId?: string | null; includeOwnerSub?: boolean } = {},
) {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status,
    ownerSub: options.includeOwnerSub ? row.owner_sub ?? undefined : undefined,
    ownerName: row.owner_name ?? undefined,
    hasPassword: !!row.password_hash,
    coverPhotoId: options.coverPhotoId ?? row.cover_photo_id ?? undefined,
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
  const legacy = normalizeEmbedMode(value, DEFAULT_EMBED_TEMPLATE.image);
  const image = normalizeEmbedMode(value.image, legacy);
  const gallery = normalizeGalleryEmbedMode(value.gallery, {
    ...DEFAULT_EMBED_TEMPLATE.gallery,
    theme: legacy.theme,
    frameStyle: legacy.frameStyle,
    maxLongEdge: legacy.maxLongEdge,
    defaultTargetFormatId: legacy.defaultTargetFormatId,
    ctaLabel: legacy.ctaLabel,
  });

  const normalized = {
    theme: oneOf(value.theme, ['light', 'dark', 'system'], DEFAULT_EMBED_TEMPLATE.theme),
    density: oneOf(value.density, ['compact', 'comfortable'], DEFAULT_EMBED_TEMPLATE.density),
    frameStyle: oneOf(value.frameStyle, ['minimal', 'technical', 'editorial'], DEFAULT_EMBED_TEMPLATE.frameStyle),
    imageFit: oneOf(value.imageFit, ['cover', 'contain'], DEFAULT_EMBED_TEMPLATE.imageFit),
    imagePosition: oneOf(value.imagePosition, ['auto', 'center', 'top', 'bottom'], DEFAULT_EMBED_TEMPLATE.imagePosition),
    frameWidth: numberInRange(value.frameWidth, 0, 40, DEFAULT_EMBED_TEMPLATE.frameWidth),
    frameColor: oneOf(value.frameColor, ['black', 'white', 'mono', 'blue', 'green', 'amber', 'rose', 'violet', 'teal'], DEFAULT_EMBED_TEMPLATE.frameColor),
    squareImages: typeof value.squareImages === 'boolean' ? value.squareImages : DEFAULT_EMBED_TEMPLATE.squareImages,
    maxLongEdge: numberInRange(value.maxLongEdge, 320, 1600, DEFAULT_EMBED_TEMPLATE.maxLongEdge),
    metadataPlacement: oneOf(value.metadataPlacement, ['bottom', 'left', 'right'], DEFAULT_EMBED_TEMPLATE.metadataPlacement),
    showMetadata: typeof value.showMetadata === 'boolean' ? value.showMetadata : DEFAULT_EMBED_TEMPLATE.showMetadata,
    defaultTargetFormatId: stringValue(value.defaultTargetFormatId, DEFAULT_EMBED_TEMPLATE.defaultTargetFormatId),
    visibleFields: image.visibleFields,
    ctaLabel: stringValue(value.ctaLabel, DEFAULT_EMBED_TEMPLATE.ctaLabel).slice(0, 80),
    showOpenButton: typeof value.showOpenButton === 'boolean' ? value.showOpenButton : DEFAULT_EMBED_TEMPLATE.showOpenButton,
    openButtonPlacement: oneOf(value.openButtonPlacement, ['metadata', 'below', 'top-right'], DEFAULT_EMBED_TEMPLATE.openButtonPlacement),
    showEquivalent: typeof value.showEquivalent === 'boolean' ? value.showEquivalent : DEFAULT_EMBED_TEMPLATE.showEquivalent,
    albumLayout: oneOf(value.albumLayout, ['grid', 'carousel'], DEFAULT_EMBED_TEMPLATE.albumLayout),
    albumCount: numberInRange(value.albumCount, 1, 24, DEFAULT_EMBED_TEMPLATE.albumCount),
    albumColumns: numberInRange(value.albumColumns, 2, 4, DEFAULT_EMBED_TEMPLATE.albumColumns),
    showAlbumHeader: typeof value.showAlbumHeader === 'boolean' ? value.showAlbumHeader : DEFAULT_EMBED_TEMPLATE.showAlbumHeader,
    showCarouselControls: typeof value.showCarouselControls === 'boolean' ? value.showCarouselControls : DEFAULT_EMBED_TEMPLATE.showCarouselControls,
    image,
    gallery,
  };

  return {
    ...normalized,
    ...image,
    albumLayout: gallery.albumLayout,
    albumCount: gallery.albumCount,
    albumColumns: gallery.albumColumns,
    showAlbumHeader: gallery.showAlbumHeader,
    showCarouselControls: gallery.showCarouselControls,
    image,
    gallery,
  };
}

function normalizeEmbedMode(input: unknown, fallback: EmbedModeTemplate): EmbedModeTemplate {
  const value = isRecord(input) ? input : {};
  const visible = Array.isArray(value.visibleFields)
    ? value.visibleFields.filter((field): field is EmbedFieldId => EMBED_FIELD_IDS.includes(field as EmbedFieldId))
    : fallback.visibleFields;

  return {
    theme: oneOf(value.theme, ['light', 'dark', 'system'], fallback.theme),
    density: oneOf(value.density, ['compact', 'comfortable'], fallback.density),
    frameStyle: oneOf(value.frameStyle, ['minimal', 'technical', 'editorial'], fallback.frameStyle),
    imageFit: oneOf(value.imageFit, ['cover', 'contain'], fallback.imageFit),
    imagePosition: oneOf(value.imagePosition, ['auto', 'center', 'top', 'bottom'], fallback.imagePosition),
    frameWidth: numberInRange(value.frameWidth, 0, 40, fallback.frameWidth),
    frameColor: oneOf(value.frameColor, ['black', 'white', 'mono', 'blue', 'green', 'amber', 'rose', 'violet', 'teal'], fallback.frameColor),
    squareImages: typeof value.squareImages === 'boolean' ? value.squareImages : fallback.squareImages,
    maxLongEdge: numberInRange(value.maxLongEdge, 320, 1600, fallback.maxLongEdge),
    metadataPlacement: oneOf(value.metadataPlacement, ['bottom', 'left', 'right'], fallback.metadataPlacement),
    showMetadata: typeof value.showMetadata === 'boolean' ? value.showMetadata : fallback.showMetadata,
    defaultTargetFormatId: stringValue(value.defaultTargetFormatId, fallback.defaultTargetFormatId),
    visibleFields: visible.length > 0 ? [...new Set(visible)].slice(0, 6) : fallback.visibleFields,
    ctaLabel: stringValue(value.ctaLabel, fallback.ctaLabel).slice(0, 80),
    showOpenButton: typeof value.showOpenButton === 'boolean' ? value.showOpenButton : fallback.showOpenButton,
    openButtonPlacement: oneOf(value.openButtonPlacement, ['metadata', 'below', 'top-right'], fallback.openButtonPlacement),
    showEquivalent: typeof value.showEquivalent === 'boolean' ? value.showEquivalent : fallback.showEquivalent,
  };
}

function normalizeGalleryEmbedMode(input: unknown, fallback: EmbedGalleryModeTemplate): EmbedGalleryModeTemplate {
  const mode = normalizeEmbedMode(input, fallback);
  const value = isRecord(input) ? input : {};
  return {
    ...mode,
    albumLayout: oneOf(value.albumLayout, ['grid', 'carousel'], fallback.albumLayout),
    albumCount: numberInRange(value.albumCount, 1, 24, fallback.albumCount),
    albumColumns: numberInRange(value.albumColumns, 2, 4, fallback.albumColumns),
    showAlbumHeader: typeof value.showAlbumHeader === 'boolean' ? value.showAlbumHeader : fallback.showAlbumHeader,
    showCarouselControls: typeof value.showCarouselControls === 'boolean' ? value.showCarouselControls : fallback.showCarouselControls,
  };
}

export async function publicAlbumWithPhotos(env: GalleryEnv, slug: string, password?: string | null) {
  const row = await env.GALLERY_DB.prepare('SELECT * FROM gallery_albums WHERE slug = ? AND status = ?')
    .bind(slug, 'published')
    .first<GalleryAlbumRow>();
  if (!row) return null;
  if (row.password_hash && !(await verifyAlbumPassword(row, password))) return null;
  const photos = await albumPhotos(env, row, { publicAlbum: true });
  const coverPhotoId = photos.find((photo) => photo.id === row.cover_photo_id)?.id ?? photos[0]?.id ?? null;
  return albumFromRow(row, photos, { coverPhotoId });
}

export async function adminAlbumWithPhotos(env: GalleryEnv, row: GalleryAlbumRow) {
  const photos = await albumPhotos(env, row, { admin: true });
  return albumFromRow(row, photos, { coverPhotoId: row.cover_photo_id ?? photos[0]?.id ?? null, includeOwnerSub: true });
}

// ---- Batch album loaders (list endpoints) --------------------------------
// Listing albums one-by-one is an N+1: one photos query per album. These load
// the photos for a whole album page in chunked IN-list queries and group in
// code, so query count stays constant as album count grows.

const ALBUM_SLUG_CHUNK = 100;

interface GroupedAlbumPhotoRow extends JoinedAlbumPhotoRow {
  group_album_slug: string;
}

async function joinedAlbumPhotosBySlug(
  env: GalleryEnv,
  slugs: string[],
  options: { ownerSub?: string } = {},
): Promise<Map<string, JoinedAlbumPhotoRow[]>> {
  const grouped = new Map<string, JoinedAlbumPhotoRow[]>();
  for (const slug of slugs) grouped.set(slug, []);
  if (slugs.length === 0) return grouped;

  for (let start = 0; start < slugs.length; start += ALBUM_SLUG_CHUNK) {
    const chunk = slugs.slice(start, start + ALBUM_SLUG_CHUNK);
    const placeholders = chunk.map(() => '?').join(', ');
    const ownerFilter = options.ownerSub ? 'AND gallery_photos.submitted_by = ?' : '';
    const binds = options.ownerSub ? [...chunk, options.ownerSub] : chunk;
    const rows = await env.GALLERY_DB.prepare(
      `SELECT gallery_photos.*,
              gallery_album_photos.album_slug AS group_album_slug,
              gallery_album_photos.caption AS album_caption,
              gallery_album_photos.visibility AS album_visibility,
              gallery_album_photos.sort_order AS album_sort_order
       FROM gallery_album_photos
       JOIN gallery_photos ON gallery_photos.id = gallery_album_photos.photo_id
       WHERE gallery_album_photos.album_slug IN (${placeholders})
         ${ownerFilter}
       ORDER BY gallery_album_photos.sort_order ASC, gallery_album_photos.created_at ASC`,
    )
      .bind(...binds)
      .all<GroupedAlbumPhotoRow>();

    for (const row of rows.results ?? []) {
      const bucket = grouped.get(row.group_album_slug);
      if (bucket) bucket.push(row);
    }
  }

  return grouped;
}

export async function adminAlbumsWithPhotos(env: GalleryEnv, rows: GalleryAlbumRow[]) {
  const photosBySlug = await joinedAlbumPhotosBySlug(env, rows.map((row) => row.slug));
  return rows.map((row) => {
    const photos = (photosBySlug.get(row.slug) ?? []).map((photo) => albumPhotoFromJoinedRow(photo, { admin: true }));
    return albumFromRow(row, photos, { coverPhotoId: row.cover_photo_id ?? photos[0]?.id ?? null, includeOwnerSub: true });
  });
}

export async function ownedAlbumsWithPhotos(env: GalleryEnv, rows: GalleryAlbumRow[], ownerSub: string) {
  const photosBySlug = await joinedAlbumPhotosBySlug(env, rows.map((row) => row.slug), { ownerSub });
  return rows.map((row) => {
    const photos = (photosBySlug.get(row.slug) ?? []).map((photo) => albumPhotoFromJoinedRow(photo, { admin: true }));
    return albumFromRow(row, photos, { coverPhotoId: row.cover_photo_id ?? photos[0]?.id ?? null, includeOwnerSub: true });
  });
}

export async function albumContainsVisiblePhoto(env: GalleryEnv, slug: string, photoId: string): Promise<boolean> {
  const row = await env.GALLERY_DB.prepare(
    `SELECT gallery_album_photos.photo_id AS id
     FROM gallery_album_photos
     JOIN gallery_albums ON gallery_albums.slug = gallery_album_photos.album_slug
     WHERE gallery_album_photos.album_slug = ? AND gallery_album_photos.photo_id = ?
       AND gallery_albums.status = 'published'
       AND gallery_albums.password_hash IS NULL
       AND gallery_album_photos.visibility = 'visible'`,
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
    .map((photo) => ({
      photoId: String(photo.photoId).trim(),
      caption: stringOrNull(photo.caption),
      visibility: albumPhotoVisibilityValue(photo.visibility),
    }))
    .filter((photo) => photo.photoId);

  await env.GALLERY_DB.prepare('DELETE FROM gallery_album_photos WHERE album_slug = ?').bind(slug).run();
  if (normalized.length === 0) return;

  // Validate membership eligibility in chunked IN-list queries (2 per 100
  // photos) instead of one SELECT per photo, then insert via D1 batch.
  const ownerScoped = options.approvedOnly === false && options.ownerSub;
  const validIds = new Set<string>();
  const ids = normalized.map((photo) => photo.photoId);
  for (let start = 0; start < ids.length; start += ALBUM_SLUG_CHUNK) {
    const chunk = ids.slice(start, start + ALBUM_SLUG_CHUNK);
    const placeholders = chunk.map(() => '?').join(', ');
    const query = ownerScoped
      ? `SELECT id FROM gallery_photos WHERE id IN (${placeholders}) AND submitted_by = ?`
      : `SELECT id FROM gallery_photos WHERE id IN (${placeholders}) AND gallery_status = 'approved'`;
    const binds = ownerScoped ? [...chunk, options.ownerSub as string] : chunk;
    const rows = await env.GALLERY_DB.prepare(query).bind(...binds).all<{ id: string }>();
    for (const row of rows.results ?? []) validIds.add(row.id);
  }

  const insert = env.GALLERY_DB.prepare(
    `INSERT INTO gallery_album_photos (album_slug, photo_id, sort_order, caption, visibility, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const statements = normalized
    .map((photo, index) => ({ photo, index }))
    .filter(({ photo }) => validIds.has(photo.photoId))
    .map(({ photo, index }) => insert.bind(slug, photo.photoId, index, photo.caption, photo.visibility, now, now));
  if (statements.length > 0) await env.GALLERY_DB.batch(statements);
}

export async function ownedAlbumWithPhotos(env: GalleryEnv, slug: string, ownerSub: string) {
  const row = await env.GALLERY_DB.prepare('SELECT * FROM gallery_albums WHERE slug = ? AND owner_sub = ?')
    .bind(slug, ownerSub)
    .first<GalleryAlbumRow>();
  if (!row) return null;
  const photos = await ownedAlbumPhotos(env, slug, ownerSub);
  return albumFromRow(row, photos, { coverPhotoId: row.cover_photo_id ?? photos[0]?.id ?? null, includeOwnerSub: true });
}

export async function ownedAlbumPhotos(env: GalleryEnv, slug: string, ownerSub: string) {
  const rows = await env.GALLERY_DB.prepare(
    `SELECT gallery_photos.*,
            gallery_album_photos.caption AS album_caption,
            gallery_album_photos.visibility AS album_visibility,
            gallery_album_photos.sort_order AS album_sort_order
     FROM gallery_album_photos
     JOIN gallery_photos ON gallery_photos.id = gallery_album_photos.photo_id
     WHERE gallery_album_photos.album_slug = ?
       AND gallery_photos.submitted_by = ?
     ORDER BY gallery_album_photos.sort_order ASC, gallery_album_photos.created_at ASC`,
  )
    .bind(slug, ownerSub)
    .all<JoinedAlbumPhotoRow>();
  return (rows.results ?? []).map((photo) => albumPhotoFromJoinedRow(photo, { admin: true }));
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
          visibility: albumPhotoVisibilityValue((item as { visibility?: unknown }).visibility),
        };
      }
      return null;
    })
    .filter((item): item is GalleryAlbumPhotoInput => !!item);
}

export function ownerNameForIdentity(identity: { name?: string; email?: string; sub: string }) {
  const explicit = cleanPublicOwnerName(identity.name);
  if (explicit) return explicit;
  const emailLocal = typeof identity.email === 'string' ? identity.email.split('@')[0]?.trim() : '';
  if (emailLocal) return cleanPublicOwnerName(emailLocal) || 'blur account';
  const subFallback = identity.sub.split('|').at(-1)?.trim();
  return cleanPublicOwnerName(subFallback) || 'blur account';
}

export async function hashAlbumPassword(password: string) {
  const trimmed = password.trim();
  if (!trimmed) return null;
  const salt = crypto.randomUUID();
  const hash = await sha256(`${salt}:${trimmed}`);
  return { salt, hash };
}

export async function verifyAlbumPassword(row: Pick<GalleryAlbumRow, 'password_hash' | 'password_salt'>, password?: string | null) {
  if (!row.password_hash) return true;
  const trimmed = typeof password === 'string' ? password.trim() : '';
  if (!trimmed || !row.password_salt) return false;
  return (await sha256(`${row.password_salt}:${trimmed}`)) === row.password_hash;
}

async function albumPhotos(
  env: GalleryEnv,
  album: GalleryAlbumRow,
  options: { admin?: boolean; publicAlbum?: boolean } = {},
) {
  const admin = options.admin === true;
  const rows = await env.GALLERY_DB.prepare(
    `SELECT gallery_photos.*,
            gallery_album_photos.caption AS album_caption,
            gallery_album_photos.visibility AS album_visibility,
            gallery_album_photos.sort_order AS album_sort_order
     FROM gallery_album_photos
     JOIN gallery_photos ON gallery_photos.id = gallery_album_photos.photo_id
     WHERE gallery_album_photos.album_slug = ?
       ${admin ? '' : "AND gallery_album_photos.visibility = 'visible'"}
     ORDER BY gallery_album_photos.sort_order ASC, gallery_album_photos.created_at ASC`,
  )
    .bind(album.slug)
    .all<JoinedAlbumPhotoRow>();
  const accessToken = album.password_hash ? await albumAccessToken(album) : null;
  return (rows.results ?? []).map((photo) =>
    albumPhotoFromJoinedRow(photo, {
      admin,
      album,
      accessToken,
      publicAlbum: options.publicAlbum === true,
    }),
  );
}

export async function albumAccessToken(row: Pick<GalleryAlbumRow, 'slug' | 'password_hash'>) {
  if (!row.password_hash) return null;
  const expiresAt = Date.now() + ALBUM_IMAGE_TOKEN_TTL_MS;
  const signature = await sha256(`${row.slug}:${expiresAt}:${row.password_hash}`);
  return `${expiresAt}.${signature}`;
}

export async function verifyAlbumAccessToken(
  row: Pick<GalleryAlbumRow, 'slug' | 'password_hash'>,
  token?: string | null,
) {
  if (!row.password_hash) return true;
  if (!token) return false;
  const [expiresAtRaw, signature] = token.split('.', 2);
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || !signature || expiresAt < Date.now()) return false;
  const expected = await sha256(`${row.slug}:${expiresAt}:${row.password_hash}`);
  return expected === signature;
}

function albumPhotoFromJoinedRow(
  row: JoinedAlbumPhotoRow,
  options: {
    admin?: boolean;
    album?: Pick<GalleryAlbumRow, 'slug' | 'password_hash'>;
    accessToken?: string | null;
    publicAlbum?: boolean;
  } = {},
) {
  const admin = options.admin === true;
  const src = options.publicAlbum && options.album
    ? albumPhotoSrc(options.album.slug, row.id, options.accessToken)
    : undefined;
  return {
    ...photoFromRow(row, admin, undefined, src ? { src } : {}),
    photoId: row.id,
    caption: row.album_caption ?? undefined,
    visibility: albumPhotoVisibilityValue(row.album_visibility),
    sortOrder: row.album_sort_order ?? 0,
  };
}

function albumPhotoSrc(albumSlug: string, photoId: string, accessToken?: string | null) {
  const params = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
  return `/api/gallery/albums/${encodeURIComponent(albumSlug)}/photos/${encodeURIComponent(photoId)}/image${params}`;
}

function albumPhotoVisibilityValue(value: unknown): GalleryAlbumPhotoVisibility {
  return value === 'hidden' ? 'hidden' : 'visible';
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

function cleanPublicOwnerName(value?: string | null) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, 80);
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
