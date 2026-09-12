# ArtyDog - Architecture

The repository is a pnpm workspace with two apps: `apps/desktop` (this app)
and `apps/website` (the landing site). Paths below are relative to
`apps/desktop/`.

## 1. High-level architecture

```text
                    ARTYDOG
                              │
                ┌─────────────┴─────────────┐
                │                           │
          Normal Window               Overlay Window
                │                           │
                └─────────────┬─────────────┘
                              │
                            Tauri
                              │
                ┌─────────────┴─────────────┐
                │                           │
          React + TypeScript              Rust
                │                           │
        ┌───────┴────────┐        ┌────────┴─────────┐
        │                │        │                  │
    Calculator        Settings  Window Manager   Platform Layer
        │                         │                  │
        │                         │           ┌──────┴──────┐
        │                         │           │             │
        │                         │        Windows       Linux
        │                         │           │             │
        └─────────────────────────┴───────────┴─────────────┘
```

## 2. Frontend

Use React + TypeScript.

Suggested structure:

```text
src/
├── components/
│   ├── Calculator.tsx          # main-window calculator surface
│   ├── OverlayCalculator.tsx   # same surface, overlay window
│   ├── CoordinateInput.tsx     # numbers-only coordinate pair
│   ├── ResultPanel.tsx         # status strip and solution readout
│   ├── ToastStack.tsx          # transient failure notices
│   ├── WeaponSelect.tsx
│   └── SettingsView.tsx        # overlay, shortcut, and update settings
│
├── calculator/                 # pure ballistics math and data, no React
│
├── lib/                        # Tauri bridge, hooks, window helpers
│
├── App.tsx                     # main window shell (header, calculator, settings)
├── Overlay.tsx                 # overlay window shell (drag bar, hide)
├── main.tsx
└── overlay-main.tsx
```

Keep calculator math independent from React.

The main window is a compact undecorated tool (382x476, fixed) with its own
header: the ArtyDog mark plus minimize and close, both of which go to the
tray. A footer carries the settings cog on the left and the app version on
the right; the cog toggles a settings dialog that owns the overlay controls,
the global shortcut, and app updates. Design tokens live in `styles.css` as a
Tailwind v4 `@theme` block (`tool-*` colors); components use those utilities
and avoid ad hoc hex values.

The window is pinned to a fixed size with `minWidth`/`maxWidth` and
`minHeight`/`maxHeight` rather than `resizable: false`. GTK sizes a
non-resizable window from its natural size request and discards the
configured width and height, so `resizable` stays `true` and the equal
min/max bounds are what actually hold the size.

## 3. Rust backend

Suggested structure:

```text
src-tauri/src/
├── lib.rs
├── commands.rs
├── state.rs
├── overlay/
│   ├── mod.rs
│   ├── manager.rs
│   └── platform.rs
├── hotkey/
│   ├── mod.rs
│   └── manager.rs
├── config/
│   ├── mod.rs
│   └── persistence.rs
└── platform/
    ├── mod.rs
    ├── windows.rs
    └── linux.rs
```

## 4. Overlay abstraction

Do not scatter Windows/Linux conditional code throughout the application.

Create a single platform-neutral interface.

Conceptually:

```rust
pub trait OverlayController {
    fn show(&self) -> Result<()>;
    fn hide(&self) -> Result<()>;
    fn toggle(&self) -> Result<()>;
    fn is_visible(&self) -> Result<bool>;

    fn set_position(&self, position: Position) -> Result<()>;
    fn set_size(&self, size: Size) -> Result<()>;

    fn set_interactive(&self, interactive: bool) -> Result<()>;
    fn focus(&self) -> Result<()>;
}
```

The application calls this abstraction.

It should not know whether it is running on Windows or Linux.

## 5. Overlay window model

Use a dedicated Tauri window for the overlay.

Conceptually:

```text
Tauri application
│
├── main
│   └── normal application window
│
└── overlay
    └── dedicated overlay window
```

The overlay window should normally be:

- hidden
- undecorated
- always-on-top while active
- positioned using saved coordinates
- pinned to one size (382x443, the same equal min/max trick as the main
  window), mirrored by `OVERLAY_DEFAULT_*` in `state.rs` so reset centers on
  the size the window actually holds
- interactive while visible
- excluded from the taskbar where appropriate

Do not destroy/recreate the overlay on every toggle.

Create it once and show/hide it.

This avoids state loss and unnecessary initialization.

## 6. Overlay lifecycle

```text
Application start
       │
       ▼
Create main window
       │
       ▼
Create hidden overlay window
       │
       ▼
Register global M shortcut
       │
       ▼
Application idle
       │
       ├── M pressed
       │      ↓
       │   show overlay
       │      ↓
       │   restore saved position/size
       │
       └── M pressed
              ↓
           hide overlay
```

## 7. Shared calculator state

Both windows edit one calculator state owned by Rust. `CalcState`
(`src-tauri/src/state.rs`) holds the raw input strings: `weaponId`,
`artilleryX`, `artilleryY`, `targetX`, `targetY`. Writes go through the
`set_calc_state` command, which stores the state and broadcasts
`calc-state-changed` to every window. Reads go through `get_calc_state`
on mount. `src/lib/useCalcState.ts` mirrors the state per window:
edits apply locally first so typing never lags, and the event echo is
the single path that reconciles both windows.

