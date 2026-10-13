import { GameSaveState, KanaItem, CharacterId } from '../types/game';
import { ROOMS } from '../data/rooms';
import { CHARACTERS } from '../data/characters';
import { JAPANESE_DICTIONARY } from '../data/dictionary';

export const SAVE_STORAGE_KEY = 'kana_escape_room_save';
const INTEGRITY_SALT = 'kana_escape_tamper_seal_2026_@v2!';

/**
 * Deterministic keyed hash used to sign local and exported saves to detect casual tampering.
 */
export function computeSaveChecksum(data: {
  currentRoomId: string;
  selectedCharacter: string;
  inventory?: { character: string }[];
  completedMinigames?: string[];
  craftedWords?: string[];
  unlockedDoors?: string[];
  playtimeSeconds?: number;
}): string {
  const canonical = [
    data.currentRoomId || '',
    data.selectedCharacter || '',
    (data.completedMinigames || []).slice().sort().join(','),
    (data.inventory || []).map((k) => k.character).slice().sort().join(','),
    (data.craftedWords || []).slice().sort().join(','),
    (data.unlockedDoors || []).slice().sort().join(','),
    Math.floor(data.playtimeSeconds || 0).toString(),
    INTEGRITY_SALT,
  ].join(':::');

  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < canonical.length; i++) {
    const code = canonical.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code + i), 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

export function verifySaveChecksum(data: GameSaveState): boolean {
  if (!data.checksum) return false;
  const expected = computeSaveChecksum(data);
  return data.checksum === expected;
}

/**
 * Validates, recalculates, and sanitizes untrusted save data against known rooms,
 * interactables, kana items, and the Japanese dictionary.
 */
