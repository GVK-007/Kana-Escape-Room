import { CharacterId } from '../types/game';

/**
 * Pixel Art Asset Generator
 * Builds high-fidelity 16x16 / 32x32 retro pixel-art sprites and tilesets
 * keeping crisp integer pixels, nearest-neighbor scaling, and authentic palettes.
 */

// Cache generated canvases for fast rendering
const assetCache: Map<string, HTMLCanvasElement> = new Map();

function createCrispCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

// Character color palettes matching LimeZu characters (Adam, Alex, Amelia, Bob)
const CHARACTER_PALETTES: Record<CharacterId, {
  hair: string;
  hairShadow: string;
  skin: string;
  skinShadow: string;
  shirt: string;
  shirtShadow: string;
  pants: string;
  pantsShadow: string;
  shoes: string;
}> = {
  adam: {
    hair: '#241e1a',
    hairShadow: '#15110e',
    skin: '#ffdfba',
    skinShadow: '#e0b892',
    shirt: '#2563eb', // blue hoodie
    shirtShadow: '#1d4ed8',
    pants: '#1e293b', // dark slacks
    pantsShadow: '#0f172a',
    shoes: '#475569'
  },
  alex: {
    hair: '#ea580c', // orange/red
    hairShadow: '#9a3412',
    skin: '#fde047',
    skinShadow: '#ca8a04',
    shirt: '#059669', // green jacket
    shirtShadow: '#047857',
    pants: '#334155',
    pantsShadow: '#1e293b',
    shoes: '#78350f'
  },
  amelia: {
    hair: '#78350f', // chestnut brown ponytail
    hairShadow: '#451a03',
    skin: '#ffedd5',
    skinShadow: '#fed7aa',
    shirt: '#db2777', // pink sweater
    shirtShadow: '#be185d',
    pants: '#312e81', // indigo skirt/tights
    pantsShadow: '#1e1b4b',
    shoes: '#e11d48'
  },
  bob: {
    hair: '#facc15', // blonde with cap
    hairShadow: '#ca8a04',
    skin: '#fed7aa',
    skinShadow: '#fba56d',
    shirt: '#65a30d', // olive top
    shirtShadow: '#4d7c0f',
    pants: '#475569', // grey cargo
    pantsShadow: '#334155',
    shoes: '#1e293b'
  }
};

export type CharacterDirection =
  | 'down'
  | 'up'
  | 'left'
  | 'right'
  | 'down-left'
  | 'down-right'
  | 'up-left'
  | 'up-right';

/**
 * Generates an animated character frame
 * width: 16px, height: 24px
 */
