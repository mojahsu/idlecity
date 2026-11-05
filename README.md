# Idle Town

A watch-only idle game. A lone settler lights a campfire; a medieval town grows
around it on its own. Once the tavern and the Adventurers' Guild stand,
adventurers arrive, form parties, and raid dungeons. The game is won when a
party slays the Demon Lord in the Dark Tower. It keeps running after that.

Designed to sit on a second screen. The only controls are speed (pause, 1x, 2x,
4x), language, and "new town".

## Run

Requires [bun](https://bun.sh).

```bash
bun install
bun run dev        # http://localhost:5173
bun test           # simulation + locale tests
bun run typecheck
bun run build      # static files in dist/
```

Keyboard: `space` pause, `1` / `2` / `3` for 1x / 2x / 4x, `F` (or double-click
the map) for fullscreen. The canvas re-renders at its displayed size, so
fullscreen on a large monitor stays sharp. The mouse cursor hides after 3 s
idle while fullscreen. Fullscreen lives behind `src/platform/fullscreen.ts`
so a desktop build can swap in window-level fullscreen.

### Play it from anywhere (GitHub Pages)

`.github/workflows/pages.yml` builds and publishes `dist/` on every push to
`main`. One-time setup: in the GitHub repository go to Settings → Pages and
set *Source* to **GitHub Actions**. The game is then served at
`https://<owner>.github.io/<repo>/`.

Each browser runs its own town and keeps its own save in localStorage, so
opening the page on a phone starts a separate town from the one on your desk.

## Layout

```
src/
  sim/        Pure simulation. No DOM, no canvas. Deterministic (seeded RNG).
    types.ts      GameState and every entity type (the save file shape)
    state.ts      newGame()
    tick.ts       step() — advances one tick; advance() for offline catch-up
    world.ts      map generation, pathfinding, reachability, movement
    workers.ts    gather / carry / build / farm behaviour
    mayor.ts      the AI that chooses buildings and assigns jobs
    population.ts immigration, food, tier progression
    adventurers.ts arrivals, resting, party formation, dungeon unlocks
    parties.ts    dungeon runs, combat, loot, death, the final boss
    raids.ts      monster attacks on the town
  data/       Content as plain data: buildings, tiers, jobs, classes, monsters, dungeons, names
  i18n/       t() + one JSON per language (en, zh-TW)
  render/     Canvas renderer. Reads state, never writes it.
  ui/         HUD (DOM), stylesheet
  platform/   Save storage interface + localStorage impl, save/load, offline progress
  main.ts     Browser entry: game loop, autosave, hotkeys
tests/        bun tests
```

### Rules of the codebase

- `sim/` must stay free of browser APIs so it can be unit-tested and reused in a
  desktop build unchanged.
- Add content in `data/`, not in logic. Every new id needs a key in both locale
  files (a test enforces this).
- All user-facing text goes through `t()`. Log entries store the key and params,
  not the rendered string, so switching language re-renders old entries.
- Tunables live in `sim/constants.ts` and the `data/` files.
- Bump `SAVE_VERSION` in `sim/state.ts` when `GameState` changes shape; old
  saves are then discarded (add a migration there if you want to keep them).

## How the town grows

1. The mayor (`mayor.ts`) wants a building: shelter first, then food, then the
   fixed growth list in `data/buildings.ts` (`BUILD_ORDER`). One site at a time.
2. Jobs are redistributed every few seconds toward whatever the next building
   needs. Workers finish their current trip before switching.
3. Buildings fill 2x2 blocks with streets every third tile, so nothing gets walled in.
4. Population tiers (camp → hamlet → village → town → city) unlock buildings.
5. Tavern brings adventurers; Guild unlocks dungeons; Keep unlocks the Dark Tower.
6. Adventurers permanently die (30% chance when they drop to 0 HP). A grave appears.

Rough pacing at 1x: hamlet in minutes, village ~15 min, town ~40 min, city ~2 h,
first dungeon ~45 min, Dark Tower after the Keep (~3 h), Demon Lord typically
falls after several hours of attempts.

## Steam / desktop port

The intended path is an Electron or Tauri shell around `dist/`:

- `vite.config.ts` already uses a relative `base` so the build loads from disk.
- Implement `SaveStorage` (`src/platform/storage.ts`) with a file or Steam Cloud
  backend and pass it to `loadGame` / `saveGame` in `main.ts`.
- Achievements / rich presence can hook `chronicle()` in `sim/log.ts`, which only
  receives important events.
- The renderer is isolated; replacing shapes with sprites means editing
  `render/renderer.ts` only.
