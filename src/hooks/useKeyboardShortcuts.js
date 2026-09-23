/** Document-level single-key shortcuts, and the cases where they stand aside. */

import { useEffect, useLayoutEffect, useRef } from 'react';

const EDITABLE = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

const isTyping = (target) =>
  target instanceof HTMLElement &&
  (EDITABLE.has(target.tagName) || target.isContentEditable);

/** Elements the browser already activates on Space or Enter. */
const NATIVELY_ACTIVATED = new Set(['BUTTON', 'A', 'SUMMARY', 'OPTION']);

/**
 * True when the focused element owns this key press already.
 *
 * Without this, tabbing to Reset and pressing Space started the clock instead
 * of resetting it: the global binding ran and `preventDefault` swallowed the
 * button's own activation, so every control was unreachable by keyboard even
 * though each one is a real `<button>`.
 */
const focusOwnsKey = (target, key) =>
  (key === 'space' || key === 'enter') &&
  target instanceof HTMLElement &&
  (NATIVELY_ACTIVATED.has(target.tagName) || target.getAttribute('role') === 'button');

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
      if (focusOwnsKey(event.target, key)) return;

      const handler = bindingsRef.current[key];
      if (!handler) return;

      // Space scrolls the page by default, and nothing is focused that wanted
      // it, because focusOwnsKey has already bowed out if something did.
      event.preventDefault();
      handler(event);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
