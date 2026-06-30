import { adminAuthError, requireAuth0User } from '../../../../../_lib/admin';
import { galleryFormatIdOrDefault } from '../../../../../_lib/formats';
import {
  findPhoto,
  json,
  normalizeTags,
  parseTags,
  photoFromRow,
  type GalleryEnv,
  type GalleryRow,
} from '../../../../../_lib/gallery';
import { findMissingGalleryTags } from '../../../../../_lib/galleryTags';
import { subjectPresetValue, subjectWidthForPreset } from '../../../../../_lib/subjectDistance';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
};

export const onRequestPatch: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const identity = await requireAuth0User(request, env);
    const id = String(params.id);
    const current = await ownedPhoto(env, id, identity.sub);
    if (!current) return json({ error: 'photo not found' }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const formatId = body.formatId == null ? current.format_id : galleryFormatIdOrDefault(body.formatId);
    if (!formatId) return json({ error: 'invalid formatId' }, { status: 400 });
    const tags = body.tags == null
      ? parseTags(current.tags_json)
      : Array.isArray(body.tags)
        ? normalizeTags(body.tags.map(String))
        : normalizeTags(String(body.tags));
    const missingTags = await findMissingGalleryTags(env, tags);
    if (missingTags.length > 0) return json({ error: `Unknown gallery tag: ${missingTags.join(', ')}` }, { status: 400 });
    const subjectPreset = body.subjectPreset == null
      ? subjectPresetValue(current.subject_preset, 'full-body')
      : subjectPresetValue(body.subjectPreset);
    if (!subjectPreset) return json({ error: 'subject distance preset is required' }, { status: 400 });

    const now = new Date().toISOString();
    await env.GALLERY_DB.prepare(
      `UPDATE gallery_photos
       SET title = ?, author = ?, format_id = ?, camera = ?, camera_catalog_id = ?,
           lens = ?, lens_catalog_id = ?, focal = ?, aperture = ?, subject_preset = ?,
           subject_width_m = ?, shutter_speed = ?, iso = ?, captured_at = ?, tags_json = ?,
           notes = ?, updated_at = ?
       WHERE id = ? AND submitted_by = ?`,
    )
      .bind(
        stringValue(body.title, current.title),
        stringValue(body.author, current.author),
        formatId,
        stringValue(body.camera, current.camera),
        nullableString(body.cameraCatalogId, current.camera_catalog_id),
        stringValue(body.lens, current.lens),
        nullableString(body.lensCatalogId, current.lens_catalog_id),
        numberValue(body.focal, current.focal),
        numberValue(body.aperture, current.aperture),
        subjectPreset,
        subjectWidthForPreset(subjectPreset),
        body.shutterSpeed === undefined ? current.shutter_speed ?? null : nullableString(body.shutterSpeed, null),
        body.iso === undefined ? current.iso ?? null : nullableNumber(body.iso, null),
        body.capturedAt === undefined ? current.captured_at ?? null : nullableString(body.capturedAt, null),
        JSON.stringify(tags),
        stringValue(body.notes, current.notes ?? ''),
        now,
        id,
        identity.sub,
      )
      .run();

    const row = await findPhoto(env, id);
    return json({ photo: row ? photoFromRow(row, true) : null });
  } catch (error) {
    return adminAuthError(error);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const identity = await requireAuth0User(request, env);
    const current = await ownedPhoto(env, String(params.id), identity.sub);
    if (!current) return json({ error: 'photo not found' }, { status: 404 });
    await env.GALLERY_BUCKET.delete(current.object_key);
    await env.GALLERY_DB.prepare('DELETE FROM gallery_photos WHERE id = ? AND submitted_by = ?')
      .bind(current.id, identity.sub)
      .run();
    return json({ ok: true });
  } catch (error) {
    return adminAuthError(error);
  }
};

async function ownedPhoto(env: GalleryEnv, id: string, sub: string) {
  return env.GALLERY_DB.prepare('SELECT * FROM gallery_photos WHERE id = ? AND submitted_by = ?')
    .bind(id, sub)
    .first<GalleryRow>();
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' ? value.trim() : fallback;
}

function nullableString(value: unknown, fallback: string | null) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberValue(value: unknown, fallback: number) {
  if (value == null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nullableNumber(value: unknown, fallback: number | null) {
  if (value === undefined) return fallback;
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
