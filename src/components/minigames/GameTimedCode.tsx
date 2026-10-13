import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sounds } from '../../utils/audio';

interface GameTimedCodeProps {
  onSuccess: () => void;
  onFailure?: () => void;
  codeLength?: number;
}

interface JapaneseDigitInfo {
  digit: string;
  kanji: string;
  romaji: string;
  kana: string;
}

const JAPANESE_DIGITS: Record<string, JapaneseDigitInfo> = {
  '0': { digit: '0', kanji: '〇', romaji: 'zero', kana: 'ぜろ' },
  '1': { digit: '1', kanji: '一', romaji: 'ichi', kana: 'いち' },
  '2': { digit: '2', kanji: '二', romaji: 'ni', kana: 'に' },
  '3': { digit: '3', kanji: '三', romaji: 'san', kana: 'さん' },
  '4': { digit: '4', kanji: '四', romaji: 'yon', kana: 'よん' },
  '5': { digit: '5', kanji: '五', romaji: 'go', kana: 'ご' },
  '6': { digit: '6', kanji: '六', romaji: 'roku', kana: 'ろく' },
  '7': { digit: '7', kanji: '七', romaji: 'nana', kana: 'なな' },
  '8': { digit: '8', kanji: '八', romaji: 'hachi', kana: 'はち' },
  '9': { digit: '9', kanji: '九', romaji: 'kyuu', kana: 'きゅう' },
};

const TOTAL_TIME = 20;

