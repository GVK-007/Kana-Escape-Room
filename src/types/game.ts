export type KanaScript = 'hiragana' | 'katakana';

export interface KanaItem {
  id: string;
  character: string;
  romaji: string;
  script: KanaScript;
  roomFound?: string;
  timestamp?: number;
}

export type MinigameType = 
  | '2048'
  | 'snake'
  | 'flappy'
  | 'color_match'
  | 'timed_code'
  | 'pattern_memory'
  | 'kana_catcher'
  | 'wall_breaker'
  | 'tic_tac_toe'
  | 'pong'
  | 'match3'
  | 'nuts_and_bolts'
  | 'sliding_puzzle'
  | 'lane_runner'
  | 'rock_paper_scissors'
  | 'sea_battle'
  | 'darts'
  | 'angry_birds'
  | 'dots_and_boxes'
  | 'card_match';

export interface InteractableObject {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  spriteType: 'arcade' | 'computer' | 'safe' | 'bookshelf' | 'chest' | 'clock' | 'terrarium' | 'terminal' | 'switchboard' | 'altar';
  minigameType: MinigameType;
  rewardKana: KanaItem;
  interactionRadius: number;
  description: string;
}

export interface ExitDoor {
  x: number;
  y: number;
  width: number;
  height: number;
  targetWord: string;
  targetMeaning: string;
  targetIcon: string;
  clueHint: string;
}

export interface RoomData {
  id: string;
  number: number;
  name: string;
  description: string;
  width: number; // in tiles (16px per tile)
  height: number;
  floorType: 'wood' | 'stone' | 'carpet_tatami';
  targetWord: string;
  targetMeaning: string;
  targetIcon: string;
  clueHint: string;
  requiredKana: string[];
  interactables: InteractableObject[];
  exitDoor: ExitDoor;
  entranceDoor?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  playerSpawn: { x: number; y: number };
  decorations: Array<{
    x: number;
    y: number;
    type: 'plant' | 'rug' | 'table' | 'chair' | 'window' | 'lamp' | 'banner' | 'shelf';
    solid?: boolean;
    width?: number;
    height?: number;
  }>;
}

export interface JapaneseWord {
  word: string;
  kanji?: string;
  romaji: string;
  meaning: string;
  icon: string;
  type: string;
}

export type CharacterId = 'adam' | 'alex' | 'amelia' | 'bob';

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
}

export interface GameSaveState {
  currentRoomId: string;
  selectedCharacter: CharacterId;
  inventory: KanaItem[];
  completedMinigames: string[]; // interactable ids
  craftedWords: string[];
  unlockedDoors: string[]; // room ids
  gameCompleted: boolean;
  playtimeSeconds: number;
  volumeEnabled: boolean;
  shuffledRewards?: Record<string, KanaItem>;
  roomHints?: Record<string, { revealedCount: number; lastHintTimestamp: number }>;
}
