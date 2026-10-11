import { describe, expect, it } from 'vitest';
import { hasTrack, isLive, parsePlayback, playbackProgress, restorePlayback, retainPlayback, serializePlayback, type TrackPlayback } from '../src/spotify-playback';

const track: TrackPlayback = { status: 'playing', title: 'Example', artist: 'Artist', durationMs: 180000, progressMs: 24000, fetchedAt: 1000, artwork: 'https://example.com/cover.jpg', url: 'https://open.spotify.com/track/example' };

describe('retained Spotify playback', () => {
  it.each(['idle', 'error', 'unconfigured'] as const)('keeps the last track and freezes progress on %s', status => {
    const retained = retainPlayback(track, { status, fetchedAt: 21000 }, 21000);
    expect(retained).toMatchObject({ ...track, status: 'last-seen', progressMs: 44000 });
    expect(isLive(retained, 21000)).toBe(false);
    expect(hasTrack(retained) && playbackProgress(retained, 90000)).toBe(44000);
    expect(retainPlayback(retained, { status, fetchedAt: 90000 }, 90000)).toEqual(retained);
  });

  it('keeps paused progress exact and replaces retained metadata with a new confirmed track', () => {
    const paused = { ...track, status: 'paused' as const, progressMs: 35000 };
    expect(retainPlayback(track, paused, 21000)).toEqual(paused);
    expect(playbackProgress(paused, 90000)).toBe(35000);
    const retained = retainPlayback(paused, { status: 'idle', fetchedAt: 21000 }, 21000);
    const next = { ...track, title: 'Next track', progressMs: 0, fetchedAt: 91000 };
    expect(retainPlayback(retained, next, 91000)).toEqual(next);
  });

  it('restores a saved track without claiming it is live or advancing its progress', () => {
    const restored = restorePlayback(serializePlayback(track, 11000))!;
    expect(restored).toMatchObject({ ...track, status: 'last-seen', progressMs: 34000 });
    expect(playbackProgress(restored, 999999)).toBe(34000);
    expect(isLive(restored, 11000)).toBe(false);
  });

  it('caps elapsed time and progress without jumping backwards when a response goes stale', () => {
    expect(playbackProgress(track, 60000)).toBe(83000);
    expect(playbackProgress(track, 61000)).toBe(84000);
    expect(playbackProgress(track, 999999)).toBe(84000);
    expect(isLive(track, 61000)).toBe(false);
    expect(playbackProgress({ ...track, progressMs: 179000 }, 21000)).toBe(180000);
  });

  it('ignores missing, corrupt, incomplete, and invalid saved data', () => {
    for (const value of [null, '', '{broken', 'null', '[]', JSON.stringify({ ...track, durationMs: -1 }), JSON.stringify({ ...track, title: '' }), JSON.stringify({ status: 'idle', fetchedAt: 1000 })]) {
      expect(restorePlayback(value)).toBeNull();
    }
    expect(() => parsePlayback({ ...track, status: 'last-seen' })).toThrow();
    expect(() => parsePlayback({ ...track, progressMs: Infinity })).toThrow();
  });

  it('retains honest empty states until a real track has been observed', () => {
    expect(retainPlayback({ status: 'loading', fetchedAt: 0 }, { status: 'error', fetchedAt: 1000 }, 1000)).toEqual({ status: 'error', fetchedAt: 1000 });
  });

  it('stores only valid track metadata and safe external links', () => {
    expect(parsePlayback({ ...track, secret: 'discard', progressMs: 999999, artwork: 'javascript:alert(1)', url: 'https://open.spotify.com.example.com/track' })).toEqual({ ...track, progressMs: track.durationMs, artwork: undefined, url: undefined });
  });
});
