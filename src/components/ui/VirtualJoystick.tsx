import React, { useRef, useState } from 'react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  onRelease: () => void;
  disabled?: boolean;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  onRelease,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  const MAX_RADIUS = 36; // Maximum thumb travel radius in px
  const DEADZONE = 5; // Minimum deadzone radius in px

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || activePointerIdRef.current !== null) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    centerRef.current = { x: cx, y: cy };
    activePointerIdRef.current = e.pointerId;
    setIsActive(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    processPointer(e.clientX, e.clientY);
  };

  const processPointer = (clientX: number, clientY: number) => {
    const dx = clientX - centerRef.current.x;
    const dy = clientY - centerRef.current.y;
    const dist = Math.hypot(dx, dy);

    let kx = dx;
    let ky = dy;
    if (dist > MAX_RADIUS) {
      kx = (dx / dist) * MAX_RADIUS;
      ky = (dy / dist) * MAX_RADIUS;
    }

    setKnobPos({ x: kx, y: ky });

    if (dist < DEADZONE) {
      onMove({ x: 0, y: 0 });
    } else {
      const normX = kx / MAX_RADIUS;
      const normY = ky / MAX_RADIUS;
      onMove({ x: normX, y: normY });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    processPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    activePointerIdRef.current = null;
    setIsActive(false);
    setKnobPos({ x: 0, y: 0 });
    onRelease();
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-[110px] h-[110px] sm:w-[124px] sm:h-[124px] rounded-full bg-slate-950/95 border-4 ${
        isActive ? 'border-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.45)]' : 'border-slate-700 shadow-2xl'
      } flex items-center justify-center select-none touch-none cursor-pointer transition-colors`}
      style={{ touchAction: 'none' }}
      title="Touch & Drag Virtual Joystick"
    >
      {/* Directional cardinal markings */}
      <span className="absolute top-1 text-[8px] text-slate-500 font-pixel pointer-events-none select-none">▲</span>
      <span className="absolute bottom-1 text-[8px] text-slate-500 font-pixel pointer-events-none select-none">▼</span>
      <span className="absolute left-1.5 text-[8px] text-slate-500 font-pixel pointer-events-none select-none">◀</span>
      <span className="absolute right-1.5 text-[8px] text-slate-500 font-pixel pointer-events-none select-none">▶</span>

      {/* Guide track ring */}
      <div className="absolute w-16 h-16 sm:w-18 sm:h-18 rounded-full border border-dashed border-slate-700/60 pointer-events-none" />

      {/* Floating Joystick Thumb Knob */}
      <div
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center pointer-events-none ${
          isActive
            ? 'bg-gradient-to-b from-yellow-400 via-amber-500 to-amber-700 border-white shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.4)]'
            : 'bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 border-slate-500 shadow-[0_4px_10px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2)]'
        }`}
        style={{
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
        }}
      >
        {/* Grip texture inner ring */}
        <div
          className={`w-5 h-5 rounded-full border ${
            isActive ? 'border-yellow-200 bg-amber-400/40' : 'border-slate-600 bg-slate-900/60'
          }`}
        />
      </div>
    </div>
  );
};
