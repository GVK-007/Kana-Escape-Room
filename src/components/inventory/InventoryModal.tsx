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

// Canvas preview helper for character model inside inventory
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

  // 4 building slots
  const [slots, setSlots] = useState<(KanaItem | null)[]>([null, null, null, null]);
  const [hoveredKana, setHoveredKana] = useState<KanaItem | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [animFrame, setAnimFrame] = useState(0);

  const wordAppraiseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEvaluatedWordRef = useRef<string>('');

  // Idle character animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimFrame((f) => (f + 1) % 2);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Cleanup pending audio timers on unmount
  useEffect(() => {
    return () => {
      if (wordAppraiseTimerRef.current) clearTimeout(wordAppraiseTimerRef.current);
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    };
  }, []);

  // Key listeners (Escape / I to close)
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

  // Formed word string
  const currentWordStr = slots
    .filter((s): s is KanaItem => s !== null)
    .map((s) => s.character)
    .join('');

  const wordData: JapaneseWord | null = currentWordStr ? lookupJapaneseWord(currentWordStr) : null;
  const isTargetWord = wordData && wordData.word === currentRoom.targetWord;

  // Add kana to next available slot
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

  // Remove kana from slot
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

  // Clear all slots
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

  // Check word validity and room target match with natural breathing delay
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

  // Drag and drop handlers
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

  // 2 rows of collected Kana slots (16 slots minimum)
  const kanaSlotCount = Math.max(16, inventory.length);
  const kanaSlots = Array.from({ length: kanaSlotCount }, (_, idx) => inventory[idx] || null);

  // 2 rows of collected words / collectibles (16 slots minimum)
  // Collectibles include all discovered crafted words
  const collectibleSlotCount = Math.max(16, craftedWords.length);
  const collectibleSlots = Array.from({ length: collectibleSlotCount }, (_, idx) => craftedWords[idx] || null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-1.5 sm:p-4 select-none">
      <div className={`relative bg-[#151426] border-4 ${theme.borderClass} ${theme.pixelBoxClass} p-3 sm:p-5 max-w-2xl lg:max-w-3xl xl:max-w-4xl w-full shadow-2xl flex flex-col gap-3 sm:gap-4 max-h-[96dvh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b-2 border-slate-700/80">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl">🎒</span>
            <h2 className="font-pixel text-[11px] sm:text-xs md:text-sm text-yellow-400 tracking-wider">
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

        {/* ========================================================= */}
        {/* TOP SECTION (MINECRAFT INVENTORY LAYOUT):                 */}
        {/* Player Model (Top Left) + Word Builder / Crafter (Top Right) */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          {/* TOP LEFT: PLAYER MODEL INSPECTION CHAMBER */}
          <div className="md:col-span-4 bg-slate-950/95 border-2 border-slate-700 p-2.5 sm:p-3 flex flex-col items-center justify-between shadow-inner rounded-xs">
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5 text-[9px] font-pixel text-slate-400">
              <span className="text-yellow-400 font-bold">{charProfile.name.toUpperCase()}</span>
              <span className="text-emerald-400">R{currentRoom.number}</span>
            </div>

            {/* Inset Pixel Character Display Frame */}
            <div className="w-24 h-28 bg-[#0a0915] border-2 border-slate-800 flex items-center justify-center relative shadow-inner my-1">
              <CharacterPreviewCanvas characterId={characterId} frame={animFrame} />
              {/* Subtle floor shadow */}
              <div className="absolute bottom-2 w-10 h-2 bg-black/60 rounded-full blur-[1px] pointer-events-none" />
            </div>

            {/* Character Info & Active Chamber Target */}
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

          {/* TOP RIGHT: WORD BUILDER (CRAFTING MATRIX & OUTPUT) */}
          <div className="md:col-span-8 bg-slate-950/95 border-2 border-slate-700 p-2.5 sm:p-3 flex flex-col justify-between shadow-inner rounded-xs">
            {/* Crafter Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">⚡</span>
                <span className="font-pixel text-[10px] sm:text-xs text-amber-300 font-bold">
                  WORD BUILDER (CRAFTING)
                </span>
              </div>
              <button
                onClick={handleClear}
                className="font-pixel text-[8px] sm:text-[9px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 cursor-pointer active:scale-95"
              >
                CLEAR SLOTS
              </button>
            </div>

            {/* Crafting Slots & Output Arrow Layout */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-1">
              {/* 4 Crafting Slots */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {slots.map((slotItem, index) => (
                  <div
                    key={index}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnSlot(e, index)}
                    onClick={() => handleSlotClick(index)}
                    className={`w-12 h-14 sm:w-14 sm:h-16 border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      slotItem
                        ? 'bg-slate-900 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)] hover:border-red-400'
                        : 'bg-[#090814] border-dashed border-slate-700 hover:border-slate-500 shadow-inner'
                    }`}
                  >
                    {slotItem ? (
                      <>
                        <span className="font-kana text-2xl font-bold text-yellow-300">
                          {slotItem.character}
                        </span>
                        <span className="font-mono text-[9px] text-yellow-100 font-semibold">
                          {slotItem.romaji}
                        </span>
                        <span className="text-[7px] text-slate-400">remove</span>
                      </>
                    ) : (
                      <span className="font-pixel text-[8px] text-slate-600">SLOT {index + 1}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Minecraft-style Crafting Arrow */}
              <div className="text-slate-500 font-pixel text-lg sm:text-xl font-bold px-1 select-none">
                ➔
              </div>

              {/* Crafting Result Output Box */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#090814] border-2 border-slate-700 flex flex-col items-center justify-center shadow-inner relative">
                {wordData ? (
                  <>
                    <span className="text-2xl filter drop-shadow">{wordData.icon}</span>
                    <span className="font-kana text-[10px] font-bold text-yellow-300 truncate max-w-[50px]">
                      {wordData.word}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-slate-700 font-pixel">✧</span>
                )}
              </div>
            </div>

            {/* Word Appraisal Banner / Info Output */}
            <div className="mt-2 min-h-[56px] flex items-center justify-center">
              {currentWordStr.length === 0 ? (
                <div className="text-center text-slate-500 font-pixel text-[10px]">
                  Place Kana into slots above to craft Japanese words!
                </div>
              ) : wordData ? (
                <div
                  className={`w-full p-2 border-2 flex items-center justify-between gap-2 transition-all ${
                    isTargetWord
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-[0_0_14px_rgba(52,211,153,0.3)]'
                      : 'bg-indigo-950/80 border-indigo-400 text-indigo-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xl shrink-0">{wordData.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="font-kana text-sm sm:text-base font-bold text-yellow-300">
                          {wordData.word}
                        </span>
                        {wordData.kanji && (
                          <span className="font-kana text-xs text-slate-300">
                            ({wordData.kanji})
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-cyan-300 font-bold">
                          [{wordData.romaji}]
                        </span>
                        <button
                          onClick={() => sounds.speakJapanese(wordData.word)}
                          title="Listen pronunciation"
                          className="px-1.5 py-0.2 bg-indigo-900 hover:bg-indigo-800 text-yellow-300 border border-yellow-400/60 rounded text-[10px] cursor-pointer ml-1"
                        >
                          🔊
                        </button>
                      </div>
                      <div className="text-[10px] font-semibold text-white truncate">
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
                <div className="w-full p-2 bg-rose-950/40 border-2 border-rose-800 text-rose-300 flex items-center justify-center gap-2 text-center">
                  <span className="text-sm">❓</span>
                  <span className="font-pixel text-[10px]">
                    "{currentWordStr}" is not in dictionary. Keep experimenting!
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MIDDLE SECTION: 2 ROWS FOR COLLECTED KANA                 */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-1.5 bg-slate-950/90 border-2 border-slate-700 p-2.5 sm:p-3 rounded-xs shadow-inner">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1">
            <div className="flex items-center gap-1.5">
              <span className="font-pixel text-[10px] sm:text-xs text-cyan-300 font-bold">
                COLLECTED KANA ({inventory.length})
              </span>
              <span className="text-[9px] text-slate-500 font-pixel">
                [2 ROWS INVENTORY]
              </span>
            </div>
            <span className="text-[8px] sm:text-[9px] text-slate-400 font-pixel">
              Tap or drag to slot
            </span>
          </div>

          {/* 2 Rows Grid of Kana Slots */}
          <div className="grid grid-cols-7 sm:grid-cols-8 md:grid-cols-8 gap-1.5 sm:gap-2 pt-1">
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
                    className="h-12 sm:h-14 bg-indigo-950/90 hover:bg-indigo-900 border-2 border-indigo-500/80 hover:border-yellow-400 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all hover:scale-105 active:scale-95 shadow-md group relative select-none"
                    title={`Add "${item.character}" (${item.romaji}) to Word Builder`}
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
              // Empty Minecraft Inventory Slot
              return (
                <div
                  key={`empty-kana-${idx}`}
                  className="h-12 sm:h-14 bg-[#0a0915] border-2 border-slate-800/80 flex items-center justify-center shadow-inner"
                >
                  <span className="font-pixel text-[7px] text-slate-700">#{idx + 1}</span>
                </div>
              );
            })}
          </div>

          {/* Hover Detail Line */}
          <div className="h-4 text-[9px] sm:text-[10px] text-slate-400 font-mono flex items-center gap-2 pt-0.5">
            {hoveredKana ? (
              <>
                <span className="text-yellow-400 font-bold">{hoveredKana.character}</span>
                <span>• Script: {hoveredKana.script}</span>
                <span>• Romaji: [{hoveredKana.romaji}]</span>
                <span className="text-slate-500 hidden sm:inline">(Tap to add to Crafter)</span>
              </>
            ) : (
              <span className="text-slate-600 text-[8px] sm:text-[9px]">Tap character to add to builder & pronounce</span>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM SECTION: 2 ROWS FOR COLLECTED COLLECTIBLES / WORDS */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-1.5 bg-slate-950/90 border-2 border-slate-700 p-2.5 sm:p-3 rounded-xs shadow-inner">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1">
            <div className="flex items-center gap-1.5">
              <span className="font-pixel text-[10px] sm:text-xs text-amber-400 font-bold">
                COLLECTED COLLECTIBLES ({craftedWords.length})
              </span>
              <span className="text-[9px] text-slate-500 font-pixel">
                [2 ROWS CRAFTED DISCOVERIES]
              </span>
            </div>
            <span className="text-[8px] sm:text-[9px] text-slate-400 font-pixel">
              Click word to listen 🔊
            </span>
          </div>

          {/* 2 Rows Grid of Discovered Word Collectibles */}
          <div className="grid grid-cols-6 sm:grid-cols-7 md:grid-cols-8 gap-1.5 sm:gap-2 pt-1">
            {collectibleSlots.map((wordStr, idx) => {
              if (wordStr) {
                const info = lookupJapaneseWord(wordStr);
                const isTarget = wordStr === currentRoom.targetWord;
                return (
                  <div
                    key={`col-${wordStr}-${idx}`}
                    onClick={() => {
                      sounds.playSelect();
                      sounds.speakJapanese(wordStr);
                      setSelectedWord(wordStr);
                    }}
                    className={`h-12 sm:h-14 border-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md p-0.5 text-center ${
                      isTarget
                        ? 'bg-amber-950/80 border-amber-400 hover:border-yellow-200 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                        : 'bg-indigo-950/70 border-indigo-500/80 hover:border-indigo-300'
                    }`}
                    title={`"${wordStr}": ${info?.meaning || 'Discovered'} - Tap to hear 🔊`}
                  >
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
              // Empty / Locked Mystery Collectible Slot
              return (
                <div
                  key={`empty-col-${idx}`}
                  className="h-12 sm:h-14 bg-[#0a0915] border-2 border-slate-800/80 flex flex-col items-center justify-center shadow-inner opacity-70"
                  title="Undiscovered Word! Experiment with Kana in Word Builder to unlock."
                >
                  <span className="text-xs text-slate-600 font-pixel">?</span>
                  <span className="text-[7px] text-slate-700 font-pixel">LOCKED</span>
                </div>
              );
            })}
          </div>

          {/* Selected Collectible Details */}
          <div className="h-4 text-[9px] sm:text-[10px] text-slate-400 font-mono flex items-center gap-2 pt-0.5">
            {selectedWord ? (
              (() => {
                const info = lookupJapaneseWord(selectedWord);
                return (
                  <>
                    <span className="text-yellow-400 font-bold">{selectedWord}</span>
                    {info?.kanji && <span>({info.kanji})</span>}
                    <span className="text-cyan-300">[{info?.romaji}]</span>
                    <span className="text-white">• {info?.meaning || 'Discovered Japanese word'}</span>
                    <button
                      onClick={() => sounds.speakJapanese(selectedWord)}
                      className="text-xs cursor-pointer text-yellow-300 hover:scale-110 ml-1"
                      title="Replay pronunciation"
                    >
                      🔊
                    </button>
                  </>
                );
              })()
            ) : (
              <span className="text-slate-600 text-[8px] sm:text-[9px]">
                {craftedWords.length > 0
                  ? 'Click any collected word to hear pronunciation and review its definition'
                  : 'Experiment with your collected Kana in the Word Builder to discover words!'}
              </span>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-1 text-[8px] sm:text-[9px] font-pixel text-slate-500 pt-1 border-t border-slate-800 text-center sm:text-left">
          <span className="text-amber-400/80">Chamber Goal: {currentRoom.targetMeaning} ({currentRoom.targetIcon} {currentRoom.targetWord})</span>
          <span>Press [I] or [ESC] to return to room</span>
        </div>
      </div>
    </div>
  );
};
