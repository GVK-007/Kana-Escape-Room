import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../../utils/audio';

interface GameFlappyProps {
  onSuccess: () => void;
  onFailure?: () => void;
  targetScore?: number;
}

export const GameFlappy: React.FC<GameFlappyProps> = ({ onSuccess, targetScore = 15 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);

  // Keep a stable ref to onSuccess to prevent timer-induced re-mounts
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const targetScoreRef = useRef(targetScore);
  targetScoreRef.current = targetScore;

  const stateRef = useRef({
    birdY: 95,
    velocity: 0,
    pipes: [
      { x: 260, topH: 60, passed: false },
      { x: 390, topH: 80, passed: false },
      { x: 520, topH: 50, passed: false },
    ],
    score: 0,
    started: false,
    gameOver: false,
    won: false,
  });

  const lastJumpTimeRef = useRef<number>(0);

  const jump = () => {
    const now = Date.now();
    if (now - lastJumpTimeRef.current < 160) return;
    lastJumpTimeRef.current = now;

    const s = stateRef.current;
    if (s.won) return;

    if (s.gameOver) {
      restart();
      return;
    }

    if (!s.started) {
      s.started = true;
      setStarted(true);
    }

    s.velocity = -3.8;
    sounds.playBlip(540);
  };

  const restart = () => {
    stateRef.current = {
      birdY: 95,
      velocity: 0,
      pipes: [
        { x: 260, topH: 60, passed: false },
        { x: 390, topH: 80, passed: false },
        { x: 520, topH: 50, passed: false },
      ],
      score: 0,
      started: false,
      gameOver: false,
      won: false,
    };
    setScore(0);
    setGameOver(false);
    setWon(false);
    setStarted(false);
  };

  // Main canvas animation loop - mounts strictly once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let animId: number;
    let lastTime = performance.now();
    const gravity = 0.22;
    const gap = 68;
    const pipeWidth = 24;

    const loop = (currentTime?: number) => {
      const now = currentTime || performance.now();
      const deltaMs = now - lastTime;
      lastTime = now;
      const dt = Math.min(Math.max(deltaMs / (1000 / 60), 0.1), 3.0);

      const state = stateRef.current;

      // Update physics if active
      if (state.started && !state.gameOver && !state.won) {
        state.velocity += gravity * dt;
        state.birdY += state.velocity * dt;

        // Ground collision (y > 184)
        if (state.birdY > 184) {
          state.gameOver = true;
          setGameOver(true);
          sounds.playFail();
        }

        // Ceiling soft cap
        if (state.birdY < 4) {
          state.birdY = 4;
          state.velocity = 0;
        }

        // Update Pipes
        for (let i = 0; i < state.pipes.length; i++) {
          const p = state.pipes[i];
          p.x -= 1.5 * dt;

          // Check pass
          if (!p.passed && p.x + pipeWidth < 45) {
            p.passed = true;
            state.score += 1;
            setScore(state.score);
            sounds.playBlip(700);

            if (state.score >= targetScoreRef.current && !state.won) {
              state.won = true;
              setWon(true);
              sounds.playSuccess();
              setTimeout(() => {
                onSuccessRef.current();
              }, 750);
            }
          }

          // Collision check with glider (x: 45, y: birdY, w: 12, h: 8)
          const birdBox = { x: 45, y: state.birdY, w: 12, h: 8 };
          const topPipe = { x: p.x, y: 0, w: pipeWidth, h: p.topH };
          const botPipe = { x: p.x, y: p.topH + gap, w: pipeWidth, h: 200 - (p.topH + gap) };

          const collides = (r1: typeof birdBox, r2: typeof topPipe) =>
            r1.x < r2.x + r2.w &&
            r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h &&
            r1.y + r1.h > r2.y;

          if (collides(birdBox, topPipe) || collides(birdBox, botPipe)) {
            state.gameOver = true;
            setGameOver(true);
            sounds.playFail();
          }

          // Recycle pipe when offscreen
          if (p.x < -pipeWidth) {
            p.x = 360;
            p.topH = 30 + Math.random() * 70;
            p.passed = false;
          }
        }
      }

      // Render
      ctx.fillStyle = '#0a0918'; // Deep night sky
      ctx.fillRect(0, 0, 260, 200);

      // Distant stars / lights
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(20, 20, 2, 2);
      ctx.fillRect(80, 40, 1, 1);
      ctx.fillRect(140, 15, 2, 2);
      ctx.fillRect(190, 45, 1, 1);
      ctx.fillRect(240, 25, 2, 2);

      // Pipes / Holographic Gate Pillars
      for (const p of state.pipes) {
        // Top pillar
        ctx.fillStyle = '#1e3a8a'; // Blue cyber pillar
        ctx.fillRect(p.x, 0, pipeWidth, p.topH);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(p.x + 2, 0, 3, p.topH);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(p.x - 2, p.topH - 6, pipeWidth + 4, 6);

        // Bottom pillar
        const botY = p.topH + gap;
        const botH = 200 - botY;
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(p.x, botY, pipeWidth, botH);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(p.x + 2, botY, 3, botH);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(p.x - 2, botY, pipeWidth + 4, 6);
      }

      // Floor & Ceiling line
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 192, 260, 8);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(0, 192, 260, 2);

      // Drone / Glider
      const by = state.birdY;
      ctx.fillStyle = '#f59e0b'; // Gold body
      ctx.fillRect(45, by, 12, 8);
      ctx.fillStyle = '#ef4444'; // Red sensor eye
      ctx.fillRect(52, by + 2, 4, 4);

      // Rotor blades
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(43, by - 2, 16, 2);

      // Jet exhaust particle
      if (state.started) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(41, by + 3, 3, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(42, by + 3, 1, 1);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []); // Run effect once!

  // Global key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[620px] md:max-w-[700px] lg:max-w-[760px]">
      <div className="flex justify-between items-center w-full mb-1.5 sm:mb-2 text-xs sm:text-sm md:text-base px-1">
        <span className="text-amber-300 font-bold">GATES: {score}/{targetScore}</span>
        <span className="text-emerald-400 text-[10px] sm:text-xs md:text-sm font-mono">SPACE / CLICK TO LIFT</span>
      </div>

      <div
        onPointerDown={(e) => {
          e.preventDefault();
          jump();
        }}
        className="relative cursor-pointer border-4 border-slate-700 shadow-2xl bg-black touch-none w-full flex justify-center overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          width={260}
          height={200}
          className="pixelated block w-full max-w-[600px] md:max-w-[680px] lg:max-w-[740px] aspect-[260/200] max-h-[55vh] sm:max-h-[480px] md:max-h-[540px] object-contain"
        />

        {!started && !gameOver && !won && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-3 text-center pointer-events-none">
            <span className="text-amber-400 text-xs sm:text-sm md:text-base mb-1 animate-pulse font-bold">CLICK OR [SPACE] TO LIFT</span>
            <span className="text-[10px] sm:text-xs md:text-sm text-slate-300 leading-relaxed max-w-sm">
              Steer drone through {targetScore} security gates!
            </span>
          </div>
        )}

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-3 sm:p-5 animate-in fade-in duration-200">
            <span className="text-emerald-400 text-sm sm:text-base md:text-xl mb-1.5 font-bold">★ COURSE CLEARED! ★</span>
            <span className="text-xs sm:text-sm md:text-base text-slate-300 mb-3 sm:mb-4">Passed {score} gates!</span>
            <button
              onClick={() => onSuccessRef.current()}
              className="px-5 sm:px-7 py-2 sm:py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm md:text-base font-bold border-2 border-white cursor-pointer active:translate-y-0.5 shadow-lg"
            >
              CLAIM REWARD NOW
            </button>
          </div>
        )}

        {gameOver && !won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-red-500 p-3 sm:p-5">
            <span className="text-red-400 text-xs sm:text-sm md:text-lg mb-2 sm:mb-3 font-bold">DRONE CRASHED</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                restart();
              }}
              className="px-5 sm:px-6 py-2 sm:py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm md:text-base border-2 border-white cursor-pointer active:translate-y-0.5 shadow-lg"
            >
              RESTART
            </button>
          </div>
        )}
      </div>

      <button
        onPointerDown={(e) => {
          e.preventDefault();
          jump();
        }}
        className="mt-2.5 px-6 py-2 sm:py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs sm:text-sm md:text-base border-2 border-yellow-200 cursor-pointer active:translate-y-0.5 shadow-md w-full max-w-[320px] text-center"
      >
        LIFT DRONE [SPACE]
      </button>
      <p className="text-[9px] sm:text-[10px] md:text-xs text-slate-400 mt-1">Space, Up Arrow, or Tap to Hover</p>
    </div>
  );
};
