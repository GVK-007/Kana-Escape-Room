import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sounds } from '../../utils/audio';

interface GameSlidingPuzzleProps {
  onSuccess: () => void;
  onFailure?: () => void;
}

export const GameSlidingPuzzle: React.FC<GameSlidingPuzzleProps> = ({ onSuccess }) => {
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const [tiles, setTiles] = useState<number[]>(() => generateSolvableShuffle());
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const [hintCooldown, setHintCooldown] = useState(0);

  // Generate challenging randomized but 100% solvable 3x3 shuffle
  function generateSolvableShuffle(): number[] {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    let emptyIdx = 8;
    let prevIdx = -1;

    // Perform 32 random valid moves from solved state
    for (let step = 0; step < 32; step++) {
      const row = Math.floor(emptyIdx / 3);
      const col = emptyIdx % 3;
      const neighbors: number[] = [];

      if (row > 0) neighbors.push(emptyIdx - 3);
      if (row < 2) neighbors.push(emptyIdx + 3);
      if (col > 0) neighbors.push(emptyIdx - 1);
      if (col < 2) neighbors.push(emptyIdx + 1);

      // Avoid immediately undoing previous move
      const valid = neighbors.filter((n) => n !== prevIdx);
      const chosen = valid[Math.floor(Math.random() * valid.length)] ?? neighbors[0];

      arr[emptyIdx] = arr[chosen];
      arr[chosen] = 0;
      prevIdx = emptyIdx;
      emptyIdx = chosen;
    }
    return arr;
  }

  const checkWin = (arr: number[]) => {
    for (let i = 0; i < 8; i++) {
      if (arr[i] !== i + 1) return false;
    }
    return arr[8] === 0;
  };

  const handleTileClick = (index: number) => {
    if (won) return;
    const emptyIndex = tiles.indexOf(0);
    const row = Math.floor(index / 3);
    const col = index % 3;
    const emptyRow = Math.floor(emptyIndex / 3);
    const emptyCol = emptyIndex % 3;

    const isAdjacent = Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1;

    if (isAdjacent) {
      sounds.playBlip(480);
      const next = [...tiles];
      next[emptyIndex] = tiles[index];
      next[index] = 0;
      setTiles(next);
      setMoves((m) => m + 1);
      setHintIndex(null); // clear hint once moved

      if (checkWin(next)) {
        setWon(true);
        sounds.playSuccess();
        setTimeout(() => onSuccessRef.current(), 750);
      }
    }
  };

  const moveDirection = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    if (won) return;
    setTiles((prevTiles) => {
      const emptyIndex = prevTiles.indexOf(0);
      const emptyRow = Math.floor(emptyIndex / 3);
      const emptyCol = emptyIndex % 3;

      let targetRow = emptyRow;
      let targetCol = emptyCol;

      if (dir === 'up') targetRow = emptyRow + 1;
      else if (dir === 'down') targetRow = emptyRow - 1;
      else if (dir === 'left') targetCol = emptyCol + 1;
      else if (dir === 'right') targetCol = emptyCol - 1;

      if (targetRow < 0 || targetRow > 2 || targetCol < 0 || targetCol > 2) {
        return prevTiles;
      }

      const targetIndex = targetRow * 3 + targetCol;
      sounds.playBlip(480);

      const next = [...prevTiles];
      next[emptyIndex] = prevTiles[targetIndex];
      next[targetIndex] = 0;

      setMoves((m) => m + 1);
      setHintIndex(null);

      if (checkWin(next)) {
        setWon(true);
        sounds.playSuccess();
        setTimeout(() => onSuccessRef.current(), 750);
      }

      return next;
    });
  }, [won]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (won) return;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        moveDirection('up');
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        moveDirection('down');
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        moveDirection('left');
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        moveDirection('right');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveDirection, won]);

  // 15s Cooldown Timer
  useEffect(() => {
    if (hintCooldown <= 0) return;
    const timer = setInterval(() => {
      setHintCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [hintCooldown]);

  // Hint calculation: finds adjacent tile that minimizes total Manhattan distance
  const handleGetHint = () => {
    if (hintCooldown > 0 || won) return;
    sounds.playSelect();

    const emptyIdx = tiles.indexOf(0);
    const row = Math.floor(emptyIdx / 3);
    const col = emptyIdx % 3;
    const neighbors: number[] = [];

    if (row > 0) neighbors.push(emptyIdx - 3);
    if (row < 2) neighbors.push(emptyIdx + 3);
    if (col > 0) neighbors.push(emptyIdx - 1);
    if (col < 2) neighbors.push(emptyIdx + 1);

    const getManhattan = (arr: number[]) => {
      let dist = 0;
      for (let i = 0; i < 9; i++) {
        const val = arr[i];
        if (val === 0) continue;
        const targetR = Math.floor((val - 1) / 3);
        const targetC = (val - 1) % 3;
        const curR = Math.floor(i / 3);
        const curC = i % 3;
        dist += Math.abs(curR - targetR) + Math.abs(curC - targetC);
      }
      return dist;
    };

    let bestNeighbor = neighbors[0];
    let bestDist = Infinity;

    for (const n of neighbors) {
      const test = [...tiles];
      test[emptyIdx] = test[n];
      test[n] = 0;
      const d = getManhattan(test);
      if (d < bestDist) {
        bestDist = d;
        bestNeighbor = n;
      }
    }

    setHintIndex(bestNeighbor);
    setHintCooldown(15);
  };

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[500px]">
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm">
        <span className="text-amber-400 font-bold">MOVES: {moves}</span>
        <button
          onClick={handleGetHint}
          disabled={hintCooldown > 0 || won}
          className={`px-3 py-1 sm:px-4 sm:py-1.5 border text-xs sm:text-sm font-bold cursor-pointer transition-all rounded ${
            hintCooldown > 0
              ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
              : 'bg-cyan-900/60 hover:bg-cyan-700 text-cyan-300 border-cyan-500 shadow-sm'
          }`}
        >
          {hintCooldown > 0 ? `HINT (${hintCooldown}s)` : '💡 HINT'}
        </button>
      </div>

      <div className="bg-slate-950 p-3 sm:p-5 border-4 border-slate-700 shadow-2xl relative w-full flex flex-col items-center">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-72 h-72 sm:w-84 sm:h-84 md:w-96 md:h-96 bg-slate-900 border border-slate-800 p-2.5 sm:p-4 rounded">
          {tiles.map((val, idx) => {
            const isEmpty = val === 0;
            const isHint = hintIndex === idx;

            return (
              <button
                key={idx}
                onClick={() => handleTileClick(idx)}
                disabled={isEmpty || won}
                className={`w-full h-full aspect-square border-2 flex items-center justify-center font-bold text-xl sm:text-2xl md:text-3xl transition-all cursor-pointer relative rounded ${
                  isEmpty
                    ? 'bg-slate-950/60 border-slate-800'
                    : isHint
                    ? 'bg-yellow-500 border-white text-black scale-105 ring-2 ring-cyan-400 z-10 animate-bounce'
                    : 'bg-indigo-900 hover:bg-indigo-800 active:scale-95 border-indigo-400 text-yellow-300 shadow-md'
                }`}
              >
                {!isEmpty && val}
              </button>
            );
          })}
        </div>

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in z-20">
            <span className="text-emerald-400 text-base sm:text-lg mb-2 font-bold">★ TOME SHELF SOLVED! ★</span>
            <span className="text-xs sm:text-sm text-slate-300 mb-4 text-center">All 8 tiles ordered into alignment!</span>
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
        Arrow Keys / WASD or Click tiles • Order tiles 1 to 8 • Use 💡 Hint if stuck!
      </p>
    </div>
  );
};
