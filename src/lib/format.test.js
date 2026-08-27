import { describe, expect, it } from 'vitest';
import { describeDuration, formatDuration, lapsToCsv, splitDuration } from './format.js';

describe('splitDuration', () => {
  it('breaks a duration into units', () => {
    expect(splitDuration(3_723_456)).toEqual({
      hours: 1,
      minutes: 2,
      seconds: 3,
      centiseconds: 45,
    });
  });

  it('truncates rather than rounds, so the clock never runs ahead', () => {
    expect(splitDuration(1999).centiseconds).toBe(99);
    expect(splitDuration(1999).seconds).toBe(1);
  });

  it('clamps negatives to zero', () => {
    expect(splitDuration(-500)).toEqual({
      hours: 0,
      minutes: 0,
      seconds: 0,
      centiseconds: 0,
    });
  });
});

describe('formatDuration', () => {
  it('omits hours below the hour mark', () => {
    expect(formatDuration(65_120)).toBe('01:05.12');
  });

  it('adds hours once they are reached', () => {
    expect(formatDuration(3_600_000)).toBe('01:00:00.00');
  });

  it('can be forced wide so a column does not reflow', () => {
    expect(formatDuration(1_500, { withHours: true })).toBe('00:00:01.50');
  });
});

describe('describeDuration', () => {
  it('reads out only the units that matter', () => {
    expect(describeDuration(5_420)).toBe('5.42 seconds');
    expect(describeDuration(65_000)).toBe('1 minute 5.00 seconds');
    expect(describeDuration(7_200_000)).toBe('2 hours 0.00 seconds');
  });
});

describe('lapsToCsv', () => {
  it('emits a header and sorts oldest first', () => {
    const laps = [
      { index: 2, split: 2_000, total: 3_000 },
      { index: 1, split: 1_000, total: 1_000 },
    ];
    expect(lapsToCsv(laps).split('\n')).toEqual([
      'lap,split,total,split_ms,total_ms',
      '1,00:00:01.00,00:00:01.00,1000,1000',
      '2,00:00:02.00,00:00:03.00,2000,3000',
    ]);
  });

  it('does not mutate the source array', () => {
    const laps = [
      { index: 2, split: 2_000, total: 3_000 },
      { index: 1, split: 1_000, total: 1_000 },
    ];
    lapsToCsv(laps);
    expect(laps[0].index).toBe(2);
  });

  it('returns just the header when there are no laps', () => {
    expect(lapsToCsv([])).toBe('lap,split,total,split_ms,total_ms');
  });
});
