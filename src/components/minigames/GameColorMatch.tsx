import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../../utils/audio';

interface GameColorMatchProps {
  onSuccess: () => void;
  onFailure?: () => void;
}

interface ColorNode {
  id: string;
  english: string;
  color: string;
  borderColor: string;
  symbol: string;
  kana: string;
  kanji: string;
  romaji: string;
}

const COLOR_SET: ColorNode[] = [
  {
    id: 'red',
    english: 'RED',
    color: '#ef4444',
    borderColor: '#b91c1c',
    symbol: 'R',
    kana: 'あか',
    kanji: '赤',
    romaji: 'aka',
  },
  {
    id: 'blue',
    english: 'BLUE',
    color: '#3b82f6',
    borderColor: '#1d4ed8',
    symbol: 'B',
    kana: 'あお',
    kanji: '青',
    romaji: 'ao',
  },
  {
    id: 'green',
    english: 'GREEN',
    color: '#10b981',
    borderColor: '#047857',
    symbol: 'G',
    kana: 'みどり',
    kanji: '緑',
    romaji: 'midori',
  },
  {
    id: 'yellow',
    english: 'YELLOW',
    color: '#eab308',
    borderColor: '#a16207',
    symbol: 'Y',
    kana: 'きいろ',
    kanji: '黄色',
    romaji: 'kiiro',
  },
  {
    id: 'purple',
    english: 'PURPLE',
    color: '#a855f7',
    borderColor: '#7e22ce',
    symbol: 'P',
    kana: 'むらさき',
    kanji: '紫',
    romaji: 'murasaki',
  },
];

