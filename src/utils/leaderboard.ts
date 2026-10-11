import { CharacterId } from '../types/game';
import { CHARACTERS } from '../data/characters';

export interface LeaderboardEntry {
  id: string;
  runName: string;
  playerName?: string;
  playtimeSeconds: number;
  totalKana: number;
  characterId: CharacterId;
  characterName: string;
  roomsCleared: number;
  craftedWords?: string[];
  timestamp: number;
  formattedDate: string;
}

const LEADERBOARD_STORAGE_KEY = 'kana_escape_runs_leaderboard_v2';
const OLD_STORAGE_KEY = 'kana_escape_leaderboard_v1';

export const getLeaderboard = (): LeaderboardEntry[] => {
  try {
    if (localStorage.getItem(OLD_STORAGE_KEY)) {
      localStorage.removeItem(OLD_STORAGE_KEY);
    }

    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return sortLeaderboard(parsed);
    }
  } catch {
    // fallback
  }
  return [];
};

const GLOBAL_BIN_URL = 'https://extendsclass.com/api/json-storage/bin/adadbea';
const GLOBAL_SECURITY_KEY = 'kana-escape-room-2026-secret-key';

export const fetchLeaderboardAsync = async (): Promise<LeaderboardEntry[]> => {
  const local = getLeaderboard();
  let serverEntries: LeaderboardEntry[] = [];

  // 1. Try Cloudflare Pages Edge API
  try {
    const res = await fetch(`/api/leaderboard?ts=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        serverEntries = data;
      }
    }
  } catch {
    // fallback
  }

  // 2. Direct cloud bin fallback if Edge API is empty or unreachable
  if (serverEntries.length === 0) {
    try {
      const res = await fetch(`${GLOBAL_BIN_URL}?ts=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const raw = await res.json();
        if (raw && Array.isArray(raw.runs) && raw.runs.length > 0) {
          serverEntries = raw.runs;
        } else if (Array.isArray(raw) && raw.length > 0) {
          serverEntries = raw;
        }
      }
    } catch {
      // offline
    }
  }

  // 3. Merge server and local runs, deduplicate by unique id
  const map = new Map<string, LeaderboardEntry>();
  serverEntries.forEach((e) => map.set(e.id, e));

  // Sync any local-only run from this device up to the cloud
  local.forEach((e) => {
    if (!map.has(e.id)) {
      map.set(e.id, e);
      // Background push to cloud so other devices immediately see it
      fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(e),
      }).catch(() => {});
    }
  });

  const merged = sortLeaderboard(Array.from(map.values()), 'time').slice(0, 200);

  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }

  return merged;
};

export const getLastPlayerRunId = (): string | null => {
  try {
    return localStorage.getItem('kana_last_player_run_id');
  } catch {
    return null;
  }
};

