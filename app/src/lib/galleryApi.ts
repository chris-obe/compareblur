import type { GalleryItem } from './types';
import type { Reaction, ReactionCounts } from './reactions';

export type GalleryStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type GalleryModerationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';
export type GalleryAlbumPhotoVisibility = 'visible' | 'hidden';

export interface AdminGalleryPhoto extends GalleryItem {
  status: GalleryStatus;
  galleryStatus: GalleryModerationStatus;
  galleryStatusNeedsReview?: boolean;
  objectKey?: string;
  contentType?: string;
  width?: number;
  height?: number;
  cameraCatalogId?: string;
  lensCatalogId?: string;
  metadataSource?: unknown;
  submittedBy?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}

export interface GalleryAlbumPhoto extends GalleryItem {
  photoId: string;
  caption?: string;
  visibility: GalleryAlbumPhotoVisibility;
  sortOrder: number;
}

export type GalleryAlbumStatus = 'draft' | 'published';
export type EmbedTheme = 'light' | 'dark' | 'system';
export type EmbedDensity = 'compact' | 'comfortable';
export type EmbedFrameStyle = 'minimal' | 'technical' | 'editorial';
export type EmbedImageFit = 'cover' | 'contain';
export type EmbedImagePosition = 'auto' | 'center' | 'top' | 'bottom';
export type EmbedMetadataPlacement = 'bottom' | 'left' | 'right';
export type EmbedAlbumLayout = 'grid' | 'carousel';
export type EmbedOpenButtonPlacement = 'metadata' | 'below' | 'top-right';
export type EmbedFrameColor = 'black' | 'white' | 'mono' | 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'teal';

export type EmbedFieldId =
  | 'camera'
  | 'lens'
  | 'focal'
  | 'aperture'
  | 'shutter'
  | 'iso'
  | 'capturedAt'
  | 'format'
  | 'subject';

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
  albumLayout: EmbedAlbumLayout;
  albumCount: number;
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

export interface GalleryAlbum {
  slug: string;
  title: string;
  description: string;
  status: GalleryAlbumStatus;
  ownerSub?: string;
  ownerName?: string;
  hasPassword?: boolean;
  coverPhotoId?: string | null;
  photos: GalleryAlbumPhoto[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface GalleryAlbumPhotoInput {
  photoId: string;
  caption?: string | null;
  visibility?: GalleryAlbumPhotoVisibility | null;
}

export type GalleryAlbumMutation = Omit<Partial<GalleryAlbum>, 'photos'> & {
  photoIds?: string[];
  photos?: GalleryAlbumPhotoInput[];
  albumPassword?: string | null;
};

export interface GalleryTag {
  slug: string;
  label: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryListResponse {
  photos: GalleryItem[];
  nextCursor?: string | null;
}

export interface AdminGalleryListResponse {
  photos: AdminGalleryPhoto[];
  nextCursor?: string | null;
}

export interface GalleryAlbumResponse {
  album: GalleryAlbum;
  photos: GalleryAlbumPhoto[];
}

export interface GalleryAlbumsResponse {
  albums: GalleryAlbum[];
}

export interface AdminGalleryAlbumsResponse {
  albums: GalleryAlbum[];
}

export interface EmbedPhotoResponse {
  photo: GalleryItem | GalleryAlbumPhoto;
  album?: GalleryAlbum | null;
  template: EmbedTemplate;
  formats: string[];
}

export interface EmbedSettingsResponse {
  template: EmbedTemplate;
}

export interface EmbedGalleryResponse {
  photos: Array<GalleryItem | GalleryAlbumPhoto>;
  album?: GalleryAlbum | null;
  template: EmbedTemplate;
  formats: string[];
}

export interface AdminGalleryTagsResponse {
  tags: GalleryTag[];
}

export interface GalleryReactionsResponse {
  reactions: Record<string, Reaction>;
}

export interface GalleryReactionUpdateResponse {
  photoId: string;
  reaction: Reaction | null;
  reactionCounts: ReactionCounts;
}

export interface AdminGalleryReactionStats {
  totals: {
    total: number;
    reactingUsers: number;
    dislike: number;
    like: number;
    love: number;
  };
  byPhoto: Array<{
    photoId: string;
    title: string;
    status: string;
    total: number;
    dislike: number;
    like: number;
    love: number;
    reactingUsers: number;
  }>;
  recent: Array<{
    photoId: string;
    title: string;
    userSub: string;
    userEmail?: string;
    userName?: string;
    reaction: Reaction;
    updatedAt: string;
  }>;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      typeof body?.error === 'string' ? body.error : `Gallery API failed with ${res.status}`,
      res.status,
      body,
    );
  }
  return res.json() as Promise<T>;
}

// List endpoints are keyset-paginated: each page returns `nextCursor` (opaque)
// until exhausted. `list*Page` fns expose single pages for incremental UIs; the
// plain `list*` fns drain every page so existing callers keep full-list behaviour.
export interface GalleryPage {
  cursor?: string | null;
  limit?: number;
}

const MAX_PAGE_FOLLOWS = 50;

function pageQuery(page: GalleryPage): string {
  const params = new URLSearchParams();
  if (page.cursor) params.set('cursor', page.cursor);
  if (page.limit) params.set('limit', String(page.limit));
  const suffix = params.toString();
  return suffix ? `?${suffix}` : '';
}

async function drainPages<T>(fetchPage: (cursor: string | null) => Promise<{ items: T[]; nextCursor: string | null }>): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < MAX_PAGE_FOLLOWS; i += 1) {
    const { items, nextCursor } = await fetchPage(cursor);
    all.push(...items);
    if (!nextCursor) break;
    cursor = nextCursor;
  }
  return all;
}

