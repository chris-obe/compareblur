import { useEffect, useMemo, useRef, useState } from 'react';
import type { AdminGalleryPhoto } from './galleryApi';

const CACHE_NAME = 'blur-account-images-v1';
const CACHE_ORIGIN = 'https://blur.local-cache';

const objectUrls = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

type AccountImagePhoto = Pick<AdminGalleryPhoto, 'id' | 'src' | 'updatedAt'>;

function safePart(value: string) {
  return encodeURIComponent(value.replace(/\s+/g, ' ').trim() || 'unknown');
}

function versionForPhoto(photo: AccountImagePhoto) {
  return safePart(photo.updatedAt ?? photo.src ?? 'current');
}

function cacheKey(ownerKey: string, photo: AccountImagePhoto) {
  return `${safePart(ownerKey)}/${safePart(photo.id)}/${versionForPhoto(photo)}`;
}

function cacheRequest(key: string) {
  return new Request(`${CACHE_ORIGIN}/account-images/${key}`);
}

function accountImageUrl(photo: AccountImagePhoto) {
  return `/api/account/gallery/photos/${encodeURIComponent(photo.id)}/image`;
}

function isPublicImage(photo: AccountImagePhoto) {
  return photo.src?.startsWith('/api/gallery/');
}

async function imageCache() {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  return window.caches.open(CACHE_NAME);
}

function objectUrlForBlob(key: string, blob: Blob) {
  const existing = objectUrls.get(key);
  if (existing) return existing;
  const url = URL.createObjectURL(blob);
  objectUrls.set(key, url);
  return url;
}

export async function cachedAccountImageUrl(
  photo: AccountImagePhoto,
  accessToken: string | null,
  ownerKey: string | null,
) {
  if (isPublicImage(photo)) return photo.src ?? null;
  if (!accessToken || !ownerKey) return null;

  const key = cacheKey(ownerKey, photo);
  const existing = objectUrls.get(key);
  if (existing) return existing;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const cache = await imageCache();
    const request = cacheRequest(key);
    const cached = cache ? await cache.match(request) : null;
    if (cached) return objectUrlForBlob(key, await cached.blob());

    const response = await fetch(accountImageUrl(photo), {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;

    const blob = await response.blob();
    if (cache) {
      await cache.put(request, new Response(blob, {
        headers: { 'content-type': blob.type || response.headers.get('content-type') || 'application/octet-stream' },
      }));
    }
    return objectUrlForBlob(key, blob);
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export async function pruneCachedAccountImages(ownerKey: string | null, photos: AccountImagePhoto[]) {
  if (!ownerKey) return;
  const ownerPrefix = `${safePart(ownerKey)}/`;
  const valid = new Set(photos.filter((photo) => !isPublicImage(photo)).map((photo) => cacheKey(ownerKey, photo)));

  for (const [key, url] of objectUrls) {
    if (!key.startsWith(ownerPrefix) || valid.has(key)) continue;
    URL.revokeObjectURL(url);
    objectUrls.delete(key);
  }

  const cache = await imageCache();
  if (!cache) return;
  const requests = await cache.keys();
  await Promise.all(requests.map(async (request) => {
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/account-images\//, '');
    if (key.startsWith(ownerPrefix) && !valid.has(key)) await cache.delete(request);
  }));
}

export async function clearCachedAccountImages(ownerKey?: string | null) {
  const prefix = ownerKey ? `${safePart(ownerKey)}/` : null;
  for (const [key, url] of objectUrls) {
    if (prefix && !key.startsWith(prefix)) continue;
    URL.revokeObjectURL(url);
    objectUrls.delete(key);
  }

  const cache = await imageCache();
  if (!cache) return;
  const requests = await cache.keys();
  await Promise.all(requests.map(async (request) => {
    if (!prefix) {
      await cache.delete(request);
      return;
    }
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/account-images\//, '');
    if (key.startsWith(prefix)) await cache.delete(request);
  }));
}

export function useCachedAccountImage(
  photo: AccountImagePhoto,
  accessToken: string | null,
  ownerKey: string | null,
) {
  const [src, setSrc] = useState<string | null>(() => (isPublicImage(photo) ? photo.src ?? null : null));

  useEffect(() => {
    let cancelled = false;
    setSrc(isPublicImage(photo) ? photo.src ?? null : null);
    void cachedAccountImageUrl(photo, accessToken, ownerKey).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [accessToken, ownerKey, photo.id, photo.src, photo.updatedAt]);

  return src;
}

export function useCachedAccountImageUrls(
  photos: AccountImagePhoto[],
  accessToken: string | null,
  ownerKey: string | null,
) {
  const key = useMemo(() => photos.map((photo) => `${photo.id}:${photo.src}:${photo.updatedAt ?? ''}`).join('|'), [photos]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(photos.map(async (photo) => {
        const url = await cachedAccountImageUrl(photo, accessToken, ownerKey);
        return url ? [photo.id, url] as const : null;
      }));
      if (!cancelled) setUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => !!entry)));
    };
    void load();
    return () => {
      cancelled = true;
    };
    // `key` captures photo identity/version changes without depending on array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, ownerKey, key]);

  return urls;
}

export function usePruneCachedAccountImages(ownerKey: string | null, photos: AccountImagePhoto[]) {
  const previousOwner = useRef<string | null>(ownerKey);
  const key = useMemo(() => photos.map((photo) => `${photo.id}:${photo.updatedAt ?? photo.src ?? ''}`).join('|'), [photos]);

  useEffect(() => {
    if (previousOwner.current && previousOwner.current !== ownerKey) {
      void clearCachedAccountImages(previousOwner.current);
    }
    previousOwner.current = ownerKey;
  }, [ownerKey]);

  useEffect(() => {
    void pruneCachedAccountImages(ownerKey, photos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerKey, key]);
}

export function useClearCachedAccountImagesOnOwnerChange(ownerKey: string | null) {
  const previousOwner = useRef<string | null>(ownerKey);

  useEffect(() => {
    if (previousOwner.current && previousOwner.current !== ownerKey) {
      void clearCachedAccountImages(previousOwner.current);
    }
    previousOwner.current = ownerKey;
  }, [ownerKey]);
}
