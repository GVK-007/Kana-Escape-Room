import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../../utils/audio';

interface GameLaneRunnerProps {
  onSuccess: () => void;
  onFailure?: () => void;
  targetMeters?: number;
}

export const GameLaneRunner: React.FC<GameLaneRunnerProps> = ({ onSuccess, targetMeters = 250 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [distance, setDistance] = useState(0);
  const [speedVal, setSpeedVal] = useState('1.0x');
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const targetMetersRef = useRef(targetMeters);
  targetMetersRef.current = targetMeters;

  const stateRef = useRef({
    lane: 1, // 0: Left, 1: Center, 2: Right
    targetLane: 1,
    laneX: [45, 125, 205],
    currentX: 125,
    distance: 0,
    obstacles: [] as { lane: number; y: number; type: 'barrier' | 'spike' }[],
    won: false,
    gameOver: false,
  });

  const lastLaneChangeTimeRef = useRef<number>(0);

  const changeLane = (dir: -1 | 1) => {
    const now = Date.now();
    if (now - lastLaneChangeTimeRef.current < 160) return;
    lastLaneChangeTimeRef.current = now;

    const s = stateRef.current;
    if (s.won || s.gameOver) return;
    const next = Math.max(0, Math.min(2, s.lane + dir));
    if (next !== s.lane) {
      s.lane = next;
      sounds.playBlip(540);
    }
  };

  const restart = () => {
    stateRef.current = {
      lane: 1,
      targetLane: 1,
      laneX: [45, 125, 205],
      currentX: 125,
      distance: 0,
      obstacles: [
        { lane: 0, y: -40, type: 'barrier' },
        { lane: 2, y: -120, type: 'barrier' },
      ],
      won: false,
      gameOver: false,
    };
    setDistance(0);
    setSpeedVal('1.0x');
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
    let spawnCounter = 0;
    let lastHudTime = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    const STEP_MS = 1000 / 60;

    const updatePhysics = (dt: number = 1.0, nowTime: number = performance.now()) => {
      const s = stateRef.current;

      if (!s.won && !s.gameOver) {
        // Progressively faster speed: starts at 3.2, ramps up to 7.8!
        const progress = Math.min(1, s.distance / targetMetersRef.current);
        const currentSpeed = 3.2 + progress * 4.6;
        s.distance += (0.2 + progress * 0.25) * dt;

        // Throttle React state updates to 10Hz instead of 60Hz to save CPU
        if (nowTime - lastHudTime > 100) {
          lastHudTime = nowTime;
          setDistance(Math.floor(s.distance));
          setSpeedVal(`${(currentSpeed / 3.2).toFixed(1)}x`);
        }

        // Smooth lane interpolation
        const targetX = s.laneX[s.lane];
        s.currentX += (targetX - s.currentX) * Math.min(1.0, 0.35 * dt);

        // Progressive obstacle spawn interval
        spawnCounter += dt;
        const spawnThreshold = Math.max(18, Math.floor(40 - progress * 20));
        if (spawnCounter > spawnThreshold) {
          spawnCounter = 0;
          const randomLane = Math.floor(Math.random() * 3);
          s.obstacles.push({
            lane: randomLane,
            y: -25,
            type: Math.random() > 0.5 ? 'barrier' : 'spike',
          });
        }

        // Update obstacles
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
          const obs = s.obstacles[i];
          obs.y += currentSpeed * dt;

          // Check collision with player at y: 155
          if (obs.y >= 138 && obs.y <= 168 && s.lane === obs.lane) {
            s.gameOver = true;
            setGameOver(true);
            sounds.playFail();
          }

          if (obs.y > 215) {
            s.obstacles.splice(i, 1);
          }
        }

        // Win check
        if (s.distance >= targetMetersRef.current) {
          s.won = true;
          setWon(true);
          sounds.playSuccess();
          setTimeout(() => onSuccessRef.current(), 750);
        }
      }
    };

    const loop = (currentTime?: number) => {
      const now = currentTime || performance.now();
      let deltaMs = now - lastTime;
      lastTime = now;
      if (deltaMs > 100) deltaMs = 100;
      if (deltaMs < 0) deltaMs = 0;

      accumulator += deltaMs;
      let steps = 0;
      while (accumulator >= STEP_MS && steps < 4) {
        updatePhysics(1.0, now);
        accumulator -= STEP_MS;
        steps++;
      }

      const s = stateRef.current;

      // Draw 3-lane track
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 260, 200);

      // Track perspective lanes
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(20, 0, 220, 200);

      // Lane dividers
      ctx.strokeStyle = '#e2e8f0';
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(90, 0);
      ctx.lineTo(90, 200);
      ctx.moveTo(170, 0);
      ctx.lineTo(170, 200);
      ctx.stroke();
      ctx.setLineDash([]);

      // Obstacles
      for (const obs of s.obstacles) {
        const ox = s.laneX[obs.lane] - 16;
        ctx.fillStyle = obs.type === 'barrier' ? '#ef4444' : '#f97316';
        ctx.fillRect(ox, obs.y, 32, 14);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(ox + 4, obs.y + 2, 6, 10);
        ctx.fillRect(ox + 22, obs.y + 2, 6, 10);
      }

      // Player Runner
      const px = s.currentX - 10;
      ctx.fillStyle = '#38bdf8'; // Blue runner
      ctx.fillRect(px, 155, 20, 22);
      ctx.fillStyle = '#facc15'; // Yellow hair
      ctx.fillRect(px + 2, 153, 16, 6);
      ctx.fillStyle = '#ef4444'; // Shoes
      ctx.fillRect(px + 2, 175, 6, 4);
      ctx.fillRect(px + 12, 175, 6, 4);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) changeLane(-1);
      if (['ArrowRight', 'KeyD'].includes(e.code)) changeLane(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const touchStartRef = useRef<{ x: number; y: number; time: number; handled: boolean } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      handled: false,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch || !touchStartRef.current) return;
    if (touchStartRef.current.handled) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > 25 && Math.abs(deltaX) > Math.abs(deltaY)) {
      touchStartRef.current.handled = true;
      if (deltaX < 0) {
        changeLane(-1);
      } else {
        changeLane(1);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current) return;
    if (!touchStartRef.current.handled) {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const relX = touchStartRef.current.x - rect.left;
        if (relX < rect.width * 0.5) {
          changeLane(-1);
        } else {
          changeLane(1);
        }
      }
    }
    touchStartRef.current = null;
  };

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[580px]">
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm px-1">
        <span className="text-cyan-400 font-bold">DISTANCE: {distance}m / {targetMeters}m</span>
        <span className="text-yellow-400 font-mono text-[10px] sm:text-xs">SPEED: {speedVal}</span>
      </div>

      <div className="relative border-4 border-slate-700 shadow-2xl bg-black touch-none w-full flex justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={260}
          height={200}
          className="pixelated block touch-none cursor-pointer w-full max-w-[560px] aspect-[260/200] object-contain"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => {
            if (canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const relX = e.clientX - rect.left;
              if (relX < rect.width * 0.5) {
                changeLane(-1);
              } else {
                changeLane(1);
              }
            }
          }}
        />

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in">
            <span className="text-emerald-400 text-sm sm:text-base mb-1 font-bold">★ RUNWAY CONQUERED! ★</span>
            <span className="text-xs text-slate-300 mb-3">Survived the 250m hyper-acceleration sprint!</span>
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
            <span className="text-red-400 text-sm sm:text-base mb-3 font-bold">COLLISION DETECTED</span>
            <button
              onClick={restart}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs border-2 border-white cursor-pointer active:translate-y-0.5"
            >
              RESTART RUN
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-3 w-full justify-center">
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            changeLane(-1);
          }}
          className="px-7 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-600 text-xs sm:text-sm cursor-pointer active:bg-slate-600"
        >
          ◀ LEFT LANE
        </button>
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            changeLane(1);
          }}
          className="px-7 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-600 text-xs sm:text-sm cursor-pointer active:bg-slate-600"
        >
          RIGHT LANE ▶
        </button>
      </div>
      <p className="text-[10px] sm:text-xs text-slate-400 mt-2 text-center">
        Swipe Left/Right, Tap Screen Sides, or use Buttons to steer!
      </p>
    </div>
  );
};
