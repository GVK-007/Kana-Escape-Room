import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { sounds } from '../../utils/audio';
import { CharacterId } from '../../types/game';
import { lookupJapaneseWord } from '../../data/dictionary';
import {
  getLeaderboard,
  saveLeaderboardEntry,
  fetchLeaderboardAsync,
  sortLeaderboard,
  LeaderboardEntry,
  formatTime,
  getPlayerTag,
  generatePlayerTag,
  getSavedPlayerName,
} from '../../utils/leaderboard';
import { LeaderboardView } from './LeaderboardView';

interface GameEndingModalProps {
  totalKana: number;
  playtimeSeconds: number;
  selectedCharacter: CharacterId;
  craftedWords?: string[];
  isImportedRun?: boolean;
  onPlayAgain: () => void;
  onTitleScreen: () => void;
}

export const GameEndingModal: React.FC<GameEndingModalProps> = ({
  totalKana,
  playtimeSeconds,
  selectedCharacter,
  craftedWords = [],
  isImportedRun = false,
  onPlayAgain,
  onTitleScreen,
}) => {
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>(() =>
    getLeaderboard()
  );
  const defaultSuggestedName = `Run #${leaderboardEntries.length + 1}`;
  const [playerName, setPlayerName] = useState(() => getSavedPlayerName() || '');
  const [playerTag, setPlayerTagState] = useState(() => getPlayerTag());
  const [submittedRunName, setSubmittedRunName] = useState('');
  const [submittedTag, setSubmittedTag] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [ranks, setRanks] = useState<{ time: number; artifacts: number } | null>(null);
  const [highlightId, setHighlightId] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'SUMMARY' | 'LEADERBOARD'>('SUMMARY');

  const inputRef = useRef<HTMLInputElement>(null);

  // Guarantee exit word 'でぐち' and any other unlocked words are represented
  const displayWords = Array.from(new Set([...craftedWords, 'でぐち']));

  useEffect(() => {
    sounds.playDoorUnlock();
    // Confetti fanfare
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const interval: number = window.setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() * 0.5 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchLeaderboardAsync().then((fresh) => {
      if (isMounted && fresh && fresh.length > 0) {
        setLeaderboardEntries(fresh);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Autofocus run name input
  useEffect(() => {
    if (!submitted && viewMode === 'SUMMARY') {
      setTimeout(() => inputRef.current?.select(), 150);
    }
  }, [submitted, viewMode]);

  const handleSubmitRun = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitted) return;

    const chosenName = playerName.trim() || defaultSuggestedName;
    const cleanTag = playerTag.trim().startsWith('#')
      ? playerTag.trim().slice(0, 7)
      : `#${playerTag.trim().slice(0, 6) || '1000'}`;

    const res = saveLeaderboardEntry({
      playerName: chosenName,
      playerTag: cleanTag,
      playtimeSeconds,
      totalKana,
      characterId: selectedCharacter,
      roomsCleared: 3,
      craftedWords: displayWords,
      isImported: isImportedRun,
      verified: !isImportedRun,
    });

    sounds.playKanaObtained();
    setSubmittedRunName(chosenName);
    setSubmittedTag(cleanTag);
    setSubmitted(true);
    setRanks({ time: res.timeRank, artifacts: res.artifactsRank });
    setHighlightId(res.entry.id);
    setLeaderboardEntries(res.allEntries);
    setViewMode('LEADERBOARD');

    // Confetti burst for placing on leaderboard
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Immediate background cloud sync to ensure rank and entries are global
    fetchLeaderboardAsync().then((fresh) => {
      if (fresh && fresh.length > 0) {
        setLeaderboardEntries(fresh);
        const timeSorted = sortLeaderboard(fresh, 'time');
        const artSorted = sortLeaderboard(fresh, 'artifacts');
        const newTimeRank = timeSorted.findIndex((r) => r.id === res.entry.id) + 1;
        const newArtRank = artSorted.findIndex((r) => r.id === res.entry.id) + 1;
        if (newTimeRank > 0 && newArtRank > 0) {
          setRanks({ time: newTimeRank, artifacts: newArtRank });
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-[#1a1733] border-4 border-yellow-400 pixel-box-gold p-4 sm:p-6 max-w-lg w-full shadow-2xl flex flex-col items-center text-center gap-3 sm:gap-4 animate-in fade-in zoom-in-95 duration-300 my-auto">
        {/* Header Title */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-pixel text-[10px] sm:text-xs text-yellow-300 tracking-widest animate-pulse">
            ★ ESCAPE ROOM CONQUERED! ★
          </span>
          <h1 className="font-pixel text-lg sm:text-xl text-yellow-400 tracking-wider">
            {viewMode === 'LEADERBOARD' ? 'RUNS LEADERBOARD' : 'ESCAPE COMPLETE!'}
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex w-full gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => {
              sounds.playSelect();
              setViewMode('SUMMARY');
            }}
            className={`flex-1 py-1.5 font-pixel text-[10px] border cursor-pointer transition-all ${
              viewMode === 'SUMMARY'
                ? 'bg-amber-950 border-amber-400 text-amber-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            RUN SUMMARY
          </button>
          <button
            onClick={() => {
              sounds.playSelect();
              setViewMode('LEADERBOARD');
            }}
            className={`flex-1 py-1.5 font-pixel text-[10px] border cursor-pointer transition-all ${
              viewMode === 'LEADERBOARD'
                ? 'bg-amber-950 border-amber-400 text-amber-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            LEADERBOARDS {submitted && ranks ? `(⚡#${ranks.time} • 🏺#${ranks.artifacts})` : `(${leaderboardEntries.length})`}
          </button>
        </div>

        {viewMode === 'SUMMARY' ? (
          <>
            {/* Master Word Card */}
            <div className="bg-slate-950 border-3 border-emerald-400 p-2.5 sm:p-3 w-full flex flex-col items-center gap-1 shadow-[0_0_20px_rgba(52,211,153,0.25)]">
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl">⛩️ 🚪</span>
                <span className="font-kana text-2xl sm:text-3xl font-bold text-yellow-300">でぐち</span>
                <span className="font-kana text-lg sm:text-xl text-slate-300">(出口)</span>
              </div>
              <span className="font-pixel text-[10px] sm:text-xs text-emerald-300 tracking-widest">
                DEGUCHI — EXIT
              </span>
            </div>

            {/* Imported / Unverified Run Notice */}
            {isImportedRun && (
              <div className="bg-amber-950/80 border-2 border-amber-500/80 p-2 sm:p-2.5 w-full flex flex-col items-center gap-1 text-center shadow">
                <div className="flex items-center gap-1.5 text-amber-300 font-pixel text-[10px] sm:text-xs">
                  <span>⚠️</span>
                  <span>RESTORED BACKUP — UNVERIFIED RUN</span>
                </div>
                <p className="text-[10px] text-amber-200/90 font-sans leading-tight max-w-sm">
                  This game was restored from a backup file. To protect competitive speedrun integrity, this run is saved locally as Unverified and excluded from global speedrun rankings.
                </p>
              </div>
            )}

            {/* Final Statistics */}
            <div className="bg-slate-900/90 border-2 border-slate-700 p-2.5 w-full grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="font-pixel text-[8px] text-slate-400">ROOMS</div>
                <div className="font-pixel text-xs sm:text-sm text-yellow-400 mt-0.5">3 / 3</div>
              </div>
              <div>
                <div className="font-pixel text-[8px] text-slate-400">KANA FOUND</div>
                <div className="font-pixel text-xs sm:text-sm text-cyan-400 mt-0.5">{totalKana}</div>
              </div>
              <div>
                <div className="font-pixel text-[8px] text-slate-400">ESCAPE TIME</div>
                <div className="font-pixel text-xs sm:text-sm text-emerald-400 mt-0.5">
                  {formatTime(playtimeSeconds)}
                </div>
              </div>
            </div>

            {/* Words Created List in Run Summary */}
            <div className="w-full bg-slate-950 border border-slate-800 p-2.5 flex flex-col gap-1.5 text-left">
              <div className="flex justify-between items-center px-1">
                <span className="font-pixel text-[10px] text-amber-300 tracking-wider">
                  WORDS CREATED THIS RUN ({displayWords.length})
                </span>
                <span className="font-pixel text-[8px] text-slate-500">
                  VOCABULARY
                </span>
              </div>

              <div className="max-h-28 sm:max-h-36 overflow-y-auto divide-y divide-slate-800/80 bg-slate-900/40 p-1 border border-slate-800/60">
                {displayWords.map((w, idx) => {
                  const info = lookupJapaneseWord(w);
                  return (
                    <div
                      key={`${w}-${idx}`}
                      className="py-1 px-1.5 flex items-center justify-between text-xs hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{info?.icon || '📝'}</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-kana font-bold text-yellow-300 text-sm">
                            {info?.word || w}
                          </span>
                          {info?.kanji && (
                            <span className="font-kana text-[10px] text-slate-400">
                              ({info.kanji})
                            </span>
                          )}
                          <span className="font-mono text-[9px] text-cyan-300">
                            [{info?.romaji || w}]
                          </span>
                          <span className="text-[10px] text-slate-300 font-sans ml-1">
                            • {info?.meaning || 'Word'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => sounds.speakJapanese(info?.word || w)}
                        title="Listen to Japanese pronunciation"
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-yellow-300 border border-slate-600 rounded text-[10px] cursor-pointer ml-2"
                      >
                        🔊
                      </button>
                      {w === 'でぐち' && (
                        <span className="font-pixel text-[7px] bg-emerald-950 text-emerald-300 border border-emerald-500 px-1 py-0.5 rounded-xs shrink-0">
                          EXIT
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Run Name & # Identification Tag Submission Card */}
            {!submitted ? (
              <form
                onSubmit={handleSubmitRun}
                className="bg-slate-950 border-2 border-amber-500/80 p-2.5 sm:p-3 w-full flex flex-col items-center gap-2 shadow-lg"
              >
                <div className="flex items-center gap-2 text-amber-400 font-pixel text-xs">
                  <span>{isImportedRun ? '⚠️' : '🏆'}</span>
                  <span>{isImportedRun ? 'SAVE AS UNVERIFIED LOCAL RUN' : 'ENTER PLAYER NAME & ID # TAG'}</span>
                  <span>{isImportedRun ? '⚠️' : '🏆'}</span>
                </div>

                <div className="w-full max-w-sm flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 w-full">
                    {/* Name Input */}
                    <div className="relative flex-1">
                      <input
                        ref={inputRef}
                        type="text"
                        maxLength={18}
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder={defaultSuggestedName}
                        className="w-full bg-slate-900 border-2 border-amber-400/80 px-2.5 py-1.5 font-pixel text-xs text-yellow-300 tracking-wide focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-slate-600"
                      />
                    </div>

                    {/* # Tag Input & Reroll Button */}
                    <div
                      className="flex items-center bg-slate-900 border-2 border-cyan-400/80 px-2 py-1 font-mono text-xs text-cyan-300 shrink-0"
                      title="Player identification tag (e.g. #1234) for event prizes"
                    >
                      <span className="text-cyan-500 select-none font-bold">#</span>
                      <input
                        type="text"
                        maxLength={5}
                        value={playerTag.replace(/^#/, '')}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5);
                          setPlayerTagState(`#${sanitized}`);
                        }}
                        className="w-12 bg-transparent text-cyan-300 font-mono text-xs font-bold focus:outline-none uppercase text-center"
                        placeholder="1000"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playSelect();
                          setPlayerTagState(generatePlayerTag());
                        }}
                        title="Reroll random 4-digit # tag"
                        className="text-xs hover:scale-125 transition-transform cursor-pointer ml-1 select-none"
                      >
                        🎲
                      </button>
                    </div>
                  </div>

                  {/* Identification notice / preview */}
                  <div className="flex justify-between items-center text-[8px] font-pixel px-0.5 text-slate-400">
                    <span className="truncate pr-1">
                      ID: <strong className="text-cyan-300 font-mono">{playerName.trim() || defaultSuggestedName}{playerTag.startsWith('#') ? playerTag : `#${playerTag}`}</strong>
                    </span>
                    <span className="text-amber-400/90 shrink-0">★ Verifies Event Prize Winners</span>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-pixel text-xs font-bold border-2 border-white cursor-pointer active:translate-y-0.5 shadow-md flex items-center justify-center gap-2"
                  >
                    <span>{isImportedRun ? 'RECORD LOCAL RUN ➔' : 'SUBMIT RECORD TO LEADERBOARD ➔'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-emerald-950/60 border-2 border-emerald-400 p-2.5 w-full flex flex-col items-center gap-1.5 shadow">
                <div className="flex items-center gap-1.5 font-pixel text-xs text-emerald-300 flex-wrap justify-center">
                  <span>✓ RUN RECORDED AS &quot;{submittedRunName}&quot;</span>
                  {submittedTag && (
                    <span className="font-mono text-cyan-300 bg-cyan-950 border border-cyan-500/60 px-1.5 py-0.5 rounded-xs font-bold">
                      {submittedTag}
                    </span>
                  )}
                  {isImportedRun ? <span className="text-amber-400 font-bold">(UNVERIFIED)</span> : null}
                </div>
                {ranks && (
                  <div className="flex gap-2 text-[10px] font-pixel">
                    <span className="text-yellow-300 bg-yellow-950/80 border border-yellow-500/50 px-2 py-0.5 rounded shadow-xs">
                      ⚡ SPEED: #{ranks.time}
                    </span>
                    <span className="text-amber-300 bg-amber-950/80 border border-amber-500/50 px-2 py-0.5 rounded shadow-xs">
                      🏺 ARTIFACTS: #{ranks.artifacts}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => {
                    sounds.playSelect();
                    setViewMode('LEADERBOARD');
                  }}
                  className="text-[10px] font-pixel text-yellow-400 underline hover:text-white cursor-pointer mt-0.5"
                >
                  VIEW LEADERBOARD TABLES ➔
                </button>
              </div>
            )}
          </>
        ) : (
          /* LEADERBOARD VIEW */
          <div className="w-full flex flex-col items-center gap-2">
            {submitted && ranks && (
              <div className="bg-yellow-950/80 border-2 border-yellow-400 px-3 py-1.5 w-full text-center font-pixel text-[11px] text-yellow-300 shadow flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4">
                <div className="flex items-center gap-1.5">
                  <span>🎉 &quot;{submittedRunName}&quot;</span>
                  {submittedTag && (
                    <span className="font-mono text-cyan-300 bg-cyan-950 border border-cyan-500/60 px-1 py-0.2 rounded-xs font-bold">
                      {submittedTag}
                    </span>
                  )}
                  <span>RECORDED!</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-yellow-200 font-bold">⚡ Speed: #{ranks.time}</span>
                  <span>•</span>
                  <span className="text-amber-200 font-bold">🏺 Artifacts: #{ranks.artifacts}</span>
                </div>
              </div>
            )}

            <LeaderboardView
              entries={leaderboardEntries}
              highlightId={highlightId}
              onRefresh={setLeaderboardEntries}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 sm:gap-4 w-full mt-1">
          <button
            onClick={() => {
              sounds.playSelect();
              onPlayAgain();
            }}
            className="flex-1 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-pixel text-xs border-2 border-white cursor-pointer active:translate-y-0.5 shadow-lg"
          >
            PLAY AGAIN
          </button>
          <button
            onClick={() => {
              sounds.playSelect();
              onTitleScreen();
            }}
            className="flex-1 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-pixel text-xs border-2 border-slate-500 cursor-pointer active:translate-y-0.5"
          >
            TITLE SCREEN
          </button>
        </div>
      </div>
    </div>
  );
};
