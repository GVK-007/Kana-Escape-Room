import React, { useEffect } from 'react';
import { LeaderboardEntry, LeaderboardCategory, formatTime } from '../../utils/leaderboard';
import { lookupJapaneseWord } from '../../data/dictionary';
import { sounds } from '../../utils/audio';

interface RunDetailsModalProps {
  entry: LeaderboardEntry;
  rank: number;
  category?: LeaderboardCategory;
  onClose: () => void;
}

export const RunDetailsModal: React.FC<RunDetailsModalProps> = ({ entry, rank, category = 'time', onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        sounds.playSelect();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const words = entry.craftedWords && entry.craftedWords.length > 0
    ? entry.craftedWords
    : ['でぐち']; // Exit word at minimum

  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  const rankLabel = category === 'artifacts' ? '🏺 ARTIFACTS RANK' : '⚡ SPEED RANK';

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/90 backdrop-blur-xs p-4 select-none animate-in fade-in duration-200">
      <div className="relative bg-[#17162b] border-4 border-yellow-400 pixel-box-gold p-6 max-w-md w-full shadow-2xl flex flex-col items-center gap-4">
        {/* Header */}
        <div className="flex justify-between items-center w-full pb-2 border-b-2 border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">{medal}</span>
            <div className="text-left">
              <span className="font-pixel text-[9px] text-yellow-300 block">
                {rankLabel} #{rank}
              </span>
              <h3 className="font-pixel text-xs sm:text-sm text-white tracking-wider truncate max-w-[220px]">
                {entry.runName}
              </h3>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="font-pixel text-xs px-2.5 py-1 bg-rose-900/60 hover:bg-rose-700 text-rose-200 border-2 border-rose-500 cursor-pointer active:translate-y-0.5"
          >
            ESC
          </button>
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-4 gap-1.5 bg-slate-950/80 border border-slate-800 p-2.5 text-center">
          <div>
            <span className="font-pixel text-[8px] text-slate-400 block">TIME</span>
            <span className="font-mono text-xs sm:text-sm text-yellow-300 font-bold">
              {formatTime(entry.playtimeSeconds)}
            </span>
          </div>
          <div>
            <span className="font-pixel text-[8px] text-slate-400 block">ARTIFACTS</span>
            <span className="font-mono text-xs sm:text-sm text-amber-300 font-bold">
              🏺 {words.length}
            </span>
          </div>
          <div>
            <span className="font-pixel text-[8px] text-slate-400 block">KANA</span>
            <span className="font-mono text-xs sm:text-sm text-cyan-300 font-bold">
              {entry.totalKana}
            </span>
          </div>
          <div>
            <span className="font-pixel text-[8px] text-slate-400 block">EXPLORER</span>
            <span className="font-pixel text-[10px] sm:text-xs text-emerald-400 truncate block">
              {entry.characterName}
            </span>
          </div>
        </div>

        {/* Words Created List */}
        <div className="w-full flex flex-col gap-1.5 text-left">
          <div className="flex justify-between items-center px-1">
            <span className="font-pixel text-[10px] text-amber-300 tracking-wider">
              WORDS CREATED ({words.length})
            </span>
            <span className="font-pixel text-[8px] text-slate-500">
              {entry.formattedDate}
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/80 bg-slate-950 border border-slate-800 p-2">
            {words.map((w, i) => {
              const info = lookupJapaneseWord(w);
              return (
                <div
                  key={`${w}-${i}`}
                  className="py-1.5 px-2 flex items-center justify-between text-xs hover:bg-slate-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl filter drop-shadow">
                      {info?.icon || '📝'}
                    </span>
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-kana text-sm font-bold text-yellow-300">
                          {info?.word || w}
                        </span>
                        {info?.kanji && (
                          <span className="font-kana text-xs text-slate-400">
                            ({info.kanji})
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-cyan-300">
                          [{info?.romaji || w}]
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300 font-sans">
                        {info?.meaning || 'Crafted Word'}
                      </div>
                    </div>
                  </div>
                  {w === 'でぐち' && (
                    <span className="font-pixel text-[7px] bg-emerald-950 text-emerald-300 border border-emerald-500 px-1 py-0.5 rounded-xs">
                      EXIT KEY
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => {
            sounds.playSelect();
            onClose();
          }}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-pixel text-xs border border-slate-600 cursor-pointer active:translate-y-0.5 mt-1"
        >
          BACK TO LEADERBOARD
        </button>
      </div>
    </div>
  );
};
