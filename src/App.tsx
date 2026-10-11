import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  CharacterId,
  InteractableObject,
  KanaItem,
  GameSaveState,
  RoomData,
} from './types/game';
import { ROOMS, generateShuffledRoomRewards, applyShuffledRewards } from './data/rooms';
import { GameViewport } from './game/GameViewport';
import { HUD } from './components/ui/HUD';
import { TitleScreen } from './components/ui/TitleScreen';
import { PauseMenu } from './components/ui/PauseMenu';
import { DoorClueModal } from './components/ui/DoorClueModal';
import { RewardNotification } from './components/ui/RewardNotification';
import { RoomVictoryModal } from './components/ui/RoomVictoryModal';
import { GameEndingModal } from './components/ui/GameEndingModal';
import { MiniGameModal } from './components/minigames/MiniGameModal';
import { InventoryModal } from './components/inventory/InventoryModal';
import { ScreenTransition } from './components/ui/ScreenTransition';
import { sounds } from './utils/audio';
import { useDeviceMode } from './utils/useDeviceMode';

const STORAGE_KEY = 'kana_escape_room_save';

export default function App() {
  const device = useDeviceMode();
  // Navigation / Modal States
  const [gameState, setGameState] = useState<
    'TITLE' | 'PLAYING' | 'MINIGAME' | 'INVENTORY' | 'DOOR_CLUE' | 'REWARD' | 'ROOM_VICTORY' | 'ENDING' | 'PAUSED'
  >('TITLE');

  // Game Progress State
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('adam');
  const [inventory, setInventory] = useState<KanaItem[]>([]);
  const [completedMinigames, setCompletedMinigames] = useState<string[]>([]);
  const [craftedWords, setCraftedWords] = useState<string[]>([]);
  const [unlockedDoors, setUnlockedDoors] = useState<string[]>([]);
  const [playtimeSeconds, setPlaytimeSeconds] = useState(0);
  const [volumeEnabled, setVolumeEnabled] = useState(true);

  // Active room minigame reward distribution per run
  const [shuffledRewards, setShuffledRewards] = useState<Record<string, KanaItem>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: GameSaveState = JSON.parse(raw);
        if (parsed.shuffledRewards && Object.keys(parsed.shuffledRewards).length > 0) {
          return parsed.shuffledRewards;
        }
      }
    } catch {
      // ignore
    }
    return generateShuffledRoomRewards(ROOMS);
  });

  // Active room cipher hint progression per room
  const [roomHints, setRoomHints] = useState<Record<string, { revealedCount: number; lastHintTimestamp: number }>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: GameSaveState = JSON.parse(raw);
        if (parsed.roomHints) {
          return parsed.roomHints;
        }
      }
    } catch {
      // ignore
    }
    return {};
  });

  // Active interaction targets
  const [activeInteractable, setActiveInteractable] = useState<InteractableObject | null>(null);
  const [rewardKana, setRewardKana] = useState<KanaItem | null>(null);

  // Screen Pixel-Dissolve Transition State
  const [transitionActive, setTransitionActive] = useState(false);
  const [targetNextRoomIndex, setTargetNextRoomIndex] = useState<number | null>(null);

  // Save detection
  const [hasSaveData, setHasSaveData] = useState(false);

  // Check saved state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: GameSaveState = JSON.parse(raw);
        if (parsed.currentRoomId) {
          setHasSaveData(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save current progress helper
  const saveGame = useCallback(() => {
    try {
      const baseRoom = ROOMS[currentRoomIndex] || ROOMS[0];
      const data: GameSaveState = {
        currentRoomId: baseRoom.id,
        selectedCharacter,
        inventory,
        completedMinigames,
        craftedWords,
        unlockedDoors,
        gameCompleted: false,
        playtimeSeconds,
        volumeEnabled,
        shuffledRewards,
        roomHints,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setHasSaveData(true);
    } catch {
      // ignore
    }
  }, [
    currentRoomIndex,
    selectedCharacter,
    inventory,
    completedMinigames,
    craftedWords,
    unlockedDoors,
    playtimeSeconds,
    volumeEnabled,
    shuffledRewards,
    roomHints,
  ]);

  // Autosave when room/inventory/unlocked status changes during play
  useEffect(() => {
    if (gameState !== 'TITLE') {
      saveGame();
    }
  }, [gameState, inventory, completedMinigames, unlockedDoors, shuffledRewards, roomHints, saveGame]);

  // Playtime tick
  useEffect(() => {
    if (
      gameState === 'TITLE' ||
      gameState === 'ENDING' ||
      gameState === 'PAUSED' ||
      gameState === 'REWARD' ||
      gameState === 'ROOM_VICTORY'
    )
      return;
    const timer = setInterval(() => {
      setPlaytimeSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  // Global Escape key coordinator:
  // - In MINIGAME: exits minigame back to PLAYING (never opens pause menu)
  // - In PAUSED: exits pause menu back to PLAYING
  // - In INVENTORY or DOOR_CLUE: exits back to PLAYING
  // - In PLAYING: opens PAUSED
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gameState === 'MINIGAME') {
          e.preventDefault();
          sounds.playSelect();
          setActiveInteractable(null);
          setGameState('PLAYING');
        } else if (gameState === 'PAUSED') {
          e.preventDefault();
          sounds.playSelect();
          setGameState('PLAYING');
        } else if (gameState === 'INVENTORY' || gameState === 'DOOR_CLUE') {
          e.preventDefault();
          sounds.playSelect();
          setGameState('PLAYING');
        } else if (gameState === 'PLAYING') {
          e.preventDefault();
          sounds.playSelect();
          setGameState('PAUSED');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Audio mute/unmute sync
  const toggleVolume = () => {
    const next = !volumeEnabled;
    setVolumeEnabled(next);
    sounds.setEnabled(next);
  };

  // Room ambient soundscape synchronizer
  useEffect(() => {
    if (gameState === 'PLAYING' || gameState === 'INVENTORY' || gameState === 'DOOR_CLUE' || gameState === 'MINIGAME') {
      const room = ROOMS[currentRoomIndex];
      if (room) {
        sounds.startRoomAmbient(room.id);
      }
    } else {
      sounds.stopAmbient();
    }
  }, [currentRoomIndex, gameState]);

  // Start fresh game with transition and a new randomized Kana distribution
  const handleStartNewGame = () => {
    const freshRewards = generateShuffledRoomRewards(ROOMS);
    setShuffledRewards(freshRewards);
    setCurrentRoomIndex(0);
    setInventory([]);
    setCompletedMinigames([]);
    setCraftedWords([]);
    setUnlockedDoors([]);
    setPlaytimeSeconds(0);
    setTargetNextRoomIndex(0);
    setTransitionActive(true);
    setGameState('PLAYING');
    sounds.playSelect();
  };

  // Continue from save with transition
  const handleContinueGame = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: GameSaveState = JSON.parse(raw);
        const rIndex = ROOMS.findIndex((r) => r.id === data.currentRoomId);
        const targetIdx = rIndex !== -1 ? rIndex : 0;
        setCurrentRoomIndex(targetIdx);
        setSelectedCharacter(data.selectedCharacter || 'adam');
        setInventory(data.inventory || []);
        setCompletedMinigames(data.completedMinigames || []);
        setCraftedWords(data.craftedWords || []);
        setUnlockedDoors(data.unlockedDoors || []);
        setPlaytimeSeconds(data.playtimeSeconds || 0);
        setVolumeEnabled(data.volumeEnabled ?? true);
        sounds.setEnabled(data.volumeEnabled ?? true);
        if (data.shuffledRewards && Object.keys(data.shuffledRewards).length > 0) {
          setShuffledRewards(data.shuffledRewards);
        } else {
          setShuffledRewards(generateShuffledRoomRewards(ROOMS));
        }
        setTargetNextRoomIndex(targetIdx);
        setTransitionActive(true);
        setGameState('PLAYING');
        sounds.playSelect();
        return;
      }
    } catch {
      // fallback
    }
    handleStartNewGame();
  };

  // Reset save data
  const handleResetSave = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSaveData(false);
    setShuffledRewards(generateShuffledRoomRewards(ROOMS));
    sounds.playFail();
  };

  // Import save data handler
  const handleSaveImported = (data: GameSaveState) => {
    const rIndex = ROOMS.findIndex((r) => r.id === data.currentRoomId);
    const targetIdx = rIndex !== -1 ? rIndex : 0;
    setCurrentRoomIndex(targetIdx);
    setSelectedCharacter(data.selectedCharacter || 'adam');
    setInventory(data.inventory || []);
    setCompletedMinigames(data.completedMinigames || []);
    setCraftedWords(data.craftedWords || []);
    setUnlockedDoors(data.unlockedDoors || []);
    setPlaytimeSeconds(data.playtimeSeconds || 0);
    setVolumeEnabled(data.volumeEnabled ?? true);
    sounds.setEnabled(data.volumeEnabled ?? true);
    if (data.shuffledRewards && Object.keys(data.shuffledRewards).length > 0) {
      setShuffledRewards(data.shuffledRewards);
    } else {
      setShuffledRewards(generateShuffledRoomRewards(ROOMS));
    }
    setHasSaveData(true);
  };

  const currentRoom: RoomData = useMemo(() => {
    const baseRoom = ROOMS[currentRoomIndex] || ROOMS[0];
    return applyShuffledRewards(baseRoom, shuffledRewards);
  }, [currentRoomIndex, shuffledRewards]);
  const isDoorUnlocked = unlockedDoors.includes(currentRoom.id);

  // Interaction handlers
  const handleInteract = useCallback((obj: InteractableObject) => {
    setActiveInteractable(obj);
    setGameState('MINIGAME');
    sounds.playSelect();
  }, []);

  const handleMinigameSuccess = useCallback(() => {
    if (!activeInteractable) return;
    const kana = activeInteractable.rewardKana;

    // Mark completed
    setCompletedMinigames((prev) => 
      prev.includes(activeInteractable.id) ? prev : [...prev, activeInteractable.id]
    );

    // Add Kana to inventory if not already present
    setInventory((prev) => {
      const alreadyHas = prev.some((k) => k.character === kana.character);
      if (!alreadyHas) {
        return [...prev, kana];
      }
      return prev;
    });

    setRewardKana(kana);
    setGameState('REWARD');
  }, [activeInteractable]);

  const handleDismissReward = useCallback(() => {
    setRewardKana(null);
    setActiveInteractable(null);
    setGameState('PLAYING');
  }, []);

  const handleInteractDoor = () => {
    setGameState('DOOR_CLUE');
    sounds.playSelect();
  };

  const handleWordCrafted = useCallback((word: string) => {
    setCraftedWords((prev) => (prev.includes(word) ? prev : [...prev, word]));
  }, []);

  const handleOpenDoor = () => {
    setCraftedWords((prev) =>
      prev.includes(currentRoom.targetWord) ? prev : [...prev, currentRoom.targetWord]
    );
    if (currentRoomIndex < ROOMS.length - 1) {
      setGameState('ROOM_VICTORY');
    } else {
      setGameState('ENDING');
    }
  };

  const handleProceedNextRoom = () => {
    const nextIdx = Math.min(ROOMS.length - 1, currentRoomIndex + 1);
    setTargetNextRoomIndex(nextIdx);
    setTransitionActive(true);
    setGameState('PLAYING');
  };

  const handleProceedPrevRoom = () => {
    if (currentRoomIndex <= 0) return;
    sounds.playDoorUnlock();
    const prevIdx = currentRoomIndex - 1;
    setTargetNextRoomIndex(prevIdx);
    setTransitionActive(true);
    setGameState('PLAYING');
  };

  const handleTransitionMidpoint = () => {
    if (targetNextRoomIndex !== null) {
      setCurrentRoomIndex(targetNextRoomIndex);
    }
  };

  const handleTransitionComplete = () => {
    setTransitionActive(false);
    setTargetNextRoomIndex(null);
  };

  // Word crafter unlocks door
  const handleUnlockDoor = () => {
    if (!unlockedDoors.includes(currentRoom.id)) {
      setUnlockedDoors((prev) => [...prev, currentRoom.id]);
    }
    setCraftedWords((prev) =>
      prev.includes(currentRoom.targetWord) ? prev : [...prev, currentRoom.targetWord]
    );
  };

  // Debug controls
  const handleDebugUnlockDoor = () => {
    handleUnlockDoor();
  };

  const handleDebugGiveKana = () => {
    // Add all kana from current room's minigames
    const roomKana = currentRoom.interactables.map((i) => i.rewardKana);
    setInventory((prev) => {
      const merged = [...prev];
      for (const k of roomKana) {
        if (!merged.some((m) => m.character === k.character)) {
          merged.push(k);
        }
      }
      return merged;
    });
    sounds.playKanaObtained();
  };

  const isPortraitEmulator = device.orientation === 'portrait' || (device.isMobile && !device.isDesktop);

  return (
    <main className={`w-screen ${isPortraitEmulator ? 'h-[100dvh]' : 'h-screen'} bg-[#0e0d1a] flex flex-col items-center justify-center relative overflow-hidden select-none`}>
      {gameState === 'TITLE' ? (
        <TitleScreen
          hasSaveData={hasSaveData}
          selectedCharacter={selectedCharacter}
          onSelectCharacter={setSelectedCharacter}
          onStartNewGame={handleStartNewGame}
          onContinueGame={handleContinueGame}
          onResetSave={handleResetSave}
          onSaveImported={handleSaveImported}
          volumeEnabled={volumeEnabled}
          onToggleVolume={toggleVolume}
        />
      ) : (
        <div
          className={`w-full h-full flex flex-col items-center justify-between p-1 sm:p-3 transition-all ${
            device.isDesktop ? 'max-w-7xl 2xl:max-w-[1536px]' : 'max-w-2xl sm:max-w-4xl'
          }`}
        >
          {/* Top Bar / HUD */}
          <HUD
            currentRoom={currentRoom}
            inventory={inventory}
            isDoorUnlocked={isDoorUnlocked}
            onReturnToPrevRoom={currentRoomIndex > 0 ? handleProceedPrevRoom : undefined}
            onOpenInventory={() => {
              sounds.playSelect();
              setGameState('INVENTORY');
            }}
            onOpenPauseMenu={() => {
              sounds.playSelect();
              setGameState('PAUSED');
            }}
            onOpenDoorClue={() => {
              sounds.playSelect();
              setGameState('DOOR_CLUE');
            }}
          />

          {/* Main 2D Pixel-Art Game Viewport */}
          <div className={`flex-1 w-full flex flex-col items-center ${isPortraitEmulator ? 'h-full justify-between' : 'justify-start sm:justify-center my-auto'} overflow-hidden min-h-0`}>
            <GameViewport
              room={currentRoom}
              characterId={selectedCharacter}
              isDoorUnlocked={isDoorUnlocked}
              completedMinigames={completedMinigames}
              isLocked={gameState !== 'PLAYING'}
              onInteract={handleInteract}
              onInteractDoor={handleInteractDoor}
              onReturnToPrevRoom={currentRoomIndex > 0 ? handleProceedPrevRoom : undefined}
              onOpenInventory={() => setGameState('INVENTORY')}
              onOpenPauseMenu={() => setGameState('PAUSED')}
              onDebugGiveKana={handleDebugGiveKana}
              onDebugUnlockDoor={handleDebugUnlockDoor}
            />
          </div>

          {/* Bottom helper info */}
          <div className="w-full text-center text-[10px] font-pixel text-slate-500 py-1 hidden sm:block">
            Kana Escape Room • Craft Japanese words to unlock exit seals
          </div>
        </div>
      )}

      {/* MODALS */}
      {gameState === 'MINIGAME' && activeInteractable && (
        <MiniGameModal
          interactable={activeInteractable}
          onSuccess={handleMinigameSuccess}
          onClose={() => setGameState('PLAYING')}
        />
      )}

      {gameState === 'REWARD' && rewardKana && (
        <RewardNotification
          kana={rewardKana}
          onDismiss={handleDismissReward}
        />
      )}

      {gameState === 'INVENTORY' && (
        <InventoryModal
          inventory={inventory}
          currentRoom={currentRoom}
          craftedWords={craftedWords}
          characterId={selectedCharacter}
          isDoorUnlocked={isDoorUnlocked}
          onUnlockDoor={handleUnlockDoor}
          onWordCrafted={handleWordCrafted}
          onClose={() => setGameState('PLAYING')}
        />
      )}

      {gameState === 'DOOR_CLUE' && (
        <DoorClueModal
          door={currentRoom.exitDoor}
          isUnlocked={isDoorUnlocked}
          roomHint={roomHints[currentRoom.id] || { revealedCount: 0, lastHintTimestamp: 0 }}
          onRevealHint={(newCount) => {
            setRoomHints((prev) => ({
              ...prev,
              [currentRoom.id]: {
                revealedCount: newCount,
                lastHintTimestamp: Date.now(),
              },
            }));
          }}
          onOpenDoor={handleOpenDoor}
          onClose={() => setGameState('PLAYING')}
        />
      )}

      {gameState === 'ROOM_VICTORY' && (
        <RoomVictoryModal
          room={currentRoom}
          collectedKanaCount={inventory.length}
          onProceed={handleProceedNextRoom}
        />
      )}

      {gameState === 'ENDING' && (
        <GameEndingModal
          totalKana={inventory.length}
          playtimeSeconds={playtimeSeconds}
          selectedCharacter={selectedCharacter}
          craftedWords={craftedWords}
          onPlayAgain={handleStartNewGame}
          onTitleScreen={() => setGameState('TITLE')}
        />
      )}

      {gameState === 'PAUSED' && (
        <PauseMenu
          volumeEnabled={volumeEnabled}
          onToggleVolume={toggleVolume}
          onResume={() => setGameState('PLAYING')}
          onOpenInventory={() => setGameState('INVENTORY')}
          onQuitToTitle={() => setGameState('TITLE')}
          onSaveImported={handleSaveImported}
        />
      )}

      {/* Screen Pixel-Dissolve Transition Effect */}
      <ScreenTransition
        active={transitionActive}
        roomName={
          (targetNextRoomIndex !== null ? ROOMS[targetNextRoomIndex] : currentRoom)?.name || currentRoom.name
        }
        roomNumber={
          (targetNextRoomIndex !== null ? ROOMS[targetNextRoomIndex] : currentRoom)?.number || currentRoom.number
        }
        targetIcon={
          (targetNextRoomIndex !== null ? ROOMS[targetNextRoomIndex] : currentRoom)?.targetIcon || currentRoom.targetIcon
        }
        onMidpoint={handleTransitionMidpoint}
        onComplete={handleTransitionComplete}
      />
    </main>
  );
}
