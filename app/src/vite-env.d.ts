/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH0_DOMAIN?: string;
  readonly VITE_AUTH0_CLIENT_ID?: string;
  readonly VITE_AUTH0_AUDIENCE?: string;
  readonly VITE_ADMIN_REQUIRE_AUTH?: string;
  readonly VITE_ADMIN_API_BASE?: string;
  readonly VITE_ADMIN_API_ROOT?: string;
  readonly VITE_CATALOG_ADMIN_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