export async function listGalleryPhotosPage(page: GalleryPage = {}): Promise<GalleryListResponse> {
  const res = await fetch(`/api/gallery${pageQuery(page)}`, { headers: { accept: 'application/json' } });
  return readJson<GalleryListResponse>(res);
}

export async function listGalleryPhotos(): Promise<GalleryItem[]> {
  return drainPages(async (cursor) => {
    const response = await listGalleryPhotosPage({ cursor });
    return { items: response.photos, nextCursor: response.nextCursor ?? null };
  });
}

export async function getGalleryAlbum(
  slug: string,
  options: { password?: string | null } = {},
): Promise<GalleryAlbumResponse> {
  const headers = new Headers({ accept: 'application/json' });
  if (options.password?.trim()) headers.set('x-gallery-album-password', options.password.trim());
  const res = await fetch(`/api/gallery/albums/${encodeURIComponent(slug)}`, {
    headers,
  });
  return readJson<GalleryAlbumResponse>(res);
}

export async function listPublishedGalleryAlbums(): Promise<GalleryAlbum[]> {
  const res = await fetch('/api/gallery/albums', { headers: { accept: 'application/json' } });
  return (await readJson<GalleryAlbumsResponse>(res)).albums;
}

export async function getEmbedPhoto(photoId: string, albumSlug?: string | null): Promise<EmbedPhotoResponse> {
  const params = new URLSearchParams();
  if (albumSlug) params.set('album', albumSlug);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/embed/photo/${encodeURIComponent(photoId)}${suffix}`, {
    headers: { accept: 'application/json' },
  });
  return readJson<EmbedPhotoResponse>(res);
}

export async function getEmbedAlbum(slug: string, opts: { count?: number; layout?: EmbedAlbumLayout } = {}): Promise<EmbedGalleryResponse> {
  const params = new URLSearchParams();
  if (opts.count) params.set('count', String(opts.count));
  if (opts.layout) params.set('layout', opts.layout);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/embed/album/${encodeURIComponent(slug)}${suffix}`, {
    headers: { accept: 'application/json' },
  });
  return readJson<EmbedGalleryResponse>(res);
}

export async function getEmbedPhotoSet(
  ids: string[],
  opts: { layout?: EmbedAlbumLayout; albumSlug?: string | null } = {},
): Promise<EmbedGalleryResponse> {
  const params = new URLSearchParams();
  params.set('ids', ids.slice(0, 24).join(','));
  if (opts.layout) params.set('layout', opts.layout);
  if (opts.albumSlug) params.set('album', opts.albumSlug);
  const res = await fetch(`/api/embed/photos?${params.toString()}`, {
    headers: { accept: 'application/json' },
  });
  return readJson<EmbedGalleryResponse>(res);
}

export async function getPublicEmbedTemplate(): Promise<EmbedTemplate> {
  const res = await fetch('/api/embed/template', { headers: { accept: 'application/json' } });
  return (await readJson<EmbedSettingsResponse>(res)).template;
}

function authHeaders(accessToken?: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set('accept', 'application/json');
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  return headers;
}

function adminHeaders(accessToken?: string, extra?: HeadersInit): Headers {
  return authHeaders(accessToken, extra);
}

export async function listMyGalleryReactions(accessToken: string): Promise<Record<string, Reaction>> {
  const res = await fetch('/api/gallery/reactions', { headers: authHeaders(accessToken) });
  return (await readJson<GalleryReactionsResponse>(res)).reactions;
}