export const GameTimedCode: React.FC<GameTimedCodeProps> = ({ onSuccess, codeLength = 4 }) => {
  const [targetCode, setTargetCode] = useState<string>('');
  const [enteredCode, setEnteredCode] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(TOTAL_TIME);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [won, setWon] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);

  const generateCode = useCallback(() => {
    let res = '';
    for (let i = 0; i < codeLength; i++) {
      res += Math.floor(Math.random() * 10).toString();
    }
    return res;
  }, [codeLength]);

  const restart = useCallback(() => {
    const newCode = generateCode();
    setTargetCode(newCode);
    setEnteredCode('');
    setTimeLeft(TOTAL_TIME);
    setGameOver(false);
    setWon(false);
  }, [generateCode]);

  useEffect(() => {
    restart();
  }, [restart]);

  // Timer countdown
  useEffect(() => {
    if (gameOver || won) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setGameOver(true);
          sounds.playFail();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameOver, won]);

  const enterDigit = useCallback((d: string) => {
    if (gameOver || won) return;
    if (enteredCode.length >= codeLength) return;

    const info = JAPANESE_DIGITS[d];
    if (info) {
      sounds.speakJapanese(info.kana);
    } else {
      sounds.playBlip(480 + parseInt(d, 10) * 30);
    }

    const next = enteredCode + d;
    setEnteredCode(next);

    if (next.length === codeLength) {
      if (next === targetCode) {
        setWon(true);
        sounds.playSuccess();
        setTimeout(() => onSuccess(), 700);
      } else {
        sounds.playFail();
        setTimeout(() => {
          setEnteredCode('');
        }, 400);
      }
    }
  }, [gameOver, won, enteredCode, codeLength, targetCode, onSuccess]);

  const backspace = () => {
    if (gameOver || won) return;
    sounds.playBlip(300);
    setEnteredCode((c) => c.slice(0, -1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        enterDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enterDigit]);

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[460px]">
      <div className="flex justify-between items-center w-full mb-1 text-[11px] sm:text-xs px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-amber-400 font-bold">SECURITY KEYPAD</span>
          <span className="text-[9px] text-slate-400 font-mono hidden xs:inline">(KANJI NUMBERS)</span>
        </div>
        <span className={`font-bold ${timeLeft <= 4 ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
          TIME: {timeLeft}s
        </span>
      </div>

      {/* Timer Bar */}
      <div className="w-full bg-slate-800 h-2 mb-2 border border-slate-700">
        <div
          className={`h-full transition-all duration-1000 ${
            timeLeft <= 4 ? 'bg-red-500' : 'bg-emerald-400'
          }`}
          style={{ width: `${(timeLeft / TOTAL_TIME) * 100}%` }}
        />
      </div>

      <div className="relative bg-slate-950 p-2 sm:p-3.5 border-4 border-slate-700 shadow-2xl w-full flex flex-col items-center">
        {/* Target Code Box */}
        <div className="bg-slate-900 border-2 border-slate-800 p-1.5 sm:p-2.5 w-full text-center mb-2 shadow-inner">
          <div className="text-[9px] sm:text-xs text-amber-300 font-pixel mb-0.5 flex items-center justify-center gap-1">
            <span>TARGET CODE:</span>
            <span className="text-slate-400 text-[8px] sm:text-[9px] font-mono">(MATCH THE KANJI)</span>
          </div>
          <div className="flex justify-center items-center gap-1.5 sm:gap-2.5 my-0.5">
            {targetCode.split('').map((digit, idx) => {
              const info = JAPANESE_DIGITS[digit] || { digit, kanji: digit, romaji: digit };
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center bg-slate-950 px-1.5 sm:px-2.5 py-0.5 border border-emerald-500/60 min-w-[42px] sm:min-w-[50px] shadow-sm"
                >
                  <span className="text-xl sm:text-2xl text-emerald-400 font-bold font-kana filter drop-shadow">
                    {info.kanji}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-emerald-200/90 font-mono">
                    {info.romaji}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Entered Code Box */}
        <div className="bg-slate-900 border-2 border-slate-700 p-1.5 sm:p-2.5 w-full text-center mb-2 shadow-inner">
          <div className="text-[9px] sm:text-[10px] text-slate-400 mb-0.5 font-pixel">ENTERED:</div>
          <div className="flex justify-center items-center gap-1.5 sm:gap-2.5 h-10 sm:h-12">
            {Array.from({ length: codeLength }).map((_, idx) => {
              const char = enteredCode[idx];
              if (char) {
                const info = JAPANESE_DIGITS[char] || { digit: char, kanji: char, romaji: char };
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center bg-slate-950 px-1.5 sm:px-2.5 py-0.5 border border-yellow-400 min-w-[42px] sm:min-w-[50px] shadow-[0_0_10px_rgba(250,204,21,0.25)] animate-in zoom-in-75 duration-150"
                  >
                    <span className="text-xl sm:text-2xl text-yellow-300 font-bold font-kana">
                      {info.kanji}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-yellow-100 font-mono">
                      {info.romaji}
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={idx}
                  className="w-[42px] sm:w-[50px] h-9 sm:h-11 border-2 border-dashed border-slate-700 bg-slate-950/60 flex items-center justify-center text-slate-600 text-base font-mono"
                >
                  —
                </div>
              );
            })}
          </div>
        </div>

        {/* Numpad with Japanese Numbers */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full max-w-[300px] mb-0.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => {
            const info = JAPANESE_DIGITS[digit];
            return (
              <button
                key={digit}
                onClick={() => enterDigit(digit)}
                className="h-10 sm:h-12 bg-slate-900 hover:bg-slate-800 active:bg-indigo-900 text-slate-100 border-2 border-slate-700 hover:border-yellow-400 active:scale-95 flex flex-col items-center justify-center cursor-pointer rounded shadow transition-all group"
              >
                <span className="font-kana text-base sm:text-lg font-bold text-yellow-300 group-hover:text-yellow-200">
                  {info.kanji}
                </span>
                <span className="text-[8px] sm:text-[9px] text-slate-400 group-hover:text-white font-mono">
                  {info.romaji}
                </span>
              </button>
            );
          })}
          <button
            onClick={backspace}
            className="h-10 sm:h-12 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border-2 border-rose-700 active:scale-95 flex flex-col items-center justify-center cursor-pointer rounded shadow"
          >
            <span className="text-[10px] sm:text-xs font-bold">DEL</span>
            <span className="text-[7px] text-rose-400">削除</span>
          </button>
          <button
            onClick={() => enterDigit('0')}
            className="h-10 sm:h-12 bg-slate-900 hover:bg-slate-800 active:bg-indigo-900 text-slate-100 border-2 border-slate-700 hover:border-yellow-400 active:scale-95 flex flex-col items-center justify-center cursor-pointer rounded shadow transition-all group"
          >
            <span className="font-kana text-base sm:text-lg font-bold text-yellow-300 group-hover:text-yellow-200">
              〇
            </span>
            <span className="text-[8px] sm:text-[9px] text-slate-400 group-hover:text-white font-mono">
              zero
            </span>
          </button>
          <button
            onClick={() => setEnteredCode('')}
            className="h-10 sm:h-12 bg-slate-900 hover:bg-slate-800 text-slate-400 border-2 border-slate-700 active:scale-95 flex flex-col items-center justify-center cursor-pointer rounded shadow"
          >
            <span className="text-[10px] sm:text-xs font-bold">CLR</span>
            <span className="text-[7px] text-slate-500">クリア</span>
          </button>
        </div>

        {won && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in">
            <span className="text-emerald-400 text-sm sm:text-base mb-1 font-bold font-pixel animate-bounce">
              ★ CODE ACCEPTED! ★
            </span>
            <span className="text-xs text-slate-300">Dispensing Kana reward...</span>
          </div>
        )}

        {gameOver && !won && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center border-2 border-red-500 p-4 animate-in fade-in">
            <span className="text-red-400 text-sm sm:text-base mb-1 font-bold font-pixel">TIME EXPIRED!</span>
            <button
              onClick={restart}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold border-2 border-white cursor-pointer active:translate-y-0.5 shadow-lg mt-2"
            >
              TRY AGAIN
            </button>
          </div>
        )}
      </div>

      <p className="text-[9px] text-slate-400 mt-1 text-center">
        Keyboard (0-9) or Japanese Keypad Buttons
      </p>
    </div>
  );
};
