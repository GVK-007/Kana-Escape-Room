import React, { useState, useRef } from 'react';
import { sounds } from '../../utils/audio';

interface GameNutsAndBoltsProps {
  onSuccess: () => void;
  onFailure?: () => void;
}

const MAX_CAPACITY = 4;

const COLORS: Record<string, { bg: string; border: string; name: string }> = {
  R: { bg: '#ef4444', border: '#b91c1c', name: 'RED' },
  B: { bg: '#3b82f6', border: '#1d4ed8', name: 'BLUE' },
  G: { bg: '#10b981', border: '#047857', name: 'GREEN' },
  Y: { bg: '#eab308', border: '#a16207', name: 'YELLOW' },
  P: { bg: '#a855f7', border: '#7e22ce', name: 'PURPLE' },
};

export const GameNutsAndBolts: React.FC<GameNutsAndBoltsProps> = ({ onSuccess }) => {
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const [bolts, setBolts] = useState<string[][]>(() => initBolts());
  const [selectedBoltIdx, setSelectedBoltIdx] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [moves, setMoves] = useState(0);

  function initBolts(): string[][] {
    return [
      ['R', 'B', 'P', 'Y'], // Bolt 0
      ['G', 'Y', 'R', 'P'], // Bolt 1
      ['P', 'G', 'Y', 'B'], // Bolt 2
      ['B', 'P', 'G', 'R'], // Bolt 3
      ['Y', 'R', 'B', 'G'], // Bolt 4
      [],                   // Bolt 5 (Empty)
      [],                   // Bolt 6 (Empty)
    ];
  }

  const checkWin = (currentBolts: string[][]): boolean => {
    let completedBolts = 0;
    for (const bolt of currentBolts) {
      if (bolt.length === 0) continue;
      if (bolt.length !== MAX_CAPACITY) return false;
      const firstColor = bolt[0];
      if (!bolt.every((c) => c === firstColor)) return false;
      completedBolts++;
    }
    return completedBolts === 5;
  };

  // Helper: Count consecutive same-color nuts at top of a bolt
  const getTopSameColorCount = (bolt: string[]): number => {
    if (bolt.length === 0) return 0;
    const topColor = bolt[bolt.length - 1];
    let count = 0;
    for (let i = bolt.length - 1; i >= 0; i--) {
      if (bolt[i] === topColor) count++;
      else break;
    }
    return count;
  };

  const handleBoltClick = (boltIdx: number) => {
    if (won) return;

    if (selectedBoltIdx === null) {
      // Pick up top group of matching nuts
      if (bolts[boltIdx].length > 0) {
        sounds.playBlip(540);
        setSelectedBoltIdx(boltIdx);
      }
    } else {
      if (selectedBoltIdx === boltIdx) {
        // Deselect
        sounds.playBlip(320);
        setSelectedBoltIdx(null);
        return;
      }

      const sourceBolt = bolts[selectedBoltIdx];
      const targetBolt = bolts[boltIdx];

      if (sourceBolt.length === 0) {
        setSelectedBoltIdx(null);
        return;
      }

      const nutColor = sourceBolt[sourceBolt.length - 1];
      const topCount = getTopSameColorCount(sourceBolt);
      const targetCapacity = MAX_CAPACITY - targetBolt.length;

      // Can move if target is empty OR top of target matches the nut color
      const canAcceptColor = targetBolt.length === 0 || targetBolt[targetBolt.length - 1] === nutColor;

      if (canAcceptColor && targetCapacity > 0) {
        // Transfer all consecutive matching nuts that fit together!
        const countToMove = Math.min(topCount, targetCapacity);
        sounds.playSelect();

        const transferredNuts = Array(countToMove).fill(nutColor);

        const nextBolts = bolts.map((b, i) => {
          if (i === selectedBoltIdx) return b.slice(0, b.length - countToMove);
          if (i === boltIdx) return [...b, ...transferredNuts];
          return [...b];
        });

        setBolts(nextBolts);
        setSelectedBoltIdx(null);
        setMoves((m) => m + 1);

        if (checkWin(nextBolts)) {
          setWon(true);
          sounds.playSuccess();
          setTimeout(() => onSuccessRef.current(), 750);
        }
        return;
      }

      // Invalid move
      sounds.playFail();
      setSelectedBoltIdx(null);
    }
  };

  const restart = () => {
    setBolts(initBolts());
    setSelectedBoltIdx(null);
    setMoves(0);
    setWon(false);
  };

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[620px]">
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm">
        <span className="text-amber-400 font-bold">MOVES: {moves}</span>
        <span className="text-yellow-400 font-mono text-[10px] sm:text-xs">5 COLORS • 7 RODS (EXPERT)</span>
        <button
          onClick={restart}
          className="text-slate-400 hover:text-white underline cursor-pointer text-xs sm:text-sm"
        >
          RESET
        </button>
      </div>

      <div className="bg-slate-950 p-2 sm:p-5 border-4 border-slate-700 shadow-2xl w-full flex flex-col items-center relative">
        {/* Bolts Arena */}
        <div className="flex justify-around items-end w-full h-64 sm:h-72 bg-slate-900 border-2 border-slate-800 p-1 sm:p-3 pt-8 rounded-md gap-0.5 sm:gap-1">
          {bolts.map((bolt, idx) => {
            const isSelected = selectedBoltIdx === idx;
            const topSameCount = getTopSameColorCount(bolt);

            return (
              <button
                key={idx}
                onClick={() => handleBoltClick(idx)}
                className={`relative flex flex-col-reverse items-center w-10 min-[400px]:w-12 sm:w-15 md:w-17 h-54 sm:h-62 cursor-pointer group transition-all ${
                  isSelected ? 'scale-105' : ''
                }`}
              >
                {/* Vertical Steel Rod / Bolt */}
                <div className="absolute top-2 bottom-0 w-2.5 sm:w-3 bg-slate-600 border border-slate-400 rounded-t-sm shadow-inner" />

                {/* Base mount */}
                <div className="w-9 min-[400px]:w-11 sm:w-13 h-3 sm:h-3.5 bg-slate-700 border border-slate-500 rounded-sm z-10" />

                {/* Stacked Hex Nuts */}
                {bolt.map((colorKey, nutIdx) => {
                  const c = COLORS[colorKey];
                  // If selected, ALL consecutive top nuts of the same color lift up together!
                  const isLifted = isSelected && nutIdx >= bolt.length - topSameCount;

                  return (
                    <div
                      key={nutIdx}
                      className={`w-8.5 min-[400px]:w-10 sm:w-12 md:w-14 h-7 sm:h-8.5 rounded-sm border-2 flex items-center justify-center font-bold text-xs text-white shadow-md z-20 transition-all duration-150 ${
                        isLifted ? '-translate-y-6 ring-2 ring-yellow-300' : ''
                      }`}
                      style={{
                        backgroundColor: c.bg,
                        borderColor: c.border,
                      }}
                    >
                      <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900/60 border border-white/40" />
                    </div>
                  );
                })}

                {/* Selection Arrow */}
                {isSelected && (
                  <div className="absolute -top-6 text-yellow-400 text-sm sm:text-base animate-bounce font-bold">
                    ▼
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in z-30">
            <span className="text-emerald-400 text-base sm:text-lg mb-2 font-bold">★ ALL 5 COLORS SORTED! ★</span>
            <span className="text-xs sm:text-sm text-slate-300 mb-4 text-center">All 5 colors sorted into pure rods!</span>
            <button
              onClick={() => onSuccessRef.current()}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-bold border-2 border-white cursor-pointer shadow-lg"
            >
              CLAIM REWARD NOW
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] sm:text-xs text-slate-400 mt-3 text-center">
        Stacked nuts of the same color lift and move together as a single block!
      </p>
    </div>
  );
};
