import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../../utils/audio';

interface GamePongProps {
  onSuccess: () => void;
  onFailure?: () => void;
  targetPoints?: number;
}

export const GamePong: React.FC<GamePongProps> = ({ onSuccess, targetPoints = 3 }) => {
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [exchanges, setExchanges] = useState(0);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const targetPointsRef = useRef(targetPoints);
  targetPointsRef.current = targetPoints;

  const stateRef = useRef({
    playerY: 80,
    aiY: 80,
    paddleH: 36,
    paddleW: 6,
    ballX: 130,
    ballY: 100,
    ballVx: -2.3,
    ballVy: 1.0,
    baseSpeed: 2.3,
    rallyHits: 0,
    aiErrorY: 0,
    playerScore: 0,
    aiScore: 0,
    won: false,
    gameOver: false,
    keys: { up: false, down: false },
  });

  const resetBall = (towardsPlayer: boolean) => {
    const s = stateRef.current;
    s.ballX = 130;
    s.ballY = 100;
    s.rallyHits = 0;
    s.aiErrorY = (Math.random() - 0.5) * 16;
    setExchanges(0);
    const speed = s.baseSpeed;
    s.ballVx = towardsPlayer ? -speed : speed;
    s.ballVy = (Math.random() - 0.5) * 2.2;
    setSpeedMultiplier(1.0);
  };

  const restart = () => {
    stateRef.current.playerScore = 0;
    stateRef.current.aiScore = 0;
    stateRef.current.won = false;
    stateRef.current.gameOver = false;
    stateRef.current.rallyHits = 0;
    setPlayerScore(0);
    setAiScore(0);
    setExchanges(0);
    setWon(false);
    setGameOver(false);
    resetBall(true);
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

      // Player input
      if (s.keys.up) s.playerY = Math.max(4, s.playerY - 4.2 * dt);
      if (s.keys.down) s.playerY = Math.min(200 - s.paddleH - 4, s.playerY + 4.2 * dt);

      // Humanized AI movement: only actively tracks when ball is traveling toward AI
      let targetAiY: number;
      if (s.ballVx > 0) {
        targetAiY = s.ballY + s.aiErrorY - s.paddleH / 2;
      } else {
        // Drifts back towards center court waiting for next volley
        targetAiY = 100 - s.paddleH / 2;
      }

      const aiSpeed = 2.6 * dt;
      if (s.aiY < targetAiY - 2) {
        s.aiY = Math.min(200 - s.paddleH - 4, s.aiY + aiSpeed);
      } else if (s.aiY > targetAiY + 2) {
        s.aiY = Math.max(4, s.aiY - aiSpeed);
      }

      if (!s.won && !s.gameOver) {
        s.ballX += s.ballVx * dt;
        s.ballY += s.ballVy * dt;

        // Top/Bottom walls
        if (s.ballY <= 4) {
          s.ballY = 4;
          s.ballVy = Math.abs(s.ballVy);
          sounds.playBlip(400);
        } else if (s.ballY >= 196) {
          s.ballY = 196;
          s.ballVy = -Math.abs(s.ballVy);
          sounds.playBlip(400);
        }

        // Left Paddle (Player) collision
        if (
          s.ballX <= 18 &&
          s.ballX >= 10 &&
          s.ballY >= s.playerY - 3 &&
          s.ballY <= s.playerY + s.paddleH + 3
        ) {
          s.rallyHits += 1;
          const factor = Math.min(2.2, 1 + s.rallyHits * 0.12);
          setSpeedMultiplier(factor);
          setExchanges(s.rallyHits);

          const hitOffset = (s.ballY - (s.playerY + s.paddleH / 2)) / (s.paddleH / 2);
          s.ballVx = Math.abs(s.baseSpeed * factor);
          s.ballVy = hitOffset * (2.8 * factor);

          // Sharper hit angle increases AI tracking difficulty
          s.aiErrorY = hitOffset * 18 + (Math.random() - 0.5) * 12;

          sounds.playBlip(620);
        }

        // Right Paddle (AI) collision
        if (
          s.ballX >= 242 &&
          s.ballX <= 250 &&
          s.ballY >= s.aiY - 3 &&
          s.ballY <= s.aiY + s.paddleH + 3
        ) {
          s.rallyHits += 1;
          const factor = Math.min(2.2, 1 + s.rallyHits * 0.12);
          setSpeedMultiplier(factor);
          setExchanges(s.rallyHits);

          const hitOffset = (s.ballY - (s.aiY + s.paddleH / 2)) / (s.paddleH / 2);
          s.ballVx = -Math.abs(s.baseSpeed * factor);
          s.ballVy = hitOffset * (2.4 * factor);
          sounds.playBlip(520);
        }

        // Left Out -> AI scores
        if (s.ballX < 0) {
          s.aiScore += 1;
          setAiScore(s.aiScore);
          sounds.playFail();

          if (s.aiScore >= targetPointsRef.current) {
            s.gameOver = true;
            setGameOver(true);
          } else {
            resetBall(true);
          }
        }

        // Right Out -> Player scores!
        if (s.ballX > 260) {
          s.playerScore += 1;
          setPlayerScore(s.playerScore);
          sounds.playSuccess();

          if (s.playerScore >= targetPointsRef.current) {
            s.won = true;
            setWon(true);
            setTimeout(() => onSuccessRef.current(), 750);
          } else {
            resetBall(false);
          }
        }
      }

      // Draw Arena
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, 260, 200);

      // Center Dotted Line
      ctx.strokeStyle = '#1e293b';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(130, 0);
      ctx.lineTo(130, 200);
      ctx.stroke();
      ctx.setLineDash([]);

      // Player Paddle
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(12, s.playerY, s.paddleW, s.paddleH);

      // AI Paddle
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(242, s.aiY, s.paddleW, s.paddleH);

      // Ball
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, 4, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.keys.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.keys.down = true;
      if (['Space', 'Enter'].includes(e.code) && gameOver) restart();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.keys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.keys.down = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameOver]);

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[580px]">
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm px-1">
        <span className="text-cyan-400 font-bold">YOU: {playerScore}/{targetPoints}</span>
        <span className="text-amber-300 text-[10px] sm:text-xs font-mono font-bold tracking-wider">
          SPEED: {speedMultiplier <= 1 ? '1x' : `${speedMultiplier.toFixed(1)}x`}
        </span>
        <span className="text-rose-400 font-bold">AI: {aiScore}/{targetPoints}</span>
      </div>

      <div className="relative bg-slate-950 p-2 border-4 border-slate-700 shadow-2xl touch-none w-full flex justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={260}
          height={200}
          className="block touch-none cursor-pointer w-full max-w-[560px] aspect-[260/200] object-contain pixelated"
          onTouchStart={(e) => {
            if (e.touches[0] && canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const scaleY = canvasRef.current.height / rect.height;
              const y = (e.touches[0].clientY - rect.top) * scaleY;
              stateRef.current.playerY = Math.max(4, Math.min(200 - stateRef.current.paddleH - 4, y - stateRef.current.paddleH / 2));
            }
          }}
          onTouchMove={(e) => {
            if (e.touches[0] && canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const scaleY = canvasRef.current.height / rect.height;
              const y = (e.touches[0].clientY - rect.top) * scaleY;
              stateRef.current.playerY = Math.max(4, Math.min(200 - stateRef.current.paddleH - 4, y - stateRef.current.paddleH / 2));
            }
          }}
          onMouseMove={(e) => {
            if (e.buttons === 1 && canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const scaleY = canvasRef.current.height / rect.height;
              const y = (e.clientY - rect.top) * scaleY;
              stateRef.current.playerY = Math.max(4, Math.min(200 - stateRef.current.paddleH - 4, y - stateRef.current.paddleH / 2));
            }
          }}
        />

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in">
            <span className="text-emerald-400 text-sm sm:text-base mb-1 font-bold">★ PONG CHAMPION! ★</span>
            <span className="text-xs text-slate-300 mb-3">Precision paddle angle slices outmaneuvered the AI!</span>
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
            <span className="text-red-400 text-sm mb-3 font-bold">MATCH LOST</span>
            <button
              onClick={restart}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs border-2 border-white cursor-pointer active:translate-y-0.5"
            >
              TRY AGAIN [SPACE]
            </button>
          </div>
        )}
      </div>

      {/* Touch Controls */}
      <div className="flex gap-4 mt-3">
        <button
          onMouseDown={() => { stateRef.current.keys.up = true; }}
          onMouseUp={() => { stateRef.current.keys.up = false; }}
          onTouchStart={() => { stateRef.current.keys.up = true; }}
          onTouchEnd={() => { stateRef.current.keys.up = false; }}
          className="px-7 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border-2 border-slate-600 text-xs sm:text-sm cursor-pointer"
        >
          ▲ UP
        </button>
        <button
          onMouseDown={() => { stateRef.current.keys.down = true; }}
          onMouseUp={() => { stateRef.current.keys.down = false; }}
          onTouchStart={() => { stateRef.current.keys.down = true; }}
          onTouchEnd={() => { stateRef.current.keys.down = false; }}
          className="px-7 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border-2 border-slate-600 text-xs sm:text-sm cursor-pointer"
        >
          ▼ DOWN
        </button>
      </div>

      <p className="text-[10px] sm:text-xs text-slate-400 mt-2 text-center">
        W/S or Up/Down • Slice with the paddle edges to drive fast, angled shots!
      </p>
    </div>
  );
};
