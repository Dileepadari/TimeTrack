# Comment style

The rule: **a comment explains why, the code already says what.** If a comment
restates the line below it, delete the comment.

## Module headers

Every file under `src/` opens with one line, or a short block when the file has
a constraint worth stating up front. `useStopwatch.js` says it is a state
machine over a monotonic clock, because that is the decision the whole file
turns on.

## Doc comments on exports

Every exported function, component and constant has one. One line where one line
is enough:

```js
/** The cycle order, in the order the button steps through it. */
export const THEME_MODES = MODES;
```

More when a reader would otherwise have to work something out:

```js
/**
 * The label is the whole accessible name, and it says the current mode rather
 * than the next one: a button that announces "Theme: light" while the page is
 * dark reads as a state, not a promise.
 */
```

The second paragraph is the point. A reader can see what the label contains;
they cannot see that the wording was chosen rather than defaulted.

## Comments inside a function

Reserved for a decision, a constraint, or a trap. Examples from this repo:

```js
// The clock is derived from a monotonic timestamp, never accumulated per tick.
// A timer that adds a fixed step on every callback drifts as soon as the page
// is throttled or a frame is late.
```

```js
// Restore a previous session, always paused: the wall clock cannot tell us
// how long the tab was closed, so counting through a reload would be a lie.
```

Both record something learned. Neither describes what the next line does.

## Tests

Test names are sentences: `lets Space activate the focused button rather than
toggling the clock`. Where a test exists because something was wrong, the file's
docblock says what was wrong, so nobody later deletes it as redundant:

```js
/**
 * The global `Space = start/pause` binding used to run first and
 * `preventDefault` swallowed the activation, which meant tabbing to Reset and
 * pressing Space started the clock instead of resetting it.
 */
```

## What is not written

- No narration: `// set the theme` above a line that sets the theme.
- No commented-out code. Git has it.
- No `// TODO` without a name and a reason.

## Plain ASCII

No em dashes, en dashes, arrows or dingbats anywhere: prose, code, comments,
interface strings or commit messages. Use `-`, `->` or rewrite. CI enforces it.

This is about the characters in the file, not the glyphs on screen. Two traps
that a plain grep cannot see, both found in sibling repositories:

- An HTML entity for one of those characters is pure ASCII on disk and renders
  as exactly the character being removed. CI has a second grep for those.
- A coding font with ligatures draws `->` as a single arrow. Look at the
  rendered page, not only at the grep output.
