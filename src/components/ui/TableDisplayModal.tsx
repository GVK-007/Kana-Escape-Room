import React, { useEffect } from 'react';
import { JAPANESE_DICTIONARY } from '../../data/dictionary';
import { sounds } from '../../utils/audio';

interface TableDisplayModalProps {
  tableId: string;
  currentItems: string[];
  craftedWords: string[];
  onPlaceItem: (word: string, slotIndex: number) => void;
  onRemoveItem: (slotIndex: number) => void;
  onClose: () => void;
}

export const TableDisplayModal: React.FC<TableDisplayModalProps> = ({
  tableId,
  currentItems,
  craftedWords,
  onPlaceItem,
  onRemoveItem,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'KeyE') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Combine discovered words and unique items
  const uniqueCrafted = Array.from(new Set(craftedWords));

  const getItemInfo = (wordKey: string) => {
    return JAPANESE_DICTIONARY[wordKey] || {
      word: wordKey,
      kanji: wordKey,
      romaji: wordKey,
      meaning: 'Artifact',
      icon: '✨',
      type: 'Collectible',
    };
  };

  const handlePlace = (word: string) => {
    sounds.playKanaObtained();
    // If slot 0 is empty, place in slot 0
    if (!currentItems[0]) {
      onPlaceItem(word, 0);
    } else if (!currentItems[1]) {
      onPlaceItem(word, 1);
    } else {
      // Both filled: replace slot 1
      onPlaceItem(word, 1);
    }
  };

  const handleRemove = (slotIndex: number) => {
    sounds.playSelect();
    onRemoveItem(slotIndex);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 select-none animate-in fade-in">
      <div className="relative w-full max-w-xl bg-slate-950 border-4 border-amber-500/80 shadow-[0_0_35px_rgba(245,158,11,0.25)] flex flex-col max-h-[92vh] overflow-hidden rounded-sm font-pixel">
        {/* Header Bar */}
        <div className="flex justify-between items-center px-4 py-2.5 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b-2 border-amber-600/70">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏺</span>
            <span className="text-amber-300 font-bold tracking-wider text-xs sm:text-sm">
              EXHIBIT DISPLAY TABLE
            </span>
          </div>
          <button
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-500 text-red-200 text-[10px] cursor-pointer active:scale-95 transition-all"
          >
            ✕ [ESC]
          </button>
        </div>

        {/* Content Area */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4">
          {/* Table Pedestals Showcase */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[0, 1].map((slotIdx) => {
              const itemWord = currentItems[slotIdx];
              const item = itemWord ? getItemInfo(itemWord) : null;

              return (
                <div
                  key={slotIdx}
                  className={`relative flex flex-col items-center justify-between p-3 min-h-[140px] sm:min-h-[160px] border-2 rounded-sm transition-all ${
                    item
                      ? 'bg-gradient-to-b from-slate-900 to-amber-950/40 border-amber-400 shadow-[inset_0_0_15px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-900/60 border-dashed border-slate-700'
                  }`}
                >
                  <div className="w-full flex justify-between items-center text-[9px] text-amber-400/80 border-b border-slate-800 pb-1 mb-1">
                    <span>PEDESTAL {slotIdx + 1}</span>
                    <span className="text-slate-500">{item ? 'ON DISPLAY' : 'EMPTY'}</span>
                  </div>

                  {item ? (
                    <div className="flex flex-col items-center my-auto">
                      <span className="text-3xl sm:text-4xl filter drop-shadow-md animate-bounce mb-1">
                        {item.icon}
                      </span>
                      <span className="text-sm sm:text-base text-yellow-300 font-bold">
                        {item.kanji || item.word}
                      </span>
                      <span className="text-[10px] sm:text-xs text-amber-200/90 font-sans">
                        {item.romaji} • {item.meaning}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center my-auto text-slate-500">
                      <span className="text-2xl opacity-40 mb-1">🪑</span>
                      <span className="text-[9px] text-slate-400">SELECT AN ARTIFACT</span>
                    </div>
                  )}

                  {item ? (
                    <button
                      onClick={() => handleRemove(slotIdx)}
                      className="w-full mt-2 py-1 bg-red-950/80 hover:bg-red-800 border border-red-500/80 text-red-200 text-[9px] cursor-pointer active:scale-95 transition-all text-center"
                    >
                      REMOVE ✕
                    </button>
                  ) : (
                    <div className="w-full h-5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Collectibles Selection */}
          <div className="mt-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 mb-2.5">
              <span className="text-xs text-yellow-400 font-bold">
                ARTIFACTS IN BAG ({uniqueCrafted.length})
              </span>
              <span className="text-[9px] text-slate-400">
                Click item to exhibit
              </span>
            </div>

            {uniqueCrafted.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/60 border border-slate-800 text-slate-400 text-xs">
                No crafted words yet. Craft Japanese words in Bag [I] to unlock display artifacts!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {uniqueCrafted.map((word) => {
                  const info = getItemInfo(word);
                  const isPlaced = currentItems.includes(word);

                  return (
                    <div
                      key={word}
                      className={`flex items-center justify-between p-2 border transition-all ${
                        isPlaced
                          ? 'bg-amber-950/40 border-amber-600/60 text-amber-200'
                          : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700 hover:border-yellow-400 cursor-pointer active:scale-98'
                      }`}
                      onClick={() => {
                        if (!isPlaced) {
                          handlePlace(word);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl shrink-0">{info.icon}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-yellow-300 font-bold truncate">
                            {info.kanji || info.word} ({info.romaji})
                          </span>
                          <span className="text-[9px] text-slate-400 font-sans truncate">
                            {info.meaning}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 ml-2">
                        {isPlaced ? (
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[8px]">
                            EXHIBITED
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlace(word);
                            }}
                            className="px-2 py-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-[9px] cursor-pointer shadow-sm active:scale-95"
                          >
                            PLACE ➔
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-600 cursor-pointer active:scale-95"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
