# Wasteland Trader / Wasteland Survivor — Codex Handoff

Updated: 2026-09-22

## Codex art progress (2026-09-22)

- The four-quadrant survivor body and rotating rifle are accepted by the owner. The same survivor art now renders in the walkable town.
- Scavenge gunner and melee raider have production sprites. Other enemy types still use atlas fallback.
- Current art batch adds production sprites for the road truck, wartruck and missile van, plus an isolated gas-station landmark. These are pending owner review on the stable phone preview.
- Follow-up: the frequently spawned road `buggy` type had no atlas or production sprite, so it was still a Canvas fallback. `enemy_buggy_v1.webp` now covers it.
- Enemy road vehicles now emit dynamic rear-wheel dust with type-scaled density and a particle cap; the player's accepted road dust remains dynamic.
- The original `enemy_truck.webp` is truncated and cannot be decoded by Pillow. `PROD_SOURCES` now points to `enemy_truck_v2.webp`; keep the versioned replacement until the owner accepts it.
- Continue art work in small preview batches. The next remaining site landmarks are clinic, motel and junkyard; additional Scavenge enemy classes and later bosses still need production art.

## Read first

This repo is mastercook777/wasteland-survivor. The broader project is Wasteland Trader / 废土商人.

It is a 9:16 portrait, iPhone/PWA-first wasteland vehicle + scavenging roguelite prototype. The desired art feeling is an ORIGINAL retro Japanese wasteland vehicle RPG / 1990s manga-mechanical / road-culture direction. Metal Max is a design reference for vehicle-centric fantasy and tone only. Do not copy its protected art, vehicles, characters, logos, maps or UI.

Current repository:
- GitHub: https://github.com/mastercook777/wasteland-survivor
- Active dev branch: art-reforge-v1
- Active branch head at handoff: b8f8d1b43e93b978e15997d7a4f6494206c2111b
- Draft PR #1: Art Reforge v1 — visual direction foundation
- Stable preview: https://mastercook777.github.io/wasteland-survivor/preview/
- Latest preview marker: ART REFORGE • AIM BUILD A4
- Production root on main should remain conservative until user explicitly approves the Art Reforge.
- main/preview is the live evaluation mirror of the active branch.

## Product pillars

1. Vehicle is the protagonist.
2. Portrait-first, one-thumb mobile interaction.
3. Shared interaction language: drag to move -> auto-fire / auto-interact -> tap route/build/town decisions.
4. Wasteland should feel dusty, mechanical and dangerous, but still adventurous and readable like a Japanese RPG.
5. Road Combat is art priority #1. Scavenge is #2. Town art is not a current priority.

Do not convert the game into twin-stick manual aiming unless explicitly requested.

## Current playable loop

Rustwater Town -> Route Map -> Road Combat / Scavenge -> loot/build decisions -> continue/return -> later encounters/final assault.

Existing systems that should be preserved:
- Fuel and Dry Run pressure
- branching Route Map
- Road Combat with auto-fire
- Scavenge with auto-fire, auto-search and auto-extraction
- Backpack grid, drag/drop, fusion to Lv.3, evolution branches
- Vehicle Bay modules/hardpoints/fusion
- selling and expansion
- walkable Rustwater Town 2.0
- localStorage save
- later Final Assault / Driver logic

## Core technical shape

- Canvas internal size: 540 x 960
- Most gameplay rendering lives in game.js
- game.js is monolithic (~116 KB). Do not do a large refactor while simultaneously changing gameplay/art.
- PWA files: index.html, style.css, manifest.webmanifest, sw.js
- Save: localStorage. Preserve compatibility/migrate rather than wiping.

## Art layers

Legacy fallback:
assets/art/combat-atlas.svg

Production assets:
assets/art/production/

Production loading is handled through PROD_SOURCES / PROD / drawProd.

Intended fallback:
production asset -> SVG atlas -> Canvas primitive.

Keep this fallback behavior while the production library is incomplete.

## Current production assets

- player_junker.webp
- player_survivor.webp (old single-sprite fallback)
- enemy_bike.webp
- enemy_truck.webp
- player_body_up.webp
- player_body_down.webp
- player_body_down_left.webp
- player_body_down_right.webp
- player_weapon_rifle.webp

Player Junker:
- fixed north/up orientation in current phase
- sand/olive/steel friendly palette with restrained blue/teal identification
- deliberately less hostile than enemy vehicles

Enemy Bike / Truck:
- fixed south/down orientation in current phase
- current art is acceptable for validation

Wartruck / Missile Van:
- still mostly earlier A2 art
- do not replace until the current production pipeline is validated in-game

## Road Combat status

Portrait upward-scrolling road battle.

The player Junker stays low on screen; enemies/mines/fire approach from ahead. Core weapons auto-fire. Player steers/dodges.

Important accepted improvement:
ROAD DUST IS DYNAMIC PARTICLE FX.

Do not revert to a fixed dust texture.

Current road FX include:
- continuously emitted dust
- dust expansion/fade/drift
- lateral steering response
- muzzle flash
- projectile trail
- impact flash
- multi-layer explosion
- debris fragments

The user currently likes the feeling of the vehicle speeding through dust.

## Scavenge status

Vertical field combat/exploration.

Sites:
- Gas
- Clinic
- Motel
- Junkyard

