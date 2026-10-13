export interface LeaderboardEntry {
  id: string;
  runName: string;
  playerName?: string;
  playtimeSeconds: number;
  totalKana: number;
  characterId: string;
  characterName: string;
  roomsCleared: number;
  craftedWords?: string[];
  timestamp: number;
  formattedDate: string;
  isImported?: boolean;
  verified?: boolean;
}

interface Env {
  LEADERBOARD_KV?: {
    get: (key: string, type?: 'text' | 'json') => Promise<any>;
    put: (key: string, value: string) => Promise<void>;
  };
  LEADERBOARD_ADMIN_KEY?: string;
}

// In-memory fallback across warm edge nodes
let memoryLeaderboard: LeaderboardEntry[] = [];

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

export const onRequestGet = async (context: { env: Env }) => {
  try {
    let entries: LeaderboardEntry[] = [];

    // Check Cloudflare KV if bound
    if (context.env?.LEADERBOARD_KV) {
      try {
        const data = await context.env.LEADERBOARD_KV.get('global_leaderboard', 'json');
        if (Array.isArray(data) && data.length > 0) {
          entries = data;
        }
      } catch {}
    }

    // Fallback to in-memory cache
    if (entries.length === 0 && memoryLeaderboard.length > 0) {
      entries = memoryLeaderboard;
    }

    return new Response(JSON.stringify(entries), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Server error', entries: [] }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const newEntry: LeaderboardEntry = await context.request.json();

    if (!newEntry || !newEntry.id || typeof newEntry.playtimeSeconds !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid entry payload' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    // 1. Block imported or unverified runs from the global competitive leaderboard
    if (newEntry.isImported || (newEntry as any).verified === false) {
      return new Response(
        JSON.stringify({ error: 'Imported/unverified runs are excluded from competitive global leaderboards.' }),
        {
          status: 403,
          headers: CORS_HEADERS,
        }
      );
    }

    // 2. Server-side speedrun plausibility checks:
    // Minimum humanly possible time for 3 escape rooms and minigames is >= 45 seconds
    if (newEntry.playtimeSeconds < 45 || !Number.isInteger(newEntry.playtimeSeconds) || newEntry.playtimeSeconds > 86400) {
      return new Response(
        JSON.stringify({ error: 'Rejected: Implausibly low speedrun time detected.' }),
        {
          status: 400,
          headers: CORS_HEADERS,
        }
      );
    }

    // 3. Must have cleared all 3 rooms
    if (newEntry.roomsCleared !== 3) {
      return new Response(
        JSON.stringify({ error: 'Rejected: Incomplete run. All 3 rooms must be cleared.' }),
        {
          status: 400,
          headers: CORS_HEADERS,
        }
      );
    }

    // 4. Must have crafted the final exit word 'でぐち'
    if (!Array.isArray(newEntry.craftedWords) || !newEntry.craftedWords.includes('でぐち')) {
      return new Response(
        JSON.stringify({ error: 'Rejected: Missing required final exit word.' }),
        {
          status: 400,
          headers: CORS_HEADERS,
        }
      );
    }

    // 5. Must have plausible collected kana count (at least 3 kana needed for exit)
    if (typeof newEntry.totalKana !== 'number' || newEntry.totalKana < 3 || newEntry.totalKana > 30) {
      return new Response(
        JSON.stringify({ error: 'Rejected: Invalid kana item count.' }),
        {
          status: 400,
          headers: CORS_HEADERS,
        }
      );
    }

    // 6. Character ID check
    const validChars = ['adam', 'alex', 'amelia', 'bob'];
    if (!validChars.includes(newEntry.characterId)) {
      return new Response(
        JSON.stringify({ error: 'Rejected: Invalid character profile.' }),
        {
          status: 400,
          headers: CORS_HEADERS,
        }
      );
    }

    // Fetch current runs from authoritative store
    let entries: LeaderboardEntry[] = [];
    if (context.env?.LEADERBOARD_KV) {
      try {
        const data = await context.env.LEADERBOARD_KV.get('global_leaderboard', 'json');
        if (Array.isArray(data) && data.length > 0) entries = data;
      } catch {}
    } else if (memoryLeaderboard.length > 0) {
      entries = memoryLeaderboard;
    }

    // Merge entries
    const map = new Map<string, LeaderboardEntry>();
    entries.forEach((e) => map.set(e.id, e));

    // Ensure server stamps verified
    const sanitizedEntry: LeaderboardEntry = {
      ...newEntry,
      verified: true,
      isImported: false,
      runName: String(newEntry.runName || 'Explorer').slice(0, 30),
      playerName: String(newEntry.playerName || newEntry.runName || 'Explorer').slice(0, 30),
      timestamp: Date.now(),
    };

    map.set(sanitizedEntry.id, sanitizedEntry);

    // Sort: lowest playtime first (fastest escape), then highest kana, then latest
    const allEntries = Array.from(map.values())
      .sort((a, b) => {
        if (a.playtimeSeconds !== b.playtimeSeconds) {
          return a.playtimeSeconds - b.playtimeSeconds;
        }
        if (a.totalKana !== b.totalKana) {
          return (b.totalKana || 0) - (a.totalKana || 0);
        }
        return b.timestamp - a.timestamp;
      })
      .slice(0, 100);

    memoryLeaderboard = allEntries;

    // Persist to Cloudflare KV if bound
    if (context.env?.LEADERBOARD_KV) {
      try {
        await context.env.LEADERBOARD_KV.put('global_leaderboard', JSON.stringify(allEntries));
      } catch {}
    }

    return new Response(JSON.stringify({ success: true, allEntries }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to save entry' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
};

export const onRequestDelete = async (context: { request: Request; env: Env }) => {
  try {
    let body: any = {};
    try {
      body = await context.request.json();
    } catch {}

    const authKey = body?.adminKey || context.request.headers.get('x-admin-key');
    const validKey = context.env?.LEADERBOARD_ADMIN_KEY;

    if (!validKey) {
      return new Response(
        JSON.stringify({ error: 'Server authentication required: LEADERBOARD_ADMIN_KEY environment secret is not configured.' }),
        {
          status: 403,
          headers: CORS_HEADERS,
        }
      );
    }

    if (!authKey || authKey !== validKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid admin key' }), {
        status: 401,
        headers: CORS_HEADERS,
      });
    }

    const runId = body?.runId;
    const action = body?.action; // 'reset' or specific 'runId'

    let entries: LeaderboardEntry[] = [];
    if (context.env?.LEADERBOARD_KV) {
      try {
        const kvData = await context.env.LEADERBOARD_KV.get('global_leaderboard', 'json');
        if (Array.isArray(kvData) && kvData.length > 0) entries = kvData;
      } catch {}
    } else {
      entries = memoryLeaderboard;
    }

    if (action === 'reset' || !runId) {
      entries = [];
    } else {
      entries = entries.filter((e) => e.id !== runId);
    }

    memoryLeaderboard = entries;

    if (context.env?.LEADERBOARD_KV) {
      try {
        await context.env.LEADERBOARD_KV.put('global_leaderboard', JSON.stringify(entries));
      } catch {}
    }

    return new Response(JSON.stringify({ success: true, allEntries: entries }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Delete operation failed' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};
