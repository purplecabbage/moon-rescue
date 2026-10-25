# Moon Rescue — Roadmap

Feature requests and design notes. Items marked **DONE** are implemented; everything else is still just a request.

## Static, hand-authored levels — DONE

Levels are no longer procedurally generated at runtime. Each level is a static JSON file under `src/levels/`, loaded by `src/world/levelLoader.js` into the same `world` shape the game expects. The old procedural generator (`src/world/maze.js`) is unused by the game now but kept around in case a "random mission" mode is wanted later.

Format: `{ id, name, cellSize, homeRow, tiles: ["#.." rows], start: {x,y}, miners: [{x,y}], fuelPickups: [{x,y,amount}], audio: {...}, ...tunables }` — tunables are the same flat fields as `src/tuning.js` (gravity, thrustAccel, fuelMax, etc). `audio` is the per-level drone/percussion config (see below).

## Six-level campaign with progression — DONE

`src/levels.js` registers six levels in mission order: Site Alpha → Beta → Gamma → Delta → Epsilon → Kappa. Alpha through Epsilon were authored with a one-off script (`buildTiles` over hand-picked shaft keyframes, same "V-shaft into a chamber" shape as Kappa) and gently ramp difficulty — gravity 45→55, thrust 185→166, wall tolerance 110→91, lives 4→3, miner count 3→6 — then hand-checked for full tile connectivity and valid start/miner/fuel placement.

`src/progress.js` tracks completion in `localStorage` (`moonrescue.completed`). The first level is always unlocked; each later one unlocks once the level immediately before it is completed, and completed levels stay replayable forever. The game now boots into a level-select screen (`panel-select` in `index.html`, rendered by `src/ui/levelSelect.js`) showing lock/complete/best-time status for all six; "Next Mission ▶" appears on the win screen once a level is cleared, and "◀ Level Select" is reachable from both the mission brief and the win screen. The editor's `?levelFile=`/`?playtest=1` routes bypass level-select entirely, same as before.

## Mission timer + per-level leaderboard — DONE

The goal per level is now rescue time, not just survival. A mission clock (`GameScene.elapsedMs`) starts on launch, keeps running through crash/respawn pauses, and freezes only while the Tuning Console is open; it's shown live in the HUD and on the win screen (`src/leaderboard.js` has the `m:ss.cc` formatting shared by HUD and leaderboard UI).

`src/leaderboard.js` keeps the top 10 times per level (`moonrescue.leaderboard.<levelId>` in `localStorage`). A win that would make the top 10 prompts a 3-letter initials entry (`src/ui/leaderboardUI.js`) before saving; the board is shown on both the mission brief (so you know the target going in) and the win screen.

## Drone/audio editor — DONE

The level editor has a "DRONE & AUDIO" panel for tuning each level's atmosphere: up to 6 drone voices (frequency/waveform/gain each), tempo and spacing for the hi-hat and bass-drum percussion, and echo/reverb amount — schema and defaults in `src/audio/audioConfig.js`. "Enable Audio Preview" lets you hear changes live while editing (`sfx.applyAudioConfig`/`setDroneVoiceParam`/`setDelay`/`setReverbWet` in `src/audio/soundfx.js`), with "Test Hi-hat"/"Test Bass" buttons to preview the percussion on demand. Saved levels carry their own `audio` block; `GameScene` passes it to `sfx.init()` on launch instead of always using one hardcoded sound.

## Fuel pickups in the maze — DONE

Levels place fuel canisters (`fuelPickups` in the level JSON) at specific points; flying near one tops up fuel and plays a distinct sound (`src/entities/fuelPickup.js`).

## Level editor — DONE (v1)

Open `editor.html` (separate page, `pnpm run dev` then visit `/editor.html`). Canvas-based grid painter with tools for Wall/Open/Home Row/Start/Miner/Fuel, a tunables form (reuses `src/tuning.js`), grid resize, and New/Open/Save/Save As using the File System Access API (falls back to file-input/download in browsers without it). "Playtest" opens the game in a new tab with the in-progress (even unsaved) level via `sessionStorage`, no save required first.

Not done yet, worth revisiting:
- No undo/redo.
- No zoom — large grids just scroll.
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
- magnetic fields that pull the ship toward them

Each of these needs its own simulation + render logic, plus editor support to place/configure them; none exist yet even as stubs.

## Level design feel

- Long stretches of committed descent before anything interesting happens — the trip down should feel like it matters.
- Miners clustered together in a few dense pockets, rather than one-per-room spread evenly through the whole maze.
- Overall: deep and purposeful rather than wide and sparse.

All six levels follow this: one long winding shaft (generated once by script, then hand-fixable in the editor) with a small fuel alcove or two along the way, opening into a single chamber with all of that level's miners clustered together at the bottom. `site-kappa.json` is still the deepest/hardest; Alpha through Epsilon are shorter, straighter versions of the same shape leading up to it.
