# ArtyDog

An artillery calculator for WARDOGS, usable as a normal desktop application or
as an interactive overlay on top of the game.

Pick a weapon, enter your artillery grid and your target grid, and read off the
distance, azimuth and elevation in mils. Press a global shortcut to bring the
calculator up over the game and press it again to send it away.

[Use it in your browser](https://artydog.win) ·
[Download](https://github.com/acidtib/artydog/releases/latest)

## It does not touch the game

ArtyDog is an ordinary desktop window that happens to sit above WARDOGS. It
does not inject code, read game memory, modify game files, or send input to the
game. It has no idea WARDOGS is even running. You type coordinates it does
arithmetic.

This is a deliberate design constraint rather than a temporary state, because
anything else is a good way to get people banned.

## Supported weapons

| Weapon | Range | Elevation |
| --- | --- | --- |
| L81 Mortar | 132-684 m | one arc |
| SPH-2 | 780-2629 m | low and high arcs |

Elevations are interpolated from in-game firing tables. See
[docs/BALLISTICS.md](docs/BALLISTICS.md) for the data and the reference values
the math is tested against.

## Install

Grab the latest build from [Releases](https://github.com/acidtib/artydog/releases/latest).

- **Windows**: `ArtyDog_<version>_x64-setup.exe`. It is not code-signed, so
  SmartScreen will warn on first run.
- **Linux**: `ArtyDog_<version>_amd64.AppImage` (recommended) or `.deb`.

The app updates itself: when a new release is out, a dot appears on the
settings cog, and **Settings > General** offers to install it and restart. Only
the Windows installer and the AppImage can self-update; a `.deb` install has to
be upgraded by hand.

Every change to the app on `main` also publishes a
[bleeding-edge](https://github.com/acidtib/artydog/releases/tag/bleeding-edge)
prerelease, if you want the newest changes before a stable release.

## Using it

1. Open ArtyDog, then start WARDOGS.
2. Choose a weapon, then type the artillery and target grid coordinates. The
   status strip tells you what is still missing, or how far out of range the
   target is.
3. Press **Alt+M** to show or hide the overlay. The overlay and the main window
   edit the same inputs, so whatever you typed in one is already in the other.
4. Minimizing or closing the main window sends it to the system tray so the
   shortcut keeps working. Click the tray icon to bring it back; quit from the
   tray menu.

The cog in the main window's footer opens **Settings**:

- **Overlay**: show or hide it, and reset its position.
- **Shortcut**: rebind the overlay toggle.
- **General**: check for and install updates.

The overlay remembers where you put it between sessions, and recovers to your
primary monitor if it was left on a display that is no longer attached.

### The shortcut takes the key from the game

A global shortcut is exclusive on every platform: while ArtyDog is running, the
key it is bound to never reaches WARDOGS. The default is `Alt+M` rather than
bare `M` precisely because WARDOGS uses `M` for its map. If you rebind ArtyDog
onto a key the game needs, you will lose that key in game.

## Known limitations

- **Linux**: the global shortcut is registered through X11, so it does not fire
  under native Wayland. The tray menu and **Settings > Overlay** work
  regardless. Under XWayland (`GDK_BACKEND=x11`) the shortcut works.
- **Linux**: on some GPU setups the app exits at startup with
  `Error 71 (Protocol error) dispatching to Wayland display`. Launch it with
  `WEBKIT_DISABLE_DMABUF_RENDERER=1`.
- WARDOGS does not currently have full Linux support, so Windows is the primary
  target.

## Building from source

### Prerequisites

- [Node.js](https://nodejs.org/) 24 and [pnpm](https://pnpm.io/). Running
  `corepack enable` once gives you the pnpm version the repository pins.
- [Rust](https://rustup.rs/) 1.77.2 or newer.
- The system libraries Tauri needs:
  - **Debian/Ubuntu**:
    ```bash
    sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
      libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf
    ```
  - **Windows**: the Microsoft C++ Build Tools and WebView2, which Windows 10
    and 11 already ship.
  - Anything else: see the
    [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

### Run it locally

```bash
git clone https://github.com/acidtib/artydog.git
cd artydog
pnpm install
pnpm tauri dev
```

This opens the app with the frontend reloading as you edit. The first run
compiles the Rust side, which takes a few minutes. If it exits at startup on
Wayland, see [Known limitations](#known-limitations).

To work on the website instead, run `pnpm dev:web`.

### Build an installable app

```bash
pnpm tauri build --config '{"bundle":{"createUpdaterArtifacts":false}}'
```

The installers land in `apps/desktop/src-tauri/target/release/bundle/`, one
folder per format (`nsis` on Windows, `appimage` and `deb` on Linux), and the
bare executable in `apps/desktop/src-tauri/target/release/`. Add
`--bundles deb` (or `appimage`, `nsis`) to build a single format.

The `--config` override skips the signed update files, whose private key only
the release pipeline holds; without it the build fails after bundling. A copy
you build yourself therefore cannot update itself.

### Development commands

Run from the repository root against both apps:

```bash
pnpm lint     # eslint
pnpm test     # vitest
pnpm build    # tsc --noEmit, then vite build
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

`cargo` commands need `apps/desktop/dist/` to exist, so run `pnpm build` first
on a fresh checkout.

## How it is put together

A pnpm workspace with two apps. `apps/desktop` is a Tauri 2 shell with a React
and TypeScript frontend over a Rust backend: two windows, one main and one
overlay, out of one process. The ballistics are plain TypeScript with no React
or Tauri anywhere near them, so they can be tested on their own.
`apps/website` is the website, deployed to GitHub Pages from `main`; it runs
the full calculator in the browser from a copy of the same math and firing
tables.

| Document | What is in it |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Module layout and the reasoning behind it |
| [docs/OVERLAY.md](docs/OVERLAY.md) | Overlay window design, platform behavior, geometry rules |
| [docs/BALLISTICS.md](docs/BALLISTICS.md) | Firing tables and coordinate conversion |
| [docs/RELEASING.md](docs/RELEASING.md) | Cutting a release, signing, key rotation |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Running the checks, commit messages, changelog entries |
| [AGENTS.md](AGENTS.md) | Conventions for anyone (or anything) writing code here |

## License

MIT. See [LICENSE](LICENSE).

## Not affiliated with WARDOGS

This is an unofficial fan-made tool, not connected to or endorsed by the
developers of WARDOGS. All trademarks belong to their respective owners.
