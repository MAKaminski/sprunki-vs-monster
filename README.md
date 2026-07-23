# 🔊 Sprunki vs Monsters

A tiny browser arcade game. You're a **Sprunki** — a little beat-maker. Monsters
roam each arena with cones of sight. Slip past them and sneak up from behind to
ambush a monster into a **Beat Battle** (with a head-start), or get spotted and
fight at a disadvantage. Defeat every monster in every arena to win.

## Controls

| | |
|---|---|
| **Move** | `WASD` / arrow keys / drag on the arena |
| **Battle** | `A` `S` `K` `L` or tap the on-screen pads |

## How it plays

- **Choose your Sprunki** — each has a small perk (speed, wider hit windows, or smaller enemy cones).
- **Sneak** — stay out of the yellow vision cones. Touch a monster from *outside* its cone for a **Sneak Attack** (better starting meter).
- **Beat Battle** — notes fall down four lanes; hit them on the beat to fill the meter to 100%. Miss too many and you lose a heart.
- **Win** — clear all monsters across 4 increasingly busy arenas. 3 hearts total.

## Tech

Pure static site — vanilla HTML/CSS/JS, Canvas 2D rendering, WebAudio synth for
sound. No build step, no dependencies.

```
index.html    markup + screens
style.css     neon arcade styling
game.js       arena stealth, vision cones, rhythm battle, audio
favicon.svg   little Sprunki
```

Made for Michael.
