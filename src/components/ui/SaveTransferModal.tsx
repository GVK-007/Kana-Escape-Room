import React, { useState } from 'react';
import { GameSaveState } from '../../types/game';
import { exportSaveData, copySaveDataToClipboard, importSaveData, getSaveData } from '../../utils/saveData';
import { sounds } from '../../utils/audio';

interface SaveTransferModalProps {
  onClose: () => void;
  onSaveImported: (data: GameSaveState) => void;
}

export const SaveTransferModal: React.FC<SaveTransferModalProps> = ({ onClose, onSaveImported }) => {
  const [tab, setTab] = useState<'EXPORT' | 'IMPORT'>('EXPORT');
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const hasSave = !!getSaveData();

  const handleExportFile = () => {
    sounds.playSelect();
    const res = exportSaveData();
    if (res.success) {
      setMessage({ text: 'Save file downloaded successfully!', type: 'success' });
    } else {
      setMessage({ text: res.error || 'Failed to export.', type: 'error' });
    }
  };

  const handleCopyClipboard = async () => {
    sounds.playSelect();
    const res = await copySaveDataToClipboard();
    if (res.success) {
      setMessage({ text: 'Save data copied to clipboard!', type: 'success' });
    } else {
      setMessage({ text: res.error || 'Failed to copy.', type: 'error' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (!importText.trim()) {
      setMessage({ text: 'Please paste or upload save JSON first.', type: 'error' });
      return;
    }

    sounds.playSelect();
    const res = importSaveData(importText);
    if (res.success && res.data) {
      sounds.playSuccess();
      const warningSummary = res.warnings && res.warnings.length > 0
        ? ` (Adjustments made: ${res.warnings[0]})`
        : '';
      setMessage({
        text: `Save restored successfully! Tagged as Unverified.${warningSummary}`,
        type: 'success',
      });
      setTimeout(() => {
        onSaveImported(res.data!);
        onClose();
      }, 1200);
    } else {
      sounds.playFail();
      setMessage({ text: res.error || 'Failed to import.', type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
      <div className="relative bg-[#19182d] border-4 border-[#3e3c63] pixel-box p-5 max-w-md w-full shadow-2xl flex flex-col items-center gap-3">
        <h2 className="font-pixel text-sm text-yellow-400 tracking-wider">
          SAVE BACKUP & TRANSFER
        </h2>

        {/* Tab Switcher */}
        <div className="flex w-full gap-2 font-pixel text-xs">
          <button
            onClick={() => {
              sounds.playSelect();
              setTab('EXPORT');
              setMessage(null);
            }}
            className={`flex-1 py-1.5 border-2 cursor-pointer transition-all ${
              tab === 'EXPORT'
                ? 'bg-yellow-400 text-black border-white font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
          >
            EXPORT SAVE
          </button>
          <button
            onClick={() => {
              sounds.playSelect();
              setTab('IMPORT');
              setMessage(null);
            }}
            className={`flex-1 py-1.5 border-2 cursor-pointer transition-all ${
              tab === 'IMPORT'
                ? 'bg-yellow-400 text-black border-white font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
          >
            IMPORT / RESTORE
          </button>
        </div>

        {/* Feedback message banner */}
        {message && (
          <div
            className={`w-full p-2 text-center text-xs font-pixel border ${
              message.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500 text-rose-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tab 1: Export */}
        {tab === 'EXPORT' && (
          <div className="flex flex-col gap-3 w-full bg-slate-950 p-4 border border-slate-800 text-xs font-pixel">
            <span className="text-slate-300 text-[11px] leading-relaxed">
              Export your current game progress to transfer between phone and computer or keep a safe backup.
            </span>

            {hasSave ? (
              <div className="flex flex-col gap-2 mt-1">
                <button
                  onClick={handleExportFile}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-white cursor-pointer active:translate-y-0.5 shadow-md flex items-center justify-center gap-2"
                >
                  <span>💾</span>
                  <span>DOWNLOAD SAVE FILE (.JSON)</span>
                </button>
                <button
                  onClick={handleCopyClipboard}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500 cursor-pointer active:translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <span>📋</span>
                  <span>COPY SAVE TO CLIPBOARD</span>
                </button>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-4 italic">
                No active save game found yet. Start playing to create save data!
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Import */}
        {tab === 'IMPORT' && (
          <div className="flex flex-col gap-3 w-full bg-slate-950 p-4 border border-slate-800 text-xs font-pixel">
            <span className="text-slate-300 text-[11px] leading-relaxed">
              Upload a .json save file or paste raw save JSON text to restore your progress.
            </span>

            <div className="bg-amber-950/70 border border-amber-600/70 p-2 text-[10px] text-amber-200/90 leading-tight">
              ⚠️ <strong>Notice:</strong> Restored saves are validated and tagged as <em>Unverified</em>. They are excluded from competitive global speedrun leaderboards to maintain integrity.
            </div>

            <label className="flex items-center justify-center py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 cursor-pointer text-[10px]">
              <span>📁 SELECT .JSON SAVE FILE</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <textarea
              rows={4}
              placeholder="Or paste save JSON text here..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 p-2 text-slate-200 font-mono text-[10px] resize-none focus:border-yellow-400 focus:outline-none"
            />

            <button
              onClick={handleApplyImport}
              className="py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold border-2 border-white cursor-pointer active:translate-y-0.5 shadow-md"
            >
              RESTORE SAVE PROGRESS
            </button>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={() => {
            sounds.playSelect();
            onClose();
          }}
          className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-pixel border border-slate-600 cursor-pointer"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
