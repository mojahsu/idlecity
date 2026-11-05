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
    workers.ts    gather / carry / build / farm / sleep / bucket-brigade behaviour
    leisure.ts    breaks (chat, drink, fish, nap, feed hens, pray), lunch, the holiday
    mayor.ts      the AI that chooses buildings and assigns jobs
    population.ts immigration, food, tier progression
    adventurers.ts arrivals, resting, party formation, dungeon unlocks
    parties.ts    dungeon runs, combat, loot, death, the final boss
    raids.ts      monster attacks on the town
    events.ts     merchant caravans and house fires (bucket brigade)
  data/       Content as plain data: buildings, tiers, jobs, classes, monsters, dungeons, names
  i18n/       t() + one JSON per language (en, zh-TW)
  render/     Canvas renderer. Reads state, never writes it.
    renderer.ts     Orchestrates the passes; depth-sorts everything on the ground
    palette.ts      Season palettes, time-of-day tint, noise + shape helpers
    terrain.ts      Cached static ground layer (cobbled streets, grass, flowers,
                    puddles, lily pads), animated water, three tree species
                    and their sun shadows
    buildings.ts    One drawing per building type, build reveal, dungeon entrances,
                    sun shadows, street lamps, light + smoke sources
    units.ts        Workers (tools, loads), adventurer classes, parties, raiders
    monsters.ts     Monster art shared by raids and the dungeon view
    effects.ts      Particles (smoke, weather, lightning, rainbow, shooting stars,
                    aurora, leaves, fireflies, debris, fireworks), birds, chickens,
                    the market cart, floating text
    townlife.ts     Render-only life: strollers, children, a dog, roof cats, wall
                    guards, tavern music, the chapel bell, cheering crowds,
                    funerals, weddings, the harvest festival, level-up stars,
                    forge sparks, wolves, deer, a fishing boat, the hero statue
    lighting.ts     Night darkness with light pools, dawn/dusk tint, fog, vignette
    dungeonView.ts  Inset panel showing a party fighting floor by floor
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
7. Each class has an automatic skill, plus a second one from level 10
   (`data/skills.ts`): warriors taunt (then block), archers volley every third
   round (then crit more), mages hurl a fireball every third round (then
   freeze), priests cast Holy Light on anyone under 30% HP (then revive one
   fallen companion per run). Fights run once per second in `sim/parties.ts`;
   every skill emits a `skill` fx the dungeon view animates.

8. Nobody works all day. After a delivery a worker may take a break
   (`sim/leisure.ts`): chat at the well, a drink at the tavern (then a wobbly
   walk home), fishing on the river bank (sometimes +1 food), a nap under a
   tree, feeding the hens, a prayer in the chapel, or gawping at the caravan.
   Around noon everyone near the square sits down at the campfire to eat, and
   on the festival day (fifth day of autumn) nobody works at all. About one in
   eight people is born lazy and takes three times as many breaks.
   Townsfolk sleep: at sunset workers finish their trip and go home (a bed in a
   hut or house, otherwise the campfire); windows light up as they arrive and go
   dark one by one late at night; everyone is back out a little after sunrise.
   Daytime work yields `DAY_WORK_BONUS` more to make up for all the time off;
   workers are busy about 60% of daylight.
9. Events (`sim/events.ts`): once the market stands, a merchant caravan visits
   every 5–10 minutes and pays gold at the stalls. Once six flammable buildings
   stand, a fire breaks out every so often; the nearest workers form a bucket
   brigade between the well (or the river) and the blaze. Rain helps. A blaze
   that stays near full strength for `FIRE_COLLAPSE` seconds burns the building
   down to a half-finished site the builders then restore.
10. Weather is decided per day in `sim/time.ts` (`dayWeather`) so the sim and
    the renderer agree: rain falls from late morning to mid afternoon and a
    rainbow follows; storm days add lightning; clear nights have shooting
    stars, and even-numbered clear winter nights the aurora.

11. The renderer also reacts to things the sim already does, without new sim
    state: a party coming home draws a cheering crowd at the tavern, a new
    grave gets a funeral procession, a level gained while resting sparkles,
    a forged gear level throws sparks at the smithy, and the newest log line
    shows as a caption in the corner of the map. The dungeon panel announces
    floors and bosses with a banner, pops chests open, and shows floor
    progress as dots.

Rough pacing at 1x: hamlet in minutes, village ~15 min, town ~40 min, city ~2 h,
first dungeon ~45 min, Dark Tower after the Keep (~3 h), Demon Lord falls
around hour 4–5 with a handful of deaths. Check with a headless run of
`advance()` over several seeds before and after touching any numbers.

## Steam / desktop port

The intended path is an Electron or Tauri shell around `dist/`:

- `vite.config.ts` already uses a relative `base` so the build loads from disk.
- Implement `SaveStorage` (`src/platform/storage.ts`) with a file or Steam Cloud
  backend and pass it to `loadGame` / `saveGame` in `main.ts`.
- Achievements / rich presence can hook `chronicle()` in `sim/log.ts`, which only
  receives important events.
- The renderer is isolated; replacing the procedural art with sprites means
  editing the draw functions in `render/` only. All art is drawn in logical
  24px-tile coordinates and scaled to the display, so it stays sharp at any
  resolution.
