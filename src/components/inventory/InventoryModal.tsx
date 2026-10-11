import React, { useState, useRef, useEffect } from 'react';
import { KanaItem, RoomData, JapaneseWord, CharacterId } from '../../types/game';
import { lookupJapaneseWord } from '../../data/dictionary';
import { sounds } from '../../utils/audio';
import { getRoomTheme } from '../../utils/theme';
import { getCharacterSprite } from '../../utils/pixelArt';
import { CHARACTERS } from '../../data/characters';

interface InventoryModalProps {
  inventory: KanaItem[];
  currentRoom: RoomData;
  craftedWords: string[];
  characterId?: CharacterId;
  isDoorUnlocked: boolean;
  onUnlockDoor: () => void;
  onClose: () => void;
  onWordCrafted?: (word: string) => void;
}

export type WordRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface WordRarityInfo {
  rarity: WordRarity;
  label: string;
  room: 'R1' | 'R2' | 'R3';
  roomName: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
  glowClass: string;
}

export function getWordRarityAndRoom(word: string): WordRarityInfo {
  let room: 'R1' | 'R2' | 'R3' = 'R1';
  let roomName = 'Room 1: Workshop';

  const r3Chars = new Set(['で', 'ぐ', 'ち', 'さ', 'く', 'じ', 'よ', 'う', 'デ', 'グ', 'チ', 'サ', 'ク', 'ジ', 'ヨ', 'ウ']);
  const r2Chars = new Set(['び', 'ら', 'い', 'ぬ', 'ほ', 'ん', 'ま', 'ビ', 'ラ', 'イ', 'ヌ', 'ホ', 'ン', 'マ']);

  if (word === 'でぐち' || Array.from(word).some((c) => r3Chars.has(c))) {
    room = 'R3';
    roomName = 'Room 3: Sacred Vault';
  } else if (word === 'とびら' || Array.from(word).some((c) => r2Chars.has(c))) {
    room = 'R2';
    roomName = 'Room 2: Grand Archive';
  }

  const isExitWord = word === 'かぎ' || word === 'とびら' || word === 'でぐち' || word === 'ほうぎょく';
  const len = Array.from(word).length;

  let rarity: WordRarity = 'common';
  if (isExitWord || len >= 4) {
    rarity = 'legendary';
  } else if (len === 3) {
    const epicWords = new Set(['かがみ', 'かたな', 'しずく', 'ひかり', 'こころ', 'きつね', 'あめ']);
    rarity = epicWords.has(word) ? 'epic' : 'rare';
  } else if (len === 2) {
    const commonWords = new Set(['ねこ', 'いぬ', 'みず', 'き', 'ひ', 'め', 'て', 'かみ', 'かこ']);
    rarity = commonWords.has(word) ? 'common' : 'uncommon';
  }

  const configs: Record<WordRarity, Omit<WordRarityInfo, 'rarity' | 'room' | 'roomName'>> = {
    common: {
      label: 'COMMON',
      bgClass: 'bg-slate-900/90',
      borderClass: 'border-slate-600',
      textClass: 'text-slate-300',
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-600',
      glowClass: '',
    },
    uncommon: {
      label: 'UNCOMMON',
      bgClass: 'bg-emerald-950/80',
      borderClass: 'border-emerald-500',
      textClass: 'text-emerald-300',
      badgeClass: 'bg-emerald-900/90 text-emerald-200 border-emerald-500',
      glowClass: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]',
    },
    rare: {
      label: 'RARE',
      bgClass: 'bg-cyan-950/80',
      borderClass: 'border-cyan-400',
      textClass: 'text-cyan-200',
      badgeClass: 'bg-cyan-900/90 text-cyan-200 border-cyan-400',
      glowClass: 'shadow-[0_0_10px_rgba(6,182,212,0.35)]',
    },
    epic: {
      label: 'EPIC',
      bgClass: 'bg-purple-950/80',
      borderClass: 'border-purple-400',
      textClass: 'text-purple-200',
      badgeClass: 'bg-purple-900/90 text-purple-200 border-purple-400',
      glowClass: 'shadow-[0_0_12px_rgba(168,85,247,0.4)]',
    },
    legendary: {
      label: 'LEGENDARY',
      bgClass: 'bg-amber-950/90',
      borderClass: 'border-amber-400',
      textClass: 'text-amber-200',
      badgeClass: 'bg-amber-900 text-amber-100 border-amber-300',
      glowClass: 'shadow-[0_0_14px_rgba(245,158,11,0.5)] ring-1 ring-yellow-400/50',
    },
  };

  return {
    rarity,
    room,
    roomName,
    ...configs[rarity],
  };
}

