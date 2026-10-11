import React from 'react';
import { RoomData, KanaItem } from '../../types/game';
import { sounds } from '../../utils/audio';
import { getRoomTheme } from '../../utils/theme';

interface HUDProps {
  currentRoom: RoomData;
  inventory: KanaItem[];
  isDoorUnlocked: boolean;
  onOpenInventory: () => void;
  onOpenPauseMenu: () => void;
  onOpenDoorClue?: () => void;
  onReturnToPrevRoom?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  currentRoom,
  inventory,
  isDoorUnlocked,
  onOpenInventory,
  onOpenPauseMenu,
  onOpenDoorClue,
  onReturnToPrevRoom,
}) => {
  const theme = getRoomTheme(currentRoom.id);

  return (
    <header className={`w-full max-w-5xl lg:max-w-6xl 2xl:max-w-7xl px-2 sm:px-4 py-1.5 sm:py-2 flex justify-between items-center ${theme.wagaraClass} bg-opacity-95 border-t-2 sm:border-2 ${theme.borderClass} ${theme.pixelBoxClass} font-pixel text-xs text-slate-300 shadow-2xl select-none transition-all`}>
      {/* Room and Clue Indicator */}
      <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 flex-1 mr-1">
        {/* Chamber & Name */}
        <div className="flex items-center gap-1 bg-slate-950/90 px-1.5 sm:px-3 py-1 border border-slate-700 shadow-sm min-w-0">
          <span className="text-[9px] sm:text-xs text-amber-400 font-pixel shrink-0">
            R{currentRoom.number}:
          </span>
          <span className="text-white text-[9px] sm:text-[10px] truncate max-w-[85px] min-[380px]:max-w-[125px] sm:max-w-none tracking-wide font-pixel">
            {currentRoom.name}
          </span>
        </div>

        {/* Return to Previous Room (Rooms 2 & 3) */}
        {currentRoom.number > 1 && onReturnToPrevRoom && (
          <button
            onClick={() => {
              sounds.playSelect();
              onReturnToPrevRoom();
            }}
            title={`Return to Room ${currentRoom.number - 1}`}
            className="flex items-center gap-1 bg-amber-950/90 hover:bg-amber-900 border border-amber-600/80 px-1.5 sm:px-2 py-1 text-amber-300 hover:text-amber-200 cursor-pointer text-[9px] sm:text-[10px] shadow-sm transition-all active:scale-95 shrink-0"
          >
            <span className="font-bold">←</span>
            <span className="hidden sm:inline font-pixel">ROOM {currentRoom.number - 1}</span>
            <span className="sm:hidden font-pixel">R{currentRoom.number - 1}</span>
          </button>
        )}

        {/* Clue Badge & Hints trigger */}
        <button
          onClick={() => {
            sounds.playSelect();
            onOpenDoorClue?.();
          }}
          title="Inspect Door Clue & Kana Cipher Hints"
          className="flex items-center gap-1 bg-slate-950/90 px-1.5 sm:px-2.5 py-1 border border-amber-500/60 shadow-sm hover:border-yellow-400 hover:bg-slate-900 cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <span className="text-[9px] sm:text-[10px] text-amber-300 hidden md:inline font-pixel">
            CLUE:
          </span>
          <span className="text-xs sm:text-sm">{currentRoom.targetIcon}</span>
          {isDoorUnlocked ? (
            <span className="text-[8px] sm:text-[9px] text-emerald-400 font-bold ml-0.5 font-pixel animate-pulse">
              ✓
            </span>
          ) : (
            <span className="text-[8px] text-amber-300 font-pixel ml-0.5 flex items-center gap-0.5">
              <span>💡</span>
              <span className="hidden sm:inline">HINTS</span>
            </span>
          )}
        </button>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          onClick={() => {
            sounds.playSelect();
            onOpenInventory();
          }}
          title="Open Inventory [I]"
          className="px-2 sm:px-3.5 py-1 sm:py-1.5 bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-800 text-white border-2 border-indigo-400 text-[9px] sm:text-[10px] cursor-pointer flex items-center gap-1 shadow-md active:translate-y-0.5"
        >
          <span className="hidden sm:inline font-pixel">🎒 [I] INVENTORY</span>
          <span className="sm:hidden font-pixel">🎒</span>
          <span className="bg-yellow-400 text-black px-1 py-0.2 rounded-none text-[8px] sm:text-[9px] font-bold">
            {inventory.length}
          </span>
        </button>

        <button
          onClick={() => {
            sounds.playSelect();
            onOpenPauseMenu();
          }}
          title="Pause [ESC]"
          className="px-1.5 sm:px-2.5 py-1 sm:py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-600 text-[9px] sm:text-[10px] cursor-pointer active:translate-y-0.5"
        >
          [ESC]
        </button>
      </div>
    </header>
  );
};
