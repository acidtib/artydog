*   Keep the overlay at a stable size across hide and show cycles: the restore
    path read the outer window size but wrote it back as the client area, so an
    undecorated window grew by its hidden border on every cycle.

    *[acidtib](https://github.com/acidtib)*

## ArtyDog 0.2.2 (September 13, 2026) ##

*   Ignore Rust build output in the desktop dev server's file watcher, so
    cargo writes no longer trigger needless reloads.

*   Hide the settings cog in the website's calculator demo, since the browser
    version has no settings.

*   Pin both windows with `resizable: false` instead of equal min and max
    bounds, at `382x477` for the main window and `382x444` for the overlay.

    *[acidtib](https://github.com/acidtib)*

*   Run the Rust CI jobs only when the Rust backend changes, and skip CI for
    changes that only touch Markdown or docs.

    *[acidtib](https://github.com/acidtib)*

*   Add an `llms.txt` to the website, so AI agents can learn what ArtyDog is
    and where its docs live.

*   Add Cloudflare Web Analytics to the website.

*   Prerender the website, so search engines and link previews see its content
    without running JavaScript.

    Also add a sitemap, a robots.txt, a canonical link, structured data for
    the app, a shorter meta description, and a 404 page.

    *[acidtib](https://github.com/acidtib)*

## ArtyDog 0.2.1 (September 13, 2026) ##

*   Give the website favicons at 16, 32 and 180 px.

*   Give the app, tray and website the ArtyDog icon: a dog's head inside a
    rangefinder reticle.

    *[acidtib](https://github.com/acidtib)*

*   Add contributing guidelines, a pull request template, and a check that
    every pull request adds a changelog entry.

    *[acidtib](https://github.com/acidtib)*

## ArtyDog 0.2.0 (September 13, 2026) ##

*   Put the full calculator in the overlay, sharing one set of inputs with the
    main window.

    Typing, clearing a point or switching weapons in either window updates
    the other live, and the inputs survive hiding and showing the overlay.

    *[acidtib](https://github.com/acidtib)*

*   Redesign both windows as a compact, fixed-size tool.

    The overlay, shortcut and update controls move into a settings dialog
    behind the cog in the main window's footer, and a dot on the cog marks an
    available update. The overlay drops its resize grip.

    *[acidtib](https://github.com/acidtib)*

*   Report the calculator's state in a status strip.

    It names the point still missing, flags a coordinate that is not a
    number, and says how far out of range a target is, for example
    "Too far by 316 m".

    *[acidtib](https://github.com/acidtib)*

*   Show the compass point next to the azimuth, as a check against firing at
    the mirror image of the target.

    *[acidtib](https://github.com/acidtib)*

*   Accept only numbers in the coordinate fields, and add a button to clear
    each point.

    *[acidtib](https://github.com/acidtib)*

*   Call the firing position "artillery" rather than "mortar", and default to
    the SPH-2.

    *[acidtib](https://github.com/acidtib)*

*   Show failures as dismissible notices instead of a single error line, so a
    second failure is never hidden behind the first.

    *[acidtib](https://github.com/acidtib)*

*   Send the main window to the tray when it is minimized, and bring it back
    reliably from the tray icon, including with a double click.

    *[acidtib](https://github.com/acidtib)*

*   Stop the overlay controls from briefly reporting the overlay as hidden
    right after showing it.

    *[acidtib](https://github.com/acidtib)*

*   Show a failed update check instead of staying silent.

    *[acidtib](https://github.com/acidtib)*

## ArtyDog 0.1.3 (September 10, 2026) ##

*   Default the overlay shortcut to Alt+M and let it be rebound from the main
    window.

    A global shortcut is exclusive, so a bare M kept WARDOGS from ever
    opening its map.

    *[acidtib](https://github.com/acidtib)*

## ArtyDog 0.1.2 (September 10, 2026) ##

*   Watch the toggle key instead of registering it as an exclusive shortcut,
    so the game still receives it.

    *[acidtib](https://github.com/acidtib)*

## ArtyDog 0.1.1 (September 10, 2026) ##

*   First release.

    A calculator for the L81 Mortar and SPH-2 that turns artillery and target
    grid coordinates into distance, azimuth and elevation from the in-game
    firing tables.

    *[acidtib](https://github.com/acidtib)*

*   Add an always-on-top overlay window, toggled by a global shortcut.

    It can be dragged and resized, remembers its position and size between
    runs, recovers to the primary monitor when its display is gone, and can
    be recentered from the main window.

    *[acidtib](https://github.com/acidtib)*

*   Keep running in the tray when the main window is closed, and allow only
    one running copy of the app.

    *[acidtib](https://github.com/acidtib)*

*   Offer updates from the main window and install them in place.

    *[acidtib](https://github.com/acidtib)*