export function getCharacterSprite(
  charId: CharacterId,
  direction: CharacterDirection,
  frame: number = 0,
  isMoving: boolean = false
): HTMLCanvasElement {
  const cacheKey = `char_${charId}_${direction}_${frame}_${isMoving}`;
  if (assetCache.has(cacheKey)) {
    return assetCache.get(cacheKey)!;
  }

  const { canvas, ctx } = createCrispCanvas(16, 24);
  const pal = CHARACTER_PALETTES[charId];
  const step = isMoving ? frame % 4 : 0;
  // Step-by-step bob: On foot plant frames (1 and 3) character body dips 1px, grounding their weight
  const walkBob = isMoving ? (step === 1 || step === 3 ? 1 : 0) : 0;
  const idleBob = !isMoving ? (frame % 2 === 1 ? 1 : 0) : 0;

  // Clear
  ctx.clearRect(0, 0, 16, 24);

  // Character body anchor with grounded step bob
  const baseX = 0;
  const baseY = isMoving ? walkBob : idleBob;

  if (direction === 'down') {
    // --- Facing Down (Front) ---
    // Shadow under feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(baseX + 3, 21, 10, 2);

    // Legs / Pants
    ctx.fillStyle = pal.pants;
    if (step === 1) {
      // Left step
      ctx.fillRect(baseX + 4, 15 + baseY, 3, 5);
      ctx.fillRect(baseX + 9, 14 + baseY, 3, 4);
      // Shoes
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 3, 20 + baseY, 4, 2);
      ctx.fillRect(baseX + 9, 18 + baseY, 3, 2);
    } else if (step === 3) {
      // Right step
      ctx.fillStyle = pal.pants;
      ctx.fillRect(baseX + 4, 14 + baseY, 3, 4);
      ctx.fillRect(baseX + 9, 15 + baseY, 3, 5);
      // Shoes
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 4, 18 + baseY, 3, 2);
      ctx.fillRect(baseX + 9, 20 + baseY, 4, 2);
    } else {
      // Standing legs
      ctx.fillRect(baseX + 4, 15 + baseY, 3, 5);
      ctx.fillRect(baseX + 9, 15 + baseY, 3, 5);
      // Shoes
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 3, 20 + baseY, 4, 2);
      ctx.fillRect(baseX + 9, 20 + baseY, 4, 2);
    }

    // Torso / Shirt
    ctx.fillStyle = pal.shirt;
    ctx.fillRect(baseX + 4, 9 + baseY, 8, 6);
    ctx.fillStyle = pal.shirtShadow;
    ctx.fillRect(baseX + 4, 13 + baseY, 8, 2);
    ctx.fillRect(baseX + 11, 9 + baseY, 1, 6);

    // Arms
    ctx.fillStyle = pal.shirt;
    const armL = step === 1 ? -1 : step === 3 ? 1 : 0;
    const armR = step === 1 ? 1 : step === 3 ? -1 : 0;
    ctx.fillRect(baseX + 2, 10 + baseY + armL, 2, 4);
    ctx.fillRect(baseX + 12, 10 + baseY + armR, 2, 4);
    // Hands
    ctx.fillStyle = pal.skin;
    ctx.fillRect(baseX + 2, 14 + baseY + armL, 2, 2);
    ctx.fillRect(baseX + 12, 14 + baseY + armR, 2, 2);

    // Neck
    ctx.fillStyle = pal.skinShadow;
    ctx.fillRect(baseX + 7, 8 + baseY, 2, 2);

    // Head / Face
    ctx.fillStyle = pal.skin;
    ctx.fillRect(baseX + 4, 3 + baseY, 8, 6);

    // Eyes
    ctx.fillStyle = '#111827';
    ctx.fillRect(baseX + 5, 5 + baseY, 2, 2);
    ctx.fillRect(baseX + 9, 5 + baseY, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(baseX + 5, 5 + baseY, 1, 1);
    ctx.fillRect(baseX + 9, 5 + baseY, 1, 1);

    // Blush
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fillRect(baseX + 4, 7 + baseY, 2, 1);
    ctx.fillRect(baseX + 10, 7 + baseY, 2, 1);

    // Hair
    ctx.fillStyle = pal.hair;
    ctx.fillRect(baseX + 3, 1 + baseY, 10, 3);
    ctx.fillRect(baseX + 3, 4 + baseY, 2, 3);
    ctx.fillRect(baseX + 11, 4 + baseY, 2, 3);
    ctx.fillRect(baseX + 5, 3 + baseY, 6, 1);
    // Hair highlight
    ctx.fillStyle = pal.hairShadow;
    ctx.fillRect(baseX + 3, 1 + baseY, 10, 1);

  } else if (direction === 'up') {
    // --- Facing Up (Back) ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(baseX + 3, 21, 10, 2);

    // Legs
    ctx.fillStyle = pal.pants;
    if (step === 1) {
      ctx.fillRect(baseX + 4, 15 + baseY, 3, 5);
      ctx.fillRect(baseX + 9, 14 + baseY, 3, 4);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 4, 20 + baseY, 3, 2);
      ctx.fillRect(baseX + 9, 18 + baseY, 3, 2);
    } else if (step === 3) {
      ctx.fillRect(baseX + 4, 14 + baseY, 3, 4);
      ctx.fillRect(baseX + 9, 15 + baseY, 3, 5);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 4, 18 + baseY, 3, 2);
      ctx.fillRect(baseX + 9, 20 + baseY, 3, 2);
    } else {
      ctx.fillRect(baseX + 4, 15 + baseY, 3, 5);
      ctx.fillRect(baseX + 9, 15 + baseY, 3, 5);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 4, 20 + baseY, 3, 2);
      ctx.fillRect(baseX + 9, 20 + baseY, 3, 2);
    }

    // Torso / Shirt Back
    ctx.fillStyle = pal.shirt;
    ctx.fillRect(baseX + 4, 8 + baseY, 8, 7);
    ctx.fillStyle = pal.shirtShadow;
    ctx.fillRect(baseX + 4, 13 + baseY, 8, 2);

    // Arms
    ctx.fillStyle = pal.shirt;
    const armL = step === 1 ? -1 : step === 3 ? 1 : 0;
    const armR = step === 1 ? 1 : step === 3 ? -1 : 0;
    ctx.fillRect(baseX + 2, 10 + baseY + armL, 2, 4);
    ctx.fillRect(baseX + 12, 10 + baseY + armR, 2, 4);
    ctx.fillStyle = pal.skin;
    ctx.fillRect(baseX + 2, 14 + baseY + armL, 2, 2);
    ctx.fillRect(baseX + 12, 14 + baseY + armR, 2, 2);

    // Back of neck collar
    ctx.fillStyle = pal.skinShadow;
    ctx.fillRect(baseX + 6, 7 + baseY, 4, 2);

    // Full Back Hair
    ctx.fillStyle = pal.hair;
    ctx.fillRect(baseX + 3, 1 + baseY, 10, 8);
    ctx.fillStyle = pal.hairShadow;
    ctx.fillRect(baseX + 4, 6 + baseY, 8, 3);

  } else if (direction === 'left') {
    // --- Facing Left ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(baseX + 4, 21, 8, 2);

    // Legs
    ctx.fillStyle = pal.pants;
    if (step === 1) {
      ctx.fillRect(baseX + 3, 15 + baseY, 4, 5);
      ctx.fillRect(baseX + 8, 14 + baseY, 3, 4);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 2, 20 + baseY, 5, 2);
      ctx.fillRect(baseX + 8, 18 + baseY, 3, 2);
    } else if (step === 3) {
      ctx.fillRect(baseX + 5, 14 + baseY, 3, 4);
      ctx.fillRect(baseX + 8, 15 + baseY, 4, 5);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 4, 18 + baseY, 4, 2);
      ctx.fillRect(baseX + 8, 20 + baseY, 4, 2);
    } else {
      ctx.fillRect(baseX + 5, 15 + baseY, 5, 5);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 4, 20 + baseY, 6, 2);
    }

    // Torso
    ctx.fillStyle = pal.shirt;
    ctx.fillRect(baseX + 5, 9 + baseY, 6, 6);
    ctx.fillStyle = pal.shirtShadow;
    ctx.fillRect(baseX + 8, 9 + baseY, 3, 6);

    // Arm Left
    const armSwing = step === 1 ? -2 : step === 3 ? 2 : 0;
    ctx.fillStyle = pal.shirt;
    ctx.fillRect(baseX + 6 + armSwing, 10 + baseY, 3, 4);
    ctx.fillStyle = pal.skin;
    ctx.fillRect(baseX + 6 + armSwing, 14 + baseY, 2, 2);

    // Head
    ctx.fillStyle = pal.skin;
    ctx.fillRect(baseX + 4, 3 + baseY, 7, 6);
    // Neck
    ctx.fillStyle = pal.skinShadow;
    ctx.fillRect(baseX + 6, 8 + baseY, 3, 2);

    // Eye Left
    ctx.fillStyle = '#111827';
    ctx.fillRect(baseX + 4, 5 + baseY, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(baseX + 4, 5 + baseY, 1, 1);

    // Hair
    ctx.fillStyle = pal.hair;
    ctx.fillRect(baseX + 3, 1 + baseY, 9, 3);
    ctx.fillRect(baseX + 7, 4 + baseY, 5, 5);
    ctx.fillRect(baseX + 3, 3 + baseY, 4, 2);

  } else if (direction === 'right') {
    // --- Facing Right ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(baseX + 4, 21, 8, 2);

    // Legs
    ctx.fillStyle = pal.pants;
    if (step === 1) {
      ctx.fillRect(baseX + 8, 15 + baseY, 4, 5);
      ctx.fillRect(baseX + 5, 14 + baseY, 3, 4);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 9, 20 + baseY, 5, 2);
      ctx.fillRect(baseX + 5, 18 + baseY, 3, 2);
    } else if (step === 3) {
      ctx.fillRect(baseX + 8, 14 + baseY, 3, 4);
      ctx.fillRect(baseX + 4, 15 + baseY, 4, 5);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 8, 18 + baseY, 4, 2);
      ctx.fillRect(baseX + 4, 20 + baseY, 4, 2);
    } else {
      ctx.fillRect(baseX + 6, 15 + baseY, 5, 5);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 6, 20 + baseY, 6, 2);
    }

    // Torso
    ctx.fillStyle = pal.shirt;
    ctx.fillRect(baseX + 5, 9 + baseY, 6, 6);
    ctx.fillStyle = pal.shirtShadow;
    ctx.fillRect(baseX + 5, 9 + baseY, 3, 6);

    // Arm Right
    const armSwing = step === 1 ? 2 : step === 3 ? -2 : 0;
    ctx.fillStyle = pal.shirt;
    ctx.fillRect(baseX + 7 + armSwing, 10 + baseY, 3, 4);
    ctx.fillStyle = pal.skin;
    ctx.fillRect(baseX + 8 + armSwing, 14 + baseY, 2, 2);

    // Head
    ctx.fillStyle = pal.skin;
    ctx.fillRect(baseX + 5, 3 + baseY, 7, 6);
    // Neck
    ctx.fillStyle = pal.skinShadow;
    ctx.fillRect(baseX + 7, 8 + baseY, 3, 2);

    // Eye Right
    ctx.fillStyle = '#111827';
    ctx.fillRect(baseX + 10, 5 + baseY, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(baseX + 11, 5 + baseY, 1, 1);

    // Hair
    ctx.fillStyle = pal.hair;
    ctx.fillRect(baseX + 4, 1 + baseY, 9, 3);
    ctx.fillRect(baseX + 4, 4 + baseY, 5, 5);
    ctx.fillRect(baseX + 9, 3 + baseY, 4, 2);

  } else if (direction === 'down-left') {
    // --- Facing Down-Left (3/4 Front Isometric Walk) ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(baseX + 3, 21, 10, 2);

    // Legs / Pants
    ctx.fillStyle = pal.pants;
    if (step === 1) {
      // Left stride down-left
      ctx.fillRect(baseX + 3, 15 + baseY, 4, 5);
      ctx.fillRect(baseX + 8, 14 + baseY, 3, 4);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 2, 20 + baseY, 5, 2);
      ctx.fillRect(baseX + 8, 18 + baseY, 3, 2);
    } else if (step === 3) {
      // Right stride
      ctx.fillRect(baseX + 4, 14 + baseY, 3, 4);
      ctx.fillRect(baseX + 8, 15 + baseY, 4, 5);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 4, 18 + baseY, 3, 2);
      ctx.fillRect(baseX + 8, 20 + baseY, 4, 2);
    } else {
      ctx.fillRect(baseX + 4, 15 + baseY, 3, 5);
      ctx.fillRect(baseX + 8, 15 + baseY, 4, 5);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 3, 20 + baseY, 4, 2);
      ctx.fillRect(baseX + 8, 20 + baseY, 4, 2);
    }

    // Torso (3/4 front view angled down-left)
    ctx.fillStyle = pal.shirt;
    ctx.fillRect(baseX + 4, 9 + baseY, 7, 6);
    ctx.fillStyle = pal.shirtShadow;
    ctx.fillRect(baseX + 9, 9 + baseY, 2, 6);
    ctx.fillRect(baseX + 4, 13 + baseY, 7, 2);

    // Arms
    const armL = step === 1 ? 1 : step === 3 ? -1 : 0;
    const armR = step === 1 ? -1 : step === 3 ? 1 : 0;
    ctx.fillStyle = pal.shirt;
    ctx.fillRect(baseX + 2, 10 + baseY + armL, 3, 4);
    ctx.fillStyle = pal.skin;
    ctx.fillRect(baseX + 2, 14 + baseY + armL, 2, 2);

    ctx.fillStyle = pal.shirtShadow;
    ctx.fillRect(baseX + 11, 10 + baseY + armR, 2, 4);
    ctx.fillStyle = pal.skinShadow;
    ctx.fillRect(baseX + 11, 14 + baseY + armR, 2, 2);

    // Neck
    ctx.fillStyle = pal.skinShadow;
    ctx.fillRect(baseX + 6, 8 + baseY, 2, 2);

    // Head / Face
    ctx.fillStyle = pal.skin;
    ctx.fillRect(baseX + 3, 3 + baseY, 8, 6);

    // Eyes (looking down-left)
    ctx.fillStyle = '#111827';
    ctx.fillRect(baseX + 4, 5 + baseY, 2, 2);
    ctx.fillRect(baseX + 8, 5 + baseY, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(baseX + 4, 5 + baseY, 1, 1);
    ctx.fillRect(baseX + 8, 5 + baseY, 1, 1);

    // Blush
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fillRect(baseX + 3, 7 + baseY, 2, 1);
    ctx.fillRect(baseX + 8, 7 + baseY, 2, 1);

    // Hair
    ctx.fillStyle = pal.hair;
    ctx.fillRect(baseX + 3, 1 + baseY, 9, 3);
    ctx.fillRect(baseX + 2, 4 + baseY, 3, 3);
    ctx.fillRect(baseX + 9, 3 + baseY, 3, 4);
    ctx.fillStyle = pal.hairShadow;
    ctx.fillRect(baseX + 3, 1 + baseY, 9, 1);

  } else if (direction === 'down-right') {
    // --- Facing Down-Right (Horizontally mirrored Down-Left) ---
    const dlSprite = getCharacterSprite(charId, 'down-left', frame, isMoving);
    ctx.save();
    ctx.translate(16, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(dlSprite, 0, 0);
    ctx.restore();

  } else if (direction === 'up-left') {
    // --- Facing Up-Left (3/4 Back Isometric Walk) ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(baseX + 3, 21, 10, 2);

    // Legs / Pants
    ctx.fillStyle = pal.pants;
    if (step === 1) {
      ctx.fillRect(baseX + 3, 14 + baseY, 4, 5);
      ctx.fillRect(baseX + 8, 15 + baseY, 3, 4);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 3, 19 + baseY, 4, 2);
      ctx.fillRect(baseX + 8, 19 + baseY, 3, 2);
    } else if (step === 3) {
      ctx.fillRect(baseX + 4, 15 + baseY, 3, 4);
      ctx.fillRect(baseX + 8, 14 + baseY, 4, 5);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 4, 19 + baseY, 3, 2);
      ctx.fillRect(baseX + 8, 19 + baseY, 4, 2);
    } else {
      ctx.fillRect(baseX + 4, 15 + baseY, 3, 5);
      ctx.fillRect(baseX + 8, 15 + baseY, 4, 5);
      ctx.fillStyle = pal.shoes;
      ctx.fillRect(baseX + 4, 20 + baseY, 3, 2);
      ctx.fillRect(baseX + 8, 20 + baseY, 4, 2);
    }

    // Torso (3/4 back view)
    ctx.fillStyle = pal.shirt;
    ctx.fillRect(baseX + 4, 8 + baseY, 7, 7);
    ctx.fillStyle = pal.shirtShadow;
    ctx.fillRect(baseX + 4, 13 + baseY, 7, 2);
    ctx.fillRect(baseX + 9, 8 + baseY, 2, 7);

    // Arms
    const armL = step === 1 ? -1 : step === 3 ? 1 : 0;
    const armR = step === 1 ? 1 : step === 3 ? -1 : 0;
    ctx.fillStyle = pal.shirt;
    ctx.fillRect(baseX + 2, 10 + baseY + armL, 3, 4);
    ctx.fillStyle = pal.skin;
    ctx.fillRect(baseX + 2, 14 + baseY + armL, 2, 2);

    ctx.fillStyle = pal.shirtShadow;
    ctx.fillRect(baseX + 11, 10 + baseY + armR, 2, 4);
    ctx.fillStyle = pal.skinShadow;
    ctx.fillRect(baseX + 11, 14 + baseY + armR, 2, 2);

    // Neck / collar junction to torso
    ctx.fillStyle = pal.skinShadow;
    ctx.fillRect(baseX + 6, 7 + baseY, 3, 2);

    // Back of head & hair (angled away 3/4)
    ctx.fillStyle = pal.hair;
    ctx.fillRect(baseX + 3, 1 + baseY, 9, 8);
    ctx.fillStyle = pal.hairShadow;
    ctx.fillRect(baseX + 4, 5 + baseY, 8, 3);

  } else if (direction === 'up-right') {
    // --- Facing Up-Right (Horizontally mirrored Up-Left) ---
    const ulSprite = getCharacterSprite(charId, 'up-left', frame, isMoving);
    ctx.save();
    ctx.translate(16, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(ulSprite, 0, 0);
    ctx.restore();
  }

  assetCache.set(cacheKey, canvas);
  return canvas;
}

