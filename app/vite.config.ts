import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// The optics engine lives in the sibling /engine directory and is shared
// (the legacy site + demos import it too), so we alias instead of copying.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@engine': resolve(__dirname, '../engine/index.js'),
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: Number(process.env.CONDUCTOR_PORT) || 5173,
    strictPort: true,
    host: true,
    fs: { allow: ['..'] }, // allow serving the sibling /engine dir
  },
});
