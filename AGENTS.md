# Agent Guidance

## Deployment

- Keep the React/Vite app deployable as a static Cloudflare Pages site from the repository root with build command `cd app && npm ci && npm run build` and output directory `app/dist`; the root `package.json` build script must continue to delegate to that same command so Pages projects configured as `bun run build` still work. Do not add Cloudflare Workers or Pages Functions for graph/blur generation unless a server-only requirement is introduced.
