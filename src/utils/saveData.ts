import { GameSaveState } from '../types/game';

export const SAVE_STORAGE_KEY = 'kana_escape_room_save';

export function getSaveData(): GameSaveState | null {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: GameSaveState = JSON.parse(raw);
    if (parsed && typeof parsed.currentRoomId === 'string') {
      return parsed;
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
    const jsonStr = JSON.stringify(data, null, 2);
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
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message || 'Failed to copy to clipboard.' };
  }
}

export function importSaveData(jsonString: string): { success: boolean; data?: GameSaveState; error?: string } {
  try {
    const parsed = JSON.parse(jsonString.trim());
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.currentRoomId !== 'string' ||
      !Array.isArray(parsed.inventory)
    ) {
      return {
        success: false,
        error: 'Invalid save format. Ensure the file or text is an authentic Kana Escape Room save file.',
      };
    }

    const validated: GameSaveState = {
      currentRoomId: parsed.currentRoomId,
      selectedCharacter: parsed.selectedCharacter || 'adam',
      inventory: parsed.inventory || [],
      completedMinigames: Array.isArray(parsed.completedMinigames) ? parsed.completedMinigames : [],
      craftedWords: Array.isArray(parsed.craftedWords) ? parsed.craftedWords : [],
      unlockedDoors: Array.isArray(parsed.unlockedDoors) ? parsed.unlockedDoors : [],
      gameCompleted: !!parsed.gameCompleted,
      playtimeSeconds: typeof parsed.playtimeSeconds === 'number' ? parsed.playtimeSeconds : 0,
      volumeEnabled: parsed.volumeEnabled !== false,
      shuffledRewards: parsed.shuffledRewards && typeof parsed.shuffledRewards === 'object' ? parsed.shuffledRewards : undefined,
      displayedItems: parsed.displayedItems && typeof parsed.displayedItems === 'object' ? parsed.displayedItems : undefined,
    };

    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(validated));
    return { success: true, data: validated };
  } catch {
    return { success: false, error: 'Malformed JSON. Please paste or upload valid JSON text.' };
  }
}
