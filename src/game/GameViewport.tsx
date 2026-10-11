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
} from '../utils/pixelArt';
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
  onInteract: (obj: InteractableObject) => void;
  onInteractDoor: () => void;
  onReturnToPrevRoom?: () => void;
  onOpenInventory: () => void;
  onOpenPauseMenu: () => void;
  onDebugUnlockDoor?: () => void;
  onDebugGiveKana?: () => void;
}

const TILE_SIZE = 16;
const DEFAULT_SCALE = 2.5;
const PLAYER_SPEED = 2.0; // Balanced 16-pixel tile walking pace

export const GameViewport: React.FC<GameViewportProps> = ({
  room,
  characterId,
  isDoorUnlocked,
  completedMinigames,
  isLocked = false,
  onInteract,
  onInteractDoor,
  onReturnToPrevRoom,
  onOpenInventory,
  onOpenPauseMenu,
  onDebugUnlockDoor,
  onDebugGiveKana,
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
  const [isNearDoor, setIsNearDoor] = useState(false);
  const [isNearEntrance, setIsNearEntrance] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [controlType, setControlType] = useState<'joystick' | 'dpad'>('joystick');
  const [showTouchControls, setShowTouchControls] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
  });

  const keysRef = useRef<Record<string, boolean>>({});
  const joystickVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const atmosphereRef = useRef<AtmosphericSystem>(new AtmosphericSystem());

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
    }
  };

  // Reset player position and atmospheric effects when room changes
  useEffect(() => {
    playerRef.current.x = room.playerSpawn.x * TILE_SIZE;
    playerRef.current.y = room.playerSpawn.y * TILE_SIZE;
    playerRef.current.dir = 'down';
    atmosphereRef.current.init(room.id, room.width, room.height, TILE_SIZE);
  }, [room]);

  // When locked (minigame or modal active), clear keys and stop movement
  useEffect(() => {
    if (isLocked) {
      keysRef.current = {};
      joystickVectorRef.current = { x: 0, y: 0 };
      playerRef.current.moving = false;
      playerRef.current.frame = 0;
      setNearbyInteractable(null);
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

    // 2. Draw Floor Rugs & Under-decorations
    for (const deco of room.decorations) {
      if (!deco.solid && deco.type === 'rug') {
        const w = (deco.width || 3) * TILE_SIZE;
        const h = (deco.height || 2) * TILE_SIZE;
        bgCtx.fillStyle = room.id === 'room-3' ? '#831843' : (room.id === 'room-2' ? '#78350f' : '#7c2d12');
        bgCtx.fillRect(deco.x * TILE_SIZE, deco.y * TILE_SIZE, w, h);
        bgCtx.fillStyle = room.id === 'room-3' ? '#f472b6' : (room.id === 'room-2' ? '#f59e0b' : '#b45309');
        bgCtx.strokeRect(deco.x * TILE_SIZE + 1.5, deco.y * TILE_SIZE + 1.5, w - 3, h - 3);
        bgCtx.fillStyle = '#fef08a';
        bgCtx.fillRect(deco.x * TILE_SIZE + w / 2 - 4, deco.y * TILE_SIZE + h / 2 - 4, 8, 8);
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
    if (isLocked) {
      // Free 100% of browser rendering threads when minigame or pause menu is active!
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let animId: number;

    const gameLoop = () => {
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
          // Normalize diagonal keyboard speed
          if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
          }
        } else if (joystickVectorRef.current.x !== 0 || joystickVectorRef.current.y !== 0) {
          // Read smooth touch analog joystick vector
          dx = joystickVectorRef.current.x;
          dy = joystickVectorRef.current.y;
        }
      }

      const mag = Math.hypot(dx, dy);
      const isMoving = !isLocked && mag > 0.15;
      player.moving = isMoving;

      if (player.bumpCooldown > 0) {
        player.bumpCooldown -= 1;
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
        const currentSpeed = PLAYER_SPEED * Math.min(mag, 1.0) * stepPulse;

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

        if (isBumping && player.bumpCooldown <= 0) {
          sounds.playBump();
          player.bumpCooldown = 18; // ~300ms cooldown for crisp impact feel
        }

        // Only animate stride if character actually displaced
        if (movedX || movedY) {
          player.animTimer += 1;
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
        player.animTimer += 1;
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
        setIsNearDoor(nearDoorNow);

        // Entrance door distance (if room has entranceDoor)
        if (room.entranceDoor) {
          const entranceCenterX = (room.entranceDoor.x + room.entranceDoor.width / 2) * TILE_SIZE;
          const entranceCenterY = (room.entranceDoor.y + room.entranceDoor.height / 2) * TILE_SIZE;
          const distToEntrance = Math.hypot(playerCenterX - entranceCenterX, playerCenterY - entranceCenterY);
          const nearEntranceNow = distToEntrance < 34;
          setIsNearEntrance(nearEntranceNow);
        } else {
          setIsNearEntrance(false);
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
        setNearbyInteractable(closestObj);
      } else {
        setIsNearDoor(false);
        setIsNearEntrance(false);
        setNearbyInteractable(null);
      }

      // Update atmospheric particle simulation
      atmosphereRef.current.update();

      // --- RENDERING ---
      // Clear
      ctx.fillStyle = '#0a0914';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Center camera on player with widescreen room boundary centering
      const currentScale = device.scale || DEFAULT_SCALE;
      const viewW = canvas.width / currentScale;
      const viewH = canvas.height / currentScale;

      let camTranslateX: number;
      if (viewW >= room.width * TILE_SIZE) {
        // Room is narrower than viewport -> center horizontally
        camTranslateX = Math.round((viewW - room.width * TILE_SIZE) / 2);
      } else {
        const camX = Math.round(player.x + 8 - viewW / 2);
        const maxCamX = room.width * TILE_SIZE - viewW;
        camTranslateX = -Math.max(0, Math.min(camX, maxCamX));
      }

      let camTranslateY: number;
      if (viewH >= room.height * TILE_SIZE) {
        // Room is shorter than viewport -> center vertically
        camTranslateY = Math.round((viewH - room.height * TILE_SIZE) / 2);
      } else {
        const camY = Math.round(player.y + 12 - viewH / 2);
        const maxCamY = room.height * TILE_SIZE - viewH;
        camTranslateY = -Math.max(0, Math.min(camY, maxCamY));
      }

      ctx.scale(currentScale, currentScale);
      ctx.translate(camTranslateX, camTranslateY);

      // 1. Draw Pre-rendered Room Background in 1 lightning-fast call!
      if (bgCanvasRef.current) {
        ctx.drawImage(bgCanvasRef.current, 0, 0);
      }

      // 1b. Ambient warm floor glow from candles & lanterns
      atmosphereRef.current.drawFloorGlow(ctx, TILE_SIZE);

      // 1c. Wall Candle Sconces, Shrine Lanterns & Blinking Terminal LEDs
      atmosphereRef.current.drawCandlesAndLanterns(ctx, TILE_SIZE);

      // 2. Draw Door
      const doorSprite = getDoorSprite(isDoorUnlocked, room.exitDoor.targetIcon, room.id);
      ctx.drawImage(doorSprite, room.exitDoor.x * TILE_SIZE, (room.exitDoor.y - 1) * TILE_SIZE);

      // 2b. Draw Entrance Door (Return doorway to previous chamber)
      if (room.entranceDoor) {
        const prevRoomId = `room-${room.number - 1}`;
        const entranceSprite = getDoorSprite(true, '↩', prevRoomId);
        ctx.drawImage(entranceSprite, room.entranceDoor.x * TILE_SIZE, (room.entranceDoor.y - 1) * TILE_SIZE);
      }

      // 3. Y-SORTED OBJECTS & CHARACTERS
      interface RenderEntity {
        y: number;
        render: () => void;
      }
      const renderList: RenderEntity[] = [];

      // Add Player
      renderList.push({
        y: player.y + 20,
        render: () => {
          const charSprite = getCharacterSprite(characterId, player.dir, player.frame, player.moving);
          ctx.drawImage(charSprite, Math.round(player.x), Math.round(player.y));
        },
      });

      // Add Interactables
      for (const obj of room.interactables) {
        const isCompleted = completedMinigames.includes(obj.id);
        renderList.push({
          y: (obj.y + obj.height) * TILE_SIZE,
          render: () => {
            const propSprite = getInteractableSprite(obj.spriteType, obj.minigameType);
            ctx.drawImage(propSprite, obj.x * TILE_SIZE, obj.y * TILE_SIZE);

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

      // Add Solid Decorations (Plants, Shelves)
      for (const deco of room.decorations) {
        if (deco.solid) {
          const w = (deco.width || 1) * TILE_SIZE;
          const h = (deco.height || 1) * TILE_SIZE;
          renderList.push({
            y: deco.y * TILE_SIZE + h,
            render: () => {
              const decoSprite = getDecorationSprite(deco.type, room.id);
              ctx.drawImage(decoSprite, deco.x * TILE_SIZE, deco.y * TILE_SIZE, w, h);
            },
          });
        }
      }

      // Sort by Y and draw
      renderList.sort((a, b) => a.y - b.y);
      for (const item of renderList) {
        item.render();
      }

      // 4. Foreground Atmospheric Particles (Floating dust motes, Sakura petals, altar embers)
      atmosphereRef.current.drawAtmosphere(ctx);

      // 5. Debug overlay
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
    debugMode,
    isSolid,
    device.scale,
    device.canvasWidth,
    device.canvasHeight,
  ]);

  const renderDPad = () => (
    <div className="flex flex-col items-center select-none touch-none">
      {/* UP */}
      <button
        onPointerDown={(e) => { e.preventDefault(); setVirtualKey('ArrowUp', true); }}
        onPointerUp={() => setVirtualKey('ArrowUp', false)}
        onPointerLeave={() => setVirtualKey('ArrowUp', false)}
        className="w-11 h-9 sm:w-12 sm:h-10 bg-slate-900/90 active:bg-indigo-600 border-2 border-slate-600 active:border-yellow-400 text-yellow-300 font-pixel text-xs flex items-center justify-center shadow-lg active:scale-95 cursor-pointer rounded-t-sm"
      >
        ▲
      </button>
      <div className="flex gap-1 my-0.5">
        {/* LEFT */}
        <button
          onPointerDown={(e) => { e.preventDefault(); setVirtualKey('ArrowLeft', true); }}
          onPointerUp={() => setVirtualKey('ArrowLeft', false)}
          onPointerLeave={() => setVirtualKey('ArrowLeft', false)}
          className="w-11 h-9 sm:w-12 sm:h-10 bg-slate-900/90 active:bg-indigo-600 border-2 border-slate-600 active:border-yellow-400 text-yellow-300 font-pixel text-xs flex items-center justify-center shadow-lg active:scale-95 cursor-pointer rounded-l-sm"
        >
          ◀
        </button>
        <div className="w-8 h-9 sm:w-10 sm:h-10 bg-slate-950/80 border border-slate-800 flex items-center justify-center text-[7px] text-slate-500 font-pixel">
          PAD
        </div>
        {/* RIGHT */}
        <button
          onPointerDown={(e) => { e.preventDefault(); setVirtualKey('ArrowRight', true); }}
          onPointerUp={() => setVirtualKey('ArrowRight', false)}
          onPointerLeave={() => setVirtualKey('ArrowRight', false)}
          className="w-11 h-9 sm:w-12 sm:h-10 bg-slate-900/90 active:bg-indigo-600 border-2 border-slate-600 active:border-yellow-400 text-yellow-300 font-pixel text-xs flex items-center justify-center shadow-lg active:scale-95 cursor-pointer rounded-r-sm"
        >
          ▶
        </button>
      </div>
      {/* DOWN */}
      <button
        onPointerDown={(e) => { e.preventDefault(); setVirtualKey('ArrowDown', true); }}
        onPointerUp={() => setVirtualKey('ArrowDown', false)}
        onPointerLeave={() => setVirtualKey('ArrowDown', false)}
        className="w-11 h-9 sm:w-12 sm:h-10 bg-slate-900/90 active:bg-indigo-600 border-2 border-slate-600 active:border-yellow-400 text-yellow-300 font-pixel text-xs flex items-center justify-center shadow-lg active:scale-95 cursor-pointer rounded-b-sm"
      >
        ▼
      </button>
    </div>
  );

  const isPortraitEmulator = device.orientation === 'portrait' || (device.isMobile && !device.isDesktop);

  return (
    <div className={`w-full flex flex-col items-center select-none ${isPortraitEmulator ? 'h-full flex-1 justify-between min-h-0' : ''}`}>
      {/* 1. Upper Console Screen (Pure Game Viewport - 0 floating controls on top in emulator mode) */}
      <div
        className={`relative flex flex-col items-center justify-center w-full transition-all bg-black border-4 border-slate-800 pixel-box shadow-2xl overflow-hidden rounded-sm ${
          device.isDesktop ? 'max-w-5xl lg:max-w-6xl 2xl:max-w-7xl' : 'max-w-xl sm:max-w-2xl'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={device.canvasWidth}
          height={device.canvasHeight}
          style={{
            aspectRatio: device.aspectRatio === '16:9' ? '16 / 9' : '3 / 2',
            maxHeight: isPortraitEmulator ? '50vh' : device.isDesktop ? '76vh' : '65vh',
          }}
          className="w-full pixelated block cursor-default object-contain"
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
          <div className={`absolute top-3 bg-black/90 border-2 ${theme.borderClass} ${theme.pixelBoxClass} px-3 py-1.5 flex items-center gap-1.5 animate-bounce z-20`}>
            <span className={`font-pixel text-[10px] sm:text-xs ${theme.accentTextClass}`}>
              {isDoorUnlocked ? '[E] OPEN DOOR' : '[E] EXAMINE DOOR'}
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

        {/* Landscape floating controls for mobile landscape only */}
        {!isPortraitEmulator && !isLocked && showTouchControls && (
          <>
            <div className="absolute bottom-3 left-3 z-30 opacity-80 hover:opacity-100 transition-opacity pointer-events-auto">
              {controlType === 'joystick' ? (
                <VirtualJoystick
                  onMove={(vec) => { joystickVectorRef.current = vec; }}
                  onRelease={() => { joystickVectorRef.current = { x: 0, y: 0 }; }}
                  disabled={isLocked}
                />
              ) : (
                renderDPad()
              )}
            </div>
            <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-2 items-end opacity-90 hover:opacity-100 transition-opacity pointer-events-auto">
              <button
                onPointerDown={(e) => { e.preventDefault(); handleVirtualInteract(); }}
                className={`px-3 py-2 border-2 font-pixel text-xs font-bold shadow-xl active:scale-95 flex items-center gap-1 cursor-pointer ${
                  isNearEntrance
                    ? 'bg-amber-600/95 hover:bg-amber-500 border-white text-white animate-pulse'
                    : isNearDoor
                    ? 'bg-yellow-500/95 hover:bg-yellow-400 border-white text-black animate-pulse'
                    : nearbyInteractable
                    ? 'bg-cyan-500/95 hover:bg-cyan-400 border-white text-black animate-pulse'
                    : 'bg-slate-900/90 border-slate-600 text-slate-300'
                }`}
              >
                [E] {isNearEntrance ? `ROOM ${room.number - 1}` : isNearDoor ? (isDoorUnlocked ? 'OPEN' : 'EXAMINE') : nearbyInteractable ? 'PLAY' : 'ACTION'}
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

        {/* Desktop Controls Bar at bottom of screen */}
        {!isPortraitEmulator && !isLocked && (
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
      {isPortraitEmulator && !isLocked && (
        <div className="w-full max-w-xl sm:max-w-2xl flex justify-between items-center px-3 py-2 sm:px-5 sm:py-3 bg-gradient-to-b from-[#16152a] to-[#0c0b18] border-2 border-slate-800 pixel-box shadow-2xl mt-auto mb-1 rounded-sm touch-none select-none">
          {/* Left: Virtual Joystick or D-Pad */}
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
            ) : (
              renderDPad()
            )}
          </div>

          {/* Center: System Toggles */}
          <div className="flex flex-col items-center gap-2 mx-1 sm:mx-2">
            <button
              onClick={() => {
                sounds.playSelect();
                setControlType((prev) => (prev === 'joystick' ? 'dpad' : 'joystick'));
              }}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[8px] font-pixel text-yellow-300 border border-slate-700 rounded cursor-pointer active:scale-95 shadow-sm"
              title="Switch between Virtual Joystick and D-Pad"
            >
              {controlType === 'joystick' ? '🕹️ STICK' : '🎮 D-PAD'}
            </button>
            <button
              onClick={() => {
                sounds.playSelect();
                device.togglePreference();
              }}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[8px] font-pixel text-cyan-300 border border-slate-700 rounded cursor-pointer active:scale-95 shadow-sm"
              title="Toggle Screen Ratio"
            >
              📱 {device.aspectRatio}
            </button>
          </div>

          {/* Right: Handheld Arcade Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            {/* Bag [I] Button */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                sounds.playSelect();
                onOpenInventory();
              }}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-indigo-700 to-indigo-950 border-2 sm:border-3 border-indigo-400 text-white font-pixel text-[8px] sm:text-[9px] shadow-xl active:scale-95 cursor-pointer flex flex-col items-center justify-center transition-all"
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
              className={`w-15 h-15 sm:w-17 sm:h-17 rounded-full border-3 sm:border-4 font-pixel text-xs font-bold shadow-2xl active:scale-95 flex flex-col items-center justify-center cursor-pointer transition-all ${
                isNearEntrance
                  ? 'bg-gradient-to-b from-amber-500 to-amber-700 border-white text-white animate-pulse shadow-[0_0_16px_rgba(245,158,11,0.85)]'
                  : isNearDoor
                  ? 'bg-gradient-to-b from-yellow-400 to-amber-600 border-white text-black animate-pulse shadow-[0_0_16px_rgba(250,204,21,0.85)]'
                  : nearbyInteractable
                  ? 'bg-gradient-to-b from-cyan-400 to-blue-600 border-white text-black animate-pulse shadow-[0_0_16px_rgba(34,211,238,0.85)]'
                  : 'bg-gradient-to-b from-slate-800 to-slate-950 border-slate-500 text-slate-200 active:bg-indigo-700 shadow-md'
              }`}
              title="Interact / Action [E]"
            >
              <span className="text-sm font-bold">[E]</span>
              <span className="text-[7px] tracking-tight">
                {isNearEntrance ? `ROOM ${room.number - 1}` : isNearDoor ? (isDoorUnlocked ? 'OPEN' : 'EXAMINE') : nearbyInteractable ? 'PLAY' : 'ACTION'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
