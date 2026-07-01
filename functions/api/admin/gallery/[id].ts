import {
  findPhoto,
  galleryStatusFromRow,
  json,
  legacyStatusFromGalleryStatus,
  legacyStatusToGalleryStatus,
  normalizeTags,
  parseTags,
  photoFromRow,
  type GalleryEnv,
  type GalleryRow,
} from '../../../_lib/gallery';
import { adminAuthError, requireAdmin } from '../../../_lib/admin';
import { galleryFormatIdOrDefault } from '../../../_lib/formats';
import { findMissingGalleryTags } from '../../../_lib/galleryTags';
import { subjectPresetValue, subjectWidthForPreset } from '../../../_lib/subjectDistance';

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

  const tags = body.tags == null
    ? parseTags(current.tags_json)
    : Array.isArray(body.tags)
      ? normalizeTags(body.tags.map(String))
      : normalizeTags(String(body.tags));
  const missingTags = await findMissingGalleryTags(env, tags);
  if (missingTags.length > 0) {
    return json({ error: `Unknown gallery tag: ${missingTags.join(', ')}` }, { status: 400 });
  }
  const subjectPreset = body.subjectPreset == null
    ? subjectPresetValue(current.subject_preset, 'full-body')
    : subjectPresetValue(body.subjectPreset);
  if (!subjectPreset) return json({ error: 'subject distance preset is required' }, { status: 400 });
  const subjectWidthM = subjectWidthForPreset(subjectPreset);

  const next = {
    title: stringValue(body.title, current.title),
    author: stringValue(body.author, current.author),
    galleryStatus: galleryStatusValue(body.galleryStatus ?? body.status, galleryStatusFromRow(current)),
    formatId,
    camera: stringValue(body.camera, current.camera),
    cameraCatalogId: nullableStringValue(body.cameraCatalogId, current.camera_catalog_id),
    lens: stringValue(body.lens, current.lens),
    lensCatalogId: nullableStringValue(body.lensCatalogId, current.lens_catalog_id),
    focal: numberValue(body.focal, current.focal),
    aperture: numberValue(body.aperture, current.aperture),
    subjectPreset,
    subjectWidthM,
    shutterSpeed: body.shutterSpeed === undefined ? current.shutter_speed ?? null : nullableStringValue(body.shutterSpeed, null),
    iso: body.iso === undefined ? current.iso ?? null : nullableNumberValue(body.iso, null),
    capturedAt: body.capturedAt === undefined ? current.captured_at ?? null : nullableStringValue(body.capturedAt, null),
    tags,
    metadataSource: body.metadataSource == null
      ? current.metadata_source_json
      : JSON.stringify(body.metadataSource),
    notes: stringValue(body.notes, current.notes ?? ''),
  };
  const now = new Date().toISOString();
  const nextLegacyStatus = legacyStatusFromGalleryStatus(next.galleryStatus);
  const publishedAt = next.galleryStatus === 'approved' ? current.published_at ?? now : null;

  await env.GALLERY_DB.prepare(
    `UPDATE gallery_photos
     SET title = ?, author = ?, status = ?, gallery_status = ?, gallery_status_review_required = 0,
         format_id = ?, camera = ?, camera_catalog_id = ?,
         lens = ?, lens_catalog_id = ?, focal = ?, aperture = ?, tags_json = ?,
         subject_preset = ?, subject_width_m = ?, shutter_speed = ?, iso = ?, captured_at = ?,
         metadata_source_json = ?, notes = ?, updated_at = ?, published_at = ?
     WHERE id = ?`,
  )
    .bind(
      next.title,
      next.author,
      nextLegacyStatus,
      next.galleryStatus,
      next.formatId,
      next.camera,
      next.cameraCatalogId,
      next.lens,
      next.lensCatalogId,
      next.focal,
      next.aperture,
      JSON.stringify(next.tags),
      next.subjectPreset,
      next.subjectWidthM,
      next.shutterSpeed,
      next.iso,
      next.capturedAt,
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

function nullableNumberValue(value: unknown, fallback: number | null) {
  if (value == null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numberValue(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function statusValue(value: unknown, fallback: string) {
  return typeof value === 'string' && ['draft', 'pending', 'approved', 'rejected', 'not_submitted'].includes(value)
    ? legacyStatusFromGalleryStatus(legacyStatusToGalleryStatus(value))
    : fallback;
}

function galleryStatusValue(value: unknown, fallback: ReturnType<typeof legacyStatusToGalleryStatus>) {
  return typeof value === 'string'
    ? legacyStatusToGalleryStatus(value)
    : fallback;
}

function formatIdValue(value: unknown, fallback: string) {
  if (typeof value === 'string') return galleryFormatIdOrDefault(value);
  return galleryFormatIdOrDefault(fallback) ?? 'ff';
}