/**
 * Generates floor tile (16x16)
 */
export function getFloorTile(type: 'wood' | 'stone' | 'carpet_tatami', variant: number = 0, roomId: string = 'room-1'): HTMLCanvasElement {
  const key = `floor_${type}_${variant}_${roomId}`;
  if (assetCache.has(key)) return assetCache.get(key)!;

  const { canvas, ctx } = createCrispCanvas(16, 16);

  if (roomId === 'room-3' || type === 'carpet_tatami') {
    // Authentic Japanese Tatami Mats (畳)
    // Straw weave background
    ctx.fillStyle = variant % 2 === 0 ? '#4d7c0f' : '#3f6212';
    ctx.fillRect(0, 0, 16, 16);

    // Fine straw reed texture lines
    ctx.fillStyle = variant % 2 === 0 ? '#65a30d' : '#4d7c0f';
    for (let y = 0; y < 16; y += 2) {
      ctx.fillRect(0, y, 16, 1);
    }

    // Traditional dark fabric border binding (Tatami-beri 縁)
    ctx.fillStyle = '#0f172a'; // Deep indigo / black cloth
    ctx.fillRect(0, 0, 2, 16);
    ctx.fillRect(14, 0, 2, 16);
    // Subtle diamond pattern on cloth border
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 4, 2, 2);
    ctx.fillRect(0, 10, 2, 2);
    ctx.fillRect(14, 4, 2, 2);
    ctx.fillRect(14, 10, 2, 2);

  } else if (roomId === 'room-2' || type === 'stone') {
    // Ancient Ryokan Library stone flagstones with subtle moss
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 16, 16);

    ctx.fillStyle = '#1e293b';
    ctx.strokeRect(0.5, 0.5, 15, 15);
    ctx.fillRect(8, 0, 1, 16);

    // Stone flecks and moss
    ctx.fillStyle = '#475569';
    ctx.fillRect(2, 3, 2, 2);
    ctx.fillRect(11, 9, 3, 2);
    ctx.fillStyle = '#14532d'; // subtle ancient moss
    ctx.fillRect(3, 11, 2, 2);
    ctx.fillRect(10, 2, 2, 1);

    ctx.fillStyle = '#64748b';
    ctx.fillRect(3, 4, 1, 1);
    ctx.fillRect(12, 10, 1, 1);

  } else {
    // Room 1: Akihabara Parquet Polished Cedar Plank Wood
    ctx.fillStyle = variant % 2 === 0 ? '#b45309' : '#92400e';
    ctx.fillRect(0, 0, 16, 16);

    // Planks seams
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 8, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(8, 0, 1, 8);
    ctx.fillRect(4, 8, 1, 8);

    // Wood grain highlight
    ctx.fillStyle = '#d97706';
    ctx.fillRect(2, 2, 4, 1);
    ctx.fillRect(10, 4, 5, 1);
    ctx.fillRect(6, 11, 6, 1);
  }

  assetCache.set(key, canvas);
  return canvas;
}