export function validateAndSanitizeSave(
  raw: any,
  isImportedSource: boolean
): {
  valid: boolean;
  data?: GameSaveState;
  error?: string;
  tampered: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Invalid save payload: expected JSON object.', tampered: true, warnings };
  }

  // 1. Verify Checksum
  let tampered = false;
  if (raw.checksum) {
    const calculated = computeSaveChecksum(raw);
    if (calculated !== raw.checksum) {
      tampered = true;
      warnings.push('Checksum mismatch: save data appears to have been edited.');
    }
  } else if (isImportedSource) {
    tampered = true;
    warnings.push('Missing checksum signature.');
  }

  // 2. Validate Character
  const validCharacterIds: CharacterId[] = CHARACTERS.map((c) => c.id);
  let selectedCharacter: CharacterId = 'adam';
  if (validCharacterIds.includes(raw.selectedCharacter)) {
    selectedCharacter = raw.selectedCharacter;
  } else {
    tampered = true;
    warnings.push(`Unknown character "${raw.selectedCharacter}"; defaulted to Adam.`);
  }

  // 3. Room & Interactable catalog
  const roomMinigamesMap: Record<string, string[]> = {};
  const allValidMinigameIds = new Set<string>();
  ROOMS.forEach((r) => {
    const ids = r.interactables.map((i) => i.id);
    roomMinigamesMap[r.id] = ids;
    ids.forEach((id) => allValidMinigameIds.add(id));
  });

  // 4. Validate Minigames
  const rawMinigames: string[] = Array.isArray(raw.completedMinigames) ? raw.completedMinigames : [];
  let validCompletedMinigames = rawMinigames.filter((id) => typeof id === 'string' && allValidMinigameIds.has(id));
  if (validCompletedMinigames.length !== rawMinigames.length) {
    tampered = true;
    warnings.push('Unrecognized minigame IDs were filtered out.');
  }

  // 5. Validate Inventory Kana
  const validKanaMap = new Map<string, KanaItem>();
  ROOMS.forEach((r) => {
    r.interactables.forEach((i) => {
      validKanaMap.set(i.rewardKana.character, i.rewardKana);
    });
  });

  const rawInventory = Array.isArray(raw.inventory) ? raw.inventory : [];
  const validInventory: KanaItem[] = [];
  const seenKana = new Set<string>();

  for (const item of rawInventory) {
    if (item && typeof item.character === 'string' && validKanaMap.has(item.character)) {
      if (!seenKana.has(item.character)) {
        seenKana.add(item.character);
        validInventory.push({
          id: item.id || validKanaMap.get(item.character)!.id,
          character: item.character,
          romaji: item.romaji || validKanaMap.get(item.character)!.romaji,
          script: item.script === 'katakana' ? 'katakana' : 'hiragana',
        });
      }
    } else {
      tampered = true;
    }
  }

  // 6. Validate Crafted Words
  const rawWords = Array.isArray(raw.craftedWords) ? raw.craftedWords : [];
  const validCraftedWords: string[] = [];
  for (const word of rawWords) {
    if (
      typeof word === 'string' &&
      (JAPANESE_DICTIONARY[word] || word === 'かぎ' || word === 'とびら' || word === 'でぐち')
    ) {
      if (!validCraftedWords.includes(word)) {
        validCraftedWords.push(word);
      }
    } else {
      tampered = true;
    }
  }

  // 7. Recalculate Completion State & Doors from verified progress
  const unlockedDoors: string[] = [];
  const r1Unlocked = validCraftedWords.includes('かぎ') || (seenKana.has('か') && seenKana.has('ぎ'));
  if (r1Unlocked) {
    unlockedDoors.push('room-1');
  }

  const r2Unlocked =
    r1Unlocked &&
    (validCraftedWords.includes('とびら') || (seenKana.has('と') && seenKana.has('び') && seenKana.has('ら')));
  if (r2Unlocked) {
    unlockedDoors.push('room-2');
  }

  const r3Unlocked =
    r2Unlocked &&
    (validCraftedWords.includes('でぐち') || (seenKana.has('で') && seenKana.has('ぐ') && seenKana.has('ち')));
  if (r3Unlocked) {
    unlockedDoors.push('room-3');
  }

  if (Array.isArray(raw.unlockedDoors)) {
    const rawUnlockedSet = new Set(raw.unlockedDoors);
    if (rawUnlockedSet.has('room-2') && !r1Unlocked) {
      tampered = true;
      warnings.push('Room 2 door was claimed unlocked without Room 1 completion; corrected.');
    }
    if (rawUnlockedSet.has('room-3') && !r2Unlocked) {
      tampered = true;
      warnings.push('Room 3 door was claimed unlocked without Room 2 completion; corrected.');
    }
  }

  // Filter completed minigames to only reachable rooms
  validCompletedMinigames = validCompletedMinigames.filter((mgId) => {
    if (roomMinigamesMap['room-2']?.includes(mgId) && !r1Unlocked) return false;
    if (roomMinigamesMap['room-3']?.includes(mgId) && !r2Unlocked) return false;
    return true;
  });

  // Clamp currentRoomId to highest reachable room
  let currentRoomId = 'room-1';
  if (raw.currentRoomId === 'room-3' && r2Unlocked) {
    currentRoomId = 'room-3';
  } else if ((raw.currentRoomId === 'room-2' || raw.currentRoomId === 'room-3') && r1Unlocked) {
    currentRoomId = 'room-2';
  } else {
    currentRoomId = 'room-1';
  }

  if (raw.currentRoomId && raw.currentRoomId !== currentRoomId) {
    tampered = true;
    warnings.push(`Room location was clamped to ${currentRoomId} based on verifiable progression.`);
  }

  // Recalculate gameCompleted
  const gameCompleted = r3Unlocked && validCraftedWords.includes('でぐち');

  // 8. Sanitize playtime
  let playtimeSeconds = 0;
  if (typeof raw.playtimeSeconds === 'number' && Number.isFinite(raw.playtimeSeconds)) {
    playtimeSeconds = Math.max(0, Math.floor(raw.playtimeSeconds));
  }
  // Plausibility check: each room and minigame requires plausible time
  const minPlausibleSeconds = unlockedDoors.length * 15 + validCompletedMinigames.length * 8;
  if (playtimeSeconds < minPlausibleSeconds && (unlockedDoors.length > 0 || validCompletedMinigames.length > 0)) {
    tampered = true;
    warnings.push('Playtime was implausibly low for the progress achieved; clamped to plausible baseline.');
    playtimeSeconds = Math.max(playtimeSeconds, minPlausibleSeconds);
  }

  // 9. Displayed items
  const validDisplayedItems: Record<string, string[]> = {};
  if (raw.displayedItems && typeof raw.displayedItems === 'object') {
    for (const [tableId, items] of Object.entries(raw.displayedItems)) {
      if (typeof tableId === 'string' && Array.isArray(items)) {
        validDisplayedItems[tableId] = items.filter(
          (w) => typeof w === 'string' && (JAPANESE_DICTIONARY[w] || validCraftedWords.includes(w))
        );
      }
    }
  }

  // 10. Shuffled rewards
  let shuffledRewards: Record<string, KanaItem> | undefined = undefined;
  if (raw.shuffledRewards && typeof raw.shuffledRewards === 'object') {
    const sanitizedShuffled: Record<string, KanaItem> = {};
    for (const [key, val] of Object.entries(raw.shuffledRewards)) {
      if (allValidMinigameIds.has(key) && val && typeof (val as any).character === 'string') {
        sanitizedShuffled[key] = val as KanaItem;
      }
    }
    if (Object.keys(sanitizedShuffled).length > 0) {
      shuffledRewards = sanitizedShuffled;
    }
  }

  const cleanData: GameSaveState = {
    currentRoomId,
    selectedCharacter,
    inventory: validInventory,
    completedMinigames: validCompletedMinigames,
    craftedWords: validCraftedWords,
    unlockedDoors,
    gameCompleted,
    playtimeSeconds,
    volumeEnabled: raw.volumeEnabled !== false,
    shuffledRewards,
    displayedItems: Object.keys(validDisplayedItems).length > 0 ? validDisplayedItems : undefined,
    roomHints: raw.roomHints && typeof raw.roomHints === 'object' ? raw.roomHints : undefined,
    isImported: isImportedSource || !!raw.isImported,
    version: 2,
  };

  cleanData.checksum = computeSaveChecksum(cleanData);

  return {
    valid: true,
    data: cleanData,
    tampered,
    warnings,
  };
}

