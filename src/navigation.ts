export type Page = 'home' | 'board';

export function pageForKey(event: Pick<KeyboardEvent, 'key' | 'repeat' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>, target: EventTarget | null): Page | null {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (target instanceof Element && target.closest('input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="slider"], [role="textbox"]')) return null;
  const key = event.key.toLowerCase();
  if (['arrowright', 'arrowdown', 'd', 's'].includes(key)) return 'board';
  if (['arrowleft', 'arrowup', 'a', 'w'].includes(key)) return 'home';
  return null;
}
