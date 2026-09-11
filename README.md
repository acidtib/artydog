# ArtyDog

A mortar firing calculator for [WARDOGS](https://store.steampowered.com/), usable
as a normal desktop application or as an interactive overlay on top of the game.

Enter your mortar position and your target, get the distance, azimuth and
elevation. Press a global shortcut to bring the calculator up over the game and
press it again to send it away.

> **Status: early.** The calculator works in the main window. The overlay window
> itself works (it shows, hides, drags, resizes, remembers where you put it) but
> still carries placeholder contents rather than the calculator. See
> [docs/MILESTONES.md](docs/MILESTONES.md) for where this is going.

## It does not touch the game

ArtyDog is an ordinary desktop window that happens to sit above WARDOGS. It
does not inject code, read game memory, modify game files, or send input to the
game. It has no idea WARDOGS is even running. You type coordinates; it does
arithmetic.

This is a deliberate design constraint rather than a temporary state, because
anything else is a good way to get people banned.

## Install

Grab the latest build from [Releases](https://github.com/acidtib/artydog/releases/latest).

- **Windows**: `ArtyDog_x64-setup.exe`. It is not code-signed, so SmartScreen
  will warn on first run.
- **Linux**: `.AppImage` (recommended) or `.deb`.

The app updates itself: when a new release is out, the main window offers to
install it and restart. Only the Windows installer and the AppImage can
self-update; a `.deb` install has to be upgraded by hand.

## Using it

1. Open ArtyDog, then start WARDOGS.
2. Press **Alt+M** to show or hide the overlay. The shortcut is configurable in
   the main window.
3. Closing the main window hides it to the system tray so the shortcut keeps
   working. Quit from the tray menu.

The overlay remembers its position and size between sessions, and recovers to
your primary monitor if it was left on a display that is no longer attached.

### The shortcut takes the key from the game

A global shortcut is exclusive on every platform: while ArtyDog is running, the
key it is bound to never reaches WARDOGS. The default is `Alt+M` rather than
bare `M` precisely because WARDOGS uses `M` for its map. If you rebind ArtyDog
onto a key the game needs, you will lose that key in game.

## Known limitations

- **Linux**: the global shortcut is registered through X11, so it does not fire
  under native Wayland. The tray menu and the main window's Toggle Overlay
  button work regardless. Under XWayland (`GDK_BACKEND=x11`) the shortcut works.
- **Linux**: on some GPU setups the app exits at startup with
  `Error 71 (Protocol error) dispatching to Wayland display`. Launch it with
  `WEBKIT_DISABLE_DMABUF_RENDERER=1`.
- WARDOGS does not currently have full Linux support, so Windows is the primary
  target.

## Building from source

Requires [pnpm](https://pnpm.io/) and a Rust toolchain, plus the
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your
platform.

```bash
pnpm install
pnpm tauri dev
```

Other commands:

```bash
pnpm lint     # eslint
pnpm test     # vitest
pnpm build    # tsc --noEmit, then vite build
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

`cargo` commands need `apps/desktop/dist/` to exist, so run `pnpm build` first
on a fresh checkout.

## Website

The landing site lives in `apps/website` and is a pnpm workspace sibling of the
desktop app. It deploys to GitHub Pages from `main` via
[.github/workflows/website.yml](.github/workflows/website.yml). Run it locally
with `pnpm dev:web`.

## How it is put together

A Tauri 2 shell with a React and TypeScript frontend over a Rust backend. Two
windows, one main and one overlay, out of one process. The ballistics are plain
TypeScript with no React or Tauri anywhere near them, so they can be tested on
their own.

| Document | What is in it |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Module layout and the reasoning behind it |
| [docs/OVERLAY.md](docs/OVERLAY.md) | Overlay window design, platform behavior, geometry rules |
| [docs/BALLISTICS.md](docs/BALLISTICS.md) | Firing tables and coordinate conversion |
| [docs/MILESTONES.md](docs/MILESTONES.md) | Build order and what counts as done |
| [docs/RELEASING.md](docs/RELEASING.md) | Cutting a release, signing, key rotation |
| [AGENTS.md](AGENTS.md) | Conventions for anyone (or anything) writing code here |

## License

MIT. See [LICENSE](LICENSE).

## Not affiliated with WARDOGS

This is an unofficial fan-made tool, not connected to or endorsed by the
developers of WARDOGS. All trademarks belong to their respective owners.
