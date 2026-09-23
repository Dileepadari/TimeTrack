import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon } from './Icons.jsx';

/**
 * Copies `text`, then reports what happened in place for a moment.
 *
 * A failure is reported rather than swallowed. The clipboard is refused on an
 * insecure origin and inside an iframe without `clipboard-write`, and this
 * button previously reset itself and said nothing at all in those cases, so the
 * click looked like it had simply not registered.
 */
export default function CopyButton({ text, label = 'Copy' }) {
  /** `null` when idle, otherwise the outcome of the last attempt. */
  const [outcome, setOutcome] = useState(null);
  const timerRef = useRef(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const announce = (next) => {
    setOutcome(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOutcome(null), next === 'failed' ? 2600 : 1600);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      announce('copied');
    } catch {
      announce('failed');
    }
  };

  const copied = outcome === 'copied';
  const failed = outcome === 'failed';

  return (
    <button
      type="button"
      className="ghost-btn"
      data-outcome={outcome ?? undefined}
      onClick={copy}
    >
      {copied ? <CheckIcon className="ghost-btn__icon" /> : <CopyIcon className="ghost-btn__icon" />}
      {copied ? 'Copied' : failed ? 'Copy blocked' : label}
      {/*
        The live region is a sibling, not the button itself: a live region on
        the control means the label change is announced on every render, and
        with `aria-live` on a button some readers also re-announce it on focus.
      */}
      <span className="visually-hidden" role="status">
        {copied ? 'Laps copied to the clipboard' : failed ? 'The browser blocked the clipboard' : ''}
      </span>
    </button>
  );
}
