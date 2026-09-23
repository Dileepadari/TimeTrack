/**
 * The global shortcuts must not take a key the focused control already owns.
 *
 * Every control here is a real `<button>`, so the browser activates it on Space
 * and Enter. The global `Space = start/pause` binding used to run first and
 * `preventDefault` swallowed the activation, which meant tabbing to Reset and
 * pressing Space started the clock instead of resetting it. Each button was
 * unreachable by keyboard, on a page whose own hint list tells you to use keys.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

async function runBriefly(user) {
  await user.click(screen.getByRole('button', { name: /start/i }));
  await new Promise((resolve) => setTimeout(resolve, 60));
}

describe('keyboard shortcuts and focused controls', () => {
  it('lets Space activate the focused button rather than toggling the clock', async () => {
    const user = userEvent.setup();
    render(<App />);

    await runBriefly(user);
    await user.click(screen.getByRole('button', { name: /pause/i }));

    screen.getByRole('button', { name: /reset/i }).focus();
    await user.keyboard(' ');

    // Reset, not start.
    expect(screen.getByRole('timer')).toHaveAccessibleName('Stopwatch ready');
  });

  it('lets Enter activate the focused button too', async () => {
    const user = userEvent.setup();
    render(<App />);

    await runBriefly(user);
    await user.click(screen.getByRole('button', { name: /pause/i }));

    screen.getByRole('button', { name: /reset/i }).focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('timer')).toHaveAccessibleName('Stopwatch ready');
  });

  it('still toggles with Space when nothing is focused', async () => {
    const user = userEvent.setup();
    render(<App />);

    document.body.focus();
    await user.keyboard(' ');

    expect(screen.getByRole('timer')).toHaveAccessibleName('Stopwatch running');
  });

  it('still takes a letter shortcut while a button has focus', async () => {
    const user = userEvent.setup();
    render(<App />);

    await runBriefly(user);
    // L is not a key any button activates on, so the global binding keeps it.
    screen.getByRole('button', { name: /pause/i }).focus();
    await user.keyboard('l');

    expect(screen.getByRole('button', { name: /copy csv/i })).toBeInTheDocument();
  });

  it('ignores shortcuts while the user is typing', async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="scratch" />
        <App />
      </>,
    );

    await user.click(screen.getByLabelText('scratch'));
    await user.keyboard(' ');

    expect(screen.getByRole('timer')).toHaveAccessibleName('Stopwatch ready');
  });
});
