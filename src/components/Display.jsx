import { useEffect, useRef } from 'react';
import { describeDuration, splitDuration } from '../lib/format.js';

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const pad = (value) => String(value).padStart(2, '0');

/**
 * The running clock. Digits are written straight to the DOM from the
 * animation frame instead of through state, so a 60fps sweep costs one text
 * assignment per segment rather than a full re-render of the app.
 */
export default function Display({ subscribe, getElapsed, running, started, banked }) {
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const secondsRef = useRef(null);
  const centisRef = useRef(null);
  const ringRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    let previous = null;

    const render = (ms) => {
      const next = splitDuration(ms);
      // Only touch a node when its value actually changed. Centiseconds move
      // every frame; hours move once an hour.
      if (!previous || previous.hours !== next.hours) {
        if (hoursRef.current) hoursRef.current.textContent = pad(next.hours);
        rootRef.current?.classList.toggle('display--with-hours', next.hours > 0);
      }
      if (!previous || previous.minutes !== next.minutes) {
        if (minutesRef.current) minutesRef.current.textContent = pad(next.minutes);
      }
      if (!previous || previous.seconds !== next.seconds) {
        if (secondsRef.current) secondsRef.current.textContent = pad(next.seconds);
      }
      if (!previous || previous.centiseconds !== next.centiseconds) {
        if (centisRef.current) centisRef.current.textContent = pad(next.centiseconds);
      }
      if (ringRef.current) {
        const fraction = (ms % 60000) / 60000;
        ringRef.current.style.strokeDashoffset = String(
          CIRCUMFERENCE * (1 - fraction),
        );
      }
      previous = next;
    };

    render(getElapsed());
    return subscribe(render);
  }, [subscribe, getElapsed]);

  return (
    // `aria-live="off"` is deliberate: the digits change 60 times a second and
    // are written straight to the DOM, so announcing them would be unusable.
    // The visually hidden status below carries the same reading in words, once
    // the clock settles.
    <div
      className="display"
      ref={rootRef}
      role="timer"
      aria-live="off"
      aria-label={running ? 'Stopwatch running' : started ? 'Stopwatch paused' : 'Stopwatch ready'}
      data-running={running ? 'true' : 'false'}
    >
      <svg className="display__ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="display__ring-track" cx="50" cy="50" r={RADIUS} />
        <circle
          className="display__ring-progress"
          cx="50"
          cy="50"
          r={RADIUS}
          ref={ringRef}
          style={{
            strokeDasharray: CIRCUMFERENCE,
            strokeDashoffset: CIRCUMFERENCE,
          }}
        />
      </svg>

      <div className="display__readout">
        <span className="display__hours">
          <span className="display__segment" ref={hoursRef}>
            00
          </span>
          <span className="display__colon">:</span>
        </span>
        <span className="display__segment" ref={minutesRef}>
          00
        </span>
        <span className="display__colon">:</span>
        <span className="display__segment" ref={secondsRef}>
          00
        </span>
        <span className="display__dot">.</span>
        <span className="display__segment display__segment--small" ref={centisRef}>
          00
        </span>
      </div>

      <p className="display__status" aria-hidden="true">
        <span className="display__pip" />
        {running ? 'Running' : started ? 'Paused' : 'Ready'}
      </p>

      {/*
        Spoken only when the clock settles. While it runs this is empty, so a
        screen reader is not read a new number every frame; the moment it stops,
        it hears the time it stopped at.
      */}
      <p className="visually-hidden" role="status">
        {running ? '' : started ? `Paused at ${describeDuration(banked)}` : 'Stopwatch ready'}
      </p>
    </div>
  );
}
