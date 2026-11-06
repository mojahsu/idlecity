# Status

The moving part of the handoff. Read this before starting work; rewrite it
before stopping (replace, do not append — keep it short and current). The
stable rules live in `CLAUDE.md`; the reasons behind the design in `README.md`.

## Where things stand (2026-11-06)

- `main` is deployed to https://mojahsu.github.io/idlecity/ (deploy on push).
- Latest work: the map and dungeon panel draw from CC0 sprite sheets with
  procedural fallback; parties are built by role and fight in a battle line
  (warrior in front); a watchdog un-sticks parties on the road; `D` copies a
  diagnostic JSON; `scripts/balance/` holds the headless pacing checks.
- Balance on eight seeds (`bun scripts/balance/pace.ts`): victory at hour
  2–5, 0–6 deaths over 10 h. Fights ~37 s, raids 20–40 s and mostly repelled.
- Nothing is in progress. No branches other than `main`.

## Next (pick one, open an issue for it, note it here)

- The owner wants to see the viewer's experience improve: more legible
  action, variety, and detail at 1x. Propose designs before building.
- Sprite buildings: house, tavern and guild hall look alike (same red
  two-tile roof). Give the tavern and guild hall their own roofs/props.
- Campfire, farm crops, market and graves are still procedural art.
- The "party standing still after an Ancient Ruins run" report was never
  reproduced. If a `D` diagnostic arrives, look for a party whose `path`
  stops shrinking or a fight with no living enemies, then fix the cause and
  consider removing the watchdog.
- Steam/desktop port: see README "Steam / desktop port".

## How to verify the current build

```bash
bunx tsc --noEmit -p . && bun test && bun scripts/balance/pace.ts
```

Then `bun run dev`, watch a few minutes at 4x: people take breaks, parties
walk out as a column behind the warrior, the panel shows the line with the
warrior nearest the enemy, raids draw the warrior in and the casters shoot
from two tiles back, night lights windows, winter whitens roofs.

## Open questions for the owner

- None at the moment.
