import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../../utils/audio';

interface GameDartsProps {
  onSuccess: () => void;
  onFailure?: () => void;
}

type TurnPhase = 
  | 'PLAYER_X' 
  | 'PLAYER_Y' 
  | 'PLAYER_HIT' 
  | 'AI_X' 
  | 'AI_Y' 
  | 'AI_HIT';

const BASE_SPEED = 2.8;

export const GameDarts: React.FC<GameDartsProps> = ({ onSuccess }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerPoints, setPlayerPoints] = useState(200);
  const [aiPoints, setAiPoints] = useState(200);
  const [roundNumber, setRoundNumber] = useState(1);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [statusText, setStatusText] = useState('YOUR TURN: LOCK X AXIS');
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const playerPointsRef = useRef(200);
  const aiPointsRef = useRef(200);
  const roundRef = useRef(1);
  const speedRef = useRef(1.0);

  const stateRef = useRef({
    phase: 'PLAYER_X' as TurnPhase,
    sliderX: 145, // runs between 55 and 235
    sliderXDir: BASE_SPEED,
    sliderY: 125, // runs between 45 and 205
    sliderYDir: BASE_SPEED,
    playerDart: null as { x: number; y: number } | null,
    aiDart: null as { x: number; y: number } | null,
    aiTargetX: 145,
    aiTargetY: 125,
    aiTimer: 0,
    won: false,
    gameOver: false,
  });

  // Calculate score based on distance from center (145, 125)
  const calculatePoints = (x: number, y: number): number => {
    const dist = Math.hypot(x - 145, y - 125);
    if (dist <= 14) return 50; // Bullseye
    if (dist <= 35) return 30; // Inner
    if (dist <= 56) return 20; // Middle
    if (dist <= 76) return 10; // Outer
    return 0; // Miss
  };

  // Called after BOTH Player and AI finish their turn for the round:
  // Round 1 -> +50% (factor * 1.50)
  // Round 2 -> +25% (factor * 1.25)
  // Round 3 -> +12.5% (factor * 1.125)
  // Round 4 -> +6.25% (factor * 1.0625)
  const finishFullRoundAndAccelerate = () => {
    const r = roundRef.current;
    const increment = 0.5 / Math.pow(2, r - 1); // 0.5, 0.25, 0.125, 0.0625...
    const nextSpeed = speedRef.current * (1 + increment);

    speedRef.current = nextSpeed;
    roundRef.current = r + 1;
    setRoundNumber(r + 1);
    setSpeedMultiplier(nextSpeed);

    const s = stateRef.current;
    s.sliderXDir = Math.sign(s.sliderXDir) * BASE_SPEED * nextSpeed;
    s.sliderYDir = Math.sign(s.sliderYDir) * BASE_SPEED * nextSpeed;
  };

  const lastActionTimeRef = useRef(0);

  // Immediate input action - with 400ms debounce to prevent touch double-triggering
  const triggerPlayerAction = () => {
    const now = performance.now();
    if (now - lastActionTimeRef.current < 400) return;
    lastActionTimeRef.current = now;

    const s = stateRef.current;
    if (s.won || s.gameOver) return;

    if (s.phase === 'PLAYER_X') {
      sounds.playBlip(540);
      s.phase = 'PLAYER_Y';
      setStatusText('YOUR TURN: LOCK Y AXIS');
    } else if (s.phase === 'PLAYER_Y') {
      sounds.playSelect();
      s.phase = 'PLAYER_HIT';

      const hitX = s.sliderX;
      const hitY = s.sliderY;
      s.playerDart = { x: hitX, y: hitY };

      const earned = calculatePoints(hitX, hitY);
      const nextPoints = Math.max(0, playerPointsRef.current - earned);
      playerPointsRef.current = nextPoints;
      setPlayerPoints(nextPoints);

      const hitLabel = earned === 50 ? '★ BULLSEYE! (+50)' : earned > 0 ? `HIT: +${earned} PTS` : 'MISS: +0 PTS';
      setStatusText(`YOU: ${hitLabel}`);

      if (nextPoints <= 0) {
        s.won = true;
        setWon(true);
        sounds.playSuccess();
        setTimeout(() => onSuccessRef.current(), 750);
        return;
      }

      // Transition to AI turn
      setTimeout(() => {
        startAiTurn();
      }, 700);
    }
  };

  const startAiTurn = () => {
    const s = stateRef.current;
    if (s.won || s.gameOver) return;

    s.phase = 'AI_X';
    s.aiTargetX = 145 + (Math.random() - 0.5) * 45;
    s.aiTargetY = 125 + (Math.random() - 0.5) * 45;
    s.aiTimer = 0;
    setStatusText('AI TOOL: AIMING X AXIS...');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let animId: number;

    const loop = () => {
      const s = stateRef.current;

      // Update Sliders based on current active phase
      if (s.phase === 'PLAYER_X' || s.phase === 'AI_X') {
        s.sliderX += s.sliderXDir;
        if (s.sliderX >= 235) {
          s.sliderX = 235;
          s.sliderXDir = -Math.abs(s.sliderXDir);
        } else if (s.sliderX <= 55) {
          s.sliderX = 55;
          s.sliderXDir = Math.abs(s.sliderXDir);
        }

        // AI automated aiming logic for X
        if (s.phase === 'AI_X') {
          s.aiTimer += 1;
          const diff = Math.abs(s.sliderX - s.aiTargetX);
          if ((diff < 8 && s.aiTimer > 15) || s.aiTimer > 75) {
            sounds.playBlip(480);
            s.phase = 'AI_Y';
            s.aiTimer = 0;
            setStatusText('AI TOOL: AIMING Y AXIS...');
          }
        }
      } else if (s.phase === 'PLAYER_Y' || s.phase === 'AI_Y') {
        s.sliderY += s.sliderYDir;
        if (s.sliderY >= 205) {
          s.sliderY = 205;
          s.sliderYDir = -Math.abs(s.sliderYDir);
        } else if (s.sliderY <= 45) {
          s.sliderY = 45;
          s.sliderYDir = Math.abs(s.sliderYDir);
        }

        // AI automated aiming logic for Y
        if (s.phase === 'AI_Y') {
          s.aiTimer += 1;
          const diff = Math.abs(s.sliderY - s.aiTargetY);
          if ((diff < 8 && s.aiTimer > 15) || s.aiTimer > 75) {
            sounds.playSelect();
            s.phase = 'AI_HIT';

            const hitX = s.sliderX;
            const hitY = s.sliderY;
            s.aiDart = { x: hitX, y: hitY };

            const earned = calculatePoints(hitX, hitY);
            const nextAiPoints = Math.max(0, aiPointsRef.current - earned);
            aiPointsRef.current = nextAiPoints;
            setAiPoints(nextAiPoints);

            const hitLabel = earned === 50 ? 'AI BULLSEYE! (+50)' : earned > 0 ? `AI HIT: +${earned} PTS` : 'AI MISS';
            setStatusText(hitLabel);

            // BOTH Player & AI have finished their turns in this round! Accelerate!
            finishFullRoundAndAccelerate();

            if (nextAiPoints <= 0) {
              s.gameOver = true;
              setGameOver(true);
              sounds.playFail();
            } else {
              setTimeout(() => {
                s.phase = 'PLAYER_X';
                setStatusText('YOUR TURN: LOCK X AXIS');
              }, 800);
            }
          }
        }
      }

      // --- RENDER DART ARENA ---
      ctx.fillStyle = '#080816';
      ctx.fillRect(0, 0, 260, 240);

      // Top Horizontal Slider Track (X Axis: 55 to 235)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(50, 10, 190, 12);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(50, 10, 190, 12);

      // Center mark on X track
      ctx.fillStyle = '#475569';
      ctx.fillRect(144, 8, 2, 16);

      // X Slider indicator (Cyan for Player, Red for AI)
      const xColor = s.phase.startsWith('AI') ? '#ef4444' : '#38bdf8';
      ctx.fillStyle = xColor;
      ctx.fillRect(s.sliderX - 3, 8, 6, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(s.sliderX - 1, 10, 2, 12);

      // Left Vertical Slider Track (Y Axis: 45 to 205)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(14, 40, 12, 170);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(14, 40, 12, 170);

      // Center mark on Y track
      ctx.fillStyle = '#475569';
      ctx.fillRect(12, 124, 16, 2);

      // Y Slider indicator
      const yColor = s.phase.startsWith('AI') ? '#ef4444' : '#facc15';
      ctx.fillStyle = yColor;
      ctx.fillRect(12, s.sliderY - 3, 16, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, s.sliderY - 1, 12, 2);

      // Center Dartboard (Center: 145, 125)
      const rings = [
        { r: 76, color: '#0f172a', border: '#334155', pts: 10 },
        { r: 56, color: '#15803d', border: '#166534', pts: 20 },
        { r: 35, color: '#dc2626', border: '#991b1b', pts: 30 },
        { r: 14, color: '#facc15', border: '#ca8a04', pts: 50 },
      ];

      for (const ring of rings) {
        ctx.fillStyle = ring.color;
        ctx.beginPath();
        ctx.arc(145, 125, ring.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ring.border;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Dartboard Crosshairs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(145, 49);
      ctx.lineTo(145, 201);
      ctx.moveTo(69, 125);
      ctx.lineTo(221, 125);
      ctx.stroke();

      // Draw Player Dart Pin (Cyan)
      if (s.playerDart) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(s.playerDart.x, s.playerDart.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.playerDart.x, s.playerDart.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.font = '8px monospace';
        ctx.fillText('P', s.playerDart.x + 6, s.playerDart.y + 3);
      }

      // Draw AI Dart Pin (Red)
      if (s.aiDart) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(s.aiDart.x, s.aiDart.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.aiDart.x, s.aiDart.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.font = '8px monospace';
        ctx.fillText('AI', s.aiDart.x + 6, s.aiDart.y + 3);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'Enter'].includes(e.code)) {
        e.preventDefault();
        triggerPlayerAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const restartAll = () => {
    playerPointsRef.current = 200;
    aiPointsRef.current = 200;
    roundRef.current = 1;
    speedRef.current = 1.0;
    setPlayerPoints(200);
    setAiPoints(200);
    setRoundNumber(1);
    setSpeedMultiplier(1.0);
    stateRef.current.sliderXDir = BASE_SPEED;
    stateRef.current.sliderYDir = BASE_SPEED;
    stateRef.current.phase = 'PLAYER_X';
    stateRef.current.playerDart = null;
    stateRef.current.aiDart = null;
    stateRef.current.won = false;
    stateRef.current.gameOver = false;
    setStatusText('YOUR TURN: LOCK X AXIS');
    setWon(false);
    setGameOver(false);
  };

  const isPlayerPhase = stateRef.current.phase === 'PLAYER_X' || stateRef.current.phase === 'PLAYER_Y';

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[560px]">
      {/* Score Header */}
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm px-1">
        <span className="text-cyan-400 font-bold">YOU: {playerPoints}</span>
        <span className="text-yellow-400 text-[10px] sm:text-xs font-mono bg-yellow-950/80 px-2.5 py-0.5 border border-yellow-500">
          RND {roundNumber} • {speedMultiplier.toFixed(2)}x
        </span>
        <span className="text-rose-400 font-bold">AI: {aiPoints}</span>
      </div>

      <div className="relative bg-slate-950 p-2.5 sm:p-3 border-4 border-slate-700 shadow-2xl flex flex-col items-center w-full">
        <canvas
          ref={canvasRef}
          width={260}
          height={240}
          onPointerDown={(e) => {
            e.preventDefault();
            triggerPlayerAction();
          }}
          className="pixelated block cursor-pointer border border-slate-800 touch-none w-full max-w-[480px] aspect-[260/240] object-contain"
        />

        <div className="text-[10px] sm:text-xs text-yellow-300 font-bold mt-2 text-center h-4 tracking-wider">
          {statusText}
        </div>

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in z-20">
            <span className="text-emerald-400 text-sm sm:text-base mb-1 font-bold">★ TARGET ZERO REACHED! ★</span>
            <span className="text-xs text-slate-300 mb-3">You beat the security AI!</span>
            <button
              onClick={() => onSuccessRef.current()}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-bold border-2 border-white cursor-pointer active:translate-y-0.5 shadow-lg"
            >
              CLAIM REWARD NOW
            </button>
          </div>
        )}

        {gameOver && !won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-red-500 p-4 z-20">
            <span className="text-red-400 text-sm mb-3 font-bold">AI TOOL REACHED 0 FIRST</span>
            <button
              onClick={restartAll}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs border-2 border-white cursor-pointer active:translate-y-0.5"
            >
              TRY AGAIN
            </button>
          </div>
        )}
      </div>

      <button
        onPointerDown={(e) => {
          e.preventDefault();
          triggerPlayerAction();
        }}
        disabled={!isPlayerPhase || won}
        className={`mt-3 px-8 py-2.5 font-pixel text-xs sm:text-sm font-bold border-2 border-white cursor-pointer active:translate-y-0.5 shadow-md transition-all w-full max-w-[320px] text-center ${
          isPlayerPhase
            ? 'bg-yellow-400 hover:bg-yellow-300 text-black animate-pulse'
            : 'bg-slate-800 text-slate-500 border-slate-600 cursor-not-allowed opacity-60'
        }`}
      >
        {stateRef.current.phase === 'PLAYER_X'
          ? 'LOCK X AXIS [SPACE]'
          : stateRef.current.phase === 'PLAYER_Y'
          ? 'LOCK Y AXIS [SPACE]'
          : 'WATCHING AI TURN...'}
      </button>

      <p className="text-[10px] sm:text-xs text-slate-400 mt-2 text-center">
        Speed increases after both play: +50% → +25% → +12.5% → +6.25%!
      </p>
    </div>
  );
};
