import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../../utils/audio';

interface GameRockPaperScissorsProps {
  onSuccess: () => void;
  onFailure?: () => void;
  targetWins?: number;
}

type Choice = 'ROCK' | 'PAPER' | 'SCISSORS';

// Retro Pixel Art Icons (Zero emojis used)
const PixelFist: React.FC<{ color?: string }> = ({ color = '#38bdf8' }) => (
  <svg width="28" height="28" viewBox="0 0 16 16" fill="none" className="pixelated">
    <rect x="3" y="5" width="10" height="8" fill={color} />
    <rect x="2" y="7" width="2" height="5" fill="#facc15" />
    <rect x="4" y="3" width="8" height="3" fill="#e0f2fe" />
    <rect x="5" y="7" width="2" height="4" fill="#0f172a" />
    <rect x="8" y="7" width="2" height="4" fill="#0f172a" />
    <rect x="11" y="7" width="1" height="4" fill="#0f172a" />
    <rect x="3" y="12" width="10" height="2" fill="#1e293b" />
  </svg>
);

const PixelPalm: React.FC<{ color?: string; flip?: boolean }> = ({ color = '#facc15', flip = false }) => (
  <svg
    width="32"
    height="16"
    viewBox="0 0 18 10"
    fill="none"
    className={`pixelated ${flip ? 'scale-x-[-1]' : ''}`}
  >
    <rect x="2" y="4" width="14" height="4" fill={color} />
    <rect x="4" y="2" width="10" height="2" fill="#fef08a" />
    <rect x="1" y="5" width="2" height="4" fill="#eab308" />
    <rect x="3" y="7" width="12" height="2" fill="#ca8a04" />
  </svg>
);

const PixelSpark: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 16 16" fill="none" className="pixelated animate-ping">
    <rect x="7" y="1" width="2" height="14" fill="#fef08a" />
    <rect x="1" y="7" width="14" height="2" fill="#fef08a" />
    <rect x="4" y="4" width="2" height="2" fill="#f59e0b" />
    <rect x="10" y="4" width="2" height="2" fill="#f59e0b" />
    <rect x="4" y="10" width="2" height="2" fill="#f59e0b" />
    <rect x="10" y="10" width="2" height="2" fill="#f59e0b" />
  </svg>
);

const PixelGuardianFace: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 16 16" fill="none" className="pixelated">
    <rect x="2" y="2" width="12" height="12" fill="#334155" />
    <rect x="3" y="3" width="10" height="10" fill="#1e293b" />
    <rect x="1" y="6" width="2" height="4" fill="#94a3b8" />
    <rect x="13" y="6" width="2" height="4" fill="#94a3b8" />
    <rect x="4" y="6" width="8" height="2" fill="#ef4444" className="animate-pulse" />
    <rect x="5" y="10" width="6" height="2" fill="#64748b" />
  </svg>
);

const CHOICES: { id: Choice; name: string; label: string; beats: Choice; renderIcon: () => React.ReactNode }[] = [
  {
    id: 'ROCK',
    name: 'ROCK (グー)',
    label: 'GUU',
    beats: 'SCISSORS',
    renderIcon: () => (
      <svg width="24" height="24" viewBox="0 0 16 16" fill="none" className="pixelated">
        <rect x="3" y="4" width="10" height="9" fill="#94a3b8" />
        <rect x="4" y="3" width="8" height="2" fill="#cbd5e1" />
        <rect x="5" y="7" width="2" height="4" fill="#334155" />
        <rect x="8" y="7" width="2" height="4" fill="#334155" />
        <rect x="11" y="7" width="1" height="4" fill="#334155" />
        <rect x="3" y="12" width="10" height="2" fill="#1e293b" />
      </svg>
    ),
  },
  {
    id: 'PAPER',
    name: 'PAPER (パー)',
    label: 'PAA',
    beats: 'ROCK',
    renderIcon: () => (
      <svg width="24" height="24" viewBox="0 0 16 16" fill="none" className="pixelated">
        <rect x="4" y="6" width="8" height="7" fill="#facc15" />
        <rect x="3" y="2" width="2" height="5" fill="#fde047" />
        <rect x="6" y="1" width="2" height="6" fill="#fde047" />
        <rect x="9" y="1" width="2" height="6" fill="#fde047" />
        <rect x="12" y="3" width="2" height="5" fill="#fde047" />
        <rect x="1" y="7" width="3" height="3" fill="#ca8a04" />
      </svg>
    ),
  },
  {
    id: 'SCISSORS',
    name: 'SCISSORS (チョキ)',
    label: 'CHOKI',
    beats: 'PAPER',
    renderIcon: () => (
      <svg width="24" height="24" viewBox="0 0 16 16" fill="none" className="pixelated">
        <rect x="4" y="7" width="8" height="6" fill="#f43f5e" />
        <rect x="5" y="1" width="2" height="7" fill="#fda4af" />
        <rect x="9" y="1" width="2" height="7" fill="#fda4af" />
        <rect x="2" y="8" width="3" height="3" fill="#9f1239" />
        <rect x="11" y="9" width="3" height="4" fill="#9f1239" />
      </svg>
    ),
  },
];

