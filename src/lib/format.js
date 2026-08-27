/** Time formatting helpers. All durations are milliseconds. */

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/**
 * Break a duration into display units. Centiseconds are truncated, not
 * rounded, so the display never shows a value the clock has not reached yet.
 */
export function splitDuration(ms) {
  const total = Math.max(0, Math.floor(ms));
  return {
    hours: Math.floor(total / MS_PER_HOUR),
    minutes: Math.floor((total % MS_PER_HOUR) / MS_PER_MINUTE),
    seconds: Math.floor((total % MS_PER_MINUTE) / MS_PER_SECOND),
    centiseconds: Math.floor((total % MS_PER_SECOND) / 10),
  };
}

const pad = (value, width = 2) => String(value).padStart(width, '0');

/**
 * "MM:SS.cc", widening to "HH:MM:SS.cc" once an hour has passed. Pass
 * `withHours: true` to force the wide form so a column does not reflow.
 */
export function formatDuration(ms, { withHours = false } = {}) {
  const { hours, minutes, seconds, centiseconds } = splitDuration(ms);
  const body = `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
  return hours > 0 || withHours ? `${pad(hours)}:${body}` : body;
}

/** Screen-reader friendly wording for the same duration. */
export function describeDuration(ms) {
  const { hours, minutes, seconds, centiseconds } = splitDuration(ms);
  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  parts.push(`${seconds}.${pad(centiseconds)} seconds`);
  return parts.join(' ');
}

/** Laps as CSV, newest lap last, ready for a spreadsheet. */
export function lapsToCsv(laps) {
  const header = 'lap,split,total,split_ms,total_ms';
  const rows = [...laps]
    .sort((a, b) => a.index - b.index)
    .map((lap) =>
      [
        lap.index,
        formatDuration(lap.split, { withHours: true }),
        formatDuration(lap.total, { withHours: true }),
        Math.floor(lap.split),
        Math.floor(lap.total),
      ].join(','),
    );
  return [header, ...rows].join('\n');
}
