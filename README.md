# Idle Town

A watch-only idle game. A lone settler lights a campfire; a medieval town grows
around it on its own. Once the tavern and the Adventurers' Guild stand,
adventurers arrive, form parties, and raid dungeons. The game is won when a
party slays the Demon Lord in the Dark Tower. It keeps running after that.

The map is 30x20 tiles (`sim/world.ts`); the canvas keeps the saved map's
aspect ratio, so towns from before a size change keep their shape.

People walk at a pace you can follow (`WORKER_SPEED`, 1.4 tiles a second;
parties a little faster); daytime work yields `DAY_WORK_BONUS` more so the
slow walk, the breaks and the evenings off do not slow the town's growth.

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
    population.ts immigration, food, tier progression, ages, weddings, births,
                  children growing up, old age
    adventurers.ts arrivals, resting, party formation, dungeon unlocks
    parties.ts    dungeon runs, combat, loot, death, the final boss
    raids.ts      monster attacks on the town
    events.ts     merchant caravans and house fires (bucket brigade)
  data/       Content as plain data: buildings, tiers, jobs, classes, monsters, dungeons, names
  i18n/       t() + one JSON per language (en, zh-TW)
  render/     Canvas renderer. Reads state, never writes it. One directory per kind
              of thing, one file per type inside it.
    renderer.ts     Orchestrates the passes; depth-sorts everything on the ground
    palette/        colors, seasons, env (per-frame snapshot), shapes, shadows
    terrain/        grass, road, water, rock, bush; trees/{oak,birch,pine}
    buildings/      one file per building type + shared pieces (walls, roofs, doors)
    dungeons/       one file per dungeon entrance
    units/          worker, townsfolk, guard, caravan, statue, raid, adventurer;
                    classes/{warrior,archer,mage,priest}
    monsters/       one file per monster
    effects/        particles (the pool), smoke, weather, ambient, work, blaze,
                    fireworks, sky (lightning, rainbow, meteors, moon, aurora),
                    birds, chickens, cart, floats
    townlife/       roads + one file per subsystem: walkers, kids, dog, cats,
                    guards, music, cheers, processions, sparkles, wedding,
                    wolves, deer, river, festival, statue
    lighting/       night, rays, fog, vignette
    dungeonView/    state, step (HP → animation), panel, figures, chest, hud;
                    backdrops/{goblinCave,ancientRuins,darkTower}
  ui/         HUD (DOM), stylesheet
  platform/   Save storage interface + localStorage impl, save/load, offline progress,
              fullscreen, the synthesised audio engine (audio.ts) and the soundtrack
              that reads game state and decides what is heard (soundtrack.ts)
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
   every skill emits a `skill` fx the dungeon view animates. A party whose
   average level is under the dungeon's level + 2 (+3 at the Dark Tower) turns
   back at the boss's door.

8. Nobody works all day. After a delivery a worker may take a break
   (`sim/leisure.ts`): chat at the well, a drink at the tavern (then a wobbly
   walk home), fishing on the river bank (sometimes +1 food), a nap under a
   tree, feeding the hens, a prayer in the chapel, gawping at the caravan, a
   game of chess beside the tavern, listening to the bard (who plays whenever
   there is an audience) and dancing, archery at the straw target below the
   walls, calling on a neighbour, a picnic with their spouse, a swim in summer,
   a snowman or a snowball fight in winter. Around noon everyone near the
   square sits down at the campfire to eat; every evening the whole town downs
   tools (`EVENING_FROM`) for one long pastime, sunsets on the river bank
   included, before bed; and on the festival day (fifth day of autumn) nobody
   works at all. About one in eight people is born lazy and takes three times
   as many breaks. The render side (`render/townlife/pastimes.ts`) adds the
   scenery: the bard, the target and its arrows, the host at the door, the
   chess table, snowmen that last the day, snowballs in flight.
   Townsfolk sleep: at sunset workers finish their trip and go home (a bed in a
   hut or house, otherwise the campfire); windows light up as they arrive and go
   dark one by one late at night; everyone is back out a little after sunrise.
   Daytime work yields `DAY_WORK_BONUS` more to make up for all the time off;
   workers are busy about 40% of the day.
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

