# ArtyDog - Implementation Milestones

The project should be implemented in this order.

## Milestone 0 - Project bootstrap

Create:

- Tauri 2 application
- React
- TypeScript
- Vite
- Rust backend
- Tailwind CSS
- formatting/linting
- basic CI

Verify the project builds on Linux.

Do not implement calculator logic yet.

### Done when

```text
pnpm tauri dev
```

starts the application successfully.

---

## Milestone 1 - Normal desktop calculator

Build the normal application window.

Implement:

- mortar X/Y inputs
- target X/Y inputs
- calculate button
- result panel
- validation
- keyboard navigation

Keep all math in a pure TypeScript module.

### Done when

The calculator works completely as a normal desktop application.

---

## Milestone 2 - Overlay proof of concept

This is the most important milestone.

Create a second Tauri window:

```text
main
overlay
```

The overlay should:

- be hidden by default
- be undecorated
- be always-on-top
- have a fixed test size
- be positioned manually
- show/hide without restarting the app

Add a temporary UI:

```text
WARDOGS OVERLAY TEST
```

Do not build the final calculator UI yet.

### Done when

The user can run WARDOGS and place the overlay above it.

---

## Milestone 3 - Global M hotkey

Add the Tauri global-shortcut plugin.

Default:

```text
M
```

Behavior:

```text
M → show overlay
M → hide overlay
```

Handle registration errors.

Do not implement WARDOGS process detection yet.

### Done when

M reliably toggles the overlay while WARDOGS has focus.

---

## Milestone 4 - Interactive overlay

Make the overlay interactive.

Verify:

```text
Mouse over overlay
    ↓
overlay receives mouse input

Mouse outside overlay
    ↓
WARDOGS receives input
```

Test:

- text input
- buttons
- mouse clicks
- scrolling
- keyboard focus

### Done when

The user can type coordinates into the overlay without losing normal game control when the pointer leaves it.

---

## Milestone 5 - Overlay positioning

Implement:

- drag
- resize
- saved position
- saved size
- monitor detection
- recovery when a saved monitor no longer exists

Handle DPI/scaling correctly.

### Done when

The user can position the calculator once and have it return to that location later.

---

## Milestone 6 - Real calculator

Replace the test UI with the real calculator.

Implement:

```text
Mortar X
Mortar Y

Target X
Target Y

        ↓

Distance
Bearing
Elevation
```

Keep the ballistic model isolated from the UI.

### Done when

Known test coordinates produce known expected results.

---

## Milestone 7 - Normal/overlay shared state

Ensure both windows use the same calculator state.

Example:

```text
Normal window
X = 1234
Y = 5678

       ↓

Overlay

X = 1234
Y = 5678
```

Changes made in either presentation should update the shared state.

---

## Milestone 8 - Settings

Add:

- hotkey configuration
- overlay size
- overlay position
- theme
- startup behavior
- overlay activation mode

Potential activation modes:

```text
Always
WARDOGS foreground only
```

Only implement foreground detection after the basic overlay is stable.

---

## Milestone 9 - Windows platform implementation

Validate on Windows.

Test:

- WARDOGS windowed
- WARDOGS borderless
- multiple monitors
- DPI scaling
- focus changes
- alt-tab
- minimizing WARDOGS
- closing WARDOGS

The overlay should never remain stranded on a nonexistent or hidden game state.

Use platform-specific Rust only where the generic Tauri API is insufficient.

---

## Milestone 10 - KDE Wayland implementation

Validate on:

```text
KDE Plasma
Wayland
CachyOS
WARDOGS via Proton
```

Test:

- WARDOGS windowed
- borderless
- multiple monitors
- fractional scaling
- fullscreen
- alt-tab
- desktop switching
- overlay positioning
- mouse interaction

This milestone is deliberately separate because Wayland window-management behavior is compositor-controlled and can differ substantially from Windows/X11.

If a required behavior cannot be implemented generically through Tauri, isolate the workaround inside:

```text
src-tauri/src/platform/linux.rs
```

Do not contaminate the rest of the codebase with Linux-specific conditionals.

---

## Milestone 11 - Game detection

Optional.

Implement WARDOGS foreground detection.

The desired behavior:

```text
WARDOGS foreground
        +
M pressed
        ↓
show overlay
```

If another application is foreground:

```text
M pressed
        ↓
do nothing
```

Make this configurable.

---

## Milestone 12 - Polish

Add:

- animations
- compact overlay mode
- larger desktop mode
- keyboard-first navigation
- presets
- recent coordinates
- copy result
- reset button
- configurable opacity if platform permits it
- tray application mode

Keep the overlay extremely lightweight.

---

## Milestone 13 - Packaging

Build:

### Windows

- NSIS installer
- optional MSI
- signed executable when signing infrastructure is available

### Linux

Start with:

- AppImage

Then consider:

- `.deb`
- Arch package/AUR

Tauri supports Windows and Linux application builds. For Windows packaging, build natively on Windows or use CI rather than relying on Linux cross-compilation for the release pipeline.

---

## Milestone 14 - CI

Recommended GitHub Actions matrix:

```text
ubuntu-latest
windows-latest
```

Run:

- frontend tests
- Rust tests
- lint
- formatting checks
- Tauri build

Release pipeline:

```text
git tag v0.1.0
        ↓
GitHub Actions
        ↓
Windows installer
Linux AppImage
        ↓
GitHub Release
```

---

# Definition of MVP

MVP is complete when all of the following are true:

- [ ] Application launches normally.
- [ ] Calculator works as a normal desktop application.
- [ ] WARDOGS can run independently.
- [ ] M toggles the overlay.
- [ ] Overlay appears above WARDOGS.
- [ ] Overlay is interactive.
- [ ] Pointer outside overlay can interact with WARDOGS.
- [ ] Overlay position persists.
- [ ] Overlay size persists.
- [ ] Calculator state persists while toggling overlay.
- [ ] Works on Windows.
- [ ] Works on KDE Wayland Linux.
- [ ] No game process injection is required.
- [ ] No WARDOGS files need to be modified.
- [ ] No WARDOGS memory access is required.

# Post-MVP

Potential future features:

1. Interactive WARDOGS map.
2. Click mortar position.
3. Click target position.
4. Automatic coordinate conversion.
5. Mortar presets.
6. Weapon-specific ballistic profiles.
7. Range tables.
8. Spotter mode.
9. Saved firing solutions.
10. Team/shared solutions.
11. Coordinate clipboard integration.
12. Optional game foreground detection.
