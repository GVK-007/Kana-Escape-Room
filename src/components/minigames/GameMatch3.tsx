import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sounds } from '../../utils/audio';

interface GameMatch3Props {
  onSuccess: () => void;
  onFailure?: () => void;
  targetScore?: number;
}

const ROWS = 6;
const COLS = 6;

// Base Tiles
const TILES = [
  { char: 'あ', color: 'bg-rose-500 text-white border-rose-300', hex: '#f43f5e' },
  { char: 'か', color: 'bg-amber-500 text-black border-amber-300', hex: '#f59e0b' },
  { char: 'さ', color: 'bg-emerald-500 text-white border-emerald-300', hex: '#10b981' },
  { char: 'た', color: 'bg-blue-500 text-white border-blue-300', hex: '#3b82f6' },
  { char: 'な', color: 'bg-purple-500 text-white border-purple-300', hex: '#a855f7' },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export const GameMatch3: React.FC<GameMatch3Props> = ({ onSuccess, targetScore = 500 }) => {
  const [grid, setGrid] = useState<number[][]>(() => createInitialGrid());
  const [specialGrid, setSpecialGrid] = useState<string[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(''))
  );
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const [poppingCells, setPoppingCells] = useState<Set<string>>(new Set());
  const [droppingCells, setDroppingCells] = useState<Set<string>>(new Set());
  const [isBusy, setIsBusy] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  function getRandomTile(): number {
    return Math.floor(Math.random() * TILES.length);
  }

  function createInitialGrid(): number[][] {
    const g: number[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: number[] = [];
      for (let c = 0; c < COLS; c++) {
        let t = getRandomTile();
        while (
          (c >= 2 && row[c - 1] === t && row[c - 2] === t) ||
          (r >= 2 && g[r - 1][c] === t && g[r - 2][c] === t)
        ) {
          t = getRandomTile();
        }
        row.push(t);
      }
      g.push(row);
    }
    return g;
  }

  const isLoopRunningRef = useRef(false);
  const animIdRef = useRef<number | null>(null);

  const startParticleLoop = useCallback(() => {
    if (isLoopRunningRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isLoopRunningRef.current = true;

    const loop = () => {
      ctx.clearRect(0, 0, 260, 260);

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0;

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }

      if (particlesRef.current.length > 0) {
        animIdRef.current = requestAnimationFrame(loop);
      } else {
        ctx.clearRect(0, 0, 260, 260);
        isLoopRunningRef.current = false;
        animIdRef.current = null;
      }
    };

    animIdRef.current = requestAnimationFrame(loop);
  }, []);

  const spawnParticles = (x: number, y: number, color: string, count = 10, speed = 3.5) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.7 + 0.3) * speed;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0,
        maxLife: 20 + Math.random() * 15,
        color,
        size: Math.random() * 3 + 2,
      });
    }
    startParticleLoop();
  };

  useEffect(() => {
    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, []);

  const findMatchesAndSpecials = (g: number[][]) => {
    const matched = new Set<string>();
    const powerUpsToSpawn: { r: number; c: number; type: 'LINE_BOMB' | 'RAINBOW' }[] = [];

    // Horizontal runs
    for (let r = 0; r < ROWS; r++) {
      let runStart = 0;
      while (runStart < COLS) {
        let runEnd = runStart;
        while (runEnd < COLS && g[r][runEnd] === g[r][runStart] && g[r][runStart] !== -1) {
          runEnd++;
        }
        const runLen = runEnd - runStart;
        if (runLen >= 3) {
          for (let c = runStart; c < runEnd; c++) matched.add(`${r},${c}`);
          if (runLen >= 5) {
            powerUpsToSpawn.push({ r, c: runStart + 2, type: 'RAINBOW' });
          } else if (runLen === 4) {
            powerUpsToSpawn.push({ r, c: runStart + 1, type: 'LINE_BOMB' });
          }
        }
        runStart = runEnd > runStart ? runEnd : runStart + 1;
      }
    }

    // Vertical runs
    for (let c = 0; c < COLS; c++) {
      let runStart = 0;
      while (runStart < ROWS) {
        let runEnd = runStart;
        while (runEnd < ROWS && g[runEnd][c] === g[runStart][c] && g[runStart][c] !== -1) {
          runEnd++;
        }
        const runLen = runEnd - runStart;
        if (runLen >= 3) {
          for (let r = runStart; r < runEnd; r++) matched.add(`${r},${c}`);
          if (runLen >= 5) {
            powerUpsToSpawn.push({ r: runStart + 2, c, type: 'RAINBOW' });
          } else if (runLen === 4) {
            powerUpsToSpawn.push({ r: runStart + 1, c, type: 'LINE_BOMB' });
          }
        }
        runStart = runEnd > runStart ? runEnd : runStart + 1;
      }
    }

    return { matched, powerUpsToSpawn };
  };

  const checkWin = useCallback(
    (s: number) => {
      if (s >= targetScore && !won) {
        setWon(true);
        sounds.playSuccess();
        setTimeout(() => onSuccessRef.current(), 750);
      }
    },
    [targetScore, won]
  );

  const executeMatchStep = useCallback(
    (
      currentGrid: number[][],
      currentSpecial: string[][],
      currentScore: number,
      onComplete: () => void
    ) => {
      const { matched, powerUpsToSpawn } = findMatchesAndSpecials(currentGrid);
      if (matched.size === 0) {
        onComplete();
        return;
      }

      sounds.playKanaObtained();
      const allMatched = new Set(matched);

      // Check if any matched tile was a special power-up!
      allMatched.forEach((coord) => {
        const [r, c] = coord.split(',').map(Number);
        const special = currentSpecial[r][c];

        if (special === 'LINE_BOMB') {
          sounds.playSuccess();
          for (let i = 0; i < COLS; i++) {
            allMatched.add(`${r},${i}`);
            spawnParticles(i * 42 + 20, r * 42 + 20, '#facc15', 12, 5.0);
          }
        } else if (special === 'RAINBOW') {
          sounds.playSuccess();
          const targetColor = currentGrid[r][c];
          for (let rowIdx = 0; rowIdx < ROWS; rowIdx++) {
            for (let colIdx = 0; colIdx < COLS; colIdx++) {
              if (currentGrid[rowIdx][colIdx] === targetColor) {
                allMatched.add(`${rowIdx},${colIdx}`);
                spawnParticles(colIdx * 42 + 20, rowIdx * 42 + 20, '#ec4899', 12, 5.5);
              }
            }
          }
        }
      });

      // Clear matched cells and trigger particle effects
      allMatched.forEach((coord) => {
        const [r, c] = coord.split(',').map(Number);
        const tileVal = currentGrid[r][c];
        const hex = TILES[tileVal]?.hex || '#facc15';
        spawnParticles(c * 42 + 20, r * 42 + 20, hex, 12, 3.8);
      });

      // Step 1: Pop animation
      setPoppingCells(allMatched);

      setTimeout(() => {
        // Step 2: Clear popped cells and calculate tile drop
        const nextG = currentGrid.map((row) => [...row]);
        const nextSGrid = currentSpecial.map((row) => [...row]);

        allMatched.forEach((coord) => {
          const [r, c] = coord.split(',').map(Number);
          nextG[r][c] = -1;
          nextSGrid[r][c] = '';
        });

        // Place newly created powerups
        powerUpsToSpawn.forEach((p) => {
          nextG[p.r][p.c] = getRandomTile();
          nextSGrid[p.r][p.c] = p.type;
          spawnParticles(p.c * 42 + 20, p.r * 42 + 20, '#ffffff', 20, 5.0);
        });

        const addedPoints = allMatched.size * 10 + powerUpsToSpawn.length * 50;
        const nextScore = currentScore + addedPoints;

        // Drop tiles in each column
        const droppingSet = new Set<string>();
        for (let c = 0; c < COLS; c++) {
          const colValues: number[] = [];
          const colSpecials: string[] = [];
          for (let r = 0; r < ROWS; r++) {
            if (nextG[r][c] !== -1) {
              colValues.push(nextG[r][c]);
              colSpecials.push(nextSGrid[r][c]);
            }
          }
          const missingCount = ROWS - colValues.length;
          while (colValues.length < ROWS) {
            colValues.unshift(getRandomTile());
            colSpecials.unshift('');
          }
          for (let r = 0; r < ROWS; r++) {
            if (r < missingCount || nextG[r][c] !== colValues[r]) {
              droppingSet.add(`${r},${c}`);
            }
            nextG[r][c] = colValues[r];
            nextSGrid[r][c] = colSpecials[r];
          }
        }

        setScore(nextScore);
        setPoppingCells(new Set());
        setDroppingCells(droppingSet);
        setGrid(nextG);
        setSpecialGrid(nextSGrid);
        checkWin(nextScore);

        setTimeout(() => {
          setDroppingCells(new Set());
          // Cascade check!
          executeMatchStep(nextG, nextSGrid, nextScore, onComplete);
        }, 300);
      }, 250);
    },
    [checkWin]
  );

  const touchStartRef = useRef<{ r: number; c: number; x: number; y: number } | null>(null);

  const swapCells = (sr: number, sc: number, r: number, c: number) => {
    if (won || isBusy) return;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

    sounds.playBlip(540);
    const swapped = grid.map((row) => [...row]);
    const swappedS = specialGrid.map((row) => [...row]);

    const temp = swapped[sr][sc];
    swapped[sr][sc] = swapped[r][c];
    swapped[r][c] = temp;

    const tempS = swappedS[sr][sc];
    swappedS[sr][sc] = swappedS[r][c];
    swappedS[r][c] = tempS;

    const { matched } = findMatchesAndSpecials(swapped);

    if (matched.size > 0) {
      setIsBusy(true);
      setSelectedCell(null);
      setGrid(swapped);
      setSpecialGrid(swappedS);
      executeMatchStep(swapped, swappedS, score, () => {
        setIsBusy(false);
      });
    } else {
      sounds.playFail();
      setSelectedCell(null);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (won || isBusy) return;

    if (!selectedCell) {
      sounds.playSelect();
      setSelectedCell({ r, c });
      return;
    }

    const { r: sr, c: sc } = selectedCell;
    const isAdjacent = Math.abs(sr - r) + Math.abs(sc - c) === 1;

    if (!isAdjacent) {
      setSelectedCell({ r, c });
      return;
    }

    swapCells(sr, sc, r, c);
  };

  const handleTouchStartCell = (e: React.TouchEvent, r: number, c: number) => {
    if (won || isBusy || e.touches.length === 0) return;
    touchStartRef.current = { r, c, x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEndCell = (e: React.TouchEvent, r: number, c: number) => {
    if (!touchStartRef.current || won || isBusy) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (e.changedTouches.length === 0) return;
    const endTouch = e.changedTouches[0];
    const dx = endTouch.clientX - start.x;
    const dy = endTouch.clientY - start.y;

    if (Math.abs(dx) > 18 || Math.abs(dy) > 18) {
      let targetR = start.r;
      let targetC = start.c;
      if (Math.abs(dx) > Math.abs(dy)) {
        targetC += dx > 0 ? 1 : -1;
      } else {
        targetR += dy > 0 ? 1 : -1;
      }
      if (targetR >= 0 && targetR < ROWS && targetC >= 0 && targetC < COLS) {
        swapCells(start.r, start.c, targetR, targetC);
      }
    }
  };

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[520px]">
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm">
        <span className="text-amber-400 font-bold">SCORE: {score}</span>
        <span className="text-emerald-400 font-bold">GOAL: {targetScore}</span>
      </div>

      <div className="bg-slate-950 p-3 sm:p-5 border-4 border-slate-700 shadow-2xl relative w-full flex flex-col items-center">
        <div className="relative w-72 h-72 sm:w-84 sm:h-84 md:w-96 md:h-96">
          <canvas
            ref={canvasRef}
            width={260}
            height={260}
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
          />

          <div className="grid grid-cols-6 gap-1.5 sm:gap-2 w-full h-full bg-slate-900 border border-slate-800 p-1.5 sm:p-2 rounded">
            {grid.flatMap((row, r) =>
              row.map((val, c) => {
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                const isPopping = poppingCells.has(`${r},${c}`);
                const isDropping = droppingCells.has(`${r},${c}`);
                const tile = TILES[val] || TILES[0];
                const special = specialGrid[r][c];

                return (
                  <button
                    key={`${r}-${c}-${val}-${special}`}
                    onClick={() => handleCellClick(r, c)}
                    onTouchStart={(e) => handleTouchStartCell(e, r, c)}
                    onTouchEnd={(e) => handleTouchEndCell(e, r, c)}
                    className={`w-full h-full aspect-square border-2 rounded flex items-center justify-center font-kana text-xl sm:text-2xl md:text-3xl font-bold cursor-pointer transition-all duration-200 relative touch-manipulation ${
                      tile.color
                    } ${
                      isPopping
                        ? 'scale-125 opacity-0 z-20 pointer-events-none duration-200'
                        : isDropping
                        ? 'animate-in slide-in-from-top-6 duration-300 ease-out'
                        : isSelected
                        ? 'scale-110 border-white ring-2 ring-yellow-400 z-10 shadow-lg'
                        : 'hover:opacity-90 active:scale-95'
                    }`}
                  >
                    {tile.char}
                    {special === 'LINE_BOMB' && (
                      <span className="absolute -top-1 -right-1 text-xs sm:text-sm animate-bounce">⚡</span>
                    )}
                    {special === 'RAINBOW' && (
                      <span className="absolute -top-1 -right-1 text-xs sm:text-sm animate-spin">🌈</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in z-30">
            <span className="text-emerald-400 text-base sm:text-lg mb-2 font-bold">★ CONDUIT ENERGIZED! ★</span>
            <span className="text-xs sm:text-sm text-slate-300 mb-4 text-center">Power-up combos unlocked!</span>
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
        Match 4 for ⚡ Line Bomb • Match 5 for 🌈 Rainbow Supernova!
      </p>
    </div>
  );
};
