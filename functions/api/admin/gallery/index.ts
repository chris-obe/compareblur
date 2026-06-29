import {
  cleanId,
  json,
  normalizeTags,
  photoFromRow,
  type GalleryEnv,
  type GalleryRow,
} from '../../../_lib/gallery';
import { adminAuthError, requireAdmin } from '../../../_lib/admin';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
  ADMIN_API_OPEN?: string;
  ADMIN_API_TOKEN?: string;
};

const MAX_GALLERY_UPLOAD_BYTES = 1024 * 1024;

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
  } catch (error) {
    return adminAuthError(error);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const includeStatus = status && ['draft', 'pending', 'approved', 'rejected'].includes(status);
  const query = includeStatus
    ? `SELECT * FROM gallery_photos WHERE status = ? ORDER BY updated_at DESC`
    : `SELECT * FROM gallery_photos ORDER BY updated_at DESC`;
  const statement = env.GALLERY_DB.prepare(query);
  const rows = includeStatus ? await statement.bind(status).all<GalleryRow>() : await statement.all<GalleryRow>();

  return json({ photos: (rows.results ?? []).map((row) => photoFromRow(row, true)) });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
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
  const ext = extensionForFile(file);
  const objectKey = `photos/${id}/original.${ext}`;
  const status = String(form.get('status') ?? 'pending');

  if (!['draft', 'pending', 'approved', 'rejected'].includes(status)) {
    return json({ error: 'invalid status' }, { status: 400 });
  }

  await env.GALLERY_BUCKET.put(objectKey, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
    customMetadata: { title, uploadedAt: now },
  });

  const publishedAt = status === 'approved' ? now : null;
  await env.GALLERY_DB.prepare(
    `INSERT INTO gallery_photos (
      id, title, author, status, object_key, content_type, width, height,
      format_id, camera, camera_catalog_id, lens, lens_catalog_id, focal, aperture,
      tags_json, metadata_source_json, submitted_by, notes, created_at, updated_at,
      published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      title,
      String(form.get('author') ?? '').trim(),
      status,
      objectKey,
      file.type || 'application/octet-stream',
      numberOrNull(form.get('width')),
      numberOrNull(form.get('height')),
      String(form.get('formatId') ?? 'ff'),
      String(form.get('camera') ?? 'Unknown camera'),
      stringOrNull(form.get('cameraCatalogId')),
      String(form.get('lens') ?? 'Unknown lens'),
      stringOrNull(form.get('lensCatalogId')),
      numberOrDefault(form.get('focal'), 50),
      numberOrDefault(form.get('aperture'), 1.8),
      JSON.stringify(normalizeTags(form.get('tags'))),
      stringOrNull(form.get('metadataSource')),
      String(form.get('submittedBy') ?? ''),
      String(form.get('notes') ?? ''),
      now,
      now,
      publishedAt,
    )
    .run();

  const row = await env.GALLERY_DB.prepare('SELECT * FROM gallery_photos WHERE id = ?').bind(id).first<GalleryRow>();
  return json({ photo: row ? photoFromRow(row, true) : null }, { status: 201 });
};

function numberOrNull(value: FormDataEntryValue | null) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numberOrDefault(value: FormDataEntryValue | null, fallback: number) {
  const number = numberOrNull(value);
  return number ?? fallback;
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
