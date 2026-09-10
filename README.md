# ArtyDog

Technical implementation plan for a cross-platform desktop mortar calculator that works as:

1. A normal desktop application.
2. An interactive overlay that can be shown over WARDOGS while the game is running.

## Recommended stack

- **Tauri 2** - desktop shell and native window management
- **Rust** - native/backend layer and platform-specific overlay implementation
- **React + TypeScript** - application UI and calculator logic
- **Vite** - frontend build tooling
- **Tailwind CSS** - UI styling
- **Tauri Global Shortcut plugin** - global hotkey support
- **Serde** - Rust state/config serialization
- **Platform abstraction** - Windows and Linux implementations behind one Rust trait

Tauri provides native window APIs including always-on-top, transparency, positioning, monitor detection, and visibility controls. The official global-shortcut plugin supports Windows and Linux. See the official documentation links at the end of this document.

## Core product behavior

### Normal mode

The application opens like any other desktop application:

```text
┌─────────────────────────────────┐
│ ArtyDog                       │
├─────────────────────────────────┤
│ Mortar                          │
│ X [________]  Y [________]      │
│                                 │
│ Target                          │
│ X [________]  Y [________]      │
│                                 │
│        [ Calculate ]             │
│                                 │
│ Distance     842 m               │
│ Bearing      127.4°              │
│ Elevation     43.2°              │
└─────────────────────────────────┘
```

### Overlay mode

When WARDOGS is running, the user presses `M`.

The calculator overlay appears above the game and remains interactive.

Press `M` again to hide it.

The calculator process does not restart or lose state when the overlay is hidden.

## Important implementation principle

Do **not** make the first version dependent on reading WARDOGS memory, extracting game state, injecting code into the game, or parsing the game's rendering pipeline.

The initial application is completely external:

```text
User enters coordinates
        ↓
Calculator
        ↓
Mortar solution
```

WARDOGS only provides the visual context in which the overlay is displayed.

## MVP success criteria

The first milestone is not the ballistic calculator.

The first milestone is proving:

- WARDOGS can remain running.
- The application can run normally as a desktop app.
- `M` can toggle the overlay.
- The overlay stays above the game.
- The overlay can receive mouse/keyboard input.
- The user can move the pointer away from the overlay and continue interacting with the game.
- The overlay remembers its size and position.
- The same architecture works on Windows and KDE Wayland Linux.

Only after this is reliable should the calculator logic be built out.

## Releasing

Pushes to `main` publish a rolling bleeding-edge prerelease. Cutting a stable
release is `pnpm release:patch` then pushing the tag it makes. The app updates
itself from the latest stable release. See `docs/RELEASING.md`.

## Documentation sources

- Tauri window API: https://tauri.app/reference/javascript/api/namespacewindow/
- Tauri window customization: https://tauri.app/learn/window-customization/
- Tauri global shortcut plugin: https://v2.tauri.app/plugin/global-shortcut/
- Tauri prerequisites/platform support: https://v2.tauri.app/start/prerequisites/
