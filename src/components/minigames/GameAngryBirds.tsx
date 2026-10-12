import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sounds } from '../../utils/audio';

interface GameAngryBirdsProps {
  onSuccess: () => void;
  onFailure?: () => void;
}

interface Block {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  border: string;
  type: 'stone' | 'wood';
  alive: boolean;
  falling: boolean;
  vy: number;
  supports?: string[];
}

interface Target {
  id: string;
  x: number;
  y: number;
  r: number;
  alive: boolean;
  falling: boolean;
  vy: number;
  supportedBy?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const initBlocks = (): Block[] => [
  // --- BASTION 1: Forward Watchtower (Left Structure: x 155-192) ---
  { id: 'w1', x: 156, y: 135, w: 9, h: 40, color: '#64748b', border: '#475569', type: 'stone', alive: true, falling: false, vy: 0 },
  { id: 'w2', x: 184, y: 135, w: 9, h: 40, color: '#64748b', border: '#475569', type: 'stone', alive: true, falling: false, vy: 0 },
  { id: 'wb1', x: 152, y: 128, w: 44, h: 7, color: '#b45309', border: '#78350f', type: 'wood', alive: true, falling: false, vy: 0, supports: ['w1', 'w2'] },
  { id: 'wt_roof', x: 160, y: 102, w: 28, h: 6, color: '#dc2626', border: '#991b1b', type: 'wood', alive: true, falling: false, vy: 0, supports: ['wb1'] },

  // --- BASTION 2: Rear Fortified Sanctum (Right Structure: x 214-256) ---
  // High Front Shield Wall (defends internal sanctuary from direct ground shots)
  { id: 'shield', x: 214, y: 110, w: 10, h: 65, color: '#64748b', border: '#334155', type: 'stone', alive: true, falling: false, vy: 0 },
  // Rear Foundation Pillar
  { id: 'r_pillar', x: 246, y: 135, w: 10, h: 40, color: '#64748b', border: '#475569', type: 'stone', alive: true, falling: false, vy: 0 },
  // Sanctum Mid Roof Beam
  { id: 'sb1', x: 210, y: 103, w: 48, h: 7, color: '#b45309', border: '#78350f', type: 'wood', alive: true, falling: false, vy: 0, supports: ['shield', 'r_pillar'] },
  // Upper Pagoda Crown Columns
  { id: 'c1', x: 224, y: 72, w: 8, h: 31, color: '#b45309', border: '#78350f', type: 'wood', alive: true, falling: false, vy: 0, supports: ['sb1'] },
  { id: 'c2', x: 242, y: 72, w: 8, h: 31, color: '#b45309', border: '#78350f', type: 'wood', alive: true, falling: false, vy: 0, supports: ['sb1'] },
  // Upper Peak Roof
  { id: 'sb2', x: 218, y: 65, w: 38, h: 7, color: '#dc2626', border: '#991b1b', type: 'wood', alive: true, falling: false, vy: 0, supports: ['c1', 'c2'] },
];

const initTargets = (): Target[] => [
  // Target 1: Stationed in Forward Watchtower
  { id: 't1', x: 174, y: 118, r: 7, alive: true, falling: false, vy: 0, supportedBy: 'wb1' },
  // Target 2: Sheltered deep in Rear Sanctum (behind the tall shield pillar)
  { id: 't2', x: 232, y: 160, r: 7, alive: true, falling: false, vy: 0 },
  // Target 3: Perched atop the high Pagoda Peak
  { id: 't3', x: 237, y: 56, r: 7, alive: true, falling: false, vy: 0, supportedBy: 'sb2' },
];

export const GameAngryBirds: React.FC<GameAngryBirdsProps> = ({ onSuccess }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shotsLeft, setShotsLeft] = useState(3);
  const [targetsLeft, setTargetsLeft] = useState(3);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const particlesRef = useRef<Particle[]>([]);

  const stateRef = useRef({
    slingX: 45,
    slingY: 135,
    dragging: false,
    dragX: 45,
    dragY: 135,
    projectile: { x: 45, y: 135, vx: 0, vy: 0, active: false },
    blocks: initBlocks(),
    targets: initTargets(),
    shots: 3,
    won: false,
    gameOver: false,
  });

