import { FlagIcon, PauseIcon, PlayIcon, ResetIcon } from './Icons.jsx';

/**
 * Start/Pause is the primary action and never moves or changes size, so the
 * button stays under the same thumb across every state.
 */
export default function Controls({ running, started, onToggle, onLap, onReset }) {
  const primaryLabel = running ? 'Pause' : started ? 'Resume' : 'Start';

  return (
    <div className="controls">
      <button
        type="button"
        className="btn btn--secondary"
        onClick={onReset}
        disabled={!started}
        aria-keyshortcuts="R"
      >
        <ResetIcon className="btn__icon" />
        Reset
      </button>

      <button
        type="button"
        className={`btn btn--primary ${running ? 'btn--running' : ''}`}
        onClick={onToggle}
        aria-keyshortcuts="Space"
      >
        {running ? <PauseIcon className="btn__icon" /> : <PlayIcon className="btn__icon" />}
        {primaryLabel}
      </button>

      <button
        type="button"
        className="btn btn--secondary"
        onClick={onLap}
        disabled={!running}
        aria-keyshortcuts="L"
      >
        <FlagIcon className="btn__icon" />
        Lap
      </button>
    </div>
  );
}
