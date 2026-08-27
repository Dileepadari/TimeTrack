import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon } from './Icons.jsx';

/** Copies `text`, then confirms in place for a moment. */
export default function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // No clipboard permission (or an insecure origin): leave the label
      // alone rather than claiming a copy that did not happen.
      setCopied(false);
    }
  };

  return (
    <button type="button" className="ghost-btn" onClick={copy} aria-live="polite">
      {copied ? <CheckIcon className="ghost-btn__icon" /> : <CopyIcon className="ghost-btn__icon" />}
      {copied ? 'Copied' : label}
    </button>
  );
}
