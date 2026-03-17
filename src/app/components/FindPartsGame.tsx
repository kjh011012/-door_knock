import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface FindPartsGameProps {
  onComplete: (score: number) => void;
}

interface Card {
  id: number;
  partId: string;
  emoji: string;
  name: string;
  isTarget: boolean;
  flipped: boolean;
  found: boolean;
}

const TARGET_PARTS = [
  { partId: "body", emoji: "🪵", name: "몸통" },
  { partId: "head", emoji: "🔴", name: "머리" },
  { partId: "beak", emoji: "📐", name: "부리" },
  { partId: "wing", emoji: "🍂", name: "날개" },
  { partId: "spring", emoji: "🔩", name: "스프링" },
  { partId: "hammer", emoji: "🔨", name: "망치부분" },
];

const DISTRACTOR_PARTS = [
  { partId: "leaf", emoji: "🍃", name: "나뭇잎" },
  { partId: "rock", emoji: "🪨", name: "돌멩이" },
  { partId: "acorn", emoji: "🌰", name: "솔방울" },
  { partId: "flower", emoji: "🌸", name: "꽃" },
  { partId: "mush", emoji: "🍄", name: "버섯" },
  { partId: "bean", emoji: "🫘", name: "도토리" },
  { partId: "grass", emoji: "🌿", name: "풀" },
  { partId: "butterfly", emoji: "🦋", name: "나비" },
  { partId: "cherry", emoji: "🍒", name: "체리" },
  { partId: "snail", emoji: "🐌", name: "달팽이" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Phase = "ready" | "memorize" | "countdown" | "play" | "complete";

export function FindPartsGame({ onComplete }: FindPartsGameProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [cards, setCards] = useState<Card[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [memorizeTimer, setMemorizeTimer] = useState(5);
  const [foundCount, setFoundCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [shakeId, setShakeId] = useState<number | null>(null);
  const [sparkleId, setSparkleId] = useState<number | null>(null);
  const totalTargets = TARGET_PARTS.length;
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Initialize cards
  useEffect(() => {
    const distractors = shuffle(DISTRACTOR_PARTS).slice(0, 10);
    const allParts = [
      ...TARGET_PARTS.map((p) => ({ ...p, isTarget: true })),
      ...distractors.map((p) => ({ ...p, isTarget: false })),
    ];
    const shuffled = shuffle(allParts);
    setCards(
      shuffled.map((p, i) => ({
        ...p,
        id: i,
        flipped: false,
        found: false,
      }))
    );
  }, []);

  // Start memorize phase
  const startMemorize = useCallback(() => {
    setPhase("memorize");
    setCards((prev) => prev.map((c) => ({ ...c, flipped: true })));
    setMemorizeTimer(5);
  }, []);

  // Memorize countdown
  useEffect(() => {
    if (phase !== "memorize") return;
    timerRef.current = setInterval(() => {
      setMemorizeTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setPhase("countdown");
          setCards((prev) => prev.map((c) => ({ ...c, flipped: false })));
          setCountdown(3);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // Play countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          setPhase("play");
          return 0;
        }
        return c - 1;
      });
    }, 800);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const handleCardTap = useCallback(
    (card: Card) => {
      if (phase !== "play" || card.found || card.flipped) return;

      if (card.isTarget) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === card.id ? { ...c, flipped: true, found: true } : c
          )
        );
        setSparkleId(card.id);
        setTimeout(() => setSparkleId(null), 800);
        const newFound = foundCount + 1;
        setFoundCount(newFound);
        if (newFound >= totalTargets) {
          setPhase("complete");
          const score = Math.max(20, 100 - mistakes * 8);
          setTimeout(() => onComplete(score), 1200);
        }
      } else {
        // Wrong: briefly show then hide
        setCards((prev) =>
          prev.map((c) => (c.id === card.id ? { ...c, flipped: true } : c))
        );
        setShakeId(card.id);
        setMistakes((m) => m + 1);
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (c.id === card.id ? { ...c, flipped: false } : c))
          );
          setShakeId(null);
        }, 600);
      }
    },
    [phase, foundCount, mistakes, totalTargets, onComplete]
  );

  return (
    <div
      className="size-full flex flex-col relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FFF8DC 0%, #F5DEB3 50%, #DEB887 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <h2 style={{ fontSize: 20, color: "#5C3317" }}>🧠 부품 기억하기!</h2>
          {phase === "play" && (
            <span
              className="px-3 py-1 rounded-lg"
              style={{
                background: mistakes > 3 ? "#FF444433" : "#4CAF5033",
                color: mistakes > 3 ? "#FF4444" : "#4CAF50",
                fontSize: 13,
                border: `1px solid ${mistakes > 3 ? "#FF4444" : "#4CAF50"}`,
              }}
            >
              실수: {mistakes}
            </span>
          )}
        </div>

        {/* Progress */}
        {(phase === "play" || phase === "complete") && (
          <>
            <div className="flex gap-1 mb-1">
              {TARGET_PARTS.map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    background:
                      i < foundCount
                        ? "linear-gradient(90deg, #4CAF50, #66BB6A)"
                        : "rgba(0,0,0,0.12)",
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#8B4513" }}>
              찾은 부품: {foundCount} / {totalTargets}
            </p>
          </>
        )}

        {/* Phase info */}
        {phase === "memorize" && (
          <motion.div
            className="mt-2 p-3 rounded-xl text-center"
            style={{
              background: "linear-gradient(135deg, #FFF3CD, #FFE69C)",
              border: "2px solid #FFD700",
            }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <p style={{ fontSize: 16, color: "#5C3317" }}>
              👀 부품 위치를 기억하세요!
            </p>
            <p style={{ fontSize: 28, color: "#E8740C", marginTop: 4 }}>
              {memorizeTimer}초
            </p>
          </motion.div>
        )}

        {phase === "play" && (
          <div
            className="mt-2 p-2 rounded-lg text-center"
            style={{ background: "rgba(76,175,80,0.1)", border: "1px solid #4CAF50" }}
          >
            <p style={{ fontSize: 12, color: "#2E5A2E" }}>
              🔍 딱따구리 부품을 찾아 터치하세요! (🪵🔴📐🍂🔩🔨)
            </p>
          </div>
        )}
      </div>

      {/* Ready screen */}
      {phase === "ready" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            className="text-center p-8 rounded-2xl"
            style={{
              background: "rgba(255,248,220,0.95)",
              border: "3px solid #8B6914",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <span style={{ fontSize: 50 }}>🧩</span>
            <h3 style={{ fontSize: 22, color: "#5C3317", marginTop: 12 }}>
              메모리 퍼즐!
            </h3>
            <p style={{ fontSize: 14, color: "#8B4513", marginTop: 8, lineHeight: 1.8 }}>
              카드가 잠깐 보입니다!
              <br />
              딱따구리 부품 위치를 기억하고
              <br />
              카드가 가려지면 찾아주세요!
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4 mb-4">
              {TARGET_PARTS.map((p) => (
                <span
                  key={p.partId}
                  className="px-2 py-1 rounded-lg"
                  style={{ background: "#DEB887", fontSize: 12, color: "#5C3317" }}
                >
                  {p.emoji} {p.name}
                </span>
              ))}
            </div>
            <motion.button
              className="w-full py-4 rounded-xl text-white mt-2"
              style={{
                background: "linear-gradient(180deg, #FF8C00, #E8740C)",
                border: "3px solid #B8560B",
                boxShadow: "0 4px 12px rgba(232,116,12,0.4)",
                fontSize: 20,
              }}
              onClick={startMemorize}
              whileTap={{ scale: 0.95 }}
            >
              🧠 시작!
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* Countdown overlay */}
      <AnimatePresence>
        {phase === "countdown" && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center"
            style={{ background: "rgba(92,51,23,0.7)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              key={countdown}
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span
                style={{
                  fontSize: 80,
                  color: "#FFD700",
                  textShadow: "0 0 20px rgba(255,215,0,0.5)",
                }}
              >
                {countdown}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card grid */}
      {(phase === "memorize" || phase === "play" || phase === "complete") && (
        <div className="flex-1 mx-3 mb-3 overflow-y-auto">
          <div className="grid grid-cols-4 gap-2 p-2">
            {cards.map((card) => {
              const isRevealed = card.flipped || card.found;
              return (
                <motion.button
                  key={card.id}
                  className="relative aspect-square rounded-xl flex flex-col items-center justify-center overflow-hidden"
                  style={{
                    background: isRevealed
                      ? card.found
                        ? "linear-gradient(135deg, #E8F5E9, #C8E6C9)"
                        : card.isTarget
                        ? "linear-gradient(135deg, #FFF8DC, #F5DEB3)"
                        : "linear-gradient(135deg, #FFEBEE, #FFCDD2)"
                      : "linear-gradient(135deg, #8B6914, #A0845A)",
                    border: isRevealed
                      ? card.found
                        ? "3px solid #4CAF50"
                        : card.isTarget
                        ? "3px solid #FFD700"
                        : "3px solid #FF8A80"
                      : "3px solid #654321",
                    boxShadow: card.found
                      ? "0 0 12px rgba(76,175,80,0.3)"
                      : isRevealed && card.isTarget
                      ? "0 0 8px rgba(255,215,0,0.3)"
                      : "0 2px 6px rgba(0,0,0,0.2)",
                    transformStyle: "preserve-3d",
                  }}
                  onClick={() => handleCardTap(card)}
                  disabled={phase === "memorize" || card.found}
                  animate={
                    shakeId === card.id
                      ? { x: [-4, 4, -4, 4, 0] }
                      : {}
                  }
                  transition={{ duration: 0.3 }}
                  whileTap={
                    phase === "play" && !card.found
                      ? { scale: 0.92 }
                      : {}
                  }
                >
                  {isRevealed ? (
                    <motion.div
                      className="flex flex-col items-center justify-center"
                      initial={{ rotateY: 90 }}
                      animate={{ rotateY: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <span style={{ fontSize: 28 }}>{card.emoji}</span>
                      <span style={{ fontSize: 9, color: "#5C3317", marginTop: 2 }}>
                        {card.name}
                      </span>
                      {card.isTarget && phase === "memorize" && (
                        <motion.div
                          className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: "#FFD700" }}
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <span style={{ fontSize: 8 }}>⭐</span>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      {/* Card back design */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.15)" }}
                      >
                        <span style={{ fontSize: 16 }}>❓</span>
                      </div>
                      {/* Wood pattern on back */}
                      <div className="absolute inset-0 opacity-10 rounded-xl overflow-hidden">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-full h-px"
                            style={{ top: `${25 * (i + 1)}%`, background: "#FFF" }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sparkle effect */}
                  {sparkleId === card.id && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.8 }}
                    >
                      {[...Array(6)].map((_, i) => (
                        <motion.span
                          key={i}
                          className="absolute"
                          style={{ fontSize: 14 }}
                          initial={{ x: 0, y: 0, opacity: 1 }}
                          animate={{
                            x: Math.cos((i * Math.PI) / 3) * 30,
                            y: Math.sin((i * Math.PI) / 3) * 30,
                            opacity: 0,
                          }}
                          transition={{ duration: 0.6 }}
                        >
                          ✨
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Completion overlay */}
      <AnimatePresence>
        {phase === "complete" && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center"
            style={{ background: "rgba(255,248,220,0.85)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <span style={{ fontSize: 50 }}>🎉</span>
              <p style={{ fontSize: 26, color: "#5C3317", marginTop: 8 }}>
                모두 찾았어!
              </p>
              <p style={{ fontSize: 15, color: "#8B4513", marginTop: 4 }}>
                실수 {mistakes}번 · 점수 {Math.max(20, 100 - mistakes * 8)}점
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
