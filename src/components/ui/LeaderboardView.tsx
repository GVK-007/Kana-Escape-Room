import React, { useState, useEffect, useMemo } from 'react';
import {
  LeaderboardEntry,
  LeaderboardCategory,
  sortLeaderboard,
  getEntryArtifactCount,
  formatTime,
  clearLeaderboard,
  fetchLeaderboardAsync,
  deleteLeaderboardRunAsync,
  resetGlobalLeaderboardAsync,
  DEFAULT_ADMIN_KEY,
} from '../../utils/leaderboard';
import { RunDetailsModal } from './RunDetailsModal';
import { sounds } from '../../utils/audio';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  highlightId?: string;
  onRefresh?: (newEntries: LeaderboardEntry[]) => void;
  initialCategory?: LeaderboardCategory;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  entries,
  highlightId,
  onRefresh,
  initialCategory = 'time',
}) => {
  const [category, setCategory] = useState<LeaderboardCategory>(initialCategory);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [inspectingRun, setInspectingRun] = useState<{
    entry: LeaderboardEntry;
    rank: number;
    category: LeaderboardCategory;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);

  // Admin Controls State
  const [adminKey, setAdminKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('kana_leaderboard_admin_key') || '';
    }
    return '';
  });
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [adminError, setAdminError] = useState('');
  const [targetToDelete, setTargetToDelete] = useState<LeaderboardEntry | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setSyncing(true);
    fetchLeaderboardAsync()
      .then((fresh) => {
        if (isMounted) {
          setSyncSuccess(true);
          if (onRefresh) onRefresh(fresh);
        }
      })
      .catch(() => {
        if (isMounted) setSyncSuccess(false);
      })
      .finally(() => {
        if (isMounted) setSyncing(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualRefresh = async () => {
    sounds.playSelect();
    setSyncing(true);
    try {
      const fresh = await fetchLeaderboardAsync();
      setSyncSuccess(true);
      if (onRefresh) onRefresh(fresh);
    } catch {
      setSyncSuccess(false);
    } finally {
      setSyncing(false);
    }
  };

  const handleUnlockAdmin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const key = adminInput.trim();
    if (!key) return;
    if (key === DEFAULT_ADMIN_KEY) {
      sessionStorage.setItem('kana_leaderboard_admin_key', key);
      setAdminKey(key);
      setShowAdminModal(false);
      setAdminError('');
      sounds.playKanaObtained();
    } else {
      setAdminError('Incorrect Admin Passcode');
      sounds.playFail();
    }
  };

  const handleLockAdmin = () => {
    sessionStorage.removeItem('kana_leaderboard_admin_key');
    setAdminKey('');
    sounds.playSelect();
  };

  const handleDeleteRun = async (entry: LeaderboardEntry) => {
    sounds.playFail();
    setActionLoading(true);
    try {
      const res = await deleteLeaderboardRunAsync(entry.id, adminKey);
      if (res.success) {
        sounds.playKanaObtained();
        if (onRefresh) onRefresh(res.allEntries);
      } else {
        alert(res.error || 'Failed to delete run');
      }
    } finally {
      setActionLoading(false);
      setTargetToDelete(null);
    }
  };

  const handleResetGlobal = async () => {
    sounds.playExplosion();
    setActionLoading(true);
    try {
      const res = await resetGlobalLeaderboardAsync(adminKey);
      if (res.success) {
        sounds.playKanaObtained();
        if (onRefresh) onRefresh([]);
        setShowResetConfirm(false);
      } else {
        alert(res.error || 'Failed to reset leaderboard');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetLocal = () => {
    const fresh = clearLeaderboard();
    sounds.playFail();
    setShowClearConfirm(false);
    if (onRefresh) onRefresh(fresh);
  };

  const sortedEntries = useMemo(() => {
    return sortLeaderboard(entries, category);
  }, [entries, category]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Category Tabs: Shortest Time vs Most Artifacts */}
      <div className="w-full grid grid-cols-2 gap-2 mb-2 select-none">
        <button
          onClick={() => {
            sounds.playSelect();
            setCategory('time');
          }}
          className={`py-2 px-2 font-pixel text-[10px] sm:text-xs flex items-center justify-center gap-1.5 border-2 cursor-pointer transition-all ${
            category === 'time'
              ? 'bg-amber-950/80 border-yellow-400 text-yellow-300 font-bold shadow-[0_0_12px_rgba(250,204,21,0.3)]'
              : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
          }`}
        >
          <span className="text-sm">⚡</span>
          <span>SHORTEST TIME</span>
        </button>

        <button
          onClick={() => {
            sounds.playSelect();
            setCategory('artifacts');
          }}
          className={`py-2 px-2 font-pixel text-[10px] sm:text-xs flex items-center justify-center gap-1.5 border-2 cursor-pointer transition-all ${
            category === 'artifacts'
              ? 'bg-amber-950/80 border-yellow-400 text-yellow-300 font-bold shadow-[0_0_12px_rgba(250,204,21,0.3)]'
              : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
          }`}
        >
          <span className="text-sm">🏺</span>
          <span>MOST ARTIFACTS</span>
        </button>
      </div>

      {/* Category Criteria & Info */}
      <div className="w-full flex items-center justify-between mb-2 px-1 text-[8px] sm:text-[9px] font-pixel text-slate-400">
        <span className="text-yellow-400/90 flex items-center gap-1">
          {category === 'time' ? (
            <>
              <span className="text-yellow-300">⚡</span>
              <span>FASTEST ESCAPES — Ranked by shortest completion time</span>
            </>
          ) : (
            <>
              <span className="text-amber-300">🏺</span>
              <span>MASTER COLLECTORS — Ranked by most word artifacts discovered</span>
            </>
          )}
        </span>
        <span className="text-slate-500 font-mono">
          {sortedEntries.length} RUN{sortedEntries.length === 1 ? '' : 'S'}
        </span>
      </div>

      {/* Live Cloud Status Header & Admin Toggle */}
      <div className="w-full flex justify-between items-center mb-2 px-1 text-[9px] font-pixel gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`inline-block w-2 h-2 rounded-full shrink-0 ${
              syncing
                ? 'bg-yellow-400 animate-ping'
                : syncSuccess === false
                ? 'bg-amber-500'
                : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
            }`}
          />
          {syncing ? (
            <span className="text-yellow-400 truncate">SYNCING LIVE LEADERBOARD...</span>
          ) : syncSuccess === false ? (
            <span className="text-amber-400 truncate">OFFLINE MODE (LOCAL)</span>
          ) : (
            <span className="text-emerald-400 truncate">LIVE GLOBAL SYNC ACTIVE</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {adminKey ? (
            <div className="flex items-center gap-1 bg-yellow-950/80 px-1.5 py-0.5 border border-yellow-500 rounded text-[8px]">
              <span className="text-yellow-300 font-bold">👑 ADMIN</span>
              <button
                onClick={handleLockAdmin}
                className="text-[8px] text-slate-400 hover:text-white underline cursor-pointer ml-0.5"
                title="Lock Admin Mode"
              >
                LOCK
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                sounds.playSelect();
                setAdminInput('');
                setAdminError('');
                setShowAdminModal(true);
              }}
              className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-yellow-300 border border-slate-700 rounded cursor-pointer text-[8px]"
              title="Enter Admin Passcode to remove runs or reset"
            >
              ⚙️ ADMIN
            </button>
          )}

          <button
            onClick={handleManualRefresh}
            disabled={syncing}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 text-yellow-300 border border-slate-600 cursor-pointer flex items-center gap-1 transition-colors disabled:opacity-50 text-[9px]"
            title="Fetch latest runs across all players & devices"
          >
            <span className={syncing ? 'animate-spin inline-block' : 'inline-block'}>🔄</span>
            <span>{syncing ? 'SYNCING...' : 'REFRESH'}</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full bg-slate-950 border-2 border-slate-700 rounded-sm overflow-hidden shadow-xl">
        {/* Table Header */}
        <div className="grid grid-cols-12 bg-slate-900 border-b border-slate-800 text-[9px] sm:text-[10px] font-pixel text-amber-400 py-2 px-2 text-center">
          <span className="col-span-2 text-left">RANK</span>
          <span className="col-span-4 text-left">RUN / EXPLORER</span>
          <span
            className={`col-span-2 text-center transition-colors ${
              category === 'artifacts' ? 'text-yellow-300 font-bold' : 'text-slate-400'
            }`}
          >
            🏺 ARTS
          </span>
          <span className="col-span-2 text-center text-slate-400">🔤 KANA</span>
          <span
            className={`col-span-2 text-right transition-colors ${
              category === 'time' ? 'text-yellow-300 font-bold' : 'text-slate-400'
            }`}
          >
            {adminKey ? 'ACTIONS' : category === 'time' ? '⚡ TIME' : '⏱️ TIME'}
          </span>
        </div>

        {/* Entries List */}
        <div className="max-h-60 sm:max-h-68 overflow-y-auto divide-y divide-slate-900/80 font-pixel">
          {sortedEntries.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center gap-2">
              <span className="text-2xl">{category === 'artifacts' ? '🏺' : '⚡'}</span>
              <span className="font-pixel text-xs text-yellow-300">
                {category === 'artifacts' ? 'NO ARTIFACT RECORDS YET' : 'NO SPEED RECORDS YET'}
              </span>
              <span className="font-pixel text-[9px] text-slate-400 max-w-xs">
                {category === 'artifacts'
                  ? 'Discover and craft words in the escape rooms to establish artifact records!'
                  : 'Escape through the exit door and name your run to establish your speed records!'}
              </span>
            </div>
          ) : (
            sortedEntries.map((entry, idx) => {
              const rank = idx + 1;
              const isHighlight = entry.id === highlightId;
              const displayName = entry.runName || entry.playerName || `Run #${rank}`;
              const artCount = getEntryArtifactCount(entry);

              const medal =
                rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

              return (
                <div
                  key={entry.id}
                  onClick={() => {
                    sounds.playSelect();
                    setInspectingRun({ entry, rank, category });
                  }}
                  title="Click to view run summary and created words"
                  className={`grid grid-cols-12 items-center text-[10px] sm:text-xs py-2 px-2 transition-all cursor-pointer select-none group ${
                    isHighlight
                      ? 'bg-amber-500/25 text-yellow-300 ring-2 ring-yellow-400 font-bold hover:bg-amber-500/35'
                      : rank === 1
                      ? 'bg-yellow-950/20 text-yellow-200 hover:bg-yellow-950/40'
                      : rank === 2
                      ? 'bg-slate-800/40 text-slate-200 hover:bg-slate-800/60'
                      : rank === 3
                      ? 'bg-amber-950/20 text-amber-200 hover:bg-amber-950/40'
                      : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-2 text-left font-bold flex items-center gap-1">
                    <span className="text-xs sm:text-sm">{medal}</span>
                  </div>

                  {/* Run Name & Explorer */}
                  <div className="col-span-4 text-left truncate flex flex-col justify-center pr-1">
                    <div className="flex items-center gap-1 truncate">
                      <span className="tracking-wide group-hover:underline truncate" title={displayName}>
                        {displayName}
                      </span>
                      {isHighlight && (
                        <span className="text-[7px] bg-yellow-400 text-black px-1 rounded-xs font-sans font-bold shrink-0">
                          NEW
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] text-cyan-300/80 truncate">
                      {entry.characterName}
                    </span>
                  </div>

                  {/* Artifacts Count */}
                  <div className="col-span-2 text-center">
                    {category === 'artifacts' ? (
                      <span className="font-bold text-yellow-300 bg-amber-950/70 border border-amber-500/40 px-1.5 py-0.5 rounded-xs text-[9px] sm:text-[10px] inline-flex items-center gap-0.5">
                        <span>🏺</span>
                        <span>{artCount}</span>
                      </span>
                    ) : (
                      <span className="text-amber-200/80 text-[10px] font-mono">
                        🏺 {artCount}
                      </span>
                    )}
                  </div>

                  {/* Kana Count */}
                  <div className="col-span-2 text-center text-[10px] font-mono text-emerald-400">
                    {entry.totalKana}
                  </div>

                  {/* Escape Time / Admin Delete Button */}
                  <div className="col-span-2 text-right font-mono flex items-center justify-end gap-1">
                    <span
                      className={
                        category === 'time'
                          ? 'font-bold text-yellow-300'
                          : 'text-slate-300 text-[10px]'
                      }
                    >
                      {formatTime(entry.playtimeSeconds)}
                    </span>
                    {adminKey ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetToDelete(entry);
                        }}
                        disabled={actionLoading}
                        className="ml-1 px-1.5 py-0.5 bg-red-900/90 hover:bg-red-700 text-white border border-red-400 text-[8px] rounded cursor-pointer active:scale-95 transition-all"
                        title={`Admin: Delete "${displayName}"`}
                      >
                        🗑️
                      </button>
                    ) : (
                      <span className="text-[8px] text-slate-500 group-hover:text-amber-400 opacity-60 group-hover:opacity-100">
                        ➔
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sub-footer options & Admin Actions */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-center text-[9px] font-pixel text-slate-400 mt-2 px-1 gap-1.5">
        <span className="text-amber-400/90">
          {adminKey
            ? '👑 Admin Mode: Click 🗑️ on any row to delete that run'
            : '💡 Click any run to inspect summary & words'}
        </span>

        {adminKey ? (
          !showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={actionLoading}
              className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
            >
              ⚠️ RESET ALL GLOBAL RECORDS
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-500 px-2 py-1">
              <span className="text-rose-200">Wipe entire leaderboard?</span>
              <button
                onClick={handleResetGlobal}
                disabled={actionLoading}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold border border-white cursor-pointer active:scale-95"
              >
                {actionLoading ? 'WIPING...' : 'YES, WIPE ALL'}
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="text-slate-400 hover:text-white cursor-pointer ml-1"
              >
                CANCEL
              </button>
            </div>
          )
        ) : (
          entries.length > 0 &&
          (!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer underline"
            >
              Clear Local Records
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-rose-400">Clear local records?</span>
              <button
                onClick={handleResetLocal}
                className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
              >
                YES
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                NO
              </button>
            </div>
          ))
        )}
      </div>

      {/* Admin Passcode Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3">
          <form
            onSubmit={handleUnlockAdmin}
            className="bg-[#18162e] border-4 border-yellow-400 pixel-box-gold p-4 max-w-sm w-full flex flex-col gap-3 shadow-2xl animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-700">
              <span className="text-lg">👑</span>
              <h3 className="font-pixel text-xs text-yellow-300">ADMIN AUTHENTICATION</h3>
            </div>

            <p className="font-pixel text-[10px] text-slate-300 leading-relaxed">
              Enter the Admin Passcode to manage or delete global leaderboard runs:
            </p>

            <input
              type="password"
              autoFocus
              value={adminInput}
              onChange={(e) => {
                setAdminInput(e.target.value);
                setAdminError('');
              }}
              placeholder="Passcode..."
              className="w-full px-3 py-1.5 bg-slate-950 border-2 border-slate-600 focus:border-yellow-400 text-white text-xs font-mono outline-none"
            />

            {adminError && (
              <span className="font-pixel text-[9px] text-red-400 animate-pulse">
                ❌ {adminError}
              </span>
            )}

            <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-pixel text-[10px] border border-slate-600 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-yellow-500 hover:bg-yellow-400 text-black font-pixel font-bold text-[10px] border-2 border-white cursor-pointer active:translate-y-0.5"
              >
                UNLOCK
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Single Run Delete Confirmation Modal */}
      {targetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3">
          <div className="bg-[#18162e] border-4 border-red-500 pixel-box p-4 max-w-sm w-full flex flex-col gap-3 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-700">
              <span className="text-lg">🗑️</span>
              <h3 className="font-pixel text-xs text-red-400">CONFIRM RUN DELETION</h3>
            </div>

            <p className="font-pixel text-[10px] text-slate-200 leading-relaxed">
              Are you sure you want to permanently delete run:
            </p>

            <div className="bg-slate-950 border border-slate-700 p-2 text-center font-pixel text-xs text-yellow-300">
              "{targetToDelete.runName}" ({formatTime(targetToDelete.playtimeSeconds)})
            </div>

            <p className="font-pixel text-[9px] text-slate-400">
              This will remove it from all players' leaderboards globally.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setTargetToDelete(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-pixel text-[10px] border border-slate-600 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleDeleteRun(targetToDelete)}
                className="px-4 py-1 bg-red-600 hover:bg-red-500 text-white font-pixel font-bold text-[10px] border-2 border-white cursor-pointer active:translate-y-0.5"
              >
                {actionLoading ? 'DELETING...' : 'CONFIRM DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run Details Modal */}
      {inspectingRun && (
        <RunDetailsModal
          entry={inspectingRun.entry}
          rank={inspectingRun.rank}
          category={inspectingRun.category}
          onClose={() => setInspectingRun(null)}
        />
      )}
    </div>
  );
};
