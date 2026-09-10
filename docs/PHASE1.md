# Phase 1 — Overlay Architecture Proof (Implementation Report)

Goal: prove the desktop app + overlay architecture. No ballistics, no game
injection, no memory access. All present in this milestone: none of those exist.

## Files added

Frontend (`pnpm`, React 19 + TypeScript + Vite 6 + Tailwind 4):

- `package.json`, `pnpm-workspace.yaml`, `vite.config.ts`, `tsconfig.json`,
  `eslint.config.js`, `index.html`, `overlay.html`
- `src/main.tsx`, `src/App.tsx` — main window (status + Toggle Overlay button
  + hotkey registration state)
- `src/overlay-main.tsx`, `src/Overlay.tsx` — overlay test UI (working input,
  counter button, hide button)
- `src/lib/overlay.ts` — typed `invoke` wrappers (single bridge to Rust)
- `src/styles.css`

Backend (Tauri 2, Rust):

- `src-tauri/tauri.conf.json` — `main` + `overlay` windows; overlay starts
  hidden, undecorated, always-on-top, 400x300, skipTaskbar
- `src-tauri/capabilities/default.json` — minimal capabilities
- `src-tauri/src/lib.rs` — builder, plugin init, setup (hide overlay,
  register `M`, record registration errors instead of failing silently)
- `src-tauri/src/commands.rs` — `show_overlay`, `hide_overlay`,
  `toggle_overlay`, `get_overlay_state`, `get_overlay_geometry`,
  `set_overlay_position`, `set_overlay_size`, `get_hotkey_status`
- `src-tauri/src/state.rs` — `AppState` (visibility mirror, geometry slot,
  hotkey error); Rust side is authoritative, frontend only mirrors
- `src-tauri/src/overlay/mod.rs` — `OverlayController` trait
- `src-tauri/src/overlay/manager.rs` — `OverlayManager`; window created once,
  only shown/hidden; show restores saved geometry, focus failure is
  non-fatal (Wayland may decline activation while still showing the window)
- `src-tauri/src/hotkey/` — bare-`M` shortcut, reacts to `Pressed` only
- `src-tauri/src/platform/{mod,linux,windows,fallback}.rs` — platform
  boundary; Phase 1 uses Tauri APIs only, no native code yet
- `src-tauri/icons/` — generated RGBA placeholder icons
- `.github/workflows/ci.yml` — `pnpm lint` + `pnpm build` + `cargo check`
  (Linux and Windows)

## Commands

- `pnpm install` (requires `pnpm approve-builds --all` once for esbuild)
- `pnpm dev` / `pnpm tauri dev` — run
- `pnpm lint`, `pnpm build` — frontend checks
- `cargo check --manifest-path src-tauri/Cargo.toml` — backend check

## Tests performed (this machine, KDE Plasma Wayland)

- `pnpm lint` — pass, no warnings.
- `pnpm build` (`tsc --noEmit` + `vite build`) — pass; emits both
  `dist/index.html` and `dist/overlay.html`.
- `cargo check` — pass, zero warnings. `cargo build` — links cleanly
  against system `webkit2gtk-4.1`.
- Live run: main window appears and is visible; overlay window exists and
  starts hidden (verified via window list: `WARDOGS Mortar Calculator`
  visible + second window hidden). Setup log confirms
  `platform: linux`, no hotkey registration error.
- Manual tests still required by the operator: press `M` with app / overlay /
  WARDOGS focused, type in overlay input, click test button, click back into
  WARDOGS, move/resize + re-toggle persistence.

## KDE Wayland findings

- The sandbox used for automated testing breaks native Wayland connections
  (`Error 71 dispatching to Wayland display`); the app runs fine unsandboxed
  via XWayland (`GDK_BACKEND=x11`). This is a test-harness artifact, not an
  app bug — verify on a normal dev launch with `pnpm tauri dev`.
- `global-hotkey` on Linux grabs via X11, so bare-`M` behavior under native
  Wayland + Proton/WARDOGS focus is the highest-risk item and must be tested
  manually with the game running. If KWin/Proton swallows the key, the fix
  belongs in `platform/linux.rs` (and possibly a configurable hotkey, already
  anticipated by `get_hotkey_status` surfacing registration errors in the UI).
- Focus on show is best-effort by design: a declined activation logs
  `[overlay] overlay shown but focus was declined` instead of failing the
  toggle.

## Known limitations

- No WARDOGS testing was possible from here (game not driven in this
  environment); Tests 4–7 need the operator with the game running.
-  passes; native Windows runtime validation still needed.
- Icons are solid-color placeholders; bundle packaging (AppImage/NSIS) is a
  later milestone.
- Geometry persists for app lifetime only (in-memory `AppState`); disk
  persistence hooks can use the existing `OverlayGeometry` struct as-is.

## Recommended next milestone

Manual M-toggle + WARDOGS focus validation on this machine, then the
calculator UI (Milestone 1/6 math in pure TypeScript, shared by both windows).
