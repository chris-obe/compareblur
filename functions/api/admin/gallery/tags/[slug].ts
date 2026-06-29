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

export const onRequestPatch: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
    const slug = String(params.slug);
    const current = await env.GALLERY_DB.prepare('SELECT * FROM gallery_tags WHERE slug = ?').bind(slug).first<GalleryTagRow>();
    if (!current) return json({ error: 'tag not found' }, { status: 404 });

    const body = (await request.json()) as { label?: unknown; archived?: unknown };
    const nextLabel = typeof body.label === 'string' ? normalizeTagLabel(body.label) : current.label;
    const nextSlug = tagSlug(nextLabel);
    const archived = typeof body.archived === 'boolean' ? (body.archived ? 1 : 0) : current.archived;
    if (!nextSlug || !nextLabel) return json({ error: 'label is required' }, { status: 400 });
    if (nextSlug !== slug) {
      const existing = await env.GALLERY_DB.prepare('SELECT slug FROM gallery_tags WHERE slug = ?').bind(nextSlug).first<{ slug: string }>();
      if (existing) return json({ error: 'tag label already exists' }, { status: 409 });
    }

    const now = new Date().toISOString();
    if (nextLabel !== current.label) {
      await updatePhotoTagAssignments(env, current.label, nextLabel);
    }
    if (nextSlug === slug) {
      await env.GALLERY_DB.prepare('UPDATE gallery_tags SET label = ?, archived = ?, updated_at = ? WHERE slug = ?')
        .bind(nextLabel, archived, now, slug)
        .run();
    } else {
      await env.GALLERY_DB.prepare(
        `INSERT INTO gallery_tags (slug, label, archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(nextSlug, nextLabel, archived, current.created_at, now)
        .run();
      await env.GALLERY_DB.prepare('DELETE FROM gallery_tags WHERE slug = ?').bind(slug).run();
    }

    const row = await env.GALLERY_DB.prepare('SELECT * FROM gallery_tags WHERE slug = ?').bind(nextSlug).first<GalleryTagRow>();
    return json({ tag: row ? tagFromRow(row) : null });
  } catch (error) {
    return tagError(error);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
    const now = new Date().toISOString();
    await env.GALLERY_DB.prepare('UPDATE gallery_tags SET archived = 1, updated_at = ? WHERE slug = ?')
      .bind(now, String(params.slug))
      .run();
    return json({ ok: true });
  } catch (error) {
    return error instanceof Response ? error : adminAuthError(error);
  }
};

async function updatePhotoTagAssignments(env: GalleryTagEnv, from: string, to: string) {
  const rows = await env.GALLERY_DB.prepare('SELECT id, tags_json FROM gallery_photos').all<{ id: string; tags_json: string }>();
  for (const row of rows.results ?? []) {
    let tags: string[];
    try {
      const parsed = JSON.parse(row.tags_json);
      tags = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      tags = [];
    }
    if (!tags.includes(from)) continue;
    const next = [...new Set(tags.map((tag) => (tag === from ? to : tag)))];
    await env.GALLERY_DB.prepare('UPDATE gallery_photos SET tags_json = ?, updated_at = ? WHERE id = ?')
      .bind(JSON.stringify(next), new Date().toISOString(), row.id)
      .run();
  }
}