export function getSaveData(): GameSaveState | null {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const validation = validateAndSanitizeSave(parsed, false);
    if (validation.valid && validation.data) {
      return validation.data;
    }
  } catch {
    // ignore
  }
  return null;
}

export function exportSaveData(): { success: boolean; data?: string; error?: string } {
  try {
    const data = getSaveData();
    if (!data) {
      return { success: false, error: 'No saved progress found to export.' };
    }
    const signedData: GameSaveState = {
      ...data,
      version: 2,
      exportedAt: Date.now(),
      checksum: computeSaveChecksum(data),
    };
    const jsonStr = JSON.stringify(signedData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kana-escape-room-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true, data: jsonStr };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message || 'Failed to export save data.' };
  }
}

export async function copySaveDataToClipboard(): Promise<{ success: boolean; error?: string }> {
  try {
    const data = getSaveData();
    if (!data) {
      return { success: false, error: 'No saved progress found to copy.' };
    }
    const signedData: GameSaveState = {
      ...data,
      version: 2,
      exportedAt: Date.now(),
      checksum: computeSaveChecksum(data),
    };
    await navigator.clipboard.writeText(JSON.stringify(signedData, null, 2));
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message || 'Failed to copy to clipboard.' };
  }
}

export function importSaveData(jsonString: string): {
  success: boolean;
  data?: GameSaveState;
  error?: string;
  tampered?: boolean;
  warnings?: string[];
} {
  try {
    const parsed = JSON.parse(jsonString.trim());
    const validation = validateAndSanitizeSave(parsed, true);
    if (!validation.valid || !validation.data) {
      return {
        success: false,
        error: validation.error || 'Invalid save file format. Please ensure valid Kana Escape Room JSON.',
        tampered: true,
      };
    }

    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(validation.data));
    return {
      success: true,
      data: validation.data,
      tampered: validation.tampered,
      warnings: validation.warnings,
    };
  } catch {
    return { success: false, error: 'Malformed JSON. Please paste or upload valid JSON text.' };
  }
}
