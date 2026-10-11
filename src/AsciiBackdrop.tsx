import { useLayoutEffect, useRef, useState } from 'react';
import leftArt from '../ascii-art.txt?raw';
import rightArt from '../ascii-art (1).txt?raw';

function AsciiPanel({ art, side }: { art: string; side: 'left' | 'right' }) {
  const panel = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLPreElement>(null);
  const [fontSize, setFontSize] = useState(0);
  // Remove empty outer rows, preserving all spacing within the artwork.
  const lines = art.replace(/\r/g, '').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const drawing = lines.map(line => line.trimEnd()).join('\n');

  useLayoutEffect(() => {
    const host = panel.current;
    const pre = text.current;
    if (!host || !pre) return;
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return;
    context.font = `10px ${getComputedStyle(pre).fontFamily}`;
    const rows = drawing.split('\n');
    const width = Math.max(...rows.map(row => context.measureText(row).width));
    const height = rows.length * 10;
    // Size the real text instead of transforming it, so native selection stays accurate.
    const resize = () => setFontSize(10 * Math.min(host.clientWidth / width, host.clientHeight / height));
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    return () => observer.disconnect();
  }, [drawing]);

  return <div ref={panel} className={`ascii-panel ascii-panel-${side}`}>
    <pre ref={text} className="home-ascii" style={{ fontSize }}>{drawing}</pre>
  </div>;
}

export function AsciiBackdrop() {
  return <div className="home-backdrop" aria-hidden="true">
    <AsciiPanel art={leftArt} side="left" />
    <AsciiPanel art={rightArt} side="right" />
  </div>;
}
