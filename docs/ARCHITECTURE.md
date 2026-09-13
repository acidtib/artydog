# ArtyDog - Architecture

The repository is a pnpm workspace with two apps: `apps/desktop` (this app)
and `apps/website` (the website, which runs the calculator in the browser). Paths below are relative to
`apps/desktop/`.

## 1. High-level architecture

```text
                            ARTYDOG
                              │
                ┌─────────────┴─────────────┐
                │                           │
           Main Window               Overlay Window
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

```text
src-tauri/src/
├── lib.rs            # plugins, window events, command registration
├── commands.rs       # the only bridge between React and native code
├── state.rs          # AppState, geometry rules, CalcState
├── tray.rs           # tray icon and close-to-tray
├── overlay/
│   ├── mod.rs        # OverlayController trait
│   └── manager.rs
├── hotkey/
│   ├── mod.rs
│   └── manager.rs
├── config/
│   ├── mod.rs        # versioned config.json
│   └── persistence.rs
└── platform/
    ├── mod.rs
    ├── windows.rs
    ├── linux.rs
    └── fallback.rs
```

## 4. Overlay abstraction

Do not scatter Windows/Linux conditional code throughout the application.
All overlay behavior goes through one platform-neutral trait
(`src-tauri/src/overlay/mod.rs`):

```rust
pub trait OverlayController {
    fn show(&self) -> OverlayResult<()>;
    fn hide(&self) -> OverlayResult<()>;
    fn toggle(&self) -> OverlayResult<()>; // provided: hide if visible, else show
    fn is_visible(&self) -> OverlayResult<bool>;
    fn set_position(&self, x: i32, y: i32) -> OverlayResult<()>;
    fn set_size(&self, width: u32, height: u32) -> OverlayResult<()>;
    fn focus(&self) -> OverlayResult<()>;
    fn geometry(&self) -> OverlayResult<OverlayGeometry>;
}
```

Commands, the hotkey handler and the tray call this abstraction. Platform
differences live in `platform/`, selected with `cfg(target_os)`.

## 5. Window model

Two Tauri windows out of one process:

```text
Tauri application
│
├── main
│   └── compact calculator window
│
└── overlay
    └── dedicated overlay window
```

The main window is on the taskbar. Minimizing or closing it hides it to the
tray, so the shortcut keeps working; a tray click toggles it and quitting
goes through the tray menu. A second launch surfaces the running instance
instead of starting another.

The overlay window is:

- hidden at start
- undecorated
- always-on-top
- positioned using saved coordinates
- pinned to one size (382x443, the same equal min/max trick as the main
  window), mirrored by `OVERLAY_DEFAULT_*` in `state.rs` so reset centers on
  the size the window actually holds
- interactive while visible
- excluded from the taskbar

Do not destroy and recreate the overlay on every toggle. Create it once and
show/hide it, which avoids state loss and repeated initialization.

## 6. Overlay lifecycle

```text
Application start
       │
       ▼
Create main window and hidden overlay window
       │
       ▼
Register the toggle shortcut (Alt+M by default)
       │
       ▼
Application idle
       │
       ├── shortcut pressed
       │      ↓
       │   restore saved position, show overlay
       │
       └── shortcut pressed
              ↓
           hide overlay, save position
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
the solution and status live. The main window renders `Calculator`, the
overlay renders `OverlayCalculator`; both are controlled components over the
same state.

The state lives in memory for the life of the process and is not written to
disk.

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

The toggle uses the official Tauri global-shortcut plugin rather than
low-level keyboard hooks.

The default is `Alt+M`, not bare `M`: a registered shortcut is exclusive, and
WARDOGS binds `M` to its map. The user can rebind it in Settings. A failed
registration is reported there, and the app never pretends a shortcut is
active when registration failed.

Under native Wayland the shortcut does not fire; see `docs/OVERLAY.md`.

## 10. Game awareness

The app does not identify WARDOGS and always registers the hotkey.

A future setting may add an activation policy:

```text
Always available
      OR
Only when WARDOGS is foreground
```

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

`config.json` in the app config directory holds:

- overlay geometry (position, plus the fixed size)
- the toggle shortcut, once the user changes it

```json
{
  "schemaVersion": 1,
  "overlay": { "x": 1450, "y": 120, "width": 382, "height": 443 },
  "hotkey": "Alt+M"
}
```

The format is versioned so future releases can migrate settings. Future
settings such as theme or activation mode belong here too.

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

### Calculator and component tests

Vitest, run with `pnpm test`: pure unit tests for the math
(`coordinate input → expected solution`, pinned to the reference vectors in
`docs/BALLISTICS.md`), plus component and hook tests with the Tauri API
mocked.

### Rust tests

`cargo test`, covering:

- geometry clamping and recentering
- configuration and `CalcState` serialization
- the overlay toggle decision
- tray click handling
- the overlay size staying in step with `tauri.conf.json`

### Manual platform tests

The Windows and KDE Wayland checklists live in `docs/OVERLAY.md`.
