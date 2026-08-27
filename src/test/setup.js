import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom has no rAF loop worth driving in tests; a macrotask is close enough
// for the display, and it lets fake timers advance the render loop.
globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 16);
globalThis.cancelAnimationFrame = (handle) => clearTimeout(handle);

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
});
