import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface AssemblyGameProps {
  onComplete: (score: number) => void;
}

// --- Tetris Constants ---
const COLS = 10;
const ROWS = 20;
const GOAL_LINES = 10;

// 7 standard tetrominoes - each shape is array of [row,col] offsets
const SHAPES: number[][][] = [
  // I
  [[0,0],[0,1],[0,2],[0,3]],
  // O
  [[0,0],[0,1],[1,0],[1,1]],
  // T
  [[0,0],[0,1],[0,2],[1,1]],
  // S
  [[0,1],[0,2],[1,0],[1,1]],
  // Z
  [[0,0],[0,1],[1,1],[1,2]],
  // L
  [[0,0],[0,1],[0,2],[1,0]],
  // J
  [[0,0],[0,1],[0,2],[1,2]],
];

// 나무 공방 테마 컬러
const SHAPE_COLORS = [
  "#4ECDC4", // I - 청록
  "#FFD93D", // O - 노랑
  "#C084FC", // T - 보라
  "#6BCB77", // S - 초록
  "#FF6B6B", // Z - 빨강
  "#FF8C42", // L - 주황
  "#60A5FA", // J - 파랑
];

type Grid = (number | null)[][]; // null = empty, number = color index

interface Piece {
  shape: number[][]; // [row,col] offsets
  colorIdx: number;
  row: number;
  col: number;
}

function createEmptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece(): Piece {
  const idx = Math.floor(Math.random() * SHAPES.length);
  return {
    shape: SHAPES[idx].map((c) => [...c]),
    colorIdx: idx,
    row: 0,
    col: Math.floor(COLS / 2) - 1,
  };
}

function rotateCW(shape: number[][]): number[][] {
  const maxR = Math.max(...shape.map((s) => s[0]));
  const maxC = Math.max(...shape.map((s) => s[1]));
  // 90° CW: (r,c) -> (c, maxR - r)
  return shape.map(([r, c]) => [c, maxR - r]);
}

function isValid(grid: Grid, piece: Piece): boolean {
  for (const [dr, dc] of piece.shape) {
    const r = piece.row + dr;
    const c = piece.col + dc;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    if (grid[r][c] !== null) return false;
  }
  return true;
}

function placePiece(grid: Grid, piece: Piece): Grid {
  const newGrid = grid.map((row) => [...row]);
  for (const [dr, dc] of piece.shape) {
    const r = piece.row + dr;
    const c = piece.col + dc;
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      newGrid[r][c] = piece.colorIdx;
    }
  }
  return newGrid;
}

function clearLines(grid: Grid): { newGrid: Grid; cleared: number } {
  const kept = grid.filter((row) => row.some((cell) => cell === null));
  const cleared = ROWS - kept.length;
  const empty = Array.from({ length: cleared }, () =>
    Array(COLS).fill(null)
  );
  return { newGrid: [...empty, ...kept], cleared };
}

function getGhostRow(grid: Grid, piece: Piece): number {
  let ghostRow = piece.row;
  while (true) {
    const next = { ...piece, row: ghostRow + 1 };
    if (!isValid(grid, next)) break;
    ghostRow++;
  }
  return ghostRow;
}

type Phase = "ready" | "playing" | "clearing" | "gameover" | "complete";

