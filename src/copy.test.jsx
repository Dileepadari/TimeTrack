/**
 * The copy button has to say what happened, either way.
 *
 * The clipboard is refused on an insecure origin and inside an iframe without
 * `clipboard-write`. This button used to catch that, reset itself and render
 * nothing different, so a blocked copy was indistinguishable from a click that
 * never registered.
 */

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CopyButton from './components/CopyButton.jsx';

/**
 * Install a clipboard stub.
 *
 * Call this **after** `userEvent.setup()`, which installs a stub of its own:
 * set it up first and the component calls theirs, the spy records nothing, and
 * the test fails for a reason that has nothing to do with the component.
 */
function withClipboard(impl) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: impl },
    configurable: true,
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('CopyButton', () => {
  it('confirms a copy that worked, and says so out loud', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    withClipboard(writeText);
    render(<CopyButton text="lap,split" label="Copy CSV" />);

    await user.click(screen.getByRole('button'));

    expect(writeText).toHaveBeenCalledWith('lap,split');
    expect(screen.getByRole('button')).toHaveTextContent('Copied');
    expect(screen.getByRole('status')).toHaveTextContent('Laps copied to the clipboard');
  });

  it('reports a blocked clipboard instead of looking like nothing happened', async () => {
    const user = userEvent.setup();
    withClipboard(vi.fn().mockRejectedValue(new Error('NotAllowedError')));
    render(<CopyButton text="lap,split" label="Copy CSV" />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveTextContent('Copy blocked');
    expect(screen.getByRole('status')).toHaveTextContent('The browser blocked the clipboard');
  });

  it('goes back to its label so the button stays usable', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    withClipboard(vi.fn().mockResolvedValue(undefined));
    render(<CopyButton text="lap,split" label="Copy CSV" />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('Copied');

    // Wrapped in act: advancing the timer schedules a React state update, and
    // without this the assertion runs before React has re-rendered.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1700);
    });
    expect(screen.getByRole('button')).toHaveTextContent('Copy CSV');
  });
});
