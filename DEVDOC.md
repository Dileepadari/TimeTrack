# TimeTrack - Developer Documentation

Technical reference for the TimeTrack codebase: architecture, state model, the
timing approach, and setup. For what the app does from a user's point of view, see
[README.md](./README.md).

## Table of contents

- [Tech stack](#tech-stack)
- [Architecture overview](#architecture-overview)
- [Timing model](#timing-model)
- [State model](#state-model)
- [Render loop](#render-loop)
- [Persistence](#persistence)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Theming](#theming)
- [Frontend structure](#frontend-structure)
- [Testing](#testing)
- [Local development](#local-development)
- [Build and deployment](#build-and-deployment)
- [Known constraints and gotchas](#known-constraints-and-gotchas)

## Tech stack

React 19 on Vite 8, plain JavaScript with JSX, hand-written CSS with custom
properties. No state library, no router, no component library, no CSS framework -
the app is one screen and adding any of those would be more code than it removes.
Tests run on Vitest 4 with Testing Library and jsdom. Linting is ESLint 10 flat
config with the React Hooks plugin.

There is no backend. The app is a static bundle and all state lives in the browser.

## Architecture overview

```
                    +---------------------------+
                    |  App.jsx                  |
                    |  wires hooks to UI        |
                    +------------+--------------+
                                 |
        +------------------------+------------------------+
        |                        |                        |
+-------v--------+     +---------v---------+    +---------v---------+
| useStopwatch   |     | useTheme          |    | useKeyboard       |
| reducer + loop |     | data-theme attr   |    | Shortcuts         |
+-------+--------+     +-------------------+    +-------------------+
        |
        |  subscribe(fn)  <- called once per animation frame
        |  getElapsed()   <- current ms, read on mount
        v
+----------------+     +-------------------+
| Display.jsx    |     | LapList.jsx       |
| writes to DOM  |     | renders from      |
| refs directly  |     | props (React)     |
+----------------+     +-------------------+
```

`useStopwatch` owns everything about the clock and is the only place time is
computed. `App` is a wiring layer with no logic of its own beyond deriving the CSV
string. Components are presentational.

The split between `Display` and `LapList` is deliberate: the display changes 60
times a second and the lap list changes only when a lap is marked, so the display
bypasses React and the lap list does not.

## Timing model

The rule that shapes the whole hook: **elapsed time is measured, never
accumulated.**

A naive stopwatch does `setInterval(() => ms += 10, 10)`. That is wrong in two
ways. Timer callbacks are not delivered on time under load, and browsers clamp
timers hard in background tabs (often to once a second), so the counter falls
behind real time and never catches up. The original version of this project had
exactly that bug.

Instead, the state stores two numbers:

- `banked` - milliseconds completed in all previous run segments
- `anchor` - the `performance.now()` reading when the current segment started, or
  `null` when paused

and elapsed time is derived on demand:

```js
elapsed = running ? banked + (performance.now() - anchor) : banked
```

`performance.now()` is monotonic and unaffected by system clock changes. A dropped
or late frame therefore costs a repaint, not accuracy: the next frame reads the
true delta regardless of when it arrives. `elapsedOf(state, at)` is exported so
tests can evaluate any state at any timestamp without faking timers.

Pausing folds the segment into `banked` and clears `anchor`. Resuming sets a fresh
`anchor`. This is why a paused stopwatch is genuinely frozen rather than merely
not being repainted.

Centiseconds are **truncated, not rounded** (`src/lib/format.js`). Rounding would
let the display show `01.00` at 995ms, one hundredth ahead of the actual time.

## State model

`useStopwatch` uses `useReducer`. The reducer is pure and takes the timestamp in
the action rather than reading the clock itself, which is what makes the whole
state machine testable without timers.

| Action | Payload | Effect |
|---|---|---|
| `start` | `at` | Sets `anchor`, marks running. No-op if already running. |
| `pause` | `at` | Banks `elapsedOf(state, at)`, clears `anchor`. No-op if paused. |
| `lap` | `at` | Prepends a lap. No-op when elapsed is 0. |
| `reset` | - | Returns `initialState`. |
| `restore` | `banked`, `laps` | Rehydrates a saved session, always paused. |

A lap is `{ index, split, total }`, all milliseconds. Laps are stored **newest
first** so the list renders in reading order without reversing on every render;
`lapsToCsv` sorts back to oldest-first because that is what a spreadsheet wants.

`split` is derived at insert time from the previous lap's `total`, not recomputed
during render. Splits are therefore immutable facts about the session.

Derived state exposed by the hook:

- `running` - the clock is advancing
- `started` - the clock has moved at all, running or paused; this is what gates the
  Reset button and distinguishes "Ready" from "Paused"

## Render loop

The animation frame loop only runs while `running` is true. Each frame computes
elapsed time and pushes it to subscribers.

`Display` subscribes and writes `textContent` on four span refs, comparing against
the previous frame's units so it only touches a node whose value actually changed.
Centiseconds change every frame; hours change once an hour. The ring's
`strokeDashoffset` is set the same way.

This is the one place in the app that intentionally sidesteps React. The reason is
that a `useState` per frame would re-render `App` and everything under it 60 times
a second, including the entire lap table. The trade-off is that the display's
digits are invisible to React DevTools and are not driven by props.

`aria-live` on the timer is deliberately `off`. A live region updating 60 times a
second would flood a screen reader with useless announcements; the Running / Paused
/ Ready status text carries the state change instead.

## Persistence

Two `localStorage` keys, both versioned so a future format change can be detected
rather than mis-parsed:

| Key | Contents |
|---|---|
| `timetrack:session:v1` | `{ banked, laps }` |
| `timetrack:theme:v1` | `"system"` / `"light"` / `"dark"` |

The session is written whenever the reducer state settles, and again on
`pagehide` so a refresh mid-run keeps the time accrued up to that moment.

Restore is always **paused**, and only `banked` is restored - never `anchor`.
`performance.now()` is relative to the page's own timeline, so an anchor from a
previous page load means nothing in the new one. The wall clock could tell you how
long the tab was closed, but counting that time would be a fabrication: the user
was not running a stopwatch, the tab was shut. Restoring paused is the honest
option and the README states it as behaviour.

Every read and write is wrapped in try/catch. Private browsing modes and a full
quota both throw, and persistence is a convenience that must never be able to
break the stopwatch.

## Keyboard shortcuts

`useKeyboardShortcuts` binds a single `keydown` listener on `document` and looks
the key up in a map (`space`, `l`, `r`). It:

- ignores events carrying Meta, Ctrl, or Alt, so browser shortcuts keep working
- ignores events from inputs, textareas, selects, and contenteditable
- calls `preventDefault()` on a match, which stops Space from scrolling the page
  and from re-triggering whichever button currently has focus

The bindings map is read through a ref synced in a layout effect, so callers can
pass a fresh object literal every render without rebinding the listener.

## Theming

Three states, not two: `system`, `light`, `dark`.

The complete light palette is defined as custom properties on bare `:root`. Dark
overrides appear twice - once under
`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` and once
under `:root[data-theme="dark"]`. That pairing is what lets an explicit choice win
in both directions while `system` (no attribute) still follows the OS.

No colour is ever defined only inside a media query. `useTheme` sets or removes
`data-theme` on `<html>`; `system` removes the attribute entirely.

The ADK DEV mark is a single solid-purple PNG on transparency, shown through the
`.logo-mono` filter: `brightness(0)` in light mode flattens it to black,
`brightness(0) invert(1)` in dark flips it to white. One file, both themes, no
recoloured second asset.

## Frontend structure

```
index.html              Vite entry, favicon and manifest links
public/                 favicon.png, manifest.webmanifest, robots.txt
src/
  main.jsx              createRoot
  App.jsx               wiring only
  index.css             tokens, theme blocks, every component style
  assets/
    logo-mark.png       ADK DEV mark, also copied to public/favicon.png
  components/
    Display.jsx         the readout and ring; writes to DOM refs per frame
    Controls.jsx        Start/Pause, Lap, Reset
    LapList.jsx         summary strip and lap table
    CopyButton.jsx      clipboard write with an in-place confirmation
    Icons.jsx           inline SVG icons, no icon dependency
  hooks/
    useStopwatch.js     reducer, timing, render loop, persistence
    useTheme.js         data-theme attribute and its storage
    useKeyboardShortcuts.js
  lib/
    format.js           pure duration formatting and CSV
  test/
    setup.js            jest-dom matchers, rAF shim, per-test cleanup
```

CSS is a single file. At this size, splitting it per component would mean more
files than rules, and the tokens want one place to live.

## Testing

```bash
npm test            # single run
npm run test:watch
npm run test:coverage
npm run lint
```

Three suites, 30 tests:

- `src/lib/format.test.js` - formatting, truncation, CSV shape and immutability
- `src/hooks/useStopwatch.test.js` - the reducer as a pure function, driven by
  explicit timestamps with no timers involved at all
- `src/App.test.jsx` - the app through the DOM: counting, pause holding its
  reading, resume, laps and splits, best/worst marking, reset, disabled states,
  keyboard control, session restore, and the theme cycle

`src/test/setup.js` shims `requestAnimationFrame` onto `setTimeout` so fake timers
can drive the render loop, and clears `localStorage` after every test so
persistence in one test cannot leak into the next.

Not covered: the clipboard path in `CopyButton` (jsdom has no real clipboard, and
the assertion would only test the mock), and CSS.

## Local development

```bash
git clone <repo> && cd TimeTrack
npm install
npm run dev          # http://localhost:3000, opens automatically
```

Node 20.19+ or 22.12+ is required - Vite 8 will not start on older versions.

Scripts:

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production bundle into `dist/`, with sourcemaps |
| `npm run preview` | Serves the built `dist/` locally |
| `npm test` | Vitest, single run |
| `npm run lint` | ESLint over the repo |

There are no environment variables. Nothing in the app talks to a network.

## Build and deployment

`npm run build` emits a fully static `dist/` - one HTML file, one JS chunk, one CSS
file, and the logo. Deploy it to any static host (Netlify, Vercel, GitHub Pages, an
S3 bucket) with no configuration.

The app has no routes, so no SPA rewrite rule is needed. If it is served from a
subpath, set `base` in `vite.config.js`; the absolute `/favicon.png` and
`/manifest.webmanifest` links in `index.html` need the same prefix.

Vitest config lives in the `test` key of `vite.config.js` rather than a separate
`vitest.config.js`, so there is one build config to keep in sync.

## Known constraints and gotchas

**Do not add per-tick state.** Any `useState` driven by the animation frame will
re-render the whole tree 60 times a second and undo the reason `Display` writes to
refs. If the display needs a new element, add a ref for it in `Display` and update
it inside the existing `render` function.

**The reducer must stay pure and take `at` in the action.** Reading
`performance.now()` inside the reducer would make every test need fake timers and
would break under React 19 StrictMode, which invokes reducers twice in development.
The hook's callbacks read the clock; the reducer never does.

**Refs are synced in `useLayoutEffect`, not during render.** Assigning
`ref.current = value` in the render body trips the `react-hooks/refs` rule and is a
genuine StrictMode hazard. Layout effects run before passive effects and before any
event or animation frame that reads the mirror, so the value is never stale.

**`eslint-plugin-react-hooks` v7 puts its flat configs under `.configs.flat`.** The
top-level `configs['recommended-latest']` is still eslintrc-shaped and ESLint 10
rejects it with a confusing "plugins key defined as an array of strings" error. The
config uses `reactHooks.configs.flat['recommended-latest']`.

**The hours segment is toggled by a class, not conditional JSX.** `Display` never
re-renders while running, so the hour boundary is handled by
`classList.toggle('display--with-hours')` from inside the frame callback. Rendering
`{hours > 0 && ...}` there would simply never fire.

**Restoring a session unpaused would be a lie.** Covered under
[Persistence](#persistence). If someone asks for the clock to keep running through
a reload, the honest version needs a wall-clock timestamp stored alongside `banked`
and an explicit user decision about what closing the tab means.
