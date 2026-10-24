# Moon Rescue — Roadmap

Feature requests and design notes. Items marked **DONE** are implemented; everything else is still just a request.

## Static, hand-authored levels — DONE

Levels are no longer procedurally generated at runtime. Each level is a static JSON file under `src/levels/` (currently `site-kappa.json`), loaded by `src/world/levelLoader.js` into the same `world` shape the game expects. The old procedural generator (`src/world/maze.js`) is unused by the game now but kept around in case a "random mission" mode is wanted later.

Format: `{ id, name, cellSize, homeRow, tiles: ["#.." rows], start: {x,y}, miners: [{x,y}], fuelPickups: [{x,y,amount}], ...tunables }` — tunables are the same flat fields as `src/tuning.js` (gravity, thrustAccel, fuelMax, etc).

## Fuel pickups in the maze — DONE

Levels place fuel canisters (`fuelPickups` in the level JSON) at specific points; flying near one tops up fuel and plays a distinct sound (`src/entities/fuelPickup.js`).

## Level editor — DONE (v1)

Open `editor.html` (separate page, `pnpm run dev` then visit `/editor.html`). Canvas-based grid painter with tools for Wall/Open/Home Row/Start/Miner/Fuel, a tunables form (reuses `src/tuning.js`), grid resize, and New/Open/Save/Save As using the File System Access API (falls back to file-input/download in browsers without it). "Playtest" opens the game in a new tab with the in-progress (even unsaved) level via `sessionStorage`, no save required first.

Not done yet, worth revisiting:
- No undo/redo.
- No zoom — large grids just scroll.
- No level-select screen in the game itself; it always loads `LEVELS[0]`. Needed once there's more than one level.
- No validation that a level is actually completable (reachable miners, reachable home row, etc.) — editor won't warn you if you paint yourself into an unwinnable level.

## Advanced hazards/mechanics (later levels)

Once static levels exist, later ones can introduce new tile/entity types:
- Exploding walls
- Moving walls
- Conveyor belts
- Gravity wells
- Portals
- Closing gates, timed, and switched
- pushable/rollable objects?
- gravity shifts - the entire world slowly rotates, and down is always where gravity is pulling
- lava
- hostiles, creatures

Each of these needs its own simulation + render logic, plus editor support to place/configure them; none exist yet even as stubs.

## Level design feel

- Long stretches of committed descent before anything interesting happens — the trip down should feel like it matters.
- Miners clustered together in a few dense pockets, rather than one-per-room spread evenly through the whole maze.
- Overall: deep and purposeful rather than wide and sparse.

`site-kappa.json` (generated once by script, then hand-fixable in the editor) follows this: one long winding shaft with two small fuel alcoves, opening into one big chamber with all 6 miners clustered together at the bottom.
