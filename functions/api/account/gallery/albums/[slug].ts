import { adminAuthError, requireAuth0User } from '../../../../_lib/admin';
import {
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

export const onRequestPatch: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const identity = await requireAuth0User(request, env);
    const slug = String(params.slug);
    const current = await env.GALLERY_DB.prepare('SELECT * FROM gallery_albums WHERE slug = ? AND owner_sub = ?')
      .bind(slug, identity.sub)
      .first<GalleryAlbumRow>();
    if (!current) return json({ error: 'album not found' }, { status: 404 });

    const body = await request.json().catch(() => ({})) as AlbumBody;
    const nextSlug = body.slug == null ? current.slug : cleanAlbumSlug(body.slug, current.title);
    if (!nextSlug) return json({ error: 'album slug is required' }, { status: 400 });
    if (nextSlug !== slug) {
      const existing = await env.GALLERY_DB.prepare('SELECT slug FROM gallery_albums WHERE slug = ?').bind(nextSlug).first<{ slug: string }>();
      if (existing) return json({ error: 'album slug already exists' }, { status: 409 });
    }

    const status = body.status == null ? current.status : normalizeAlbumStatus(body.status, current.status);
    const now = new Date().toISOString();
    const publishedAt = status === 'published' ? current.published_at ?? now : null;
    await env.GALLERY_DB.prepare(
      `UPDATE gallery_albums
       SET slug = ?, title = ?, description = ?, status = ?, cover_photo_id = ?,
           updated_at = ?, published_at = ?
       WHERE slug = ? AND owner_sub = ?`,
    )
      .bind(
        nextSlug,
        stringValue(body.title, current.title),
        stringValue(body.description, current.description),
        status,
        body.coverPhotoId === undefined ? current.cover_photo_id : nullableString(body.coverPhotoId),
        now,
        publishedAt,
        slug,
        identity.sub,
      )
      .run();

    if (nextSlug !== slug) {
      await env.GALLERY_DB.prepare('UPDATE gallery_album_photos SET album_slug = ? WHERE album_slug = ?')
        .bind(nextSlug, slug)
        .run();
    }

    if (body.photos != null || body.photoIds != null) {
      await replaceAlbumPhotos(env, nextSlug, normalizePhotoInputs(body.photos ?? body.photoIds), {
        approvedOnly: false,
        ownerSub: identity.sub,
      });
    }

    return json({ album: await ownedAlbumWithPhotos(env, nextSlug, identity.sub) });
  } catch (error) {
    return adminAuthError(error);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const identity = await requireAuth0User(request, env);
    await env.GALLERY_DB.prepare('DELETE FROM gallery_albums WHERE slug = ? AND owner_sub = ?')
      .bind(String(params.slug), identity.sub)
      .run();
    return json({ ok: true });
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
