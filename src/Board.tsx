import { useEffect, useRef, useState } from 'react';
import { profile } from './content';

type PinterestWidgets = { build: (element: HTMLElement) => void };
declare global {
  interface Window { PinUtils?: PinterestWidgets }
}

let widgets: Promise<PinterestWidgets> | undefined;

function loadPinterest() {
  if (window.PinUtils) return Promise.resolve(window.PinUtils);
  if (!widgets) widgets = new Promise<PinterestWidgets>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://assets.pinterest.com/js/pinit.js';
    script.async = true;
    script.dataset.pinHover = 'false';
    script.dataset.pinSticky = 'false';
    // pinit.js loads its main script asynchronously; its load event is too early.
    const ready = window.setInterval(() => {
      if (window.PinUtils) {
        clearInterval(ready);
        clearTimeout(timeout);
        resolve(window.PinUtils);
      }
    }, 50);
    const fail = () => {
      clearInterval(ready);
      clearTimeout(timeout);
      reject(new Error('Pinterest could not be loaded'));
    };
    const timeout = window.setTimeout(fail, 10000);
    script.onerror = fail;
    document.body.append(script);
  });
  return widgets;
}

export function Board() {
  const container = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const host = container.current!;
    let disposed = false;
    void loadPinterest().then(pinterest => {
      if (disposed) return;
      // Pinterest owns this subtree so its DOM replacements do not conflict with React.
      const anchor = document.createElement('a');
      anchor.href = profile.pinterest;
      anchor.dataset.pinDo = 'embedBoard';
      anchor.dataset.pinScaleHeight = '600';
      anchor.dataset.pinScaleWidth = '100';
      anchor.textContent = 'View Retro futuristic fashion on Pinterest';
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      host.replaceChildren(anchor);
      pinterest.build(host);
    }).catch(() => { if (!disposed) setUnavailable(true); });
    return () => { disposed = true; };
  }, []);

  return <section className="board-page">
    <div className="eyebrow"><span className="status-dot" /> A COLLECTION, NEVER COMPLETE</div>
    <div className="board-heading"><h1>The <span className="serif">board.</span><span className="accent">*</span></h1><p>A few things that caught my eye.<br />Saved on Pinterest, collected here.</p></div>
    <section className={`pinterest-panel${unavailable ? ' is-unavailable' : ''}`} aria-labelledby="collection-title">
      <div className="board-toolbar"><span className="board-label"><span className="status-dot" aria-hidden="true" /> SAVED ON PINTEREST</span><a className="board-link" href={profile.pinterest} target="_blank" rel="noreferrer">Open board on Pinterest ↗</a></div>
      <div className="pinterest-panel-body">
        <div className="pinterest-intro"><span className="pinterest-mark" aria-hidden="true">✳</span><div><h2 id="collection-title">Retro futuristic fashion</h2><p>An evolving collection of shapes, textures, and silhouettes.</p></div></div>
        <div className="pinterest-stage"><div className="pinterest-board" ref={container} aria-label="Retro futuristic fashion Pinterest board" /></div>
        <p className="pinterest-help" role={unavailable ? 'status' : undefined}>{unavailable ? 'The Pinterest preview is unavailable. ' : 'If the preview doesn’t appear, '}<a href={profile.pinterest} target="_blank" rel="noreferrer">view the board on Pinterest ↗</a></p>
      </div>
    </section>
    <div className="board-end"><span className="accent" aria-hidden="true">✳</span><p>There’s always something else to find.</p></div>
  </section>;
}