Nothing derived is ever shared. Each window runs `deriveCalcView`
(`src/calculator/derive.ts`), which resolves the weapon, parses the
inputs, shows errors only for non-empty invalid fields, and computes
the solution live. The main window renders `Calculator`, the overlay
renders `OverlayCalculator`; both are controlled components over the
same state.

## 8. Focus behavior

The overlay should receive keyboard/mouse events while the pointer is inside it.

Do not globally capture all mouse events.

The preferred model is ordinary OS window hit testing:

```text
Pointer inside overlay
        ↓
Overlay receives events

Pointer outside overlay
        ↓
Underlying game receives events
```

This is preferable to implementing a global mouse hook.

## 9. Global hotkey

Use the official Tauri global-shortcut plugin rather than implementing separate low-level keyboard hooks for the first version.

Register:

```text
M
```

as the default overlay toggle.

Important:

- allow the user to change the shortcut later
- detect registration failures
- show a settings error if another application owns the shortcut
- never silently pretend the shortcut is active when registration failed

The plugin supports Windows and Linux.

## 10. Game awareness

The first implementation does not need to identify WARDOGS.

The app can always register the hotkey.

However, overlay behavior should be controlled by an activation policy:

```text
Always available
      OR
Only when WARDOGS is foreground
```

Make this a future setting.

Do not make process detection a dependency of the MVP.

## 11. Optional foreground detection

Later, implement:

```text
Foreground application
        │
        ▼
Is this WARDOGS?
   │           │
  yes          no
   │           │
overlay       ignore
hotkey
```

This requires platform-specific process/window inspection.

Keep it behind an abstraction such as:

```rust
pub trait GameDetector {
    fn is_wardogs_foreground(&self) -> Result<bool>;
}
```

Do not couple it to the calculator.

## 12. Calculator math

`src/calculator/` is pure TypeScript with no React or Tauri imports, so the
math is testable without a browser or a running backend.

Coordinates are game-world grid units; one unit is 100 m on every map.

`solve()` (`src/calculator/solution.ts`) composes the pipeline:

```text
artillery + target grid coordinates
        ↓
distanceMeters + azimuthDegrees
        ↓
range check against the weapon envelope
        ↓
elevationMil per arc from the weapon firing tables
```

Weapon definitions and firing tables live in
`src/calculator/data/weapons.json`.

How inputs and solutions flow between windows is covered in section 7,
"Shared calculator state".

## 13. Configuration persistence

Persist:

- overlay position
- overlay size
- selected monitor if needed
- hotkey
- theme
- activation mode
- calculator preferences

Example:

```json
{
  "overlay": {
    "x": 1450,
    "y": 120,
    "width": 420,
    "height": 520
  },
  "hotkey": "Alt+M",
  "activationMode": "always"
}
```

Use a versioned configuration format so future releases can migrate settings.

## 14. Coordinate system

Do not assume WARDOGS coordinates are screen coordinates.

Keep game-world coordinates completely separate:

```text
GameCoordinate
    x
    y

ScreenPosition
    x
    y
```

This becomes especially important if the project later adds map clicking.

## 15. Future map mode

The architecture should leave room for a second interface:

```text
Manual coordinate mode
        +
Interactive map mode
```

Future flow:

```text
Click artillery on map
        ↓
Game coordinates

Click target on map
        ↓
Game coordinates

        ↓
Artillery calculator
        ↓
Bearing / distance / elevation
```

Do not implement map rendering in the first MVP.

## 16. Why Tauri

Tauri is a strong fit because the app is mostly UI with a small amount of native desktop functionality.

The web UI gives fast iteration for the calculator while Rust handles:

- windows
- shortcuts
- persistence
- platform-specific integration
- future game detection

Tauri's window API supports features such as always-on-top, transparency, monitor detection, positioning, and visibility. See the official API documentation.

## 17. Why not Electron

Electron would work, but it adds a full Chromium runtime and Node.js runtime.

The application does not need that much infrastructure.

Tauri gives the project:

- smaller native shell
- Rust native layer
- system WebView
- cross-platform packaging
- clean native integration

## 18. Why not a pure Rust UI

A pure Rust GUI is possible, but React/TypeScript is more productive for this application.

The UI will likely evolve rapidly:

- calculator
- presets
- settings
- map
- coordinate tools
- history
- profiles

React provides a large ecosystem for these interfaces.

## 19. Security model

The frontend should have minimal Tauri permissions.

Only enable capabilities needed by the application.

Avoid giving the WebView arbitrary shell access.

Native functionality should be exposed through small explicit commands.

For example:

```text
frontend
  ↓
toggle_overlay()
  ↓
Rust
  ↓
OverlayController
```

rather than allowing generic system execution.

## 20. Testing layers

### Calculator tests

Pure unit tests:

```text
coordinate input
      ↓
expected solution
```

### Rust tests

Test:

- state transitions
- configuration serialization
- overlay state machine

### Integration tests

Test:

```text
M
↓
overlay visible

M
↓
overlay hidden
```

### Manual platform tests

Windows:

- Windows 10/11
- borderless WARDOGS
- windowed WARDOGS
- multiple monitors

Linux:

- KDE Wayland
- X11 if supported
- WARDOGS through Proton
- single/multiple monitors
- different scaling factors
