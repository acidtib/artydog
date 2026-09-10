# TODO

Follow-ups from the code review. None of these block the current milestone.

## High-risk validation (manual)

- [ ] Test bare-`M` global shortcut on KDE Plasma Wayland against a real
  foreground app (WARDOGS via Proton). If KWin refuses the grab, the fix
  stays inside `src-tauri/src/hotkey/` (modifier combo or GlobalShortcuts
  portal).
- [ ] Confirm typing `m` in other apps toggling the overlay is acceptable.
  If not, switch the shortcut to a modified combo (e.g. `Alt+M`).

## Frontend

- [x] Replace 1s polling in `src/App.tsx` with Tauri events emitted from
  Rust on toggle, so the main window updates instantly with no IPC loop.
- [x] Add TS wrappers in `src/lib/overlay.ts` for `set_overlay_position`
  / `set_overlay_size` (commands exist in Rust but are unreachable from
  the frontend).

## Rust cleanup

- [x] `src-tauri/src/hotkey/manager.rs`: `toggle_shortcut()` returns
  `Result` but cannot fail; simplify to return `Shortcut` directly.
- [x] `src-tauri/src/platform/windows.rs`: document why `after_show`
  re-asserts `alwaysOnTop` (as `linux.rs` does), or drop the call there.
- [x] `src-tauri/src/platform/fallback.rs`: `after_show` calls
  `set_focus`, then `OverlayManager::show()` focuses again; remove one.

## Testing

- [x] Add at least a few `#[test]`s for pure logic (geometry
  defaults/merge, toggle decision) and consider frontend component tests
  for `App` / `Overlay` (vitest + Testing Library, wired into CI).

## Release hygiene

- [ ] `src-tauri/Cargo.toml`: replace placeholder `authors = ["Potato"]`.
- [ ] Verify the new CSP in `src-tauri/tauri.conf.json` against the real
  release binary (overlay + main window, check console for violations).
- [ ] CI builds the frontend three times (once per job); share `dist/`
  via artifacts if it gets slow.
- [ ] Add Dependabot/Renovate for GitHub Actions pins.
