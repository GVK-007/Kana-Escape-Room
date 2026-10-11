import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../../utils/audio';

interface GameKanaCatcherProps {
  onSuccess: () => void;
  onFailure?: () => void;
  targetCount?: number;
}

export const GameKanaCatcher: React.FC<GameKanaCatcherProps> = ({ onSuccess, targetCount = 15 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [caught, setCaught] = useState(0);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const targetCountRef = useRef(targetCount);
  targetCountRef.current = targetCount;

  const stateRef = useRef({
    basketX: 103,
    items: [] as { x: number; y: number; speed: number; char: string; color: string }[],
    caught: 0,
    won: false,
    gameOver: false,
    keys: { left: false, right: false },
  });

  const restart = () => {
    stateRef.current = {
      basketX: 103,
      items: [],
      caught: 0,
      won: false,
      gameOver: false,
      keys: { left: false, right: false },
    };
    setCaught(0);
    setWon(false);
    setGameOver(false);
  };

  useEffect(() => {
    restart();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let animId: number;
    let spawnTimer = 0;
    let lastTime = performance.now();
    const colors = ['#f472b6', '#38bdf8', '#fbbf24', '#a78bfa', '#34d399'];
    const kanaSymbols = ['あ', 'い', 'う', 'え', 'お'];

    const loop = (currentTime?: number) => {
      const now = currentTime || performance.now();
      const deltaMs = now - lastTime;
      lastTime = now;
      const dt = Math.min(Math.max(deltaMs / (1000 / 60), 0.1), 3.0);

      const state = stateRef.current;

      // Input movement: smooth, steady 4.5 px/frame
      if (state.keys.left) state.basketX = Math.max(8, state.basketX - 4.5 * dt);
      if (state.keys.right) state.basketX = Math.min(200, state.basketX + 4.5 * dt);

      // Spawn falling spirit wisps
      spawnTimer += dt;
      const intervalThreshold = Math.max(30, 52 - state.caught * 1.1);

      if (spawnTimer > intervalThreshold && !state.won && !state.gameOver) {
        spawnTimer = 0;
        const baseSpd = Math.min(2.2, 1.6 + state.caught * 0.035);
        // Wide spawn spread across the sacred pool
        const spawnX = Math.floor(Math.random() * 195) + 20;

        state.items.push({
          x: spawnX,
          y: -10,
          speed: baseSpd + Math.random() * 0.3,
          char: kanaSymbols[Math.floor(Math.random() * kanaSymbols.length)],
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }

      // Update falling items
      if (!state.won && !state.gameOver) {
        for (let i = state.items.length - 1; i >= 0; i--) {
          const item = state.items[i];
          item.y += item.speed * dt;

          // Check Catch (longer basin: width 54)
          if (
            item.y >= 155 &&
            item.y <= 175 &&
            item.x >= state.basketX - 8 &&
            item.x <= state.basketX + 54
          ) {
            state.items.splice(i, 1);
            state.caught++;
            setCaught(state.caught);
            sounds.playKanaObtained();

            if (state.caught >= targetCountRef.current) {
              state.won = true;
              setWon(true);
              sounds.playSuccess();
              setTimeout(() => onSuccessRef.current(), 750);
            }
            continue;
          }

          // Strict condition: missing a single spirit results in failure!
          if (item.y > 185) {
            state.gameOver = true;
            setGameOver(true);
            sounds.playFail();
            break;
          }
        }
      }

      // Render
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 260, 200);

      // Background sacred pool ripple lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let y = 30; y < 190; y += 25) {
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.lineTo(250, y);
        ctx.stroke();
      }

      // Draw Falling Spirits
      for (const item of state.items) {
        ctx.fillStyle = item.color;
        // Spirit wisp orb
        ctx.beginPath();
        ctx.arc(item.x, item.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(item.x - 2, item.y - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Kanji character inside
        ctx.fillStyle = '#000000';
        ctx.font = '8px monospace';
        ctx.fillText(item.char, item.x - 3.5, item.y + 3);
      }

      // Draw Shrine Basin (Player Catcher - 54px long)
      ctx.fillStyle = '#475569';
      ctx.fillRect(state.basketX, 168, 54, 14);
      // Sacred water inside basin
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(state.basketX + 3, 169, 48, 5);
      // Vermilion rim
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(state.basketX, 166, 54, 2);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[580px]">
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm px-1">
        <span className="text-emerald-400 font-bold">SPIRITS: {caught}/{targetCount}</span>
        <span className="text-rose-400 text-[10px] sm:text-xs font-mono font-bold">0 MISSES ALLOWED</span>
      </div>

      <div className="relative border-4 border-slate-700 shadow-2xl bg-black touch-none w-full flex justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={260}
          height={200}
          className="pixelated block touch-none cursor-pointer w-full max-w-[560px] aspect-[260/200] object-contain"
          onTouchStart={(e) => {
            if (e.touches[0] && canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const scaleX = canvasRef.current.width / rect.width;
              const x = (e.touches[0].clientX - rect.left) * scaleX;
              stateRef.current.basketX = Math.max(8, Math.min(200, x - 27));
            }
          }}
          onTouchMove={(e) => {
            if (e.touches[0] && canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const scaleX = canvasRef.current.width / rect.width;
              const x = (e.touches[0].clientX - rect.left) * scaleX;
              stateRef.current.basketX = Math.max(8, Math.min(200, x - 27));
            }
          }}
        />

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in">
            <span className="text-emerald-400 text-sm sm:text-base mb-1 font-bold">★ 15 SPIRITS CONSECRATED! ★</span>
            <span className="text-xs text-slate-300 mb-3">Flawless sacred basin collection!</span>
            <button
              onClick={() => onSuccessRef.current()}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-bold border-2 border-white cursor-pointer active:translate-y-0.5 shadow-lg"
            >
              CLAIM REWARD NOW
            </button>
          </div>
        )}

        {gameOver && !won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-red-500 p-4">
            <span className="text-red-400 text-sm sm:text-base mb-1 font-bold">SPIRIT TOUCHED GROUND!</span>
            <span className="text-[10px] text-slate-300 mb-3">Catch all 15 spirits without dropping one.</span>
            <button
              onClick={restart}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs border-2 border-white cursor-pointer active:translate-y-0.5"
            >
              TRY AGAIN
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-3 w-full justify-center">
        <button
          onClick={() => { stateRef.current.basketX = Math.max(8, stateRef.current.basketX - 26); }}
          className="px-7 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-600 text-xs sm:text-sm cursor-pointer active:bg-slate-600"
        >
          ◀ LEFT
        </button>
        <button
          onClick={() => { stateRef.current.basketX = Math.min(200, stateRef.current.basketX + 26); }}
          className="px-7 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-600 text-xs sm:text-sm cursor-pointer active:bg-slate-600"
        >
          RIGHT ▶
        </button>
      </div>
      <p className="text-[10px] sm:text-xs text-slate-400 mt-2 text-center">
        Catch 15 falling spirits in the basin • Every single spirit must be caught!
      </p>
    </div>
  );
};
