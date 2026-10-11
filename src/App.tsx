import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { profile, projects } from './content';
import { Board } from './Board';
import { SpotifyCard } from './SpotifyCard';
import { pageForKey, type Page } from './navigation';

const getPage = (): Page => window.location.pathname.replace(/\/$/, '') === '/board' ? 'board' : 'home';

export function App() {
  const [page, setPage] = useState<Page>(getPage);
  const [direction, setDirection] = useState(1);
  const reduced = useReducedMotion();
  const main = useRef<HTMLElement>(null);
  const hasNavigated = useRef(false);
  const transitioning = useRef(false);
  const queuedPage = useRef<Page | null>(null);

  const navigate = useCallback((next: Page, push = true) => {
    if (next === page) { queuedPage.current = null; return; }
    if (transitioning.current) { queuedPage.current = next; return; }
    transitioning.current = true;
    hasNavigated.current = true;
    setDirection(next === 'board' ? 1 : -1);
    if (push) window.history.pushState({}, '', next === 'board' ? '/board/' : '/');
    setPage(next);
  }, [page]);

  useEffect(() => {
    const onPop = () => {
      // History navigation must always win, including during an animation.
      transitioning.current = false;
      queuedPage.current = null;
      hasNavigated.current = true;
      const next = getPage();
      setDirection(next === 'board' ? 1 : -1);
      setPage(next);
    };
    const onKey = (event: KeyboardEvent) => {
      const next = pageForKey(event, event.target);
      if (next && next !== page) { event.preventDefault(); navigate(next); }
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('keydown', onKey); };
  }, [navigate, page]);

  useEffect(() => {
    document.title = page === 'home' ? `${profile.name} — Style is the difference` : `The board — ${profile.name}`;
  }, [page]);

  return <>
    {page === 'home' && <div className="home-backdrop" aria-hidden="true">
      <img className="home-ascii home-ascii-upper-left" src="/art/ascii-upper-left.svg" alt="" />
      <img className="home-ascii home-ascii-lower-right" src="/art/ascii-lower-right.svg" alt="" />
    </div>}
    <div className="site-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <a className="wordmark" href="/" onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate('home'); } }}>{profile.name.toLowerCase()}<span>✳</span></a>
        <nav aria-label="Main navigation">
          {(['home', 'board'] as Page[]).map((item, index) => <a key={item} href={item === 'home' ? '/' : '/board/'} aria-current={page === item ? 'page' : undefined} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(item); } }}><span className="nav-index">0{index + 1}</span>{item === 'home' ? 'Home' : 'The board'}{page === item && <motion.span layoutId="nav-dot" className="nav-dot" />}</a>)}
        </nav>
        <a className="header-contact" href={profile.email ? `mailto:${profile.email}` : profile.github} target={profile.email ? undefined : '_blank'} rel="noreferrer">{profile.email ? 'Say hello' : 'Find me on GitHub'} <span>↗</span></a>
      </header>

      <main id="main" ref={main} tabIndex={-1}>
        <AnimatePresence mode="wait" custom={direction} initial={false} onExitComplete={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
          <motion.div key={page} custom={direction}
            variants={{ enter: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * 65 }), visible: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: reduced ? 0 : -d * 65 }) }}
            initial="enter" animate="visible" exit="exit" transition={{ duration: reduced ? 0.01 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={definition => { if (definition === 'visible') { transitioning.current = false; if (hasNavigated.current) main.current?.focus({ preventScroll: true }); const queued = queuedPage.current; queuedPage.current = null; if (queued) navigate(queued); } }}>
            {page === 'home' ? <Home onBoard={() => navigate('board')} /> : <Board />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="site-footer"><span>© {new Date().getFullYear()} {profile.name}. Always in progress.</span><span>Made with curiosity <span className="accent">✳</span></span><a href={profile.github} target="_blank" rel="noreferrer">GitHub ↗</a></footer>
      <div className="page-switcher" aria-label="Page shortcuts">
        <button aria-label="Previous page: Home" onClick={() => navigate('home')} disabled={page === 'home'}>←</button>
        <span><b>{page === 'home' ? '01' : '02'}</b><span className="switch-divider">/</span>02</span>
        <button aria-label="Next page: The board" onClick={() => navigate('board')} disabled={page === 'board'}>→</button>
        <span className="key-hint">ARROWS / WASD</span>
      </div>
    </div>
  </>;
}

function Home({ onBoard }: { onBoard: () => void }) {
  const hero = useRef<HTMLElement>(null);
  return <>
    <section className="hero" ref={hero}>
      <div className="eyebrow"><span className="status-dot" /> A PERSONAL SPACE ON THE INTERNET</div>
      <h1>Style is the <span className="serif">difference,</span>{' '}<br />a way of doing,{' '}<br />a way of being <span className="serif">done.</span><span className="hero-star" aria-hidden="true">✳</span></h1>
      <div className="hero-bottom"><p>Hey, I’m {profile.name}.<br />{profile.intro}</p><a className="round-link" href="#selected-work" aria-label="Explore selected work">↓</a></div>
      <SpotifyCard constraints={hero} />
      <span className="margin-note">OPEN TO THE UNEXPECTED.</span>
    </section>

    <section className="work-section" id="selected-work">
      <div className="section-heading"><div><span className="eyebrow">01 / EXPLORATIONS</span><h2>On the <span className="serif">workbench.</span></h2></div><span className="section-note">A FEW IDEAS TAKING SHAPE ↙</span></div>
      <div className="project-grid">{projects.map((project, index) => <article className="project" key={project.title}>
        <div className="project-image"><img src={project.image} alt={project.title + ' — starter artwork'} loading="lazy" />{project.sample && <span className="sample-label">CONCEPT PREVIEW</span>}{project.url && <a className="project-open" href={project.url} target="_blank" rel="noreferrer" aria-label={`Open ${project.title}`}>↗</a>}</div>
        <div className="project-meta"><h3>{project.title}</h3><span>0{index + 1} / {project.kind}</span></div><p>{project.description}</p>
      </article>)}</div>
    </section>

    <section className="board-teaser"><span className="eyebrow">02 / AN OPEN TAB IN MY BRAIN</span><div><h2>Good things<br />are worth <span className="serif">keeping.</span></h2><button className="pill-link" onClick={onBoard}>Explore the board <span>↗</span></button></div><p>A place for visual rabbit holes, interesting shapes,<br />and things that make me look twice.</p><span className="teaser-star" aria-hidden="true">✳</span></section>
  </>;
}
