# 🔊 Sprunki vs Monsters

A tiny browser arcade game in **one self-contained `index.html`** — canvas + vanilla JS +
WebAudio, no dependencies, no build step, no external assets.

You're a **Sprunki**, a little beat-maker roaming a top-down arena. Monsters patrol with
vision cones. If a cone catches you, it pulls you into a rhythm **Beat Battle**. Defeat every
monster to win; lose all 3 hearts and it's game over.

## Controls

| | |
|---|---|
| **Move** | `WASD` / arrow keys / drag on the arena |
| **Battle** | `A` `S` `K` `L` or tap the on-screen pads |

## How it plays

- **Choose your Sprunki** — 8 characters (Ratty, Simon, Pinky, Oren, Vineria, Lime, Mr. Sun, Mr. Black Hat), each drawn distinctly.
- **Sneak** — stay out of the monsters' vision cones. Get spotted and a Beat Battle begins.
- **Beat Battle** — one of four colored pads lights with a shrinking countdown ring; hit the matching pad before the ring closes. Land enough hits (5 / 6 on hard) before 3 misses to defeat the monster.
- **Beat Battle speed** — a difficulty slider sets the reaction window from `1.0s` (Hard) to `3.0s` (Kid), default `2.0s`. It's constant per battle and the countdown ring is synced to it exactly.
- **Mr. Black Hat = Phase II** — selecting him flips the game into a super-hard mode: a dark, scary arena, mutated monsters, and a **breeding swarm** — monsters multiply when they see each other (each of the 4 originals breeds up to twice; the swarm caps at 12). Battles need 6 hits.

## Soundtrack

A fully procedural WebAudio step-sequencer (synthesized kick/hat/snare/bass/lead, lookahead
scheduling) — a bouncy pentatonic groove in normal mode, a slower minor-key Phase II theme.
Music starts on your first tap/click; the 🔊/🔇 button mutes music and SFX.

## Run / deploy

It's a static file — open `index.html` locally, or deploy the folder to any static host
(e.g. Vercel) with zero configuration.

Made for Michael.