/**
 * Generates wall tile (16x16)
 */
export function getWallTile(isTop: boolean = false, roomId: string = 'room-1'): HTMLCanvasElement {
  const key = `wall_${isTop}_${roomId}`;
  if (assetCache.has(key)) return assetCache.get(key)!;

  const { canvas, ctx } = createCrispCanvas(16, 16);

  if (roomId === 'room-3') {
    // Room 3: Vermillion Shrine Walls (神社・朱塗り)
    if (isTop) {
      // Curved shrine eaves / black lacquer tile cap
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 16, 6);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 2, 16, 2);
      // Vermillion beam (Nageshi 長押)
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(0, 6, 16, 10);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, 6, 16, 2);
    } else {
      // White plaster (Shikkui 漆喰) with Vermillion lacquered timber pillars
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 16, 16);
      // Vermillion vertical shrine post
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(0, 0, 3, 16);
      ctx.fillRect(13, 0, 3, 16);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(1, 0, 1, 16);
      // Shrine timber baseboard
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(0, 13, 16, 3);
    }
  } else if (roomId === 'room-2') {
    // Room 2: Traditional Shoji Screen & Cedar Timber Walls (書院・障子)
    if (isTop) {
      // Cedar crown beam with Ranma transom lattice
      ctx.fillStyle = '#451a03';
      ctx.fillRect(0, 0, 16, 5);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, 5, 16, 11);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, 5, 16, 2);
    } else {
      // Shoji paper lattice wall panels
      ctx.fillStyle = '#fef3c7'; // warm translucent washi paper
      ctx.fillRect(0, 0, 16, 16);
      // Dark cedar grid (Kumiko 組子)
      ctx.fillStyle = '#78350f';
      ctx.strokeRect(0.5, 0.5, 15, 15);
      ctx.fillRect(7, 0, 2, 16);
      ctx.fillRect(0, 7, 16, 2);
      // Cedar baseboard
      ctx.fillStyle = '#451a03';
      ctx.fillRect(0, 14, 16, 2);
    }
  } else {
    // Room 1: Cyber Akihabara Workshop Walls (電脳工房)
    if (isTop) {
      // Dark cyber roof border with glowing neon cyan conduit
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 0, 16, 4);
      ctx.fillStyle = '#312e81';
      ctx.fillRect(0, 4, 16, 8);
      // Glowing neon conduit wire
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(0, 12, 16, 2);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 14, 16, 2);
    } else {
      // Cyber brick panel with exposed cables
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 1, 14);
      ctx.fillRect(8, 0, 1, 14);
      ctx.fillStyle = '#312e81';
      ctx.fillRect(0, 0, 16, 2);
      // Yellow hazard / tech line
      ctx.fillStyle = '#facc15';
      ctx.fillRect(2, 6, 4, 1);
      ctx.fillRect(10, 10, 4, 1);
      // Baseboard
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 13, 16, 3);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 12, 16, 1);
    }
  }

  assetCache.set(key, canvas);
  return canvas;
}

/**
 * Generates an exit door sprite (32x32) tailored to each room's Japanese theme
 */