export const GameRockPaperScissors: React.FC<GameRockPaperScissorsProps> = ({
  onSuccess,
  targetWins = 2,
}) => {
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [roundState, setRoundState] = useState<'IDLE' | 'PUMPING' | 'MORPHING' | 'RESOLVED'>('IDLE');
  const [pumpBeat, setPumpBeat] = useState(0);
  const [timeLeft, setTimeLeft] = useState(2.8);
  const [pendingChoice, setPendingChoice] = useState<Choice | null>(null);
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [aiChoice, setAiChoice] = useState<Choice | null>(null);
  const [roundResult, setRoundResult] = useState<string>('Press START to begin Janken!');
  const [won, setWon] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const targetWinsRef = useRef(targetWins);
  targetWinsRef.current = targetWins;

  const pendingChoiceRef = useRef<Choice | null>(null);
  pendingChoiceRef.current = pendingChoice;

  const roundTimerRef = useRef<number | null>(null);
  const beatTimerRef = useRef<number | null>(null);

  // Start the Janken countdown
  const startRound = () => {
    if (roundState === 'PUMPING' || roundState === 'MORPHING' || won) return;

    sounds.playSelect();
    setRoundState('PUMPING');
    setPendingChoice(null);
    setPlayerChoice(null);
    setAiChoice(null);
    setTimeLeft(2.8);
    setPumpBeat(0);
    setRoundResult('JAN... KEN... Select your move!');

    let currentBeat = 0;
    sounds.playBlip(480);
    sounds.speakJapanese('じゃんけん');

    if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    beatTimerRef.current = window.setInterval(() => {
      currentBeat = (currentBeat + 1) % 3;
      setPumpBeat(currentBeat);
      sounds.playBlip(currentBeat === 1 ? 620 : 480);
    }, 450);

    const startTime = Date.now();
    const duration = 2800;

    if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    roundTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (duration - elapsed) / 1000);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (roundTimerRef.current) clearInterval(roundTimerRef.current);
        if (beatTimerRef.current) clearInterval(beatTimerRef.current);
        finishRoundOnExpiry();
      }
    }, 50);
  };

  // Called when timer hits 0: locks whatever the user selected!
  const finishRoundOnExpiry = () => {
    const chosen = pendingChoiceRef.current;
    if (!chosen) {
      // User picked nothing in time
      sounds.playFail();
      const randomIdx = Math.floor(Math.random() * CHOICES.length);
      setAiChoice(CHOICES[randomIdx].id);
      setPlayerChoice(null);
      setRoundState('RESOLVED');
      setRoundResult('TIME OUT! No move selected in time!');
      setAiScore((s) => s + 1);
      return;
    }

    // Morphing transition before final reveal!
    sounds.playSelect();
    sounds.speakJapanese('ぽん');
    setRoundState('MORPHING');

    const randomIdx = Math.floor(Math.random() * CHOICES.length);
    const ai = CHOICES[randomIdx].id;

    setTimeout(() => {
      setPlayerChoice(chosen);
      setAiChoice(ai);
      setRoundState('RESOLVED');

      if (chosen === ai) {
        sounds.playBlip(440);
        sounds.speakJapanese('あいこでしょ');
        setRoundResult('DRAW (AIKO DESHO)! Press NEXT ROUND!');
      } else {
        const playerObj = CHOICES.find((c) => c.id === chosen)!;
        if (playerObj.beats === ai) {
          sounds.playSuccess();
          const nextScore = playerScore + 1;
          setPlayerScore(nextScore);
          setRoundResult('VICTORY THIS ROUND!');

          if (nextScore >= targetWinsRef.current) {
            setWon(true);
            setTimeout(() => onSuccessRef.current(), 750);
          }
        } else {
          sounds.playFail();
          setAiScore((s) => s + 1);
          setRoundResult('AI GUARDIAN WINS ROUND!');
        }
      }
    }, 400); // 400ms morph animation
  };

  // Allows user to freely select and change their move as many times as they want while timer runs!
  const handleSelectChoice = (choice: Choice) => {
    if (roundState !== 'PUMPING' || won) return;
    sounds.playBlip(540);
    const speechMap: Record<Choice, string> = {
      ROCK: 'グー',
      PAPER: 'パー',
      SCISSORS: 'チョキ',
    };
    sounds.speakJapanese(speechMap[choice]);
    setPendingChoice(choice);
    setRoundResult(`SELECTED: ${choice}! You can still change it before 0s!`);
  };

  useEffect(() => {
    return () => {
      if (roundTimerRef.current) clearInterval(roundTimerRef.current);
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (roundState === 'IDLE' || roundState === 'RESOLVED') {
        if (['Space', 'Enter'].includes(e.code)) {
          e.preventDefault();
          startRound();
        }
      } else if (roundState === 'PUMPING') {
        if (e.code === 'Digit1') handleSelectChoice('ROCK');
        if (['Digit2', 'KeyP'].includes(e.code)) handleSelectChoice('PAPER');
        if (['Digit3', 'KeyS'].includes(e.code)) handleSelectChoice('SCISSORS');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const restartAll = () => {
    setPlayerScore(0);
    setAiScore(0);
    setRoundState('IDLE');
    setPendingChoice(null);
    setPlayerChoice(null);
    setAiChoice(null);
    setRoundResult('Press START to begin Janken!');
    setWon(false);
  };

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[560px]">
      {/* Header */}
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm">
        <span className="text-cyan-400 font-bold">YOU: {playerScore}/{targetWins}</span>
        <span className="text-amber-400 text-[10px] sm:text-xs tracking-widest font-mono">JANKEN RITUAL</span>
        <span className="text-rose-400 font-bold">AI: {aiScore}/{targetWins}</span>
      </div>

      <div className="bg-slate-950 p-4 sm:p-6 border-4 border-slate-700 shadow-2xl w-full flex flex-col items-center relative">
        {/* Countdown Bar */}
        <div className="w-full bg-slate-900 border border-slate-700 h-2.5 mb-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ${
              timeLeft < 1.0 ? 'bg-red-500 animate-pulse' : 'bg-cyan-400'
            }`}
            style={{ width: `${Math.max(0, (timeLeft / 2.8) * 100)}%` }}
          />
        </div>

        {/* Dual Arena: AI (opposite) and Player */}
        <div className="flex justify-around items-center w-full bg-slate-900/90 border-2 border-slate-800 p-4 sm:p-6 mb-4 relative overflow-hidden rounded">
          {/* PLAYER (Left) */}
          <div className="flex flex-col items-center gap-1.5 z-10">
            <span className="text-xs sm:text-sm text-cyan-300 font-bold">PLAYER</span>

            <div
              className={`relative w-28 h-28 sm:w-36 sm:h-36 bg-slate-850 border-2 border-cyan-500 flex flex-col items-center justify-center shadow transition-all duration-200 rounded ${
                roundState === 'MORPHING' ? 'scale-75 rotate-180 animate-spin opacity-80' : ''
              }`}
            >
              <div className="scale-125 sm:scale-150 origin-center flex flex-col items-center justify-center">
                {roundState === 'PUMPING' ? (
                  <div className="flex flex-col items-center justify-center relative">
                    {/* Striking Fist */}
                    <div
                      className={`transition-transform duration-100 ${
                        pumpBeat === 1 ? 'translate-y-3 scale-110' : '-translate-y-1'
                      }`}
                    >
                      <PixelFist color="#38bdf8" />
                    </div>
                    {/* Palm */}
                    <div className="mt-1">
                      <PixelPalm color="#facc15" />
                    </div>
                    {/* Spark */}
                    {pumpBeat === 1 && (
                      <div className="absolute top-4">
                        <PixelSpark />
                      </div>
                    )}
                    {/* Selected move preview watermark badge */}
                    {pendingChoice && (
                      <div className="absolute -bottom-2 text-[8px] bg-cyan-950/90 text-cyan-300 px-1 border border-cyan-500 whitespace-nowrap">
                        {pendingChoice}
                      </div>
                    )}
                  </div>
                ) : roundState === 'MORPHING' ? (
                  <div className="animate-spin text-cyan-400 text-lg">✦</div>
                ) : playerChoice ? (
                  CHOICES.find((c) => c.id === playerChoice)?.renderIcon()
                ) : (
                  <PixelFist color="#64748b" />
                )}
              </div>
            </div>
          </div>

          {/* Center Rhythm / Beat */}
          <div className="flex flex-col items-center min-w-[70px]">
            {roundState === 'PUMPING' ? (
              <div className="flex flex-col items-center animate-bounce">
                <span className="text-amber-400 font-bold text-sm sm:text-base tracking-wider">
                  {pumpBeat === 0 ? 'JAN!' : pumpBeat === 1 ? 'KEN!' : 'PON!'}
                </span>
                <span className="text-rose-400 font-mono text-base sm:text-lg font-bold">
                  {timeLeft.toFixed(1)}s
                </span>
              </div>
            ) : roundState === 'MORPHING' ? (
              <span className="text-yellow-400 font-mono text-sm sm:text-base animate-ping font-bold">PON!</span>
            ) : (
              <span className="font-bold text-sm sm:text-base text-yellow-400 tracking-widest">VS</span>
            )}
          </div>

          {/* AI GUARDIAN (Right / Opposite) */}
          <div className="flex flex-col items-center gap-1.5 z-10">
            <span className="text-xs sm:text-sm text-rose-300 font-bold">GUARDIAN</span>

            <div
              className={`relative w-28 h-28 sm:w-36 sm:h-36 bg-slate-850 border-2 border-rose-500 flex flex-col items-center justify-center shadow transition-all duration-200 rounded ${
                roundState === 'MORPHING' ? 'scale-75 -rotate-180 animate-spin opacity-80' : ''
              }`}
            >
              <div className="scale-125 sm:scale-150 origin-center flex flex-col items-center justify-center">
                {roundState === 'PUMPING' ? (
                  <div className="flex flex-col items-center justify-center relative">
                    <div
                      className={`transition-transform duration-100 ${
                        pumpBeat === 1 ? 'translate-y-3 scale-110' : '-translate-y-1'
                      }`}
                    >
                      <PixelFist color="#ef4444" />
                    </div>
                    <div className="mt-1">
                      <PixelPalm color="#fca5a5" flip />
                    </div>
                    {pumpBeat === 1 && (
                      <div className="absolute top-4">
                        <PixelSpark />
                      </div>
                    )}
                  </div>
                ) : roundState === 'MORPHING' ? (
                  <div className="animate-spin text-rose-400 text-lg">✦</div>
                ) : aiChoice ? (
                  CHOICES.find((c) => c.id === aiChoice)?.renderIcon()
                ) : (
                  <PixelGuardianFace />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Round Feedback Status - flexible height prevents button collision */}
        <div className="text-xs sm:text-sm text-yellow-300 font-bold mb-2 sm:mb-3 text-center min-h-[30px] flex items-center justify-center tracking-wider px-2">
          {roundResult}
        </div>

        {/* START / NEXT BUTTON */}
        {roundState !== 'PUMPING' && roundState !== 'MORPHING' && !won && aiScore < targetWins && (
          <button
            onClick={startRound}
            className="mb-4 px-8 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-pixel text-xs sm:text-sm font-bold border-2 border-white cursor-pointer active:translate-y-0.5 shadow-md animate-pulse rounded"
          >
            {roundState === 'IDLE' ? '▶ START JANKEN [SPACE]' : '▶ NEXT ROUND [SPACE]'}
          </button>
        )}

        {/* Action Choice Buttons - Keep enabled & allow freely changing selection until timer runs out! */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
          {CHOICES.map((c) => {
            const isClickable = roundState === 'PUMPING';
            const isSelected = pendingChoice === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectChoice(c.id)}
                disabled={!isClickable}
                className={`py-3 sm:py-4 px-2 flex flex-col items-center justify-center border-2 transition-all rounded ${
                  isClickable
                    ? isSelected
                      ? 'bg-amber-500 scale-105 border-white ring-2 ring-cyan-400 text-black cursor-pointer shadow-xl'
                      : 'bg-amber-950/80 hover:bg-amber-900 border-amber-600 text-amber-200 cursor-pointer'
                    : 'bg-slate-800/60 border-slate-700 text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="mb-1.5 scale-110 sm:scale-125">{c.renderIcon()}</div>
                <span className="text-xs sm:text-sm font-bold tracking-wider">{c.label}</span>
                {isSelected && isClickable && (
                  <span className="text-[8px] sm:text-[10px] text-cyan-300 mt-1 font-bold">LOCKED IN</span>
                )}
              </button>
            );
          })}
        </div>

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in z-20">
            <span className="text-emerald-400 text-base sm:text-lg mb-2 font-bold">★ JANKEN MASTER! ★</span>
            <span className="text-xs sm:text-sm text-slate-300 mb-4 text-center">Defeated the guardian machine!</span>
            <button
              onClick={() => onSuccessRef.current()}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-bold border-2 border-white cursor-pointer shadow-lg"
            >
              CLAIM REWARD NOW
            </button>
          </div>
        )}

        {aiScore >= targetWins && !won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-red-500 p-4 z-20">
            <span className="text-red-400 text-sm sm:text-base mb-3 font-bold">AI GUARDIAN WON MATCH</span>
            <button
              onClick={restartAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold border-2 border-white cursor-pointer"
            >
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] sm:text-xs text-slate-400 mt-3 text-center">
        Select a move and freely change it until 0s • Watch the morphing reveal!
      </p>
    </div>
  );
};
