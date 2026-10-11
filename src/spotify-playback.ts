export type TrackPlayback = {
  status: 'playing' | 'paused' | 'last-seen';
  title: string;
  artist: string;
  artwork?: string;
  url?: string;
  durationMs: number;
  progressMs: number;
  fetchedAt: number;
};
export type PlaybackState = TrackPlayback | { status: 'idle' | 'unconfigured' | 'loading' | 'error'; fetchedAt: number };
export const playbackCacheKey = (endpoint: string) => `spotify:last-track:v1:${endpoint}`;
export const hasTrack = (state: PlaybackState): state is TrackPlayback => 'title' in state;
export const isLive = (state: PlaybackState, now: number) => state.status === 'playing' && now - state.fetchedAt < 60000;

export function playbackProgress(track: TrackPlayback, now: number) {
  // Stop estimating after a minute without confirmation; never jump back when stale.
  const elapsed = track.status === 'playing' ? Math.min(60000, Math.max(0, now - track.fetchedAt)) : 0;
  return Math.min(track.durationMs, track.progressMs + elapsed);
}

export function parsePlayback(value: unknown, allowSaved = false): PlaybackState {
  if (!value || typeof value !== 'object') throw new Error('Invalid playback');
  const data = value as Record<string, unknown>;
  if (typeof data.fetchedAt !== 'number' || !Number.isFinite(data.fetchedAt) || data.fetchedAt < 0) throw new Error('Invalid timestamp');
  if (data.status === 'idle' || data.status === 'unconfigured') return { status: data.status, fetchedAt: data.fetchedAt };
  if (data.status !== 'playing' && data.status !== 'paused' && !(allowSaved && data.status === 'last-seen')) throw new Error('Invalid status');
  if (typeof data.title !== 'string' || !data.title.trim() || typeof data.artist !== 'string' || !data.artist.trim()
    || typeof data.durationMs !== 'number' || !Number.isFinite(data.durationMs) || data.durationMs <= 0
    || typeof data.progressMs !== 'number' || !Number.isFinite(data.progressMs) || data.progressMs < 0) throw new Error('Invalid track');
  return {
    status: data.status, title: data.title, artist: data.artist,
    artwork: typeof data.artwork === 'string' && /^https:\/\//.test(data.artwork) ? data.artwork : undefined,
    url: typeof data.url === 'string' && /^https:\/\/open\.spotify\.com\//.test(data.url) ? data.url : undefined,
    durationMs: data.durationMs, progressMs: Math.min(data.progressMs, data.durationMs), fetchedAt: data.fetchedAt,
  };
}

export function retainPlayback(previous: PlaybackState, incoming: PlaybackState, now: number): PlaybackState {
  if (hasTrack(incoming) || !hasTrack(previous)) return incoming;
  return { ...previous, status: 'last-seen', progressMs: playbackProgress(previous, now) };
}

export function restorePlayback(raw: string | null): TrackPlayback | null {
  try {
    const saved = parsePlayback(JSON.parse(raw || 'null'), true);
    return hasTrack(saved) ? { ...saved, status: 'last-seen' } : null;
  } catch { return null; }
}

export function serializePlayback(track: TrackPlayback, now: number) {
  return JSON.stringify({ ...track, status: 'last-seen', progressMs: playbackProgress(track, now) });
}
