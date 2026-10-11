export type Page = 'home' | 'board';

export function pageForKey(event: Pick<KeyboardEvent, 'key' | 'repeat' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>, target: EventTarget | null, current: Page): Page | null {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (target instanceof Element && target.closest('input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="slider"], [role="textbox"]')) return null;
  const key = event.key.toLowerCase();
  if (['arrowright', 'arrowdown', 'd', 's', 'arrowleft', 'arrowup', 'a', 'w'].includes(key)) return current === 'home' ? 'board' : 'home';
  return null;
}
