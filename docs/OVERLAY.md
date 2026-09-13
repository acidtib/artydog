# ArtyDog - Overlay Technical Design

## Goal

An overlay that behaves like a small interactive desktop window sitting above WARDOGS.

It is **not** a game injection system.

It is an ordinary native desktop window controlled by the calculator application.

## Window model

Two Tauri windows:

```text
main
overlay
```

### Main

Compact calculator window.

Properties:

- undecorated, with its own header (drag region, minimize, close)
- fixed size, 382x477
- taskbar visible
- minimize and close hide it to the tray

### Overlay

Specialized presentation window.

Properties:

- hidden initially
- undecorated, with a drag bar and a hide button
- always-on-top
- fixed size, 382x444
- saved position
- interactive
- no taskbar entry
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

Native visibility is the source of truth. Do not track extra intermediate
states unless a platform forces it.

## The toggle shortcut

The default is `Alt+M`, not bare `M`.

A registered global shortcut is exclusive on every platform: the OS routes
the key to the registering application and the foreground one never sees it.
WARDOGS binds bare `M` to its map, so claiming `M` stopped the map from
opening at all while ArtyDog ran. The modifier keeps the two apart.

The shortcut is stored in `config.json` and rebound from **Settings >
Shortcut**, which captures the next key combination pressed. Rebinding
releases the old shortcut before claiming the new one, and a shortcut the OS
refuses leaves the previous one in place rather than dropping the toggle
entirely.

Anything bound here is taken from the game for as long as ArtyDog runs, so a
user who rebinds onto a key WARDOGS needs will lose it in game. That is their
choice to make; the default avoids it.

## Commands

The frontend gets a small native API (`src-tauri/src/commands.rs`):

```text
show_overlay()
hide_overlay()
toggle_overlay()
get_overlay_state()
get_overlay_geometry()
set_overlay_position()
set_overlay_size()
reset_overlay_geometry()
get_hotkey_status()
set_hotkey()
get_calc_state()
set_calc_state()
```

Show, hide and toggle return the requested visibility rather than re-reading
it, because the window manager may still be mapping the window.

Do not expose arbitrary window-management operations to the frontend.

## Events

```text
overlay-visibility    every show or hide, whoever asked for it
calc-state-changed    every calculator write, to both windows
```

The frontend treats these events as the truth and uses them to keep React
state synchronized.

## Focus

When the overlay is shown:

1. Restore its saved geometry.
2. Show the overlay.
3. Bring it above the game.
4. Focus it, best effort.
5. Allow normal mouse interaction.

When hidden:

1. Hide it.
2. Save its geometry.
3. Do not terminate the process.
4. Do not destroy calculator state.

Avoid aggressive focus stealing. A compositor that declines activation is
logged, not treated as a failure.

The exact focus behavior should be tested with WARDOGS because game focus handling can vary by window mode.

## Mouse behavior

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

The overlay is an opaque compact panel. Transparency is deferred.

This avoids making the Windows/Linux implementation dependent on
transparent-window behavior. Tauri documents transparency support, but
platform behavior differs; keep it optional if it is ever added.

## Game window modes

Target:

1. Borderless windowed
2. Normal windowed

Do not make exclusive fullscreen a requirement.

Borderless/windowed mode provides the most predictable environment for companion overlays.

## Linux

Primary target:

```text
KDE Plasma
Wayland
```

Use the generic Tauri implementation first. If KDE/Wayland requires native
handling for a specific operation, isolate it in:

```text
platform/linux.rs
```

Potential responsibilities:

- foreground window detection
- compositor-specific positioning workarounds
- native window metadata
- focus behavior

Do not add X11 dependencies unless an actual requirement is demonstrated.

### Known limitation: the global hotkey

`global-hotkey` grabs through X11, so the shortcut does not fire under native
Wayland. Confirmed on KDE Plasma. The tray menu and **Settings > Overlay**
work regardless, and the hotkey does fire under XWayland
(`GDK_BACKEND=x11`).

This is not currently worth a workaround: WARDOGS has no full Linux support,
so the overlay has no game to sit over here. A fix
would need a compositor-specific shortcut registration in `platform/linux.rs`,
for example KWin's global shortcut DBus interface.

## X11

X11 is a compatibility target rather than the primary Linux implementation.
The generic Tauri implementation covers it; no special X11 code exists.

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

Overlay behavior goes through `OverlayController` (see
`docs/ARCHITECTURE.md`). The platform module is selected at compile time:

```rust
#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "linux")]
mod linux;

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
mod fallback;
```

The shared overlay manager decides **what** should happen.

The platform module decides **how** the operating system accomplishes it.

## Failure handling

The overlay must fail gracefully.

### WARDOGS closed

The app keeps working normally.

### Saved monitor disconnected

The overlay moves to the primary monitor.

### Hotkey registration fails

Settings shows the error and lets the user choose another shortcut.

### Overlay cannot focus

It stays visible rather than failing.

### Game changes resolution

The overlay does not resize.

## Overlay geometry

Geometry is stored in physical pixels and always has to account for:

- monitor scale factor
- DPI
- multiple monitors
- monitor origin
- negative monitor coordinates

Do not assume monitor 0 begins at `(0, 0)`.

### Implemented behavior

No monitor identifier is stored. The saved rectangle is checked against the
monitors that exist at show time instead, which needs no stable monitor name
and handles a rearranged desktop as well as a disconnected one:

- Size is held between `OVERLAY_MIN_WIDTH`/`OVERLAY_MIN_HEIGHT` and the
  largest monitor. The window is pinned, so in practice this keeps the saved
  size equal to the fixed one.
- Geometry that leaves less than `MIN_VISIBLE` px of the overlay on any
  monitor is recentered on the primary one. The overlay is undecorated, so an
  off-screen one cannot be dragged back.
- The user can also recenter on demand from **Settings > Overlay**
  (`reset_overlay_geometry`).

Geometry is held in memory while the overlay moves, and written to
`config.json` in the app config directory on hide, on an explicit
position/size command, and on quit from the tray. A drag emits far too many
move events to write each one.

## Testing checklist

### Windows

- [ ] Overlay over WARDOGS windowed
- [ ] Overlay over WARDOGS borderless
- [ ] Click text field
- [ ] Type coordinates
- [ ] Move pointer outside
- [ ] Interact with WARDOGS
- [ ] Press the shortcut to hide
- [ ] Press the shortcut to show
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
- [ ] Shortcut toggle (expected to fail under native Wayland, see above)
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
