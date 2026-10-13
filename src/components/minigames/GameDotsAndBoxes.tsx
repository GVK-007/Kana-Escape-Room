import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../../utils/audio';

interface GameDotsAndBoxesProps {
  onSuccess: () => void;
  onFailure?: () => void;
}

const DOTS = 5;
const BOXES = DOTS - 1; // 4x4 = 16 boxes
const SPACING = 48;
const OFFSET = 39;
const NEEDED_TO_WIN = 9;

export const GameDotsAndBoxes: React.FC<GameDotsAndBoxesProps> = ({ onSuccess }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const [hLines, setHLines] = useState<Record<string, 'P' | 'AI'>>({});
  const [vLines, setVLines] = useState<Record<string, 'P' | 'AI'>>({});
  const [boxes, setBoxes] = useState<Record<string, 'P' | 'AI'>>({});
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [hoveredLine, setHoveredLine] = useState<{ type: 'H' | 'V'; r: number; c: number } | null>(null);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    hLines: {} as Record<string, 'P' | 'AI'>,
    vLines: {} as Record<string, 'P' | 'AI'>,
    boxes: {} as Record<string, 'P' | 'AI'>,
    isPlayerTurn: true,
    playerScore: 0,
    aiScore: 0,
    won: false,
    gameOver: false,
  });

  const checkBoxCompletion = (
    curH: Record<string, 'P' | 'AI'>,
    curV: Record<string, 'P' | 'AI'>,
    curBoxes: Record<string, 'P' | 'AI'>,
    claimer: 'P' | 'AI'
  ) => {
    const nextBoxes = { ...curBoxes };
    let newlyClaimed = 0;

    for (let r = 0; r < BOXES; r++) {
      for (let c = 0; c < BOXES; c++) {
        const key = `${r}-${c}`;
        if (!nextBoxes[key]) {
          const top = curH[`${r}-${c}`];
          const bottom = curH[`${r + 1}-${c}`];
          const left = curV[`${r}-${c}`];
          const right = curV[`${r}-${c + 1}`];

          if (top && bottom && left && right) {
            nextBoxes[key] = claimer;
            newlyClaimed += 1;
          }
        }
      }
    }

    return { nextBoxes, newlyClaimed };
  };

  const getLineAtPoint = (clientX: number, clientY: number, tolerance: number = 18) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;

    let closest: { type: 'H' | 'V'; r: number; c: number; dist: number } | null = null;

    // Check Horizontal Lines
    for (let r = 0; r < DOTS; r++) {
      for (let c = 0; c < BOXES; c++) {
        if (stateRef.current.hLines[`${r}-${c}`]) continue;
        const x1 = OFFSET + c * SPACING;
        const x2 = x1 + SPACING;
        const y = OFFSET + r * SPACING;

        if (mx >= x1 && mx <= x2) {
          const dist = Math.abs(my - y);
          if (dist <= tolerance && (!closest || dist < closest.dist)) {
            closest = { type: 'H', r, c, dist };
          }
        }
      }
    }

    // Check Vertical Lines
    for (let r = 0; r < BOXES; r++) {
      for (let c = 0; c < DOTS; c++) {
        if (stateRef.current.vLines[`${r}-${c}`]) continue;
        const x = OFFSET + c * SPACING;
        const y1 = OFFSET + r * SPACING;
        const y2 = y1 + SPACING;

        if (my >= y1 && my <= y2) {
          const dist = Math.abs(mx - x);
          if (dist <= tolerance && (!closest || dist < closest.dist)) {
            closest = { type: 'V', r, c, dist };
          }
        }
      }
    }

    return closest ? { type: closest.type, r: closest.r, c: closest.c } : null;
  };

  const applyLineMove = (line: { type: 'H' | 'V'; r: number; c: number }) => {
    const s = stateRef.current;
    if (!s.isPlayerTurn || s.won || s.gameOver) return;

    const { type, r, c } = line;
    const key = `${r}-${c}`;

    if (type === 'H') {
      if (s.hLines[key]) return;
      sounds.playBlip(540);
      s.hLines[key] = 'P';
      setHLines({ ...s.hLines });
    } else {
      if (s.vLines[key]) return;
      sounds.playBlip(540);
      s.vLines[key] = 'P';
      setVLines({ ...s.vLines });
    }

    setHoveredLine(null);

    const { nextBoxes, newlyClaimed } = checkBoxCompletion(s.hLines, s.vLines, s.boxes, 'P');
    s.boxes = nextBoxes;
    setBoxes(nextBoxes);

    if (newlyClaimed > 0) {
      sounds.playKanaObtained();
      s.playerScore += newlyClaimed;
      setPlayerScore(s.playerScore);
      checkGameEnd();
    } else {
      // 1 chance per turn! Pass to AI
      s.isPlayerTurn = false;
      setIsPlayerTurn(false);
      checkGameEnd();
      setTimeout(runAiTurn, 400);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const line = hoveredLine || getLineAtPoint(e.clientX, e.clientY, 18);
    if (line) {
      applyLineMove(line);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const line = getLineAtPoint(touch.clientX, touch.clientY, 22);
    if (line) {
      e.preventDefault();
      applyLineMove(line);
    }
  };

  const runAiTurn = () => {
    const s = stateRef.current;
    if (s.won || s.gameOver) return;

    // Collect all open lines
    const openH: { r: number; c: number }[] = [];
    const openV: { r: number; c: number }[] = [];

    for (let r = 0; r < DOTS; r++) {
      for (let c = 0; c < BOXES; c++) {
        if (!s.hLines[`${r}-${c}`]) openH.push({ r, c });
      }
    }
    for (let r = 0; r < BOXES; r++) {
      for (let c = 0; c < DOTS; c++) {
        if (!s.vLines[`${r}-${c}`]) openV.push({ r, c });
      }
    }

    if (openH.length === 0 && openV.length === 0) {
      checkGameEnd();
      return;
    }

    // AI Check: Can complete any box?
    let chosen: { type: 'H' | 'V'; r: number; c: number } | null = null;

    for (const h of openH) {
      const testH = { ...s.hLines, [`${h.r}-${h.c}`]: 'AI' as const };
      const { newlyClaimed } = checkBoxCompletion(testH, s.vLines, s.boxes, 'AI');
      if (newlyClaimed > 0) {
        chosen = { type: 'H', ...h };
        break;
      }
    }

    if (!chosen) {
      for (const v of openV) {
        const testV = { ...s.vLines, [`${v.r}-${v.c}`]: 'AI' as const };
        const { newlyClaimed } = checkBoxCompletion(s.hLines, testV, s.boxes, 'AI');
        if (newlyClaimed > 0) {
          chosen = { type: 'V', ...v };
          break;
        }
      }
    }

    // Otherwise random choice
    if (!chosen) {
      const pickH = openH.length > 0 && (openV.length === 0 || Math.random() > 0.5);
      if (pickH) {
        chosen = { type: 'H', ...openH[Math.floor(Math.random() * openH.length)] };
      } else {
        chosen = { type: 'V', ...openV[Math.floor(Math.random() * openV.length)] };
      }
    }

    // Apply AI move
    sounds.playBlip(380);
    const key = `${chosen.r}-${chosen.c}`;
    if (chosen.type === 'H') {
      s.hLines[key] = 'AI';
      setHLines({ ...s.hLines });
    } else {
      s.vLines[key] = 'AI';
      setVLines({ ...s.vLines });
    }

    const { nextBoxes, newlyClaimed } = checkBoxCompletion(s.hLines, s.vLines, s.boxes, 'AI');
    s.boxes = nextBoxes;
    setBoxes(nextBoxes);

    if (newlyClaimed > 0) {
      s.aiScore += newlyClaimed;
      setAiScore(s.aiScore);
      checkGameEnd();
      // AI gets bonus turn for completing box
      setTimeout(runAiTurn, 350);
    } else {
      // 1 chance per turn! Pass back to player
      s.isPlayerTurn = true;
      setIsPlayerTurn(true);
      checkGameEnd();
    }
  };

  const checkGameEnd = () => {
    const s = stateRef.current;
    const totalClaimed = Object.keys(s.boxes).length;
    const allLinesDone =
      Object.keys(s.hLines).length === DOTS * BOXES &&
      Object.keys(s.vLines).length === BOXES * DOTS;

    if (totalClaimed >= BOXES * BOXES || allLinesDone) {
      if (s.playerScore > s.aiScore) {
        s.won = true;
        setWon(true);
        sounds.playSuccess();
        setTimeout(() => onSuccessRef.current(), 750);
      } else {
        s.gameOver = true;
        setGameOver(true);
        sounds.playFail();
      }
    }
  };

  // Canvas Hover detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!stateRef.current.isPlayerTurn) return;
    const line = getLineAtPoint(e.clientX, e.clientY, 16);
    setHoveredLine(line);
  };

  // Render 4x4 dots & lines on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 270, 270);

    // Draw Claimed Boxes
    for (let r = 0; r < BOXES; r++) {
      for (let c = 0; c < BOXES; c++) {
        const claimer = boxes[`${r}-${c}`];
        if (claimer) {
          const bx = OFFSET + c * SPACING + 3;
          const by = OFFSET + r * SPACING + 3;
          ctx.fillStyle = claimer === 'P' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(239, 68, 68, 0.35)';
          ctx.fillRect(bx, by, SPACING - 6, SPACING - 6);
          ctx.fillStyle = claimer === 'P' ? '#38bdf8' : '#ef4444';
          ctx.font = 'bold 16px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(claimer, bx + (SPACING - 6) / 2, by + (SPACING - 6) / 2);
        }
      }
    }

    // Draw Horizontal Lines
    for (let r = 0; r < DOTS; r++) {
      for (let c = 0; c < BOXES; c++) {
        const claimer = hLines[`${r}-${c}`];
        const isHover = hoveredLine?.type === 'H' && hoveredLine.r === r && hoveredLine.c === c;
        const x1 = OFFSET + c * SPACING;
        const y = OFFSET + r * SPACING;

        if (claimer) {
          ctx.fillStyle = claimer === 'P' ? '#38bdf8' : '#ef4444';
          ctx.fillRect(x1 + 4, y - 2.5, SPACING - 8, 5);
        } else if (isHover && isPlayerTurn) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
          ctx.fillRect(x1 + 4, y - 2, SPACING - 8, 4);
        }
      }
    }

    // Draw Vertical Lines
    for (let r = 0; r < BOXES; r++) {
      for (let c = 0; c < DOTS; c++) {
        const claimer = vLines[`${r}-${c}`];
        const isHover = hoveredLine?.type === 'V' && hoveredLine.r === r && hoveredLine.c === c;
        const x = OFFSET + c * SPACING;
        const y1 = OFFSET + r * SPACING;

        if (claimer) {
          ctx.fillStyle = claimer === 'P' ? '#38bdf8' : '#ef4444';
          ctx.fillRect(x - 2.5, y1 + 4, 5, SPACING - 8);
        } else if (isHover && isPlayerTurn) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
          ctx.fillRect(x - 2, y1 + 4, 4, SPACING - 8);
        }
      }
    }

    // Draw 5x5 Dots
    for (let r = 0; r < DOTS; r++) {
      for (let c = 0; c < DOTS; c++) {
        const x = OFFSET + c * SPACING;
        const y = OFFSET + r * SPACING;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [hLines, vLines, boxes, hoveredLine, isPlayerTurn]);

  const restartAll = () => {
    stateRef.current = {
      hLines: {},
      vLines: {},
      boxes: {},
      isPlayerTurn: true,
      playerScore: 0,
      aiScore: 0,
      won: false,
      gameOver: false,
    };
    setHLines({});
    setVLines({});
    setBoxes({});
    setIsPlayerTurn(true);
    setPlayerScore(0);
    setAiScore(0);
    setWon(false);
    setGameOver(false);
  };

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[540px]">
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm">
        <span className="text-cyan-400 font-bold">YOU: {playerScore} BOXES</span>
        <span className="text-yellow-400 font-mono text-[10px] sm:text-xs">5x5 DOTS (16 BOXES — CLAIM MOST BOXES)</span>
        <span className="text-rose-400 font-bold">AI: {aiScore} BOXES</span>
      </div>

      <div className="relative bg-slate-950 p-3 sm:p-5 border-4 border-slate-700 shadow-2xl flex flex-col items-center w-full">
        <div className="text-xs sm:text-sm text-yellow-300 mb-2 font-bold h-5 text-center">
          {isPlayerTurn ? 'YOUR TURN (1 LINE — BONUS ON BOX)' : 'AI IS PLAYING...'}
        </div>

        <canvas
          ref={canvasRef}
          width={270}
          height={270}
          onMouseMove={handleMouseMove}
          onClick={handleCanvasClick}
          onTouchStart={handleTouchStart}
          className="pixelated block cursor-pointer border border-slate-800 touch-none w-full max-w-[480px] aspect-square object-contain"
        />

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in z-20">
            <span className="text-emerald-400 text-base sm:text-lg mb-2 font-bold">★ ALL 16 BOXES COMPLETED! ★</span>
            <span className="text-xs sm:text-sm text-slate-300 mb-4 text-center">You claimed the majority of the boxes!</span>
            <button
              onClick={() => onSuccessRef.current()}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-bold border-2 border-white cursor-pointer shadow-lg"
            >
              CLAIM REWARD NOW
            </button>
          </div>
        )}

        {gameOver && !won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-red-500 p-4 z-20">
            <span className="text-red-400 text-sm mb-3 font-bold">AI SECURED MORE TERRITORY</span>
            <button
              onClick={restartAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold border-2 border-white cursor-pointer"
            >
              TRY AGAIN
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] sm:text-xs text-slate-400 mt-3 text-center">
        Each player gets 1 line per turn. Complete a 4th wall to capture the box & take an extra turn!
      </p>
    </div>
  );
};
