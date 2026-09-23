/** Theme preference, persisted, with "system" meaning "let the CSS decide". */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'timetrack:theme:v1';
const MODES = ['system', 'light', 'dark'];

function readStored() {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY);
    return MODES.includes(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Three-state theme: an explicit choice stamps `data-theme` on <html>, while
 * "system" removes the attribute and lets the media query in CSS decide.
 */
export function useTheme() {
  const [mode, setMode] = useState(readStored);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage is optional; the attribute above is what actually themes.
    }
  }, [mode]);

  const cycle = useCallback(
    () => setMode((current) => MODES[(MODES.indexOf(current) + 1) % MODES.length]),
    [],
  );

  return { mode, setMode, cycle };
}

/** The cycle order, in the order the button steps through it. */
export const THEME_MODES = MODES;
