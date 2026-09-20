# Wasteland Survivor v0.9 — Portrait Reframe

This build reframes the existing Wasteland Survivor prototype around a **9:16 portrait, one-thumb mobile layout**. The underlying run/build economy is retained, but road combat, scavenging, route selection, backpack management, vehicle bay and town UX are redesigned for portrait play.

## What changed

- Native internal canvas changed to **540×960 (9:16)**.
- Road combat is now a vertical scrolling wasteland road: the Junker stays in the lower screen while raiders, mines and fire come from ahead.
- Machine gun, 105mm cannon and rockets remain automatic. The player focuses on movement and dodging.
- Scavenging is now a vertical push from the vehicle at the bottom toward richer/deeper areas above.
- **Dynamic joystick**: on touch devices, press/drag anywhere in the lower gameplay region. There is no permanent joystick or Action button.
- Crates still auto-search with a progress bar; leaving range cancels the search.
- Returning to the Junker auto-fills the evacuation progress bar.
- Route map is now a portrait branching road map.
- Backpack and Vehicle Bay are portrait grids with drag/drop, adjacency and duplicate fusion to Lv.3.
- Rustwater is rebuilt as a portrait safe-zone hub.
- Fuel, Dry Run penalties, equipment selling, backpack expansion and vehicle bay expansion remain part of the run economy.
- Added local save through `localStorage`.

## iPhone / PWA support

This build includes:

- `manifest.webmanifest`
- portrait orientation preference
- Apple mobile web app tags
- iPhone safe-area / notch padding
- standalone home-screen icons
- service-worker offline cache
- disabled page zoom/scroll gestures while playing

For iPhone testing, host this folder on any static HTTPS host (GitHub Pages, Cloudflare Pages, Netlify, etc.), open it in Safari, then choose **Share → Add to Home Screen**.

## Controls

### iPhone / touch

- Road combat: drag in the lower part of the screen to steer.
- Scavenging: drag in the lower part of the screen to move.
- Crates: stand near them; searching starts automatically.
- Evacuation: return to the Junker and remain close until the bar fills.
- Backpack / Vehicle Bay: drag modules directly on the grid. Drop a duplicate onto the same item to fuse it.

### Desktop

- `WASD` / arrow keys: movement.
- Mouse/touch drag in lower gameplay area also works.
- `Enter` / `Space`: advance on basic transition screens.
- `B` / `I`: Backpack from route screen.
- `V`: Vehicle Bay from route screen.

## Current prototype goal

The purpose of v0.9 is not content expansion. It tests whether the entire game becomes more coherent when every layer shares one mobile interaction language:

**drag to move → auto-fire / auto-interact → tap route/build/town decisions.**

If that holds up on a real iPhone, the next development pass can safely build content, encounters and art around portrait-first constraints.
