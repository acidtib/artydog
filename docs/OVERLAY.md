# ArtyDog - Overlay Technical Design

## Goal

Implement an overlay that behaves like a small interactive desktop window sitting above WARDOGS.

It is **not** a game injection system.

It should be an ordinary native desktop window controlled by the calculator application.

## Window model

Create two Tauri windows:

```text
main
overlay
```

### Main

Normal desktop application.

Properties:

- decorated
- resizable
- taskbar visible
- normal focus behavior

### Overlay

Specialized presentation window.

Properties:

- hidden initially
- undecorated
- always-on-top
- saved position
- saved size
- interactive
- no taskbar entry when appropriate
- owned by the same application process

Tauri's window APIs expose always-on-top, visibility, positioning, size, monitor lookup, and transparency controls.

## Overlay state machine

```text
                  ┌──────────────┐
                  │    HIDDEN    │
                  └──────┬───────┘
                         │
                         │ toggle
                         ▼
                  ┌──────────────┐
                  │    VISIBLE   │
                  └──────┬───────┘
                         │
                         │ toggle
                         ▼
                  ┌──────────────┐
                  │    HIDDEN    │
                  └──────────────┘
```

Additional states may be tracked internally:

```text
Hidden
Showing
Visible
Hiding
Error
```

Do not overcomplicate the initial implementation.

## Overlay commands

Expose a small native API:

```text
show_overlay()
hide_overlay()
toggle_overlay()
get_overlay_state()
set_overlay_position()
set_overlay_size()
```

Do not expose arbitrary window-management operations to the frontend.

## Overlay events

Frontend should receive:

```text
overlay:shown
overlay:hidden
overlay:position-changed
overlay:size-changed
```

Use these to keep React state synchronized.

## Focus

When the overlay is shown:

1. Show the overlay.
2. Restore its saved geometry.
3. Bring it above the game.
4. Focus it if needed.
5. Allow normal mouse interaction.

When hidden:

1. Hide it.
2. Do not terminate the process.
3. Do not destroy calculator state.

Avoid aggressive focus stealing.

The exact focus behavior should be tested with WARDOGS because game focus handling can vary by window mode.

## Mouse behavior

The default MVP behavior is:

```text
┌───────────────────────────────┐
│             GAME              │
│                               │
│      ┌──────────────────┐     │
│      │    OVERLAY       │     │
│      │                  │     │
│      │    interactive   │     │
│      └──────────────────┘     │
│                               │
└───────────────────────────────┘
```

The overlay receives input only within its own bounds.

Do not implement global mouse capture.

Do not continuously reposition the cursor.

Do not synthesize mouse events into WARDOGS.

## Transparency

Do not require a transparent overlay for MVP.

Start with an opaque compact panel.

Example:

```text
┌─────────────────────┐
│ MORTAR              │
│                     │
│ X [1234] Y [5678]   │
│                     │
│ TARGET              │
│ X [2345] Y [6789]   │
│                     │
│ 842m  127°  43°     │
└─────────────────────┘
```

Transparency can be added later.

This avoids making the first Windows/Linux implementation dependent on transparent-window behavior.

Tauri documents transparency support, but platform behavior differs; keep it optional.

## Game window modes

MVP should target:

1. Borderless windowed
2. Normal windowed

Do not make exclusive fullscreen a requirement.

Document that borderless/windowed mode provides the most predictable environment for companion overlays.

## Linux

Primary target:

```text
KDE Plasma
Wayland
```

The generic implementation should be attempted first.

If KDE/Wayland requires native handling for a specific operation, isolate it in:

```text
platform/linux.rs
```

Potential responsibilities:

- foreground window detection
- compositor-specific positioning workarounds
- native window metadata
- focus behavior

Do not add X11 dependencies unless an actual requirement is demonstrated.

## X11

X11 support should be treated as a compatibility target rather than the primary Linux implementation.

If the generic Tauri implementation works, no special X11 code is necessary.

## Windows

Keep Windows-specific logic inside:

```text
platform/windows.rs
```

Potential responsibilities:

- foreground window detection
- process/window identification
- native z-order behavior if required
- focus workarounds

Do not use Windows APIs in shared application logic.

## Platform abstraction

Recommended structure:

```rust
pub trait PlatformOverlay {
    fn show(&self) -> Result<()>;
    fn hide(&self) -> Result<()>;
    fn toggle(&self) -> Result<()>;
    fn set_position(&self, x: i32, y: i32) -> Result<()>;
    fn set_size(&self, width: u32, height: u32) -> Result<()>;
}
```

Then:

```rust
#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "linux")]
mod linux;
```

The shared overlay manager decides **what** should happen.

The platform module decides **how** the operating system accomplishes it.

## Failure handling

The overlay must fail gracefully.

Examples:

### WARDOGS closed

The app should continue working normally.

### Saved monitor disconnected

Move the overlay to the primary monitor.

### Hotkey registration fails

Show a settings warning and allow the user to choose another shortcut.

### Overlay cannot focus

Keep it visible rather than crashing.

### Game changes resolution

Do not assume the overlay must resize automatically.

## Overlay geometry

Store logical or physical coordinates consistently.

Always account for:

- monitor scale factor
- DPI
- multiple monitors
- monitor origin
- negative monitor coordinates
- monitor rotation if applicable

Do not assume monitor 0 begins at `(0, 0)`.

## Overlay configuration

```rust
struct OverlayConfig {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    monitor_id: Option<String>,
}
```

The exact monitor identifier should be treated as implementation detail.

## Testing checklist

### Windows

- [ ] Overlay over WARDOGS windowed
- [ ] Overlay over WARDOGS borderless
- [ ] Click text field
- [ ] Type coordinates
- [ ] Move pointer outside
- [ ] Interact with WARDOGS
- [ ] Press M to hide
- [ ] Press M to show
- [ ] Alt-tab
- [ ] Minimize game
- [ ] Restore game
- [ ] Multiple monitors
- [ ] 100% scaling
- [ ] 125% scaling
- [ ] 150% scaling

### KDE Wayland

- [ ] Overlay over WARDOGS through Proton
- [ ] Windowed mode
- [ ] Borderless mode
- [ ] Click text field
- [ ] Move pointer outside
- [ ] Return focus to game
- [ ] M toggle
- [ ] Alt-tab
- [ ] Multiple monitors
- [ ] Fractional scaling
- [ ] Game resolution changes

## Critical engineering rule

Do not promise that every combination of Wayland compositor + game fullscreen mode + Proton configuration will behave identically.

The overlay abstraction exists specifically so platform differences can be isolated without changing the calculator.

## Official references

Tauri window API:
https://tauri.app/reference/javascript/api/namespacewindow/

Tauri window customization:
https://tauri.app/learn/window-customization/

Tauri global shortcut:
https://v2.tauri.app/plugin/global-shortcut/
