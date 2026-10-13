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

## Contributing

Contributions, bug reports, and feature proposals are welcome:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/improvement`).
3. Commit your changes (`git commit -m 'Add new puzzle station'`).
4. Push to the branch (`git push origin feature/improvement`).
5. Open a Pull Request.

---

## License and Attribution

- **Organization**: Developed by **Kaizen (The Japanese Club)** using artificial intelligence.
- **License**: Released under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0) (GNU GPLv3).
