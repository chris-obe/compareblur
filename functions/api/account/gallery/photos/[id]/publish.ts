import { adminAuthError, requireAuth0User } from '../../../../../_lib/admin';
import { json, type GalleryEnv, type GalleryRow } from '../../../../../_lib/gallery';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const identity = await requireAuth0User(request, env);
    const id = String(params.id);
    const row = await env.GALLERY_DB.prepare('SELECT * FROM gallery_photos WHERE id = ? AND submitted_by = ?')
      .bind(id, identity.sub)
      .first<GalleryRow>();
    if (!row) return json({ error: 'photo not found' }, { status: 404 });
    const missing = requiredFields(row);
    if (missing.length > 0) return json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });

    const now = new Date().toISOString();
    await env.GALLERY_DB.prepare(
      `UPDATE gallery_photos
       SET status = CASE WHEN status = 'approved' THEN status ELSE 'pending' END,
           updated_at = ?
       WHERE id = ? AND submitted_by = ?`,
    )
      .bind(now, id, identity.sub)
      .run();
    return json({ ok: true, status: row.status === 'approved' ? 'approved' : 'pending' });
  } catch (error) {
    return adminAuthError(error);
  }
};

function requiredFields(row: GalleryRow): string[] {
  const missing: string[] = [];
  if (!row.title?.trim()) missing.push('title');
  if (!row.camera?.trim()) missing.push('camera');
  if (!row.lens?.trim()) missing.push('lens');
  if (!row.format_id?.trim()) missing.push('format');
  if (!Number.isFinite(row.focal)) missing.push('focal length');
  if (!Number.isFinite(row.aperture)) missing.push('aperture');
  if (!row.subject_preset?.trim()) missing.push('framing');
  return missing;
}
