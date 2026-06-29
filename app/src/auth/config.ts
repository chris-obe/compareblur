export const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN ?? 'dev-zufrw3qanwnsl6zf.us.auth0.com';
export const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID ?? 'LuRVJxyWtNYOpDIORl9s4VnJHc1GIH0s';
export const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE ?? 'https://blur.lightpilot.co/api';
export const ADMIN_API_SCOPE = 'admin:access catalog:manage';
export const AUTH0_BASE_SCOPE = 'openid profile email';
export const AUTH0_ADMIN_SCOPE = `${AUTH0_BASE_SCOPE} ${ADMIN_API_SCOPE}`;

export const adminAuthorizationParams = {
  audience: AUTH0_AUDIENCE,
  scope: AUTH0_ADMIN_SCOPE,
};

export const adminTokenParams = {
  audience: AUTH0_AUDIENCE,
  scope: ADMIN_API_SCOPE,
};

export const userTokenParams = {
  audience: AUTH0_AUDIENCE,
  scope: AUTH0_BASE_SCOPE,
};
