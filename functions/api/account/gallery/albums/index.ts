import { adminAuthError, requireAuth0User } from '../../../../_lib/admin';
import {
  albumFromRow,
  cleanAlbumSlug,
  normalizeAlbumStatus,
  normalizePhotoInputs,
  ownedAlbumWithPhotos,
  replaceAlbumPhotos,
  type GalleryAlbumRow,
} from '../../../../_lib/embed';
import { json, type GalleryEnv } from '../../../../_lib/gallery';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const identity = await requireAuth0User(request, env);
    const rows = await env.GALLERY_DB.prepare('SELECT * FROM gallery_albums WHERE owner_sub = ? ORDER BY updated_at DESC')
      .bind(identity.sub)
      .all<GalleryAlbumRow>();
    const albums = [];
    for (const row of rows.results ?? []) albums.push(await ownedAlbumWithPhotos(env, row.slug, identity.sub));
    return json({ albums: albums.filter(Boolean) });
  } catch (error) {
    return adminAuthError(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const identity = await requireAuth0User(request, env);
    const body = await request.json().catch(() => ({})) as AlbumBody;
    const title = stringValue(body.title, 'Untitled album');
    const slug = cleanAlbumSlug(body.slug, title);
    if (!slug) return json({ error: 'album slug is required' }, { status: 400 });
    const existing = await env.GALLERY_DB.prepare('SELECT slug FROM gallery_albums WHERE slug = ?').bind(slug).first<{ slug: string }>();
    if (existing) return json({ error: 'album slug already exists' }, { status: 409 });

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
    await replaceAlbumPhotos(env, slug, normalizePhotoInputs(body.photos ?? body.photoIds), {
      approvedOnly: false,
      ownerSub: identity.sub,
    });
    const album = await ownedAlbumWithPhotos(env, slug, identity.sub);
    return json({ album: album ?? albumFromRow({
      slug,
      title,
      description: stringValue(body.description, ''),
      status,
      owner_sub: identity.sub,
      cover_photo_id: nullableString(body.coverPhotoId),
      created_at: now,
      updated_at: now,
      published_at: publishedAt,
    }) }, { status: 201 });
  } catch (error) {
    return adminAuthError(error);
  }
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
