import { describe, expect, it, vi } from 'vitest';
import { createSpotifyService, type SpotifyEnv } from '../server/spotify';
import { createNowPlayingHandler } from '../server/now-playing';
import api from '../api/now-playing';

const env: SpotifyEnv = { SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret', SPOTIFY_REFRESH_TOKEN: 'refresh' };
const song = { is_playing: true, progress_ms: 24000, item: { type: 'track', name: 'Example', duration_ms: 180000, artists: [{ name: 'Artist' }], album: { images: [{ url: 'https://example.com/cover.jpg' }] }, external_urls: { spotify: 'https://open.spotify.com/track/example' } }, private_secret: 'never-return-this' };

describe('Spotify proxy', () => {
  it('shares requests, sanitizes metadata, refreshes playback while reusing a valid access token', async () => {
    let time = 1000;
    const upstream = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ access_token: 'private-token', expires_in: 3600 })).mockResolvedValueOnce(Response.json(song)).mockResolvedValueOnce(Response.json({ ...song, is_playing: false }));
    const service = createSpotifyService(upstream, () => time);
    const [first, second] = await Promise.all([service.get(env), service.get(env)]);
    expect(first).toEqual(second);
    expect(first).toMatchObject({ status: 'playing', title: 'Example', progressMs: 24000, fetchedAt: 1000 });
    expect(JSON.stringify(first)).not.toContain('private');
    expect(upstream).toHaveBeenCalledTimes(2);
    await service.get(env);
    expect(upstream).toHaveBeenCalledTimes(2);
    time += 16000;
    expect(await service.get(env)).toMatchObject({ status: 'paused' });
    expect(upstream).toHaveBeenCalledTimes(3);
  });
  it.each([null, { item: null }, { item: { type: 'episode' } }, { ...song, device: { is_private_session: true } }])('handles no song, unsupported content, and private sessions', async data => {
    const upstream = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ access_token: 'token' })).mockResolvedValueOnce(data === null ? new Response(null, { status: 204 }) : Response.json(data));
    expect(await createSpotifyService(upstream).get(env)).toMatchObject({ status: 'idle' });
  });
  it('honors rate-limit backoff without repeatedly calling Spotify', async () => {
    const upstream = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ access_token: 'token' })).mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'Retry-After': '60' } }));
    const service = createSpotifyService(upstream, () => 1000);
    await expect(service.get(env)).rejects.toMatchObject({ status: 429, retryAfter: 60 });
    await expect(service.get(env)).rejects.toMatchObject({ status: 429 });
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it('recovers once after a rejected token', async () => {
    const upstream = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ access_token: 'old' })).mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(Response.json({ access_token: 'new' })).mockResolvedValueOnce(Response.json(song));
    expect(await createSpotifyService(upstream).get(env)).toMatchObject({ status: 'playing' });
    expect(upstream).toHaveBeenCalledTimes(4);
  });
  it('rejects unsupported methods and shows an unconfigured state without credentials', async () => {
    const handle = createNowPlayingHandler();
    expect((await handle(new Request('https://portfolio.vercel.app/api/now-playing', { method: 'POST' }), env)).status).toBe(405);
    const missing = await handle(new Request('https://portfolio.vercel.app/api/now-playing'), { ...env, SPOTIFY_REFRESH_TOKEN: '' });
    expect(missing.status).toBe(200);
    expect(missing.headers.get('Cache-Control')).toBe('no-store');
    expect(await missing.json()).toMatchObject({ status: 'unconfigured' });
  });
  it('caches only successful public metadata at Vercel and keeps failures uncached', async () => {
    const handle = createNowPlayingHandler({ get: vi.fn().mockResolvedValue({ status: 'playing', title: 'Example' }).mockRejectedValueOnce(new Error('private-secret-detail')) });
    const request = new Request('https://portfolio.vercel.app/api/now-playing');
    const failure = await handle(request, env);
    expect(failure.status).toBe(503);
    expect(failure.headers.get('Cache-Control')).toBe('no-store');
    expect(await failure.text()).not.toContain('private-secret');
    const success = await handle(request, env);
    expect(success.headers.get('Vercel-CDN-Cache-Control')).toBe('public, s-maxage=15');
    expect(success.headers.get('Cache-Control')).toBe('public, max-age=5');
  });
  it('exports a Vercel Web Request handler without exposing environment values', async () => {
    vi.stubEnv('SPOTIFY_REFRESH_TOKEN', '');
    try {
      const response = await api.fetch(new Request('https://portfolio.vercel.app/api/now-playing'));
      expect(await response.json()).toMatchObject({ status: 'unconfigured' });
    } finally { vi.unstubAllEnvs(); }
  });
});
