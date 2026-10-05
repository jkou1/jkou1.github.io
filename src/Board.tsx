import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import pins from './board.json';
import { profile } from './content';

type Pin = typeof pins[number];
const categories = ['All', ...new Set(pins.map(pin => pin.category))];

export function Board({ onModalChange }: { onModalChange: (open: boolean) => void }) {
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<Pin | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const visible = pins.filter(pin => category === 'All' || pin.category === category);

  useEffect(() => () => onModalChange(false), [onModalChange]);
  function open(pin: Pin, button: HTMLButtonElement) { opener.current = button; onModalChange(true); setSelected(pin); }
  function close() { setSelected(null); }

  return <section className="board-page">
    <div className="eyebrow"><span className="status-dot" /> A COLLECTION, NEVER COMPLETE</div>
    <div className="board-heading"><h1>The <span className="serif">board.</span><span className="accent">*</span></h1><p>A few things that caught my eye.<br />Click a little closer. Stay a little longer.</p></div>
    <div className="board-toolbar"><div className="filters" role="group" aria-label="Filter the collection">{categories.map(item => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}{item === 'All' && <sup>{pins.length.toString().padStart(2, '0')}</sup>}</button>)}</div><span className="board-count">{visible.length.toString().padStart(2, '0')} OBJECTS / {profile.pinterest ? <a href={profile.pinterest} target="_blank" rel="noreferrer">PINTEREST ↗</a> : 'STARTER COLLECTION'}</span></div>
    <div className="pin-grid">{visible.map(pin => <motion.button layout className="pin" key={pin.id} onClick={event => open(pin, event.currentTarget)} aria-label={`Enlarge ${pin.title}`}>
      <motion.div layoutId={`pin-${pin.id}`} className="pin-art" transition={{ type: 'spring', stiffness: 250, damping: 28 }}><img src={pin.image} alt={pin.alt} loading="lazy" /><span className="pin-expand" aria-hidden="true">↗</span></motion.div>
      <span className="pin-caption"><span>{pin.title}</span><span>{pin.id}</span></span>
    </motion.button>)}</div>
    <div className="board-end"><span className="accent" aria-hidden="true">✳</span><p>There’s always something else to find.</p>{pins.some(pin => pin.sample) && <span className="sample-note">Original placeholder studies · Your collected pins will live here.</span>}</div>
    {createPortal(<AnimatePresence onExitComplete={() => { onModalChange(false); requestAnimationFrame(() => opener.current?.focus()); }}>
      {selected && <PinDialog pin={selected} onClose={close} reduced={!!reduced} />}
    </AnimatePresence>, document.body)}
  </section>;
}

function PinDialog({ pin, onClose, reduced }: { pin: Pin; onClose: () => void; reduced: boolean }) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') {
        const focusable = dialog.current?.querySelectorAll<HTMLElement>('button, a[href]');
        if (!focusable?.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); };
  }, [onClose]);

  return <motion.div className="modal-backdrop" initial={{ backgroundColor: 'rgba(24, 25, 20, 0)' }} animate={{ backgroundColor: 'rgba(24, 25, 20, 0.78)' }} exit={{ backgroundColor: 'rgba(24, 25, 20, 0)' }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="pin-title" tabIndex={-1} className="pin-dialog">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-top"><span>OBJECT {pin.id} / {pin.category.toUpperCase()}</span><button onClick={onClose} aria-label="Close enlarged image">Close <span>×</span></button></motion.div>
      <motion.div layoutId={`pin-${pin.id}`} className="expanded-art" transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 230, damping: 29 }}><img src={pin.image} alt={pin.alt} /></motion.div>
      <motion.div className="modal-caption" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><div><h2 id="pin-title">{pin.title}</h2><p>{pin.sample ? 'An original placeholder study for this collection.' : pin.category}</p></div>{pin.pinUrl && <a href={pin.pinUrl} target="_blank" rel="noreferrer">View original pin ↗</a>}</motion.div>
    </div>
  </motion.div>;
}