export function getDoorSprite(isUnlocked: boolean, clueIcon: string = '🔑', roomId: string = 'room-1'): HTMLCanvasElement {
  const key = `door_${isUnlocked}_${clueIcon}_${roomId}`;
  if (assetCache.has(key)) return assetCache.get(key)!;

  const { canvas, ctx } = createCrispCanvas(32, 32);

  if (roomId === 'room-3') {
    // ==========================================
    // ROOM 3: MAJESTIC VERMILLION TORII GATE (鳥居)
    // ==========================================
    // Background glow/portal
    if (isUnlocked) {
      // Radiant Celestial Spirit Gateway
      const grad = ctx.createRadialGradient(16, 18, 2, 16, 18, 16);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#fef08a');
      grad.addColorStop(0.7, '#38bdf8');
      grad.addColorStop(1, 'rgba(30, 27, 75, 0.4)');
      ctx.fillStyle = grad;
      ctx.fillRect(4, 8, 24, 24);

      // Ascension sparkles
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, 12, 4, 4);
      ctx.fillRect(9, 18, 3, 3);
      ctx.fillRect(20, 20, 3, 3);
      ctx.fillRect(15, 24, 2, 2);
    } else {
      // Moonlit spirit barrier (sealed)
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(4, 8, 24, 24);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.25)';
      ctx.fillRect(6, 10, 20, 22);

      // Talisman seal ropes crisscross
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(6, 10);
      ctx.lineTo(26, 30);
      ctx.moveTo(26, 10);
      ctx.lineTo(6, 30);
      ctx.stroke();
    }

    // --- TORII ARCHITECTURE ---
    // Stone plinth bases (Kamebara 亀腹)
    ctx.fillStyle = '#334155';
    ctx.fillRect(2, 28, 6, 4);
    ctx.fillRect(24, 28, 6, 4);

    // Vermillion Pillars (Hashira 柱)
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(3, 4, 4, 24);
    ctx.fillRect(25, 4, 4, 24);
    ctx.fillStyle = '#dc2626'; // Highlight on front
    ctx.fillRect(4, 4, 2, 24);
    ctx.fillRect(26, 4, 2, 24);

    // Second horizontal tie-beam (Nuki 貫)
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(1, 10, 30, 3);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(2, 10, 28, 1);

    // Center vertical strut (Gakuzuka 額束) with Seal Plaque
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(14, 4, 4, 7);
    ctx.fillStyle = '#fef3c7'; // Wooden tablet
    ctx.fillRect(13, 5, 6, 5);
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(15, 6, 2, 3); // Miniature kanji symbol

    // Top curved lintel (Kasagi 笠木 & Shimaki 島木)
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 3, 32, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(1, 3, 30, 1);
    // Black roof tile cap (Kasa 笠)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 1, 32, 2);
    ctx.fillStyle = '#334155';
    ctx.fillRect(1, 1, 30, 1);

    // Sacred Braided Rope (Shimenawa 注連縄)
    ctx.fillStyle = '#d97706';
    ctx.fillRect(3, 11, 26, 2);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(5, 11, 4, 1);
    ctx.fillRect(14, 11, 4, 1);
    ctx.fillRect(23, 11, 4, 1);

    // White zig-zag paper pendants (Shide 紙垂)
    ctx.fillStyle = '#ffffff';
    // Left Shide
    ctx.fillRect(7, 13, 2, 2);
    ctx.fillRect(8, 15, 2, 2);
    ctx.fillRect(7, 17, 2, 3);
    // Center Shide
    ctx.fillRect(15, 13, 2, 2);
    ctx.fillRect(16, 15, 2, 2);
    ctx.fillRect(15, 17, 2, 3);
    // Right Shide
    ctx.fillRect(23, 13, 2, 2);
    ctx.fillRect(24, 15, 2, 2);
    ctx.fillRect(23, 17, 2, 3);

  } else if (roomId === 'room-2') {
    // ==========================================
    // ROOM 2: TRADITIONAL SHOJI / FUSUMA SLIDING DOORS (障子・襖)
    // ==========================================
    // Dark Japanese cedar outer frame
    ctx.fillStyle = '#3b1c0b';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#5c2d12';
    ctx.fillRect(2, 2, 28, 30);

    if (isUnlocked) {
      // Doors slide open, revealing warm lantern-lit room ahead
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(6, 4, 20, 28);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(8, 6, 16, 26);
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(12, 10, 8, 18);

      // Parted Shoji doors visible on left and right edges
      ctx.fillStyle = '#78350f';
      ctx.fillRect(2, 4, 6, 28);
      ctx.fillRect(24, 4, 6, 28);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(3, 6, 4, 24);
      ctx.fillRect(25, 6, 4, 24);
    } else {
      // Closed Shoji sliding doors
      ctx.fillStyle = '#fef3c7'; // Translucent washi paper panels
      ctx.fillRect(4, 4, 24, 28);

      // Cedar wood lattice grid (Kumiko 組子)
      ctx.fillStyle = '#78350f';
      // Center split seam between doors
      ctx.fillRect(15, 4, 2, 28);
      // Outer door frames
      ctx.strokeRect(4.5, 4.5, 11, 27);
      ctx.strokeRect(16.5, 4.5, 11, 27);
      // Horizontal lattice bars
      for (let y = 8; y <= 28; y += 5) {
        ctx.fillRect(4, y, 24, 1);
      }
      // Vertical inner lattice
      ctx.fillRect(9, 4, 1, 28);
      ctx.fillRect(22, 4, 1, 28);

      // Circular bronze recessed door pulls (Hikite 引手)
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(13, 17, 2, 0, Math.PI * 2);
      ctx.arc(19, 17, 2, 0, Math.PI * 2);
      ctx.fill();

      // Heavy wooden crossbar lock (Kannuki 閂) across the middle
      ctx.fillStyle = '#451a03';
      ctx.fillRect(6, 15, 20, 4);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(7, 16, 18, 2);
      // Iron brackets on crossbar
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(5, 14, 3, 6);
      ctx.fillRect(24, 14, 3, 6);
      ctx.fillRect(14, 14, 4, 6);
    }

  } else {
    // ==========================================
    // ROOM 1: AKIHABARA NOREN & ELECTRONIC SHUTTER (暖簾・シャッター)
    // ==========================================
    // Metal arcade doorway frame
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#334155';
    ctx.fillRect(2, 2, 28, 30);

    if (isUnlocked) {
      // Shutter rolled up into ceiling, bright neon passage open!
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(4, 4, 24, 28);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(6, 6, 20, 26);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(10, 8, 12, 3); // Green cleared indicator

      // Sparkles
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(12, 12, 3, 3);
      ctx.fillRect(18, 18, 3, 3);
    } else {
      // Corrugated electronic shutter
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(4, 10, 24, 22);
      // Horizontal shutter ridges
      ctx.fillStyle = '#334155';
      for (let y = 12; y < 32; y += 3) {
        ctx.fillRect(4, y, 24, 1);
      }

      // Electronic Keypad Lock in center
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(12, 16, 8, 8);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(13, 17, 6, 6);
      ctx.fillStyle = '#ef4444'; // Red locked blinking LED
      ctx.fillRect(15, 19, 2, 2);
    }

    // Traditional Indigo Noren Curtain (暖簾) draped across top
    ctx.fillStyle = '#1e3a8a'; // Deep Japanese Indigo (Aizome 藍染)
    ctx.fillRect(4, 2, 24, 9);
    // Three separate slits in Noren
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(11, 6, 1, 5);
    ctx.fillRect(20, 6, 1, 5);
    // White crest/kanji accent on Noren
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 4, 2, 3);
    ctx.fillRect(15, 4, 2, 3);
    ctx.fillRect(23, 4, 2, 3);
  }

  assetCache.set(key, canvas);
  return canvas;
}

/**
 * Generates an interactable object sprite (32x32) tailored specifically to each game
 */
