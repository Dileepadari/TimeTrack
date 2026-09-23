import { useMemo } from 'react';
import Controls from './components/Controls.jsx';
import Display from './components/Display.jsx';
import LapList from './components/LapList.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { useStopwatch } from './hooks/useStopwatch.js';
import { useTheme } from './hooks/useTheme.js';
import { lapsToCsv } from './lib/format.js';
import logoMark from './assets/logo-mark.png';

/**
 * The whole app: one clock, its controls, and the lap list beside them.
 *
 * The keyboard bindings live here rather than in the controls, so the
 * shortcuts work wherever focus happens to be on the page.
 */
export default function App() {
  const stopwatch = useStopwatch();
  const { mode, cycle } = useTheme();

  useKeyboardShortcuts({
    space: stopwatch.toggle,
    l: () => stopwatch.running && stopwatch.lap(),
    r: () => stopwatch.started && stopwatch.reset(),
  });

  const csv = useMemo(() => lapsToCsv(stopwatch.laps), [stopwatch.laps]);

  return (
    <div className="app">
      <header className="app__bar">
        <div className="brand">
          <span className="brand__badge">
            <img className="brand__mark logo-mono" src={logoMark} alt="" width="20" height="20" />
          </span>
          <span className="brand__name">TimeTrack</span>
        </div>
        <ThemeToggle mode={mode} onCycle={cycle} />
      </header>

      <main className="app__main">
        <section className="panel panel--clock">
          <Display
            subscribe={stopwatch.subscribe}
            getElapsed={stopwatch.getElapsed}
            running={stopwatch.running}
            started={stopwatch.started}
            banked={stopwatch.banked}
          />
          <Controls
            running={stopwatch.running}
            started={stopwatch.started}
            onToggle={stopwatch.toggle}
            onLap={stopwatch.lap}
            onReset={stopwatch.reset}
          />
          <ul className="hints">
            <li>
              <kbd>Space</kbd> start / pause
            </li>
            <li>
              <kbd>L</kbd> lap
            </li>
            <li>
              <kbd>R</kbd> reset
            </li>
          </ul>
        </section>

        <div className="panel panel--laps">
          <LapList laps={stopwatch.laps} csv={csv} />
        </div>
      </main>

      <footer className="app__foot">
        Times are measured from a monotonic clock, so the reading stays accurate even
        when the tab is throttled.
      </footer>
    </div>
  );
}