export async function setMyGalleryReaction(
  photoId: string,
  reaction: Reaction,
  accessToken: string,
): Promise<GalleryReactionUpdateResponse> {
  const res = await fetch(`/api/gallery/reactions/${encodeURIComponent(photoId)}`, {
    method: 'PUT',
    headers: authHeaders(accessToken, { 'content-type': 'application/json' }),
    body: JSON.stringify({ reaction }),
  });
  return readJson<GalleryReactionUpdateResponse>(res);
}

export async function clearMyGalleryReaction(
  photoId: string,
  accessToken: string,
): Promise<GalleryReactionUpdateResponse> {
  const res = await fetch(`/api/gallery/reactions/${encodeURIComponent(photoId)}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  return readJson<GalleryReactionUpdateResponse>(res);
}

export async function listAdminGalleryPhotosPage(page: GalleryPage = {}, accessToken?: string): Promise<AdminGalleryListResponse> {
  const res = await fetch(`/api/admin/gallery${pageQuery(page)}`, { headers: adminHeaders(accessToken) });
  return readJson<AdminGalleryListResponse>(res);
}

export async function listAdminGalleryPhotos(accessToken?: string): Promise<AdminGalleryPhoto[]> {
  return drainPages(async (cursor) => {
    const response = await listAdminGalleryPhotosPage({ cursor }, accessToken);
    return { items: response.photos, nextCursor: response.nextCursor ?? null };
  });
}

export async function listAdminGalleryAlbums(accessToken?: string): Promise<GalleryAlbum[]> {
  const res = await fetch('/api/admin/gallery/albums', { headers: adminHeaders(accessToken) });
  return (await readJson<AdminGalleryAlbumsResponse>(res)).albums;
}

export async function createAdminGalleryAlbum(
  album: GalleryAlbumMutation,
  accessToken?: string,
): Promise<GalleryAlbum> {
  const res = await fetch('/api/admin/gallery/albums', {
    method: 'POST',
    headers: adminHeaders(accessToken, { 'content-type': 'application/json' }),
    body: JSON.stringify(album),
  });
  return (await readJson<{ album: GalleryAlbum }>(res)).album;
}

export async function updateAdminGalleryAlbum(
  slug: string,
  updates: GalleryAlbumMutation,
  accessToken?: string,
): Promise<GalleryAlbum> {
  const res = await fetch(`/api/admin/gallery/albums/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: adminHeaders(accessToken, { 'content-type': 'application/json' }),
    body: JSON.stringify(updates),
  });
  return (await readJson<{ album: GalleryAlbum }>(res)).album;
}

export async function deleteAdminGalleryAlbum(slug: string, accessToken?: string): Promise<void> {
  const res = await fetch(`/api/admin/gallery/albums/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: adminHeaders(accessToken),
  });
  await readJson<{ ok: true }>(res);
}

export async function getAdminEmbedSettings(accessToken?: string): Promise<EmbedTemplate> {
  const res = await fetch('/api/admin/embed/settings', { headers: adminHeaders(accessToken) });
  return (await readJson<EmbedSettingsResponse>(res)).template;
}

export async function updateAdminEmbedSettings(template: EmbedTemplate, accessToken?: string): Promise<EmbedTemplate> {
  const res = await fetch('/api/admin/embed/settings', {
    method: 'PATCH',
    headers: adminHeaders(accessToken, { 'content-type': 'application/json' }),
    body: JSON.stringify({ template }),
  });
  return (await readJson<EmbedSettingsResponse>(res)).template;
}

export async function updateAdminGalleryPhoto(
  id: string,
  updates: Partial<AdminGalleryPhoto> & Record<string, unknown>,
  accessToken?: string,
): Promise<AdminGalleryPhoto> {
  const res = await fetch(`/api/admin/gallery/${id}`, {
    method: 'PATCH',
    headers: adminHeaders(accessToken, { 'content-type': 'application/json' }),
    body: JSON.stringify(updates),
  });
  return (await readJson<{ photo: AdminGalleryPhoto }>(res)).photo;
}

export async function deleteAdminGalleryPhoto(id: string, accessToken?: string): Promise<void> {
  const res = await fetch(`/api/admin/gallery/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(accessToken),
  });
  await readJson<{ ok: true }>(res);
}

export async function uploadAdminGalleryPhoto(form: FormData, accessToken?: string): Promise<AdminGalleryPhoto> {
  const res = await fetch('/api/admin/gallery', {
    method: 'POST',
    headers: adminHeaders(accessToken),
    body: form,
  });
  return (await readJson<{ photo: AdminGalleryPhoto }>(res)).photo;
}

export async function listAdminGalleryTags(accessToken?: string): Promise<GalleryTag[]> {
  const res = await fetch('/api/admin/gallery/tags', { headers: adminHeaders(accessToken) });
  return (await readJson<AdminGalleryTagsResponse>(res)).tags;
}