  const spawnParticles = (x: number, y: number, color: string, count = 12, speed = 3.5) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.8 + 0.2) * speed;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0,
        maxLife: 16 + Math.random() * 10,
        color,
        size: Math.random() * 2.5 + 1.5,
      });
    }
  };

  const restart = () => {
    stateRef.current = {
      slingX: 45,
      slingY: 135,
      dragging: false,
      dragX: 45,
      dragY: 135,
      projectile: { x: 45, y: 135, vx: 0, vy: 0, active: false },
      blocks: initBlocks(),
      targets: initTargets(),
      shots: 3,
      won: false,
      gameOver: false,
    };
    particlesRef.current = [];
    setShotsLeft(3);
    setTargetsLeft(3);
    setWon(false);
    setGameOver(false);
  };

  useEffect(() => {
    restart();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let animId: number;
    let lastTime = performance.now();
    let accumulator = 0;
    const STEP_MS = 1000 / 60;
    const gravity = 0.22;

    const updatePhysics = (dt: number = 1.0) => {
      const s = stateRef.current;
      const p = s.projectile;

      // Update structural physics (falling blocks & cascading collapse)
      for (const b of s.blocks) {
        if (b.alive && b.supports) {
          // Check if supports are alive AND not currently falling!
          const solidSupports = b.supports.filter((id) => {
            const suppBlock = s.blocks.find((x) => x.id === id);
            return suppBlock && suppBlock.alive && !suppBlock.falling;
          });

          // Bastion structural equilibrium checks
          if (b.id === 'wb1') {
            // Forward Watchtower beam falls if either supporting pillar is knocked out
            if (solidSupports.length < 2) {
              b.falling = true;
            }
          } else if (b.id === 'sb1') {
            // Rear Sanctum mid beam falls if foundation support fails
            if (solidSupports.length < 2) {
              b.falling = true;
            }
          } else if (b.id === 'sb2') {
            // Pagoda peak roof falls if upper columns fail
            if (solidSupports.length < 2) {
              b.falling = true;
            }
          } else {
            if (solidSupports.length < b.supports.length) {
              b.falling = true;
            }
          }
        }

        if (b.alive && b.falling) {
          b.vy += 0.24 * dt;
          b.y += b.vy * dt;
          if (b.y >= 175 - b.h) {
            b.y = 175 - b.h;
            b.vy = 0;
          }

          // Falling beam crushes targets below it!
          for (const t of s.targets) {
            if (
              t.alive &&
              b.x <= t.x + t.r + 4 &&
              b.x + b.w >= t.x - t.r - 4 &&
              b.y + b.h >= t.y - t.r &&
              b.y <= t.y + t.r + 4
            ) {
              t.alive = false;
              spawnParticles(t.x, t.y, '#facc15', 18, 4.2);
              sounds.playKanaObtained();
            }
          }
        }
      }

      // Update supported targets falling if their base falls or is destroyed
      for (const t of s.targets) {
        if (t.alive && t.supportedBy) {
          const sup = s.blocks.find((x) => x.id === t.supportedBy);
          if (!sup || !sup.alive || sup.falling) {
            t.falling = true;
            t.vy = Math.max(t.vy, sup?.vy || 1.4);
          }
        }
        if (t.alive && t.falling) {
          t.vy += 0.24 * dt;
          t.y += t.vy * dt;
          if (t.y >= 175 - t.r) {
            t.y = 175 - t.r;
            t.vy = 0;
          }
        }
      }

      // Update projectile physics
      if (p.active) {
        p.vy += gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Check target collision
        for (const t of s.targets) {
          if (t.alive) {
            if (Math.hypot(p.x - t.x, p.y - t.y) <= 6 + t.r) {
              t.alive = false;
              spawnParticles(t.x, t.y, '#facc15', 20, 4.5);
              sounds.playKanaObtained();
              p.vx *= 0.65;
            }
          }
        }

        // Check block collision
        for (const b of s.blocks) {
          if (b.alive) {
            if (
              p.x >= b.x - 3 &&
              p.x <= b.x + b.w + 3 &&
              p.y >= b.y - 3 &&
              p.y <= b.y + b.h + 3
            ) {
              b.alive = false;
              spawnParticles(
                b.x + b.w / 2,
                b.y + b.h / 2,
                b.type === 'stone' ? '#94a3b8' : '#b45309',
                14,
                3.5
              );
              sounds.playBlip(340);
              p.vx *= 0.55;
              p.vy = (p.vy + 0.8) * 0.45;
            }
          }
        }

        // Ground / offscreen
        if (p.y > 175 || p.x > 270) {
          p.active = false;
          p.x = s.slingX;
          p.y = s.slingY;
          s.shots -= 1;
          setShotsLeft(s.shots);
        }
      }

      // Continuous Win & Game Over evaluation:
      // Checks every frame so collapsing structural blocks trigger instant victory when the final target is crushed!
      const remaining = s.targets.filter((x) => x.alive).length;
      setTargetsLeft(remaining);

      if (remaining === 0 && !s.won) {
        s.won = true;
        setWon(true);
        sounds.playSuccess();
        setTimeout(() => onSuccessRef.current(), 750);
      } else if (!s.won && !s.gameOver && !p.active && s.shots <= 0) {
        // Only trigger Game Over if projectile is inactive and no blocks/targets are currently in motion
        const isPhysicsActive =
          s.blocks.some((b) => b.alive && b.falling && b.vy > 0) ||
          s.targets.some((t) => t.alive && t.falling && t.vy > 0);
        if (!isPhysicsActive && remaining > 0) {
          s.gameOver = true;
          setGameOver(true);
          sounds.playFail();
        }
      }
    };

    const loop = (currentTime?: number) => {
      const now = currentTime || performance.now();
      let deltaMs = now - lastTime;
      lastTime = now;
      if (deltaMs > 100) deltaMs = 100;
      if (deltaMs < 0) deltaMs = 0;

      accumulator += deltaMs;
      let steps = 0;
      while (accumulator >= STEP_MS && steps < 4) {
        updatePhysics(1.0);
        accumulator -= STEP_MS;
        steps++;
      }

      const s = stateRef.current;

      // Render
      ctx.fillStyle = '#0f172a'; // Deep twilight pagoda sky
      ctx.fillRect(0, 0, 260, 200);

      // Background stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(30, 25, 1.5, 1.5);
      ctx.fillRect(90, 40, 1.5, 1.5);
      ctx.fillRect(150, 18, 1.5, 1.5);
      ctx.fillRect(230, 30, 1.5, 1.5);

      // Ground
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 175, 260, 25);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, 175, 260, 2.5);

      // Slingshot frame
      ctx.fillStyle = '#78350f';
      ctx.fillRect(43, 140, 6, 35);
      ctx.fillRect(35, 130, 8, 12);
      ctx.fillRect(49, 130, 8, 12);

      // Slingshot elastic band
      if (s.dragging) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(37, 132);
        ctx.lineTo(s.dragX, s.dragY);
        ctx.lineTo(53, 132);
        ctx.stroke();

        // High accuracy curved trajectory preview dots
        const pVx = (s.slingX - s.dragX) * 0.18;
        const pVy = (s.slingY - s.dragY) * 0.18;
        ctx.fillStyle = 'rgba(254, 240, 138, 0.7)';
        for (let i = 1; i <= 14; i++) {
          const t = i * 2.2;
          const predX = s.slingX + pVx * t;
          const predY = s.slingY + pVy * t + 0.5 * gravity * Math.pow(t, 2);
          if (predX > 260 || predY > 175) break;
          ctx.beginPath();
          ctx.arc(predX, predY, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Fortress Blocks
      for (const b of s.blocks) {
        if (b.alive) {
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.strokeStyle = b.border;
          ctx.lineWidth = 1;
          ctx.strokeRect(b.x, b.y, b.w, b.h);
          // Highlight edge
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, 1.5);
        }
      }

      // Draw Targets (Golden Spirit Orbs)
      for (const t of s.targets) {
        if (t.alive) {
          ctx.fillStyle = '#f59e0b'; // Gold rim
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a'; // Radiant center
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.r - 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ef4444'; // Red core seal
          ctx.beginPath();
          ctx.arc(t.x, t.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life += 1;

        const alpha = Math.max(0, 1 - pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
        ctx.globalAlpha = 1.0;

        if (pt.life >= pt.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }

      // Projectile (Red bird/orb)
      const p = s.projectile;
      const px = p.active ? p.x : s.dragging ? s.dragX : s.slingX;
      const py = p.active ? p.y : s.dragging ? s.dragY : s.slingY;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px + 2, py - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(px + 2.5, py - 2, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a'; // Beak
      ctx.fillRect(px + 4, py - 1, 3, 3);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const updateDragFromCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;

    // Constrain pull distance
    const dx = mx - stateRef.current.slingX;
    const dy = my - stateRef.current.slingY;
    const dist = Math.hypot(dx, dy);
    const maxDist = 40;

    if (dist > maxDist) {
      stateRef.current.dragX = stateRef.current.slingX + (dx / dist) * maxDist;
      stateRef.current.dragY = stateRef.current.slingY + (dy / dist) * maxDist;
    } else {
      stateRef.current.dragX = mx;
      stateRef.current.dragY = my;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (stateRef.current.projectile.active || stateRef.current.shots <= 0 || won || gameOver) return;
    stateRef.current.dragging = true;
    updateDragFromCoords(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (stateRef.current.projectile.active || stateRef.current.shots <= 0 || won || gameOver) return;
    const touch = e.touches[0];
    if (!touch) return;
    stateRef.current.dragging = true;
    updateDragFromCoords(touch.clientX, touch.clientY);
  };

  const handleRelease = useCallback(() => {
    const s = stateRef.current;
    if (!s.dragging) return;
    s.dragging = false;

    // Launch
    const pVx = (s.slingX - s.dragX) * 0.18;
    const pVy = (s.slingY - s.dragY) * 0.18;

    s.projectile.x = s.slingX;
    s.projectile.y = s.slingY;
    s.projectile.vx = pVx;
    s.projectile.vy = pVy;
    s.projectile.active = true;
    sounds.playBlip(620);
  }, []);

  // Global window listeners so releasing outside canvas launches cleanly
  useEffect(() => {
    const onWindowMove = (e: MouseEvent) => {
      if (stateRef.current.dragging) {
        updateDragFromCoords(e.clientX, e.clientY);
      }
    };
    const onWindowTouchMove = (e: TouchEvent) => {
      if (stateRef.current.dragging && e.touches[0]) {
        updateDragFromCoords(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onWindowUp = () => {
      if (stateRef.current.dragging) {
        handleRelease();
      }
    };

    window.addEventListener('mousemove', onWindowMove);
    window.addEventListener('mouseup', onWindowUp);
    window.addEventListener('touchmove', onWindowTouchMove, { passive: true });
    window.addEventListener('touchend', onWindowUp);
    window.addEventListener('touchcancel', onWindowUp);

    return () => {
      window.removeEventListener('mousemove', onWindowMove);
      window.removeEventListener('mouseup', onWindowUp);
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowUp);
      window.removeEventListener('touchcancel', onWindowUp);
    };
  }, [handleRelease]);

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[580px]">
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm px-1">
        <span className="text-cyan-400 font-bold">AMMO: {'🔴'.repeat(shotsLeft)}</span>
        <span className="text-amber-300 font-bold">TARGETS: {targetsLeft}/3</span>
      </div>

      <div className="relative border-4 border-slate-700 shadow-2xl bg-black cursor-crosshair touch-none w-full flex justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={260}
          height={200}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="pixelated block touch-none w-full max-w-[560px] aspect-[260/200] object-contain"
        />

        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in">
            <span className="text-emerald-400 text-sm sm:text-base mb-1 font-bold">★ PAGODA FORTRESS TOPPLED! ★</span>
            <span className="text-xs text-slate-300 mb-3">All 3 sacred target crests destroyed!</span>
            <button
              onClick={() => onSuccessRef.current()}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-bold border-2 border-white cursor-pointer active:translate-y-0.5 shadow-lg"
            >
              CLAIM REWARD NOW
            </button>
          </div>
        )}

        {gameOver && !won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-red-500 p-4">
            <span className="text-red-400 text-sm sm:text-base mb-3 font-bold">OUT OF SHOTS</span>
            <button
              onClick={restart}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs border-2 border-white cursor-pointer active:translate-y-0.5"
            >
              TRY AGAIN
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] sm:text-xs text-slate-400 mt-2 text-center">
        Pull slingshot to aim • Shatter watchtower pillars & lob over the shield wall!
      </p>
    </div>
  );
};
