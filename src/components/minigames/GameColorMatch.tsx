import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [activeLeftId, setActiveLeftId] = useState<string | null>(null);
  const [hoveredRightId, setHoveredRightId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorNodeId, setErrorNodeId] = useState<string | null>(null);
  const [won, setWon] = useState(false);

  // References to the board and all pin/row elements
  const boardRef = useRef<HTMLDivElement | null>(null);
  const leftPinRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightPinRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Prevent ghost mouse clicks after touch events on mobile
  const lastTouchTimeRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const errorTimerRef = useRef<number | null>(null);

  const showError = useCallback((msg: string, nodeId?: string) => {
    sounds.playFail();
    setErrorMessage(msg);
    if (nodeId) setErrorNodeId(nodeId);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = window.setTimeout(() => {
      setErrorMessage(null);
      setErrorNodeId(null);
    }, 1200);
  }, []);

  useEffect(() => {
    const l = [...COLOR_SET];
    const r = [...COLOR_SET].sort(() => Math.random() - 0.5);
    setLeftNodes(l);
    setRightNodes(r);
    setConnections({});
    setActiveLeftId(null);
    setDragPos(null);

    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // Convert element or client coordinates into exact internal SVG coordinates inside boardRef
  const getPinCoords = useCallback((element: HTMLElement | null) => {
    if (!element || !boardRef.current) return { x: 0, y: 0 };
    const bRect = boardRef.current.getBoundingClientRect();
    const eRect = element.getBoundingClientRect();
    const scaleX = (boardRef.current.offsetWidth || 1) / (bRect.width || 1);
    const scaleY = (boardRef.current.offsetHeight || 1) / (bRect.height || 1);
    return {
      x: (eRect.left - bRect.left + eRect.width / 2) * scaleX,
      y: (eRect.top - bRect.top + eRect.height / 2) * scaleY,
    };
  }, []);

  const getInternalCoords = useCallback((clientX: number, clientY: number) => {
    if (!boardRef.current) return { x: 0, y: 0 };
    const bRect = boardRef.current.getBoundingClientRect();
    const scaleX = (boardRef.current.offsetWidth || 1) / (bRect.width || 1);
    const scaleY = (boardRef.current.offsetHeight || 1) / (bRect.height || 1);
    return {
      x: (clientX - bRect.left) * scaleX,
      y: (clientY - bRect.top) * scaleY,
    };
  }, []);

  // Find the target right node under or closest to pointer (generous mobile hit area)
  const findTargetRightNode = useCallback(
    (clientX: number, clientY: number): string | null => {
      if (!boardRef.current) return null;
      const bRect = boardRef.current.getBoundingClientRect();
      // Target must be in the right 60% of the board
      if (clientX < bRect.left + bRect.width * 0.35) return null;

      let bestId: string | null = null;
      let bestDist = Infinity;

      for (const node of rightNodes) {
        const el = rightRowRefs.current[node.id];
        if (!el) continue;
        const rRect = el.getBoundingClientRect();
        // Generous vertical tolerance (±30px)
        if (clientY >= rRect.top - 30 && clientY <= rRect.bottom + 30) {
          const dist = Math.abs(clientY - (rRect.top + rRect.height / 2));
          if (dist < bestDist) {
            bestDist = dist;
            bestId = node.id;
          }
        }
      }
      return bestId;
    },
    [rightNodes]
  );

  const connectPins = useCallback(
    (leftId: string, rightId: string) => {
      if (won) return;

      // 1. Prevent connecting to already finished right nodes
      if (Object.values(connections).includes(rightId)) {
        showError('ALREADY CONNECTED!', rightId);
        setActiveLeftId(null);
        setDragPos(null);
        setHoveredRightId(null);
        isDraggingRef.current = false;
        return;
      }

      // 2. Only allow matching colors (leftId must equal rightId)
      if (leftId !== rightId) {
        showError('WRONG COLOR! MATCH BY COLOR', rightId);
        setActiveLeftId(null);
        setDragPos(null);
        setHoveredRightId(null);
        isDraggingRef.current = false;
        return;
      }

      // 3. Correct match!
      const targetNode = COLOR_SET.find((c) => c.id === rightId);
      if (targetNode) {
        sounds.speakJapanese(targetNode.kana);
      }
      sounds.playKanaObtained();

      setConnections((prev) => {
        const next = { ...prev, [leftId]: rightId };

        // Verify if all 5 colors are correctly connected
        if (Object.keys(next).length === COLOR_SET.length) {
          setWon(true);
          sounds.playSuccess();
          setTimeout(() => onSuccess(), 1200);
        }
        return next;
      });

      setActiveLeftId(null);
      setDragPos(null);
      setHoveredRightId(null);
      isDraggingRef.current = false;
    },
    [won, connections, onSuccess, showError]
  );

  // User starts interacting with a Left Pin (click or touch)
  const handleLeftPinStart = (leftId: string, clientX?: number, clientY?: number) => {
    if (won) return;

    // If already connected, do not allow starting a new wire
    if (connections[leftId]) {
      const targetNode = COLOR_SET.find((c) => c.id === leftId);
      if (targetNode) {
        sounds.speakJapanese(targetNode.kana);
      }
      return;
    }

    // If currently active and tapped again, deselect
    if (activeLeftId === leftId && !isDraggingRef.current) {
      setActiveLeftId(null);
      setDragPos(null);
      return;
    }

    sounds.playSelect();
    setActiveLeftId(leftId);
    isDraggingRef.current = true;

    if (clientX !== undefined && clientY !== undefined) {
      setDragPos(getInternalCoords(clientX, clientY));
    } else {
      const el = leftPinRefs.current[leftId];
      setDragPos(getPinCoords(el));
    }
  };

  // User drags pointer across board
  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!activeLeftId || !isDraggingRef.current) return;
    setDragPos(getInternalCoords(clientX, clientY));
    const target = findTargetRightNode(clientX, clientY);
    if (target && !Object.values(connections).includes(target)) {
      setHoveredRightId(target);
    } else {
      setHoveredRightId(null);
    }
  };

  // User releases pointer
  const handlePointerUp = (clientX?: number, clientY?: number) => {
    if (!activeLeftId) return;

    if (clientX !== undefined && clientY !== undefined && isDraggingRef.current) {
      const target = findTargetRightNode(clientX, clientY);
      if (target) {
        connectPins(activeLeftId, target);
        return;
      }
    }

    // If released on empty space, keep selected for tap-to-connect!
    isDraggingRef.current = false;
    setHoveredRightId(null);
    // Move drag line end to pin center so it sits waiting
    const el = leftPinRefs.current[activeLeftId];
    setDragPos(getPinCoords(el));
  };

  // User taps a Right Pin or its row
  const handleRightRowClick = (rightId: string) => {
    if (won) return;

    if (activeLeftId) {
      connectPins(activeLeftId, rightId);
    } else {
      const targetNode = COLOR_SET.find((c) => c.id === rightId);
      if (targetNode) {
        sounds.speakJapanese(targetNode.kana);
      }
    }
  };

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[580px]">
      <div className="flex justify-between items-center w-full mb-1 sm:mb-2 text-xs sm:text-sm px-1">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold">ENGLISH ➔ 日本語 COLORS</span>
          <span className="text-[10px] font-mono text-slate-400">
            ({Object.keys(connections).length}/{COLOR_SET.length})
          </span>
        </div>
        <span
          className={`text-[10px] sm:text-xs transition-colors font-bold ${
            errorMessage
              ? 'text-rose-400 animate-pulse'
              : activeLeftId
              ? 'text-yellow-300'
              : 'text-cyan-400'
          }`}
        >
          {errorMessage
            ? `❌ ${errorMessage}`
            : activeLeftId
            ? 'TAP MATCHING JAPANESE PIN'
            : 'MATCH SAME COLORS (TAP / DRAG)'}
        </span>
      </div>

      {/* Board container: Exact parent of SVG and pins */}
      <div
        ref={boardRef}
        onMouseMove={(e) => isDraggingRef.current && handlePointerMove(e.clientX, e.clientY)}
        onMouseUp={(e) => handlePointerUp(e.clientX, e.clientY)}
        onTouchMove={(e) => {
          if (isDraggingRef.current && e.touches[0]) {
            handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={(e) => {
          lastTouchTimeRef.current = Date.now();
          if (e.changedTouches[0]) {
            handlePointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
          } else {
            handlePointerUp();
          }
        }}
        className="relative bg-slate-950 p-2 sm:p-4 border-4 border-slate-700 shadow-2xl w-full h-[230px] xs:h-[260px] sm:h-[320px] md:h-[360px] flex justify-between items-center overflow-hidden touch-none"
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
                  stroke="rgba(0,0,0,0.75)"
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

          {/* Currently Dragged or Active Live Wire */}
          {activeLeftId && dragPos && (
            (() => {
              const leftEl = leftPinRefs.current[activeLeftId];
              const start = getPinCoords(leftEl);
              const color = COLOR_SET.find((c) => c.id === activeLeftId)?.color || '#facc15';
              const cX1 = start.x + (dragPos.x - start.x) * 0.45;
              const cX2 = start.x + (dragPos.x - start.x) * 0.55;

              return (
                <g>
                  <path
                    d={`M ${start.x} ${start.y} C ${cX1} ${start.y}, ${cX2} ${dragPos.y}, ${dragPos.x} ${dragPos.y}`}
                    stroke="rgba(0,0,0,0.6)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <path
                    d={`M ${start.x} ${start.y} C ${cX1} ${start.y}, ${cX2} ${dragPos.y}, ${dragPos.x} ${dragPos.y}`}
                    stroke={color}
                    strokeWidth="5"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="6 3"
                  />
                  <circle cx={start.x} cy={start.y} r="5" fill="#ffffff" />
                  <circle cx={dragPos.x} cy={dragPos.y} r="6" fill={color} stroke="#ffffff" strokeWidth="2" />
                </g>
              );
            })()
          )}
        </svg>

        {/* Left Input Terminals (English) */}
        <div className="flex flex-col justify-around h-full z-20 py-1">
          {leftNodes.map((node) => {
            const isConnected = !!connections[node.id];
            const isSelected = activeLeftId === node.id;
            return (
              <div
                key={node.id}
                onClick={() => {
                  if (Date.now() - lastTouchTimeRef.current < 450) return;
                  handleLeftPinStart(node.id);
                }}
                onTouchStart={(e) => {
                  if (e.touches[0]) {
                    handleLeftPinStart(node.id, e.touches[0].clientX, e.touches[0].clientY);
                  } else {
                    handleLeftPinStart(node.id);
                  }
                }}
                onMouseDown={(e) => {
                  handleLeftPinStart(node.id, e.clientX, e.clientY);
                }}
                className={`flex items-center gap-1 sm:gap-2.5 py-0.5 transition-transform ${
                  isConnected ? 'cursor-default opacity-90' : 'cursor-pointer group active:scale-95'
                }`}
              >
                <div
                  ref={(el) => {
                    leftPinRefs.current[node.id] = el;
                  }}
                  className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center font-bold transition-all shadow-md ${
                    isSelected
                      ? 'ring-4 ring-yellow-300 scale-110 shadow-yellow-500/50'
                      : isConnected
                      ? 'ring-3 ring-emerald-400 scale-105 shadow-emerald-500/40 opacity-90'
                      : 'group-hover:scale-105'
                  }`}
                  style={{ backgroundColor: node.color, borderColor: node.borderColor }}
                  title={`${node.english} (${node.symbol})`}
                >
                  <span className="text-black font-extrabold text-[10px] sm:text-xs md:text-sm">
                    {isConnected ? '✓' : node.symbol}
                  </span>
                </div>
                <span
                  className={`text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-mono tracking-wider font-bold transition-colors ${
                    isSelected ? 'text-yellow-300' : 'text-slate-200 group-hover:text-white'
                  }`}
                >
                  {node.english}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Output Terminals (Japanese Vocabulary + Pronunciation) */}
        <div className="flex flex-col justify-around h-full z-20 py-1">
          {rightNodes.map((node) => {
            const isConnectedToMe = Object.values(connections).includes(node.id);
            const isHovered = hoveredRightId === node.id && !isConnectedToMe;
            const isError = errorNodeId === node.id;
            return (
              <div
                key={node.id}
                ref={(el) => {
                  rightRowRefs.current[node.id] = el;
                }}
                onClick={() => {
                  if (Date.now() - lastTouchTimeRef.current < 450) return;
                  handleRightRowClick(node.id);
                }}
                onTouchEnd={(e) => {
                  lastTouchTimeRef.current = Date.now();
                  if (activeLeftId) {
                    e.preventDefault();
                    connectPins(activeLeftId, node.id);
                  }
                }}
                className={`flex items-center justify-end gap-1 sm:gap-2 py-0.5 px-1 rounded transition-all active:scale-95 ${
                  isError
                    ? 'bg-rose-500/20 ring-2 ring-rose-400'
                    : isHovered
                    ? 'bg-amber-500/20 ring-2 ring-yellow-400'
                    : isConnectedToMe
                    ? 'bg-emerald-950/20 cursor-default'
                    : 'hover:bg-slate-900/60 cursor-pointer'
                }`}
              >
                {/* Japanese Name & English Pronunciation Text */}
                <div className="flex flex-col items-end text-right min-w-[55px] xs:min-w-[65px] sm:min-w-[85px]">
                  <div className="flex items-center justify-end gap-1 w-full">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.speakJapanese(node.kana);
                      }}
                      className="text-slate-400 hover:text-yellow-300 active:scale-125 text-xs transition-transform p-0.5 cursor-pointer shrink-0"
                      title={`Listen pronunciation for ${node.english}`}
                    >
                      🔊
                    </button>
                    <span className="font-kana text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-bold text-slate-100 tracking-wider">
                      {node.kana}
                    </span>
                  </div>
                  <span className="text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs font-mono text-cyan-300 font-bold tracking-wider">
                    /{node.romaji}/
                  </span>
                </div>

                {/* Right Pin Terminal Socket with Kanji */}
                <div
                  ref={(el) => {
                    rightPinRefs.current[node.id] = el;
                  }}
                  className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center font-bold transition-all shadow-md ${
                    isError
                      ? 'ring-4 ring-rose-500 scale-110 shadow-rose-500/50 animate-pulse'
                      : isConnectedToMe
                      ? 'ring-4 ring-emerald-400 scale-105 shadow-emerald-500/40'
                      : isHovered
                      ? 'ring-4 ring-yellow-300 scale-110 shadow-yellow-500/50'
                      : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: isConnectedToMe ? node.color : '#0f172a',
                    borderColor: isError ? '#f43f5e' : node.color,
                  }}
                  title={`${node.english} -> ${node.kana} (${node.romaji})`}
                >
                  <span
                    className={`font-kana font-extrabold text-[11px] xs:text-xs sm:text-sm md:text-base ${
                      isConnectedToMe ? 'text-black font-black' : isError ? 'text-rose-400 font-bold' : 'text-slate-200'
                    }`}
                  >
                    {isConnectedToMe ? '✓' : node.kanji}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Victory Review & Reward Overlay */}
        {won && (
          <div className="absolute inset-0 bg-black/92 flex flex-col items-center justify-center border-2 border-emerald-400 p-3 sm:p-4 animate-in fade-in z-30">
            <span className="text-emerald-400 text-sm sm:text-lg mb-1 font-bold">★ COLORS HARMONIZED! ★</span>
            <span className="text-[10px] sm:text-xs text-slate-300 mb-2 sm:mb-3 text-center">
              You mastered 5 Japanese color terms:
            </span>

            {/* Educational recap dictionary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-1.5 mb-3 w-full max-w-sm">
              {COLOR_SET.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] sm:text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-slate-200 font-bold">{c.english}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-kana text-yellow-300 font-bold">{c.kana}</span>
                    <span className="text-[9px] font-mono text-cyan-300">({c.romaji})</span>
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
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-bold border-2 border-white cursor-pointer shadow-lg active:scale-95"
            >
              CLAIM REWARD NOW
            </button>
          </div>
        )}
      </div>

      <p className="text-[9px] sm:text-xs text-slate-400 mt-2 text-center">
        Tap or drag pins to connect English to Japanese colors. Tap 🔊 to hear native pronunciation.
      </p>
    </div>
  );
};
