# Idle Town — notes for agents

Idle Town is a watch-only medieval idle game: a town grows on its own,
adventurers arrive, fight through three dungeons and finally the Demon Lord.
It runs in the browser (Vite + TypeScript + canvas 2D), is deployed to GitHub
Pages at https://mojahsu.github.io/idlecity/ from `main`, and a Steam/desktop
port is planned (see README "Steam / desktop port"). Read `README.md` first:
it has the directory layout and the numbered design notes (1–18) that explain
every system and why it is tuned the way it is.

## Working with the owner

- The owner writes Traditional Chinese (zh-TW). Reply in zh-TW; keep code,
  comments, commit messages and docs in English.
- For anything bigger than a fix, propose the design first (a short numbered
  list of options) and wait for a choice before coding. The owner answers
  with picks like "A+B" or "三項都作".
- The game is meant to be watched: when adding a feature, ask what the viewer
  will see, and make it legible at 1x speed.

## Commands (bun, never node/npm)

```bash
bun install                 # once
bun run dev                 # Vite on http://localhost:5173 (.claude/launch.json has a "dev" entry)
bun test                    # tests/ — i18n key parity and data ids, sim smoke tests
bunx tsc --noEmit -p .      # typecheck; must be clean before every commit
bun run build               # production bundle in dist/
bun scripts/balance/pace.ts # 8 seeds x 10 h: victory hour and deaths (see below)
```

Deploy: pushing to `main` runs `.github/workflows/pages.yml`. Confirm with
`gh run list --workflow=pages.yml --limit 1` and check the live bundle name
changed: `curl -s https://mojahsu.github.io/idlecity/ | grep -o 'index-[A-Za-z0-9_-]*\.js'`.

## Hard rules

1. `src/sim` is pure and deterministic: no DOM, no `Math.random`, no `Date`.
   Randomness goes through `random(s)`, `chance(s, p)`, `pick(s, arr)`,
   `randInt(s, a, b)` from `sim/rng.ts` so a seed replays identically.
   The renderer, HUD and audio read `GameState` and never mutate it.
2. Old saves must keep loading. New fields on saved types are optional and
   read with `?? default`; never rename or repurpose a saved field.
3. Every user-facing string is an i18n key in `src/i18n/locales/{en,zh-TW}.json`;
   the test fails when the two files differ in keys or a data id (building,
   job, monster, dungeon, class, skill) lacks a `*.id` entry.
4. `src/render` is one directory per kind and one file per type
   (`buildings/house.ts`, `monsters/lich.ts`, `units/classes/mage.ts`…) with an
   `index.ts` that dispatches. Keep that shape when adding a type.
5. Art comes from the CC0 sprite sheets in `public/assets` (mapping in
   `render/spriteMap.ts`, loader in `render/sprites.ts`), but every draw keeps
   its procedural fallback until the sheets load. Credits in
   `public/assets/CREDITS.md`; only CC0 assets may be added.
6. Balance is protected by headless runs, not by feel. Before and after
   touching `sim/constants.ts`, `FIGHT_TUNE`, class or monster stats, run
   `bun scripts/balance/pace.ts` and keep victory within hour 2–5 on every
   seed with deaths in the single digits over 10 h. `fights.ts` (~37 s per
   fight), `raids.ts` (20–40 s, mostly repelled), `events.ts`, `lives.ts` and
   `progress.ts` cover the other systems.
7. One bad frame must not stop the town: `main.ts` wraps the sim step, the
   render and the offline catch-up in `guarded()`. Never let a render helper
   throw on odd input (radii are clamped in `palette/shapes.ts` for that reason).

## Verifying in the browser

Run `bun run dev` and open the page. In dev builds `window.idleTown` exposes
`state`, `renderer`, `advance(seconds)`, a `time` setter, `catchUp`, `audio`
and `soundtrack`. Useful moves:

- `space` pauses, `1/2/3` set speed, `M` mutes, `F` fullscreen, `D` copies a
  JSON diagnostic of parties, adventurers, dungeons and the raid (the owner
  can paste this when reporting a stuck town); clicking any person, party,
  caravan, dungeon or building on the map locks the spotlight card onto it.
- Jump to a time of day or season: a day is 60 s, a season 10 days, a year
  40 days (spring, summer, autumn, winter). Night is day fraction > 0.8 or
  < 0.17. `idleTown.time = Math.floor(idleTown.state.time / 2400) * 2400 + day * 60 + seconds`.
- Force a situation by editing state: set `state.raid = {...}` for a raid,
  put a party in a phase/floor/encounter, then `idleTown.advance(0.1)` and
  `idleTown.renderer.render(state, 0.1)` to draw it.
- A headless soak inside the page catches render errors the frame loop would
  swallow: loop `idleTown.advance(0.1); idleTown.renderer.render(state, 0.1)`
  in a try/catch for a few thousand steps.
- The canvas is 720x480 logical pixels (30x20 tiles of 24 px). To inspect
  detail, draw a region of the game canvas magnified onto an overlay canvas
  (`ctx.drawImage(gameCanvas, lx*sx, ly*sy, lw*sx, lh*sy, 0, 0, lw*z, lh*z)`
  with `imageSmoothingEnabled = false`), then screenshot.
- `public/assets/viewer.html?sheet=tiny-town&s=6&from=0&to=83&cols=12` shows a
  sprite sheet with tile indices when changing `spriteMap.ts`
  (`&x=&y=&w=&h=` shows a pixel region of the 0x72 sheet instead).

## Where things are

- Time, weather, seasons, holidays: `sim/time.ts`. Tuning numbers: `sim/constants.ts`
  (speeds, rest chances, `FIGHT_TUNE`, raid rounds, fire, caravan intervals).
- Town growth: `sim/mayor.ts`, `sim/buildings.ts`, `sim/workers.ts`, breaks in
  `sim/leisure.ts`, ages/marriage/births in `sim/population.ts`, caravan and
  fire in `sim/events.ts`.
- Adventurers: arrivals, pastimes, party formation and the battle line in
  `sim/adventurers.ts` (`recruitClass`, `pickParty`, `FORMATION`); dungeon runs
  and action-by-action fights in `sim/parties.ts`; raids in `sim/raids.ts`.
- Rendering: `render/renderer.ts` composes the layers; the dungeon panel is
  `render/dungeonView/` (fx from the sim become animations in `step.ts`);
  ambient life that is not in the sim lives in `render/townlife/`.
- Sound is synthesised (no audio files): `platform/audio.ts` is the engine,
  `platform/soundtrack.ts` decides what plays from game state.
- Save/load and offline catch-up: `platform/save.ts`, `main.ts`.

## Open items (as of Nov 2026)

- A player reported a party standing still on the map after an Ancient Ruins
  run. The root cause was never reproduced; `watchdog()` in `sim/parties.ts`
  now re-paths a party stuck for 20 s and ends its leg at 45 s, and the fight
  loop moves on when a pack is already dead. If it happens again, get the
  `D` diagnostic from the player and look for a party whose `path` is not
  shrinking or a `fight` with no living enemies.
- Parties already on the road in old saves keep their level-sorted order
  until they re-form; new parties are in battle-line order.
- Sprite buildings: campfire, farm crops, market and graves are still procedural;
  house, tavern and guild hall now have distinct roof tints and landmark signs.
