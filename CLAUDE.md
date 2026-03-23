# Blood Match - Dante's Inferno Color Puzzle Game

## Project Overview
A React-based color matching puzzle game with a gothic Dante's Inferno theme. Players tap adjacent squares with matching colors to score points and progress through the circles of Hell.

## Tech Stack
- **React** with Vite
- **Tailwind CSS** for styling
- **React Router** for routing (`/`, `/watch`, `/admin`)
- **Deployed** to Netlify (see `public/_redirects` for SPA routing)

## File Structure
```
src/
  ColorMatchGame.jsx   # Main game component (all game logic)
  index.css            # Global styles, animations
  main.jsx             # Router setup
public/
  scenes/              # Midjourney Doré-style Inferno illustrations
                       # Named: circle-{1-7}-scene-{1-3}.png
                       # Alternates: circle-X-scene-Y-alt-{N}.png
  _redirects           # Netlify SPA routing
MIDJOURNEY_PROMPTS.md  # Prompts used to generate scene images
```

## Game Mechanics

### Core Gameplay
- Grid of color-morphing squares (HSL color space)
- Tap adjacent matching colors to clear them
- **Flood-fill matching**: All connected squares of similar color clear together
- **Color threshold** determines match sensitivity (varies by level)

### Block Clearing Animation
- Matched blocks disappear leaving gaps
- After 700ms delay, new blocks **smash in from random directions**
- Each replacement block picks its own direction (chaotic effect)
- Grid shakes on impact

### Levels (7 total, mapping to circles of Hell)
```javascript
LEVELS = [
  { gridSize: 4, threshold: 35, morphSpeed: 0.008, targetScore: 15 },
  { gridSize: 6, threshold: 30, morphSpeed: 0.010, targetScore: 20 },
  // ... up to 16x16 grid
]
```

### Watch Mode
- 3x3 grid for smartwatches
- 30-second rounds
- Route: `/watch`

## Visual Theming

### Gothic Color Palette
```javascript
GOTHIC_HUES = [
  Blood reds (0-25), Crimsons (335-360), Deathly purples (270-310),
  Midnight blues (200-240), Sickly greens (100-140), Dried blood oranges (30-50)
]
```

### Inferno Illustrations
- 7 circles × 3 scenes each = 21 base images
- Many have alternate versions (randomly selected per playthrough)
- Scene progression: 0-33% → Scene 1, 33-66% → Scene 2, 66-100% → Scene 3
- **Scene transitions**: Slow shadow descent effect with flickering

### Mobile Layout
- Full-bleed background image pinned to top
- Mirrored reflection fills space below
- Game grid at bottom of screen
- Circle info overlay (roman numeral, name, subtitle, masonic symbols) with flicker animation

### Desktop Layout
- Split screen: game grid left, framed illustration right
- Score counter centered above grid
- Timer in bottom right corner

### Typography
- Gothic serif font (Times New Roman) for score counter and overlays
- Text has soft black glow for legibility over images

### Animations
- **Intro**: "SEEK THE BLOOD MATCH" in bounded box with subtle strobe
- **Score counter**: Casino-style rolling numbers with flame effect when incrementing
- **Toasts**: Gothic themed - WICKED, UNHOLY, CURSED, DIABOLICAL, BLOOD RITE
- **Circle info**: Horror flicker effect (Resident Evil broken light vibe)
- **Block slide-in**: Bounce animation from random directions
- **Grid shake**: Directional shake on block impact

### CSS Classes (in index.css)
- `.woodcut-bg` - Crosshatch texture background
- `.text-outline` / `.text-outline-light` - Soft black glow for text
- `.circle-info-fade` - Horror flicker animation
- `.shadow-transition` - Scene change shadow descent
- `.slide-in-{top,right,bottom,left}` - Block entry animations
- `.grid-shake-{top,right,bottom,left}` - Impact shake

## Routes
- `/` - Auto-starts level 1
- `/watch` - Watch mode (3x3 grid)
- `/admin` - Level selection menu

## Key State
- `squaresRef` - Mutable ref for square colors/states (performance)
- `score` / `displayScore` - Actual vs animated display score
- `selectedScenes` - Randomly chosen image variants for current playthrough
- `sceneTransition` - Controls shadow descent animation
- `spawnDirection` - Cycles for block entry (now random per block)
- `gridShake` - Triggers directional shake

## Development
```bash
npm run dev    # Vite dev server at localhost:5173
npm run build  # Production build
```

Dev server is typically running in background during sessions.
