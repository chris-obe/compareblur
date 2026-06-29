import {
  findPhoto,
  json,
  normalizeTags,
  parseTags,
  photoFromRow,
  type GalleryEnv,
  type GalleryRow,
} from '../../../_lib/gallery';
import { adminAuthError, requireAdmin } from '../../../_lib/admin';
import { galleryFormatIdOrDefault } from '../../../_lib/formats';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
  ADMIN_API_OPEN?: string;
  ADMIN_API_TOKEN?: string;
};

export const onRequestPatch: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
  } catch (error) {
    return adminAuthError(error);
  }

  const id = String(params.id);
  const current = await findPhoto(env, id);
  if (!current) return json({ error: 'photo not found' }, { status: 404 });

  const body = (await request.json()) as Record<string, unknown>;
  const formatId = formatIdValue(body.formatId, current.format_id);
  if (!formatId) return json({ error: 'invalid formatId' }, { status: 400 });

  const next = {
    title: stringValue(body.title, current.title),
    author: stringValue(body.author, current.author),
    status: statusValue(body.status, current.status),
    formatId,
    camera: stringValue(body.camera, current.camera),
    cameraCatalogId: nullableStringValue(body.cameraCatalogId, current.camera_catalog_id),
    lens: stringValue(body.lens, current.lens),
    lensCatalogId: nullableStringValue(body.lensCatalogId, current.lens_catalog_id),
    focal: numberValue(body.focal, current.focal),
    aperture: numberValue(body.aperture, current.aperture),
    tags: body.tags == null
      ? parseTags(current.tags_json)
      : Array.isArray(body.tags)
        ? body.tags.map(String)
        : normalizeTags(String(body.tags)),
    metadataSource: body.metadataSource == null
      ? current.metadata_source_json
      : JSON.stringify(body.metadataSource),
    notes: stringValue(body.notes, current.notes ?? ''),
  };
  const now = new Date().toISOString();
  const publishedAt = next.status === 'approved' ? current.published_at ?? now : null;

  await env.GALLERY_DB.prepare(
    `UPDATE gallery_photos
     SET title = ?, author = ?, status = ?, format_id = ?, camera = ?, camera_catalog_id = ?,
         lens = ?, lens_catalog_id = ?, focal = ?, aperture = ?, tags_json = ?,
         metadata_source_json = ?, notes = ?, updated_at = ?, published_at = ?
     WHERE id = ?`,
  )
    .bind(
      next.title,
      next.author,
      next.status,
      next.formatId,
      next.camera,
      next.cameraCatalogId,
      next.lens,
      next.lensCatalogId,
      next.focal,
      next.aperture,
      JSON.stringify(next.tags),
      next.metadataSource,
      next.notes,
      now,
      publishedAt,
      id,
    )
    .run();

  const row = await env.GALLERY_DB.prepare('SELECT * FROM gallery_photos WHERE id = ?').bind(id).first<GalleryRow>();
  return json({ photo: row ? photoFromRow(row, true) : null });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
  } catch (error) {
    return adminAuthError(error);
  }

  const id = String(params.id);
  const current = await findPhoto(env, id);
  if (!current) return json({ error: 'photo not found' }, { status: 404 });

  await env.GALLERY_BUCKET.delete(current.object_key);
  await env.GALLERY_DB.prepare('DELETE FROM gallery_photos WHERE id = ?').bind(id).run();
  return json({ ok: true });
};

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' ? value.trim() : fallback;
}

function nullableStringValue(value: unknown, fallback: string | null) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberValue(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function statusValue(value: unknown, fallback: string) {
  return typeof value === 'string' && ['draft', 'pending', 'approved', 'rejected'].includes(value)
    ? value
    : fallback;
}

function formatIdValue(value: unknown, fallback: string) {
  if (typeof value === 'string') return galleryFormatIdOrDefault(value);
  return galleryFormatIdOrDefault(fallback) ?? 'ff';
}