export const GameColorMatch: React.FC<GameColorMatchProps> = ({ onSuccess }) => {
  const [leftNodes, setLeftNodes] = useState<ColorNode[]>([]);
  const [rightNodes, setRightNodes] = useState<ColorNode[]>([]);
  const [connections, setConnections] = useState<Record<string, string>>({}); // leftId -> rightId
  const [draggingLeftId, setDraggingLeftId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [won, setWon] = useState(false);

  // Reference to the exact board container holding both the SVG and the pins
  const boardRef = useRef<HTMLDivElement | null>(null);
  const leftPinRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightPinRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const l = [...COLOR_SET];
    const r = [...COLOR_SET].sort(() => Math.random() - 0.5);
    setLeftNodes(l);
    setRightNodes(r);
    setConnections({});
  }, []);

  const getPinCoords = (element: HTMLElement | null) => {
    if (!element || !boardRef.current) return { x: 0, y: 0 };
    const bRect = boardRef.current.getBoundingClientRect();
    const eRect = element.getBoundingClientRect();
    return {
      x: eRect.left - bRect.left + eRect.width / 2,
      y: eRect.top - bRect.top + eRect.height / 2,
    };
  };

  const updateMouse = (e: React.MouseEvent | React.TouchEvent) => {
    if (!boardRef.current) return;
    const bRect = boardRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setMousePos({
      x: clientX - bRect.left,
      y: clientY - bRect.top,
    });
  };

  const handleLeftPinClick = (id: string) => {
    if (won) return;
    if (draggingLeftId === id) {
      setDraggingLeftId(null);
      setMousePos(null);
    } else {
      sounds.playSelect();
      setDraggingLeftId(id);
      const el = leftPinRefs.current[id];
      const coords = getPinCoords(el);
      setMousePos(coords);
    }
  };

  const handleStartDrag = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    if (won) return;
    sounds.playSelect();
    setDraggingLeftId(id);
    updateMouse(e);
  };

  const handleDropOnRight = (rightId: string) => {
    if (!draggingLeftId || won) return;

    const targetNode = COLOR_SET.find((c) => c.id === rightId);
    if (targetNode) {
      sounds.speakJapanese(targetNode.kana);
    } else {
      sounds.playKanaObtained();
    }

    const nextConn = { ...connections, [draggingLeftId]: rightId };
    setConnections(nextConn);
    setDraggingLeftId(null);
    setMousePos(null);

    // Verify all correct
    if (Object.keys(nextConn).length === COLOR_SET.length) {
      const allMatched = Object.entries(nextConn).every(([l, r]) => l === r);
      if (allMatched) {
        setWon(true);
        sounds.playSuccess();
        setTimeout(() => onSuccess(), 1200);
      } else {
        sounds.playFail();
      }
    }
  };

  const handleBoardTouchEnd = (e: React.TouchEvent) => {
    if (!draggingLeftId) return;
    const touch = e.changedTouches[0];
    if (touch) {
      // Find which right pin (if any) the finger was released over
      for (const [rId, el] of Object.entries(rightPinRefs.current)) {
        if (el) {
          const rect = el.getBoundingClientRect();
          if (
            touch.clientX >= rect.left - 10 &&
            touch.clientX <= rect.right + 10 &&
            touch.clientY >= rect.top - 10 &&
            touch.clientY <= rect.bottom + 10
          ) {
            handleDropOnRight(rId);
            return;
          }
        }
      }
    }
    // If not released over a right pin, keep selection for tap-to-connect!
  };

  const handleGlobalUp = () => {
    // Keep draggingLeftId if selected via tap, so user can tap right pin
  };

  const removeConnection = (leftId: string) => {
    if (won) return;
    sounds.playBlip(320);
    const next = { ...connections };
    delete next[leftId];
    setConnections(next);
  };

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[580px]">
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm">
        <span className="text-amber-400 font-bold">ENGLISH ➔ 日本語 COLORS</span>
        <span className="text-cyan-400 text-[10px] sm:text-xs">CONNECT WIRES TO LEARN</span>
      </div>

      {/* Board container: Exact parent of SVG and pins */}
      <div
        ref={boardRef}
        onMouseMove={(e) => draggingLeftId && updateMouse(e)}
        onTouchMove={(e) => draggingLeftId && updateMouse(e)}
        onMouseUp={handleGlobalUp}
        onTouchEnd={handleBoardTouchEnd}
        className="relative bg-slate-950 p-2 sm:p-5 border-4 border-slate-700 shadow-2xl w-full h-[260px] sm:h-[340px] md:h-[380px] flex justify-between items-center overflow-hidden touch-none"
      >
        {/* SVG Flexible Wires Layer: Exact coordinate match */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {/* Completed Wire Connections */}
          {Object.entries(connections).map(([leftId, rightId]) => {
            const leftEl = leftPinRefs.current[leftId];
            const rightEl = rightPinRefs.current[rightId];
            const start = getPinCoords(leftEl);
            const end = getPinCoords(rightEl);
            const color = COLOR_SET.find((c) => c.id === leftId)?.color || '#e2e8f0';

            const cX1 = start.x + (end.x - start.x) * 0.45;
            const cX2 = start.x + (end.x - start.x) * 0.55;

            return (
              <g key={`${leftId}-${rightId}`}>
                {/* Outer shadow / cable jacket */}
                <path
                  d={`M ${start.x} ${start.y} C ${cX1} ${start.y}, ${cX2} ${end.y}, ${end.x} ${end.y}`}
                  stroke="rgba(0,0,0,0.7)"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Inner colored wire */}
                <path
                  d={`M ${start.x} ${start.y} C ${cX1} ${start.y}, ${cX2} ${end.y}, ${end.x} ${end.y}`}
                  stroke={color}
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Terminal Connection Caps */}
                <circle cx={start.x} cy={start.y} r="5" fill="#facc15" stroke="#000" strokeWidth="1.5" />
                <circle cx={end.x} cy={end.y} r="5" fill="#facc15" stroke="#000" strokeWidth="1.5" />
              </g>
            );
          })}

          {/* Currently Dragged Live Wire */}
          {draggingLeftId && mousePos && (
            (() => {
              const leftEl = leftPinRefs.current[draggingLeftId];
              const start = getPinCoords(leftEl);
              const color = COLOR_SET.find((c) => c.id === draggingLeftId)?.color || '#facc15';
              const cX1 = start.x + (mousePos.x - start.x) * 0.45;
              const cX2 = start.x + (mousePos.x - start.x) * 0.55;

              return (
                <g>
                  <path
                    d={`M ${start.x} ${start.y} C ${cX1} ${start.y}, ${cX2} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
                    stroke="rgba(0,0,0,0.6)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <path
                    d={`M ${start.x} ${start.y} C ${cX1} ${start.y}, ${cX2} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
                    stroke={color}
                    strokeWidth="5"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="6 3"
                  />
                  <circle cx={start.x} cy={start.y} r="5" fill="#ffffff" />
                  <circle cx={mousePos.x} cy={mousePos.y} r="6" fill={color} stroke="#ffffff" strokeWidth="2" />
                </g>
              );
            })()
          )}
        </svg>

        {/* Left Input Terminals (English) */}
        <div className="flex flex-col gap-1.5 sm:gap-4 md:gap-5 z-20">
          {leftNodes.map((node) => {
            const isConnected = !!connections[node.id];
            const isSelected = draggingLeftId === node.id;
            return (
              <div key={node.id} className="flex items-center gap-1.5 sm:gap-2.5">
                <div
                  ref={(el) => { leftPinRefs.current[node.id] = el; }}
                  onMouseDown={(e) => handleStartDrag(node.id, e)}
                  onTouchStart={(e) => handleStartDrag(node.id, e)}
                  onClick={() => isConnected ? removeConnection(node.id) : handleLeftPinClick(node.id)}
                  className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center font-bold cursor-pointer transition-transform ${
                    isSelected
                      ? 'ring-4 ring-yellow-300 scale-110 shadow-xl'
                      : isConnected
                      ? 'ring-2 ring-yellow-400/80 scale-95'
                      : 'hover:scale-110 shadow-lg'
                  }`}
                  style={{ backgroundColor: node.color, borderColor: node.borderColor }}
                  title={`${node.english} (${node.symbol})`}
                >
                  <span className="text-black font-extrabold text-[10px] sm:text-xs md:text-sm">{node.symbol}</span>
                </div>
                <span className="text-[10px] sm:text-xs md:text-sm text-slate-200 font-mono tracking-wider font-bold">
                  {node.english}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Output Terminals (Japanese Vocabulary + Pronunciation) */}
        <div className="flex flex-col gap-1.5 sm:gap-4 md:gap-5 z-20">
          {rightNodes.map((node) => {
            const isConnectedToMe = Object.values(connections).includes(node.id);
            return (
              <div key={node.id} className="flex items-center justify-end gap-1.5 sm:gap-2">
                {/* Japanese Name & English Pronunciation Text */}
                <div className="flex flex-col items-end text-right min-w-[65px] sm:min-w-[85px]">
                  <div className="flex items-center justify-end gap-1 w-full">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.speakJapanese(node.kana);
                      }}
                      className="text-slate-400 hover:text-yellow-300 active:scale-125 text-xs transition-transform p-0.5 cursor-pointer shrink-0"
                      title={`Listen pronunciation for ${node.english}`}
                    >
                      🔊
                    </button>
                    <span className="font-kana text-[11px] sm:text-xs md:text-sm font-bold text-slate-100 tracking-wider">
                      {node.kana}
                    </span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-mono text-cyan-300 font-bold tracking-wider">
                    /{node.romaji}/
                  </span>
                </div>

                {/* Right Pin Terminal Socket with Kanji */}
                <div
                  ref={(el) => { rightPinRefs.current[node.id] = el; }}
                  onMouseUp={() => handleDropOnRight(node.id)}
                  onTouchEnd={() => handleDropOnRight(node.id)}
                  onClick={() => {
                    if (draggingLeftId) {
                      handleDropOnRight(node.id);
                    } else {
                      sounds.speakJapanese(node.kana);
                    }
                  }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center font-bold cursor-pointer transition-transform ${
                    isConnectedToMe
                      ? 'ring-4 ring-emerald-400 scale-105 shadow-xl'
                      : 'hover:scale-110 shadow-lg'
                  }`}
                  style={{
                    backgroundColor: isConnectedToMe ? node.color : '#0f172a',
                    borderColor: node.color,
                  }}
                  title={`${node.english} -> ${node.kana} (${node.romaji})`}
                >
                  <span
                    className={`font-kana font-extrabold text-xs sm:text-sm md:text-base ${
                      isConnectedToMe ? 'text-black font-black' : 'text-slate-200'
                    }`}
                  >
                    {node.kanji}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Victory Review & Reward Overlay */}
        {won && (
          <div className="absolute inset-0 bg-black/92 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in z-30">
            <span className="text-emerald-400 text-base sm:text-lg mb-1 font-bold">★ COLORS HARMONIZED! ★</span>
            <span className="text-xs text-slate-300 mb-3 text-center">You mastered 5 Japanese color terms:</span>

            {/* Educational recap dictionary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4 w-full max-w-sm">
              {COLOR_SET.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between bg-slate-900 border border-slate-700 px-2.5 py-1 rounded text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-slate-200 font-bold">{c.english}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-kana text-yellow-300 font-bold">{c.kana}</span>
                    <span className="text-[10px] font-mono text-cyan-300">({c.romaji})</span>
                    <button
                      onClick={() => sounds.speakJapanese(c.kana)}
                      className="text-xs hover:scale-125 transition-transform cursor-pointer ml-0.5"
                      title="Listen"
                    >
                      🔊
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onSuccess()}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-bold border-2 border-white cursor-pointer shadow-lg active:scale-95"
            >
              CLAIM REWARD NOW
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] sm:text-xs text-slate-400 mt-3 text-center">
        Connect English colors to Japanese names. Tap 🔊 or right pins to hear native pronunciation!
      </p>
    </div>
  );
};
