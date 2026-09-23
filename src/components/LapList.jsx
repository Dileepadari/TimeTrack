import { useMemo } from 'react';
import { describeDuration, formatDuration } from '../lib/format.js';
import CopyButton from './CopyButton.jsx';

/**
 * Laps arrive newest first. Best and worst are only marked once there are at
 * least two of them, because with one lap the label says nothing.
 */
export default function LapList({ laps, csv }) {
  const { best, worst, average, longest } = useMemo(() => {
    if (laps.length === 0) {
      return { best: null, worst: null, average: 0, longest: 0 };
    }
    const splits = laps.map((lap) => lap.split);
    const max = Math.max(...splits);
    const min = Math.min(...splits);
    return {
      best: laps.length > 1 ? min : null,
      worst: laps.length > 1 ? max : null,
      average: splits.reduce((sum, value) => sum + value, 0) / splits.length,
      longest: max,
    };
  }, [laps]);

  const anyHours = laps.some((lap) => lap.total >= 3600000);
  // Laps arrive newest first, so the head of the list is the one just marked.
  const latest = laps[0];

  return (
    <section className="laps" aria-labelledby="laps-heading">
      {/*
        A lap is a deliberate act with no other feedback: the row appears in a
        list a screen reader user is probably not focused on. Announcing the
        newest one is the only way they hear that the key press landed.
      */}
      <p className="visually-hidden" role="status">
        {latest
          ? `Lap ${latest.index}, split ${describeDuration(latest.split)}, total ${describeDuration(latest.total)}`
          : ''}
      </p>
      <header className="laps__header">
        <h2 id="laps-heading" className="laps__title">
          Laps
          {laps.length > 0 && <span className="laps__count">{laps.length}</span>}
        </h2>
        {laps.length > 0 && <CopyButton text={csv} label="Copy CSV" />}
      </header>

      {laps.length === 0 ? (
        <p className="laps__empty">
          No laps yet. Hit <kbd>L</kbd> while the clock runs to mark one.
        </p>
      ) : (
        <>
          {laps.length > 1 && (
            <dl className="laps__summary">
              <div>
                <dt>Best</dt>
                <dd className="is-best">{formatDuration(best, { withHours: anyHours })}</dd>
              </div>
              <div>
                <dt>Average</dt>
                <dd>{formatDuration(average, { withHours: anyHours })}</dd>
              </div>
              <div>
                <dt>Worst</dt>
                <dd className="is-worst">{formatDuration(worst, { withHours: anyHours })}</dd>
              </div>
            </dl>
          )}

          <div className="laps__scroll">
            <table className="laps__table">
              <caption className="visually-hidden">
                Lap times, most recent first. Split is the time since the previous lap.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Lap</th>
                  <th scope="col">Split</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {laps.map((lap) => {
                  const isBest = best !== null && lap.split === best;
                  const isWorst = worst !== null && lap.split === worst && !isBest;
                  return (
                    <tr
                      key={lap.index}
                      className={isBest ? 'is-best' : isWorst ? 'is-worst' : undefined}
                    >
                      <th scope="row">
                        <span className="laps__index">{lap.index}</span>
                      </th>
                      <td className="laps__split">
                        <span
                          className="laps__bar"
                          style={{
                            '--fill': longest > 0 ? `${(lap.split / longest) * 100}%` : '0%',
                          }}
                          aria-hidden="true"
                        />
                        <span className="laps__value">
                          {formatDuration(lap.split, { withHours: anyHours })}
                        </span>
                        {isBest && <span className="laps__tag">best</span>}
                        {isWorst && <span className="laps__tag">worst</span>}
                      </td>
                      <td className="laps__total">
                        {formatDuration(lap.total, { withHours: anyHours })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
