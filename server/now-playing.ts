import { createSpotifyService, type SpotifyEnv, UpstreamError } from './spotify';

export function createNowPlayingHandler(service = createSpotifyService()) {
  return async (request: Request, env: SpotifyEnv): Promise<Response> => {
    const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (request.method !== 'GET') {
      headers.set('Allow', 'GET');
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers });
    }
    if (new URL(request.url).pathname !== '/api/now-playing') return Response.json({ error: 'Not found' }, { status: 404, headers });
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) {
      return Response.json({ status: 'unconfigured', fetchedAt: Date.now() }, { headers });
    }
    try {
      const data = await service.get(env);
      // Public track metadata is shared by all visitors; credentials never enter the cache.
      headers.set('Cache-Control', 'public, max-age=5');
      headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=15');
      return Response.json(data, { headers });
    } catch (error) {
      const status = error instanceof UpstreamError ? error.status : 503;
      if (status === 429) headers.set('Retry-After', String((error as UpstreamError).retryAfter));
      return Response.json({ error: 'Listening status is temporarily unavailable' }, { status, headers });
    }
  };
}
