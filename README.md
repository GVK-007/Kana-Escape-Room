# Kana Escape Room (かな脱出)

<p align="center">
  <img src="public/Kaizen.svg" alt="Kaizen (The Japanese Club) Logo" width="180" />
</p>

<p align="center">
  <em>An open-source, 16-bit pixel-art Japanese language learning game developed by <strong>Kaizen (The Japanese Club)</strong> using artificial intelligence.</em>
</p>

<p align="center">
  <a href="https://kana-escape-room.pages.dev/"><img src="https://img.shields.io/badge/Live_App-kana--escape--room.pages.dev-10b981?style=flat-square" alt="Live Application" /></a>
  <a href="https://www.gnu.org/licenses/gpl-3.0"><img src="https://img.shields.io/badge/License-GPL_v3-blue.svg?style=flat-square" alt="License: GPL v3" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite" /></a>
</p>

---

## Live Deployment

The game is deployed and playable in any modern desktop or mobile web browser:
**[https://kana-escape-room.pages.dev/](https://kana-escape-room.pages.dev/)**

---

## ✨ Features

- **3 Progressive Japanese Themed Escape Rooms**:
  - **Room 1: The Cyber Akihabara Workshop (`秋葉原・電脳工房`)** — Retro computing & arcade den with hanging paper Chōchin lanterns, cedar parquet floors, and Ichimatsu checkerboard motifs (*Target: かぎ / Key*).
  - **Room 2: The Grand Ryokan Archive (`古文書院・茶室`)** — Ancient Japanese library with sliding Shoji screen doors, bonsai trees, candle sconces, and Asanoha hemp-leaf motifs (*Target: とびら / Door*).
  - **Room 3: The Sacred Torii Sanctum (`神聖鳥居・月光の神域`)** — Moonlit shrine complex featuring woven Tatami mats, drifting Sakura Fubuki cherry blossoms, and a majestic Vermillion Torii Gate (*Target: でぐち / Exit*).

- **20+ Unique Arcade Minigames & Puzzles**:
  - *Reflex & Timing*: Timed Passcode Decryption, Pong Core Battle, Flappy Kana Glider, Lane Runner Obstacle Dodge.
  - *Classic Retro Arcades*: Snake, 2048, Wall Breaker (Breakout), Trajectory Catapult (Slingshot), Precision Darts.
  - *Logic & Strategy*: Sliding Tile Puzzle, Match-3 Gem Align, Tic-Tac-Toe Minimax, Dots & Boxes Grid, Sea Battle (Battleship), Rock-Paper-Scissors Duel, Memory Sequence Flashing, Card Flip Pair Matching, Mechanical Bolts Disassembly, Falling Kana Basket Catcher, Educational Japanese Color-Matching Wires.

- **Dual-Engine Japanese Pronunciation Audio**:
  - Pre-cached offline native voice audio clips for all Kana syllables, vocabulary words, and colors.
  - Automatic fallback to browser SpeechSynthesis API.
  - Natural acoustic cadence between syllables and words during word crafting, with manual replay buttons.

- **Mobile & Desktop Responsive Engine**:
  - Live aspect ratio switcher supporting **PC 16:9 Widescreen** and **Mobile 3:2** ratios.
  - Toggleable on-screen virtual 8-way D-Pad and action buttons for smartphone and tablet touch gameplay.
  - Maximized playable viewport eliminating dead margins.

- **Dynamic In-Room Kana Shuffle**:
  - Randomizes available reward letters across stations in each chamber per run, ensuring endless replayability while strictly guaranteeing 100% word solvability.

- **Interactive Word Crafter & Japanese Dictionary**:
  - Freely arrange Kana onto crafting slots to discover over 1,500+ recognized Japanese words.
  - Full dictionary metadata display: Hiragana/Katakana script, Kanji equivalents, Romaji pronunciation, English meanings, and icon representations.

- **8-Directional Pixel Character Movement**:
  - Authentic 8-way movement animations (including 3/4 isometric diagonal views: down-left, down-right, up-left, up-right).
  - Grounded walking cadence with weighted vertical step-bobbing.
  - Surface-acoustic footsteps (wood parquet, stone tile, tatami straw) and tactile collision wall bumping sound effects.

- **Subtle Atmospheric Pixel Ambience**:
  - Sakura Fubuki falling cherry blossom petals with organic sine-wave wind sway physics.
  - Hanging paper Chōchin lantern glows, candle wall sconces, and ancient stone lanterns (*Tōrō*).
  - Floating shrine spirit embers (*Hitodama*) and golden dust motes.

- **Named Runs Hall of Fame Leaderboard & Save Data Migration**:
  - Name and record individual escape attempts sorted by fastest escape time and Kana collected.
  - Run Inspector: Click any leaderboard entry to review its full summary and crafted Japanese vocabulary.
  - JSON Save Data Backup & Transfer tool for cross-device migration.
## Overview

**Kana Escape Room** blends retro top-down dungeon exploration with interactive language pedagogy. Players awaken inside locked thematic chambers—a cybernetic detective workshop, a historic stone archive, and a sacred shrine vault. To progress, players must inspect the room, solve arcade trials to discover individual Japanese Kana tiles, and combine them at a crafting workbench to form target Japanese vocabulary words (such as **かぎ** `[kagi]` *Key*, **とびら** `[tobira]` *Door*, and **でぐち** `[deguchi]` *Exit*) to unlock subsequent areas.

---

## Core Features and Systems

### 1. Thematic Escape Chambers
- **Room 1: The Detective's Workshop** — A retro computing laboratory featuring electronic safes, CRT terminals, neon arcade cabinets, and circuit switchboards (*Target Word: かぎ / Key*).
- **Room 2: The Grand Archive** — A historic stone library containing sliding bookcases, pendulum chronometers, and scholar puzzle tables (*Target Word: とびら / Door*).
- **Room 3: The Secret Vault Gateway** — A sanctuary marked by a stone Torii portal, reflex cores, and precision trials (*Target Word: でぐち / Exit*).

### 2. Arcade Stations and Minigame Trials
Over 20 distinct minigame implementations across reflex, logic, puzzle, and timing categories:
- **Reflex and Timing**: Timed Passcode Decryption, Pong Core Battle, Flappy Kana Glider, and Lane Runner Obstacle Dodge.
- **Arcade Classics**: Snake, 2048 Fusion Core, Wall Breaker (Breakout), Trajectory Catapult, and Precision Darts.
- **Logic and Strategy**: Sliding Tile Puzzle, Match-3 Gem Align, Minimax Tic-Tac-Toe, Dots & Boxes Grid, Sea Battle (Battleship), Rock-Paper-Scissors Duel, Memory Sequence Flashing, Card Flip Pair Matching, Mechanical Bolts Disassembly, and Falling Kana Basket Catcher.

### 3. Word Crafting Engine and Lexicon
- Dynamic word construction interface allowing arbitrary arrangement of collected Kana tiles.
- Built-in dictionary containing over 1,500 validated Japanese terms.
- Real-time lexical feedback displaying Kana script, Kanji equivalents, Romaji phonetics, and English definitions.

### 4. Movement and Locomotion Architecture
- Full 8-directional locomotion including dedicated 3/4 isometric diagonal walk animations (`down-left`, `down-right`, `up-left`, `up-right`).
- Weighted step-bob physics with synchronized vertical displacement on contact frames.
- Surface-acoustic footstep audio mapped to room floor types (parquet wood, stone flagstone, and tatami straw).
- Tactile collision detection and bump audio feedback against solid boundaries.

### 5. Generative Web Audio Engine
- Built entirely with the browser Web Audio API with zero external audio asset dependencies.
- Generative procedural ambient soundscapes tailored to each room (server room drone, pendulum clock rhythm, Japanese shrine wind chimes).
- Synthesized 8-bit sound effects for selection, interaction, minigame victory, word crafting, and collisions.

### 6. Hall of Fame Leaderboard and Run Inspector
- Persistent local storage recording named escape runs, clear times, and collected Kana counts.
- Run Inspector interface enabling full retrospective review of clear statistics and every word formed during an expedition.

---

## Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 | Component hierarchy, state management, and modal overlays |
| **Language** | TypeScript 5 | Strict typing across game loops, entities, and dictionaries |
| **Build Tooling** | Vite 8 | Fast HMR dev server and optimized production bundling |
| **Styling** | Tailwind CSS v4 | Responsive layout utilities and custom theme palette |
| **Game Rendering** | HTML5 2D Canvas | Nearest-neighbor pixel-art scaling and custom frame rendering |
| **Audio Synthesis** | Web Audio API | Procedural sound generation without external audio files |
| **Visual Effects** | Canvas Confetti | Celebration particle effects on room clear |

---

## Getting Started

### Prerequisites

Ensure the following runtimes are installed on your system:
- **Node.js**: `v18.0.0` or higher (`v20.x` LTS recommended)
- **npm**: `v9.0.0` or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/17arigato-jwd/kana-escape-room.git
   cd kana-escape-room
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## Build and Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server on port 3000 |
| `npm run build` | Compiles TypeScript and creates an optimized production build in `dist/` |
| `npm run preview` | Runs a local static server to preview the production build |
| `npm run lint` | Runs TypeScript compilation verification (`tsc --noEmit`) |
| `npm run clean` | Cleans previous build artifacts |

---

## Controls and Input

| Input | Action |
| :--- | :--- |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or <kbd>Arrow Keys</kbd> | Move character in 8 directions (supports diagonal movement) |
| <kbd>E</kbd> | Interact with objects, consoles, stations, and exit doors |
| <kbd>I</kbd> | Open Kana Inventory and Word Crafting Workbench |
| <kbd>ESC</kbd> | Pause Menu, volume controls, or dismiss open dialogs |

---

## Project Structure

```
kana-escape-room/
├── public/                 # Static assets, branding, and icons
│   ├── Dark Mode.svg       # Kaizen (The Japanese Club) official logo
│   └── favicon.svg         # SVG application icon
├── src/
│   ├── components/
│   │   ├── inventory/      # Word crafting workbench and inventory modal
│   │   ├── minigames/      # Arcade trials and puzzle minigames
│   │   └── ui/             # Title screen, HUD, leaderboard, and run inspector
│   ├── data/
│   │   ├── characters.ts   # Player character palettes and metadata
│   │   ├── dictionary.ts   # Japanese vocabulary lexicon (1,500+ entries)
│   │   └── rooms.ts        # Room definitions, collision maps, and station layouts
│   ├── game/
│   │   ├── AtmosphericEffects.ts # Particle systems (dust motes, petals, lights)
│   │   └── GameViewport.tsx      # Canvas game loop, movement physics, and collision
│   ├── types/
│   │   └── game.ts         # TypeScript interfaces and enum types
│   ├── utils/
│   │   ├── audio.ts        # Synthesized sound effects and generative soundscapes
│   │   ├── leaderboard.ts  # Local run persistence and sorting algorithms
│   │   └── pixelArt.ts     # Procedural pixel-art canvas sprite generators
│   ├── App.tsx             # Main game controller and state orchestrator
│   └── main.tsx            # React application entry point
├── package.json            # Dependencies and npm scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
└── README.md               # Project documentation
```

---

## 📝 Changelog

### 💡 Version 1.2.0 — Interactive Progressive Door Hint & Pronunciation System

- **Concealed Japanese Word Spoilers**:
  - Removed direct plaintext Japanese words (`かぎ`, `とびら`, `でぐち`) from door inscriptions, room lore descriptions, and inventory clue banners.
  - Retained English meaning prompts (`"Key"`, `"Door"`, `"Exit"`) to encourage active vocabulary deduction.

- **Sacred Cipher Hint Chamber (`DoorClueModal.tsx`)**:
  - Added a dedicated 2-column Hint Panel layout on the right side of the exit door interface.
  - **Stage 1 (Word Length)**: First hint reveals mystery boxes (`?`) matching the exact number of required Kana letters (e.g. 2 boxes for `かぎ`, 3 for `とびら` and `でぐち`).
  - **Stage 2+ (Sequential Kana Unlocks)**: Subsequent hints progressively reveal one Kana letter at a time in sequence (`[ か 🔊 ] [ ? ]`).
  - **Native Pronunciation on Demand**: Each revealed Kana tile is an interactive soundboard button (`🔊`) that plays its native voice pronunciation upon reveal and whenever clicked thereafter.
  - **Live Cooldown Timer**: 20-second timer between consecutive hints with live real-time countdown display (`⏳ NEXT HINT IN 20s`), preventing accidental spam while remaining fast and engaging.
  - **Persistent Cross-Session Tracking**: Hint progression and cooldown timestamps persist across room navigation and browser save states.
  - **HUD Shortcut**: Added an interactive `💡 HINTS` badge to the top HUD bar, allowing players to view clues and hear pronunciations from anywhere in the chamber without needing to walk to the door.
  - **Debug UI Cleanup**: Removed temporary debug door unlock buttons and chamber warp controls from the HUD and exit door modal for authentic escape room gameplay.

### 🏹 Version 1.1.1 — Minigame Balance & Physics Fine-Tuning (Round 2 Corrections)

- **Dots & Boxes (`GameDotsAndBoxes.tsx`)**:
  - Expanded grid by another row and column from 4x4 dots to **5x5 dots** (**4x4 = 16 boxes** total).
  - Updated majority victory condition to **9 boxes claimed** (`FIRST TO 9 WINS`).
  - Adjusted dot spacing and line hitboxes for optimal tactical balance and touch/click ergonomics.

- **Kana Spirit Catcher (`GameKanaCatcher.tsx`)**:
  - Broadened spirit wisp spawn radius across the sacred pool (**20px – 215px**) to eliminate narrow clustering.
  - Lengthened shrine basin catching platform to **54px** (widened from 44px).
  - Smooth, steady movement speed tuned to **4.5 px/frame** for precise, deliberate positioning.
  - Reinstated pure zero-miss reflex challenge (**1 Life / 0 Misses allowed**).

- **Memory Matrix (`GamePatternMemory.tsx`)**:
  - Added full keyboard and Numpad support: input pattern repeats instantly via keyboard number keys (`[1]`–`[9]`) or physical **Numpad** (`1`–`9`) with responsive glowing button animations and audio cues.
  - Added `<kbd>Space</kbd>` or `<kbd>Enter</kbd>` keyboard shortcut to quickly retry from Stage 1 upon failure.

- **Wall Breaker (`GameWallBreaker.tsx`)**:
  - Decreased ball acceleration rate to a gentler **+1.5% compound increase** per brick hit.
  - Added strict maximum ball speed cap at **1.45x**, keeping late-game volleys fast and tense while remaining controllable and playable.
  - Added `<kbd>Space</kbd>` keyboard shortcut on the **BALL DROPPED!** failure screen to instantly retry and launch without needing a mouse click.

- **Pagoda Slingshot (`GameAngryBirds.tsx`)**:
  - **Instant Victory Bugfix**: Decoupled win evaluation from active projectile physics, ensuring structural collapses and falling roof lintels trigger immediate victory the exact moment the final crest is eliminated (no need to fire an extra shot).
  - Rebalanced projectile ammo to **3 shots only** (`AMMO: 🔴🔴🔴`), requiring deliberate targeting and cascade collapses.
  - Added input guards preventing slingshot pulls once ammo is exhausted while structural physics settles.

### 🎯 Version 1.1.0 — Minigame Balance, Pagoda Physics & Gameplay Overhaul (Round 1 Corrections)

- **Wall Breaker (`GameWallBreaker.tsx`)**:
  - Fixed premature victory bug where stages cleared before breaking all bricks.
  - Strict completion requirement now enforces destroying all 24 bricks.
  - Added live HUD brick counter (`BRICKS LEFT: X/24`).

- **Dots & Boxes (`GameDotsAndBoxes.tsx`)**:
  - Rebalanced grid from grueling 10x10 dots (81 boxes) to a fast-paced 4x4 dot grid (3x3 = 9 boxes).
  - Clear win condition: First player to capture 5 boxes secures majority victory.
  - Significantly enlarged touch/click hitboxes and clear visual hover indicators.

- **Nuts & Bolts Sort (`GameNutsAndBolts.tsx`)**:
  - Upgraded puzzle complexity: increased capacity to 4 nuts per rod, with 4 distinct color sets across 6 rods.
  - Solvable, deep initial shuffle requiring strategic multi-step planning and buffering.

- **Match-3 Conduit (`GameMatch3.tsx`)**:
  - Raised default target score from 150 to 500 points for rewarding combo gameplay.
  - Added visual tile popping animation with particle bursts for matches.
  - Added smooth slide-down dropping animation for incoming replacement tiles.

- **Kana Spirit Catcher (`GameKanaCatcher.tsx`)**:
  - Fixed late-game impossible speeds: capped maximum falling velocity to a reachable rate.
  - Increased basket movement responsiveness (5.8 px/frame).
  - Constrained spawn positions so new spirits never spawn impossibly far from the basket.
  - Added a 3-life heart system (`LIVES: ❤️ ❤️ ❤️`) allowing up to 3 drops.

- **Pagoda Slingshot (`GameAngryBirds.tsx`)**:
  - Completely redesigned from plain static blocks into a multi-tier architectural pagoda fortress.
  - Realistic structural collapse physics: foundation stone pillars, wooden lintels, upper roofs, and sheltered golden spirit orbs.
  - Collapsing beams crush targets below; added 14-point curved trajectory prediction arc.

- **Pong Core Duel (`GamePong.tsx`)**:
  - Eliminated tedious stalemates: replaced telepathic AI tracking with humanized reaction times.
  - Added paddle angle deflection: hitting with paddle edges cuts sharp slice angles to outmaneuver the AI.
  - Brisk compounding rally acceleration resolves volleys within 4–6 hits.

- **Japanese Kanji Passcodes (`GameTimedCode.tsx`)**:
  - Replaced standard numerals with authentic Japanese kanji numbers (〇 through 九) and speech pronunciation.

- **Sliding Tile Shelf (`GameSlidingPuzzle.tsx`)**:
  - Rebalanced from a tedious 4x4 (15-puzzle) down to a quick, satisfying 3x3 (8-puzzle, numbers 1 to 8).
  - Maintained 100% solvable random shuffling and smart Manhattan-distance hint calculator.

### 🌸 Version 1.0.0 — Japanese Club Orientation & Mobile Overhaul

#### ⛩️ Progressive Japanese Aesthetic & Environmental Design
- **Chamber 1: The Cyber Akihabara Workshop (`秋葉原・電脳工房`)**:
  - Retro computing & Dagashiya game den workshop with cedar parquet floors and cyber-brick walls with brass conduits.
  - Traditional **Ichimatsu (市松模様)** checkerboard patterns, ambient cyber scanlines, and warm hanging paper **Chōchin (提灯)** lanterns.
- **Chamber 2: The Grand Ryokan Archive (`古文書院・茶室`)**:
  - Traditional Edo-era library and tea study with mossy stone walkways, Shoji paper screen walls (**障子**), and sliding Kumiko lattice doors with bronze recessed ring pulls.
  - Handcrafted ceramic potted **Bonsai (盆栽)** trees, warm candle sconces, golden dust motes, and **Asanoha (麻の葉模様)** hemp-leaf lattice patterns with drifting green bamboo/tea leaves.
- **Chamber 3: The Sacred Torii Sanctum (`神聖鳥居・月光の神域`)**:
  - Moonlit shrine complex featuring hand-woven **Tatami (畳)** mats with authentic patterned fabric borders (*Tatami-beri*), vermillion lacquer shrine pillars over white plaster, and stone *Tōrō* lanterns.
  - Majestic **Vermillion Torii Gate (鳥居)** adorned with braided **Shimenawa (注連縄)** sacred rope and zigzag white **Shide (紙垂)** paper pendants that unlock into a glowing golden celestial portal.
  - **Sakura Fubuki (桜吹雪)** cherry blossom swirl with dynamic sine-wave wind physics, altar spirit embers (*Hitodama*), and **Seigaiha (青海波模様)** ocean wave motifs.
- **Authentic Japanese Seal Stamps (判子 / Hanko)**:
  - Custom red inkan seals stamped dynamically upon reward collection (`見事` / Splendid!) and chamber clears (`見事`, `合格` / Passed!, `皆伝` / Mastery!).

#### 🔊 Audio & Pronunciation System
- **Offline Voice Audio Library**: Pre-cached voice pronunciations for all Kana syllables, vocabulary words, and colors (`public/audio/`) with automatic fallback to browser SpeechSynthesis.
- **Natural Speech Cadence**: Added deliberate acoustic pauses between syllables and words during word-crafting to eliminate rushed/overlapping audio.
- **Audio Replay Controls**: Dedicated `🔊 Pronunciation` replay buttons in the Kana reward screen, Word Builder, and door clue modals.
- **Reward Chime Fix**: Resolved auto-repeating voice audio during reward celebrations; pronunciation plays once and allows manual replay.

#### 📱 Mobile & Responsive Display System
- **Device Mode Switcher**: Added responsive layout engine supporting both **PC 16:9 Widescreen** and **Mobile 3:2** aspect ratios with live aspect-ratio toggling.
- **Virtual Touch Controls**: Built-in 8-way on-screen D-Pad and responsive action buttons (`[E] ACTION / PLAY`, `🎒 BAG [I]`) with toggleable visibility for smartphones and tablets.
- **Playfield Expansion**: Enlarged minigame viewports and responsive modal scaling, maximizing playable screen real estate on both desktop monitors and mobile devices.

#### 🎮 Replayability & Educational Minigames
- **In-Room Kana Letter Randomization**: Shuffles available reward Kana letters among the interactables within each room per run, ensuring high replayability while strictly preserving 100% solvability for door unlock words (`かぎ`, `とびら`, `でぐち`).
- **Color Matching Wires Overhaul**: Rewrote the circuit box puzzle to teach Japanese colors by pairing English wire leads with Japanese color names (`あか`, `あお`, `みどり`, `きいろ`, `むらさき`), Kanji equivalents, and Romaji pronunciations.
- **Universal Minigame Reset**: Added dedicated `[R] RESET` button to all minigame cabinets to quickly retry puzzles without backing out.

#### 💾 Save Data Backup & Migration
- **Save Transfer Modal**: Added JSON export and import modal accessible from the Title Screen for easy progress backup, restore, and transfer across devices.

#### 🌐 Clean English UI Navigation
- Preserved clean, intuitive English labels, buttons, headers, and HUD badges to ensure effortless navigation for club orientation participants while learning Japanese vocabulary.

---

## Contributing

Contributions, bug reports, and feature proposals are welcome:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/improvement`).
3. Commit your changes (`git commit -m 'Add new puzzle station'`).
4. Push to the branch (`git push origin feature/improvement`).
5. Open a Pull Request.

## License and Attribution

- **Organization**: Developed by **Kaizen (The Japanese Club)** using artificial intelligence.
- **License**: Released under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0) (GNU GPLv3).
