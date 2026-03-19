import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

interface AssemblyGameProps {
  onComplete: (score: number) => void;
}

// 딱따구리 직소퍼즐 - 4x4 = 16 조각
const GRID = 4;
const TOTAL = GRID * GRID;

interface PuzzlePiece {
  id: number;        // 원래 위치 (정답)
  current: number;   // 현재 위치
  locked: boolean;   // 맞춰졌는지
}

// 딱따구리 부품 색상 맵 (4x4 그리드에서 각 조각의 색상)
const PIECE_COLORS: string[][] = [
  ["#87CEEB", "#87CEEB", "#87CEEB", "#87CEEB"], // 하늘
  ["#87CEEB", "#DC143C", "#DC143C", "#87CEEB"], // 머리
  ["#87CEEB", "#DC143C", "#FFD700", "#87CEEB"], // 머리+부리
  ["#654321", "#8B4513", "#8B4513", "#654321"], // 날개+몸통
];

// 딱따구리 부위 이모지/라벨
const PIECE_LABELS: string[][] = [
  ["☁️", "🌤️", "☁️", "🌤️"],
  ["🌿", "🔴", "🔴", "🌿"],
  ["🌿", "🟤", "📐", "🌿"],
  ["🍂", "🪵", "🪵", "🍂"],
];

function shufflePieces(): PuzzlePiece[] {
  const pieces: PuzzlePiece[] = Array.from({ length: TOTAL }, (_, i) => ({
    id: i,
    current: i,
    locked: false,
  }));

  // Fisher-Yates 셔플 (solvable하게)
  for (let i = TOTAL - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pieces[i].current;
    pieces[i].current = pieces[j].current;
    pieces[j].current = tmp;
  }

  // 이미 맞춰진 건 잠금
  pieces.forEach((p) => {
    if (p.current === p.id) p.locked = true;
  });

  return pieces;
}

// 사운드
function playSwapSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 600;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {}
}

function playLockSound() {
  try {
    const ctx = new AudioContext();
    [523, 659, 784].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.15);
    });
  } catch {}
}

function playCompleteSound() {
  try {
    const ctx = new AudioContext();
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 0.25);
    });
  } catch {}
}

