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
| **Beats battle** | `A` `S` `K` `L` or tap the on-screen pads |
| **Learning battle** | Type on your keyboard or tap the on-screen A–Z keys |

## Two battle styles

Pick your style on the character-select screen (mode toggle):

- **🎵 Beats** — the rhythm mini-game (default).
- **📚 Learning** — a spelling challenge tuned to a **US grade (K–12)** you choose. Great for practice; it's the same sneak-and-battle loop, but you spell instead of tap.

## How it plays

- **Choose your Sprunki** — 8 characters (Ratty, Simon, Pinky, Oren, Vineria, Lime, Mr. Sun, Mr. Black Hat), each drawn distinctly.
- **Sneak** — stay out of the monsters' vision cones. Get spotted and a battle begins.
- **Beat Battle** — one of four colored pads lights with a shrinking countdown ring; hit the matching pad before the ring closes. Land enough hits (5 / 6 on hard) before 3 misses to defeat the monster.
- **Beat Battle speed** — a difficulty slider sets the reaction window from `1.0s` (Hard) to `3.0s` (Kid), default `2.0s`. It's constant per battle and the countdown ring is synced to it exactly.
- **Spelling Battle (Learning Mode)** — the game **says the word and shows it briefly**, then you spell it (type or tap the on-screen keyboard). Spell 3 words (4 on hard) before 3 misses. A **"🔊 Hear it"** button repeats the word. Words come from a **5,600-word bank graded K–12** (a composite of word frequency, length, syllables, and spelling irregularity), so each battle draws words matched to the selected grade. Default grade is **Kindergarten**. Text-to-speech is used when available and safely degrades to show-the-word on devices without it. The whole feature is behind a `LEARN_ENABLED` flag (default **on**).
- **Mr. Black Hat = Phase II** — selecting him flips the game into a super-hard mode: a dark, scary arena, mutated monsters, and a **breeding swarm** — monsters multiply when they see each other (each of the 4 originals breeds up to twice; the swarm caps at 12). Battles need one extra correct answer.

## Soundtrack

A fully procedural WebAudio step-sequencer (synthesized kick/hat/snare/bass/lead, lookahead
scheduling) — a bouncy pentatonic groove in normal mode, a slower minor-key Phase II theme.
Music starts on your first tap/click; the 🔊/🔇 button mutes music and SFX.

## Looks & feel

Rendered entirely with Canvas 2D — neon glow/bloom, particle bursts and trails, a parallax
starfield, animated vision-cone scan lines, screen shake, a glassmorphic UI with an animated
title, and a live menu backdrop of bouncing Sprunkis. Honors `prefers-reduced-motion`.

## Built for every screen

Fully playable on desktop, laptop, phone, and tablet. The 4:3 stage scales responsively and
stays centered; touch input is first-class (drag to move with an on-screen aim indicator, tap
the pads to battle), tap targets are large, pinch-zoom and scroll-bounce are disabled, and the
layout reflows for small portrait screens.

## Run / deploy

It's a static file — open `index.html` locally, or deploy the folder to any static host
(e.g. Vercel) with zero configuration.

Made for Michael.
