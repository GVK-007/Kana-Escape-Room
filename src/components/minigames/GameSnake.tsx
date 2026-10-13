import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sounds } from '../../utils/audio';

interface GameSnakeProps {
  onSuccess: () => void;
  onFailure?: () => void;
  targetFood?: number;
}

const GRID_SIZE = 12;

export const GameSnake: React.FC<GameSnakeProps> = ({ onSuccess, targetFood = 10 }) => {
  const [snake, setSnake] = useState<{ x: number; y: number }[]>([
    { x: 5, y: 6 },
    { x: 4, y: 6 },
    { x: 3, y: 6 }
  ]);
  const [direction, setDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('RIGHT');
  const [food, setFood] = useState<{ x: number; y: number }>({ x: 8, y: 6 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  const dirRef = useRef(direction);
  dirRef.current = direction;
  const inputQueueRef = useRef<('UP' | 'DOWN' | 'LEFT' | 'RIGHT')[]>([]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const spawnFood = (currentSnake: { x: number; y: number }[]) => {
    let newPos: { x: number; y: number };
    while (true) {
      newPos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      const onSnake = currentSnake.some((s) => s.x === newPos.x && s.y === newPos.y);
      if (!onSnake) break;
    }
    return newPos;
  };

  const restart = () => {
    setWon(false);
    setGameOver(false);
    setIsStarted(false);
    setScore(0);
    const initialSnake = [
      { x: 5, y: 6 },
      { x: 4, y: 6 },
      { x: 3, y: 6 }
    ];
    inputQueueRef.current = [];
    setSnake(initialSnake);
    setDirection('RIGHT');
    dirRef.current = 'RIGHT';
    setFood(spawnFood(initialSnake));
  };

  // Dedicated win trigger
  useEffect(() => {
    if (won) return;
    if (score >= targetFood) {
      setWon(true);
      sounds.playSuccess();
      const timer = setTimeout(() => {
        onSuccess();
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [score, targetFood, won, onSuccess]);

  const isOpposite = (d1: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', d2: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    return (
      (d1 === 'UP' && d2 === 'DOWN') ||
      (d1 === 'DOWN' && d2 === 'UP') ||
      (d1 === 'LEFT' && d2 === 'RIGHT') ||
      (d1 === 'RIGHT' && d2 === 'LEFT')
    );
  };

  const queueDirection = useCallback((newDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    setIsStarted(true);
    const queue = inputQueueRef.current;
    const lastDir = queue.length > 0 ? queue[queue.length - 1] : dirRef.current;

    if (newDir !== lastDir && !isOpposite(newDir, lastDir) && queue.length < 2) {
      queue.push(newDir);
    }
  }, []);

  const changeDirection = queueDirection;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        changeDirection('UP');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        changeDirection('DOWN');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        changeDirection('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        changeDirection('RIGHT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection]);

  // Main game tick
  useEffect(() => {
    if (gameOver || won || !isStarted) return;

    const interval = setInterval(() => {
      setSnake((prevSnake) => {
        // Dequeue next direction if available
        if (inputQueueRef.current.length > 0) {
          const next = inputQueueRef.current.shift()!;
          dirRef.current = next;
          setDirection(next);
        }

        const head = { ...prevSnake[0] };
        const curDir = dirRef.current;

        if (curDir === 'UP') head.y -= 1;
        if (curDir === 'DOWN') head.y += 1;
        if (curDir === 'LEFT') head.x -= 1;
        if (curDir === 'RIGHT') head.x += 1;

        // Check Wall Collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameOver(true);
          sounds.playFail();
          return prevSnake;
        }

        // Check Self Collision
        if (prevSnake.some((segment) => segment.x === head.x && segment.y === head.y)) {
          setGameOver(true);
          sounds.playFail();
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Check Food
        if (head.x === food.x && head.y === food.y) {
          sounds.playBlip(620);
          setScore((s) => s + 1);
          setFood(spawnFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, Math.max(120, 175 - score * 3));

    return () => clearInterval(interval);
  }, [gameOver, won, isStarted, food, score]);

  // O(1) fast position lookup for rendering
  const bodySet = new Set(snake.slice(1).map((s) => `${s.x},${s.y}`));
  const headPos = snake[0];

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[500px]">
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm">
        <span className="text-emerald-400 font-bold">APPLES: {score}/{targetFood}</span>
        <span className="text-amber-300 text-xs font-mono">FEED SERPENT</span>
      </div>

      <div
        className="relative bg-slate-950 p-3 sm:p-5 border-4 border-slate-700 shadow-2xl touch-none flex flex-col items-center w-full"
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          if (!touchStartRef.current) return;
          const t = e.changedTouches[0];
          if (!t) return;
          const dx = t.clientX - touchStartRef.current.x;
          const dy = t.clientY - touchStartRef.current.y;
          touchStartRef.current = null;
          if (Math.hypot(dx, dy) < 18) return;
          if (Math.abs(dx) > Math.abs(dy)) {
            changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
          } else {
            changeDirection(dy > 0 ? 'DOWN' : 'UP');
          }
        }}
      >
        <div className="grid grid-cols-12 gap-0.5 bg-slate-900 border-2 border-slate-800 p-1 w-72 h-72 sm:w-84 sm:h-84 md:w-96 md:h-96 rounded">
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
            const x = idx % GRID_SIZE;
            const y = Math.floor(idx / GRID_SIZE);
            const isHead = headPos && headPos.x === x && headPos.y === y;
            const isBody = !isHead && bodySet.has(`${x},${y}`);
            const isFood = food.x === x && food.y === y;

            return (
              <div
                key={idx}
                className={`w-full h-full aspect-square flex items-center justify-center rounded-[1px] ${
                  isHead
                    ? 'bg-emerald-400 border border-white'
                    : isBody
                    ? 'bg-emerald-600 border border-emerald-500'
                    : isFood
                    ? 'bg-red-500 rounded-full animate-pulse border border-yellow-300'
                    : (x + y) % 2 === 0
                    ? 'bg-slate-900'
                    : 'bg-slate-850'
                }`}
              >
                {isHead && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-black rounded-full" />}
              </div>
            );
          })}
        </div>

        {!isStarted && !gameOver && !won && (
          <div
            onClick={() => setIsStarted(true)}
            className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center p-2 z-10 cursor-pointer animate-pulse"
          >
            <span className="font-pixel text-[10px] sm:text-xs text-yellow-300 bg-slate-900/90 border border-yellow-400 px-3 py-1.5 shadow-lg tracking-wider text-center">
              SWIPE OR ARROW KEYS TO START
            </span>
          </div>
        )}

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in duration-200 z-20">
            <span className="text-emerald-400 text-base sm:text-lg mb-2 font-bold">★ SERPENT SATED! ★</span>
            <span className="text-xs sm:text-sm text-slate-300 mb-4 text-center">Collected {score} apples!</span>
            <button
              onClick={() => onSuccess()}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-bold border-2 border-white cursor-pointer active:translate-y-0.5 shadow-lg"
            >
              CLAIM REWARD NOW
            </button>
          </div>
        )}

        {gameOver && !won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-red-500 p-4 z-20">
            <span className="text-red-400 text-sm sm:text-base mb-3 font-bold">SERPENT CRASHED!</span>
            <button
              onClick={restart}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold border-2 border-white cursor-pointer active:translate-y-0.5"
            >
              RESTART
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] sm:text-xs text-slate-400 mt-2 text-center">
        Swipe to Slither • Arrow Keys / WASD
      </p>
    </div>
  );
};
