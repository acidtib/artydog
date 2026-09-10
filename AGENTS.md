# AGENTS.md

ArtyDog is a Tauri 2 desktop app: a React/TypeScript frontend over a Rust
backend, running as a normal window or as an interactive overlay over the
game WARDOGS. Two frontend entry points: the main window
(`index.html` -> `src/main.tsx` -> `App.tsx`) and the overlay window
(`overlay.html` -> `src/overlay-main.tsx` -> `Overlay.tsx`). Firing solutions
come from `src/calculator/`, which is pure TypeScript and free of React and
Tauri. See `docs/ARCHITECTURE.md` for detail and `docs/BALLISTICS.md` for the
firing data.

## Commands

Package manager is pnpm.

```bash
pnpm install
pnpm dev      # vite dev server on :1420
pnpm lint     # eslint
pnpm test     # vitest (frontend)
pnpm build    # tsc --noEmit, then vite build
cargo test --manifest-path src-tauri/Cargo.toml
```

`cargo check`/`cargo test` in `src-tauri` need `dist/` to exist
(`tauri.conf.json` points `frontendDist` there), so run `pnpm build` first
on a fresh checkout. CI does this in its rust job.

## Commit messages

Follow the Scoped Commits convention:

```
<scope>: <description>

[optional body]
```

The scope goes first because "what area did this touch" is the thing a
reader scanning `git log` needs before anything else.

- **Scope**: the subsystem touched. Lowercase, no punctuation. Use one of:
  - `main`: main window UI in `src/App.tsx`, `src/main.tsx`
  - `overlay`: overlay window UI in `src/Overlay.tsx`, `src/overlay-main.tsx`, or Rust code in `src-tauri/src/overlay/`
  - `calculator`: ballistics math and firing data in `src/calculator/`
  - `components`: shared UI components in `src/components/`
  - `hotkey`: global shortcut code in `src-tauri/src/hotkey/`
  - `tray`: tray icon and window close to tray in `src-tauri/src/tray.rs`
  - `commands`: Tauri commands in `src-tauri/src/commands.rs`
  - `state`: shared Rust state in `src-tauri/src/state.rs`
  - `platform`: OS abstraction in `src-tauri/src/platform/`
  - `lib`: shared frontend code in `src/lib/`
  - `style`: styling in `src/styles.css`, Tailwind setup
  - `config`: `tauri.conf.json`, `vite.config.ts`, `Cargo.toml`, `package.json`
  - `ci`: `.github/workflows/`
  - `tests`: `*.test.*`, `src/test/`, Rust `#[test]`
  - `docs`: `README.md`, `TODO.md`, `docs/`, this file
- **Description**: lowercase, imperative, no trailing period. State what the
  commit does, not what bug prompted it; the "why" of a fix belongs in the
  body, not stuffed into the summary line.
- **Multiple scopes**: prefer the narrowest scope that still covers the
  change. If it genuinely spans several, comma-separate them
  (`overlay,hotkey: ...`), or use `treewide` for changes that touch
  everything.
- **Body**: optional. Use it for the reasoning a future reader would need
  (why, not what); the same restraint as code comments applies here. Do not
  narrate the debugging process.
- No co-author trailers (no `Co-authored-by`, `Co-committed-by`, or similar). Keep the commit body to the change itself.
- No em dashes anywhere in commits, code, or docs. Use a hyphen instead.

Examples, matching this repo's layout:

```
overlay: add test input and counter button to prove interactivity
hotkey: register bare m shortcut on pressed event only
tray: hide main window to tray on close with quit menu
main: show overlay status polled from get_overlay_state
commands,state: expose toggle_overlay with native visibility as truth
```

Reverts, merges, and other special commits can ignore this format.

## Comments

Write comments the way a human working under deadline pressure would: short,
and only when the line above genuinely needs it. Default to no comment.

**One clause, not a paragraph.** If a comment needs three lines to justify
itself, that is a sign to cut it down to the one fact that matters, not to
keep the reasoning trail.

Before:
```rust
// Showing the overlay again reuses the existing window so position and size
// survive a hide/show cycle (hiding never destroys the window). Also restores
// geometry here in case the window manager moved it while hidden, and focuses
// it so keyboard input lands in the overlay even though the global M shortcut
// fired from WARDOGS focus and the old focus call used to race show().
manager.show()?;
```
After:
```rust
// Hiding never destroys the overlay, so showing reuses the same window.
manager.show()?;
```

Before:
```ts
// A Tauri command result of true means the native side reports the overlay as
// visible, which is the source of truth here (React state is only a mirror).
// The old polling loop used to drift from reality when M was pressed while
// WARDOGS had focus, so always trust is_visible() over local state.
const visible = await getOverlayState();
```
After:
```ts
// Native visibility is the source of truth; React state only mirrors it.
const visible = await getOverlayState();
```

**Do not narrate what you just did or why you chose this fix.** A comment
describes the code as it stands, not the story of the bug that led to it.
Never write "fixed X because Y used to do Z"; that belongs in the commit
message, not the source.

Before:
```rust
// Wayland ignores always-on-top unless it is re-asserted after show, and the
// old code called set_focus() before the window was visible so the overlay
// never got keyboard input. The tray hide path also used to destroy state.
pub fn after_show(window: &WebviewWindow) -> Result<()> {
```
After:
```rust
// KWin applies always-on-top only after the window is visible.
pub fn after_show(window: &WebviewWindow) -> Result<()> {
```

**Only comment the non-obvious.** A hidden platform constraint, a subtle
invariant, a workaround for a specific bug: yes. What the code visibly does:
no. If removing the comment would not confuse a future reader, do not write it.

Example for this repo: `platform::after_show` re-asserting always-on-top on
KWin deserves one line; `manager.hide()` hiding the overlay does not.

**Do not stack a comment on every line.** One justifying comment for a whole
block beats one comment per statement inside it.

Before:
```rust
// Restore the saved geometry.
// Show the overlay window.
// Re-assert always-on-top for KWin.
// Focus it so keyboard input lands there.
manager.restore_geometry()?;
manager.show()?;
platform::after_show(window)?;
manager.focus()?;
```
After:
```rust
// KWin needs always-on-top re-asserted after show; focus so typing lands here.
manager.restore_geometry()?;
manager.show()?;
platform::after_show(window)?;
manager.focus()?;
```

**No em dashes.** Use a period, comma, colon, or semicolon instead. 
avoid them in code, commit messages, and docs alike.
