/**
 * What assistive technology is actually told.
 *
 * Before these tests the app had `describeDuration` in `lib/format.js`,
 * documented as "screen-reader friendly wording" and fully unit tested, and
 * **nothing called it**. The timer carried `aria-live="off"` with no accessible
 * name, so its whole text content read as `00:00:00.14Paused` and was never
 * announced anyway. A lap produced no announcement at all.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

/** Every `role="status"` region, which is what a screen reader will read out. */
function announcements(container) {
  return [...container.querySelectorAll('[role="status"]')]
    .map((node) => node.textContent.trim())
    .filter(Boolean);
}

async function runFor(user, ms) {
  await user.click(screen.getByRole('button', { name: /start/i }));
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe('the timer is reachable without sight', () => {
  it('has an accessible name that tracks its state', async () => {
    const user = userEvent.setup();
    render(<App />);
    const timer = screen.getByRole('timer');

    expect(timer).toHaveAccessibleName('Stopwatch ready');

    await runFor(user, 60);
    expect(timer).toHaveAccessibleName('Stopwatch running');

    await user.click(screen.getByRole('button', { name: /pause/i }));
    expect(timer).toHaveAccessibleName('Stopwatch paused');
  });

  it('never announces the running digits', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await runFor(user, 80);

    // 60 announcements a second would make the app unusable with a reader on,
    // so while it runs the status is empty on purpose.
    expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off');
    expect(announcements(container)).not.toContainEqual(
      expect.stringMatching(/Paused at/),
    );
  });

  it('speaks the time in words the moment the clock stops', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await runFor(user, 120);
    await user.click(screen.getByRole('button', { name: /pause/i }));

    // Words, not "00:00:00.12": seconds with two decimals, per describeDuration.
    expect(announcements(container)).toContainEqual(
      expect.stringMatching(/^Paused at \d+\.\d{2} seconds$/),
    );
  });

  it('announces a lap, which otherwise has no audible feedback', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await runFor(user, 60);
    await user.click(screen.getByRole('button', { name: /^lap$/i }));

    expect(announcements(container)).toContainEqual(
      expect.stringMatching(/^Lap 1, split .* seconds, total .* seconds$/),
    );
  });

  it('goes back to ready after a reset', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await runFor(user, 60);
    await user.click(screen.getByRole('button', { name: /pause/i }));
    await user.click(screen.getByRole('button', { name: /reset/i }));

    expect(screen.getByRole('timer')).toHaveAccessibleName('Stopwatch ready');
    expect(announcements(container)).toContainEqual('Stopwatch ready');
  });

  it('keeps the visible status out of the accessibility tree, so it is not read twice', () => {
    const { container } = render(<App />);
    const visible = container.querySelector('.display__status');

    expect(visible).toHaveAttribute('aria-hidden', 'true');
    expect(within(screen.getByRole('timer')).queryByText('Ready')).not.toBeNull();
  });
});
