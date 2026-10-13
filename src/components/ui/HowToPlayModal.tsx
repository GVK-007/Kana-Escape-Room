import React, { useEffect } from 'react';
import { sounds } from '../../utils/audio';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
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

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-sm p-3 sm:p-4 select-none">
      <div className="relative bg-[#17152b] border-4 border-yellow-400 pixel-box-gold p-4 sm:p-5 max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center w-full pb-2.5 border-b-2 border-slate-700/80 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl">📜</span>
            <div>
              <h2 className="font-pixel text-xs sm:text-sm text-yellow-400 tracking-wider">
                HOW TO PLAY
              </h2>
              <span className="font-pixel text-[8px] sm:text-[9px] text-cyan-300 block">
                かな脱出ガイド • KANA ESCAPE GUIDE
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="font-pixel text-[10px] sm:text-xs px-2 py-0.5 bg-rose-950/80 hover:bg-rose-800 text-rose-300 border border-rose-500/80 cursor-pointer active:translate-y-0.5"
            title="Close [ESC]"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto pr-1 flex flex-col gap-3 font-pixel text-slate-300 min-h-0 flex-1">
          {/* Goal */}
          <div className="bg-slate-950/80 border border-slate-700/80 p-2.5 sm:p-3">
            <div className="text-[10px] sm:text-xs text-yellow-300 mb-1 flex items-center gap-1.5 font-bold">
              <span>🎯</span>
              <span>THE GOAL</span>
            </div>
            <p className="text-[9px] sm:text-[10px] leading-relaxed text-slate-300">
              Escape all 3 mystery chambers. Each chamber's exit door is sealed by a Japanese cipher that only dissolves once you craft its target keyword!
            </p>
          </div>

          {/* How It Works (Concise Bullet Points) */}
          <div className="bg-slate-950/80 border border-slate-700/80 p-2.5 sm:p-3 flex flex-col gap-2">
            <div className="text-[10px] sm:text-xs text-cyan-300 mb-0.5 flex items-center gap-1.5 font-bold">
              <span>⚡</span>
              <span>WHAT TO DO</span>
            </div>

            <ul className="flex flex-col gap-2 text-[9px] sm:text-[10px] text-slate-300 leading-normal">
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 shrink-0">🕹️</span>
                <span>
                  <strong className="text-white">Play Minigames:</strong> Walk up to glowing room objects (safes, arcades, terminals) and press <span className="text-yellow-300">[E]</span> or tap to beat retro mini-puzzles.
                </span>
              </li>

              <li className="flex items-start gap-1.5">
                <span className="text-indigo-400 shrink-0">🔤</span>
                <span>
                  <strong className="text-white">Collect Kana:</strong> Winning minigames awards Japanese Hiragana/Katakana characters to your bag <span className="text-yellow-300">[I]</span>.
                </span>
              </li>

              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 shrink-0">🧩</span>
                <span>
                  <strong className="text-white">Craft Words:</strong> Open your bag <span className="text-yellow-300">[I]</span> to combine collected Kana into valid Japanese words. Check the Door Clue <span className="text-yellow-300">[💡]</span> for hints!
                </span>
              </li>

              <li className="flex items-start gap-1.5">
                <span className="text-yellow-400 shrink-0">🚪</span>
                <span>
                  <strong className="text-white">Unseal the Exit:</strong> Craft the room's secret exit word (<em className="text-yellow-200">かぎ</em> = Key, <em className="text-yellow-200">とびら</em> = Door, <em className="text-yellow-200">でぐち</em> = Exit) to unlock the door and advance.
                </span>
              </li>

              <li className="flex items-start gap-1.5">
                <span className="text-purple-400 shrink-0">🏺</span>
                <span>
                  <strong className="text-white">Exhibit Artifacts:</strong> Place crafted words onto museum tables in each room to register them as permanent artifacts.
                </span>
              </li>
            </ul>
          </div>

          {/* Event Prizes Banner */}
          <div className="bg-gradient-to-r from-amber-950/90 via-yellow-950/80 to-amber-950/90 border-2 border-yellow-400/90 p-2.5 sm:p-3 shadow-lg">
            <div className="text-[10px] sm:text-xs text-yellow-300 mb-1.5 flex items-center gap-1.5 font-bold tracking-wide">
              <span>🏆</span>
              <span>EVENT PRIZES AT STAKE!</span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-amber-200/90 leading-relaxed mb-2">
              Compete on the global Hall of Fame leaderboard! Prizes will be awarded to:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[8px] sm:text-[9px]">
              <div className="bg-black/60 border border-yellow-400/60 p-2 flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <div>
                  <div className="text-yellow-300 font-bold">LOWEST TIME</div>
                  <div className="text-slate-300 text-[8px]">Fastest escape speedrun champion</div>
                </div>
              </div>
              <div className="bg-black/60 border border-yellow-400/60 p-2 flex items-center gap-2">
                <span className="text-lg">🏺</span>
                <div>
                  <div className="text-amber-300 font-bold">MOST ARTIFACTS</div>
                  <div className="text-slate-300 text-[8px]">Highest number of words crafted</div>
                </div>
              </div>
            </div>
            <div className="text-[8px] text-yellow-400/90 text-center mt-2 font-mono">
              ★ Winners identified via unique # player tag on the Hall of Fame ★
            </div>
          </div>
        </div>

        {/* Footer / Understood Button */}
        <div className="pt-3 border-t-2 border-slate-700/80 mt-2 w-full flex justify-center shrink-0">
          <button
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="w-full sm:w-auto px-10 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-pixel font-bold text-xs border-2 border-white cursor-pointer active:translate-y-0.5 shadow-xl flex items-center justify-center gap-2 tracking-wider"
          >
            <span>✓</span>
            <span>UNDERSTOOD</span>
          </button>
        </div>
      </div>
    </div>
  );
};
