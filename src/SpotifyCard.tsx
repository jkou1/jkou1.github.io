import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { motion, useDragControls } from 'motion/react';

export type Playback = { status: 'playing' | 'paused' | 'idle'; title?: string; artist?: string; artwork?: string; url?: string; durationMs?: number; progressMs?: number; fetchedAt: number };
type State = Playback | { status: 'unconfigured' | 'loading' | 'error'; fetchedAt: number };
const format = (ms: number) => `${Math.floor(ms / 60000)}:${Math.floor(ms / 1000 % 60).toString().padStart(2, '0')}`;

export function SpotifyCard({ constraints }: { constraints: RefObject<HTMLElement | null> }) {
  const endpoint = import.meta.env.VITE_SPOTIFY_ENDPOINT || '/api/now-playing';
  const [state, setState] = useState<State>({ status: endpoint ? 'loading' : 'unconfigured', fetchedAt: 0 });
  const [now, setNow] = useState(Date.now());
  const [collapsed, setCollapsed] = useState(false);
  const controls = useDragControls();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!endpoint) return;
    let disposed = false;
    let controller: AbortController | undefined;
    async function refresh() {
      if (document.hidden || disposed) return;
      clearTimeout(timer.current);
      controller?.abort();
      const currentController = new AbortController();
      controller = currentController;
      const timeout = setTimeout(() => currentController.abort(), 8000);
      let delay = 20000;
      try {
        const response = await fetch(endpoint, { signal: currentController.signal });
        if (response.status === 429) delay = Math.max(20000, Math.min(300000, (Number(response.headers.get('Retry-After')) || 30) * 1000));
        if (!response.ok) throw new Error('Playback unavailable');
        const data = await response.json() as State;
        if (!['playing', 'paused', 'idle', 'unconfigured'].includes(data.status) || !Number.isFinite(data.fetchedAt)) throw new Error('Invalid playback');
        if ((data.status === 'playing' || data.status === 'paused') && (typeof data.title !== 'string' || typeof data.artist !== 'string' || !Number.isFinite(data.durationMs) || !Number.isFinite(data.progressMs))) throw new Error('Invalid track');
        if (!disposed && controller === currentController) { setState(data); setNow(Date.now()); }
      } catch { if (!disposed && controller === currentController) setState({ status: 'error', fetchedAt: Date.now() }); }
      finally { clearTimeout(timeout); if (!disposed && controller === currentController && !document.hidden) timer.current = setTimeout(refresh, delay); }
    }
    function visibility() { clearTimeout(timer.current); if (!document.hidden) void refresh(); }
    void refresh();
    document.addEventListener('visibilitychange', visibility);
    return () => { disposed = true; clearTimeout(timer.current); controller?.abort(); document.removeEventListener('visibilitychange', visibility); };
  }, [endpoint]);

  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(interval); }, []);
  const track = state.status === 'playing' || state.status === 'paused' ? state : null;
  const fresh = now - state.fetchedAt < 60000;
  const playing = state.status === 'playing' && fresh;
  const progress = track ? Math.min(track.durationMs || 0, (track.progressMs || 0) + (playing ? Math.max(0, now - track.fetchedAt) : 0)) : 0;
  const labels = { playing: fresh ? 'NOW PLAYING' : 'LAST SEEN', paused: 'ON PAUSE', idle: 'OFF THE RECORD', unconfigured: 'THE LISTENING ROOM', loading: 'TUNING IN', error: 'SIGNAL LOST' };

  return <motion.aside aria-label="Spotify listening status" className={`spotify-card ${collapsed ? 'is-collapsed' : ''}`} drag dragControls={controls} dragListener={false} dragConstraints={constraints} dragElastic={0.06} dragMomentum={false}>
    <div className="player-header"><button className="drag-handle" aria-label="Drag listening window" onPointerDown={event => controls.start(event)}><span aria-hidden="true">⠿</span> SOUNDTRACK TO MY DAY</button><button className="collapse-button" aria-label={collapsed ? 'Expand listening window' : 'Minimize listening window'} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? '+' : '−'}</button></div>
    {!collapsed && <div className="player-body"><div className="player-status"><span className={playing ? 'live-dot' : 'idle-dot'} />{labels[state.status]}<svg viewBox="0 0 24 24" className="spotify-icon" role="img" aria-label="Spotify"><circle cx="12" cy="12" r="12" fill="currentColor"/><path d="M5 9c5-2 10-1 14 1M6 12c4-1.5 8-1 12 1M7 15c3-1 6-.5 9 1" fill="none" stroke="var(--paper)" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
      <div className="track-info">{track?.artwork ? <img className="album-art" src={track.artwork} alt={`${track.title} album artwork`} /> : <div className="record-sleeve" aria-hidden="true"><div className={`vinyl ${playing ? 'spinning' : ''}`}><span /></div></div>}
        <div><h2>{track?.title || (state.status === 'loading' ? 'Finding the frequency…' : 'A moment of quiet.')}</h2><p>{track?.artist || (state.status === 'error' ? 'Listening status is unavailable.' : state.status === 'unconfigured' ? 'Live listening, coming soon.' : 'Nothing playing right now.')}</p>{track?.url && /^https:\/\/open\.spotify\.com\//.test(track.url) && <a href={track.url} target="_blank" rel="noreferrer">Open in Spotify ↗</a>}</div>
      </div>
      <div className="track-progress"><div className="progress-track"><span style={{ width: `${track?.durationMs ? progress / track.durationMs * 100 : 0}%` }} /></div><div className="time-labels"><span>{format(progress)}</span><span>{format(track?.durationMs || 0)}</span></div></div>
      <div className={`equalizer ${playing ? 'is-playing' : ''}`} aria-hidden="true">{Array.from({ length: 40 }, (_, i) => <span key={i} style={{ '--bar-height': `${12 + (Math.sin(i * 1.7) + 1) * 17 + (Math.cos(i * .4) + 1) * 9}px`, '--delay': `${-i * .19}s`, '--speed': `${.65 + i % 5 * .17}s` } as CSSProperties} />)}</div>
      <div className="frequency-labels"><span>LOW</span><span>DECORATIVE VISUALIZER</span><span>HIGH</span></div>
    </div>}
  </motion.aside>;
}
