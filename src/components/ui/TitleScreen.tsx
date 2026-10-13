import React, { useState, useEffect, useRef } from 'react';
import { CharacterId, GameSaveState } from '../../types/game';
import { CHARACTERS } from '../../data/characters';
import { getCharacterSprite } from '../../utils/pixelArt';
import { sounds } from '../../utils/audio';
import { LeaderboardModal } from './LeaderboardModal';
import { SaveTransferModal } from './SaveTransferModal';
import { HowToPlayModal } from './HowToPlayModal';

interface TitleScreenProps {
  hasSaveData: boolean;
  selectedCharacter: CharacterId;
  onSelectCharacter: (charId: CharacterId) => void;
  onStartNewGame: () => void;
  onContinueGame: () => void;
  onResetSave: () => void;
  onSaveImported?: (data: GameSaveState) => void;
  volumeEnabled: boolean;
  onToggleVolume: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSaveData,
  selectedCharacter,
  onSelectCharacter,
  onStartNewGame,
  onContinueGame,
  onResetSave,
  onSaveImported,
  volumeEnabled,
  onToggleVolume,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmNewGame, setShowConfirmNewGame] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSaveTransfer, setShowSaveTransfer] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [animFrame, setAnimFrame] = useState(0);

  // Animate character preview idle
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimFrame((f) => (f + 1) % 4);
    }, 280);
    return () => clearInterval(timer);
  }, []);

  const currentChar = CHARACTERS.find((c) => c.id === selectedCharacter) || CHARACTERS[0];

  return (
    <div className="fixed inset-0 z-40 bg-[#0c0b18] wagara-ichimatsu bg-opacity-90 flex flex-col items-center justify-between p-6 select-none overflow-y-auto">
      {/* Top Header / Sound Toggle */}
      <div className="w-full max-w-3xl flex justify-between items-center text-xs font-pixel text-slate-400">
        <span className="text-[10px] text-amber-500/80">PIXEL-ART ADVENTURE</span>
        <button
          onClick={onToggleVolume}
          className="px-2.5 py-1 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 cursor-pointer text-[10px]"
        >
          SOUND: {volumeEnabled ? 'ON 🔊' : 'OFF 🔇'}
        </button>
      </div>

      {/* Main Title Banner */}
      <div className="flex flex-col items-center text-center my-auto py-4">
        <div className="font-kana text-lg sm:text-xl text-yellow-300 tracking-widest mb-1 opacity-90">
          かな 脱出ルーム
        </div>
        <h1 className="font-pixel text-2xl sm:text-4xl text-yellow-400 tracking-wider filter drop-shadow-[0_4px_12px_rgba(250,204,21,0.4)] mb-2">
          KANA ESCAPE ROOM
        </h1>
        <p className="font-pixel text-[10px] sm:text-xs text-cyan-300 tracking-wide mb-6">
          Collect Kana • Craft Words • Escape
        </p>

        {/* Character Selection Box */}
        <div className="bg-[#17162b] border-4 border-[#3c3a64] pixel-box p-5 max-w-lg w-full mb-6 flex flex-col items-center shadow-2xl">
          <span className="font-pixel text-[10px] text-yellow-400 mb-3 tracking-wider">
            CHOOSE YOUR CHARACTER
          </span>

          <div className="grid grid-cols-2 sm:flex sm:justify-center gap-2 sm:gap-4 mb-4">
            {CHARACTERS.map((char) => {
              const isSelected = char.id === selectedCharacter;
              return (
                <button
                  key={char.id}
                  onClick={() => {
                    sounds.playSelect();
                    onSelectCharacter(char.id);
                  }}
                  className={`w-20 sm:w-24 p-2 border-3 flex flex-col items-center cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)] scale-105'
                      : 'bg-slate-900/90 border-slate-700 hover:border-slate-500 opacity-75 hover:opacity-100'
                  }`}
                >
                  <CharacterPreviewCanvas charId={char.id} frame={animFrame} />
                  <span className="font-pixel text-[10px] text-white mt-2">
                    {char.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-center max-w-sm">
            <span className="font-pixel text-xs text-emerald-400 block mb-1">
              {currentChar.name} — {currentChar.title}
            </span>
            <span className="text-xs text-slate-300 font-sans leading-relaxed">
              {currentChar.description}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-64">
          {hasSaveData && (
            <button
              onClick={() => {
                sounds.playSelect();
                onContinueGame();
              }}
              className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-pixel text-xs border-2 border-white cursor-pointer active:translate-y-0.5 shadow-lg"
            >
              CONTINUE GAME
            </button>
          )}

          <button
            onClick={() => {
              sounds.playSelect();
              setShowHowToPlay(true);
            }}
            className="py-2.5 bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 font-pixel text-xs border-2 border-cyan-400/80 cursor-pointer active:translate-y-0.5 shadow-md flex items-center justify-center gap-2"
          >
            <span>📜</span>
            <span>HOW TO PLAY</span>
          </button>

          <button
            onClick={() => {
              sounds.playSelect();
              if (hasSaveData) {
                setShowConfirmNewGame(true);
              } else {
                onStartNewGame();
              }
            }}
            className="py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-pixel text-xs border-2 border-white cursor-pointer active:translate-y-0.5 shadow-lg font-bold"
          >
            NEW GAME
          </button>

          <button
            onClick={() => {
              sounds.playSelect();
              setShowLeaderboard(true);
            }}
            className="py-2.5 bg-indigo-950/80 hover:bg-indigo-900 text-amber-300 font-pixel text-xs border-2 border-amber-500/70 cursor-pointer active:translate-y-0.5 flex items-center justify-center gap-2 shadow-sm"
          >
            <span>🏆</span>
            <span>HALL OF FAME</span>
          </button>

          <button
            onClick={() => {
              sounds.playSelect();
              setShowSaveTransfer(true);
            }}
            className="py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-pixel text-[10px] border border-cyan-700/80 cursor-pointer active:translate-y-0.5 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>💾</span>
            <span>BACKUP & RESTORE SAVE</span>
          </button>

          {hasSaveData && (
            <button
              onClick={() => {
                sounds.playSelect();
                setShowConfirmReset(true);
              }}
              className="py-1 text-rose-400 hover:text-rose-300 text-[10px] font-pixel cursor-pointer underline"
            >
              RESET SAVED PROGRESS
            </button>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-[10px] font-pixel text-slate-500 text-center leading-relaxed max-w-lg">
        Keyboard: Arrow Keys / WASD • Touch: Virtual D-Pad & [E] Action • [I] Inventory
      </div>

      {/* Confirm New Game Modal */}
      {showConfirmNewGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="bg-[#1b1933] border-4 border-yellow-400 p-6 max-w-sm w-full text-center flex flex-col items-center gap-4">
            <h3 className="font-pixel text-xs text-yellow-400">OVERWRITE SAVE DATA?</h3>
            <p className="text-xs text-slate-300 font-sans">
              Starting a new game will overwrite your existing room progress. Are you sure?
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setShowConfirmNewGame(false);
                  onStartNewGame();
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-pixel border border-white cursor-pointer"
              >
                YES, OVERWRITE
              </button>
              <button
                onClick={() => setShowConfirmNewGame(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-pixel border border-slate-600 cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Save Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="bg-[#1b1933] border-4 border-rose-500 p-6 max-w-sm w-full text-center flex flex-col items-center gap-4">
            <h3 className="font-pixel text-xs text-rose-400">WIPE SAVE DATA?</h3>
            <p className="text-xs text-slate-300 font-sans">
              This will permanently delete all saved rooms, collected Kana, and statistics.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  onResetSave();
                  setShowConfirmReset(false);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-pixel border border-white cursor-pointer"
              >
                WIPE DATA
              </button>
              <button
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-pixel border border-slate-600 cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How To Play Modal */}
      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}

      {/* Leaderboard Modal */}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}

      {/* Save Backup & Restore Modal */}
      {showSaveTransfer && (
        <SaveTransferModal
          onClose={() => setShowSaveTransfer(false)}
          onSaveImported={(data) => {
            if (onSaveImported) onSaveImported(data);
          }}
        />
      )}
    </div>
  );
};

// Canvas preview helper for character sprite
const CharacterPreviewCanvas: React.FC<{ charId: CharacterId; frame: number }> = ({ charId, frame }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, 48, 72);
    const sprite = getCharacterSprite(charId, 'down', frame, false);
    ctx.drawImage(sprite, 0, 0, 48, 72);
  }, [charId, frame]);

  return <canvas ref={canvasRef} width={48} height={72} className="pixelated" />;
};
