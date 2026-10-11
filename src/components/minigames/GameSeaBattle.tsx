import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../../utils/audio';

interface GameSeaBattleProps {
  onSuccess: () => void;
  onFailure?: () => void;
}

const GRID_SIZE = 5;

interface ShipDef {
  id: string;
  name: string;
  size: number;
  color: string;
  darkColor: string;
  lightColor: string;
}

const SHIPS_DEF: ShipDef[] = [
  { id: 'battleship', name: 'Battleship', size: 4, color: '#0284c7', darkColor: '#0369a1', lightColor: '#38bdf8' },
  { id: 'cruiser', name: 'Cruiser', size: 3, color: '#7c3aed', darkColor: '#6d28d9', lightColor: '#c084fc' },
  { id: 'patrol', name: 'Patrol Boat', size: 2, color: '#d97706', darkColor: '#b45309', lightColor: '#fbbf24' },
];

const ShipSegmentGraphic: React.FC<{
  ship: ShipDef;
  orientation: 'H' | 'V';
  segmentIndex: number;
  size: number;
  isSunk?: boolean;
  isHit?: boolean;
}> = ({ ship, orientation, segmentIndex, size, isSunk, isHit }) => {
  const isBow = segmentIndex === 0;
  const isStern = segmentIndex === size - 1;
  const isMid = !isBow && !isStern;

  const mainColor = isSunk ? '#475569' : ship.color;
  const darkColor = isSunk ? '#334155' : ship.darkColor;
  const lightColor = isSunk ? '#64748b' : ship.lightColor;

  return (
    <svg viewBox="0 0 40 40" className="w-full h-full block select-none pointer-events-none">
      {orientation === 'H' ? (
        <g>
          {isBow && (
            <>
              <path d="M 6 20 C 14 10, 24 9, 40 9 L 40 31 C 24 31, 14 30, 6 20 Z" fill={mainColor} stroke={darkColor} strokeWidth="1.5" />
              <path d="M 16 13 C 24 12, 34 11, 40 11 L 40 16 L 16 16 Z" fill={lightColor} opacity="0.6" />
              <circle cx="26" cy="20" r="3.5" fill={darkColor} />
              <line x1="26" y1="20" x2="16" y2="20" stroke={lightColor} strokeWidth="2" strokeLinecap="round" />
            </>
          )}
          {isMid && (
            <>
              <rect x="0" y="9" width="40" height="22" fill={mainColor} stroke={darkColor} strokeWidth="1.5" />
              <rect x="0" y="11" width="40" height="4" fill={lightColor} opacity="0.6" />
              <rect x="12" y="14" width="16" height="12" rx="2" fill={darkColor} />
              <circle cx="20" cy="20" r="4" fill={lightColor} />
              <line x1="12" y1="17" x2="28" y2="17" stroke="#ffffff" strokeWidth="1.5" />
            </>
          )}
          {isStern && (
            <>
              <path d="M 0 9 L 28 9 C 34 12, 38 16, 38 20 C 38 24, 34 28, 28 31 L 0 31 Z" fill={mainColor} stroke={darkColor} strokeWidth="1.5" />
              <path d="M 0 11 L 26 11 L 26 15 L 0 15 Z" fill={lightColor} opacity="0.6" />
              <circle cx="15" cy="20" r="3" fill={darkColor} />
              <line x1="15" y1="20" x2="25" y2="20" stroke={lightColor} strokeWidth="2" strokeLinecap="round" />
              <rect x="34" y="17" width="4" height="6" fill="#94a3b8" />
            </>
          )}
        </g>
      ) : (
        <g>
          {isBow && (
            <>
              <path d="M 20 6 C 10 14, 9 24, 9 40 L 31 40 C 31 24, 30 14, 20 6 Z" fill={mainColor} stroke={darkColor} strokeWidth="1.5" />
              <path d="M 13 16 C 12 24, 11 34, 11 40 L 16 40 L 16 16 Z" fill={lightColor} opacity="0.6" />
              <circle cx="20" cy="26" r="3.5" fill={darkColor} />
              <line x1="20" y1="26" x2="20" y2="16" stroke={lightColor} strokeWidth="2" strokeLinecap="round" />
            </>
          )}
          {isMid && (
            <>
              <rect x="9" y="0" width="22" height="40" fill={mainColor} stroke={darkColor} strokeWidth="1.5" />
              <rect x="11" y="0" width="4" height="40" fill={lightColor} opacity="0.6" />
              <rect x="14" y="12" width="12" height="16" rx="2" fill={darkColor} />
              <circle cx="20" cy="20" r="4" fill={lightColor} />
              <line x1="17" y1="12" x2="17" y2="28" stroke="#ffffff" strokeWidth="1.5" />
            </>
          )}
          {isStern && (
            <>
              <path d="M 9 0 L 9 28 C 12 34, 16 38, 20 38 C 24 38, 28 34, 31 28 L 31 0 Z" fill={mainColor} stroke={darkColor} strokeWidth="1.5" />
              <path d="M 11 0 L 11 26 L 15 26 L 15 0 Z" fill={lightColor} opacity="0.6" />
              <circle cx="20" cy="15" r="3" fill={darkColor} />
              <line x1="20" y1="15" x2="20" y2="25" stroke={lightColor} strokeWidth="2" strokeLinecap="round" />
              <rect x="17" y="34" width="6" height="4" fill="#94a3b8" />
            </>
          )}
        </g>
      )}
      {isSunk && (
        <text x="20" y="24" fontSize="15" textAnchor="middle" dominantBaseline="middle">
          ⚓
        </text>
      )}
      {!isSunk && isHit && (
        <text x="20" y="24" fontSize="16" textAnchor="middle" dominantBaseline="middle">
          💥
        </text>
      )}
    </svg>
  );
};

