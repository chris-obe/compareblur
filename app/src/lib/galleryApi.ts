import type { GalleryItem } from './types';

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

export interface GalleryListResponse {
  photos: GalleryItem[];
}

export interface AdminGalleryListResponse {
  photos: AdminGalleryPhoto[];
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

function adminHeaders(accessToken?: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set('accept', 'application/json');
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  return headers;
}

export async function listAdminGalleryPhotos(accessToken?: string): Promise<AdminGalleryPhoto[]> {
  const res = await fetch('/api/admin/gallery', { headers: adminHeaders(accessToken) });
  return (await readJson<AdminGalleryListResponse>(res)).photos;
}

export async function updateAdminGalleryPhoto(
  id: string,
  updates: Partial<AdminGalleryPhoto>,
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
