// Atmospheric ambient effects: floating dust motes, sakura petals, flickering candles & lanterns

export interface AmbientParticle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  alpha: number;
  baseAlpha: number;
  phase: number;
  phaseSpeed: number;
  color: string;
  type: 'mote' | 'sakura' | 'ember' | 'leaf' | 'cyber_scan';
  swayAmp?: number;
  rot?: number;
}

export interface CandleLight {
  x: number; // tile x
  y: number; // tile y
  radius: number; // in pixels
  color: string;
  type: 'candle' | 'shrine_lantern' | 'terminal_led' | 'chochin_lantern';
  flickerSpeed: number;
  flickerOffset: number;
}

export class AtmosphericSystem {
  private particles: AmbientParticle[] = [];
  private candles: CandleLight[] = [];
  private roomId: string = '';
  private widthPx: number = 0;
  private heightPx: number = 0;
  private tick: number = 0;

  public init(roomId: string, roomWidthTiles: number, roomHeightTiles: number, tileSize: number = 16) {
    this.roomId = roomId;
    this.widthPx = roomWidthTiles * tileSize;
    this.heightPx = roomHeightTiles * tileSize;
    this.tick = 0;
    this.particles = [];
    this.candles = [];

    // Setup room-specific candle and lantern locations
    if (roomId === 'room-1') {
      // Room 1: Cyber Akihabara Workshop — Hanging paper Chōchin lanterns + neon cyber indicators
      this.candles = [
        { x: 6, y: 1.8, radius: 36, color: 'rgba(239, 68, 68, 0.22)', type: 'chochin_lantern', flickerSpeed: 0.06, flickerOffset: 0.8 },
        { x: 16, y: 1.8, radius: 36, color: 'rgba(245, 158, 11, 0.22)', type: 'chochin_lantern', flickerSpeed: 0.07, flickerOffset: 2.4 },
        { x: 3, y: 2, radius: 24, color: 'rgba(56, 189, 248, 0.15)', type: 'terminal_led', flickerSpeed: 0.05, flickerOffset: 0 },
        { x: 9, y: 3.8, radius: 22, color: 'rgba(34, 197, 94, 0.12)', type: 'terminal_led', flickerSpeed: 0.08, flickerOffset: 3.2 },
        { x: 18, y: 8.8, radius: 24, color: 'rgba(168, 85, 247, 0.14)', type: 'terminal_led', flickerSpeed: 0.06, flickerOffset: 2.1 },
      ];

      // Akihabara cyber motes and neon particles
      const count = 36;
      for (let i = 0; i < count; i++) {
        const isCyber = i % 3 === 0;
        this.particles.push({
          x: Math.random() * this.widthPx,
          y: Math.random() * this.heightPx,
          size: Math.random() > 0.7 ? 2 : 1,
          vx: (Math.random() - 0.45) * 0.22,
          vy: -0.06 - Math.random() * 0.14,
          alpha: 0.25 + Math.random() * 0.5,
          baseAlpha: 0.25 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
          phaseSpeed: 0.02 + Math.random() * 0.03,
          color: isCyber ? '#38bdf8' : (Math.random() > 0.5 ? '#fde047' : '#f472b6'),
          type: isCyber ? 'cyber_scan' : 'mote',
        });
      }
    } else if (roomId === 'room-2') {
      // Room 2: Grand Ryokan Archive — Ancient wall sconces & floating bamboo/parchment wisps
      this.candles = [
        { x: 5, y: 1.6, radius: 36, color: 'rgba(245, 158, 11, 0.24)', type: 'candle', flickerSpeed: 0.09, flickerOffset: 0.5 },
        { x: 19, y: 1.6, radius: 36, color: 'rgba(245, 158, 11, 0.24)', type: 'candle', flickerSpeed: 0.08, flickerOffset: 2.7 },
        { x: 12, y: 7.6, radius: 34, color: 'rgba(251, 191, 36, 0.26)', type: 'candle', flickerSpeed: 0.11, flickerOffset: 1.1 },
        { x: 2, y: 5.5, radius: 26, color: 'rgba(245, 158, 11, 0.20)', type: 'candle', flickerSpeed: 0.07, flickerOffset: 4.2 },
        { x: 22, y: 5.5, radius: 26, color: 'rgba(245, 158, 11, 0.20)', type: 'candle', flickerSpeed: 0.10, flickerOffset: 3.3 },
      ];

      // Floating golden parchment dust & green bamboo leaf wisps
      const count = 44;
      for (let i = 0; i < count; i++) {
        const isLeaf = i % 4 === 0;
        this.particles.push({
          x: Math.random() * this.widthPx,
          y: Math.random() * this.heightPx,
          size: isLeaf ? 2 : 1,
          vx: isLeaf ? 0.12 + Math.random() * 0.18 : (Math.random() - 0.5) * 0.15,
          vy: isLeaf ? 0.20 + Math.random() * 0.25 : -0.06 - Math.random() * 0.10,
          alpha: 0.3 + Math.random() * 0.5,
          baseAlpha: 0.3 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
          phaseSpeed: 0.015 + Math.random() * 0.025,
          color: isLeaf ? '#22c55e' : (Math.random() > 0.3 ? '#fde047' : '#fed7aa'),
          type: isLeaf ? 'leaf' : 'mote',
          swayAmp: isLeaf ? 0.5 : 0.2,
          rot: Math.random() * Math.PI * 2,
        });
      }
    } else {
      // Room 3: The Sacred Torii Sanctum — Torii stone lanterns & drifting Sakura Fubuki (桜吹雪)
      this.candles = [
        // Stone Toro Lanterns flanking the final Torii Exit Gate
        { x: 11, y: 1.8, radius: 46, color: 'rgba(251, 146, 60, 0.28)', type: 'shrine_lantern', flickerSpeed: 0.10, flickerOffset: 0.2 },
        { x: 16, y: 1.8, radius: 46, color: 'rgba(251, 146, 60, 0.28)', type: 'shrine_lantern', flickerSpeed: 0.09, flickerOffset: 1.8 },
        // Sanctuary perimeter stone lanterns
        { x: 4, y: 4.5, radius: 36, color: 'rgba(251, 191, 36, 0.22)', type: 'shrine_lantern', flickerSpeed: 0.08, flickerOffset: 3.4 },
        { x: 23, y: 4.5, radius: 36, color: 'rgba(251, 191, 36, 0.22)', type: 'shrine_lantern', flickerSpeed: 0.11, flickerOffset: 2.1 },
        { x: 10, y: 16.5, radius: 34, color: 'rgba(251, 146, 60, 0.22)', type: 'shrine_lantern', flickerSpeed: 0.12, flickerOffset: 4.5 },
        { x: 17, y: 16.5, radius: 34, color: 'rgba(251, 146, 60, 0.22)', type: 'shrine_lantern', flickerSpeed: 0.07, flickerOffset: 0.9 },
      ];

      // Beautiful drifting Sakura petals (桜吹雪) and sacred shrine spirit embers
      const count = 48;
      for (let i = 0; i < count; i++) {
        const isPetal = i % 3 !== 0; // 66% Sakura petals, 33% glowing spirit embers
        this.particles.push({
          x: Math.random() * this.widthPx,
          y: Math.random() * this.heightPx,
          size: isPetal ? 2 : 1,
          vx: 0.16 + Math.random() * 0.28, // gentle rightward spring breeze
          vy: isPetal ? 0.28 + Math.random() * 0.38 : -0.16 - Math.random() * 0.22, // petals drift down, spirit embers float up
          alpha: 0.45 + Math.random() * 0.5,
          baseAlpha: 0.45 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
          phaseSpeed: 0.03 + Math.random() * 0.03,
          color: isPetal
            ? (['#fbcfe8', '#f472b6', '#fda4af', '#fecdd3'][Math.floor(Math.random() * 4)])
            : '#fef08a',
          type: isPetal ? 'sakura' : 'ember',
          swayAmp: isPetal ? 0.75 : 0.25,
          rot: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  public update(dt: number = 1.0) {
    this.tick += dt;

    for (const p of this.particles) {
      p.phase += p.phaseSpeed * dt;

      // Update positions with organic sine wave flutter
      if (p.type === 'sakura') {
        p.x += (p.vx + Math.sin(p.phase) * (p.swayAmp || 0.6)) * dt;
        p.y += p.vy * dt;
        p.alpha = p.baseAlpha * (0.7 + Math.sin(p.phase * 0.8) * 0.3);

        // Wrap around room bounds
        if (p.y > this.heightPx + 4) {
          p.y = -4;
          p.x = Math.random() * this.widthPx;
        }
        if (p.x > this.widthPx + 4) {
          p.x = -4;
        }
      } else if (p.type === 'leaf') {
        p.x += (p.vx + Math.sin(p.phase * 1.3) * (p.swayAmp || 0.5)) * dt;
        p.y += p.vy * dt;
        p.alpha = p.baseAlpha * (0.7 + Math.sin(p.phase) * 0.3);

        if (p.y > this.heightPx + 4) {
          p.y = -4;
          p.x = Math.random() * this.widthPx;
        }
        if (p.x > this.widthPx + 4) p.x = -4;
      } else if (p.type === 'ember') {
        p.x += (p.vx + Math.sin(p.phase * 1.5) * 0.3) * dt;
        p.y += p.vy * dt;
        p.alpha = p.baseAlpha * (0.6 + Math.sin(p.phase * 2) * 0.4);

        if (p.y < -4) {
          p.y = this.heightPx + 2;
          p.x = Math.random() * this.widthPx;
        }
      } else if (p.type === 'cyber_scan') {
        p.x += (p.vx + Math.sin(p.phase * 2) * 0.15) * dt;
        p.y += p.vy * dt;
        p.alpha = p.baseAlpha * (0.5 + Math.sin(p.phase * 3) * 0.5);

        if (p.y < -4) {
          p.y = this.heightPx + 2;
          p.x = Math.random() * this.widthPx;
        }
        if (p.x < -4) p.x = this.widthPx + 2;
        if (p.x > this.widthPx + 4) p.x = -2;
      } else {
        // Floating dust mote
        p.x += (p.vx + Math.cos(p.phase) * 0.12) * dt;
        p.y += p.vy * dt;
        p.alpha = p.baseAlpha * (0.5 + Math.sin(p.phase) * 0.5);

        // Wrap around
        if (p.y < -4) {
          p.y = this.heightPx + 2;
          p.x = Math.random() * this.widthPx;
        }
        if (p.x < -4) p.x = this.widthPx + 2;
        if (p.x > this.widthPx + 4) p.x = -2;
      }
    }
  }

  // 1. Draw warm ambient floor glow rings beneath objects
  public drawFloorGlow(ctx: CanvasRenderingContext2D, tileSize: number) {
    for (const candle of this.candles) {
      const flicker =
        Math.sin(this.tick * candle.flickerSpeed + candle.flickerOffset) * 0.2 +
        Math.cos(this.tick * (candle.flickerSpeed * 1.6) + candle.flickerOffset) * 0.1;

      const currentRadius = Math.max(12, candle.radius * (1 + flicker * 0.2));
      const centerX = candle.x * tileSize + 8;
      const centerY = candle.y * tileSize + 8;

      const grad = ctx.createRadialGradient(
        centerX,
        centerY,
        2,
        centerX,
        centerY,
        currentRadius
      );
      grad.addColorStop(0, candle.color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2. Draw wall candle sconces, shrine lanterns, Chōchin lanterns, and LEDs
  public drawCandlesAndLanterns(ctx: CanvasRenderingContext2D, tileSize: number) {
    for (const candle of this.candles) {
      const px = Math.round(candle.x * tileSize);
      const py = Math.round(candle.y * tileSize);

      const flickerVal =
        Math.sin(this.tick * candle.flickerSpeed + candle.flickerOffset) +
        Math.cos(this.tick * (candle.flickerSpeed * 2.3) + candle.flickerOffset);
      const flameShift = flickerVal > 0.4 ? 1 : flickerVal < -0.4 ? -1 : 0;
      const flameHeight = flickerVal > 0.2 ? 4 : 3;

      if (candle.type === 'chochin_lantern') {
        // Japanese Red Hanging Paper Lantern (提灯 - Chōchin)
        // Black iron hook & hanging wire
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px + 7, py + 1, 2, 3);
        // Top cap
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(px + 5, py + 3, 6, 2);

        // Red Paper Lantern Body
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(px + 4, py + 5, 8, 8);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(px + 5, py + 6, 6, 6);

        // Warm inner candlelight glow
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(px + 6 + flameShift, py + 7, 4, 4);

        // Bottom black rim
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(px + 5, py + 13, 6, 2);
        // Bottom red silk tassel
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(px + 7, py + 15, 2, 3);

      } else if (candle.type === 'candle') {
        // Pixel Brass Wall Bracket
        ctx.fillStyle = '#78350f'; // Dark bronze bracket
        ctx.fillRect(px + 6, py + 10, 4, 3);
        ctx.fillRect(px + 7, py + 8, 2, 2);

        // Candle Wax Body
        ctx.fillStyle = '#fef3c7'; // Cream wax
        ctx.fillRect(px + 6, py + 4, 4, 5);
        ctx.fillStyle = '#d97706'; // Wax shade
        ctx.fillRect(px + 9, py + 5, 1, 4);

        // Wick
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(px + 7, py + 3, 2, 1);

        // Animated Pixel Flame
        ctx.fillStyle = '#f97316';
        ctx.fillRect(px + 7 + flameShift, py + 3 - flameHeight, 2, flameHeight);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(px + 7 + flameShift, py + 2 - (flameHeight > 3 ? 1 : 0), 2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 8 + flameShift, py + 2 - (flameHeight > 3 ? 1 : 0), 1, 1);

      } else if (candle.type === 'shrine_lantern') {
        // Japanese Stone Toro Lantern (石灯籠)
        // Roof cap with pagoda flare
        ctx.fillStyle = '#475569';
        ctx.fillRect(px + 2, py + 3, 12, 2);
        ctx.fillRect(px + 3, py + 2, 10, 1);
        ctx.fillStyle = '#334155';
        ctx.fillRect(px + 5, py + 1, 6, 1);

        // Lantern Chamber (Washi paper shoji with inner sacred fire)
        ctx.fillStyle = '#78350f'; // Wood lattice frame
        ctx.fillRect(px + 4, py + 5, 8, 5);
        ctx.fillStyle = '#fbbf24'; // Lit paper center
        ctx.fillRect(px + 5, py + 6, 6, 3);

        // Inner glowing sacred flame
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(px + 7 + flameShift, py + 6, 2, 2);

        // Stone Base
        ctx.fillStyle = '#475569';
        ctx.fillRect(px + 5, py + 10, 6, 3);
        ctx.fillRect(px + 4, py + 13, 8, 2);

      } else {
        // Terminal Status LED Beacon
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(px + 6, py + 8, 4, 4);

        const isLit = Math.sin(this.tick * candle.flickerSpeed * 2 + candle.flickerOffset) > -0.2;
        ctx.fillStyle = isLit ? '#38bdf8' : '#0369a1';
        ctx.fillRect(px + 7, py + 9, 2, 2);
        if (isLit) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px + 7, py + 9, 1, 1);
        }
      }
    }
  }

  // 3. Draw Foreground Floating Dust Motes, Sakura Petals, Leaves, and Embers
  public drawAtmosphere(ctx: CanvasRenderingContext2D) {
    ctx.save();

    for (const p of this.particles) {
      if (p.alpha <= 0.01) continue;

      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = p.color;

      const px = Math.round(p.x);
      const py = Math.round(p.y);

      if (p.type === 'sakura') {
        // Delicate cherry blossom petal (桜の花びら) with organic sway rotation
        ctx.save();
        ctx.translate(px, py);
        if (p.rot !== undefined) {
          ctx.rotate(p.rot + Math.sin(p.phase) * 0.45);
        }
        ctx.fillStyle = p.color;
        ctx.fillRect(-1, -1, 3, 2);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(0, 0, 1, 1);
        ctx.restore();

      } else if (p.type === 'leaf') {
        // Bamboo / Tea leaf wisp
        ctx.save();
        ctx.translate(px, py);
        if (p.rot !== undefined) {
          ctx.rotate(p.rot + Math.sin(p.phase * 0.8) * 0.4);
        }
        ctx.fillStyle = p.color;
        ctx.fillRect(-1, 0, 3, 1);
        ctx.fillRect(0, -1, 1, 3);
        ctx.restore();

      } else if (p.type === 'cyber_scan') {
        // Horizontal digital scan fleck
        ctx.fillRect(px, py, 3, 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 1, py, 1, 1);

      } else if (p.type === 'ember') {
        // Sacred altar spirit ember / Hitodama spark
        ctx.fillRect(px, py, 1, 1);
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(px, py - 1, 1, 1);

      } else {
        // Floating dust mote: soft square pixel
        ctx.fillRect(px, py, p.size, p.size);
      }
    }

    ctx.restore();
  }
}
