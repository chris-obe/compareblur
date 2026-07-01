import { adminAuthError, requireAuth0User } from '../../../../_lib/admin';
import { galleryFormatIdOrDefault } from '../../../../_lib/formats';
import {
  cleanId,
  findPhoto,
  json,
  legacyStatusFromGalleryStatus,
  normalizeTags,
  photoFromRow,
  type GalleryEnv,
  type GalleryRow,
} from '../../../../_lib/gallery';
import { findMissingGalleryTags } from '../../../../_lib/galleryTags';
import { subjectPresetValue, subjectWidthForPreset } from '../../../../_lib/subjectDistance';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
};

const MAX_GALLERY_UPLOAD_BYTES = 1024 * 1024;

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const identity = await requireAuth0User(request, env);
    const rows = await env.GALLERY_DB.prepare(
      `SELECT * FROM gallery_photos
       WHERE submitted_by = ?
       ORDER BY updated_at DESC`,
    )
      .bind(identity.sub)
      .all<GalleryRow>();
    return json({ photos: (rows.results ?? []).map((row) => photoFromRow(row, true)) });
  } catch (error) {
    return adminAuthError(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let identity;
  try {
    identity = await requireAuth0User(request, env);
  } catch (error) {
    return adminAuthError(error);
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return json({ error: 'file is required' }, { status: 400 });
  if (file.size > MAX_GALLERY_UPLOAD_BYTES) {
    return json({ error: 'gallery image must be 1 MB or smaller after processing' }, { status: 413 });
  }

  const title = String(form.get('title') ?? file.name).trim();
  const now = new Date().toISOString();
  const id = cleanId(String(form.get('id') ?? title)) || crypto.randomUUID();
  if (await findPhoto(env, id)) return json({ error: 'photo id already exists' }, { status: 409 });

  const formatId = galleryFormatIdOrDefault(form.get('formatId'));
  if (!formatId) return json({ error: 'invalid formatId' }, { status: 400 });
  const subjectPreset = subjectPresetValue(form.get('subjectPreset'), 'full-body');
  if (!subjectPreset) return json({ error: 'subject distance preset is required' }, { status: 400 });
  const tags = normalizeTags(form.get('tags'));
  const missingTags = await findMissingGalleryTags(env, tags);
  if (missingTags.length > 0) return json({ error: `Unknown gallery tag: ${missingTags.join(', ')}` }, { status: 400 });

  const ext = extensionForFile(file);
  const objectKey = `users/${cleanId(identity.sub)}/photos/${id}/original.${ext}`;
  await env.GALLERY_BUCKET.put(objectKey, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
    customMetadata: { title, uploadedAt: now, ownerSub: identity.sub },
  });

  await env.GALLERY_DB.prepare(
    `INSERT INTO gallery_photos (
      id, title, author, status, gallery_status, gallery_status_review_required, object_key, content_type, width, height,
      format_id, camera, camera_catalog_id, lens, lens_catalog_id, focal, aperture,
      subject_preset, subject_width_m, shutter_speed, iso, captured_at,
      tags_json, metadata_source_json, submitted_by, notes, created_at, updated_at, published_at
    ) VALUES (?, ?, ?, ?, 'not_submitted', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
  )
    .bind(
      id,
      title,
      String(form.get('author') ?? '').trim(),
      legacyStatusFromGalleryStatus('not_submitted'),
      objectKey,
      file.type || 'application/octet-stream',
      numberOrNull(form.get('width')),
      numberOrNull(form.get('height')),
      formatId,
      String(form.get('camera') ?? 'Unknown camera'),
      stringOrNull(form.get('cameraCatalogId')),
      String(form.get('lens') ?? 'Unknown lens'),
      stringOrNull(form.get('lensCatalogId')),
      numberOrDefault(form.get('focal'), 50),
      numberOrDefault(form.get('aperture'), 1.8),
      subjectPreset,
      subjectWidthForPreset(subjectPreset),
      stringOrNull(form.get('shutterSpeed')),
      numberOrNull(form.get('iso')),
      stringOrNull(form.get('capturedAt')),
      JSON.stringify(tags),
      stringOrNull(form.get('metadataSource')),
      identity.sub,
      String(form.get('notes') ?? ''),
      now,
      now,
    )
    .run();

  const row = await findPhoto(env, id);
  return json({ photo: row ? photoFromRow(row, true) : null }, { status: 201 });
};

function numberOrNull(value: FormDataEntryValue | null) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numberOrDefault(value: FormDataEntryValue | null, fallback: number) {
  return numberOrNull(value) ?? fallback;
}

function stringOrNull(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function extensionForFile(file: File) {
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  return file.name.includes('.') ? file.name.split('.').pop() || 'jpg' : 'jpg';
}
