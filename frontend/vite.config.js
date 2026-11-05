import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const portals = JSON.parse(readFileSync(new URL('./portals.json', import.meta.url), 'utf-8'));

// One codebase, three sites: `--mode kiosk|student|admin` picks which one to serve or build.
export default defineConfig(({ command, mode, isPreview }) => {
  const portal = portals[mode];
  if (!portal) {
    throw new Error(`Unknown portal "${mode}". Run Vite with --mode ${Object.keys(portals).join(', --mode ')}.`);
  }

  const serverOptions = {
    port: portal.port,
    strictPort: true, // a portal's address must not silently change if its port is taken
    proxy: {
      '/api': {
        target: process.env.BOOKBASE_API_URL || 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  };

  return {
    plugins: [
      react(),
      {
        name: 'portal-title',
        transformIndexHtml: (html) => html.replace(/<title>.*<\/title>/, `<title>BookBase — ${portal.title}</title>`),
      },
    ],
    // Built assets live under /kiosk/ etc. so all three sites can be deployed side by side
    base: command === 'build' || isPreview ? `/${mode}/` : '/',
    cacheDir: `node_modules/.vite/${mode}`, // the three dev servers run at once and must not share a cache
    define: { 'import.meta.env.VITE_PORTAL': JSON.stringify(mode) },
    resolve: {
      alias: { '@portal-app': fileURLToPath(new URL(`./src/portals/${portal.app}.jsx`, import.meta.url)) },
    },
    server: serverOptions,
    preview: serverOptions,
    build: { outDir: `dist/${mode}`, emptyOutDir: true },
  };
});
