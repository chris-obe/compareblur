# Agent Guidance

## Deployment

- Keep the React/Vite app deployable as a static Cloudflare Pages site from the repository root with build command `cd app && npm ci && npm run build` and output directory `app/dist`; the root `package.json` build script must continue to delegate to that same command so Pages projects configured as `bun run build` still work. Do not add Cloudflare Workers or Pages Functions for graph/blur generation unless a server-only requirement is introduced.
- For CMS or user-generated photo upload features, keep the Pages frontend static and handle mutable data through Cloudflare serverless services: Pages Functions or Workers for API/auth, R2 for image objects, and D1 for gallery/user metadata. Do not use GitHub commits and rebuilds as the publishing path for user uploads or generated gallery records.
- Keep Auth0 and Cloudflare admin credentials out of the Vite client bundle and committed files. Only `VITE_` public Auth0 SPA settings belong in frontend environment variables; Auth0 Management API, Cloudflare API, R2, D1, and image administration secrets must live in local-only env files, Conductor local/user settings, or Cloudflare secrets.
- For account features in this personal-project portfolio, treat Auth0 as the shared identity layer when practical, but keep app-specific profiles, membership, entitlements, and CMS data in this app's own storage. Do not silently create or duplicate full app-local accounts for every cross-portfolio user; create local records lazily on first visit, explicit opt-in, or clear product need.
