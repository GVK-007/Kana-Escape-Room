import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../../utils/audio';

interface GameWallBreakerProps {
  onSuccess: () => void;
  onFailure?: () => void;
}

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

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface PowerUp {
  x: number;
  y: number;
  vy: number;
  type: 'multiball' | 'expand' | 'slow';
  text: string;
  color: string;
}

const TOTAL_BRICKS = 42;

export const GameWallBreaker: React.FC<GameWallBreakerProps> = ({ onSuccess }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [bricksLeft, setBricksLeft] = useState(TOTAL_BRICKS);
  const [ballsActive, setBallsActive] = useState(1);
  const [speedVal, setSpeedVal] = useState('1.0x');
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);

  const stateRef = useRef({
    paddleX: 108,
    paddleW: 44,
    expandTimer: 0,
    balls: [] as Ball[],
    speedFactor: 1.0,
    score: 0,
    started: false,
    won: false,
    gameOver: false,
    bricks: [] as { x: number; y: number; w: number; h: number; color: string; alive: boolean }[],
    keys: { left: false, right: false },
  });

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.8 + 0.3) * 4.0;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0,
        maxLife: 20 + Math.random() * 12,
        color,
        size: Math.random() * 3 + 2,
      });
    }
  };

  const initBricks = () => {
    const bricks = [];
    const rows = 6;
    const cols = 7;
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: 6 + c * 36,
          y: 16 + r * 12,
          w: 32,
          h: 8,
          color: colors[r],
          alive: true,
        });
      }
    }
    return bricks;
  };

  const restart = () => {
    stateRef.current = {
      paddleX: 108,
      paddleW: 44,
      expandTimer: 0,
      balls: [{ x: 130, y: 168, vx: 1.8, vy: -2.0 }],
      speedFactor: 1.0,
      score: 0,
      started: false,
      won: false,
      gameOver: false,
      bricks: initBricks(),
      keys: { left: false, right: false },
    };
    particlesRef.current = [];
    powerUpsRef.current = [];
    setScore(0);
    setBricksLeft(TOTAL_BRICKS);
    setBallsActive(1);
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
    let lastTime = performance.now();

    const loop = (currentTime?: number) => {
      const now = currentTime || performance.now();
      const deltaMs = now - lastTime;
      lastTime = now;
      const dt = Math.min(Math.max(deltaMs / (1000 / 60), 0.1), 3.0);

      const s = stateRef.current;

      // Handle paddle expand timer
      if (s.expandTimer > 0) {
        s.expandTimer -= dt;
        if (s.expandTimer <= 0) {
          s.paddleW = 44;
        }
      }

      // Allow paddle to move faster as the ball moves faster
      const pSpeed = 4.2 * Math.sqrt(s.speedFactor) * dt;
      if (s.keys.left) s.paddleX = Math.max(4, s.paddleX - pSpeed);
      if (s.keys.right) s.paddleX = Math.min(260 - s.paddleW - 4, s.paddleX + pSpeed);

      if (!s.started && !s.gameOver && !s.won) {
        // Keep ball docked to paddle before launch
        s.balls = [{
          x: s.paddleX + s.paddleW / 2,
          y: 168,
          vx: 1.8,
          vy: -2.0,
        }];
      } else if (s.started && !s.gameOver && !s.won) {
        // Update powerups
        for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
          const pu = powerUpsRef.current[i];
          pu.y += pu.vy * dt;

          // Paddle collision with powerup
          if (
            pu.y + 12 >= 174 &&
            pu.y <= 184 &&
            pu.x + 14 >= s.paddleX &&
            pu.x <= s.paddleX + s.paddleW
          ) {
            sounds.playSuccess();
            if (pu.type === 'multiball') {
              const currentBalls = [...s.balls];
              for (const ball of currentBalls) {
                s.balls.push({
                  x: ball.x,
                  y: ball.y,
                  vx: -ball.vx * 0.95 + (Math.random() - 0.5) * 0.5,
                  vy: -Math.abs(ball.vy) * 0.95,
                });
                s.balls.push({
                  x: ball.x,
                  y: ball.y,
                  vx: ball.vx * 0.7 + (Math.random() - 0.5) * 1.2,
                  vy: -Math.abs(ball.vy) * 0.9,
                });
              }
              if (s.balls.length > 6) s.balls = s.balls.slice(0, 6);
            } else if (pu.type === 'expand') {
              s.paddleW = 66;
              s.expandTimer = 650;
            } else if (pu.type === 'slow') {
              s.speedFactor = 1.0;
              for (const ball of s.balls) {
                const mag = Math.hypot(ball.vx, ball.vy);
                if (mag > 0) {
                  ball.vx = (ball.vx / mag) * 2.2;
                  ball.vy = (ball.vy / mag) * 2.2;
                }
              }
              setSpeedVal('1.0x');
            }
            powerUpsRef.current.splice(i, 1);
            continue;
          }

          if (pu.y > 200) {
            powerUpsRef.current.splice(i, 1);
          }
        }

        // Update all balls
        for (let bIdx = s.balls.length - 1; bIdx >= 0; bIdx--) {
          const ball = s.balls[bIdx];
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;

          // Bounce walls
          if (ball.x <= 4) {
            ball.x = 4;
            ball.vx = Math.abs(ball.vx);
            sounds.playBlip(400);
          } else if (ball.x >= 256) {
            ball.x = 256;
            ball.vx = -Math.abs(ball.vx);
            sounds.playBlip(400);
          }
          if (ball.y <= 4) {
            ball.y = 4;
            ball.vy = Math.abs(ball.vy);
            sounds.playBlip(400);
          }

          // Bounce paddle
          if (
            ball.y >= 170 &&
            ball.y <= 178 &&
            ball.x >= s.paddleX &&
            ball.x <= s.paddleX + s.paddleW &&
            ball.vy > 0
          ) {
            ball.vy = -Math.abs(ball.vy);
            const offset = (ball.x - (s.paddleX + s.paddleW / 2)) / (s.paddleW / 2);
            ball.vx = offset * (2.2 * s.speedFactor);
            sounds.playBlip(520);
          }

          // Ball dropped
          if (ball.y > 195) {
            s.balls.splice(bIdx, 1);
            continue;
          }

          // Check brick collisions
          for (const b of s.bricks) {
            if (b.alive) {
              if (
                ball.x >= b.x &&
                ball.x <= b.x + b.w &&
                ball.y >= b.y &&
                ball.y <= b.y + b.h
              ) {
                b.alive = false;
                ball.vy = -ball.vy;
                s.score += 10;
                setScore(s.score);

                // Progressive speed
                s.speedFactor = Math.min(1.45, s.speedFactor * 1.01);
                setSpeedVal(`${s.speedFactor.toFixed(1)}x`);

                // Particle explosion effect
                spawnParticles(b.x + b.w / 2, b.y + b.h / 2, b.color);
                sounds.playBlip(680);

                // Chance to drop powerup (28%)
                if (Math.random() < 0.28) {
                  const types: ('multiball' | 'expand' | 'slow')[] = ['multiball', 'expand', 'slow'];
                  const chosen = types[Math.floor(Math.random() * types.length)];
                  powerUpsRef.current.push({
                    x: b.x + b.w / 2 - 7,
                    y: b.y + b.h,
                    vy: 1.15,
                    type: chosen,
                    text: chosen === 'multiball' ? 'M' : chosen === 'expand' ? 'W' : 'S',
                    color: chosen === 'multiball' ? '#10b981' : chosen === 'expand' ? '#38bdf8' : '#facc15',
                  });
                }
                break;
              }
            }
          }
        }

        setBallsActive(s.balls.length);

        // Check if all balls are lost
        if (s.balls.length === 0) {
          s.gameOver = true;
          setGameOver(true);
          sounds.playFail();
        }

        // Win condition: All bricks eliminated
        const remaining = s.bricks.filter((b) => b.alive).length;
        setBricksLeft(remaining);
        if (remaining === 0) {
          s.won = true;
          setWon(true);
          sounds.playSuccess();
          setTimeout(() => onSuccessRef.current(), 750);
        }
      }

      // Draw Arena
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, 260, 200);

      // Draw Bricks
      for (const b of s.bricks) {
        if (b.alive) {
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, 2);
        }
      }

      // Draw PowerUps
      for (const pu of powerUpsRef.current) {
        ctx.fillStyle = pu.color;
        ctx.fillRect(pu.x, pu.y, 14, 12);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(pu.x + 1, pu.y + 1, 12, 2);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pu.text, pu.x + 7, pu.y + 7);
      }

      // Draw Particles
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

      // Draw Paddle
      const isExpanded = s.expandTimer > 0;
      ctx.fillStyle = isExpanded ? '#a855f7' : '#38bdf8';
      ctx.fillRect(s.paddleX, 174, s.paddleW, 8);
      ctx.fillStyle = isExpanded ? '#f3e8ff' : '#bae6fd';
      ctx.fillRect(s.paddleX + 2, 175, s.paddleW - 4, 2);

      // Draw Balls
      for (const ball of s.balls) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.x - 1, ball.y - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const restartRef = useRef(restart);
  restartRef.current = restart;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = true;
      if (['Space', 'Enter'].includes(e.code)) {
        e.preventDefault();
        if (stateRef.current.gameOver && !stateRef.current.won) {
          restartRef.current();
        } else {
          stateRef.current.started = true;
        }
      }
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

  const updatePaddleFromPointer = (clientX: number) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width;
      const x = (clientX - rect.left) * scaleX;
      stateRef.current.paddleX = Math.max(
        4,
        Math.min(260 - stateRef.current.paddleW - 4, x - stateRef.current.paddleW / 2)
      );
    }
  };

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[580px]">
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm px-1">
        <span className="text-amber-400 font-bold">SCORE: {score}</span>
        <span className="text-cyan-400 font-mono text-[10px] sm:text-xs font-bold">
          BRICKS: {bricksLeft}/{TOTAL_BRICKS}
        </span>
        <span className="text-emerald-400 font-mono text-[10px] sm:text-xs">
          BALLS: {ballsActive}
        </span>
        <span className="text-yellow-400 font-mono text-[10px] sm:text-xs">SPEED: {speedVal}</span>
      </div>

      <div
        onClick={() => { stateRef.current.started = true; }}
        className="relative border-4 border-slate-700 shadow-2xl bg-black cursor-pointer touch-none w-full flex justify-center overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          width={260}
          height={200}
          className="pixelated block touch-none w-full max-w-[560px] aspect-[260/200] object-contain"
          onTouchStart={(e) => {
            stateRef.current.started = true;
            if (e.touches[0]) updatePaddleFromPointer(e.touches[0].clientX);
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) updatePaddleFromPointer(e.touches[0].clientX);
          }}
          onMouseMove={(e) => {
            if (e.buttons === 1) updatePaddleFromPointer(e.clientX);
          }}
        />

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in">
            <span className="text-emerald-400 text-sm sm:text-base mb-1 font-bold">★ WALL BREACHED! ★</span>
            <span className="text-xs text-slate-300 mb-3">All {TOTAL_BRICKS} security bricks shattered!</span>
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
            <span className="text-red-400 text-sm sm:text-base mb-1 font-bold">ALL BALLS LOST!</span>
            <span className="text-[10px] text-slate-300 mb-3">Keep at least one ball alive to continue!</span>
            <button
              onClick={restart}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs border-2 border-white cursor-pointer active:translate-y-0.5"
            >
              TRY AGAIN [SPACE]
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-3 w-full justify-center">
        <button
          onClick={() => { stateRef.current.paddleX = Math.max(4, stateRef.current.paddleX - 25); }}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-600 text-xs sm:text-sm cursor-pointer active:bg-slate-600"
        >
          ◀ LEFT
        </button>
        <button
          onClick={() => { stateRef.current.started = true; }}
          className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs sm:text-sm border-2 border-white cursor-pointer active:translate-y-0.5"
        >
          LAUNCH [SPACE]
        </button>
        <button
          onClick={() => {
            stateRef.current.paddleX = Math.min(
              260 - stateRef.current.paddleW - 4,
              stateRef.current.paddleX + 25
            );
          }}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-600 text-xs sm:text-sm cursor-pointer active:bg-slate-600"
        >
          RIGHT ▶
        </button>
      </div>
      <p className="text-[10px] sm:text-xs text-slate-400 mt-2 text-center">
        Powerups: <span className="text-emerald-400 font-bold">[M] Multi-Ball</span> • <span className="text-sky-400 font-bold">[W] Wide Paddle</span> • <span className="text-yellow-400 font-bold">[S] Slow Speed</span>
      </p>
    </div>
  );
};
