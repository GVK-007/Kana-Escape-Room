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
  isImported?: boolean;
  verified?: boolean;
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

export const fetchLeaderboardAsync = async (): Promise<LeaderboardEntry[]> => {
  const local = getLeaderboard();
  let serverEntries: LeaderboardEntry[] = [];

  // Try Cloudflare Pages Edge API
  try {
    const res = await fetch(`/api/leaderboard?ts=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        serverEntries = data;
      }
    }
  } catch {
    // offline
  }

  // Merge server and local runs, deduplicate by unique id
  const map = new Map<string, LeaderboardEntry>();
  serverEntries.forEach((e) => map.set(e.id, e));

  // Sync any local-only run from this device up to the cloud (only verified runs)
  local.forEach((e) => {
    if (!map.has(e.id)) {
      map.set(e.id, e);
      if (!e.isImported && e.verified !== false) {
        // Background push to cloud so other devices immediately see it
        fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(e),
        }).catch(() => {});
      }
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
    // Verified runs always rank higher than unverified / imported runs
    const aVerified = !a.isImported && a.verified !== false;
    const bVerified = !b.isImported && b.verified !== false;
    if (aVerified !== bVerified) {
      return aVerified ? -1 : 1;
    }

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
  isImported?: boolean;
  verified?: boolean;
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

  const isImportedRun = !!params.isImported;
  const isVerified = !isImportedRun && params.verified !== false;

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
    isImported: isImportedRun,
    verified: isVerified,
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

  // Asynchronously broadcast new verified run to Cloudflare live leaderboard
  if (isVerified && typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry),
    }).catch(() => {});
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

export const deleteLeaderboardRunAsync = async (
  runId: string,
  adminKey: string
): Promise<{ success: boolean; allEntries: LeaderboardEntry[]; error?: string }> => {
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
      const allEntries = Array.isArray(data.allEntries) ? data.allEntries : [];
      try {
        localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(allEntries));
      } catch {}
      return { success: true, allEntries };
    } else if (res.status === 401) {
      return { success: false, allEntries: getLeaderboard(), error: 'Incorrect Admin Key' };
    } else if (res.status === 403) {
      return { success: false, allEntries: getLeaderboard(), error: 'Admin management not enabled on server.' };
    }
  } catch {
    // network error
  }

  return { success: false, allEntries: getLeaderboard(), error: 'Failed to delete run (Network error).' };
};

export const resetGlobalLeaderboardAsync = async (
  adminKey: string
): Promise<{ success: boolean; allEntries: LeaderboardEntry[]; error?: string }> => {
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
      clearLeaderboard();
      return { success: true, allEntries: [] };
    } else if (res.status === 401) {
      return { success: false, allEntries: getLeaderboard(), error: 'Incorrect Admin Key' };
    } else if (res.status === 403) {
      return { success: false, allEntries: getLeaderboard(), error: 'Admin management not enabled on server.' };
    }
  } catch {
    // network error
  }

  return { success: false, allEntries: getLeaderboard(), error: 'Failed to reset leaderboard (Network error).' };
};
