export interface SpotifyEnv {
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  SPOTIFY_REFRESH_TOKEN: string;
}

export class UpstreamError extends Error {
  constructor(public status: number, public retryAfter = 30) { super('Spotify is unavailable'); }
}

// State belongs to one function instance; concurrent requests share one upstream fetch.
export function createSpotifyService(fetcher: typeof fetch = fetch, now = Date.now) {
  let token: { value: string; expires: number } | undefined;
  let cached: { value: object; expires: number } | undefined;
  let pending: Promise<object> | undefined;
  let retryAt = 0;

  async function accessToken(env: SpotifyEnv) {
    if (token && token.expires > now()) return token.value;
    const response = await fetcher('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env.SPOTIFY_REFRESH_TOKEN }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new UpstreamError(503);
    const data = await response.json() as { access_token?: string; expires_in?: number };
    if (!data.access_token) throw new UpstreamError(503);
    token = { value: data.access_token, expires: now() + Math.max(0, (data.expires_in || 3600) - 60) * 1000 };
    return token.value;
  }

  async function load(env: SpotifyEnv) {
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) throw new UpstreamError(503);
    if (retryAt > now()) throw new UpstreamError(429, Math.ceil((retryAt - now()) / 1000));
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetcher('https://api.spotify.com/v1/me/player/currently-playing', { headers: { Authorization: `Bearer ${await accessToken(env)}` }, signal: AbortSignal.timeout(8000) });
      if (response.status !== 401) break;
      token = undefined;
    }
    if (!response) throw new UpstreamError(503);
    if (response.status === 429) {
      const seconds = Math.max(1, Number(response.headers.get('Retry-After')) || 30);
      retryAt = now() + seconds * 1000;
      throw new UpstreamError(429, seconds);
    }
    if (response.status === 204) return { status: 'idle', fetchedAt: now() };
    if (!response.ok) throw new UpstreamError(503);
    const data = await response.json() as {
      is_playing: boolean; progress_ms?: number; currently_playing_type?: string;
      device?: { is_private_session?: boolean };
      item?: { type: string; name: string; duration_ms: number; artists?: { name: string }[]; album?: { images?: { url: string }[] }; external_urls?: { spotify?: string } };
    };
    const item = data.item;
    if (!item || item.type !== 'track' || data.device?.is_private_session) return { status: 'idle', fetchedAt: now() };
    return {
      status: data.is_playing ? 'playing' : 'paused', title: item.name,
      artist: item.artists?.map(artist => artist.name).join(', ') || 'Unknown artist',
      artwork: item.album?.images?.[0]?.url || '', url: item.external_urls?.spotify || '',
      durationMs: item.duration_ms, progressMs: data.progress_ms || 0, fetchedAt: now(),
    };
  }

  return {
    async get(env: SpotifyEnv) {
      if (cached && cached.expires > now()) return cached.value;
      if (!pending) pending = load(env).then(value => { cached = { value, expires: now() + 15000 }; return value; }).finally(() => { pending = undefined; });
      return pending;
    },
  };
}
