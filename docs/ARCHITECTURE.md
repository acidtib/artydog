# ArtyDog - Architecture

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
│   ├── Calculator.tsx
│   ├── CoordinateInput.tsx
│   ├── ResultPanel.tsx
│   ├── OverlayControls.tsx
│   └── Settings.tsx
│
├── calculator/
│   ├── types.ts
│   ├── distance.ts
│   ├── bearing.ts
│   ├── elevation.ts
│   └── solution.ts
│
├── state/
│   └── calculatorStore.ts
│
├── App.tsx
└── main.tsx
```

Keep calculator math independent from React.

The math should be testable without a browser or Tauri.

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
- resizable only when the user is configuring it
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

## 7. Focus behavior

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

## 8. Global hotkey

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

## 9. Game awareness

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

## 10. Optional foreground detection

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

## 11. Calculator state

Use a shared application state model:

```ts
type Coordinate = {
  x: number;
  y: number;
};

type CalculatorState = {
  mortar: Coordinate;
  target: Coordinate;
  solution: Solution | null;
};
```

The state exists independently of the current window.

Both the normal window and overlay consume the same state.

## 12. Configuration persistence

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
  "hotkey": "M",
  "activationMode": "always"
}
```

Use a versioned configuration format so future releases can migrate settings.

## 13. Coordinate system

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

## 14. Future map mode

The architecture should leave room for a second interface:

```text
Manual coordinate mode
        +
Interactive map mode
```

Future flow:

```text
Click mortar on map
        ↓
Game coordinates

Click target on map
        ↓
Game coordinates

        ↓
Mortar calculator
        ↓
Bearing / distance / elevation
```

Do not implement map rendering in the first MVP.

## 15. Why Tauri

Tauri is a strong fit because the app is mostly UI with a small amount of native desktop functionality.

The web UI gives fast iteration for the calculator while Rust handles:

- windows
- shortcuts
- persistence
- platform-specific integration
- future game detection

Tauri's window API supports features such as always-on-top, transparency, monitor detection, positioning, and visibility. See the official API documentation.

## 16. Why not Electron

Electron would work, but it adds a full Chromium runtime and Node.js runtime.

The application does not need that much infrastructure.

Tauri gives the project:

- smaller native shell
- Rust native layer
- system WebView
- cross-platform packaging
- clean native integration

## 17. Why not a pure Rust UI

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

## 18. Security model

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

## 19. Testing layers

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
