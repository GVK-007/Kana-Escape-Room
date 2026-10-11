import React, { useState, useRef } from 'react';
import { sounds } from '../../utils/audio';

interface GameCardMatchProps {
  onSuccess: () => void;
  onFailure?: () => void;
}

interface Card {
  id: number;
  kana: string;
  reading: string;
  romaji: string;
  color: string;
  flipped: boolean;
  matched: boolean;
}

const KANA_PAIRS = [
  { kana: '星', reading: 'ほし', romaji: 'Star (Hoshi)', color: 'bg-yellow-500' },
  { kana: '月', reading: 'つき', romaji: 'Moon (Tsuki)', color: 'bg-indigo-500' },
  { kana: '火', reading: 'ひ', romaji: 'Fire (Hi)', color: 'bg-rose-500' },
  { kana: '水', reading: 'みず', romaji: 'Water (Mizu)', color: 'bg-cyan-500' },
  { kana: '木', reading: 'き', romaji: 'Tree (Ki)', color: 'bg-emerald-500' },
  { kana: '金', reading: 'きん', romaji: 'Gold (Kin)', color: 'bg-amber-400' },
  { kana: '土', reading: 'つち', romaji: 'Earth (Tsuchi)', color: 'bg-stone-500' },
  { kana: '日', reading: 'ひ', romaji: 'Sun (Hi)', color: 'bg-red-500' },
];

export const GameCardMatch: React.FC<GameCardMatchProps> = ({ onSuccess }) => {
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  // Procedural generator guaranteeing matching pairs are NEVER adjacent to each other!
  function generateProceduralBoard(): Card[] {
    for (let attempt = 0; attempt < 500; attempt++) {
      const board: (Card | null)[] = Array(16).fill(null);
      const available = Array.from({ length: 16 }, (_, i) => i);

      // True Fisher-Yates position shuffle
      for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
      }

      let success = true;
      for (let pIdx = 0; pIdx < KANA_PAIRS.length; pIdx++) {
        const pair = KANA_PAIRS[pIdx];
        const pos1 = available.pop()!;

        const r1 = Math.floor(pos1 / 4);
        const c1 = pos1 % 4;

        // Disallow matching cards placed right next to each other
        const validCandidates = available.filter((p) => {
          const r2 = Math.floor(p / 4);
          const c2 = p % 4;
          return Math.abs(r1 - r2) + Math.abs(c1 - c2) > 1;
        });

        if (validCandidates.length === 0) {
          success = false;
          break;
        }

        const chosenPos2 = validCandidates[Math.floor(Math.random() * validCandidates.length)];
        const removeIdx = available.indexOf(chosenPos2);
        available.splice(removeIdx, 1);

        board[pos1] = { id: pIdx * 2, ...pair, flipped: false, matched: false };
        board[chosenPos2] = { id: pIdx * 2 + 1, ...pair, flipped: false, matched: false };
      }

      if (success && board.every((c) => c !== null)) {
        return board as Card[];
      }
    }

    // Fallback Fisher-Yates
    const deck: Card[] = [];
    KANA_PAIRS.forEach((item, idx) => {
      deck.push({ id: idx * 2, ...item, flipped: false, matched: false });
      deck.push({ id: idx * 2 + 1, ...item, flipped: false, matched: false });
    });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  const [cards, setCards] = useState<Card[]>(() => generateProceduralBoard());
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [matchesCount, setMatchesCount] = useState(0);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const handleCardClick = (index: number) => {
    if (won || selectedCards.length >= 2 || cards[index].flipped || cards[index].matched) {
      return;
    }

    sounds.playBlip(540);
    sounds.speakJapanese(cards[index].reading);
    const nextCards = cards.map((c, i) => (i === index ? { ...c, flipped: true } : c));
    setCards(nextCards);

    const nextSelected = [...selectedCards, index];
    setSelectedCards(nextSelected);

    if (nextSelected.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = nextSelected;
      const c1 = nextCards[firstIdx];
      const c2 = nextCards[secondIdx];

      if (c1.kana === c2.kana) {
        // Matched!
        sounds.playKanaObtained();
        const matchedCards = nextCards.map((c, i) =>
          i === firstIdx || i === secondIdx ? { ...c, matched: true } : c
        );
        setCards(matchedCards);
        setSelectedCards([]);
        const nextMatches = matchesCount + 1;
        setMatchesCount(nextMatches);

        if (nextMatches >= KANA_PAIRS.length) {
          setWon(true);
          sounds.playSuccess();
          setTimeout(() => onSuccessRef.current(), 750);
        }
      } else {
        // Mismatch - flip back
        sounds.playFail();
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === firstIdx || i === secondIdx ? { ...c, flipped: false } : c
            )
          );
          setSelectedCards([]);
        }, 700);
      }
    }
  };

  const restart = () => {
    setCards(generateProceduralBoard());
    setSelectedCards([]);
    setMatchesCount(0);
    setMoves(0);
    setWon(false);
  };

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[540px]">
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm">
        <span className="text-amber-400 font-bold">MOVES: {moves}</span>
        <span className="text-cyan-400 font-mono text-[10px] sm:text-xs">4×4 MATRIX</span>
        <span className="text-emerald-400 font-bold">PAIRS: {matchesCount}/{KANA_PAIRS.length}</span>
      </div>

      <div className="bg-slate-950 p-3 sm:p-5 border-4 border-slate-700 shadow-2xl relative w-full flex flex-col items-center">
        {/* 4x4 Grid of Cards */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full bg-slate-900 border border-slate-800 p-2 sm:p-3 rounded">
          {cards.map((card, idx) => {
            const isRevealed = card.flipped || card.matched;
            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(idx)}
                disabled={isRevealed || won}
                className={`h-20 sm:h-24 md:h-28 border-2 rounded flex flex-col items-center justify-center font-bold transition-all cursor-pointer ${
                  isRevealed
                    ? `${card.color} text-black border-white shadow-md scale-95`
                    : 'bg-indigo-950 hover:bg-indigo-900 border-indigo-700 active:scale-95'
                }`}
              >
                {isRevealed ? (
                  <>
                    <span className="font-kana text-2xl sm:text-3xl md:text-4xl font-bold leading-none">{card.kana}</span>
                    <span className="text-[10px] sm:text-xs font-mono leading-none mt-1.5">{card.romaji}</span>
                  </>
                ) : (
                  <span className="text-indigo-400 text-xl sm:text-2xl font-bold">?</span>
                )}
              </button>
            );
          })}
        </div>

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in z-10">
            <span className="text-emerald-400 text-base sm:text-lg mb-2 font-bold">★ 4×4 MATRIX SOLVED! ★</span>
            <span className="text-xs sm:text-sm text-slate-300 mb-4 text-center">All 8 Kanji pairs matched!</span>
            <button
              onClick={() => onSuccessRef.current()}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-bold border-2 border-white cursor-pointer shadow-lg"
            >
              CLAIM REWARD NOW
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center w-full mt-2 text-[10px] sm:text-xs text-slate-400">
        <span>Find matching Kanji pairs (16 cards total)</span>
        <button onClick={restart} className="text-slate-400 hover:text-white underline cursor-pointer">
          RESET
        </button>
      </div>
    </div>
  );
};
