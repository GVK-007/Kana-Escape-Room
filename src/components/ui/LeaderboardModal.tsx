import React, { useState } from 'react';
import { getLeaderboard, LeaderboardEntry } from '../../utils/leaderboard';
import { LeaderboardView } from './LeaderboardView';
import { sounds } from '../../utils/audio';

interface LeaderboardModalProps {
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => getLeaderboard());

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 select-none">
      <div className="relative bg-[#1a1733] border-4 border-yellow-400 pixel-box-gold p-6 max-w-lg w-full shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center w-full pb-3 border-b-2 border-slate-700/80 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h2 className="font-pixel text-xs sm:text-sm text-yellow-400 tracking-wider">
              ESCAPE HALL OF FAME
            </h2>
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

        {/* Leaderboard Table View */}
        <LeaderboardView entries={entries} onRefresh={setEntries} />

        {/* Close Button */}
        <div className="mt-4 w-full flex justify-center">
          <button
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="px-8 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-pixel text-xs border-2 border-slate-500 cursor-pointer active:translate-y-0.5"
          >
            CLOSE [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
