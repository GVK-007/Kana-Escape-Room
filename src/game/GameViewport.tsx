import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RoomData, CharacterId, InteractableObject } from '../types/game';
import {
  getCharacterSprite,
  CharacterDirection,
  getFloorTile,
  getWallTile,
  getDoorSprite,
  getInteractableSprite,
  getDecorationSprite,
  getTableSprite,
} from '../utils/pixelArt';
import { JAPANESE_DICTIONARY } from '../data/dictionary';
import { sounds } from '../utils/audio';
import { AtmosphericSystem } from './AtmosphericEffects';
import { useDeviceMode } from '../utils/useDeviceMode';
import { getRoomTheme } from '../utils/theme';
import { VirtualJoystick } from '../components/ui/VirtualJoystick';

interface GameViewportProps {
  room: RoomData;
  characterId: CharacterId;
  isDoorUnlocked: boolean;
  completedMinigames: string[];
  isLocked?: boolean;
  isFrozen?: boolean;
  onInteract: (obj: InteractableObject) => void;
  onInteractDoor: () => void;
  onReturnToPrevRoom?: () => void;
  onOpenInventory: () => void;
  onOpenPauseMenu: () => void;
  onDebugUnlockDoor?: () => void;
  onDebugGiveKana?: () => void;
  displayedItems?: Record<string, string[]>;
  onInteractTable?: (tableId: string) => void;
  spawnDirection?: 'forward' | 'backward';
}

const TILE_SIZE = 16;
const DEFAULT_SCALE = 2.5;
const PLAYER_SPEED = 2.0; // Balanced 16-pixel tile walking pace