export const GameSeaBattle: React.FC<GameSeaBattleProps> = ({ onSuccess }) => {
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const [phase, setPhase] = useState<'DEPLOY' | 'BATTLE'>('DEPLOY');

  // Player ship placements start EMPTY (no default ships on map)
  const [playerPlacements, setPlayerPlacements] = useState<Record<string, number[]>>({});

  // Active ship placement selection during DEPLOY
  const [selectedShipId, setSelectedShipId] = useState<string>('battleship');
  const [orientation, setOrientation] = useState<'H' | 'V'>('H');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // AI Ships stored with per-ship coordinates
  const [aiPlacements, setAiPlacements] = useState<Record<string, number[]>>(() =>
    generateRandomFleet()
  );

  const [playerAttacks, setPlayerAttacks] = useState<Record<number, 'hit' | 'miss'>>({});
  const [aiAttacks, setAiAttacks] = useState<Record<number, 'hit' | 'miss'>>({});

  const [status, setStatus] = useState<string>(
    'Drag & drop or tap to place your 3 warships, or click RANDOMIZE!'
  );
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(true);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Keyboard shortcut [R] to toggle orientation during DEPLOY
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === 'DEPLOY' && (e.code === 'KeyR' || e.key === 'r' || e.key === 'R')) {
        sounds.playBlip(440);
        setOrientation((o) => (o === 'H' ? 'V' : 'H'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  const getPlayerOccupiedCells = (): Set<number> => {
    const set = new Set<number>();
    Object.values(playerPlacements).forEach((coords) => coords.forEach((c) => set.add(c)));
    return set;
  };

  const getAiOccupiedCells = (): Set<number> => {
    const set = new Set<number>();
    Object.values(aiPlacements).forEach((coords) => coords.forEach((c) => set.add(c)));
    return set;
  };

  const isAiShipSunk = (shipId: string): boolean => {
    const coords = aiPlacements[shipId];
    if (!coords || coords.length === 0) return false;
    return coords.every((c) => playerAttacks[c] === 'hit');
  };

  const isPlayerShipSunk = (shipId: string): boolean => {
    const coords = playerPlacements[shipId];
    if (!coords || coords.length === 0) return false;
    return coords.every((c) => aiAttacks[c] === 'hit');
  };

  function generateRandomFleet(): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    const occupied = new Set<number>();

    for (const ship of SHIPS_DEF) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 400) {
        attempts++;
        const horiz = Math.random() > 0.5;
        const maxR = horiz ? GRID_SIZE : GRID_SIZE - ship.size;
        const maxC = horiz ? GRID_SIZE - ship.size : GRID_SIZE;
        const r = Math.floor(Math.random() * maxR);
        const c = Math.floor(Math.random() * maxC);

        const coords: number[] = [];
        let collision = false;

        for (let i = 0; i < ship.size; i++) {
          const cr = horiz ? r : r + i;
          const cc = horiz ? c + i : c;
          const idx = cr * GRID_SIZE + cc;
          if (occupied.has(idx)) {
            collision = true;
            break;
          }
          coords.push(idx);
        }

        if (!collision) {
          coords.forEach((coord) => occupied.add(coord));
          result[ship.id] = coords;
          placed = true;
        }
      }
    }
    return result;
  }

  const getProposedCoords = (startIdx: number, size: number, horiz: boolean): number[] | null => {
    const r = Math.floor(startIdx / GRID_SIZE);
    const c = startIdx % GRID_SIZE;

    if (horiz && c + size > GRID_SIZE) return null;
    if (!horiz && r + size > GRID_SIZE) return null;

    const coords: number[] = [];
    for (let i = 0; i < size; i++) {
      const cr = horiz ? r : r + i;
      const cc = horiz ? c + i : c;
      coords.push(cr * GRID_SIZE + cc);
    }
    return coords;
  };

  const isPlacementValid = (shipId: string, coords: number[]): boolean => {
    const otherOccupied = new Set<number>();
    Object.entries(playerPlacements).forEach(([id, list]) => {
      if (id !== shipId) {
        list.forEach((c) => otherOccupied.add(c));
      }
    });

    return coords.every((c) => !otherOccupied.has(c));
  };

  const placeShipAt = (shipId: string, startIdx: number) => {
    const ship = SHIPS_DEF.find((s) => s.id === shipId);
    if (!ship) return;

    const coords = getProposedCoords(startIdx, ship.size, orientation === 'H');
    if (!coords || !isPlacementValid(ship.id, coords)) {
      sounds.playFail();
      setStatus(`Cannot place ${ship.name} here (out of bounds or overlapping)!`);
      return;
    }

    sounds.playSelect();
    const nextPlacements = { ...playerPlacements, [ship.id]: coords };
    setPlayerPlacements(nextPlacements);

    // Auto-select next unplaced ship
    const remainingUnplaced = SHIPS_DEF.filter(
      (s) => s.id !== ship.id && !nextPlacements[s.id]
    );
    if (remainingUnplaced.length > 0) {
      setSelectedShipId(remainingUnplaced[0].id);
    }

    const allPlacedNow = SHIPS_DEF.every(
      (s) => nextPlacements[s.id] && nextPlacements[s.id].length === s.size
    );
    if (allPlacedNow) {
      setStatus('★ ALL 3 WARSHIPS DEPLOYED! Click START BATTLE to engage.');
    } else {
      setStatus(`${ship.name} stationed! Place remaining ships.`);
    }
  };

  const handleDeployCellClick = (idx: number) => {
    if (phase !== 'DEPLOY') return;

    // If clicking on an already placed ship, pick it up / remove it
    const existingShip = SHIPS_DEF.find((s) => playerPlacements[s.id]?.includes(idx));
    if (existingShip) {
      sounds.playBlip(320);
      setSelectedShipId(existingShip.id);
      const nextPlacements = { ...playerPlacements };
      delete nextPlacements[existingShip.id];
      setPlayerPlacements(nextPlacements);
      setStatus(`Repositioning ${existingShip.name}... Select grid location.`);
      return;
    }

    placeShipAt(selectedShipId, idx);
  };

  const handleRandomizeFleet = () => {
    sounds.playSelect();
    const f = generateRandomFleet();
    setPlayerPlacements(f);
    setStatus('★ FLEET RANDOMLY DEPLOYED! Click START BATTLE or randomize again.');
  };

  const handleClearFleet = () => {
    sounds.playBlip(320);
    setPlayerPlacements({});
    setSelectedShipId('battleship');
    setStatus('Fleet cleared. Place ships or click RANDOMIZE.');
  };

  const allPlaced = SHIPS_DEF.every(
    (s) => playerPlacements[s.id] && playerPlacements[s.id].length === s.size
  );

  const handleStartBattle = () => {
    if (!allPlaced) {
      sounds.playFail();
      setStatus('Please position all 3 ships before engaging battle!');
      return;
    }

    sounds.playKanaObtained();
    setPhase('BATTLE');
    setStatus('RADAR ACTIVE: Click coordinates on the enemy grid to fire torpedoes!');
  };

  const handlePlayerAttack = (index: number) => {
    if (phase !== 'BATTLE' || !isPlayerTurn || playerAttacks[index] || won || gameOver) return;

    const aiSet = getAiOccupiedCells();
    const isHit = aiSet.has(index);
    const nextAttacks = { ...playerAttacks, [index]: isHit ? ('hit' as const) : ('miss' as const) };
    setPlayerAttacks(nextAttacks);

    if (isHit) {
      const hitShip = SHIPS_DEF.find((s) => aiPlacements[s.id]?.includes(index));
      const wasAlreadySunk =
        hitShip && aiPlacements[hitShip.id]?.every((coord) => playerAttacks[coord] === 'hit');
      const isNowSunk =
        hitShip && aiPlacements[hitShip.id]?.every((coord) => nextAttacks[coord] === 'hit');

      if (hitShip && isNowSunk && !wasAlreadySunk) {
        sounds.playExplosion();
        setStatus(`💥 BOOM! ENEMY ${hitShip.name.toUpperCase()} (SIZE ${hitShip.size}) SUNK!`);
      } else {
        sounds.playKanaObtained();
        setStatus(`DIRECT HIT AT ${getCoordLabel(index)}!`);
      }

      const totalHits = Object.values(nextAttacks).filter((v) => v === 'hit').length;
      if (totalHits >= 9) {
        setWon(true);
        sounds.playSuccess();
        setTimeout(() => onSuccessRef.current(), 750);
        return;
      }
    } else {
      sounds.playBlip(320);
      setStatus(`Torpedo missed at ${getCoordLabel(index)}. Enemy responding...`);
    }

    setIsPlayerTurn(false);
    setTimeout(aiTurn, 650);
  };

  const aiTurn = () => {
    if (won || gameOver) return;

    const playerSet = getPlayerOccupiedCells();
    const untargeted: number[] = [];
    for (let i = 0; i < 25; i++) {
      if (!aiAttacks[i]) untargeted.push(i);
    }

    if (untargeted.length === 0) return;

    let targetIdx = -1;
    const hitIndices = Object.entries(aiAttacks)
      .filter(([, res]) => res === 'hit')
      .map(([idx]) => Number(idx));

    for (const h of hitIndices) {
      const neighbors = [h - 1, h + 1, h - GRID_SIZE, h + GRID_SIZE].filter(
        (n) => n >= 0 && n < 25 && untargeted.includes(n)
      );
      if (neighbors.length > 0) {
        targetIdx = neighbors[Math.floor(Math.random() * neighbors.length)];
        break;
      }
    }

    if (targetIdx === -1) {
      targetIdx = untargeted[Math.floor(Math.random() * untargeted.length)];
    }

    const isHit = playerSet.has(targetIdx);
    const nextAiAttacks = { ...aiAttacks, [targetIdx]: isHit ? ('hit' as const) : ('miss' as const) };
    setAiAttacks(nextAiAttacks);

    if (isHit) {
      const hitShip = SHIPS_DEF.find((s) => playerPlacements[s.id]?.includes(targetIdx));
      const wasAlreadySunk =
        hitShip && playerPlacements[hitShip.id]?.every((coord) => aiAttacks[coord] === 'hit');
      const isNowSunk =
        hitShip && playerPlacements[hitShip.id]?.every((coord) => nextAiAttacks[coord] === 'hit');

      if (hitShip && isNowSunk && !wasAlreadySunk) {
        sounds.playExplosion();
        setStatus(`💥 ENEMY SUNK YOUR ${hitShip.name.toUpperCase()}!`);
      } else {
        sounds.playFail();
        setStatus(`ENEMY HIT YOUR SHIP AT ${getCoordLabel(targetIdx)}!`);
      }

      const totalAiHits = Object.values(nextAiAttacks).filter((v) => v === 'hit').length;
      if (totalAiHits >= 9) {
        setGameOver(true);
        return;
      }
    } else {
      sounds.playBlip(300);
      setStatus(`Enemy missed! Your turn: choose target.`);
    }

    setIsPlayerTurn(true);
  };

  const getCoordLabel = (idx: number) => {
    const col = String.fromCharCode(65 + (idx % GRID_SIZE));
    const row = Math.floor(idx / GRID_SIZE) + 1;
    return `${col}${row}`;
  };

  const restartAll = () => {
    setPlayerPlacements({});
    setAiPlacements(generateRandomFleet());
    setPlayerAttacks({});
    setAiAttacks({});
    setPhase('DEPLOY');
    setSelectedShipId('battleship');
    setStatus('Drag & drop or tap to place your 3 warships, or click RANDOMIZE!');
    setIsPlayerTurn(true);
    setWon(false);
    setGameOver(false);
  };

  const playerHits = Object.values(playerAttacks).filter((v) => v === 'hit').length;
  const aiHits = Object.values(aiAttacks).filter((v) => v === 'hit').length;

  const curShip = SHIPS_DEF.find((s) => s.id === selectedShipId);
  const hoverCoords =
    phase === 'DEPLOY' && hoverIndex !== null && curShip
      ? getProposedCoords(hoverIndex, curShip.size, orientation === 'H')
      : null;
  const hoverValid = hoverCoords && curShip ? isPlacementValid(curShip.id, hoverCoords) : false;

  const getShipInfoForCell = (
    placements: Record<string, number[]>,
    cellIdx: number
  ): { ship: ShipDef; orientation: 'H' | 'V'; segmentIndex: number } | null => {
    for (const ship of SHIPS_DEF) {
      const coords = placements[ship.id];
      if (coords && coords.includes(cellIdx)) {
        const isHoriz = coords.length > 1 ? coords[1] === coords[0] + 1 : true;
        const segmentIndex = coords.indexOf(cellIdx);
        return {
          ship,
          orientation: isHoriz ? 'H' : 'V',
          segmentIndex,
        };
      }
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center select-none font-pixel w-full max-w-[640px]">
      {/* Header */}
      <div className="flex justify-between items-center w-full mb-2 text-xs sm:text-sm px-1">
        <span className="text-cyan-400 font-bold">
          YOUR FLEET ({phase === 'DEPLOY' ? `${Object.keys(playerPlacements).length}/3` : `${9 - aiHits}/9`})
        </span>
        <span className="text-amber-400 text-[10px] sm:text-xs tracking-wider font-mono">5×5 NAVAL GRID</span>
        {phase === 'BATTLE' && (
          <span className="text-rose-400 font-bold">ENEMY RADAR ({9 - playerHits}/9)</span>
        )}
      </div>

      <div className="relative bg-slate-950 p-2.5 sm:p-5 border-4 border-slate-700 shadow-2xl flex flex-col items-center w-full">
        {/* Status Line */}
        <div className="text-[11px] sm:text-xs md:text-sm text-yellow-300 mb-3 min-h-[28px] text-center font-bold tracking-wide flex items-center justify-center px-1">
          {status}
        </div>

        {/* Grids Layout */}
        <div className="flex flex-row flex-wrap sm:flex-nowrap justify-center items-start w-full gap-3 sm:gap-6 mb-2">
          {/* PLAYER FLEET (5x5) */}
          <div className="flex flex-col items-center">
            <span className="text-[11px] sm:text-xs text-cyan-400 mb-1.5 font-bold tracking-wider">
              {phase === 'DEPLOY' ? 'ARRANGE FLEET (5×5)' : 'YOUR FLEET'}
            </span>
            <div className="grid grid-cols-5 gap-1.5 bg-slate-900 border-2 border-slate-700 p-1.5 sm:p-2 rounded shadow-inner">
              {Array.from({ length: 25 }).map((_, idx) => {
                const attack = aiAttacks[idx];
                const isHovered = hoverCoords?.includes(idx);
                const shipInfo = getShipInfoForCell(playerPlacements, idx);
                const sunk = shipInfo ? isPlayerShipSunk(shipInfo.ship.id) : false;

                return (
                  <button
                    key={idx}
                    onClick={() => handleDeployCellClick(idx)}
                    onMouseEnter={() => setHoverIndex(idx)}
                    onMouseLeave={() => setHoverIndex(null)}
                    onDragOver={(e) => {
                      if (phase === 'DEPLOY') {
                        e.preventDefault();
                        setHoverIndex(idx);
                      }
                    }}
                    onDrop={(e) => {
                      if (phase === 'DEPLOY') {
                        e.preventDefault();
                        const shipId = e.dataTransfer.getData('shipId') || selectedShipId;
                        if (shipId) placeShipAt(shipId, idx);
                      }
                    }}
                    disabled={phase !== 'DEPLOY'}
                    className={`w-9 h-9 min-[380px]:w-10 min-[380px]:h-10 sm:w-12 sm:h-12 md:w-13 md:h-13 border-2 flex items-center justify-center font-bold transition-all relative rounded overflow-hidden ${
                      phase === 'DEPLOY'
                        ? isHovered
                          ? hoverValid
                            ? 'bg-emerald-600/70 border-emerald-300 cursor-pointer ring-2 ring-emerald-400'
                            : 'bg-rose-600/70 border-rose-300 cursor-not-allowed ring-2 ring-rose-400'
                          : shipInfo
                          ? 'bg-slate-900 border-cyan-400 cursor-pointer shadow-[0_0_8px_rgba(56,189,248,0.3)] hover:border-yellow-400'
                          : 'bg-slate-950 border-slate-800 hover:border-cyan-500/60 cursor-pointer'
                        : sunk
                        ? 'bg-slate-800 border-slate-600 opacity-60 grayscale'
                        : attack === 'hit'
                        ? 'bg-rose-950 border-yellow-400'
                        : attack === 'miss'
                        ? 'bg-slate-900 border-slate-700 text-slate-500'
                        : shipInfo
                        ? 'bg-slate-900 border-cyan-600'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    {shipInfo ? (
                      <ShipSegmentGraphic
                        ship={shipInfo.ship}
                        orientation={shipInfo.orientation}
                        segmentIndex={shipInfo.segmentIndex}
                        size={shipInfo.ship.size}
                        isSunk={sunk}
                        isHit={attack === 'hit'}
                      />
                    ) : (
                      attack === 'miss' && <span className="text-slate-500 text-lg">•</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Fleet Status Badges */}
            <div className="flex gap-2 mt-2 justify-center w-full">
              {SHIPS_DEF.map((s) => {
                const isPlaced = !!playerPlacements[s.id];
                const sunk = phase === 'BATTLE' && isPlayerShipSunk(s.id);
                return (
                  <div
                    key={s.id}
                    className={`px-2 py-0.5 border text-[9px] sm:text-[10px] font-mono font-bold transition-all rounded ${
                      sunk
                        ? 'bg-slate-900/90 border-slate-700 text-slate-500 opacity-40 grayscale line-through'
                        : isPlaced
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-500'
                    }`}
                  >
                    {s.name}: {s.size} {isPlaced && '✓'}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ENEMY TARGET RADAR (Rendered ONLY in BATTLE phase!) */}
          {phase === 'BATTLE' && (
            <div className="flex flex-col items-center animate-in fade-in duration-300">
              <span className="text-[11px] sm:text-xs text-rose-400 mb-1.5 font-bold tracking-wider">
                ENEMY RADAR
              </span>
              <div className="grid grid-cols-5 gap-1.5 bg-slate-900 border-2 border-slate-700 p-1.5 sm:p-2 rounded shadow-inner">
                {Array.from({ length: 25 }).map((_, idx) => {
                  const attack = playerAttacks[idx];
                  const isClickable = phase === 'BATTLE' && isPlayerTurn && !attack && !won && !gameOver;

                  const enemyShipOnCell = SHIPS_DEF.find((s) => aiPlacements[s.id]?.includes(idx));
                  const isSunk = enemyShipOnCell ? isAiShipSunk(enemyShipOnCell.id) : false;
                  const enemyShipInfo = isSunk ? getShipInfoForCell(aiPlacements, idx) : null;

                  return (
                    <button
                      key={idx}
                      onClick={() => handlePlayerAttack(idx)}
                      disabled={!isClickable}
                      className={`w-9 h-9 min-[380px]:w-10 min-[380px]:h-10 sm:w-12 sm:h-12 md:w-13 md:h-13 border-2 flex items-center justify-center font-bold transition-all rounded overflow-hidden ${
                        isSunk
                          ? 'bg-slate-800 border-slate-600 grayscale opacity-75'
                          : attack === 'hit'
                          ? 'bg-rose-950 border-yellow-300 text-yellow-300 shadow-md animate-pulse text-lg'
                          : attack === 'miss'
                          ? 'bg-slate-900 border-slate-700 text-slate-500 text-lg'
                          : isClickable
                          ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 hover:border-rose-400 cursor-crosshair active:scale-95'
                          : 'bg-slate-950 border-slate-900 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {enemyShipInfo ? (
                        <ShipSegmentGraphic
                          ship={enemyShipInfo.ship}
                          orientation={enemyShipInfo.orientation}
                          segmentIndex={enemyShipInfo.segmentIndex}
                          size={enemyShipInfo.ship.size}
                          isSunk={true}
                        />
                      ) : attack === 'hit' ? (
                        '💥'
                      ) : attack === 'miss' ? (
                        '•'
                      ) : (
                        ''
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Enemy Fleet Sunk Tracker */}
              <div className="flex gap-2 mt-2 justify-center w-full">
                {SHIPS_DEF.map((s) => {
                  const sunk = isAiShipSunk(s.id);
                  return (
                    <div
                      key={s.id}
                      className={`px-2 py-0.5 border text-[9px] sm:text-[10px] font-mono font-bold transition-all rounded ${
                        sunk
                          ? 'bg-slate-900/90 border-slate-700 text-slate-500 opacity-40 grayscale line-through'
                          : 'bg-rose-950 border-rose-600 text-rose-300'
                      }`}
                    >
                      {s.name}: {s.size}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Ship Placement Toolbar in DEPLOY Phase */}
        {phase === 'DEPLOY' && (
          <div className="w-full bg-slate-900/95 border-2 border-slate-700 p-2.5 sm:p-3 flex flex-col gap-2 mt-2 rounded">
            <div className="flex justify-between items-center text-[10px] sm:text-xs">
              <span className="text-amber-300 font-bold">SELECT & ARRANGE WARSHIPS:</span>
              <button
                onClick={() => {
                  sounds.playBlip(440);
                  setOrientation((o) => (o === 'H' ? 'V' : 'H'));
                }}
                className="px-2.5 py-1 bg-indigo-900 hover:bg-indigo-800 border border-indigo-400 text-indigo-100 cursor-pointer text-[10px] sm:text-xs active:scale-95 font-bold shadow rounded"
              >
                ROTATE [R]: {orientation === 'H' ? 'HORIZONTAL ➔' : 'VERTICAL ⬇'}
              </button>
            </div>

            {/* Warship Visual Cards Palette */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SHIPS_DEF.map((ship) => {
                const isSelected = selectedShipId === ship.id;
                const isPlaced = !!playerPlacements[ship.id];

                return (
                  <div
                    key={ship.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('shipId', ship.id);
                      setSelectedShipId(ship.id);
                    }}
                    onClick={() => {
                      sounds.playSelect();
                      setSelectedShipId(ship.id);
                    }}
                    className={`p-2 border-2 flex flex-col items-center justify-between cursor-pointer transition-all rounded select-none ${
                      isSelected
                        ? 'bg-cyan-950/90 border-cyan-400 shadow-md ring-2 ring-cyan-400/50'
                        : 'bg-slate-800/80 hover:bg-slate-750 border-slate-700 hover:border-slate-500 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full mb-1">
                      <span className="font-bold text-[11px] sm:text-xs text-slate-100">
                        {ship.name}
                      </span>
                      {isPlaced ? (
                        <span className="text-[9px] text-emerald-400 font-bold">✓ ON MAP</span>
                      ) : (
                        <span className="text-[9px] text-amber-400 font-mono">SIZE {ship.size}</span>
                      )}
                    </div>

                    {/* Ship Multi-segment Illustration */}
                    <div className="flex items-center gap-0.5 my-1 bg-slate-950/70 p-1 rounded border border-slate-800 w-full justify-center">
                      {Array.from({ length: ship.size }).map((_, sIdx) => (
                        <div key={sIdx} className="w-6 h-6 sm:w-7 sm:h-7">
                          <ShipSegmentGraphic
                            ship={ship}
                            orientation="H"
                            segmentIndex={sIdx}
                            size={ship.size}
                          />
                        </div>
                      ))}
                    </div>

                    <span className="text-[8px] text-slate-400">
                      Drag onto grid or tap to select
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Victory Overlay */}
        {won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-emerald-400 p-4 animate-in fade-in z-20">
            <span className="text-emerald-400 text-base sm:text-lg mb-1 font-bold">★ ENEMY FLEET SUNK! ★</span>
            <span className="text-xs text-slate-300 mb-3">All 3 cloaked vessels destroyed!</span>
            <button
              onClick={() => onSuccessRef.current()}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-bold border-2 border-white cursor-pointer shadow-lg"
            >
              CLAIM REWARD NOW
            </button>
          </div>
        )}

        {gameOver && !won && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center border-2 border-red-500 p-4 z-20">
            <span className="text-red-400 text-sm mb-3 font-bold">YOUR FLEET WAS SUNK</span>
            <button
              onClick={restartAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs border-2 border-white cursor-pointer"
            >
              RETRY BATTLE
            </button>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3 mt-3 w-full justify-center">
        {phase === 'DEPLOY' ? (
          <>
            <button
              onClick={handleRandomizeFleet}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-600 text-xs cursor-pointer active:bg-slate-600 rounded"
            >
              🎲 RANDOMIZE
            </button>
            <button
              onClick={handleClearFleet}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-xs cursor-pointer rounded"
            >
              CLEAR
            </button>
            <button
              onClick={handleStartBattle}
              disabled={!allPlaced}
              className={`px-6 py-1.5 font-bold text-xs sm:text-sm border-2 transition-all rounded shadow-md ${
                allPlaced
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-black border-white cursor-pointer animate-pulse active:translate-y-0.5'
                  : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-50'
              }`}
            >
              START BATTLE ➔
            </button>
          </>
        ) : (
          <button
            onClick={restartAll}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-600 cursor-pointer rounded"
          >
            RESTART FLEET
          </button>
        )}
      </div>

      <p className="text-[9px] sm:text-[10px] text-slate-400 mt-2 text-center">
        {phase === 'DEPLOY'
          ? 'Place all 3 ships or click RANDOMIZE • Press [R] to rotate'
          : 'Deep explosions trigger when a ship is fully sunk • Sunk ships are revealed with ⚓'}
      </p>
    </div>
  );
};