Enemies:
- melee
- gunner
- grenadier
- sniper
- armored
- elite
- driver/boss

The next important visual system is the player character direction/aim solution.

## A4 — four-direction body + rotating weapon

The user chose this approach deliberately, similar in principle to Sephiria:

BODY = discrete directional sprite
WEAPON = continuously rotating overlay

Current body set:
- up
- down
- down-left
- down-right

The down-left / down-right versions intentionally show the character's face.

Search these functions/constants in game.js:
- SURVIVOR_BODY
- scavBodyDirFromVector
- updateScavFacing
- drawScavWeapon
- drawSurvivor
- fireScav

Current behavior:
- target direction drives body selection
- rifle rotates continuously toward target
- default facing is up
- no-target state can use movement / last aim
- short hysteresis reduces direction flicker
- weapon front/back draw relation changes to reduce obvious intersection

Player state includes fields similar to:
- bodyDir
- pendingDir
- dirHold
- aimAngle
- lastAimAngle

A4 is IMPLEMENTED but not visually finalized.

### First Codex task: QA and tune A4

In actual Scavenge combat verify:

1. Rifle hand/pivot alignment
2. Foot/body anchor consistency when changing sprite
3. Direction switching thresholds and oscillation
4. Character scale relative to enemies/props
5. Per-direction weapon layering
6. Muzzle location

Do NOT immediately regenerate the player art. First tune scale/anchors/pivots/thresholds in-game.

fireScav still fundamentally originates gameplay bullets around the player center. Next polish should derive visual muzzle FX / tracer origin from the rifle muzzle.

## Art generation pipeline

Separate concept art from production art.

Concept pass:
- establish silhouette
- mechanical personality
- palette
- costume/world identity

Production pass:
- transparent background
- strict gameplay camera
- fixed orientation
- consistent scale
- clean silhouette
- reduced micro-detail
- readable at small size
- no scene composition
- no text/UI
- predictable anchor

Then crop/normalize/compress to WebP before integration.

Current vehicle orientation rule:
- player vehicle: up/north
- enemy vehicle: down/south

Later multi-direction vehicles are optional.

## Next visual priorities after A4

P0:
- tune A4 player body/rifle system

P1:
- muzzle anchor, muzzle flash and visual tracer origin

P2:
- Scavenge Gunner production sprite
- Scavenge Melee production sprite

P3:
- Gas Station production landmark
  It must be a game-readable isolated landmark, not a full scene illustration pasted into the map.

P4:
- Wartruck
- Missile Van
- later boss vehicles

Keep friendly and hostile vehicle paint clearly distinct.

## Town 2.0

Town is already a small walkable safe-zone rather than a menu.

It has proximity interaction and a separate INTERACT / LEAVE TOWN button, avoiding joystick conflict.

Town functionality is good enough. Do not spend the next art cycle redesigning it.

## Preview / deployment rules

Always keep this stable URL:
https://mastercook777.github.io/wasteland-survivor/preview/

There was previously a stale Service Worker/cache problem.

Current intent:
- preview loads latest assets
- preview old SW/cache is retired
- production root SW should not hijack /preview/
- GitHub Pages deploy workflow exists
- do not reintroduce aggressive preview caching

For a significant change:
1. implement on art-reforge-v1
2. syntax-check JS
3. do not overwrite production root main
4. sync necessary files to main/preview
5. keep stable preview URL
6. optionally update visible build marker
7. confirm Pages deployment
8. verify Road, Scavenge, touch movement, save and asset loading

Only merge Art Reforge to production after explicit user approval.

## Do not work on next unless requested

- no Town redesign
- no huge open-world map
- no twin-stick conversion
- no large feature/content expansion before visual identity stabilizes
- no whole-codebase refactor combined with gameplay changes
- no blind PR merge
- no Metal Max IP copying
- no static road dust

## Useful search terms

Scavenge:
startScavenge
updateScavenge
fireScav
drawSurvivor
drawScavEnemy

Road:
startRoad
updateRoad
fireRoad
drawVehicle
drawEnemyVehicle
drawRoadAtmosphere
drawRoadFX

Town:
enterTown
updateTown
townInteract
townTap
TOWN_SPOTS

Art:
PROD_SOURCES
drawProd
ART_SPRITES

Build:
drawGridScreen
EVOLUTIONS
vehicleStats
buildStats

## Success criteria

Road Combat:
- Junker reads as protagonist
- enemy vehicle identities are immediate
- speed/dust/combat FX feel alive
- no longer looks like Canvas placeholder art

Scavenge:
- body facing + rifle aiming feel coherent
- character reads at real gameplay size
- landmarks feel like designed Japanese-RPG locations
- enemies share one art language

Overall:
A screenshot should feel like an original retro Japanese wasteland vehicle RPG, not a generic H5 prototype.

## Codex kickoff instruction

Read this file first. Treat art-reforge-v1 as the active dev branch and /preview/ as the evaluation build. Preserve 540x960 portrait-first controls, localStorage save, economy/build systems and dynamic road dust. Do not merge Art Reforge into production without explicit approval. Current top priority is A4 Scavenge player QA: four directional body sprites + continuously rotating rifle. Tune anchors, scale, thresholds, layering and muzzle presentation from in-game behavior before generating more player art. Road Combat remains art priority #1, Scavenge #2, Town art is not a current priority.
