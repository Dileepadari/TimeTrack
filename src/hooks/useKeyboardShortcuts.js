import { useEffect, useLayoutEffect, useRef } from 'react';

const EDITABLE = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

const isTyping = (target) =>
  target instanceof HTMLElement &&
  (EDITABLE.has(target.tagName) || target.isContentEditable);

/**
 * Binds single-key shortcuts on the document. Keys are matched case
 * insensitively; the map is read through a ref so callers can pass a fresh
 * object each render without rebinding the listener.
 */
export function useKeyboardShortcuts(bindings) {
  const bindingsRef = useRef(bindings);
  // Synced in a layout effect, not during render: the listener below only
  // ever reads it after the commit, so this is early enough.
  useLayoutEffect(() => {
    bindingsRef.current = bindings;
  }, [bindings]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;

      const key = event.key === ' ' ? 'space' : event.key.toLowerCase();
      const handler = bindingsRef.current[key];
      if (!handler) return;

      // Space would otherwise scroll the page or re-fire the focused button.
      event.preventDefault();
      handler(event);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
