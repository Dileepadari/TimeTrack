import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react';

const STORAGE_KEY = 'timetrack:session:v1';

/**
 * The clock is derived from a monotonic timestamp, never accumulated per tick.
 * A timer that adds a fixed step on every callback drifts as soon as the page
 * is throttled or a frame is late; anchoring to `performance.now()` means a
 * missed frame costs a repaint, not accuracy.
 */
const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const initialState = {
  /** Milliseconds banked from every previous run segment. */
  banked: 0,
  /** Monotonic timestamp of the current run segment, or null when paused. */
  anchor: null,
  running: false,
  laps: [],
};

/** Elapsed time for a state, evaluated at `at`. */
export function elapsedOf(state, at = now()) {
  return state.running && state.anchor !== null
    ? state.banked + (at - state.anchor)
    : state.banked;
}

function reducer(state, action) {
  switch (action.type) {
    case 'start':
      if (state.running) return state;
      return { ...state, running: true, anchor: action.at };

    case 'pause':
      if (!state.running) return state;
      return {
        ...state,
        running: false,
        anchor: null,
        banked: elapsedOf(state, action.at),
      };

    case 'lap': {
      const total = elapsedOf(state, action.at);
      if (total <= 0) return state;
      const previous = state.laps.length > 0 ? state.laps[0].total : 0;
      const lap = { index: state.laps.length + 1, split: total - previous, total };
      // Newest first: the list reads top-down like a race result sheet.
      return { ...state, laps: [lap, ...state.laps] };
    }

    case 'reset':
      return { ...initialState };

    case 'restore':
      return { ...initialState, banked: action.banked, laps: action.laps };

    default:
      return state;
  }
}

function readSaved() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const banked = Number(parsed?.banked);
    if (!Number.isFinite(banked) || banked < 0) return null;
    const laps = Array.isArray(parsed?.laps)
      ? parsed.laps.filter(
          (lap) => Number.isFinite(lap?.split) && Number.isFinite(lap?.total),
        )
      : [];
    if (banked === 0 && laps.length === 0) return null;
    return { banked, laps };
  } catch {
    return null;
  }
}

/**
 * Stopwatch state machine plus a render loop that only runs while the clock
 * does. Returns the live elapsed time through a ref-backed subscription so the
 * display can repaint at frame rate without re-rendering the controls.
 */
export function useStopwatch() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  // Layout effects run before the passive effects and before any event or
  // animation frame that reads this, so the mirror is never stale.
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Live elapsed value, read by the display on each animation frame.
  const elapsedRef = useRef(0);
  const subscribers = useRef(new Set());
  const frameRef = useRef(0);

  const publish = useCallback((value) => {
    elapsedRef.current = value;
    for (const notify of subscribers.current) notify(value);
  }, []);

  // Restore a previous session, always paused: the wall clock cannot tell us
  // how long the tab was closed, so counting through a reload would be a lie.
  useEffect(() => {
    const saved = readSaved();
    if (saved) {
      dispatch({ type: 'restore', banked: saved.banked, laps: saved.laps });
      publish(saved.banked);
    }
  }, [publish]);

  // Persist whenever the settled value changes, and once more on the way out
  // so a refresh mid-run keeps the time that had accrued.
  useEffect(() => {
    const save = () => {
      try {
        const current = stateRef.current;
        const banked = elapsedOf(current);
        if (banked === 0 && current.laps.length === 0) {
          globalThis.localStorage?.removeItem(STORAGE_KEY);
        } else {
          globalThis.localStorage?.setItem(
            STORAGE_KEY,
            JSON.stringify({ banked, laps: current.laps }),
          );
        }
      } catch {
        // Private mode or a full quota: persistence is a convenience, not a
        // requirement, so a failure here must not break the stopwatch.
      }
    };

    save();
    globalThis.addEventListener?.('pagehide', save);
    return () => globalThis.removeEventListener?.('pagehide', save);
  }, [state]);

  // Drive the display only while running.
  useEffect(() => {
    if (!state.running) {
      publish(elapsedOf(state));
      return undefined;
    }
    const tick = () => {
      publish(elapsedOf(stateRef.current));
      frameRef.current = globalThis.requestAnimationFrame(tick);
    };
    tick();
    return () => globalThis.cancelAnimationFrame(frameRef.current);
  }, [state, publish]);

  const subscribe = useCallback((notify) => {
    subscribers.current.add(notify);
    return () => subscribers.current.delete(notify);
  }, []);

  const getElapsed = useCallback(() => elapsedRef.current, []);

  const start = useCallback(() => dispatch({ type: 'start', at: now() }), []);
  const pause = useCallback(() => dispatch({ type: 'pause', at: now() }), []);
  const lap = useCallback(() => dispatch({ type: 'lap', at: now() }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);
  const toggle = useCallback(
    () => dispatch({ type: stateRef.current.running ? 'pause' : 'start', at: now() }),
    [],
  );

  return {
    running: state.running,
    laps: state.laps,
    /**
     * The settled elapsed time, exact while paused. The live value moves every
     * frame through `subscribe`, which is right for digits and wrong for an
     * announcement, so anything spoken reads this instead.
     */
    banked: state.banked,
    /** True once the clock has moved, whether or not it is still running. */
    started: state.running || state.banked > 0,
    subscribe,
    getElapsed,
    start,
    pause,
    toggle,
    lap,
    reset,
  };
}

export const __testing = { STORAGE_KEY, reducer, initialState };
