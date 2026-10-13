import React, { useState } from 'react';
import { GameSaveState } from '../../types/game';
import { sounds } from '../../utils/audio';
import { SaveTransferModal } from './SaveTransferModal';
import { LeaderboardModal } from './LeaderboardModal';

interface PauseMenuProps {
  volumeEnabled: boolean;
  onToggleVolume: () => void;
  onResume: () => void;
  onOpenInventory: () => void;
  onQuitToTitle: () => void;
  onSaveImported?: (data: GameSaveState) => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  volumeEnabled,
  onToggleVolume,
  onResume,
  onOpenInventory,
  onQuitToTitle,
  onSaveImported,
}) => {
  const [showControls, setShowControls] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showSaveTransfer, setShowSaveTransfer] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [ambientOn, setAmbientOn] = useState(sounds.isAmbientEnabled());
  const [ambientVol, setAmbientVol] = useState(Math.round(sounds.getAmbientVolume() * 100));
  const [sfxVol, setSfxVol] = useState(Math.round(sounds.getSfxVolume() * 100));

  const handleToggleAmbient = () => {
    sounds.playSelect();
    const next = !ambientOn;
    setAmbientOn(next);
    sounds.setAmbientEnabled(next);
  };

  const handleAmbientVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setAmbientVol(val);
    sounds.setAmbientVolume(val / 100);
  };

  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSfxVol(val);
    sounds.setSfxVolume(val / 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
      <div className="relative bg-[#19182d] border-4 border-[#3e3c63] pixel-box p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4">
        <h2 className="font-pixel text-base text-yellow-400 tracking-widest">
          — PAUSED —
        </h2>

        {showControls ? (
          <div className="flex flex-col gap-3 w-full text-left bg-slate-950 p-4 border-2 border-slate-700 text-xs font-pixel text-slate-300">
            <span className="text-yellow-400 text-center mb-1">GAME CONTROLS</span>
            <div className="flex justify-between">
              <span className="text-slate-400">MOVE:</span>
              <span className="text-white">Arrow Keys / WASD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">INTERACT:</span>
              <span className="text-emerald-400">[E]</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">INVENTORY:</span>
              <span className="text-cyan-400">[I]</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">PAUSE:</span>
              <span className="text-rose-400">[ESC]</span>
            </div>
            <div className="border-t border-slate-800 pt-2 mt-1">
              <span className="text-amber-300 text-[10px] block mb-1">TOUCH / MOBILE:</span>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">D-PAD:</span>
                <span className="text-white">Virtual On-Screen Pad</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">ACTION:</span>
                <span className="text-emerald-400">Contextual [E] Button</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">TOGGLE PAD:</span>
                <span className="text-cyan-400">🎮 D-PAD Button in HUD</span>
              </div>
            </div>
            <button
              onClick={() => setShowControls(false)}
              className="mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] border border-slate-600 cursor-pointer"
            >
              BACK
            </button>
          </div>
        ) : showAudioSettings ? (
          <div className="flex flex-col gap-3 w-full text-left bg-slate-950 p-4 border-2 border-slate-700 text-xs font-pixel text-slate-300">
            <span className="text-yellow-400 text-center mb-1">AUDIO & SOUNDSCAPES</span>

            {/* Master Sound Toggle */}
            <div className="flex justify-between items-center py-1 border-b border-slate-800">
              <span className="text-slate-300 text-[11px]">MASTER AUDIO:</span>
              <button
                onClick={onToggleVolume}
                className={`px-2 py-0.5 border text-[10px] cursor-pointer ${
                  volumeEnabled ? 'bg-emerald-900 border-emerald-500 text-emerald-200' : 'bg-rose-900 border-rose-500 text-rose-200'
                }`}
              >
                {volumeEnabled ? 'ON 🔊' : 'MUTED 🔇'}
              </button>
            </div>

            {/* Ambient Soundscapes Toggle */}
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-300 text-[11px]">ROOM AMBIENCE:</span>
              <button
                onClick={handleToggleAmbient}
                className={`px-2 py-0.5 border text-[10px] cursor-pointer ${
                  ambientOn && volumeEnabled
                    ? 'bg-cyan-900 border-cyan-500 text-cyan-200'
                    : 'bg-slate-800 border-slate-600 text-slate-400'
                }`}
              >
                {ambientOn && volumeEnabled ? 'ENABLED 🌿' : 'OFF'}
              </button>
            </div>

            {/* Ambient Soundscape Volume Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>AMBIENCE VOL:</span>
                <span className="font-mono text-cyan-300">{ambientVol}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={ambientVol}
                onChange={handleAmbientVolumeChange}
                disabled={!ambientOn || !volumeEnabled}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <span className="text-[8px] text-slate-500 italic">
                (Room 1: Terminal hum • Room 2: Clock pendulum • Room 3: Wind & bells)
              </span>
            </div>

            {/* SFX Volume Slider */}
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>EFFECTS VOL:</span>
                <span className="font-mono text-emerald-300">{sfxVol}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sfxVol}
                onChange={handleSfxVolumeChange}
                disabled={!volumeEnabled}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>

            <button
              onClick={() => setShowAudioSettings(false)}
              className="mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] border border-slate-600 cursor-pointer"
            >
              BACK
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 w-full">
            <button
              onClick={() => {
                sounds.playSelect();
                onResume();
              }}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-pixel text-xs border-2 border-white cursor-pointer active:translate-y-0.5 shadow-md"
            >
              RESUME
            </button>

            <button
              onClick={() => {
                sounds.playSelect();
                onOpenInventory();
              }}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-pixel text-xs border-2 border-indigo-300 cursor-pointer active:translate-y-0.5 shadow-md"
            >
              INVENTORY [I]
            </button>

            <button
              onClick={() => {
                sounds.playSelect();
                setShowLeaderboard(true);
              }}
              className="w-full py-2 bg-indigo-950/80 hover:bg-indigo-900 text-amber-300 font-pixel text-xs border-2 border-amber-500/70 cursor-pointer active:translate-y-0.5 flex justify-center items-center gap-2 shadow-sm"
            >
              <span>🏆</span>
              <span>LEADERBOARDS</span>
            </button>

            <button
              onClick={() => {
                sounds.playSelect();
                setShowAudioSettings(true);
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-pixel text-xs border-2 border-cyan-600 cursor-pointer active:translate-y-0.5 flex justify-center items-center gap-2"
            >
              <span>AMBIENT & SOUND 🔊</span>
            </button>

            <button
              onClick={() => {
                sounds.playSelect();
                setShowControls(true);
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-pixel text-xs border-2 border-slate-600 cursor-pointer active:translate-y-0.5"
            >
              CONTROLS GUIDE
            </button>

            <button
              onClick={() => {
                sounds.playSelect();
                setShowSaveTransfer(true);
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-yellow-300 font-pixel text-xs border-2 border-yellow-600/80 cursor-pointer active:translate-y-0.5 flex justify-center items-center gap-2"
            >
              <span>💾</span>
              <span>SAVE BACKUP & TRANSFER</span>
            </button>

            <button
              onClick={() => {
                sounds.playSelect();
                onQuitToTitle();
              }}
              className="w-full py-2 bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-pixel text-xs border-2 border-rose-600 cursor-pointer active:translate-y-0.5 mt-1"
            >
              QUIT TO TITLE
            </button>
          </div>
        )}

        {showSaveTransfer && (
          <SaveTransferModal
            onClose={() => setShowSaveTransfer(false)}
            onSaveImported={(data) => {
              if (onSaveImported) onSaveImported(data);
            }}
          />
        )}

        {showLeaderboard && (
          <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
        )}
      </div>
    </div>
  );
};