12. Lives (`population.ts`): everyone has an age; a life-year is one season
    (`LIFE_YEAR_DAYS`). Newcomers arrive at 16–26, marry in the chapel, have
    children (tracked in `state.children`, no job and no food cost) who come of
    age at `ADULT_AGE` and pick up a job under their own name, turn grey and
    slow at `ELDER_AGE`, and pass away between `LIFESPAN` years, leaving a
    grave. Over an evening a town turns over a whole generation.
13. Sound: `platform/audio.ts` synthesises everything on Web Audio (no files):
    wind, rain, river and fire beds; birds, crickets, owls, wolves; axes, picks
    and hammers; hits, skills, roars, thunder, bells, fanfares, a tavern tune.
    `platform/soundtrack.ts` reads the state each frame and plays them. `M` or
    the speaker button mutes; the choice is saved. Sound starts on the first
    click or key press, as browsers require.

14. Each season has a special day (`seasonalEvent` in `sim/time.ts`): sowing
    in spring (seed over the fields), the fishing contest in summer (five
    free hands line the bank, one lands +30 food), the solstice in winter
    (candles in every window, lantern strings between houses) and a blizzard
    that keeps everyone indoors for a day. After dark the lamplighter lights
    the street lamps one by one, a watchman walks the streets with a lantern
    once the walls stand, patrons weave home from the tavern, a fox creeps up
    on the hens and an owl sits on a roof (`render/townlife/night.ts`).
15. The spotlight (`render/spotlight.ts`) picks a villager or adventurer every
    so often and follows them for a while with a card: name, age, job, what
    they are doing. Buildings grow with the town's tier: huts get chimneys and
    flower boxes, city houses stone ground floors and slate roofs, the market
    lanterns and a flower stall, the square a stone ring, benches and paving.
16. Offline progress is replayed over the first frames after loading
    (a 12 ms slice of simulation per timer tick, `runCatchUp` in main.ts) with a "catching up" toast,
    so the town appears at once instead of the page freezing.

17. Fights are paced to be watched. Underground a floor holds a pack of one
    to three monsters (or one boss) and the fight runs action by action,
    one every `ACT_TIME` seconds: each hero in turn (a blow, a shot, a bolt,
    a fireball that splashes the rest of the pack, a heal or Holy Light, a
    priest's smite), then each monster (bites, slashes, claws, smashes, the
    imp's and lich's bolts, the dragon's and demons' breath over everyone,
    the lich's curse). Every action is an fx the panel plays out with a
    wind-up, a lunge or a projectile, a number and sparks; monsters carry
    their own bars and die one at a time. Monster hit points grow with the
    heroes' level so every monster takes several blows, their attacks are
    scaled down, and rewards per kill grow with the hit points (`FIGHT_TUNE`)
    so xp and gold per hour hold. Raids are fought in rounds too: only
    adventurers who have run out to the raiders (`pastime: 'sally'`) deal
    damage, walls and townsfolk count for a little, and raiders scale with the
    heroes' level so a raid lasts twenty to forty seconds. Between expeditions
    adventurers spar at the guild's training posts, drink, sit by the fire and
    wander the streets instead of standing still.

Rough pacing at 1x: hamlet in minutes, village ~15 min, town ~40 min, city ~2 h,
first dungeon ~45 min, Dark Tower after the Keep (~3 h), Demon Lord falls
around hour 2–5 with a few deaths (0–9 over 10 h on eight seeds; fights now last about 40 s, bosses several minutes).
Parties never randomly revisit a dungeon above their level, turn back at a
boss's door when under-levelled (`daresBossFloor`), and break off a boss
fight as soon as anyone is badly hurt; bosses keep their wounds between
attempts (recovering a tenth each time, `Dungeon.bossHp`), so a town wears
its Demon Lord down over several expeditions instead of feeding it. Without
those rules one unlucky wipe starts a death spiral. Check with a headless run of
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