export async function createAdminGalleryTag(label: string, accessToken?: string): Promise<GalleryTag> {
  const res = await fetch('/api/admin/gallery/tags', {
    method: 'POST',
    headers: adminHeaders(accessToken, { 'content-type': 'application/json' }),
    body: JSON.stringify({ label }),
  });
  return (await readJson<{ tag: GalleryTag }>(res)).tag;
}

export async function updateAdminGalleryTag(
  slug: string,
  updates: Partial<Pick<GalleryTag, 'label' | 'archived'>>,
  accessToken?: string,
): Promise<GalleryTag> {
  const res = await fetch(`/api/admin/gallery/tags/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: adminHeaders(accessToken, { 'content-type': 'application/json' }),
    body: JSON.stringify(updates),
  });
  return (await readJson<{ tag: GalleryTag }>(res)).tag;
}

export async function archiveAdminGalleryTag(slug: string, accessToken?: string): Promise<void> {
  const res = await fetch(`/api/admin/gallery/tags/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: adminHeaders(accessToken),
  });
  await readJson<{ ok: true }>(res);
}

export async function getAdminGalleryReactionStats(accessToken?: string): Promise<AdminGalleryReactionStats> {
  const res = await fetch('/api/admin/gallery/reactions', { headers: adminHeaders(accessToken) });
  return readJson<AdminGalleryReactionStats>(res);
}

export async function listAccountGalleryPhotosPage(page: GalleryPage, accessToken: string): Promise<AdminGalleryListResponse> {
  const res = await fetch(`/api/account/gallery/photos${pageQuery(page)}`, { headers: authHeaders(accessToken) });
  return readJson<AdminGalleryListResponse>(res);
}

export async function listAccountGalleryPhotos(accessToken: string): Promise<AdminGalleryPhoto[]> {
  return drainPages(async (cursor) => {
    const response = await listAccountGalleryPhotosPage({ cursor }, accessToken);
    return { items: response.photos, nextCursor: response.nextCursor ?? null };
  });
}

export async function uploadAccountGalleryPhoto(form: FormData, accessToken: string): Promise<AdminGalleryPhoto> {
  const res = await fetch('/api/account/gallery/photos', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: form,
  });
  return (await readJson<{ photo: AdminGalleryPhoto }>(res)).photo;
}

export async function updateAccountGalleryPhoto(
  id: string,
  updates: Partial<AdminGalleryPhoto> & Record<string, unknown>,
  accessToken: string,
): Promise<AdminGalleryPhoto> {
  const res = await fetch(`/api/account/gallery/photos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken, { 'content-type': 'application/json' }),
    body: JSON.stringify(updates),
  });
  return (await readJson<{ photo: AdminGalleryPhoto }>(res)).photo;
}

export async function publishAccountGalleryPhoto(id: string, accessToken: string): Promise<void> {
  const res = await fetch(`/api/account/gallery/photos/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  await readJson<{ ok: true }>(res);
}

export async function unpublishAccountGalleryPhoto(id: string, accessToken: string): Promise<void> {
  const res = await fetch(`/api/account/gallery/photos/${encodeURIComponent(id)}/publish`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  await readJson<{ ok: true }>(res);
}

export async function listAccountGalleryAlbums(accessToken: string): Promise<GalleryAlbum[]> {
  const res = await fetch('/api/account/gallery/albums', { headers: authHeaders(accessToken) });
  return (await readJson<GalleryAlbumsResponse>(res)).albums;
}

export async function getAccountGalleryAlbum(slug: string, accessToken: string): Promise<GalleryAlbumResponse> {
  const res = await fetch(`/api/account/gallery/albums/${encodeURIComponent(slug)}`, {
    headers: authHeaders(accessToken),
  });
  return readJson<GalleryAlbumResponse>(res);
}

export async function createAccountGalleryAlbum(
  album: GalleryAlbumMutation,
  accessToken: string,
): Promise<GalleryAlbum> {
  const res = await fetch('/api/account/gallery/albums', {
    method: 'POST',
    headers: authHeaders(accessToken, { 'content-type': 'application/json' }),
    body: JSON.stringify(album),
  });
  return (await readJson<{ album: GalleryAlbum }>(res)).album;
}

export async function updateAccountGalleryAlbum(
  slug: string,
  updates: GalleryAlbumMutation,
  accessToken: string,
): Promise<GalleryAlbum> {
  const res = await fetch(`/api/account/gallery/albums/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken, { 'content-type': 'application/json' }),
    body: JSON.stringify(updates),
  });
  return (await readJson<{ album: GalleryAlbum }>(res)).album;
}