export function AssemblyGame({ onComplete }: AssemblyGameProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [grid, setGrid] = useState<Grid>(createEmptyGrid);
  const [current, setCurrent] = useState<Piece>(randomPiece);
  const [next, setNext] = useState<Piece>(randomPiece);
  const [linesCleared, setLinesCleared] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [piecesUsed, setPiecesUsed] = useState(0);
  const [clearEffect, setClearEffect] = useState<number[]>([]); // rows being cleared
  const [level, setLevel] = useState(1);

  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const gridRef = useRef(grid);
  const currentRef = useRef(current);
  const phaseRef = useRef(phase);
  const linesClearedRef = useRef(linesCleared);

  gridRef.current = grid;
  currentRef.current = current;
  phaseRef.current = phase;
  linesClearedRef.current = linesCleared;

  // Gravity drop
  useEffect(() => {
    if (phase !== "playing") return;
    const speed = Math.max(150, 600 - (level - 1) * 80);
    intervalRef.current = setInterval(() => {
      moveDown();
    }, speed);
    return () => clearInterval(intervalRef.current);
  }, [phase, level]);

  const spawnNext = useCallback(() => {
    const np = next;
    const nn = randomPiece();
    if (!isValid(gridRef.current, np)) {
      // Game over - 다시 시작해야 함
      setPhase("gameover");
      return;
    }
    setCurrent(np);
    setNext(nn);
    setPiecesUsed((p) => p + 1);
  }, [next]);

  const lockPiece = useCallback(() => {
    const newGrid = placePiece(gridRef.current, currentRef.current);
    const { newGrid: clearedGrid, cleared } = clearLines(newGrid);

    if (cleared > 0) {
      // Find which rows were cleared for effect
      const clearedRows: number[] = [];
      newGrid.forEach((row, i) => {
        if (row.every((cell) => cell !== null)) clearedRows.push(i);
      });
      setClearEffect(clearedRows);

      // Points: 1=100, 2=300, 3=500, 4=800
      const lineScores = [0, 100, 300, 500, 800];
      const points = (lineScores[cleared] || cleared * 200) * level;
      setScore((s) => s + points);
      setCombo((c) => c + 1);

      const newTotal = linesClearedRef.current + cleared;
      setLinesCleared(newTotal);
      setLevel(Math.floor(newTotal / 3) + 1);

      // Clear animation then update
      setPhase("clearing");
      setTimeout(() => {
        setClearEffect([]);
        setGrid(clearedGrid);
        if (newTotal >= GOAL_LINES) {
          setPhase("complete");
          // Score: base from lines + efficiency bonus
          const efficiency = Math.max(0, 100 - piecesUsed);
          const finalScore = Math.min(100, Math.round(60 + efficiency * 0.4));
          setTimeout(() => onComplete(finalScore), 2000);
        } else {
          setPhase("playing");
          spawnNext();
        }
      }, 300);
    } else {
      setGrid(newGrid);
      setCombo(0);
      spawnNext();
    }
  }, [spawnNext, level, piecesUsed, onComplete]);

  const moveDown = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const moved = { ...currentRef.current, row: currentRef.current.row + 1 };
    if (isValid(gridRef.current, moved)) {
      setCurrent(moved);
    } else {
      lockPiece();
    }
  }, [lockPiece]);

  const moveLeft = useCallback(() => {
    if (phase !== "playing") return;
    const moved = { ...current, col: current.col - 1 };
    if (isValid(grid, moved)) setCurrent(moved);
  }, [phase, current, grid]);

  const moveRight = useCallback(() => {
    if (phase !== "playing") return;
    const moved = { ...current, col: current.col + 1 };
    if (isValid(grid, moved)) setCurrent(moved);
  }, [phase, current, grid]);

  const rotate = useCallback(() => {
    if (phase !== "playing") return;
    const rotated = { ...current, shape: rotateCW(current.shape) };
    // Wall kick: try original, then left, then right
    if (isValid(grid, rotated)) {
      setCurrent(rotated);
    } else if (isValid(grid, { ...rotated, col: rotated.col - 1 })) {
      setCurrent({ ...rotated, col: rotated.col - 1 });
    } else if (isValid(grid, { ...rotated, col: rotated.col + 1 })) {
      setCurrent({ ...rotated, col: rotated.col + 1 });
    }
  }, [phase, current, grid]);

  const hardDrop = useCallback(() => {
    if (phase !== "playing") return;
    const ghostRow = getGhostRow(grid, current);
    const dropped = { ...current, row: ghostRow };
    setCurrent(dropped);
    // Lock immediately on next tick
    setTimeout(() => {
      currentRef.current = dropped;
      lockPiece();
    }, 50);
  }, [phase, grid, current, lockPiece]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (phase !== "playing") return;
      switch (e.key) {
        case "ArrowLeft": moveLeft(); break;
        case "ArrowRight": moveRight(); break;
        case "ArrowDown": moveDown(); break;
        case "ArrowUp": rotate(); break;
        case " ": hardDrop(); e.preventDefault(); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, moveLeft, moveRight, moveDown, rotate, hardDrop]);

  const startGame = useCallback(() => {
    setGrid(createEmptyGrid());
    const p1 = randomPiece();
    const p2 = randomPiece();
    setCurrent(p1);
    setNext(p2);
    setLinesCleared(0);
    setScore(0);
    setCombo(0);
    setPiecesUsed(0);
    setLevel(1);
    setPhase("playing");
  }, []);

  // Ghost piece position
  const ghostRow = phase === "playing" ? getGhostRow(grid, current) : 0;

  // Render grid with current piece overlaid
  const renderGrid = () => {
    const display: (number | null | "ghost")[][] = grid.map((row) => [...row]);

    // Ghost piece
    if (phase === "playing") {
      for (const [dr, dc] of current.shape) {
        const r = ghostRow + dr;
        const c = current.col + dc;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS && display[r][c] === null) {
          display[r][c] = "ghost" as any;
        }
      }
      // Current piece
      for (const [dr, dc] of current.shape) {
        const r = current.row + dr;
        const c = current.col + dc;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          display[r][c] = current.colorIdx;
        }
      }
    }

    return display;
  };

  const displayGrid = renderGrid();

  // Cell size calculation
  const cellSize = 100 / COLS; // percentage

  return (
    <div
      className="size-full flex flex-col relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FFF8DC 0%, #F5DEB3 50%, #DEB887 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      {/* Ready Screen */}
      {phase === "ready" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            className="text-center p-6 rounded-2xl w-full"
            style={{
              background: "rgba(255,248,220,0.95)",
              border: "3px solid #8B6914",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <span style={{ fontSize: 50 }}>🧩</span>
            <h3 style={{ fontSize: 24, color: "#5C3317", marginTop: 8 }}>
              테트리스 조립!
            </h3>
            <p style={{ fontSize: 14, color: "#8B4513", marginTop: 8, lineHeight: 1.8 }}>
              블록을 쌓아서 줄을 완성하세요!
              <br />
              <strong style={{ color: "#E8740C" }}>{GOAL_LINES}줄</strong>을 클리어하면
              <br />
              딱따구리 조립 완료!
            </p>

            {/* Preview tetrominoes */}
            <div className="flex justify-center gap-2 mt-4 mb-4 flex-wrap">
              {SHAPES.map((shape, idx) => (
                <div
                  key={idx}
                  className="relative"
                  style={{ width: 40, height: 40 }}
                >
                  {shape.map(([r, c], i) => (
                    <div
                      key={i}
                      className="absolute rounded-sm"
                      style={{
                        width: 9,
                        height: 9,
                        left: c * 10 + 2,
                        top: r * 10 + 10,
                        background: SHAPE_COLORS[idx],
                        border: "1px solid rgba(0,0,0,0.15)",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div
              className="p-3 rounded-lg mb-4"
              style={{ background: "rgba(139,69,19,0.08)" }}
            >
              <p style={{ fontSize: 11, color: "#8B4513", lineHeight: 1.6 }}>
                ⬅️➡️ 이동 &nbsp; 🔄 회전 &nbsp; ⬇️ 빠르게 &nbsp; 💥 즉시 낙하
              </p>
            </div>

            <motion.button
              className="w-full py-4 rounded-xl text-white"
              style={{
                background: "linear-gradient(180deg, #FF8C00, #E8740C)",
                border: "3px solid #B8560B",
                boxShadow: "0 4px 12px rgba(232,116,12,0.4)",
                fontSize: 20,
              }}
              onClick={startGame}
              whileTap={{ scale: 0.95 }}
            >
              🧩 조립 시작!
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* Playing / Clearing */}
      {(phase === "playing" || phase === "clearing") && (
        <>
          {/* Top HUD */}
          <div className="px-3 pt-3 pb-1 flex items-center justify-between">
            <div>
              <span style={{ fontSize: 10, color: "#8B4513" }}>SCORE</span>
              <p style={{ fontSize: 18, color: "#5C3317" }}>
                {score.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <span style={{ fontSize: 10, color: "#8B4513" }}>LEVEL</span>
              <p style={{ fontSize: 18, color: "#E8740C" }}>{level}</p>
            </div>
            <div className="text-right">
              <span style={{ fontSize: 10, color: "#8B4513" }}>COMBO</span>
              <p style={{ fontSize: 18, color: combo > 0 ? "#FF4444" : "#5C3317" }}>
                {combo}x
              </p>
            </div>
          </div>

          {/* Lines progress */}
          <div className="px-3 mb-1">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11, color: "#8B4513" }}>
                {linesCleared}/{GOAL_LINES}줄
              </span>
              <div
                className="flex-1 h-3 rounded-full overflow-hidden"
                style={{ background: "rgba(0,0,0,0.1)", border: "1px solid #8B6914" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #4CAF50, #66BB6A)",
                  }}
                  animate={{ width: `${(linesCleared / GOAL_LINES) * 100}%` }}
                  transition={{ type: "spring", stiffness: 200 }}
                />
              </div>
              <span style={{ fontSize: 11, color: "#4CAF50" }}>
                {Math.round((linesCleared / GOAL_LINES) * 100)}%
              </span>
            </div>
          </div>

          {/* Game area with next preview */}
          <div className="flex-1 flex mx-2 mb-1 gap-2 min-h-0">
            {/* Main grid */}
            <div
              className="flex-1 relative rounded-lg overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #1a0a2e, #2d1b4e)",
                border: "3px solid #8B6914",
                boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
              }}
            >
              {/* Grid lines */}
              <div className="absolute inset-0 opacity-10">
                {Array.from({ length: COLS - 1 }, (_, i) => (
                  <div
                    key={`v${i}`}
                    className="absolute top-0 bottom-0"
                    style={{
                      left: `${((i + 1) / COLS) * 100}%`,
                      width: 1,
                      background: "#fff",
                    }}
                  />
                ))}
                {Array.from({ length: ROWS - 1 }, (_, i) => (
                  <div
                    key={`h${i}`}
                    className="absolute left-0 right-0"
                    style={{
                      top: `${((i + 1) / ROWS) * 100}%`,
                      height: 1,
                      background: "#fff",
                    }}
                  />
                ))}
              </div>

              {/* Cells */}
              {displayGrid.map((row, r) =>
                row.map((cell, c) => {
                  if (cell === null) return null;
                  const isClearing = clearEffect.includes(r);
                  const isGhost = cell === ("ghost" as any);
                  const colorIdx = isGhost ? current.colorIdx : (cell as number);
                  const color = SHAPE_COLORS[colorIdx];

                  return (
                    <motion.div
                      key={`${r}-${c}`}
                      className="absolute rounded-sm"
                      style={{
                        left: `${(c / COLS) * 100}%`,
                        top: `${(r / ROWS) * 100}%`,
                        width: `${100 / COLS}%`,
                        height: `${100 / ROWS}%`,
                        padding: 1,
                      }}
                      animate={
                        isClearing
                          ? { opacity: [1, 0], scale: [1, 1.3] }
                          : {}
                      }
                      transition={isClearing ? { duration: 0.25 } : {}}
                    >
                      <div
                        className="size-full rounded-sm"
                        style={{
                          background: isGhost
                            ? `${color}30`
                            : `linear-gradient(135deg, ${color}, ${color}CC)`,
                          border: isGhost
                            ? `1px dashed ${color}60`
                            : `1px solid ${color}`,
                          boxShadow: isGhost
                            ? "none"
                            : `inset 0 1px 2px rgba(255,255,255,0.3), 0 1px 3px rgba(0,0,0,0.3)`,
                        }}
                      />
                    </motion.div>
                  );
                })
              )}

              {/* Line clear flash */}
              <AnimatePresence>
                {clearEffect.map((row) => (
                  <motion.div
                    key={`clear-${row}`}
                    className="absolute left-0 right-0"
                    style={{
                      top: `${(row / ROWS) * 100}%`,
                      height: `${100 / ROWS}%`,
                      background: "rgba(255,255,255,0.8)",
                    }}
                    initial={{ opacity: 1, scaleX: 1 }}
                    animate={{ opacity: 0, scaleX: 1.1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Side panel: Next piece + info */}
            <div className="flex flex-col gap-2" style={{ width: 65 }}>
              {/* Next piece */}
              <div
                className="p-2 rounded-lg"
                style={{
                  background: "rgba(92,51,23,0.1)",
                  border: "2px solid #8B6914",
                }}
              >
                <span
                  className="block text-center mb-1"
                  style={{ fontSize: 9, color: "#8B4513" }}
                >
                  NEXT
                </span>
                <div
                  className="relative mx-auto"
                  style={{ width: 44, height: 44 }}
                >
                  {next.shape.map(([r, c], i) => (
                    <div
                      key={i}
                      className="absolute rounded-sm"
                      style={{
                        width: 10,
                        height: 10,
                        left: c * 11 + 2,
                        top: r * 11 + 6,
                        background: SHAPE_COLORS[next.colorIdx],
                        border: `1px solid ${SHAPE_COLORS[next.colorIdx]}`,
                        boxShadow:
                          "inset 0 1px 2px rgba(255,255,255,0.3)",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Woodpecker assembly progress */}
              <div
                className="flex-1 rounded-lg p-2 flex flex-col items-center justify-center"
                style={{
                  background: "rgba(255,248,220,0.8)",
                  border: "2px solid #8B6914",
                }}
              >
                <div className="relative" style={{ width: 40, height: 50 }}>
                  {/* Body */}
                  <div
                    className="absolute rounded-lg"
                    style={{
                      left: 8, top: 18, width: 24, height: 30,
                      background: linesCleared >= 2 ? "#8B4513" : "#ddd",
                      transition: "background 0.5s",
                    }}
                  />
                  {/* Head */}
                  <div
                    className="absolute rounded-full"
                    style={{
                      left: 10, top: 2, width: 20, height: 18,
                      background: linesCleared >= 4 ? "#DC143C" : "#ddd",
                      transition: "background 0.5s",
                    }}
                  />
                  {/* Beak */}
                  <div
                    style={{
                      position: "absolute", left: 30, top: 8,
                      width: 0, height: 0,
                      borderTop: "4px solid transparent",
                      borderBottom: "4px solid transparent",
                      borderLeft: `8px solid ${linesCleared >= 6 ? "#FFD700" : "#ddd"}`,
                      transition: "border-color 0.5s",
                    }}
                  />
                  {/* Wing */}
                  <div
                    className="absolute rounded"
                    style={{
                      left: 2, top: 22, width: 10, height: 16,
                      background: linesCleared >= 8 ? "#654321" : "#ddd",
                      transition: "background 0.5s",
                    }}
                  />
                  {/* Eye */}
                  {linesCleared >= 4 && (
                    <div
                      className="absolute rounded-full"
                      style={{
                        left: 16, top: 7, width: 5, height: 5,
                        background: "#fff",
                        border: "1.5px solid #333",
                      }}
                    />
                  )}
                </div>
                <span style={{ fontSize: 8, color: "#8B4513", marginTop: 4 }}>
                  {linesCleared < 2
                    ? "몸통..."
                    : linesCleared < 4
                    ? "머리..."
                    : linesCleared < 6
                    ? "부리..."
                    : linesCleared < 8
                    ? "날개..."
                    : linesCleared < 10
                    ? "거의 완성!"
                    : "완성!"}
                </span>
              </div>
            </div>
          </div>

          {/* Touch Controls */}
          <div className="px-2 pb-3">
            <div className="flex gap-1.5 items-center justify-center">
              {/* Left */}
              <motion.button
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 56, height: 56,
                  background: "linear-gradient(180deg, #C4A67A, #A0845A)",
                  border: "2px solid #8B6914",
                  boxShadow: "0 3px 0 #654321",
                }}
                onClick={moveLeft}
                whileTap={{ scale: 0.9, y: 2 }}
              >
                <span style={{ fontSize: 22 }}>⬅️</span>
              </motion.button>

              {/* Down */}
              <motion.button
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 56, height: 56,
                  background: "linear-gradient(180deg, #C4A67A, #A0845A)",
                  border: "2px solid #8B6914",
                  boxShadow: "0 3px 0 #654321",
                }}
                onClick={moveDown}
                whileTap={{ scale: 0.9, y: 2 }}
              >
                <span style={{ fontSize: 22 }}>⬇️</span>
              </motion.button>

              {/* Right */}
              <motion.button
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 56, height: 56,
                  background: "linear-gradient(180deg, #C4A67A, #A0845A)",
                  border: "2px solid #8B6914",
                  boxShadow: "0 3px 0 #654321",
                }}
                onClick={moveRight}
                whileTap={{ scale: 0.9, y: 2 }}
              >
                <span style={{ fontSize: 22 }}>➡️</span>
              </motion.button>

              {/* Spacer */}
              <div style={{ width: 8 }} />

              {/* Rotate */}
              <motion.button
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 56, height: 56,
                  background: "linear-gradient(180deg, #4ECDC4, #3BAFA8)",
                  border: "2px solid #2E8B7A",
                  boxShadow: "0 3px 0 #1A6B5A",
                }}
                onClick={rotate}
                whileTap={{ scale: 0.9, y: 2 }}
              >
                <span style={{ fontSize: 22 }}>🔄</span>
              </motion.button>

              {/* Hard drop */}
              <motion.button
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 56, height: 56,
                  background: "linear-gradient(180deg, #FF8C00, #E8740C)",
                  border: "2px solid #B8560B",
                  boxShadow: "0 3px 0 #8B4000",
                }}
                onClick={hardDrop}
                whileTap={{ scale: 0.9, y: 2 }}
              >
                <span style={{ fontSize: 22 }}>💥</span>
              </motion.button>
            </div>
          </div>
        </>
      )}

      {/* Game Over */}
      <AnimatePresence>
        {phase === "gameover" && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center"
            style={{ background: "rgba(92,51,23,0.85)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="text-center p-6 rounded-2xl mx-6"
              style={{
                background: "rgba(255,248,220,0.95)",
                border: "3px solid #8B6914",
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
            >
              <motion.span
                style={{ fontSize: 50, display: "block" }}
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.6, repeat: 2 }}
              >
                😵
              </motion.span>
              <h3 style={{ fontSize: 22, color: "#5C3317", marginTop: 8 }}>
                블록이 가득 찼어요!
              </h3>
              <p style={{ fontSize: 14, color: "#8B4513", marginTop: 8 }}>
                {linesCleared}/{GOAL_LINES}줄 클리어
              </p>
              <p style={{ fontSize: 13, color: "#FF4444", marginTop: 4, lineHeight: 1.6 }}>
                {GOAL_LINES}줄을 클리어해야
                <br />
                다음 단계로 갈 수 있어요!
              </p>
              <motion.button
                className="w-full py-4 rounded-xl text-white mt-5"
                style={{
                  background: "linear-gradient(180deg, #FF8C00, #E8740C)",
                  border: "3px solid #B8560B",
                  boxShadow: "0 4px 12px rgba(232,116,12,0.4)",
                  fontSize: 18,
                }}
                onClick={startGame}
                whileTap={{ scale: 0.95 }}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                🔄 다시 도전!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complete */}
      <AnimatePresence>
        {phase === "complete" && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center"
            style={{ background: "rgba(255,248,220,0.9)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <motion.span
                style={{ fontSize: 60 }}
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                🎉
              </motion.span>
              <p style={{ fontSize: 26, color: "#5C3317", marginTop: 8 }}>
                조립 완료!
              </p>
              <p style={{ fontSize: 15, color: "#8B4513", marginTop: 4 }}>
                {GOAL_LINES}줄 클리어! · {piecesUsed}개 블록 사용
              </p>
              <p style={{ fontSize: 18, color: "#E8740C", marginTop: 4 }}>
                점수: {score.toLocaleString()}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}