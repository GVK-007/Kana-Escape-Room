import React, { useState, useEffect } from 'react';
import { ExitDoor } from '../../types/game';
import { sounds } from '../../utils/audio';

export function getHintCooldownSeconds(revealedCount: number): number {
  if (revealedCount <= 1) return 15;
  if (revealedCount === 2) return 30;
  if (revealedCount === 3) return 45;
  return 60;
}

export interface RoomHintState {
  revealedCount: number; // 0: no hint yet, 1: word length shown (? ?), 2: 1st letter revealed, etc.
  lastHintTimestamp: number; // Unix timestamp in ms
}

interface DoorClueModalProps {
  door: ExitDoor;
  isUnlocked: boolean;
  roomHint?: RoomHintState;
  onRevealHint?: (newCount: number) => void;
  onOpenDoor: () => void;
  onClose: () => void;
}

export const DoorClueModal: React.FC<DoorClueModalProps> = ({
  door,
  isUnlocked,
  roomHint = { revealedCount: 0, lastHintTimestamp: 0 },
  onRevealHint,
  onOpenDoor,
  onClose,
}) => {
  const letters = Array.from(door.targetWord);
  const revealedCount = roomHint.revealedCount;
  const allRevealed = revealedCount > letters.length;

  // Live cooldown timer calculation with progressive scaling
  const [cooldownRemaining, setCooldownRemaining] = useState(() => {
    if (revealedCount === 0 || allRevealed) return 0;
    const cooldownDuration = getHintCooldownSeconds(revealedCount);
    const elapsed = Math.floor((Date.now() - roomHint.lastHintTimestamp) / 1000);
    return Math.max(0, cooldownDuration - elapsed);
  });

  useEffect(() => {
    if (revealedCount === 0 || allRevealed) {
      setCooldownRemaining(0);
      return;
    }

    const updateTimer = () => {
      const cooldownDuration = getHintCooldownSeconds(revealedCount);
      const elapsed = Math.floor((Date.now() - roomHint.lastHintTimestamp) / 1000);
      const remaining = Math.max(0, cooldownDuration - elapsed);
      setCooldownRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [revealedCount, roomHint.lastHintTimestamp, allRevealed]);

  // Handle advancing hint stage
  const handleRevealNextHint = () => {
    if (cooldownRemaining > 0 || allRevealed) return;

    const nextCount = revealedCount + 1;
    onRevealHint?.(nextCount);

    if (nextCount === 1) {
      // Stage 1: Revealed letter block placeholders (? ?)
      sounds.playSelect();
    } else {
      // Stage 2+: Revealed a specific kana letter
      const letterIndex = nextCount - 2;
      const revealedChar = letters[letterIndex];
      if (revealedChar) {
        sounds.playKanaObtained();
        setTimeout(() => {
          sounds.speakJapanese(revealedChar);
        }, 150);
      }
    }
  };

  const handlePronounceKana = (char: string) => {
    sounds.playSelect();
    sounds.speakJapanese(char);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'KeyE') {
        if (isUnlocked) {
          onOpenDoor();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUnlocked, onOpenDoor, onClose]);

  // Next letter ordinal label (1st, 2nd, 3rd)
  const nextTargetIndex = Math.max(0, revealedCount - 1);
  const ordinalLabel =
    nextTargetIndex === 0 ? '1ST' : nextTargetIndex === 1 ? '2ND' : nextTargetIndex === 2 ? '3RD' : `${nextTargetIndex + 1}TH`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4">
      <div className="relative bg-[#19172e] border-4 border-amber-500/70 pixel-box-cedar p-4 sm:p-6 max-w-md md:max-w-3xl w-full shadow-2xl flex flex-col md:flex-row gap-5 items-stretch">
        
        {/* LEFT COLUMN: Door Lore & Status */}
        <div className="flex-1 flex flex-col items-center text-center gap-3 justify-between">
          <div className="flex flex-col items-center gap-2 w-full">
            {/* Door Icon Badge */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-950 border-4 border-yellow-400/80 flex items-center justify-center text-4xl sm:text-5xl shadow-[0_0_20px_rgba(250,204,21,0.25)]">
              {door.targetIcon}
            </div>

            <h3 className="font-pixel text-xs sm:text-sm text-yellow-400 tracking-wide">
              {isUnlocked ? 'EXIT GATEWAY UNLOCKED!' : 'LOCKED EXIT DOOR'}
            </h3>

            {isUnlocked ? (
              <div className="flex flex-col gap-2 w-full">
                <p className="text-xs text-emerald-300 font-sans">
                  The exit mechanism hums with power! The correct Japanese word has dissolved the seal.
                </p>
                <div className="flex items-center justify-center gap-2 my-1 bg-slate-950 py-1.5 px-3 border border-emerald-500/60 shadow-inner">
                  <span className="font-kana text-2xl font-bold text-yellow-300 tracking-wider">
                    {door.targetWord}
                  </span>
                  <button
                    onClick={() => sounds.speakJapanese(door.targetWord)}
                    className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-800 text-yellow-300 border border-yellow-400/60 rounded text-xs cursor-pointer active:scale-95"
                    title="Listen to Japanese pronunciation"
                  >
                    🔊
                  </button>
                </div>
                <p className="text-xs text-yellow-200 font-pixel mt-1">
                  Ready to proceed through the door?
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 w-full">
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {door.clueHint}
                </p>
                <div className="bg-slate-950/90 border-2 border-amber-500/60 p-2.5 sm:p-3 shadow-inner text-left">
                  <span className="font-pixel text-[10px] text-amber-300 block mb-1">
                    SEAL CLUE:
                  </span>
                  <span className="text-xs text-slate-200 font-sans leading-relaxed block">
                    You must craft the Japanese word for <strong className="text-yellow-300 font-bold">"{door.targetMeaning}"</strong> in your inventory to unlock this door.
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-pixel">
                  Explore the room, beat minigames to collect Kana, and press [I] to craft words!
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 mt-3 flex-wrap justify-center w-full">
            {isUnlocked ? (
              <button
                onClick={() => {
                  sounds.playDoorOpen();
                  onOpenDoor();
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-pixel text-xs border-2 border-white cursor-pointer active:translate-y-0.5 shadow-lg"
              >
                [E] PASS THROUGH DOOR
              </button>
            ) : (
              <button
                onClick={() => {
                  sounds.playSelect();
                  onClose();
                }}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-pixel text-xs border-2 border-slate-500 cursor-pointer active:translate-y-0.5"
              >
                [OK] UNDERSTOOD
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: The Shrine Cipher Hint System */}
        <div className="flex-1 border-t-2 md:border-t-0 md:border-l-2 border-amber-500/40 pt-4 md:pt-0 md:pl-5 flex flex-col justify-between">
          <div className="flex flex-col gap-3">
            {/* Hint Chamber Header */}
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg">⛩️</span>
                <span className="font-pixel text-[11px] sm:text-xs text-amber-300 font-bold">
                  SEAL CIPHER HINTS
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 border border-slate-800">
                {door.targetMeaning.toUpperCase()}
              </span>
            </div>

            {/* Letter Boxes Display */}
            {revealedCount === 0 ? (
              <div className="flex flex-col items-center justify-center p-4 sm:p-5 bg-slate-950/80 border-2 border-dashed border-amber-900/60 rounded-xs min-h-[110px] text-center">
                <span className="text-2xl sm:text-3xl mb-1 text-slate-500">🔒</span>
                <span className="text-xs text-amber-200/90 font-pixel">SEAL ENCRYPTION LOCKED</span>
                <p className="text-[10px] text-slate-400 font-sans mt-1">
                  Stuck on "{door.targetMeaning}"? Request a hint to reveal the required letter blocks.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Interactive Letter Boxes */}
                <div className="flex items-center justify-center gap-2.5 sm:gap-3 py-3 px-2 bg-slate-950/90 border-2 border-amber-500/50 shadow-inner rounded-xs">
                  {letters.map((char, idx) => {
                    const isLetterRevealed = idx < revealedCount - 1;
                    return isLetterRevealed ? (
                      <button
                        key={idx}
                        onClick={() => handlePronounceKana(char)}
                        title={`Click to listen to "${char}" pronunciation`}
                        className="group relative w-12 h-16 sm:w-15 sm:h-18 bg-gradient-to-b from-amber-950/90 to-slate-950 border-3 border-yellow-400/90 hover:border-yellow-200 flex flex-col items-center justify-center cursor-pointer shadow-[0_0_15px_rgba(250,204,21,0.35)] active:scale-95 transition-all"
                      >
                        <span className="font-kana text-2xl sm:text-3xl font-bold text-yellow-300 drop-shadow">
                          {char}
                        </span>
                        <span className="text-[9px] text-amber-300 group-hover:text-white flex items-center gap-0.5 mt-0.5 animate-pulse">
                          🔊
                        </span>
                        <div className="absolute -top-2 px-1 bg-yellow-500 text-black text-[7px] font-pixel font-bold shadow-xs">
                          #{idx + 1}
                        </div>
                      </button>
                    ) : (
                      <div
                        key={idx}
                        className="relative w-12 h-16 sm:w-15 sm:h-18 bg-slate-900/90 border-3 border-dashed border-slate-600 flex flex-col items-center justify-center select-none shadow-inner"
                      >
                        <span className="font-pixel text-xl sm:text-2xl text-slate-500 animate-pulse font-bold">
                          ?
                        </span>
                        <div className="absolute -top-2 px-1 bg-slate-700 text-slate-300 text-[7px] font-pixel">
                          #{idx + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtitle Guide */}
                <div className="text-center px-1">
                  {allRevealed ? (
                    <span className="text-[10px] text-emerald-300 font-sans">
                      All letters revealed! Click any Kana box to replay voice pronunciation 🔊
                    </span>
                  ) : revealedCount > 1 ? (
                    <span className="text-[10px] text-amber-300/90 font-sans">
                      Click revealed Kana box to hear Japanese pronunciation 🔊
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-sans">
                      Word length: <strong className="text-yellow-300">{letters.length} Kana</strong> required for "{door.targetMeaning}".
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Hint Action Button / Timer Section */}
          <div className="mt-4 pt-2 border-t border-slate-800 flex flex-col gap-1.5">
            {revealedCount === 0 ? (
              <button
                onClick={handleRevealNextHint}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-pixel text-xs border-2 border-yellow-300 cursor-pointer shadow-lg active:translate-y-0.5 animate-pulse flex items-center justify-center gap-2"
              >
                <span>💡</span>
                <span>REQUEST HINT (SHOW {letters.length} BLOCKS)</span>
              </button>
            ) : allRevealed ? (
              <div className="w-full py-2 px-3 bg-emerald-950/80 border-2 border-emerald-500/80 text-emerald-300 font-pixel text-xs text-center flex items-center justify-center gap-2">
                <span>✓</span>
                <span>ALL {letters.length} KANA REVEALED</span>
              </div>
            ) : cooldownRemaining > 0 ? (
              <button
                disabled
                className="w-full py-2.5 px-3 bg-slate-900/90 border-2 border-slate-700 text-slate-400 font-pixel text-xs opacity-75 cursor-not-allowed flex items-center justify-center gap-2 shadow-inner"
              >
                <span>⏳</span>
                <span>NEXT HINT IN {cooldownRemaining}s</span>
              </button>
            ) : (
              <button
                onClick={handleRevealNextHint}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-pixel text-xs border-2 border-yellow-300 cursor-pointer shadow-lg active:translate-y-0.5 animate-pulse flex items-center justify-center gap-2"
              >
                <span>💡</span>
                <span>REVEAL {ordinalLabel} LETTER</span>
              </button>
            )}

            <div className="text-[9px] text-slate-500 font-sans text-center">
              {allRevealed
                ? 'Craft the word in your Bag [I] to dissolve the seal.'
                : `Progressive hint cooldown: 15s → 30s → 45s → 60s.`}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
