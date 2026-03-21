# Color Match Puzzle Game — Project Brief

## Overview

A React-based puzzle game where a grid of squares continuously animate through color changes. The player scores points by spotting and tapping adjacent squares that are sufficiently close in color. When matched, squares disappear or are replaced depending on the game mode.

Build this as a **single-file React artifact** (`.jsx`).

---

## Core Mechanics

- **Grid of squares**, starting at 4×4 for level 1, scaling up as the player progresses.
- Every square displays a **solid color** that **morphs continuously** on a timer.
- When **two adjacent squares** (up/down/left/right) are close enough in color, the player can **tap either one** to score a point.
- On a valid match: the game **auto-detects the best adjacent neighbor** (closest color among valid neighbors). The player does NOT need to tap both squares.
- Both matched squares then animate out (pop/dissolve) and are handled per the current game mode.

---

## Color System

### Color Representation
- Use **HSL color space** for all color logic. HSL is more perceptually intuitive than RGB for measuring visual similarity.

### Color Morphing Strategy
- **Target-seeking (preferred):** Each square picks a random target HSL color and lerps toward it at a configurable speed. When it arrives (or gets close), it picks a new random target. This creates smooth, organic-looking transitions with natural "almost matching" moments.
- Alternative: Random walk in HSL space (hue ±2, saturation ±1, lightness ±1 per tick). Also viable but slightly less smooth.

### Color Similarity Measurement
- Use **Euclidean distance in HSL space**, with hue weighted most heavily (it's the most visually dominant dimension).
- A configurable **threshold** determines what counts as "close enough." Lower threshold = harder.
- Example formula: `distance = sqrt(wH*(dH)^2 + wS*(dS)^2 + wL*(dL)^2)` where `wH > wS, wL`.
- Note: Hue wraps at 360°, so `dH = min(|h1-h2|, 360-|h1-h2|)`.

---

## Architecture

### Game Loop
- Use **one centralized game loop** via `requestAnimationFrame` (not 256 independent CSS animations).
- Each frame (~30–60fps), update all square colors in a single tick.
- Colors are stored in JS (state or refs), so the current color of any square is always directly accessible — no need to query the DOM.
- This makes pause, speed changes, and match-checking trivial.

### Performance Strategy
- Store colors in a **ref** (not state) to avoid re-rendering the entire grid every frame. Update individual square DOM elements' `style.backgroundColor` directly, OR use `React.memo` so only changed squares re-render.
- Starting at 4×4 (16 squares), performance is a non-issue. Even at 16×16 (256 squares), this approach should be fine on modern hardware.

### Grid Size
- `gridSize` is a variable (not hardcoded). Everything — the color array, rendering, adjacency checks — scales naturally with `gridSize × gridSize`.

---

## Level Progression

| Level | Grid Size | Notes |
|-------|-----------|-------|
| 1     | 4×4       | Learn the mechanic |
| 2     | 6×6       | A bit busier |
| 3     | 8×8       | Real scanning required |
| 4     | 10×10     | Getting challenging |
| 5+    | 12×12, 14×14, 16×16 | Expert territory |

### Difficulty Scaling (three axes)
1. **Grid size** — more squares to scan.
2. **Color similarity threshold** — tighter threshold means matches are harder to spot.
3. **Morph speed** — faster color changes mean shorter windows of opportunity.

All three should tighten as levels increase.

---

## Game Modes

### Mode 1: Endless / Replace
- Matched squares are **replaced** with new squares (random starting color, new morph target).
- Play for **score within a time limit**.
- Grid always stays full.

### Mode 2: Clear the Board
- Matched squares **disappear** permanently. Grid shrinks.
- Remaining squares **collapse inward** (gravity-like).
- Goal: clear as many squares as possible.

### Mode 3: Hybrid
- Matched squares disappear, but **new squares periodically spawn** at edges or random empty positions.
- Balances the shrinking board with fresh opportunities.

**Start by implementing Mode 1 (Endless/Replace)** — it's the simplest and best for testing core mechanics.

---

## Interaction Design

- **Single tap/click** on one square of a valid pair.
- Game finds the **closest-color adjacent neighbor** automatically.
- If no adjacent neighbor is within threshold, the tap does nothing (or gives subtle feedback like a shake).
- Both squares animate out together on a successful match.

---

## Visual Polish (Juice)

- **Match animation**: Satisfying pop, dissolve, or scale-out when squares are matched.
- **Invalid tap feedback**: Subtle shake or flash.
- **Score display**: Prominent counter, maybe with a small +1 floating animation on each score.
- **Combo system** (stretch goal): Multiplier for rapid successive matches.
- **Hint system** (optional): Subtle pulse/glow on squares that currently form a valid pair. Could be toggled or earned.
- **Timer**: Visible countdown for timed modes.

---

## Visual Style

- TBD — decide on clean/minimal, retro, glossy, etc.
- Color palette: TBD — full rainbow HSL, or constrained palette (warm tones, pastels, etc.) for aesthetics.

---

## Technical Notes

- **Single-file React component** — all logic, styles, and rendering in one `.jsx` file.
- Use Tailwind utility classes for layout. Inline styles for dynamic colors.
- No external dependencies beyond what's available in the React artifact environment (React, lodash, etc.).
- Use `useRef` for mutable game state (colors, targets, scores during animation frames) and `useState` only for values that need to trigger re-renders (score display, game-over state, level).
