# not_for_you.md

A personal working log. Nothing here is needed to run or contribute to TimeTrack;
[README.md](README.md) and [DEVDOC.md](DEVDOC.md) cover that.

---

## The overhaul pass, 2026-09-24

The August rebuild had already done the hard part. The clock is anchored to
`performance.now()` rather than accumulated per tick, the reducer takes its
timestamp in the action so it is testable without timers, the persist path is
honest about restoring paused. 30 tests, eslint clean, zero advisories. Nothing
in the timing was wrong.

Everything I found was about what happens to somebody who is not looking at the
screen, or not using a mouse.

### A helper written for screen readers that nothing called

`lib/format.js` exports `describeDuration`, documented as "Screen-reader friendly
wording", producing `1 minute 5.00 seconds`. Three unit tests cover it. **It was
imported by nothing except its own test file.**

Meanwhile the timer carried `role="timer"` with `aria-live="off"`, no accessible
name at all, and its digits written straight into the DOM from the animation
frame. I probed what an assistive technology would actually receive:

```
TIMER aria-live      : off
TIMER accessible name: null
TIMER text content   : "00:00:00.14Paused"
LIVE REGIONS         : [ 'DIV[aria-live=off] = "00:00:00.14Paused"' ]
```

Nothing. Not on pause, not on a lap, not on reset. And had it announced anything
it would have been that string, digits jammed against the status word.

The tempting fix is to turn the live region on. That is wrong: the digits change
sixty times a second, and a reader announcing each one is worse than silence. So
`aria-live="off"` stays and is now documented as deliberate, with a separate
hidden `role="status"` that is **empty while the clock runs** and carries the
reading in words the moment it settles. A lap announces itself, because a lap is
a deliberate act whose only other feedback is a row appearing in a list the user
is not looking at.

That is what `describeDuration` was for. It took eighteen months and this pass
for anything to call it.

### Every button unreachable by keyboard

The page has a hint list that says <kbd>Space</kbd> start / pause, <kbd>L</kbd>
lap, <kbd>R</kbd> reset. So the keyboard was thought about.

Tab to Reset. Press Space. The stopwatch **starts**.

`useKeyboardShortcuts` binds Space globally and calls `preventDefault()`, which
swallows the focused button's own activation. Every control in the app is a real
`<button>`, and not one of them could be operated from the keyboard.

The existing comment shows the author saw the mechanism and drew the opposite
conclusion: *"Space would otherwise scroll the page or re-fire the focused
button."* Re-firing was the thing to prevent, so the binding claimed the key
outright. What it actually needed was to stand aside when something already owns
that key, which is now `focusOwnsKey`.

I liked this one. It is not a slip; it is a reasonable decision that happens to
be backwards, and nothing short of pressing the key finds it.

### A button that did nothing, on purpose

`CopyButton` caught a clipboard rejection and called `setCopied(false)`, with a
comment saying it would rather stay quiet than claim a copy that did not happen.
Right instinct. But the result is that a blocked clipboard and a click that never
registered look identical, and the clipboard *is* refused on an insecure origin
and inside an iframe without `clipboard-write` -- which is exactly how I found it,
capturing screenshots through the harness.

Now it says `Copy blocked`, and announces it.

### What the tests cost me

Three things went wrong writing them, all mine:

- `userEvent.setup()` installs its own `navigator.clipboard` stub. Mine was
  installed first, so the component called theirs, the spy recorded nothing, and
  the failure looked like the component was broken. Setup first, stub second.
- Advancing fake timers schedules a React state update, and the assertion ran
  before the re-render. Wrapping the advance in `act` fixed it.
- I put a `//` comment inside a JSX attribute list. It compiled, which surprised
  me, and I moved it out anyway: relying on a parser accepting something unusual
  is not the same as it being correct.

Each new test was run against the unfixed code first. Five of six a11y tests
fail, one of five keyboard tests fails, two of three copy tests fail. The
keyboard file only trips one because `Enter` was never bound in the first place,
so the old code let it through by accident rather than by design; that test is
there to keep it that way.

### 37,283 files that GitHub still serves

`git count-objects` says 54 MiB for an app whose whole source is thirty files.
There are two `refs/replace/` grafts in `.git`, so the history visible in
`git log` is not the history in the object store.

The original initial commit, `896aefc5` from 2022-11-30, has **37,283 files, of
which 37,283 minus 14 are `node_modules`**. It was rewritten out and force
pushed. But:

```
$ gh api repos/Dileepadari/TimeTrack/commits/896aefc5
896aefc5  2022-11-30T14:40:03Z  initial
```

**GitHub still serves it.** Unreferenced objects stay reachable by SHA until
GitHub garbage-collects, which is not something you can trigger yourself.

I swept that tree for anything sensitive. One `.env`, in `node_modules/psl/`,
zero bytes. So this is bloat and tidiness, not a leak. It joins the existing
open action about asking GitHub Support to collect purged objects.

### A script that had never run

`package.json` has `test:coverage`, `vite.config.js` configures a coverage
reporter, and DEVDOC documents the command. `@vitest/coverage-v8` was not
installed, so the script had only ever printed `MISSING DEPENDENCY`. Installed;
93% statements, and CI now holds a floor under it.

While installing it I deleted `node_modules` and `package-lock.json` to get past
an npm `edgesOut` error, which was careless: the lockfile is tracked. Restored it
from git before doing anything else, and `npm ci` worked fine. The error was npm
choking on its own cache, not the lockfile.

### Capture notes

The clipboard would not copy through the harness even with
`allow="clipboard-write"` on the iframe, because a synthetic `.click()` is not a
trusted user gesture. A real click at coordinates worked, but the `Copied` state
lasts 1600ms and the capture round trip is slower than that, so the shot came
back showing the idle label. Dropped it. It is a flourish, not a screen, and
padding a gallery with a state you had to fight for is the wrong instinct.

The long-session screenshot is real data through the app's own restore path:
seven laps and 1:15:07 written to `localStorage` and reloaded. Waiting an hour
was not on. The first attempt failed because the running app saves its own state
on unload and overwrote mine, so the write has to happen from a page where the
app is not mounted.

### Left alone

- **`role="timer"` keeps `aria-live="off"`.** Documented now rather than changed.
- **The visible status line is `aria-hidden`.** The status region says the same
  thing; two sources read it twice.
- **`Reset` is not undoable.** The README says to copy the CSV first if the laps
  matter. A confirmation dialog on a stopwatch reset would be worse.
