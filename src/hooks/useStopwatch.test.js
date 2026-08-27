import { describe, expect, it } from 'vitest';
import { __testing, elapsedOf } from './useStopwatch.js';

const { reducer, initialState } = __testing;

const run = (actions, state = initialState) =>
  actions.reduce((current, action) => reducer(current, action), state);

describe('stopwatch reducer', () => {
  it('starts paused at zero', () => {
    expect(elapsedOf(initialState, 5_000)).toBe(0);
    expect(initialState.running).toBe(false);
  });

  it('measures from the anchor rather than counting ticks', () => {
    const state = reducer(initialState, { type: 'start', at: 1_000 });
    expect(elapsedOf(state, 4_500)).toBe(3_500);
  });

  it('ignores a second start while running', () => {
    const started = reducer(initialState, { type: 'start', at: 1_000 });
    const again = reducer(started, { type: 'start', at: 9_000 });
    expect(again).toBe(started);
    expect(elapsedOf(again, 11_000)).toBe(10_000);
  });

  it('banks elapsed time on pause and does not advance while paused', () => {
    const paused = run([
      { type: 'start', at: 1_000 },
      { type: 'pause', at: 3_000 },
    ]);
    expect(elapsedOf(paused, 60_000)).toBe(2_000);
  });

  it('resumes on top of banked time', () => {
    const resumed = run([
      { type: 'start', at: 1_000 },
      { type: 'pause', at: 3_000 },
      { type: 'start', at: 10_000 },
    ]);
    expect(elapsedOf(resumed, 11_500)).toBe(3_500);
  });

  it('records laps newest first with split and total', () => {
    const state = run([
      { type: 'start', at: 0 },
      { type: 'lap', at: 1_000 },
      { type: 'lap', at: 2_500 },
    ]);
    expect(state.laps).toEqual([
      { index: 2, split: 1_500, total: 2_500 },
      { index: 1, split: 1_000, total: 1_000 },
    ]);
  });

  it('refuses a lap before the clock has moved', () => {
    const state = reducer(initialState, { type: 'lap', at: 0 });
    expect(state.laps).toHaveLength(0);
  });

  it('clears everything on reset', () => {
    const state = run([
      { type: 'start', at: 0 },
      { type: 'lap', at: 1_000 },
      { type: 'reset' },
    ]);
    expect(state).toEqual(initialState);
  });

  it('restores a saved session in the paused state', () => {
    const state = reducer(initialState, {
      type: 'restore',
      banked: 4_200,
      laps: [{ index: 1, split: 4_200, total: 4_200 }],
    });
    expect(state.running).toBe(false);
    expect(elapsedOf(state, 99_999)).toBe(4_200);
    expect(state.laps).toHaveLength(1);
  });
});