export function getInteractableSprite(type: string, minigameType?: string): HTMLCanvasElement {
  const key = `prop_${type}_${minigameType || 'default'}`;
  if (assetCache.has(key)) return assetCache.get(key)!;

  const { canvas, ctx } = createCrispCanvas(32, 32);

  // Base shadow beneath all props
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(3, 27, 26, 4);

  // Specific Game Visuals
  if (minigameType === 'darts') {
    // Precision Dart Board on Easel Stand
    // Wooden easel legs
    ctx.fillStyle = '#78350f';
    ctx.fillRect(6, 18, 3, 12);
    ctx.fillRect(23, 18, 3, 12);
    ctx.fillRect(15, 20, 2, 10);
    // Square wooden backing
    ctx.fillStyle = '#451a03';
    ctx.fillRect(5, 2, 22, 22);
    // Dartboard outer ring
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(16, 13, 10, 0, Math.PI * 2);
    ctx.fill();
    // Green ring
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(16, 13, 7.5, 0, Math.PI * 2);
    ctx.fill();
    // Red ring
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(16, 13, 5, 0, Math.PI * 2);
    ctx.fill();
    // Bullseye gold
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(16, 13, 2, 0, Math.PI * 2);
    ctx.fill();
    // Dart stuck in board
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(17, 11, 4, 1);
    ctx.fillStyle = '#38bdf8'; // fletching
    ctx.fillRect(20, 10, 2, 3);

  } else if (minigameType === 'angry_birds') {
    // Slingshot / Trajectory Catapult
    // Heavy wooden timber base
    ctx.fillStyle = '#451a03';
    ctx.fillRect(6, 24, 20, 5);
    // Vertical post
    ctx.fillStyle = '#78350f';
    ctx.fillRect(14, 14, 4, 11);
    // Y-fork arms
    ctx.fillRect(8, 6, 4, 10);
    ctx.fillRect(20, 6, 4, 10);
    // Elastic slingshot rubber band
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, 8);
    ctx.lineTo(16, 14);
    ctx.lineTo(22, 8);
    ctx.stroke();
    // Loaded Red Projectile (Angry Bird orb)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(16, 13, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#facc15'; // beak
    ctx.fillRect(17, 12, 2, 2);

  } else if (minigameType === 'lane_runner') {
    // Holographic 3-Lane Escape Runway Simulator
    // Futuristic metal projector pedestal
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(4, 18, 24, 11);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(6, 20, 20, 7);
    // Glowing cyan emitters
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(8, 22, 3, 3);
    ctx.fillRect(21, 22, 3, 3);
    // Holographic 3-lane road projection
    ctx.fillStyle = 'rgba(14, 165, 233, 0.25)';
    ctx.beginPath();
    ctx.moveTo(10, 18);
    ctx.lineTo(6, 4);
    ctx.lineTo(26, 4);
    ctx.lineTo(22, 18);
    ctx.fill();
    // Lane dividers
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(12, 4);
    ctx.lineTo(14, 18);
    ctx.moveTo(20, 4);
    ctx.lineTo(18, 18);
    ctx.stroke();
    ctx.setLineDash([]);
    // Speed arrows
    ctx.fillStyle = '#facc15';
    ctx.fillRect(15, 8, 2, 4);
    ctx.fillRect(14, 10, 4, 1);

  } else if (minigameType === 'sea_battle') {
    // Naval Sonar Radar Station
    // Radar console body
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, 4, 24, 25);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(6, 6, 20, 21);
    // Circular Green Radar Display
    ctx.fillStyle = '#022c22';
    ctx.beginPath();
    ctx.arc(16, 16, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(16, 16, 7, 0, Math.PI * 2);
    ctx.arc(16, 16, 4, 0, Math.PI * 2);
    ctx.stroke();
    // Radar sweep line
    ctx.beginPath();
    ctx.moveTo(16, 16);
    ctx.lineTo(22, 11);
    ctx.stroke();
    // Battleship contact blip
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(19, 13, 2, 2);
    // Control knobs
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(8, 25, 3, 2);
    ctx.fillRect(14, 25, 4, 2);
    ctx.fillRect(21, 25, 3, 2);

  } else if (minigameType === 'rock_paper_scissors') {
    // Janken Guardian Pedestal
    // Ancient stone plinth
    ctx.fillStyle = '#334155';
    ctx.fillRect(5, 12, 22, 17);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(7, 14, 18, 13);
    // Carved rock fist on left
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(9, 16, 5, 5);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(10, 15, 4, 2);
    // Carved open palm on right
    ctx.fillStyle = '#facc15';
    ctx.fillRect(18, 16, 5, 5);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(17, 15, 6, 2);
    // Ceremonial Torii top crest
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(4, 4, 24, 3);
    ctx.fillRect(2, 2, 28, 2);
    // Twin hanging shrine lanterns
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(6, 7, 3, 4);
    ctx.fillRect(23, 7, 3, 4);

  } else if (minigameType === 'pong') {
    // Retro Pong Terminal
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(4, 4, 24, 25);
    ctx.fillStyle = '#000000';
    ctx.fillRect(6, 6, 20, 16);
    // Green Pong screen
    ctx.fillStyle = '#22c55e';
    // Left paddle
    ctx.fillRect(8, 11, 2, 6);
    // Right paddle
    ctx.fillRect(22, 13, 2, 6);
    // Net dots
    ctx.fillRect(15, 7, 2, 2);
    ctx.fillRect(15, 11, 2, 2);
    ctx.fillRect(15, 15, 2, 2);
    ctx.fillRect(15, 19, 2, 2);
    // Ball
    ctx.fillRect(18, 12, 2, 2);
    // Two controller dials below screen
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(9, 24, 4, 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(19, 24, 4, 3);

  } else if (minigameType === 'sliding_puzzle') {
    // 4x4 Sliding Puzzle Box
    ctx.fillStyle = '#78350f';
    ctx.fillRect(4, 4, 24, 25);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(6, 6, 20, 20);
    // 4x4 tile matrix
    const tileColors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899'];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (r === 3 && c === 3) continue; // empty slot!
        ctx.fillStyle = tileColors[(r + c) % 4];
        ctx.fillRect(7 + c * 4.6, 7 + r * 4.6, 4, 4);
      }
    }
    // Brass corner braces
    ctx.fillStyle = '#fde047';
    ctx.fillRect(4, 4, 3, 3);
    ctx.fillRect(25, 4, 3, 3);
    ctx.fillRect(4, 26, 3, 3);
    ctx.fillRect(25, 26, 3, 3);

  } else if (minigameType === 'wall_breaker') {
    // Wall Breaker / Arkanoid Cabinet
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(4, 3, 24, 26);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(6, 5, 20, 18);
    // Brick rows
    const bColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = bColors[i];
      ctx.fillRect(8, 7 + i * 2.5, 16, 2);
    }
    // Ball
    ctx.fillStyle = '#facc15';
    ctx.fillRect(15, 17, 2, 2);
    // Paddle
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(12, 20, 8, 2);

  } else if (minigameType === 'match3') {
    // Elemental Conduit with glowing Kana jewel orbs
    ctx.fillStyle = '#475569';
    ctx.fillRect(6, 16, 20, 13);
    // Crystal pillar
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(9, 4, 14, 14);
    ctx.fillStyle = '#a5b4fc';
    ctx.fillRect(11, 6, 10, 10);
    // 5 jewel gems
    ctx.fillStyle = '#ef4444'; ctx.fillRect(11, 8, 3, 3);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(17, 8, 3, 3);
    ctx.fillStyle = '#10b981'; ctx.fillRect(14, 11, 3, 3);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(11, 14, 3, 3);
    ctx.fillStyle = '#a855f7'; ctx.fillRect(17, 14, 3, 3);

  } else if (minigameType === 'nuts_and_bolts') {
    // Mechanical Lockbox with Bolts & Plates
    ctx.fillStyle = '#334155';
    ctx.fillRect(4, 6, 24, 23);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(6, 8, 20, 19);
    // Hanging metal plates
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(8, 11, 16, 5);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(8, 18, 16, 5);
    // Screws / Hex bolts
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(9, 12, 3, 3);
    ctx.fillRect(20, 12, 3, 3);
    ctx.fillRect(9, 19, 3, 3);
    ctx.fillRect(20, 19, 3, 3);

  } else if (minigameType === 'tic_tac_toe') {
    // Scholar's Game Board
    ctx.fillStyle = '#78350f';
    ctx.fillRect(4, 6, 24, 23);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(6, 8, 20, 19);
    // 3x3 Grid lines
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, 9); ctx.lineTo(12, 26);
    ctx.moveTo(19, 9); ctx.lineTo(19, 26);
    ctx.moveTo(7, 14); ctx.lineTo(25, 14);
    ctx.moveTo(7, 20); ctx.lineTo(25, 20);
    ctx.stroke();
    // Blue X and Red O pieces
    ctx.fillStyle = '#38bdf8'; // X
    ctx.fillRect(8, 10, 3, 3);
    ctx.fillStyle = '#ef4444'; // O
    ctx.fillRect(14, 15, 3, 3);

  } else if (minigameType === 'dots_and_boxes') {
    // Paper Crane Perch / Territory Grid
    ctx.fillStyle = '#78350f';
    ctx.fillRect(5, 10, 22, 19);
    ctx.fillStyle = '#fef3c7'; // parchment table
    ctx.fillRect(7, 12, 18, 15);
    // 3x3 Dots
    ctx.fillStyle = '#b45309';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(9 + c * 6, 14 + r * 5, 2, 2);
      }
    }
    // Origami Paper Crane on top
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(16, 4);
    ctx.lineTo(11, 10);
    ctx.lineTo(21, 10);
    ctx.fill();

  } else if (minigameType === 'card_match') {
    // Pair Memory Array
    ctx.fillStyle = '#831843'; // crimson velvet table
    ctx.fillRect(4, 6, 24, 23);
    ctx.fillStyle = '#9f1239';
    ctx.fillRect(6, 8, 20, 19);
    // Playing cards face down with gold backs
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(8 + c * 6, 10 + r * 8, 4, 6);
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(9 + c * 6, 11 + r * 8, 2, 4);
      }
    }

  } else if (minigameType === 'flappy') {
    // Drone Helipad Pad
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, 12, 24, 17);
    // Helipad circle
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(16, 20, 8, 0, Math.PI * 2);
    ctx.stroke();
    // 'H' mark
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(13, 17, 2, 6);
    ctx.fillRect(17, 17, 2, 6);
    ctx.fillRect(14, 19, 4, 2);
    // Mini drone craft
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(14, 9, 4, 3);
    ctx.fillStyle = '#ef4444'; // rotors
    ctx.fillRect(10, 8, 4, 1);
    ctx.fillRect(18, 8, 4, 1);

  } else if (type === 'arcade') {
    // Neon retro arcade cabinet (2048)
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(4, 2, 24, 28);
    ctx.fillStyle = '#c026d3';
    ctx.fillRect(6, 4, 20, 5); // marquee
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(6, 10, 20, 10);
    // 2048 grid
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(8, 12, 4, 4);
    ctx.fillStyle = '#eab308'; ctx.fillRect(14, 14, 4, 4);
    ctx.fillStyle = '#ec4899'; ctx.fillRect(20, 11, 3, 3);
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(4, 20, 24, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(8, 19, 2, 2);

  } else if (type === 'safe' || minigameType === 'timed_code') {
    // Iron Safe
    ctx.fillStyle = '#475569';
    ctx.fillRect(4, 6, 24, 24);
    ctx.fillStyle = '#334155';
    ctx.fillRect(6, 8, 20, 20);
    // Dial & keypad
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(16, 18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(15, 17, 2, 2);
    // LED display
    ctx.fillStyle = '#10b981';
    ctx.fillRect(10, 10, 12, 3);

  } else if (type === 'terminal' || type === 'computer' || minigameType === 'pattern_memory') {
    // Workstation terminal with 3x3 light-up matrix
    ctx.fillStyle = '#78350f';
    ctx.fillRect(2, 16, 28, 14);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(6, 4, 20, 13);
    ctx.fillStyle = '#022c22';
    ctx.fillRect(8, 6, 16, 9);
    // 3x3 pattern memory buttons
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#22c55e' : '#15803d';
        ctx.fillRect(10 + c * 4, 7 + r * 2.5, 2, 2);
      }
    }

  } else if (type === 'terrarium' || minigameType === 'snake') {
    // Glass cylinder terrarium with coiling snake
    ctx.fillStyle = '#334155';
    ctx.fillRect(6, 2, 20, 4);
    ctx.fillRect(6, 26, 20, 6);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.fillRect(8, 6, 16, 20);
    // Green cyber snake
    ctx.fillStyle = '#10b981';
    ctx.fillRect(12, 10, 8, 3);
    ctx.fillRect(17, 13, 3, 6);
    ctx.fillRect(10, 19, 10, 3);
    // Red apple
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(11, 14, 3, 3);

  } else if (type === 'switchboard' || minigameType === 'color_match') {
    // Circuit breaker with colored patch wires
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, 4, 24, 24);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(6, 6, 20, 20);
    // Terminals
    ctx.fillStyle = '#ef4444'; ctx.fillRect(8, 9, 3, 3);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(8, 15, 3, 3);
    ctx.fillStyle = '#10b981'; ctx.fillRect(8, 21, 3, 3);
    ctx.fillStyle = '#eab308'; ctx.fillRect(21, 9, 3, 3);
    ctx.fillStyle = '#a855f7'; ctx.fillRect(21, 15, 3, 3);
    ctx.fillStyle = '#06b6d4'; ctx.fillRect(21, 21, 3, 3);
    // Cross connecting wires
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath(); ctx.moveTo(11, 10); ctx.lineTo(21, 16); ctx.stroke();
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath(); ctx.moveTo(11, 16); ctx.lineTo(21, 10); ctx.stroke();

  } else if (type === 'altar' || minigameType === 'kana_catcher') {
    // Shrine Water Basin with sakura petals
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(4, 4, 24, 3);
    ctx.fillRect(2, 2, 28, 2);
    ctx.fillRect(6, 7, 3, 21);
    ctx.fillRect(23, 7, 3, 21);
    ctx.fillStyle = '#475569';
    ctx.fillRect(9, 16, 14, 12);
    ctx.fillStyle = '#38bdf8'; // sacred water
    ctx.fillRect(11, 18, 10, 4);
    // Floating sakura petals
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(12, 19, 2, 2);
    ctx.fillRect(16, 20, 2, 2);

  } else {
    // Default Chest
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(4, 10, 24, 18);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(4, 8, 24, 6);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(14, 16, 4, 4);
  }

  assetCache.set(key, canvas);
  return canvas;
}

