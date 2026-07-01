import { adminAuthError, requireAdmin } from '../../_lib/admin';
import { isFeatureFlagKey, loadFeatureFlags, publicFlags, updateFeatureFlags, type FeatureFlagKey } from '../../_lib/featureFlags';
import { json, type GalleryEnv } from '../../_lib/gallery';

type Env = GalleryEnv & {
  AUTH0_AUDIENCE?: string;
  AUTH0_DOMAIN?: string;
  ADMIN_API_OPEN?: string;
  ADMIN_API_TOKEN?: string;
  ADMIN_API_TOKEN_SHA256?: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    await requireAdmin(request, env, ['admin:access']);
    const flags = await loadFeatureFlags(env);
    return json({ flags, publicFlags: publicFlags(flags) });
  } catch (error) {
    return adminAuthError(error);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ env, request }) => {
  let identity;
  try {
    identity = await requireAdmin(request, env, ['admin:access']);
  } catch (error) {
    return adminAuthError(error);
  }

  const body = await request.json().catch(() => ({})) as { flags?: Record<string, unknown> };
  const input = body.flags;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return json({ error: 'flags object is required' }, { status: 400 });
  }

  const updates: Partial<Record<FeatureFlagKey, boolean>> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!isFeatureFlagKey(key)) return json({ error: `unknown feature flag: ${key}` }, { status: 400 });
    if (typeof value !== 'boolean') return json({ error: `feature flag ${key} must be boolean` }, { status: 400 });
    updates[key] = value;
  }

  const flags = await updateFeatureFlags(env, updates, identity.email ?? identity.sub);
  return json({ ok: true, flags, publicFlags: publicFlags(flags) });
};
