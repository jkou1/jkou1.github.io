import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
if (!clientId || !clientSecret || clientId.startsWith('your-')) {
  console.error('Add your Spotify app credentials to .env.spotify first. See README.md.');
  process.exit(1);
}
const redirectUri = 'http://127.0.0.1:8888/callback';
const state = randomBytes(32).toString('hex');
const url = new URL('https://accounts.spotify.com/authorize');
url.search = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, state, scope: 'user-read-currently-playing' }).toString();
let exchanging = false;
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  const callback = new URL(req.url, redirectUri);
  if (req.method !== 'GET' || callback.pathname !== '/callback') { res.writeHead(404).end('Not found'); return; }
  const received = callback.searchParams.get('state') || '';
  if (Buffer.byteLength(received) !== Buffer.byteLength(state) || !timingSafeEqual(Buffer.from(received), Buffer.from(state))) { res.writeHead(400).end('Invalid authorization state. Restart the connection command.'); return; }
  if (callback.searchParams.has('error')) { res.writeHead(400).end('Authorization was declined. You may close this tab.'); server.close(); return; }
  const code = callback.searchParams.get('code');
  if (!code || exchanging) { res.writeHead(400).end('Missing code or connection already in progress.'); return; }
  exchanging = true;
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }), signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok || !data.refresh_token) throw new Error('Spotify did not issue a refresh token. Check the app credentials and redirect URI.');
    const secrets = { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret, SPOTIFY_REFRESH_TOKEN: data.refresh_token };
    await writeFile('.env.spotify', Object.entries(secrets).map(([key,value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 });
    res.end('Spotify connected. Your credentials were saved locally. You can close this tab and return to the terminal.');
    console.log('Connected. Secrets saved in ignored .env.spotify. Follow README.md to add the three variables to Vercel.');
    server.close();
  } catch (error) {
    res.writeHead(502).end('Connection failed. Check the terminal and try again.');
    console.error(error instanceof Error ? error.message : 'Connection failed');
    exchanging = false;
  }
});
server.on('error', error => { console.error(`Cannot start callback server: ${error.message}`); process.exitCode = 1; });
server.listen(8888, '127.0.0.1', () => console.log(`Open this URL in your browser and authorize your account:\n\n${url}\n\nWaiting for Spotify on ${redirectUri}. Press Ctrl+C to cancel.`));
const timeout = setTimeout(() => { console.error('Authorization timed out. Run npm run spotify:connect to retry.'); server.close(); }, 10 * 60 * 1000);
timeout.unref();
server.on('close', () => clearTimeout(timeout));