/**
 * Generates decorative prop sprite
 */
export function getDecorationSprite(type: string, roomId: string = 'room-1'): HTMLCanvasElement {
  const key = `deco_${type}_${roomId}`;
  if (assetCache.has(key)) return assetCache.get(key)!;

  const { canvas, ctx } = createCrispCanvas(16, 16);

  if (type === 'plant') {
    // Authentic Japanese Bonsai Tree (盆栽)
    // Ceramic bonsai pot
    ctx.fillStyle = '#451a03';
    ctx.fillRect(3, 11, 10, 5);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(2, 10, 12, 2);

    // Gnarled wooden trunk & branches
    ctx.fillStyle = '#5c2d12';
    ctx.fillRect(7, 7, 2, 4);
    ctx.fillRect(6, 6, 3, 2);
    ctx.fillRect(4, 5, 3, 2);
    ctx.fillRect(9, 5, 3, 2);

    // Lush pine needle tufts
    ctx.fillStyle = '#14532d';
    ctx.fillRect(2, 3, 5, 3);
    ctx.fillRect(8, 3, 6, 3);
    ctx.fillRect(5, 1, 6, 4);
    ctx.fillStyle = '#16a34a'; // needle highlights
    ctx.fillRect(3, 3, 3, 1);
    ctx.fillRect(9, 3, 4, 1);
    ctx.fillRect(6, 2, 4, 1);

  } else if (type === 'window') {
    // Traditional Japanese Shoji Screen Window (障子窓)
    ctx.fillStyle = roomId === 'room-3' ? '#fbcfe8' : (roomId === 'room-2' ? '#fef3c7' : '#38bdf8');
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = '#451a03'; // Cedar frame
    ctx.strokeRect(0.5, 0.5, 15, 15);
    ctx.fillRect(7, 0, 2, 16);
    ctx.fillRect(0, 7, 16, 2);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(3, 0, 1, 16);
    ctx.fillRect(12, 0, 1, 16);
    ctx.fillRect(0, 3, 16, 1);
    ctx.fillRect(0, 12, 16, 1);

  } else if (type === 'table') {
    return getTableSprite(roomId, 2, 1.5);
  } else {
    // Japanese Wooden Storage Chest / Tansu (箪笥)
    ctx.fillStyle = '#451a03';
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(2, 2, 12, 12);
    // Drawers with black iron pulls
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(3, 7, 10, 1);
    ctx.fillRect(7, 4, 2, 1);
    ctx.fillRect(7, 10, 2, 1);
  }

  assetCache.set(key, canvas);
  return canvas;
}

