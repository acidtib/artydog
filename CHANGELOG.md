*   Put the full calculator in the overlay, sharing one set of inputs with the
    main window.

    Typing, clearing a point or switching weapons in either window updates
    the other live, and the inputs survive hiding and showing the overlay.

    *acidtib*

*   Redesign both windows as a compact, fixed-size tool.

    The overlay, shortcut and update controls move into a settings dialog
    behind the cog in the main window's footer, and a dot on the cog marks an
    available update. The overlay drops its resize grip.

    *acidtib*

*   Report the calculator's state in a status strip.

    It names the point still missing, flags a coordinate that is not a
    number, and says how far out of range a target is, for example
    "Too far by 316 m".

    *acidtib*

*   Show the compass point next to the azimuth, as a check against firing at
    the mirror image of the target.

    *acidtib*

*   Accept only numbers in the coordinate fields, and add a button to clear
    each point.

    *acidtib*

*   Call the firing position "artillery" rather than "mortar", and default to
    the SPH-2.

    *acidtib*

*   Show failures as dismissible notices instead of a single error line, so a
    second failure is never hidden behind the first.

    *acidtib*

*   Send the main window to the tray when it is minimized, and bring it back
    reliably from the tray icon, including with a double click.

    *acidtib*

*   Stop the overlay controls from briefly reporting the overlay as hidden
    right after showing it.

    *acidtib*

*   Show a failed update check instead of staying silent.

    *acidtib*

## ArtyDog 0.1.3 (September 10, 2026) ##

*   Default the overlay shortcut to Alt+M and let it be rebound from the main
    window.

    A global shortcut is exclusive, so a bare M kept WARDOGS from ever
    opening its map.

    *acidtib*

## ArtyDog 0.1.2 (September 10, 2026) ##

*   Watch the toggle key instead of registering it as an exclusive shortcut,
    so the game still receives it.

    *acidtib*

## ArtyDog 0.1.1 (September 10, 2026) ##

*   First release.

    A calculator for the L81 Mortar and SPH-2 that turns artillery and target
    grid coordinates into distance, azimuth and elevation from the in-game
    firing tables.

    *acidtib*

*   Add an always-on-top overlay window, toggled by a global shortcut.

    It can be dragged and resized, remembers its position and size between
    runs, recovers to the primary monitor when its display is gone, and can
    be recentered from the main window.

    *acidtib*

*   Keep running in the tray when the main window is closed, and allow only
    one running copy of the app.

    *acidtib*

*   Offer updates from the main window and install them in place.

    *acidtib*