const CharacterPreviewCanvas: React.FC<{ characterId: CharacterId; frame: number }> = ({ characterId, frame }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, 48, 72);
    const sprite = getCharacterSprite(characterId, 'down', frame, false);
    ctx.drawImage(sprite, 0, 0, 48, 72);
  }, [characterId, frame]);

  return <canvas ref={canvasRef} width={48} height={72} className="pixelated block drop-shadow-md" />;
};

export const InventoryModal: React.FC<InventoryModalProps> = ({
  inventory,
  currentRoom,
  craftedWords,
  characterId = 'adam',
  isDoorUnlocked,
  onUnlockDoor,
  onClose,
  onWordCrafted,
}) => {
  const theme = getRoomTheme(currentRoom.id);
  const charProfile = CHARACTERS.find((c) => c.id === characterId) || CHARACTERS[0];

  const [slots, setSlots] = useState<(KanaItem | null)[]>([null, null, null, null]);
  const [hoveredKana, setHoveredKana] = useState<KanaItem | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [animFrame, setAnimFrame] = useState(0);

  const wordAppraiseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEvaluatedWordRef = useRef<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimFrame((f) => (f + 1) % 2);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (wordAppraiseTimerRef.current) clearTimeout(wordAppraiseTimerRef.current);
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'KeyI') {
        e.preventDefault();
        sounds.playSelect();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const currentWordStr = slots
    .filter((s): s is KanaItem => s !== null)
    .map((s) => s.character)
    .join('');

  const wordData: JapaneseWord | null = currentWordStr ? lookupJapaneseWord(currentWordStr) : null;
  const isTargetWord = wordData && wordData.word === currentRoom.targetWord;

  const handleKanaClick = (item: KanaItem) => {
    sounds.playSelect();
    sounds.speakJapanese(item.character);
    const firstEmptyIndex = slots.findIndex((s) => s === null);
    if (firstEmptyIndex !== -1) {
      const nextSlots = [...slots];
      nextSlots[firstEmptyIndex] = item;
      setSlots(nextSlots);
      checkWord(nextSlots);
    }
  };

  const handleSlotClick = (index: number) => {
    if (slots[index] === null) return;
    if (wordAppraiseTimerRef.current) {
      clearTimeout(wordAppraiseTimerRef.current);
      wordAppraiseTimerRef.current = null;
    }
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    lastEvaluatedWordRef.current = '';
    sounds.playBlip(320);
    const nextSlots = [...slots];
    nextSlots[index] = null;
    setSlots(nextSlots);
    checkWord(nextSlots);
  };

  const handleClear = () => {
    if (wordAppraiseTimerRef.current) {
      clearTimeout(wordAppraiseTimerRef.current);
      wordAppraiseTimerRef.current = null;
    }
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    lastEvaluatedWordRef.current = '';
    sounds.playBlip(260);
    setSlots([null, null, null, null]);
  };

  const checkWord = (currentSlots: (KanaItem | null)[]) => {
    if (wordAppraiseTimerRef.current) {
      clearTimeout(wordAppraiseTimerRef.current);
      wordAppraiseTimerRef.current = null;
    }
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }

    const word = currentSlots
      .filter((s): s is KanaItem => s !== null)
      .map((s) => s.character)
      .join('');

    if (!word) {
      lastEvaluatedWordRef.current = '';
      return;
    }

    if (word === lastEvaluatedWordRef.current) return;

    if (word === currentRoom.targetWord && !isDoorUnlocked) {
      lastEvaluatedWordRef.current = word;
      wordAppraiseTimerRef.current = setTimeout(() => {
        sounds.playDoorUnlock();
        speechTimerRef.current = setTimeout(() => {
          sounds.speakJapanese(word);
        }, 380);
        onUnlockDoor();
        if (onWordCrafted) onWordCrafted(word);
      }, 950);
    } else if (lookupJapaneseWord(word)) {
      lastEvaluatedWordRef.current = word;
      wordAppraiseTimerRef.current = setTimeout(() => {
        sounds.playKanaObtained();
        speechTimerRef.current = setTimeout(() => {
          sounds.speakJapanese(word);
        }, 340);
        if (onWordCrafted) onWordCrafted(word);
      }, 950);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: KanaItem, sourceSlotIndex?: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ item, sourceSlotIndex }));
  };

  const handleDropOnSlot = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const item: KanaItem = data.item;
      const sourceIndex: number | undefined = data.sourceSlotIndex;

      sounds.playSelect();
      const nextSlots = [...slots];

      if (sourceIndex !== undefined) {
        const temp = nextSlots[targetIndex];
        nextSlots[targetIndex] = item;
        nextSlots[sourceIndex] = temp;
      } else {
        nextSlots[targetIndex] = item;
      }

      setSlots(nextSlots);
      checkWord(nextSlots);
    } catch {
      // ignore
    }
  };

  const kanaSlotCount = Math.max(16, inventory.length);
  const kanaSlots = Array.from({ length: kanaSlotCount }, (_, idx) => inventory[idx] || null);

  const collectibleSlotCount = Math.max(16, craftedWords.length);
  const collectibleSlots = Array.from({ length: collectibleSlotCount }, (_, idx) => craftedWords[idx] || null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-1.5 sm:p-4 select-none">
      <div className={`relative bg-[#151426] border-4 ${theme.borderClass} ${theme.pixelBoxClass} p-2.5 sm:p-5 max-w-2xl lg:max-w-3xl xl:max-w-4xl w-full shadow-2xl flex flex-col gap-2.5 sm:gap-4 max-h-[96dvh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b-2 border-slate-700/80">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-xl">🎒</span>
            <h2 className="font-pixel text-xs sm:text-sm text-yellow-400 tracking-wider">
              INVENTORY & WORD CRAFTER
            </h2>
          </div>
          <button
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="font-pixel text-[9px] sm:text-xs px-2.5 py-1 bg-rose-900/60 hover:bg-rose-700 text-rose-200 border-2 border-rose-500 cursor-pointer active:translate-y-0.5"
          >
            [X] CLOSE
          </button>
        </div>

        {/* TOP SECTION: Player Inspection (Left) + Word Builder (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-4 items-stretch">
          {/* Player Inspection */}
          <div className="md:col-span-4 bg-slate-950/95 border-2 border-slate-700 p-2 sm:p-3 flex flex-col items-center justify-between shadow-inner rounded">
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-1 mb-1 text-[9px] font-pixel text-slate-400">
              <span className="text-yellow-400 font-bold">{charProfile.name.toUpperCase()}</span>
              <span className="text-emerald-400">R{currentRoom.number}</span>
            </div>

            <div className="w-20 h-24 sm:w-24 sm:h-28 bg-[#0a0915] border-2 border-slate-800 flex items-center justify-center relative shadow-inner my-1">
              <CharacterPreviewCanvas characterId={characterId} frame={animFrame} />
              <div className="absolute bottom-1.5 w-10 h-2 bg-black/60 rounded-full blur-[1px] pointer-events-none" />
            </div>

            <div className="w-full text-center flex flex-col gap-1 mt-1">
              <div className="text-[10px] sm:text-xs text-white font-pixel font-bold truncate">
                {charProfile.name} • {charProfile.title}
              </div>
              <div className="text-[9px] text-amber-300 font-pixel bg-amber-950/60 border border-amber-600/50 py-0.5 px-1.5 flex items-center justify-center gap-1">
                <span>TARGET:</span>
                <span className="text-xs">{currentRoom.targetIcon}</span>
                <span className="font-bold">{currentRoom.targetWord} ({currentRoom.targetMeaning})</span>
              </div>
              <div className="text-[8px] text-slate-400 font-mono">
                {isDoorUnlocked ? '✓ CHAMBER DOOR UNLOCKED' : currentRoom.clueHint}
              </div>
            </div>
          </div>

          {/* Word Builder */}
          <div className="md:col-span-8 bg-slate-950/95 border-2 border-slate-700 p-2 sm:p-3 flex flex-col justify-between shadow-inner rounded">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">⚡</span>
                <span className="font-pixel text-[10px] sm:text-xs text-amber-300 font-bold">
                  WORD BUILDER
                </span>
              </div>
              <button
                onClick={handleClear}
                className="font-pixel text-[8px] sm:text-[9px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 cursor-pointer active:scale-95"
              >
                CLEAR
              </button>
            </div>

            {/* Crafting Slots & Output */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-3 py-1">
              <div className="flex items-center gap-1 sm:gap-2">
                {slots.map((slotItem, index) => (
                  <div
                    key={index}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnSlot(e, index)}
                    onClick={() => handleSlotClick(index)}
                    className={`w-11 h-13 sm:w-14 sm:h-16 border-2 flex flex-col items-center justify-center cursor-pointer transition-all rounded ${
                      slotItem
                        ? 'bg-slate-900 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)] hover:border-red-400'
                        : 'bg-[#090814] border-dashed border-slate-700 hover:border-slate-500 shadow-inner'
                    }`}
                  >
                    {slotItem ? (
                      <>
                        <span className="font-kana text-xl sm:text-2xl font-bold text-yellow-300">
                          {slotItem.character}
                        </span>
                        <span className="font-mono text-[8px] sm:text-[9px] text-yellow-100 font-semibold">
                          {slotItem.romaji}
                        </span>
                      </>
                    ) : (
                      <span className="font-pixel text-[8px] text-slate-600">{index + 1}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-slate-500 font-pixel text-base sm:text-xl font-bold px-0.5 select-none">
                ➔
              </div>

              <div className="w-13 h-13 sm:w-16 sm:h-16 bg-[#090814] border-2 border-slate-700 flex flex-col items-center justify-center shadow-inner relative rounded">
                {wordData ? (
                  <>
                    <span className="text-xl sm:text-2xl filter drop-shadow">{wordData.icon}</span>
                    <span className="font-kana text-[9px] sm:text-[10px] font-bold text-yellow-300 truncate max-w-[48px]">
                      {wordData.word}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-slate-700 font-pixel">✧</span>
                )}
              </div>
            </div>

            {/* Appraisal Result Bar */}
            <div className="mt-1 min-h-[48px] flex items-center justify-center">
              {currentWordStr.length === 0 ? null : wordData ? (
                <div
                  className={`w-full p-2 border-2 flex items-center justify-between gap-2 transition-all rounded ${
                    isTargetWord
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-[0_0_14px_rgba(52,211,153,0.3)]'
                      : 'bg-indigo-950/80 border-indigo-400 text-indigo-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{wordData.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="font-kana text-sm font-bold text-yellow-300">
                          {wordData.word}
                        </span>
                        {wordData.kanji && (
                          <span className="font-kana text-xs text-slate-300">
                            ({wordData.kanji})
                          </span>
                        )}
                        <span className="font-mono text-[9px] text-cyan-300 font-bold">
                          [{wordData.romaji}]
                        </span>
                        <button
                          onClick={() => sounds.speakJapanese(wordData.word)}
                          className="px-1.5 py-0.5 bg-indigo-900 hover:bg-indigo-800 text-yellow-300 border border-yellow-400/60 rounded text-[9px] cursor-pointer ml-1"
                        >
                          🔊
                        </button>
                      </div>
                      <div className="text-[9px] font-semibold text-white truncate">
                        Meaning: {wordData.meaning} ({wordData.type})
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isTargetWord ? (
                      <span className="font-pixel text-[9px] text-yellow-300 font-bold animate-bounce block">
                        ★ DOOR UNLOCKED! ★
                      </span>
                    ) : (
                      <span className="font-pixel text-[8px] text-indigo-300 block">
                        ✓ DISCOVERED!
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full p-1.5 bg-rose-950/40 border border-rose-800 text-rose-300 flex items-center justify-center gap-1.5 text-center rounded">
                  <span className="font-pixel text-[9px]">
                    ❓ "{currentWordStr}" (No match)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: COLLECTED KANA */}
        <div className="flex flex-col gap-1 bg-slate-950/90 border-2 border-slate-700 p-2 sm:p-3 rounded shadow-inner">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1">
            <span className="font-pixel text-[10px] sm:text-xs text-cyan-300 font-bold">
              COLLECTED KANA ({inventory.length})
            </span>
            {hoveredKana && (
              <span className="text-[9px] font-mono text-yellow-300">
                {hoveredKana.character} [{hoveredKana.romaji}] • {hoveredKana.script}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 min-[420px]:grid-cols-6 sm:grid-cols-8 md:grid-cols-8 gap-1.5 pt-1">
            {kanaSlots.map((item, idx) => {
              if (item) {
                return (
                  <div
                    key={`kana-${item.id}-${idx}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onClick={() => handleKanaClick(item)}
                    onMouseEnter={() => setHoveredKana(item)}
                    onMouseLeave={() => setHoveredKana(null)}
                    className="h-11 sm:h-13 bg-indigo-950/90 hover:bg-indigo-900 border-2 border-indigo-500/80 hover:border-yellow-400 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all hover:scale-105 active:scale-95 shadow-md group relative select-none rounded"
                  >
                    <span className="font-kana text-lg sm:text-xl font-bold text-yellow-300 group-hover:text-yellow-200">
                      {item.character}
                    </span>
                    <span className="font-mono text-[8px] text-indigo-300 font-bold">
                      {item.romaji}
                    </span>
                    <span className="absolute top-0.5 right-1 text-[7px] text-indigo-400/80 font-mono">
                      {item.script === 'hiragana' ? 'H' : 'K'}
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={`empty-kana-${idx}`}
                  className="h-11 sm:h-13 bg-[#0a0915] border border-slate-800 flex items-center justify-center shadow-inner rounded opacity-50"
                />
              );
            })}
          </div>
        </div>

        {/* BOTTOM SECTION: COLLECTIBLES & DISCOVERIES WITH ROOM CODING & RARITY TIERS */}
        <div className="flex flex-col gap-1 bg-slate-950/90 border-2 border-slate-700 p-2 sm:p-3 rounded shadow-inner">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1">
            <span className="font-pixel text-[10px] sm:text-xs text-amber-400 font-bold">
              COLLECTIBLES ({craftedWords.length})
            </span>
          </div>

          <div className="grid grid-cols-4 min-[420px]:grid-cols-5 sm:grid-cols-7 md:grid-cols-8 gap-1.5 pt-1">
            {collectibleSlots.map((wordStr, idx) => {
              if (wordStr) {
                const info = lookupJapaneseWord(wordStr);
                const isTarget = wordStr === currentRoom.targetWord;
                const rarityData = getWordRarityAndRoom(wordStr);

                return (
                  <div
                    key={`col-${wordStr}-${idx}`}
                    onClick={() => {
                      sounds.playSelect();
                      sounds.speakJapanese(wordStr);
                      setSelectedWord(wordStr);
                    }}
                    className={`h-13 sm:h-15 border-2 flex flex-col items-center justify-between cursor-pointer transition-all hover:scale-105 active:scale-95 p-1 text-center rounded relative overflow-hidden ${rarityData.bgClass} ${rarityData.borderClass} ${rarityData.glowClass}`}
                  >
                    {/* Top Room & Rarity Indicator */}
                    <div className="w-full flex justify-between items-center text-[7px] font-mono leading-none">
                      <span className="text-cyan-300 font-bold">{rarityData.room}</span>
                      {isTarget ? (
                        <span className="text-yellow-400 font-bold">★ KEY</span>
                      ) : (
                        <span className={rarityData.textClass}>{rarityData.label}</span>
                      )}
                    </div>

                    <span className="text-base sm:text-lg leading-none">{info?.icon || '📜'}</span>

                    <span className="font-kana text-[9px] sm:text-[10px] font-bold text-yellow-300 truncate max-w-full">
                      {wordStr}
                    </span>

                    <span className="font-mono text-[7px] text-slate-300 truncate max-w-full">
                      {info?.romaji || ''}
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={`empty-col-${idx}`}
                  className="h-13 sm:h-15 bg-[#0a0915] border border-slate-800/80 flex items-center justify-center shadow-inner opacity-40 rounded"
                >
                  <span className="text-xs text-slate-700 font-pixel">?</span>
                </div>
              );
            })}
          </div>

          {/* Selected Collectible Details */}
          {selectedWord && (
            <div className="text-[9px] sm:text-[10px] text-slate-300 font-mono flex items-center gap-2 pt-1 border-t border-slate-800/80 flex-wrap">
              {(() => {
                const info = lookupJapaneseWord(selectedWord);
                const rarityData = getWordRarityAndRoom(selectedWord);
                return (
                  <>
                    <span className="text-yellow-400 font-bold">{selectedWord}</span>
                    {info?.kanji && <span>({info.kanji})</span>}
                    <span className="text-cyan-300">[{info?.romaji}]</span>
                    <span>• {info?.meaning}</span>
                    <span className={`px-1.5 py-0.2 border text-[8px] rounded font-bold ${rarityData.badgeClass}`}>
                      {rarityData.room} • {rarityData.label}
                    </span>
                    <button
                      onClick={() => sounds.speakJapanese(selectedWord)}
                      className="text-xs cursor-pointer text-yellow-300 hover:scale-110 ml-1"
                    >
                      🔊
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-pixel text-slate-500 pt-1 border-t border-slate-800">
          <span className="text-amber-400/80">Goal: {currentRoom.targetMeaning} ({currentRoom.targetIcon} {currentRoom.targetWord})</span>
          <span>[ESC] to return</span>
        </div>
      </div>
    </div>
  );
};