export const getMyRunIds = (): string[] => {
  try {
    const raw = localStorage.getItem('kana_my_run_ids');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export type LeaderboardCategory = 'time' | 'artifacts';

export const getEntryArtifactCount = (entry: LeaderboardEntry): number => {
  return Array.isArray(entry.craftedWords) ? entry.craftedWords.length : 0;
};

export const sortLeaderboard = (
  entries: LeaderboardEntry[],
  category: LeaderboardCategory = 'time'
): LeaderboardEntry[] => {
  return [...entries].sort((a, b) => {
    if (category === 'artifacts') {
      const artA = getEntryArtifactCount(a);
      const artB = getEntryArtifactCount(b);
      // Primary: most artifacts/words created
      if (artA !== artB) {
        return artB - artA;
      }
      // Secondary: fastest escape time
      if (a.playtimeSeconds !== b.playtimeSeconds) {
        return a.playtimeSeconds - b.playtimeSeconds;
      }
      // Tertiary: most kana discovered
      if ((a.totalKana || 0) !== (b.totalKana || 0)) {
        return (b.totalKana || 0) - (a.totalKana || 0);
      }
      // Quaternary: most recent
      return b.timestamp - a.timestamp;
    }

    // Default 'time' (Fastest Escape):
    // Primary: fastest escape time
    if (a.playtimeSeconds !== b.playtimeSeconds) {
      return a.playtimeSeconds - b.playtimeSeconds;
    }
    // Secondary: most artifacts/words created
    const artA = getEntryArtifactCount(a);
    const artB = getEntryArtifactCount(b);
    if (artA !== artB) {
      return artB - artA;
    }
    // Tertiary: most Kana discovered
    if ((a.totalKana || 0) !== (b.totalKana || 0)) {
      return (b.totalKana || 0) - (a.totalKana || 0);
    }
    // Quaternary: most recent
    return b.timestamp - a.timestamp;
  });
};

export const saveLeaderboardEntry = (params: {
  runName: string;
  playtimeSeconds: number;
  totalKana: number;
  characterId: CharacterId;
  roomsCleared?: number;
  craftedWords?: string[];
}): {
  entry: LeaderboardEntry;
  rank: number;
  timeRank: number;
  artifactsRank: number;
  allEntries: LeaderboardEntry[];
} => {
  const current = getLeaderboard();
  const char = CHARACTERS.find((c) => c.id === params.characterId);
  const characterName = char?.name || 'Explorer';

  const defaultSuggestedName = `Run #${current.length + 1}`;
  const cleanName = params.runName.trim().slice(0, 20) || defaultSuggestedName;

  const now = new Date();
  const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear().toString().slice(-2)}`;

  const newEntry: LeaderboardEntry = {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    runName: cleanName,
    playerName: cleanName,
    playtimeSeconds: params.playtimeSeconds,
    totalKana: params.totalKana,
    characterId: params.characterId,
    characterName,
    roomsCleared: params.roomsCleared ?? 3,
    craftedWords: params.craftedWords || [],
    timestamp: Date.now(),
    formattedDate,
  };

  const combined = [...current.filter((e) => e.id !== newEntry.id), newEntry];
  const updated = sortLeaderboard(combined, 'time').slice(0, 200);

  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem('kana_last_player_run_id', newEntry.id);
    const myRunsRaw = localStorage.getItem('kana_my_run_ids');
    let myRuns: string[] = [];
    try {
      myRuns = myRunsRaw ? JSON.parse(myRunsRaw) : [];
    } catch {}
    if (!myRuns.includes(newEntry.id)) {
      myRuns.push(newEntry.id);
      localStorage.setItem('kana_my_run_ids', JSON.stringify(myRuns));
    }
  } catch {
    // ignore
  }

  // Asynchronously broadcast new run to Cloudflare live leaderboard and persistent cloud backend
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry),
    }).catch(() => {
      fetch(GLOBAL_BIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Security-key': GLOBAL_SECURITY_KEY,
        },
        body: JSON.stringify({ runs: updated }),
      }).catch(() => {});
    });
  }

  const timeSorted = sortLeaderboard(updated, 'time');
  const artifactsSorted = sortLeaderboard(updated, 'artifacts');

  const timeRank = timeSorted.findIndex((e) => e.id === newEntry.id) + 1;
  const artifactsRank = artifactsSorted.findIndex((e) => e.id === newEntry.id) + 1;

  return {
    entry: newEntry,
    rank: timeRank > 0 ? timeRank : updated.length,
    timeRank: timeRank > 0 ? timeRank : updated.length,
    artifactsRank: artifactsRank > 0 ? artifactsRank : updated.length,
    allEntries: updated,
  };
};

export const clearLeaderboard = (): LeaderboardEntry[] => {
  try {
    localStorage.removeItem(LEADERBOARD_STORAGE_KEY);
    localStorage.removeItem(OLD_STORAGE_KEY);
  } catch {
    // ignore
  }
  return [];
};

export const formatTime = (secs: number): string => {
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${mins}:${s.toString().padStart(2, '0')}`;
};

export const DEFAULT_ADMIN_KEY = 'kana-admin-2026';

export const deleteLeaderboardRunAsync = async (
  runId: string,
  adminKey: string
): Promise<{ success: boolean; allEntries: LeaderboardEntry[]; error?: string }> => {
  let allEntries: LeaderboardEntry[] = [];
  let success = false;

  // 1. Try Cloudflare Pages Edge API
  try {
    const res = await fetch('/api/leaderboard', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({ runId, adminKey }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.allEntries)) {
        allEntries = data.allEntries;
        success = true;
      }
    } else if (res.status === 401) {
      return { success: false, allEntries: getLeaderboard(), error: 'Incorrect Admin Key' };
    }
  } catch {
    // fallback
  }

  // 2. Direct cloud bin fallback if Edge API was unavailable or local
  if (!success) {
    if (adminKey !== DEFAULT_ADMIN_KEY) {
      return { success: false, allEntries: getLeaderboard(), error: 'Incorrect Admin Key' };
    }
    const current = await fetchLeaderboardAsync();
    allEntries = current.filter((e) => e.id !== runId);
    try {
      await fetch(GLOBAL_BIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Security-key': GLOBAL_SECURITY_KEY,
        },
        body: JSON.stringify({ runs: allEntries }),
      });
      success = true;
    } catch {}
  }

  // Update local storage
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(allEntries));
  } catch {}

  return { success, allEntries, error: success ? undefined : 'Failed to delete run' };
};

export const resetGlobalLeaderboardAsync = async (
  adminKey: string
): Promise<{ success: boolean; allEntries: LeaderboardEntry[]; error?: string }> => {
  let success = false;

  // 1. Try Cloudflare Pages Edge API
  try {
    const res = await fetch('/api/leaderboard', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({ action: 'reset', adminKey }),
    });

    if (res.ok) {
      success = true;
    } else if (res.status === 401) {
      return { success: false, allEntries: getLeaderboard(), error: 'Incorrect Admin Key' };
    }
  } catch {}

  // 2. Direct cloud bin fallback
  if (!success) {
    if (adminKey !== DEFAULT_ADMIN_KEY) {
      return { success: false, allEntries: getLeaderboard(), error: 'Incorrect Admin Key' };
    }
    try {
      await fetch(GLOBAL_BIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Security-key': GLOBAL_SECURITY_KEY,
        },
        body: JSON.stringify({ runs: [] }),
      });
      success = true;
    } catch {}
  }

  clearLeaderboard();
  return { success, allEntries: [], error: success ? undefined : 'Failed to reset leaderboard' };
};