const GameViewportComponent: React.FC<GameViewportProps> = ({
  room,
  characterId,
  isDoorUnlocked,
  completedMinigames,
  isLocked = false,
  isFrozen = false,
  onInteract,
  onInteractDoor,
  onReturnToPrevRoom,
  onOpenInventory,
  onOpenPauseMenu,
  onDebugUnlockDoor,
  onDebugGiveKana,
  displayedItems,
  onInteractTable,
  spawnDirection = 'forward',
}) => {
  const device = useDeviceMode();
  const theme = getRoomTheme(room.id);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Player position in pixels (relative to room)
  const playerRef = useRef({
    x: room.playerSpawn.x * TILE_SIZE,
    y: room.playerSpawn.y * TILE_SIZE,
    dir: 'down' as CharacterDirection,
    moving: false,
    frame: 0,
    animTimer: 0,
    stepTimer: 0,
    bumpCooldown: 0,
  });

  const [nearbyInteractable, setNearbyInteractable] = useState<InteractableObject | null>(null);
  const [nearbyTableId, setNearbyTableId] = useState<string | null>(null);
  const [isNearDoor, setIsNearDoor] = useState(false);
  const [isNearEntrance, setIsNearEntrance] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [controlType, setControlType] = useState<'joystick' | 'dpad' | 'tap'>('joystick');
  const [showTouchControls, setShowTouchControls] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
  });

  const keysRef = useRef<Record<string, boolean>>({});
  const joystickVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeDpadPointerRef = useRef<number | null>(null);
  const tapTargetRef = useRef<{ x: number; y: number } | null>(null);
  const tapRippleRef = useRef<{ x: number; y: number; radius: number; alpha: number } | null>(null);
  const camOffsetRef = useRef<{ x: number; y: number; scale: number }>({ x: 0, y: 0, scale: DEFAULT_SCALE });
  const atmosphereRef = useRef<AtmosphericSystem>(new AtmosphericSystem());

  const processDpadCoords = (clientX: number, clientY: number, container: HTMLElement) => {
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) {
      joystickVectorRef.current = { x: 0, y: 0 };
      return;
    }
    const angle = Math.atan2(dy, dx);
    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const snapX = Math.round(Math.cos(snapAngle));
    const snapY = Math.round(Math.sin(snapAngle));
    const mag = Math.hypot(snapX, snapY) || 1;
    joystickVectorRef.current = { x: snapX / mag, y: snapY / mag };
  };

  const handleDpadPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) return;
    e.preventDefault();
    e.stopPropagation();
    activeDpadPointerRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    processDpadCoords(e.clientX, e.clientY, e.currentTarget);
  };

  const handleDpadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeDpadPointerRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    processDpadCoords(e.clientX, e.clientY, e.currentTarget);
  };

  const handleDpadPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeDpadPointerRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    activeDpadPointerRef.current = null;
    joystickVectorRef.current = { x: 0, y: 0 };
  };

  const setVirtualKey = (code: string, pressed: boolean) => {
    if (isLocked) return;
    keysRef.current[code] = pressed;
  };

  const handleVirtualInteract = () => {
    if (isLocked) return;
    if (isNearEntrance && onReturnToPrevRoom) {
      onReturnToPrevRoom();
    } else if (isNearDoor) {
      onInteractDoor();
    } else if (nearbyInteractable) {
      onInteract(nearbyInteractable);
    } else if (nearbyTableId && onInteractTable) {
      onInteractTable(nearbyTableId);
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isLocked) return;
    if (controlType !== 'tap') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const canvasX = (cssX / rect.width) * canvas.width;
    const canvasY = (cssY / rect.height) * canvas.height;

    const scale = camOffsetRef.current.scale || device.scale || DEFAULT_SCALE;
    const worldX = (canvasX / scale) - camOffsetRef.current.x;
    const worldY = (canvasY / scale) - camOffsetRef.current.y;

    tapTargetRef.current = { x: worldX, y: worldY };
    tapRippleRef.current = { x: worldX, y: worldY, radius: 2, alpha: 1.0 };
    sounds.playBlip(720);
  };

  // Reset player position and atmospheric effects when room changes
  useEffect(() => {
    if (spawnDirection === 'backward' && room.exitDoor) {
      // Transport to the top of the room (where player came from), facing down
      playerRef.current.x = (room.exitDoor.x + (room.exitDoor.width || 2) / 2 - 0.5) * TILE_SIZE;
      playerRef.current.y = (room.exitDoor.y + (room.exitDoor.height || 2) + 0.2) * TILE_SIZE;
      playerRef.current.dir = 'down';
    } else {
      playerRef.current.x = room.playerSpawn.x * TILE_SIZE;
      playerRef.current.y = room.playerSpawn.y * TILE_SIZE;
      playerRef.current.dir = 'down';
    }
    tapTargetRef.current = null;
    tapRippleRef.current = null;
    const isPortrait = device.orientation === 'portrait';
    const initScale = isPortrait
      ? (room.id === 'room-3' || room.number === 3 ? 2.10 : (room.id === 'room-2' || room.number === 2 ? 2.35 : 2.85))
      : (device.scale || DEFAULT_SCALE);
    camOffsetRef.current.scale = initScale;
    atmosphereRef.current.init(room.id, room.width, room.height, TILE_SIZE);
  }, [room, spawnDirection, device.orientation, device.scale]);

  // When locked (minigame or modal active), clear keys and stop movement
  useEffect(() => {
    if (isLocked) {
      keysRef.current = {};
      joystickVectorRef.current = { x: 0, y: 0 };
      tapTargetRef.current = null;
      tapRippleRef.current = null;
      playerRef.current.moving = false;
      playerRef.current.frame = 0;
      setNearbyInteractable(null);
      setNearbyTableId(null);
      setIsNearDoor(false);
      setIsNearEntrance(false);
    }
  }, [isLocked]);

  // Key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked) {
        keysRef.current = {};
        return;
      }

      keysRef.current[e.code] = true;

      if (e.code === 'KeyE') {
        e.preventDefault();
        if (isNearEntrance && onReturnToPrevRoom) {
          onReturnToPrevRoom();
        } else if (isNearDoor) {
          onInteractDoor();
        } else if (nearbyInteractable) {
          onInteract(nearbyInteractable);
        } else if (nearbyTableId && onInteractTable) {
          onInteractTable(nearbyTableId);
        }
      } else if (e.code === 'KeyI') {
        e.preventDefault();
        onOpenInventory();
      } else if (e.code === 'F1') {
        e.preventDefault();
        setDebugMode((d) => !d);
      } else if (e.code === 'F3' && onDebugGiveKana) {
        e.preventDefault();
        onDebugGiveKana();
      } else if (e.code === 'F4' && onDebugUnlockDoor) {
        e.preventDefault();
        onDebugUnlockDoor();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isLocked) {
        keysRef.current = {};
        return;
      }
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isLocked, isNearDoor, isNearEntrance, nearbyInteractable, onInteract, onInteractDoor, onReturnToPrevRoom, onOpenInventory, onOpenPauseMenu, onDebugGiveKana, onDebugUnlockDoor]);

  // Check collision with solid environmental objects & walls
  const isSolid = useCallback((px: number, py: number): boolean => {
    // Player collision bounding box (12px wide, 8px high centered at player's feet)
    const box = {
      x1: px + 2,
      x2: px + 14,
      y1: py + 16,
      y2: py + 23,
    };

    // Boundary walls (room tiles)
    const minTileX = 1;
    const maxTileX = room.width - 2;
    const minTileY = 2; // wall depth
    const maxTileY = room.height - 2;

    if (
      box.x1 < minTileX * TILE_SIZE ||
      box.x2 > (maxTileX + 1) * TILE_SIZE ||
      box.y1 < minTileY * TILE_SIZE ||
      box.y2 > (maxTileY + 1) * TILE_SIZE
    ) {
      return true;
    }

    // Door collision (if closed)
    if (!isDoorUnlocked) {
      const doorBox = {
        x1: room.exitDoor.x * TILE_SIZE,
        x2: (room.exitDoor.x + room.exitDoor.width) * TILE_SIZE,
        y1: room.exitDoor.y * TILE_SIZE,
        y2: (room.exitDoor.y + room.exitDoor.height) * TILE_SIZE,
      };
      if (
        box.x1 < doorBox.x2 &&
        box.x2 > doorBox.x1 &&
        box.y1 < doorBox.y2 &&
        box.y2 > doorBox.y1
      ) {
        return true;
      }
    }

    // Interactable solid collision boxes
    for (const obj of room.interactables) {
      const objBox = {
        x1: obj.x * TILE_SIZE + 2,
        x2: (obj.x + obj.width) * TILE_SIZE - 2,
        y1: obj.y * TILE_SIZE + 6,
        y2: (obj.y + obj.height) * TILE_SIZE,
      };
      if (
        box.x1 < objBox.x2 &&
        box.x2 > objBox.x1 &&
        box.y1 < objBox.y2 &&
        box.y2 > objBox.y1
      ) {
        return true;
      }
    }

    // Solid decorations
    for (const deco of room.decorations) {
      if (deco.solid) {
        const decoW = (deco.width || 1) * TILE_SIZE;
        const decoH = (deco.height || 1) * TILE_SIZE;
        const dBox = {
          x1: deco.x * TILE_SIZE,
          x2: deco.x * TILE_SIZE + decoW,
          y1: deco.y * TILE_SIZE + 4,
          y2: deco.y * TILE_SIZE + decoH,
        };
        if (
          box.x1 < dBox.x2 &&
          box.x2 > dBox.x1 &&
          box.y1 < dBox.y2 &&
          box.y2 > dBox.y1
        ) {
          return true;
        }
      }
    }

    return false;
  }, [room, isDoorUnlocked]);

  // Offscreen pre-rendered background canvas for 60 FPS performance
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const bg = document.createElement('canvas');
    bg.width = room.width * TILE_SIZE;
    bg.height = room.height * TILE_SIZE;
    const bgCtx = bg.getContext('2d');
    if (!bgCtx) return;
    bgCtx.imageSmoothingEnabled = false;

    // 1. Draw Floor Tiles
    for (let ty = 0; ty < room.height; ty++) {
      for (let tx = 0; tx < room.width; tx++) {
        if (tx > 0 && tx < room.width - 1 && ty > 1 && ty < room.height - 1) {
          const floorTile = getFloorTile(room.floorType, (tx + ty) % 2, room.id);
          bgCtx.drawImage(floorTile, tx * TILE_SIZE, ty * TILE_SIZE);
        }
      }
    }

    // 2. Draw Floor Rugs & Under-decorations (Authentic Japanese Woven Textile Rugs)
    for (const deco of room.decorations) {
      if (!deco.solid && deco.type === 'rug') {
        const w = (deco.width || 4) * TILE_SIZE;
        const h = (deco.height || 3) * TILE_SIZE;
        const rx = deco.x * TILE_SIZE;
        const ry = deco.y * TILE_SIZE;

        // Authentic palette per chamber
        let baseColor = '#0f172a'; // Deep slate navy
        let innerColor = '#1e293b';
        let borderColor = '#06b6d4'; // Cyan neon accent
        let accentColor = '#f59e0b';
        if (room.id === 'room-2') {
          // Ceremonial Ryokan velvet rug
          baseColor = '#7f1d1d'; // Crimson
          innerColor = '#991b1b';
          borderColor = '#d97706'; // Gold brocade
          accentColor = '#fef08a';
        } else if (room.id === 'room-3') {
          // Imperial Sacred Torii Sanctum rug
          baseColor = '#4c0519'; // Deep imperial rose
          innerColor = '#581c87'; // Purple velvet
          borderColor = '#eab308'; // Sacred gold
          accentColor = '#fde047';
        }

        // Soft floor drop shadow around rug perimeter
        bgCtx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        bgCtx.fillRect(rx + 2, ry + 2, w, h);

        // Main woven textile base
        bgCtx.fillStyle = baseColor;
        bgCtx.fillRect(rx, ry, w, h);

        // Outer ornate woven border
        bgCtx.strokeStyle = borderColor;
        bgCtx.lineWidth = 1.5;
        bgCtx.strokeRect(rx + 2, ry + 2, w - 4, h - 4);

        // Inner textile field
        bgCtx.fillStyle = innerColor;
        bgCtx.fillRect(rx + 4, ry + 4, w - 8, h - 8);

        // Decorative corner woven diamonds
        bgCtx.fillStyle = accentColor;
        bgCtx.fillRect(rx + 5, ry + 5, 2, 2);
        bgCtx.fillRect(rx + w - 7, ry + 5, 2, 2);
        bgCtx.fillRect(rx + 5, ry + h - 7, 2, 2);
        bgCtx.fillRect(rx + w - 7, ry + h - 7, 2, 2);

        // Center Medallion (Diamond crest mandala)
        const cx = rx + w / 2;
        const cy = ry + h / 2;
        bgCtx.fillStyle = borderColor;
        bgCtx.beginPath();
        bgCtx.moveTo(cx, cy - 8);
        bgCtx.lineTo(cx + 8, cy);
        bgCtx.lineTo(cx, cy + 8);
        bgCtx.lineTo(cx - 8, cy);
        bgCtx.closePath();
        bgCtx.fill();

        bgCtx.fillStyle = accentColor;
        bgCtx.beginPath();
        bgCtx.moveTo(cx, cy - 4);
        bgCtx.lineTo(cx + 4, cy);
        bgCtx.lineTo(cx, cy + 4);
        bgCtx.lineTo(cx - 4, cy);
        bgCtx.closePath();
        bgCtx.fill();

        // White/cream fringe tassels along top and bottom edges
        bgCtx.fillStyle = '#fef3c7';
        for (let fx = rx + 3; fx < rx + w - 3; fx += 3) {
          bgCtx.fillRect(fx, ry - 1, 1, 2);
          bgCtx.fillRect(fx, ry + h - 1, 1, 2);
        }
      }
    }

    // 3. Draw North Walls & Windows
    for (let tx = 0; tx < room.width; tx++) {
      bgCtx.drawImage(getWallTile(true, room.id), tx * TILE_SIZE, 0);
      bgCtx.drawImage(getWallTile(false, room.id), tx * TILE_SIZE, TILE_SIZE);
    }

    // Draw East & West Wall boundaries
    for (let ty = 2; ty < room.height; ty++) {
      bgCtx.drawImage(getWallTile(false, room.id), 0, ty * TILE_SIZE);
      bgCtx.drawImage(getWallTile(false, room.id), (room.width - 1) * TILE_SIZE, ty * TILE_SIZE);
    }
    // Draw South Wall boundary
    for (let tx = 0; tx < room.width; tx++) {
      bgCtx.drawImage(getWallTile(false, room.id), tx * TILE_SIZE, (room.height - 1) * TILE_SIZE);
    }

    bgCanvasRef.current = bg;
  }, [room]);

  // Main Render & Game Loop
  useEffect(() => {
    if (isFrozen) {
      // Completely freeze background game loop while loading or in modals/minigames
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let animId: number;
    let lastTime = performance.now();
    let accumulator = 0;
    const STEP_MS = 1000 / 60;

    const updateWorld = (dt: number = 1.0) => {
      const player = playerRef.current;
      const keys = keysRef.current;

      // Calculate Movement input (Keyboard + Analog Virtual Joystick)
      let dx = 0;
      let dy = 0;

      if (!isLocked) {
        if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
        if (keys['ArrowDown'] || keys['KeyS']) dy += 1;
        if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) dx += 1;

        if (dx !== 0 || dy !== 0) {
          tapTargetRef.current = null;
          // Normalize diagonal keyboard speed
          if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
          }
        } else if (joystickVectorRef.current.x !== 0 || joystickVectorRef.current.y !== 0) {
          tapTargetRef.current = null;
          // Read smooth touch analog joystick vector
          dx = joystickVectorRef.current.x;
          dy = joystickVectorRef.current.y;
        } else if (controlType === 'tap' && tapTargetRef.current) {
          const targetDist = Math.hypot(
            tapTargetRef.current.x - (player.x + 8),
            tapTargetRef.current.y - (player.y + 16)
          );
          if (targetDist < 4) {
            tapTargetRef.current = null;
          } else {
            dx = (tapTargetRef.current.x - (player.x + 8)) / targetDist;
            dy = (tapTargetRef.current.y - (player.y + 16)) / targetDist;
          }
        }
      }

      const mag = Math.hypot(dx, dy);
      const isMoving = !isLocked && mag > 0.15;
      player.moving = isMoving;

      if (player.bumpCooldown > 0) {
        player.bumpCooldown -= dt;
      }

      if (isMoving) {
        // 8-directional facing angle based on continuous vector angle
        const angle = Math.atan2(dy, dx);
        if (angle >= -Math.PI / 8 && angle <= Math.PI / 8) {
          player.dir = 'right';
        } else if (angle > Math.PI / 8 && angle <= (3 * Math.PI) / 8) {
          player.dir = 'down-right';
        } else if (angle > (3 * Math.PI) / 8 && angle <= (5 * Math.PI) / 8) {
          player.dir = 'down';
        } else if (angle > (5 * Math.PI) / 8 && angle <= (7 * Math.PI) / 8) {
          player.dir = 'down-left';
        } else if (angle > (7 * Math.PI) / 8 || angle < (-7 * Math.PI) / 8) {
          player.dir = 'left';
        } else if (angle >= (-7 * Math.PI) / 8 && angle < (-5 * Math.PI) / 8) {
          player.dir = 'up-left';
        } else if (angle >= (-5 * Math.PI) / 8 && angle < (-3 * Math.PI) / 8) {
          player.dir = 'up';
        } else {
          player.dir = 'up-right';
        }

        // Step cadence: subtle shift between push-off (frames 0, 2) and plant (frames 1, 3)
        const stepPulse = player.frame % 2 === 0 ? 1.10 : 0.90;
        const currentSpeed = PLAYER_SPEED * Math.min(mag, 1.0) * stepPulse * dt;

        // Apply movement with axis slide
        const nextX = player.x + (dx / mag) * currentSpeed;
        const nextY = player.y + (dy / mag) * currentSpeed;

        let movedX = false;
        let movedY = false;

        if (!isSolid(nextX, player.y)) {
          player.x = nextX;
          movedX = true;
        }
        if (!isSolid(player.x, nextY)) {
          player.y = nextY;
          movedY = true;
        }

        // Bumping sound: triggered when pushing into an impassable obstacle/wall
        const blockedX = dx !== 0 && !movedX;
        const blockedY = dy !== 0 && !movedY;
        const isBumping = (!movedX && !movedY) || (dx !== 0 && dy === 0 && blockedX) || (dy !== 0 && dx === 0 && blockedY);

        if (isBumping && tapTargetRef.current) {
          tapTargetRef.current = null;
        }

        if (isBumping && player.bumpCooldown <= 0) {
          sounds.playBump();
          player.bumpCooldown = 18; // ~300ms cooldown for crisp impact feel
        }

        // Only animate stride if character actually displaced
        if (movedX || movedY) {
          player.animTimer += dt;
          if (player.animTimer >= 7) {
            player.animTimer = 0;
            const nextStep = (player.frame + 1) % 4;
            player.frame = nextStep;

            // Trigger footstep sound precisely on foot contact down-steps (1 and 3)
            if (nextStep === 1 || nextStep === 3) {
              sounds.playFootstep(room.floorType);
            }
          }
        } else {
          // Standing against an obstacle: halt feet on neutral ground
          player.moving = false;
          player.frame = 0;
          player.animTimer = 0;
        }
      } else {
        // Idle breathing bob
        player.animTimer += dt;
        if (player.animTimer > 25) {
          player.animTimer = 0;
          player.frame = (player.frame + 1) % 2;
        }
      }

      // Check Nearby Interactions (only if not locked)
      if (!isLocked) {
        const playerCenterX = player.x + 8;
        const playerCenterY = player.y + 16;

        // Door distance
        const doorCenterX = (room.exitDoor.x + room.exitDoor.width / 2) * TILE_SIZE;
        const doorCenterY = (room.exitDoor.y + room.exitDoor.height / 2) * TILE_SIZE;
        const distToDoor = Math.hypot(playerCenterX - doorCenterX, playerCenterY - doorCenterY);
        const nearDoorNow = distToDoor < 34;
        setIsNearDoor((prev) => (prev !== nearDoorNow ? nearDoorNow : prev));

        // Entrance door distance (if room has entranceDoor)
        if (room.entranceDoor) {
          const entranceCenterX = (room.entranceDoor.x + room.entranceDoor.width / 2) * TILE_SIZE;
          const entranceCenterY = (room.entranceDoor.y + room.entranceDoor.height / 2) * TILE_SIZE;
          const distToEntrance = Math.hypot(playerCenterX - entranceCenterX, playerCenterY - entranceCenterY);
          const nearEntranceNow = distToEntrance < 34;
          setIsNearEntrance((prev) => (prev !== nearEntranceNow ? nearEntranceNow : prev));
        } else {
          setIsNearEntrance((prev) => (prev ? false : prev));
        }

        // Interactables distance
        let closestObj: InteractableObject | null = null;
        let minObjDist = Infinity;

        for (const obj of room.interactables) {
          const objCenterX = (obj.x + obj.width / 2) * TILE_SIZE;
          const objCenterY = (obj.y + obj.height / 2) * TILE_SIZE;
          const dist = Math.hypot(playerCenterX - objCenterX, playerCenterY - objCenterY);
          const radiusPx = obj.interactionRadius * TILE_SIZE;

          if (dist < radiusPx && dist < minObjDist) {
            minObjDist = dist;
            closestObj = obj;
          }
        }
        setNearbyInteractable((prev) => (prev?.id === closestObj?.id ? prev : closestObj));

        // Display tables distance
        let closestTable: string | null = null;
        let minTableDist = Infinity;
        for (const deco of room.decorations) {
          if (deco.type === 'table' || deco.displayTable) {
            const tableW = (deco.width || 2) * TILE_SIZE;
            const tableH = (deco.height || 1.5) * TILE_SIZE;
            const tableCenterX = deco.x * TILE_SIZE + tableW / 2;
            const tableCenterY = deco.y * TILE_SIZE + tableH / 2;
            const dist = Math.hypot(playerCenterX - tableCenterX, playerCenterY - tableCenterY);
            if (dist < 36 && dist < minTableDist) {
              minTableDist = dist;
              closestTable = deco.id || 'table';
            }
          }
        }
        setNearbyTableId((prev) => (prev === closestTable ? prev : closestTable));
      } else {
        setIsNearDoor((prev) => (prev ? false : prev));
        setIsNearEntrance((prev) => (prev ? false : prev));
        setNearbyInteractable((prev) => (prev ? null : prev));
        setNearbyTableId((prev) => (prev ? null : prev));
      }

      // Update atmospheric particle simulation
      atmosphereRef.current.update(dt);

      // Update tap ripple animation
      if (tapRippleRef.current) {
        tapRippleRef.current.radius += 0.8 * dt;
        tapRippleRef.current.alpha -= 0.04 * dt;
        if (tapRippleRef.current.alpha <= 0) {
          tapRippleRef.current = null;
        }
      }
    };

    const gameLoop = (currentTime?: number) => {
      const now = currentTime || performance.now();
      let deltaMs = now - lastTime;
      lastTime = now;
      if (deltaMs > 100) deltaMs = 100;
      if (deltaMs < 0) deltaMs = 0;

      accumulator += deltaMs;
      let steps = 0;
      while (accumulator >= STEP_MS && steps < 4) {
        updateWorld(1.0);
        accumulator -= STEP_MS;
        steps++;
      }

      const player = playerRef.current;

      // --- RENDERING ---
      // Clear
      ctx.fillStyle = '#0a0914';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Center camera on player with room-specific scale (Room 1: 2.85; Room 2: 2.35; Room 3: 2.10)
      const isPortrait = device.orientation === 'portrait';
      let currentScale = device.scale || DEFAULT_SCALE;
      if (isPortrait) {
        if (room.id === 'room-3' || room.number === 3) {
          currentScale = 2.10;
        } else if (room.id === 'room-2' || room.number === 2) {
          currentScale = 2.35;
        } else {
          currentScale = 2.85;
        }
      }
      const viewW = canvas.width / currentScale;
      const viewH = canvas.height / currentScale;

      let camTranslateX: number;
      if (viewW >= room.width * TILE_SIZE) {
        camTranslateX = Math.round((viewW - room.width * TILE_SIZE) / 2);
      } else {
        const camX = Math.round(player.x + 8 - viewW / 2);
        const maxCamX = room.width * TILE_SIZE - viewW;
        camTranslateX = -Math.max(0, Math.min(camX, maxCamX));
      }

      let camTranslateY: number;
      if (viewH >= room.height * TILE_SIZE) {
        camTranslateY = Math.round((viewH - room.height * TILE_SIZE) / 2);
      } else {
        const camY = Math.round(player.y + 12 - viewH / 2);
        const maxCamY = room.height * TILE_SIZE - viewH;
        camTranslateY = -Math.max(0, Math.min(camY, maxCamY));
      }

      // Store camera transformation for tap-to-move raycast coordinate conversion
      camOffsetRef.current = { x: camTranslateX, y: camTranslateY, scale: currentScale };

      ctx.scale(currentScale, currentScale);
      ctx.translate(camTranslateX, camTranslateY);

      // 1. Draw Pre-rendered Room Background
      if (bgCanvasRef.current) {
        ctx.drawImage(bgCanvasRef.current, 0, 0);
      }

      // 1b. Ambient warm floor glow from candles & lanterns
      atmosphereRef.current.drawFloorGlow(ctx, TILE_SIZE);

      // 1c. Wall Candle Sconces, Shrine Lanterns & Blinking Terminal LEDs
      atmosphereRef.current.drawCandlesAndLanterns(ctx, TILE_SIZE);

      // 2. Draw Door with Threshold Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(room.exitDoor.x * TILE_SIZE, (room.exitDoor.y + (room.exitDoor.height || 2) - 1) * TILE_SIZE, room.exitDoor.width * TILE_SIZE, 3);
      const doorSprite = getDoorSprite(isDoorUnlocked, room.exitDoor.targetIcon, room.id);
      ctx.drawImage(doorSprite, room.exitDoor.x * TILE_SIZE, (room.exitDoor.y - 1) * TILE_SIZE);

      // 2b. Draw Entrance Door with Threshold Ground Shadow
      if (room.entranceDoor) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(room.entranceDoor.x * TILE_SIZE, (room.entranceDoor.y + (room.entranceDoor.height || 2) - 1) * TILE_SIZE, room.entranceDoor.width * TILE_SIZE, 3);
        const prevRoomId = `room-${room.number - 1}`;
        const entranceSprite = getDoorSprite(true, '↩', prevRoomId);
        ctx.drawImage(entranceSprite, room.entranceDoor.x * TILE_SIZE, (room.entranceDoor.y - 1) * TILE_SIZE);
      }

      // 3. Y-SORTED OBJECTS & CHARACTERS (ALL GROUNDED WITH AMBIENT DROP SHADOWS)
      interface RenderEntity {
        y: number;
        render: () => void;
      }
      const renderList: RenderEntity[] = [];

      // Add Player (with grounded feet shadow)
      renderList.push({
        y: player.y + 20,
        render: () => {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.beginPath();
          ctx.ellipse(player.x + 8, player.y + 22, 6, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();

          const charSprite = getCharacterSprite(characterId, player.dir, player.frame, player.moving);
          ctx.drawImage(charSprite, Math.round(player.x), Math.round(player.y));
        },
      });

      // Add Interactables (with grounded object base shadow)
      for (const obj of room.interactables) {
        const isCompleted = completedMinigames.includes(obj.id);
        const objW = obj.width * TILE_SIZE;
        const objH = obj.height * TILE_SIZE;
        const objX = obj.x * TILE_SIZE;
        const objY = obj.y * TILE_SIZE;

        renderList.push({
          y: (obj.y + obj.height) * TILE_SIZE,
          render: () => {
            // Ambient drop shadow beneath object on floor
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(objX + objW / 2, objY + objH - 1, objW / 2 + 1, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();

            const propSprite = getInteractableSprite(obj.spriteType, obj.minigameType);
            ctx.drawImage(propSprite, objX, objY, objW, objH);

            // Completed checkmark indicator floating
            if (isCompleted) {
              ctx.fillStyle = '#22c55e';
              ctx.fillRect(obj.x * TILE_SIZE + 10, obj.y * TILE_SIZE - 4, 12, 10);
              ctx.fillStyle = '#ffffff';
              ctx.font = '8px sans-serif';
              ctx.fillText('✓', obj.x * TILE_SIZE + 12, obj.y * TILE_SIZE + 4);
            }
          },
        });
      }

      // Add Solid Decorations (Plants, Display Tables, Storage Chests with Ground Shadows)
      for (const deco of room.decorations) {
        if (deco.solid) {
          const w = (deco.width || 1) * TILE_SIZE;
          const h = (deco.height || 1) * TILE_SIZE;
          const decoX = deco.x * TILE_SIZE;
          const decoY = deco.y * TILE_SIZE;

          renderList.push({
            y: decoY + h,
            render: () => {
              // Floor contact drop shadow under base
              ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
              ctx.beginPath();
              ctx.ellipse(decoX + w / 2, decoY + h - 1, w / 2, 4, 0, 0, Math.PI * 2);
              ctx.fill();

              if (deco.type === 'table' || deco.displayTable) {
                const tableSprite = getTableSprite(room.id, deco.width || 2, deco.height || 1.5);
                ctx.drawImage(tableSprite, decoX, decoY, w, h);

                // Draw exhibited collectibles on tabletop with solid, opaque pedestals (no transparent hologram effect)
                const displayed = (displayedItems && deco.id && displayedItems[deco.id]) || [];
                if (displayed && displayed.length > 0) {
                  // Slot 1 (Left)
                  if (displayed[0]) {
                    const item1 = JAPANESE_DICTIONARY[displayed[0]] || { icon: '✨' };
                    ctx.save();
                    // Soft shadow
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.beginPath();
                    ctx.ellipse(decoX + 8, decoY + 6, 6, 2.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // Solid dark velvet display coaster with gold rim (blocks wood bleed-through)
                    ctx.fillStyle = '#1e1b4b';
                    ctx.strokeStyle = '#facc15';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(decoX + 8, decoY + 4, 5, 2.2, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    // 100% solid opaque artifact icon
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 11px serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(item1.icon, decoX + 8, decoY + 2.5);
                    ctx.restore();
                  }
                  // Slot 2 (Right)
                  if (displayed[1]) {
                    const item2 = JAPANESE_DICTIONARY[displayed[1]] || { icon: '✨' };
                    ctx.save();
                    // Soft shadow
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.beginPath();
                    ctx.ellipse(decoX + w - 8, decoY + 6, 6, 2.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // Solid dark velvet display coaster with gold rim
                    ctx.fillStyle = '#1e1b4b';
                    ctx.strokeStyle = '#facc15';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(decoX + w - 8, decoY + 4, 5, 2.2, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    // 100% solid opaque artifact icon
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 11px serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(item2.icon, decoX + w - 8, decoY + 2.5);
                    ctx.restore();
                  }
                }
              } else {
                const decoSprite = getDecorationSprite(deco.type, room.id);
                ctx.drawImage(decoSprite, decoX, decoY, w, h);
              }
            },
          });
        }
      }

      // Sort by Y and draw
      renderList.sort((a, b) => a.y - b.y);
      for (const item of renderList) {
        item.render();
      }

      // 4. Tap-to-Move floor indicator ripple
      if (tapRippleRef.current && tapRippleRef.current.alpha > 0) {
        ctx.strokeStyle = `rgba(250, 204, 21, ${tapRippleRef.current.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(tapRippleRef.current.x, tapRippleRef.current.y, tapRippleRef.current.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 5. Foreground Atmospheric Particles
      atmosphereRef.current.drawAtmosphere(ctx);

      // 6. Debug overlay
      if (debugMode) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 1;
        // Player feet box
        ctx.strokeRect(player.x + 2, player.y + 16, 12, 7);

        // Object boxes
        for (const obj of room.interactables) {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
          ctx.strokeRect(obj.x * TILE_SIZE, obj.y * TILE_SIZE, obj.width * TILE_SIZE, obj.height * TILE_SIZE);
          // Radius
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
          ctx.beginPath();
          ctx.arc(
            (obj.x + obj.width / 2) * TILE_SIZE,
            (obj.y + obj.height / 2) * TILE_SIZE,
            obj.interactionRadius * TILE_SIZE,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }
      }

      ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [
    room,
    characterId,
    isDoorUnlocked,
    completedMinigames,
    isLocked,
    isFrozen,
    debugMode,
    isSolid,
    device.scale,
    device.canvasWidth,
    device.canvasHeight,
    controlType,
    displayedItems,
  ]);

  const isPortraitEmulator = device.orientation === 'portrait';

  return (
    <div className={`w-full flex flex-col items-center select-none ${isPortraitEmulator ? 'h-full flex-1 justify-between min-h-0' : 'h-full justify-center my-auto'}`}>
      {/* 1. Upper Console Screen (Pure Game Viewport) */}
      <div
        className={`relative flex flex-col items-center justify-center w-full bg-black border-4 border-slate-800 pixel-box shadow-2xl overflow-hidden ${
          isPortraitEmulator
            ? 'flex-1 min-h-0 rounded-t-sm'
            : device.isDesktop
            ? 'max-w-5xl lg:max-w-6xl 2xl:max-w-7xl rounded-sm'
            : 'max-w-4xl lg:max-w-5xl 2xl:max-w-7xl rounded-sm'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={device.canvasWidth}
          height={device.canvasHeight}
          onPointerDown={handleCanvasPointerDown}
          style={{
            aspectRatio: device.aspectRatio === '16:9' ? '16 / 9' : device.aspectRatio === '1:1' ? '1 / 1' : '3 / 2',
            height: isPortraitEmulator ? '100%' : undefined,
            maxHeight: isPortraitEmulator ? '100%' : device.isDesktop ? '76vh' : '75vh',
            maxWidth: '100%',
            touchAction: 'none',
          }}
          className={`w-full pixelated block cursor-pointer object-contain ${isPortraitEmulator ? 'h-full' : ''}`}
        />

        {/* Floating Pixel Interaction Prompt (Only shown near object or door) */}
        {!isLocked && isNearEntrance && (
          <div className={`absolute top-3 bg-black/90 border-2 border-amber-400 ${theme.pixelBoxClass} px-3 py-1.5 flex items-center gap-1.5 animate-bounce z-20`}>
            <span className="font-pixel text-[10px] sm:text-xs text-amber-300">
              [E] RETURN TO ROOM {room.number - 1}
            </span>
            <span className="text-sm">↩</span>
          </div>
        )}

        {!isLocked && isNearDoor && !isNearEntrance && (
          <div className={`absolute top-3 bg-black/90 border-2 ${isDoorUnlocked ? 'border-emerald-400' : theme.borderClass} ${theme.pixelBoxClass} px-3 py-1.5 flex items-center gap-1.5 animate-bounce z-20`}>
            <span className={`font-pixel text-[10px] sm:text-xs ${isDoorUnlocked ? 'text-emerald-300 font-bold' : theme.accentTextClass}`}>
              {isDoorUnlocked ? '[E] ENTER NEXT ROOM ➔' : '[E] EXAMINE DOOR'}
            </span>
            <span className="text-sm">{room.targetIcon}</span>
          </div>
        )}

        {!isLocked && nearbyInteractable && !isNearDoor && !isNearEntrance && (
          <div className={`absolute top-3 bg-black/90 border-2 ${theme.borderClass} ${theme.pixelBoxClass} px-3 py-1.5 flex items-center gap-1.5 animate-bounce z-20`}>
            <span className={`font-pixel text-[10px] sm:text-xs ${theme.accentTextClass}`}>
              [E] {nearbyInteractable.name.toUpperCase()}
            </span>
            <span className="font-kana text-xs text-yellow-400 font-bold bg-indigo-950 px-1 border border-indigo-400">
              {nearbyInteractable.rewardKana.character}
            </span>
          </div>
        )}

        {!isLocked && nearbyTableId && !nearbyInteractable && !isNearDoor && !isNearEntrance && (
          <div className={`absolute top-3 bg-black/90 border-2 border-amber-400 ${theme.pixelBoxClass} px-3 py-1.5 flex items-center gap-1.5 animate-bounce z-20`}>
            <span className="font-pixel text-[10px] sm:text-xs text-amber-300">
              [E] EXHIBIT TABLE
            </span>
            <span className="text-sm">🏺</span>
          </div>
        )}

        {/* Landscape floating controls for mobile landscape only */}
        {!isPortraitEmulator && !isLocked && (showTouchControls || device.isMobile) && (
          <>
            <div className="absolute bottom-3 left-3 z-30 opacity-80 hover:opacity-100 transition-opacity pointer-events-auto">
              {controlType === 'joystick' ? (
                <div className="flex flex-col items-start gap-1">
                  <button
                    onClick={() => { sounds.playSelect(); setControlType('tap'); }}
                    className="px-2 py-0.5 bg-slate-950/90 hover:bg-slate-800 border border-amber-400/80 rounded-sm font-pixel text-[8px] sm:text-[9px] text-amber-300 shadow-lg cursor-pointer flex items-center gap-1 active:scale-95"
                    title="Switch to Tap to Move"
                  >
                    <span>🕹️ STICK</span>
                    <span className="text-slate-400">➔</span>
                    <span>👆 TAP</span>
                  </button>
                  <VirtualJoystick
                    onMove={(vec) => { joystickVectorRef.current = vec; }}
                    onRelease={() => { joystickVectorRef.current = { x: 0, y: 0 }; }}
                    disabled={isLocked}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-start gap-1">
                  <button
                    onClick={() => { sounds.playSelect(); setControlType('joystick'); }}
                    className="px-2.5 py-1.5 bg-slate-950/95 border-2 border-amber-400 rounded-sm font-pixel text-[9px] text-amber-300 shadow-xl cursor-pointer flex items-center gap-1 active:scale-95"
                  >
                    <span>👆 TAP ACTIVE</span>
                    <span className="text-[7px] text-slate-400">➔ 🕹️ STICK</span>
                  </button>
                  <span className="text-[7px] font-pixel text-slate-400 bg-black/80 px-1.5 py-0.5 rounded">
                    Tap floor to walk
                  </span>
                </div>
              )}
            </div>
            <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-2 items-end opacity-90 hover:opacity-100 transition-opacity pointer-events-auto">
              <button
                onPointerDown={(e) => { e.preventDefault(); handleVirtualInteract(); }}
                className={`px-3 py-2 border-2 font-pixel text-xs font-bold shadow-xl active:scale-95 flex items-center gap-1 cursor-pointer ${
                  isNearEntrance
                    ? 'bg-amber-600/95 hover:bg-amber-500 border-white text-white animate-pulse'
                    : isNearDoor
                    ? (isDoorUnlocked ? 'bg-emerald-600/95 hover:bg-emerald-500 border-white text-white animate-pulse' : 'bg-yellow-500/95 hover:bg-yellow-400 border-white text-black animate-pulse')
                    : nearbyInteractable
                    ? 'bg-cyan-500/95 hover:bg-cyan-400 border-white text-black animate-pulse'
                    : nearbyTableId
                    ? 'bg-amber-600/95 hover:bg-amber-500 border-white text-white animate-pulse'
                    : 'bg-slate-900/90 border-slate-600 text-slate-300'
                }`}
              >
                [E] {isNearEntrance ? `ROOM ${room.number - 1}` : isNearDoor ? (isDoorUnlocked ? 'ENTER' : 'EXAMINE') : nearbyInteractable ? 'PLAY' : nearbyTableId ? 'EXHIBIT' : 'ACTION'}
              </button>
              <button
                onPointerDown={(e) => { e.preventDefault(); sounds.playSelect(); onOpenInventory(); }}
                className="px-3 py-1.5 bg-indigo-700/90 hover:bg-indigo-600 border-2 border-indigo-300 text-white font-pixel text-[10px] shadow-lg active:scale-95 cursor-pointer"
              >
                🎒 BAG [I]
              </button>
            </div>
          </>
        )}

        {/* Desktop Controls Bar at bottom of screen - Hidden on touch/mobile to prevent overlapping buttons */}
        {!isPortraitEmulator && !isLocked && !device.isMobile && !showTouchControls && (
          <div className="absolute bottom-1 left-2 right-2 flex justify-between items-center text-[9px] sm:text-[10px] font-pixel text-slate-400 bg-black/85 backdrop-blur-xs px-2 sm:px-3 py-1 border border-slate-700/60 z-20 gap-2">
            <span className="hidden sm:inline">WASD/Arrows = Move • [E] = Interact • [I] = Bag</span>
            <span className="sm:hidden text-amber-300/80">Kana Escape</span>
            <div className="flex items-center gap-1.5 ml-auto pointer-events-auto">
              <button
                onClick={() => { sounds.playSelect(); device.togglePreference(); }}
                className="px-2 py-0.5 bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-700/70 rounded text-[8px] sm:text-[9px] cursor-pointer flex items-center gap-1 shadow"
              >
                <span>{device.isDesktop ? '🖥️' : '📱'}</span>
                <span>{device.aspectRatio}</span>
              </button>
              <button
                onClick={() => { sounds.playSelect(); setShowTouchControls((prev) => !prev); }}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 rounded text-[8px] sm:text-[9px] cursor-pointer"
              >
                🎮 {showTouchControls ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        )}

        {/* Debug Keys Indicator */}
        {debugMode && (
          <div className="absolute top-2 left-2 bg-red-950/90 border border-red-500 text-red-200 text-[9px] font-mono p-2 z-40">
            <div>[DEBUG MODE ACTIVE]</div>
            <div>F1: Toggle Collision Boxes</div>
            <div>F3: Give All Kana</div>
            <div>F4: Unlock Door</div>
          </div>
        )}
      </div>

      {/* 2. Lower Handheld Emulator Control Deck (Dedicated Bottom Controller Panel in Portrait) */}
      {isPortraitEmulator && (
        <div className="w-full max-w-xl sm:max-w-2xl flex flex-col justify-between shrink-0 h-[46dvh] max-h-[380px] min-h-[250px] bg-gradient-to-b from-[#1c1b36] via-[#141328] to-[#0a0914] border-4 border-t-0 border-slate-800 shadow-[inset_0_2px_4px_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.9)] rounded-b-xl px-3 py-2 sm:px-5 sm:py-3 select-none touch-none">
          {/* Top Console Bevel & Branding Strip */}
          <div className="w-full flex justify-between items-center pb-1 border-b border-slate-700/60 text-[8px] font-pixel text-slate-400">
            <div className="flex items-center gap-1 opacity-60">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            </div>
            <div className="flex items-center gap-1.5 tracking-wider font-bold text-amber-300/90">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
              <span>KANA POCKET</span>
            </div>
            <div className="opacity-60 flex items-center gap-1">
              <span className="text-[7px] text-slate-400">DELTA</span>
            </div>
          </div>

          {/* Main Handheld Controls Row */}
          <div className="w-full flex justify-between items-center py-1 gap-2 flex-1">
            {/* Left Directional Controls (Stick / D-Pad / Tap) */}
            <div className="flex items-center justify-center shrink-0">
              {controlType === 'joystick' ? (
                <VirtualJoystick
                  onMove={(vec) => {
                    joystickVectorRef.current = vec;
                  }}
                  onRelease={() => {
                    joystickVectorRef.current = { x: 0, y: 0 };
                  }}
                  disabled={isLocked}
                />
              ) : controlType === 'dpad' ? (
                <div
                  onPointerDown={handleDpadPointerDown}
                  onPointerMove={handleDpadPointerMove}
                  onPointerUp={handleDpadPointerUp}
                  onPointerCancel={handleDpadPointerUp}
                  className="relative w-[110px] h-[110px] sm:w-[124px] sm:h-[124px] rounded-full bg-slate-950/95 border-4 border-slate-700 shadow-2xl flex items-center justify-center select-none touch-none cursor-pointer"
                  style={{ touchAction: 'none' }}
                >
                  {/* Up wing */}
                  <div className="absolute top-1 w-9 h-10 bg-gradient-to-t from-slate-800 to-slate-700 rounded-t border-t-2 border-x-2 border-slate-500 flex items-start justify-center pt-0.5">
                    <span className="text-[8px] font-pixel text-slate-300">▲</span>
                  </div>
                  {/* Down wing */}
                  <div className="absolute bottom-1 w-9 h-10 bg-gradient-to-b from-slate-800 to-slate-700 rounded-b border-b-2 border-x-2 border-slate-500 flex items-end justify-center pb-0.5">
                    <span className="text-[8px] font-pixel text-slate-300">▼</span>
                  </div>
                  {/* Left wing */}
                  <div className="absolute left-1 w-10 h-9 bg-gradient-to-l from-slate-800 to-slate-700 rounded-l border-l-2 border-y-2 border-slate-500 flex items-center justify-start pl-0.5">
                    <span className="text-[8px] font-pixel text-slate-300">◀</span>
                  </div>
                  {/* Right wing */}
                  <div className="absolute right-1 w-10 h-9 bg-gradient-to-r from-slate-800 to-slate-700 rounded-r border-r-2 border-y-2 border-slate-500 flex items-center justify-end pr-0.5">
                    <span className="text-[8px] font-pixel text-slate-300">▶</span>
                  </div>
                  {/* Center Pivot */}
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 shadow-inner flex items-center justify-center z-10 pointer-events-none">
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700" />
                  </div>
                </div>
              ) : (
                <div className="w-[110px] h-[110px] sm:w-[124px] sm:h-[124px] rounded-xl bg-slate-950/95 border-2 border-amber-500/70 flex flex-col items-center justify-center p-2 text-center shadow-lg">
                  <span className="text-2xl animate-pulse">👆</span>
                  <span className="text-[9px] text-amber-300 font-bold mt-1">TAP TO MOVE</span>
                  <span className="text-[7px] text-slate-400 mt-0.5 leading-tight">Tap floor to walk</span>
                </div>
              )}
            </div>

            {/* Center Console Controls (Pill Mode Toggles & Retro Speaker) */}
            <div className="flex flex-col items-center justify-center gap-2 mx-1 sm:mx-2">
              <button
                onClick={() => {
                  sounds.playSelect();
                  setControlType((prev) => (prev === 'joystick' ? 'dpad' : prev === 'dpad' ? 'tap' : 'joystick'));
                }}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[8px] sm:text-[9px] font-pixel text-yellow-300 border border-amber-500/70 rounded-full cursor-pointer active:scale-95 shadow-md flex items-center gap-1"
                title="Switch directional controls (Stick / D-Pad / Tap Move)"
              >
                <span>{controlType === 'joystick' ? '🕹️ STICK' : controlType === 'dpad' ? '🎮 D-PAD' : '👆 TAP'}</span>
              </button>
              <button
                onClick={() => {
                  sounds.playSelect();
                  device.toggleAspectRatio();
                }}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-[8px] font-pixel text-cyan-300 border border-slate-700 rounded-full cursor-pointer active:scale-95 shadow-md"
                title="Toggle Screen Ratio"
              >
                📱 {device.aspectRatio}
              </button>
              {/* Acoustic Speaker Grill Relief */}
              <div className="flex items-center gap-1 opacity-30 mt-0.5">
                <div className="w-1 h-3 rounded-full bg-slate-400 rotate-12" />
                <div className="w-1 h-3 rounded-full bg-slate-400 rotate-12" />
                <div className="w-1 h-3 rounded-full bg-slate-400 rotate-12" />
              </div>
            </div>

            {/* Right Arcade Buttons (Diagonal Ergonomic Layout) */}
            <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
              {/* Bag [I] Button */}
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  sounds.playSelect();
                  onOpenInventory();
                }}
                className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-gradient-to-b from-indigo-600 via-indigo-700 to-indigo-950 border-3 border-indigo-300 text-white font-pixel text-[8px] sm:text-[9px] shadow-[0_6px_16px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.3)] active:translate-y-0.5 active:scale-95 cursor-pointer flex flex-col items-center justify-center transition-all"
                title="Open Kana Bag [I]"
              >
                <span className="text-base sm:text-lg">🎒</span>
                <span>BAG</span>
              </button>

              {/* Action [E] Button */}
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleVirtualInteract();
                }}
                className={`w-17 h-17 sm:w-19 sm:h-19 rounded-full border-4 font-pixel text-xs font-bold shadow-[0_8px_20px_rgba(0,0,0,0.7),inset_0_2px_4px_rgba(255,255,255,0.4)] active:translate-y-0.5 active:scale-95 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isNearEntrance
                    ? 'bg-gradient-to-b from-amber-500 to-amber-700 border-white text-white animate-pulse shadow-[0_0_18px_rgba(245,158,11,0.9)]'
                    : isNearDoor
                    ? (isDoorUnlocked ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 border-white text-white animate-pulse shadow-[0_0_18px_rgba(16,185,129,0.9)]' : 'bg-gradient-to-b from-yellow-400 to-amber-600 border-white text-black animate-pulse shadow-[0_0_18px_rgba(250,204,21,0.9)]')
                    : nearbyInteractable
                    ? 'bg-gradient-to-b from-cyan-400 to-blue-600 border-white text-black animate-pulse shadow-[0_0_18px_rgba(34,211,238,0.9)]'
                    : nearbyTableId
                    ? 'bg-gradient-to-b from-amber-500 to-amber-700 border-white text-white animate-pulse shadow-[0_0_18px_rgba(245,158,11,0.9)]'
                    : 'bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border-slate-500 text-slate-200 active:bg-indigo-700 shadow-md'
                }`}
                title="Interact / Action [E]"
              >
                <span className="text-sm font-bold">[E]</span>
                <span className="text-[7px] tracking-tight">
                  {isNearEntrance ? `ROOM ${room.number - 1}` : isNearDoor ? (isDoorUnlocked ? 'ENTER' : 'EXAMINE') : nearbyInteractable ? 'PLAY' : nearbyTableId ? 'EXHIBIT' : 'ACTION'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const GameViewport = React.memo(GameViewportComponent);