/**
 * Generates an unmistakable 3D/isometric wooden display table sprite
 * width: widthTiles * 16 (default 32px), height: heightTiles * 16 (default 24px)
 */
export function getTableSprite(roomId: string = 'room-1', widthTiles: number = 2, heightTiles: number = 1.5): HTMLCanvasElement {
  const w = Math.round(widthTiles * 16);
  const h = Math.round(heightTiles * 16);
  const key = `table_${roomId}_${w}_${h}`;
  if (assetCache.has(key)) return assetCache.get(key)!;

  const { canvas, ctx } = createCrispCanvas(w, h);

  // Palettes per chamber theme
  let woodBase = '#78350f';
  let woodSurface = '#b45309';
  let woodBevel = '#f59e0b';
  let woodShadow = '#451a03';
  let legColor = '#572208';
  let legHighlight = '#92400e';
  let cornerAccent = '#94a3b8'; // steel accents in workshop

  if (roomId === 'room-2') {
    // Japanese Hinoki Cypress tea & scholar table
    woodBase = '#854d0e';
    woodSurface = '#ca8a04';
    woodBevel = '#fef08a';
    woodShadow = '#542d07';
    legColor = '#653a09';
    legHighlight = '#a16207';
    cornerAccent = '#d97706';
  } else if (roomId === 'room-3') {
    // Sacred Vermilion & Gold Lacquer ceremonial altar table
    woodBase = '#881337';
    woodSurface = '#b91c1c';
    woodBevel = '#fbbf24';
    woodShadow = '#4c0519';
    legColor = '#630a24';
    legHighlight = '#991b1b';
    cornerAccent = '#facc15';
  }

  // 1. Soft Floor Contact Shadows under table legs
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(2, h - 3, 5, 3);
  ctx.fillRect(w - 7, h - 3, 5, 3);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(4, h - 4, w - 8, 2);

  // 2. Back Legs (receded in depth, shadowed)
  ctx.fillStyle = woodShadow;
  ctx.fillRect(3, 8, 3, h - 11);
  ctx.fillRect(w - 6, 8, 3, h - 11);

  // Back cross-stretcher bar
  ctx.fillStyle = woodShadow;
  ctx.fillRect(4, 13, w - 8, 2);

  // 3. Front Legs (sturdy, carved, foreground perspective)
  ctx.fillStyle = legColor;
  ctx.fillRect(2, 9, 4, h - 11);
  ctx.fillRect(w - 6, 9, 4, h - 11);
  // Leg highlights on front corner
  ctx.fillStyle = legHighlight;
  ctx.fillRect(2, 9, 1, h - 11);
  ctx.fillRect(w - 6, 9, 1, h - 11);
  // Foot pads
  ctx.fillStyle = cornerAccent;
  ctx.fillRect(2, h - 4, 4, 2);
  ctx.fillRect(w - 6, h - 4, 4, 2);

  // Lower front stretcher rail
  ctx.fillStyle = woodBase;
  ctx.fillRect(5, h - 8, w - 10, 2);
  ctx.fillStyle = woodShadow;
  ctx.fillRect(5, h - 6, w - 10, 1);

  // 4. Apron / Skirt beneath tabletop
  ctx.fillStyle = woodShadow;
  ctx.fillRect(2, 7, w - 4, 3);

  // 5. Solid Horizontal Tabletop (Top-down 3/4 perspective)
  // Tabletop Thickness Edge (Facing camera)
  ctx.fillStyle = woodBase;
  ctx.fillRect(1, 6, w - 2, 3);
  ctx.fillStyle = woodShadow;
  ctx.fillRect(1, 8, w - 2, 1);

  // Tabletop Main Upper Surface
  ctx.fillStyle = woodSurface;
  ctx.fillRect(1, 1, w - 2, 6);

  // Wood Grain Streaks across tabletop
  ctx.fillStyle = woodBase;
  ctx.fillRect(4, 3, w - 8, 1);
  ctx.fillRect(8, 5, w - 14, 1);

  // Top Bevel Rim Highlights (Polished luster)
  ctx.fillStyle = woodBevel;
  ctx.fillRect(1, 1, w - 2, 1);
  ctx.fillRect(1, 2, 1, 5);

  // Metal / Gold Corner Braces
  ctx.fillStyle = cornerAccent;
  ctx.fillRect(1, 1, 2, 2);
  ctx.fillRect(w - 3, 1, 2, 2);
  ctx.fillRect(1, 6, 2, 2);
  ctx.fillRect(w - 3, 6, 2, 2);

  assetCache.set(key, canvas);
  return canvas;
}
