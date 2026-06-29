export function isDevAdminBypass(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_ADMIN_REQUIRE_AUTH !== 'true';
}