export function AssemblyGame({ onComplete }: AssemblyGameProps) {
  const [phase, setPhase] = useState<"ready" | "playing" | "complete">("ready");
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [justLocked, setJustLocked] = useState<number[]>([]);
  const [hintShown, setHintShown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef(0);

  const lockedCount = pieces.filter((p) => p.locked).length;
  const progress = (lockedCount / TOTAL) * 100;

  const startGame = useCallback(() => {
    const shuffled = shufflePieces();
    // 최소 10개는 섞이도록
    let attempts = 0;
    let p = shuffled;
    while (p.filter((x) => x.locked).length > 6 && attempts < 10) {
      p = shufflePieces();
      attempts++;
    }
    setPieces(p);
    setSelected(null);
    setMoves(0);
    setTimer(0);
    setPhase("playing");
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handlePieceTap = useCallback(
    (idx: number) => {
      if (phase !== "playing") return;
      const piece = pieces.find((p) => p.current === idx);
      if (!piece || piece.locked) return;

      if (selected === null) {
        setSelected(idx);
      } else if (selected === idx) {
        setSelected(null);
      } else {
        // Swap
        const newPieces = pieces.map((p) => {
          if (p.current === selected) return { ...p, current: idx };
          if (p.current === idx) return { ...p, current: selected };
          return p;
        });

        // Check locks
        const newlyLocked: number[] = [];
        const finalPieces = newPieces.map((p) => {
          if (!p.locked && p.current === p.id) {
            newlyLocked.push(p.id);
            return { ...p, locked: true };
          }
          return p;
        });

        setPieces(finalPieces);
        setSelected(null);
        setMoves((m) => m + 1);

        if (newlyLocked.length > 0) {
          playLockSound();
          setJustLocked(newlyLocked);
          setTimeout(() => setJustLocked([]), 600);
        } else {
          playSwapSound();
        }

        // Check complete
        if (finalPieces.every((p) => p.locked)) {
          clearInterval(timerRef.current);
          playCompleteSound();
          setPhase("complete");
          // Score based on moves and time
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const movePenalty = Math.max(0, moves - TOTAL) * 2;
          const timePenalty = Math.max(0, elapsed - 30);
          const score = Math.max(30, Math.min(100, 100 - movePenalty - timePenalty));
          setTimeout(() => onComplete(score), 2500);
        }
      }
    },
    [phase, pieces, selected, moves, onComplete]
  );

  const showHint = useCallback(() => {
    setHintShown(true);
    setTimeout(() => setHintShown(false), 2000);
  }, []);

  // 정답 이미지의 위치에서 조각 가져오기
  const getPieceAt = (pos: number) => pieces.find((p) => p.current === pos);
  const getRow = (pos: number) => Math.floor(pos / GRID);
  const getCol = (pos: number) => pos % GRID;

  return (
    <div
      className="size-full flex flex-col relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FFF8DC 0%, #F5DEB3 50%, #DEB887 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      {/* Ready */}
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
              직소퍼즐 조립!
            </h3>
            <p style={{ fontSize: 14, color: "#8B4513", marginTop: 8, lineHeight: 1.8 }}>
              섞인 조각들을 원래 위치로 맞춰서
              <br />
              <strong style={{ color: "#E8740C" }}>딱따구리를 완성</strong>하세요!
            </p>

            {/* Preview */}
            <div className="mt-4 mb-4 mx-auto" style={{ width: 160 }}>
              <p style={{ fontSize: 11, color: "#8B4513", marginBottom: 4 }}>
                완성 모습 미리보기
              </p>
              <div
                className="grid gap-0.5 rounded-lg overflow-hidden"
                style={{
                  gridTemplateColumns: `repeat(${GRID}, 1fr)`,
                  border: "2px solid #8B6914",
                }}
              >
                {Array.from({ length: TOTAL }, (_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center aspect-square"
                    style={{
                      background: PIECE_COLORS[getRow(i)][getCol(i)],
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{PIECE_LABELS[getRow(i)][getCol(i)]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg mb-4" style={{ background: "rgba(139,69,19,0.08)" }}>
              <p style={{ fontSize: 12, color: "#8B4513", lineHeight: 1.6 }}>
                두 조각을 터치해서 자리를 바꿔요!
                <br />
                적은 횟수로 빠르게 맞출수록 높은 점수!
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
              🧩 퍼즐 시작!
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* Playing */}
      {phase === "playing" && (
        <>
          {/* HUD */}
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <div>
              <span style={{ fontSize: 10, color: "#8B4513" }}>이동 횟수</span>
              <p style={{ fontSize: 20, color: "#5C3317" }}>{moves}</p>
            </div>
            <div className="text-center">
              <span style={{ fontSize: 10, color: "#8B4513" }}>맞춘 조각</span>
              <p style={{ fontSize: 20, color: "#E8740C" }}>
                {lockedCount}/{TOTAL}
              </p>
            </div>
            <div className="text-right">
              <span style={{ fontSize: 10, color: "#8B4513" }}>시간</span>
              <p style={{ fontSize: 20, color: "#5C3317" }}>
                {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="px-4 mb-2">
            <div className="flex items-center gap-2">
              <div
                className="flex-1 h-3 rounded-full overflow-hidden"
                style={{ background: "rgba(0,0,0,0.1)", border: "1px solid #8B6914" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #4CAF50, #66BB6A)" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 200 }}
                />
              </div>
              <span style={{ fontSize: 11, color: "#4CAF50" }}>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Reference image (small) */}
          <div className="px-4 mb-2 flex items-center gap-2">
            <div
              className="grid gap-px rounded overflow-hidden"
              style={{
                gridTemplateColumns: `repeat(${GRID}, 1fr)`,
                width: 52,
                height: 52,
                border: "1.5px solid #8B6914",
                flexShrink: 0,
              }}
            >
              {Array.from({ length: TOTAL }, (_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center"
                  style={{
                    background: PIECE_COLORS[getRow(i)][getCol(i)],
                  }}
                >
                  <span style={{ fontSize: 6 }}>{PIECE_LABELS[getRow(i)][getCol(i)]}</span>
                </div>
              ))}
            </div>
            <span style={{ fontSize: 11, color: "#8B4513" }}>← 완성 모습</span>
            <div style={{ flex: 1 }} />
            <motion.button
              className="px-3 py-1.5 rounded-lg"
              style={{
                background: "rgba(139,69,19,0.1)",
                border: "1.5px solid #8B6914",
                fontSize: 11,
                color: "#8B4513",
              }}
              onClick={showHint}
              whileTap={{ scale: 0.9 }}
            >
              💡 힌트
            </motion.button>
          </div>

          {/* Puzzle grid */}
          <div className="flex-1 flex items-center justify-center px-4 mb-2">
            <div
              className="grid gap-1 w-full max-w-xs aspect-square"
              style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}
            >
              {Array.from({ length: TOTAL }, (_, pos) => {
                const piece = getPieceAt(pos);
                if (!piece) return null;
                const correctRow = getRow(piece.id);
                const correctCol = getCol(piece.id);
                const isSelected = selected === pos;
                const isLocked = piece.locked;
                const isJustLocked = justLocked.includes(piece.id);
                const showHintHighlight = hintShown && !isLocked;

                return (
                  <motion.button
                    key={pos}
                    className="relative aspect-square rounded-lg flex items-center justify-center overflow-hidden"
                    style={{
                      background: isLocked
                        ? PIECE_COLORS[correctRow][correctCol]
                        : `${PIECE_COLORS[correctRow][correctCol]}CC`,
                      border: isSelected
                        ? "3px solid #FF8C00"
                        : isLocked
                        ? "2px solid rgba(255,255,255,0.5)"
                        : showHintHighlight
                        ? "2px dashed #FF4444"
                        : "2px solid rgba(139,105,20,0.3)",
                      boxShadow: isSelected
                        ? "0 0 12px rgba(255,140,0,0.6)"
                        : isJustLocked
                        ? "0 0 15px rgba(76,175,80,0.8)"
                        : "0 2px 4px rgba(0,0,0,0.1)",
                      cursor: isLocked ? "default" : "pointer",
                      opacity: isLocked ? 1 : 0.9,
                    }}
                    onClick={() => handlePieceTap(pos)}
                    whileTap={isLocked ? {} : { scale: 0.92 }}
                    animate={
                      isJustLocked
                        ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }
                        : isSelected
                        ? { scale: [1, 1.05, 1] }
                        : {}
                    }
                    transition={
                      isJustLocked
                        ? { duration: 0.5 }
                        : isSelected
                        ? { duration: 0.6, repeat: Infinity }
                        : {}
                    }
                    layout
                  >
                    <span style={{ fontSize: 28, filter: isLocked ? "none" : "saturate(0.7)" }}>
                      {PIECE_LABELS[correctRow][correctCol]}
                    </span>

                    {/* 조각 번호 (힌트) */}
                    {hintShown && !isLocked && (
                      <motion.div
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: "#FF4444", fontSize: 8, color: "#fff" }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        {piece.id + 1}
                      </motion.div>
                    )}

                    {/* 잠금 표시 */}
                    {isLocked && (
                      <motion.div
                        className="absolute top-0.5 left-0.5"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <span style={{ fontSize: 10 }}>✅</span>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Bottom status */}
          <div className="px-4 pb-4">
            <div
              className="p-3 rounded-xl text-center"
              style={{ background: "rgba(139,69,19,0.08)", border: "1px solid #8B691466" }}
            >
              {selected !== null ? (
                <p style={{ fontSize: 13, color: "#E8740C" }}>
                  🔸 바꿀 조각을 선택하세요!
                </p>
              ) : lockedCount < 4 ? (
                <p style={{ fontSize: 13, color: "#8B4513" }}>
                  🧩 조각을 터치해서 자리를 바꿔보세요!
                </p>
              ) : lockedCount < 10 ? (
                <p style={{ fontSize: 13, color: "#4CAF50" }}>
                  👍 잘하고 있어요! {TOTAL - lockedCount}조각 남았어요!
                </p>
              ) : (
                <p style={{ fontSize: 13, color: "#FF8C00" }}>
                  🔥 거의 다 맞췄어요! 조금만 더!
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Complete */}
      <AnimatePresence>
        {phase === "complete" && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center"
            style={{ background: "rgba(255,248,220,0.95)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="text-center px-6"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              {/* 완성된 퍼즐 */}
              <motion.div
                className="mx-auto mb-4"
                style={{ width: 160 }}
                animate={{ rotate: [0, 2, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div
                  className="grid gap-0.5 rounded-xl overflow-hidden"
                  style={{
                    gridTemplateColumns: `repeat(${GRID}, 1fr)`,
                    border: "3px solid #FFD700",
                    boxShadow: "0 0 20px rgba(255,215,0,0.5)",
                  }}
                >
                  {Array.from({ length: TOTAL }, (_, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center justify-center aspect-square"
                      style={{ background: PIECE_COLORS[getRow(i)][getCol(i)] }}
                      initial={{ scale: 0, rotate: 180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: i * 0.05, type: "spring" }}
                    >
                      <span style={{ fontSize: 16 }}>{PIECE_LABELS[getRow(i)][getCol(i)]}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.span
                style={{ fontSize: 50 }}
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: 3 }}
              >
                🎉
              </motion.span>
              <p style={{ fontSize: 26, color: "#5C3317", marginTop: 8 }}>조립 완료!</p>
              <p style={{ fontSize: 15, color: "#8B4513", marginTop: 4 }}>
                {moves}번 이동 · {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
              </p>

              {/* Confetti */}
              {Array.from({ length: 20 }, (_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 8 + Math.random() * 8,
                    height: 8 + Math.random() * 8,
                    background: ["#FF6B6B", "#FFD700", "#4CAF50", "#2196F3", "#FF8C00", "#C084FC"][i % 6],
                    left: `${Math.random() * 100}%`,
                    top: -20,
                  }}
                  animate={{
                    y: [0, 600 + Math.random() * 200],
                    x: [0, (Math.random() - 0.5) * 200],
                    rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                    opacity: [1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random(),
                    delay: Math.random() * 0.5,
                    ease: "easeOut",
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
