import React, { useState, useRef } from 'react';
import { sounds } from '../../utils/audio';

interface GameTicTacToeProps {
  onSuccess: () => void;
  onFailure?: () => void;
}

type Cell = 'X' | 'O' | null;

export const GameTicTacToe: React.FC<GameTicTacToeProps> = ({ onSuccess }) => {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [gameCount, setGameCount] = useState(1);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [status, setStatus] = useState<string>('Align 3 in a row to win!');
  const [won, setWon] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const gameCountRef = useRef(1);

  const checkWinner = (b: Cell[]): 'X' | 'O' | 'draw' | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [x, y, z] of lines) {
      if (b[x] && b[x] === b[y] && b[x] === b[z]) {
        return b[x];
      }
    }
    if (b.every((c) => c !== null)) return 'draw';
    return null;
  };

  const minimax = (b: Cell[], isMaximizing: boolean, depth = 0): { score: number; index: number } => {
    const winner = checkWinner(b);
    if (winner === 'O') return { score: 10 - depth, index: -1 };
    if (winner === 'X') return { score: -10 + depth, index: -1 };
    if (winner === 'draw') return { score: 0, index: -1 };

    const available: number[] = [];
    for (let i = 0; i < 9; i++) {
      if (!b[i]) available.push(i);
    }

    if (isMaximizing) {
      let bestScore = -Infinity;
      let bestMove = available[0] ?? -1;
      for (const idx of available) {
        b[idx] = 'O';
        const res = minimax(b, false, depth + 1);
        b[idx] = null;
        if (res.score > bestScore) {
          bestScore = res.score;
          bestMove = idx;
        }
      }
      return { score: bestScore, index: bestMove };
    } else {
      let bestScore = Infinity;
      let bestMove = available[0] ?? -1;
      for (const idx of available) {
        b[idx] = 'X';
        const res = minimax(b, true, depth + 1);
        b[idx] = null;
        if (res.score < bestScore) {
          bestScore = res.score;
          bestMove = idx;
        }
      }
      return { score: bestScore, index: bestMove };
    }
  };

  const aiMove = (currentBoard: Cell[]) => {
    const currentGame = gameCountRef.current;
    const available: number[] = [];
    for (let i = 0; i < 9; i++) {
      if (!currentBoard[i]) available.push(i);
    }
    if (available.length === 0) return;

    let moveIndex = -1;

    // Follow perfect minimax strategy for first 3 games; games 4+ start making occasional mistakes
    const shouldMakeMistake = currentGame > 3 && Math.random() < 0.65;

    if (!shouldMakeMistake) {
      moveIndex = minimax(currentBoard, true).index;
    } else {
      moveIndex = available[Math.floor(Math.random() * available.length)];
    }

    if (moveIndex === -1) {
      moveIndex = available[0];
    }

    if (moveIndex !== -1) {
      const next = [...currentBoard];
      next[moveIndex] = 'O';
      setBoard(next);
      sounds.playBlip(380);

      const win = checkWinner(next);
      if (win === 'O') {
        setStatus('AI got 3 in a row! Rematching...');
        sounds.playFail();
        setTimeout(handleRematch, 450);
      } else if (win === 'draw') {
        sounds.playBlip(300);
        setStatus('STALEMATE! Rematching...');
        setTimeout(handleRematch, 450);
      } else {
        setIsPlayerTurn(true);
        setStatus('Your Turn (X)');
      }
    }
  };

  const handleCellClick = (index: number) => {
    if (!isPlayerTurn || board[index] || won) return;

    const next = [...board];
    next[index] = 'X';
    setBoard(next);
    sounds.playBlip(560);
    setIsPlayerTurn(false);

    const win = checkWinner(next);
    if (win === 'X') {
      setWon(true);
      setStatus('★ 3 IN A ROW! VICTORY! ★');
      sounds.playSuccess();
      setTimeout(() => onSuccessRef.current(), 750);
    } else if (win === 'draw') {
      sounds.playBlip(300);
      setStatus('STALEMATE! Rematching...');
      setTimeout(handleRematch, 450);
    } else {
      setStatus('AI is thinking...');
      setTimeout(() => {
        aiMove(next);
      }, 250);
    }
  };

  const handleRematch = () => {
    const nextGame = gameCountRef.current + 1;
    gameCountRef.current = nextGame;
    setGameCount(nextGame);
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setStatus('Align 3 in a row to win!');
  };

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[500px]">
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm">
        <span className="text-cyan-400 font-bold">TIC-TAC-TOE</span>
        <span className="text-amber-300 text-[10px] sm:text-xs font-mono bg-amber-950/80 px-2 py-0.5 border border-amber-500">
          VS AI
        </span>
        <span className="text-yellow-400 text-[10px] sm:text-xs">3-IN-A-ROW</span>
      </div>

      <div className="relative bg-slate-950 p-4 sm:p-6 border-4 border-slate-700 shadow-2xl flex flex-col items-center w-full">
        <div className="text-xs sm:text-sm text-yellow-300 mb-4 h-5 text-center font-bold tracking-wider">
          {status}
        </div>

        <div className="grid grid-cols-3 gap-3 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96">
          {board.map((cell, idx) => (
            <button
              key={idx}
              onClick={() => handleCellClick(idx)}
              disabled={!isPlayerTurn || cell !== null || won}
              className={`w-full h-full aspect-square border-2 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-bold cursor-pointer transition-all rounded ${
                cell === 'X'
                  ? 'bg-blue-950 border-blue-400 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                  : cell === 'O'
                  ? 'bg-rose-950 border-rose-400 text-rose-300 shadow-[0_0_12px_rgba(239,68,68,0.6)]'
                  : 'bg-slate-900 border-slate-700 hover:border-slate-500'
              }`}
            >
              {cell}
            </button>
          ))}
        </div>

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in z-20">
            <span className="text-emerald-400 text-sm sm:text-base mb-2 font-bold">★ 3 IN A ROW ACHIEVED! ★</span>
            <span className="text-xs sm:text-sm text-slate-300 mb-4 text-center">
              Decisive victory attained!
            </span>
            <button
              onClick={() => onSuccessRef.current()}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-bold border-2 border-white cursor-pointer shadow-lg"
            >
              CLAIM REWARD NOW
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400 mt-3 text-center">
        Draws rematch instantly. Win a round against the AI to unlock!
      </p>
    </div>
  );
};
