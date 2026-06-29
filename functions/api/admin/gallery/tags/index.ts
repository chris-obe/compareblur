import { adminAuthError, requireAdmin } from '../../../../_lib/admin';
import { json } from '../../../../_lib/gallery';
import {
  tagError,
  tagFromRow,
  tagSlug,
  normalizeTagLabel,
  type GalleryTagEnv,
  type GalleryTagRow,
} from '../../../../_lib/galleryTags';

type Env = GalleryTagEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
  ADMIN_API_OPEN?: string;
  ADMIN_API_TOKEN?: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('activeOnly') === 'true';
    const rows = activeOnly
      ? await env.GALLERY_DB.prepare('SELECT * FROM gallery_tags WHERE archived = 0 ORDER BY label ASC').all<GalleryTagRow>()
      : await env.GALLERY_DB.prepare('SELECT * FROM gallery_tags ORDER BY archived ASC, label ASC').all<GalleryTagRow>();
    return json({ tags: (rows.results ?? []).map(tagFromRow) });
  } catch (error) {
    return error instanceof Response ? error : adminAuthError(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
    const body = (await request.json()) as { label?: unknown };
    const label = typeof body.label === 'string' ? normalizeTagLabel(body.label) : '';
    const slug = tagSlug(label);
    if (!slug || !label) return json({ error: 'label is required' }, { status: 400 });

    const now = new Date().toISOString();
    await env.GALLERY_DB.prepare(
      `INSERT INTO gallery_tags (slug, label, archived, created_at, updated_at)
       VALUES (?, ?, 0, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET label = excluded.label, archived = 0, updated_at = excluded.updated_at`,
    )
      .bind(slug, label, now, now)
      .run();

    const row = await env.GALLERY_DB.prepare('SELECT * FROM gallery_tags WHERE slug = ?').bind(slug).first<GalleryTagRow>();
    return json({ tag: row ? tagFromRow(row) : null }, { status: 201 });
  } catch (error) {
    return tagError(error);
  }
};

