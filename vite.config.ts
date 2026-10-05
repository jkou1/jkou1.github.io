import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { createNowPlayingHandler } from './server/now-playing';

function localSpotify(): Plugin {
  const handle = createNowPlayingHandler();
  return {
    name: 'local-spotify-api',
    configureServer(server) {
      server.middlewares.use('/api/now-playing', async (req, res) => {
        try {
          // This code runs only on the development server; secrets never reach Vite's client bundle.
          const env = { ...loadEnv('spotify', process.cwd(), 'SPOTIFY_'), ...process.env };
          const response = await handle(new Request('http://127.0.0.1/api/now-playing', { method: req.method }), {
            SPOTIFY_CLIENT_ID: env.SPOTIFY_CLIENT_ID || '',
            SPOTIFY_CLIENT_SECRET: env.SPOTIFY_CLIENT_SECRET || '',
            SPOTIFY_REFRESH_TOKEN: env.SPOTIFY_REFRESH_TOKEN || '',
          });
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify({ error: 'Listening status is temporarily unavailable' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localSpotify()],
  build: { rollupOptions: { input: {
    home: resolve(import.meta.dirname, 'index.html'),
    board: resolve(import.meta.dirname, 'board/index.html'),
  } } },
});
