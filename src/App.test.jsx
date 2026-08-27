import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

/** Move both the fake clock and performance.now() forward together. */
async function advance(ms) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

const readout = () => screen.getByRole('timer').textContent;

describe('TimeTrack', () => {
  let user;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(0);
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  });

  it('starts at zero and ready', () => {
    render(<App />);
    expect(readout()).toContain('00:00.00');
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^start$/i })).toBeInTheDocument();
  });

  it('counts up once started', async () => {
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await advance(2_500);
    expect(readout()).toContain('00:02.5');
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('holds the reading while paused and continues on resume', async () => {
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await advance(1_000);
    await user.click(screen.getByRole('button', { name: /^pause$/i }));

    const held = readout();
    await advance(5_000);
    expect(readout()).toBe(held);
    expect(screen.getByText('Paused')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^resume$/i }));
    await advance(1_000);
    expect(readout()).toContain('00:02.0');
  });

  it('records laps with their splits, newest first', async () => {
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await advance(1_000);
    await user.click(screen.getByRole('button', { name: /^lap$/i }));
    await advance(2_000);
    await user.click(screen.getByRole('button', { name: /^lap$/i }));

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('2');
    expect(rows[0]).toHaveTextContent('00:02.0');
    expect(rows[0]).toHaveTextContent('00:03.0');
    expect(rows[1]).toHaveTextContent('00:01.0');
  });

  it('marks the fastest and slowest lap once there are two', async () => {
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await advance(3_000);
    await user.click(screen.getByRole('button', { name: /^lap$/i }));
    await advance(1_000);
    await user.click(screen.getByRole('button', { name: /^lap$/i }));

    expect(screen.getByText('best')).toBeInTheDocument();
    expect(screen.getByText('worst')).toBeInTheDocument();
    // The summary strip appears alongside the row tags.
    expect(screen.getByText('Best').nextSibling).toHaveTextContent('00:01.0');
    expect(screen.getByText('Worst').nextSibling).toHaveTextContent('00:03.0');
  });

  it('clears the clock and the laps on reset', async () => {
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await advance(1_500);
    await user.click(screen.getByRole('button', { name: /^lap$/i }));
    await user.click(screen.getByRole('button', { name: /^reset$/i }));

    expect(readout()).toContain('00:00.00');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(/no laps yet/i)).toBeInTheDocument();
  });

  it('disables Lap unless the clock is running, and Reset until it has moved', async () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /^lap$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^reset$/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /^start$/i }));
    expect(screen.getByRole('button', { name: /^lap$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^reset$/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /^pause$/i }));
    expect(screen.getByRole('button', { name: /^lap$/i })).toBeDisabled();
  });

  it('drives the clock from the keyboard', async () => {
    render(<App />);
    await user.keyboard(' ');
    await advance(1_000);
    expect(screen.getByText('Running')).toBeInTheDocument();

    await user.keyboard('l');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);

    await user.keyboard(' ');
    expect(screen.getByText('Paused')).toBeInTheDocument();

    await user.keyboard('r');
    expect(readout()).toContain('00:00.00');
  });

  it('restores a previous session, paused', async () => {
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await advance(4_000);
    await user.click(screen.getByRole('button', { name: /^lap$/i }));
    await user.click(screen.getByRole('button', { name: /^pause$/i }));
    unmount();

    render(<App />);
    expect(readout()).toContain('00:04.0');
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
  });

  it('widens the readout to hours only once an hour has passed', () => {
    localStorage.setItem(
      'timetrack:session:v1',
      JSON.stringify({ banked: 3_723_450, laps: [] }),
    );
    render(<App />);
    expect(readout()).toContain('01:02:03');
    expect(screen.getByRole('timer')).toHaveClass('display--with-hours');
  });

  it('cycles the theme between system, light and dark', async () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: /theme/i });
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);

    await user.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await user.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    await user.click(toggle);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
