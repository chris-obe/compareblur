import type { GalleryItem } from './types';
import type { Reaction, ReactionCounts } from './reactions';

export type GalleryStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface AdminGalleryPhoto extends GalleryItem {
  status: GalleryStatus;
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

export type GalleryAlbumStatus = 'draft' | 'published';
export type EmbedTheme = 'light' | 'dark' | 'system';
export type EmbedDensity = 'compact' | 'comfortable';
export type EmbedFrameStyle = 'minimal' | 'technical' | 'editorial';
export type EmbedImageFit = 'cover' | 'contain';

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
  defaultTargetFormatId: string;
  visibleFields: EmbedFieldId[];
  ctaLabel: string;
  showEquivalent: boolean;
}

export interface GalleryAlbum {
  slug: string;
  title: string;
  description: string;
  status: GalleryAlbumStatus;
  ownerSub?: string;
  coverPhotoId?: string | null;
  photos: GalleryItem[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface GalleryTag {
  slug: string;
  label: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryListResponse {
  photos: GalleryItem[];
}

export interface AdminGalleryListResponse {
  photos: AdminGalleryPhoto[];
}

export interface GalleryAlbumResponse {
  album: GalleryAlbum;
  photos: GalleryItem[];
}

export interface GalleryAlbumsResponse {
  albums: GalleryAlbum[];
}

export interface AdminGalleryAlbumsResponse {
  albums: GalleryAlbum[];
}

export interface EmbedPhotoResponse {
  photo: GalleryItem;
  album?: GalleryAlbum | null;
  template: EmbedTemplate;
  formats: string[];
}

export interface EmbedSettingsResponse {
  template: EmbedTemplate;
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

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(typeof body?.error === 'string' ? body.error : `Gallery API failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function listGalleryPhotos(): Promise<GalleryItem[]> {
  const res = await fetch('/api/gallery', { headers: { accept: 'application/json' } });
  return (await readJson<GalleryListResponse>(res)).photos;
}

export async function getGalleryAlbum(slug: string): Promise<GalleryAlbumResponse> {
  const res = await fetch(`/api/gallery/albums/${encodeURIComponent(slug)}`, {
    headers: { accept: 'application/json' },
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

export async function listAdminGalleryPhotos(accessToken?: string): Promise<AdminGalleryPhoto[]> {
  const res = await fetch('/api/admin/gallery', { headers: adminHeaders(accessToken) });
  return (await readJson<AdminGalleryListResponse>(res)).photos;
}

export async function listAdminGalleryAlbums(accessToken?: string): Promise<GalleryAlbum[]> {
  const res = await fetch('/api/admin/gallery/albums', { headers: adminHeaders(accessToken) });
  return (await readJson<AdminGalleryAlbumsResponse>(res)).albums;
}

export async function createAdminGalleryAlbum(
  album: Partial<GalleryAlbum> & { photoIds?: string[] },
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
  updates: Partial<GalleryAlbum> & { photoIds?: string[] },
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

export async function listAccountGalleryPhotos(accessToken: string): Promise<AdminGalleryPhoto[]> {
  const res = await fetch('/api/account/gallery/photos', { headers: authHeaders(accessToken) });
  return (await readJson<AdminGalleryListResponse>(res)).photos;
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

export async function listAccountGalleryAlbums(accessToken: string): Promise<GalleryAlbum[]> {
  const res = await fetch('/api/account/gallery/albums', { headers: authHeaders(accessToken) });
  return (await readJson<GalleryAlbumsResponse>(res)).albums;
}

export async function createAccountGalleryAlbum(
  album: Partial<GalleryAlbum> & { photoIds?: string[] },
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
  updates: Partial<GalleryAlbum> & { photoIds?: string[] },
  accessToken: string,
): Promise<GalleryAlbum> {
  const res = await fetch(`/api/account/gallery/albums/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken, { 'content-type': 'application/json' }),
    body: JSON.stringify(updates),
  });
  return (await readJson<{ album: GalleryAlbum }>(res)).album;
}
