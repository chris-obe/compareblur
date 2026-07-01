import { adminAuthError, requireAdmin } from '../../../../_lib/admin';
import {
  adminAlbumWithPhotos,
  albumFromRow,
  cleanAlbumSlug,
  normalizeAlbumStatus,
  normalizePhotoInputs,
  replaceAlbumPhotos,
  type GalleryAlbumRow,
} from '../../../../_lib/embed';
import { json, type GalleryEnv } from '../../../../_lib/gallery';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
  ADMIN_API_OPEN?: string;
  ADMIN_API_TOKEN?: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
  } catch (error) {
    return adminAuthError(error);
  }

  const rows = await env.GALLERY_DB.prepare('SELECT * FROM gallery_albums ORDER BY updated_at DESC').all<GalleryAlbumRow>();
  const albums = [];
  for (const row of rows.results ?? []) albums.push(await adminAlbumWithPhotos(env, row));
  return json({ albums });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let identity;
  try {
    identity = await requireAdmin(request, env, ['admin:access']);
  } catch (error) {
    return adminAuthError(error);
  }

  const body = await request.json().catch(() => ({})) as AlbumBody;
  const title = stringValue(body.title, 'Untitled album');
  const slug = cleanAlbumSlug(body.slug, title);
  if (!slug) return json({ error: 'album slug is required' }, { status: 400 });
  const now = new Date().toISOString();
  const status = normalizeAlbumStatus(body.status);
  const publishedAt = status === 'published' ? now : null;

  await env.GALLERY_DB.prepare(
    `INSERT INTO gallery_albums (
      slug, title, description, status, owner_sub, cover_photo_id, created_at, updated_at, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      slug,
      title,
      stringValue(body.description, ''),
      status,
      identity.sub,
      nullableString(body.coverPhotoId),
      now,
      now,
      publishedAt,
    )
    .run();

  await replaceAlbumPhotos(env, slug, normalizePhotoInputs(body.photos ?? body.photoIds));
  const row = await env.GALLERY_DB.prepare('SELECT * FROM gallery_albums WHERE slug = ?').bind(slug).first<GalleryAlbumRow>();
  return json({ album: row ? await adminAlbumWithPhotos(env, row) : albumFromRow({
    slug,
    title,
    description: stringValue(body.description, ''),
    status,
    owner_sub: identity.sub,
    owner_name: identity.sub,
    cover_photo_id: nullableString(body.coverPhotoId),
    password_hash: null,
    password_salt: null,
    created_at: now,
    updated_at: now,
    published_at: publishedAt,
  }) }, { status: 201 });
};

interface AlbumBody {
  slug?: unknown;
  title?: unknown;
  description?: unknown;
  status?: unknown;
  coverPhotoId?: unknown;
  photoIds?: unknown;
  photos?: unknown;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
