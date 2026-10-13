import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sounds } from '../../utils/audio';

interface GamePatternMemoryProps {
  onSuccess: () => void;
  onFailure?: () => void;
  totalStages?: number;
}

export const GamePatternMemory: React.FC<GamePatternMemoryProps> = ({ onSuccess, totalStages = 5 }) => {
  const [stage, setStage] = useState(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [isShowingPattern, setIsShowingPattern] = useState(false);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const seqRef = useRef<number[]>([]);
  const timersRef = useRef<number[]>([]);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const stageRef = useRef(stage);
  stageRef.current = stage;
  const playerInputRef = useRef(playerInput);
  playerInputRef.current = playerInput;
  const isShowingPatternRef = useRef(isShowingPattern);
  isShowingPatternRef.current = isShowingPattern;
  const gameOverRef = useRef(gameOver);
  gameOverRef.current = gameOver;
  const wonRef = useRef(won);
  wonRef.current = won;

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((id) => {
      clearInterval(id);
      clearTimeout(id);
    });
    timersRef.current = [];
  }, []);

  // Generate sequence for current stage
  const startStage = useCallback((currentStage: number) => {
    clearAllTimers();
    setIsShowingPattern(true);
    isShowingPatternRef.current = true;
    setActiveButton(null);
    setPlayerInput([]);
    playerInputRef.current = [];

    // Build random sequence of length currentStage
    const newSeq: number[] = [];
    for (let i = 0; i < currentStage; i++) {
      newSeq.push(Math.floor(Math.random() * 9) + 1);
    }
    setSequence(newSeq);
    seqRef.current = newSeq;

    // Flash sequence with clear timing that is fun and recognizable
    const flashSpeed = Math.max(280, 600 - (currentStage - 1) * 60);
    const activeDuration = Math.max(160, Math.floor(flashSpeed * 0.65));

    let idx = 0;
    const interval = window.setInterval(() => {
      if (idx < newSeq.length) {
        const btn = newSeq[idx];
        setActiveButton(btn);
        sounds.playBlip(320 + btn * 50);

        const tId = window.setTimeout(() => {
          setActiveButton(null);
        }, activeDuration);
        timersRef.current.push(tId);

        idx++;
      } else {
        clearInterval(interval);
        const bufferTimer = window.setTimeout(() => {
          setIsShowingPattern(false);
          isShowingPatternRef.current = false;
        }, 150);
        timersRef.current.push(bufferTimer);
      }
    }, flashSpeed);
    timersRef.current.push(interval);
  }, [clearAllTimers]);

  useEffect(() => {
    startStage(stage);
    return () => {
      clearAllTimers();
    };
  }, [stage, startStage, clearAllTimers]);

  const handleButtonClick = useCallback((num: number) => {
    if (isShowingPatternRef.current || gameOverRef.current || wonRef.current) return;

    sounds.playBlip(320 + num * 50);
    setActiveButton(num);
    const animTimer = window.setTimeout(() => setActiveButton(null), 200);
    timersRef.current.push(animTimer);

    const nextInput = [...playerInputRef.current, num];
    playerInputRef.current = nextInput;
    setPlayerInput(nextInput);

    const stepIndex = nextInput.length - 1;
    if (seqRef.current[stepIndex] !== num) {
      // Wrong button
      sounds.playFail();
      gameOverRef.current = true;
      setGameOver(true);
      return;
    }

    // Check if stage complete
    if (nextInput.length === seqRef.current.length) {
      sounds.playSelect();
      if (stageRef.current >= totalStages) {
        wonRef.current = true;
        setWon(true);
        sounds.playSuccess();
        setTimeout(() => onSuccessRef.current(), 750);
      } else {
        setTimeout(() => {
          setStage((s) => s + 1);
        }, 600);
      }
    }
  }, [totalStages]);

  const retry = useCallback(() => {
    clearAllTimers();
    gameOverRef.current = false;
    setGameOver(false);
    wonRef.current = false;
    setWon(false);
    playerInputRef.current = [];
    setPlayerInput([]);
    stageRef.current = 1;
    setStage(1);
    startStage(1);
  }, [clearAllTimers, startStage]);

  // Keyboard and Numpad support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      // Space / Enter to retry when game over
      if (e.code === 'Space' || e.code === 'Enter') {
        if (gameOverRef.current && !wonRef.current) {
          e.preventDefault();
          retry();
          return;
        }
      }

      // Support Numpad and Top Number row
      const keyMap: Record<string, number> = {
        Numpad1: 1,
        Numpad2: 2,
        Numpad3: 3,
        Numpad4: 4,
        Numpad5: 5,
        Numpad6: 6,
        Numpad7: 7,
        Numpad8: 8,
        Numpad9: 9,
        Digit1: 1,
        Digit2: 2,
        Digit3: 3,
        Digit4: 4,
        Digit5: 5,
        Digit6: 6,
        Digit7: 7,
        Digit8: 8,
        Digit9: 9,
      };

      let num = keyMap[e.code];
      if (!num && e.key >= '1' && e.key <= '9') {
        num = parseInt(e.key, 10);
      }

      if (num && num >= 1 && num <= 9) {
        e.preventDefault();
        handleButtonClick(num);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleButtonClick, retry]);

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[500px]">
      <div className="flex justify-between items-center w-full mb-1.5 sm:mb-2 text-xs sm:text-sm px-1">
        <span className="text-amber-400 font-bold">MEMORY MATRIX</span>
        <span className="text-emerald-400 font-bold">STAGE {stage}/{totalStages}</span>
      </div>

      <div className="relative bg-slate-950 p-2.5 sm:p-5 border-4 border-slate-700 shadow-2xl flex flex-col items-center w-full">
        <div className="text-[11px] sm:text-sm text-slate-400 mb-2 sm:mb-3 text-center font-bold">
          {isShowingPattern ? (
            <span className="text-cyan-400 animate-pulse">WATCH THE SEQUENCE...</span>
          ) : (
            <span className="text-emerald-400">YOUR TURN! REPEAT PATTERN</span>
          )}
        </div>

        {/* 3x3 Grid Buttons - Height-aware responsive sizing */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3.5 w-[min(70vw,240px,42vh)] h-[min(70vw,240px,42vh)] sm:w-72 sm:h-72">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            const isActive = activeButton === num;
            return (
              <button
                key={num}
                disabled={isShowingPattern || gameOver || won}
                onClick={() => handleButtonClick(num)}
                className={`w-full h-full aspect-square border-3 sm:border-4 flex items-center justify-center text-lg sm:text-2xl md:text-3xl font-bold transition-all cursor-pointer rounded ${
                  isActive
                    ? 'bg-yellow-400 text-black border-white scale-95 shadow-[0_0_20px_rgba(250,204,21,0.9)]'
                    : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-400 active:scale-95'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        <p className="text-[9px] sm:text-xs text-slate-400 mt-2 sm:mt-3 text-center">
          Press <span className="text-amber-300 font-bold">[1]–[9]</span> or <span className="text-cyan-400 font-bold">Numpad</span> to repeat
        </p>

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 z-20">
            <span className="text-emerald-400 text-base sm:text-lg mb-2 font-bold">PATTERN COMPLETE!</span>
            <span className="text-xs sm:text-sm text-slate-300">Granting Kana reward...</span>
          </div>
        )}

        {gameOver && !won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-red-500 p-4 z-20">
            <span className="text-red-400 text-base sm:text-lg mb-2 font-bold">WRONG SEQUENCE!</span>
            <button
              onClick={retry}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold border-2 border-white cursor-pointer active:translate-y-0.5"
            >
              RESTART FROM STAGE 1 [SPACE]
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        {Array.from({ length: totalStages }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 sm:w-5 sm:h-5 border ${
              i + 1 < stage || won
                ? 'bg-emerald-400 border-emerald-300'
                : i + 1 === stage
                ? 'bg-yellow-400 border-yellow-200 animate-pulse'
                : 'bg-slate-800 border-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
