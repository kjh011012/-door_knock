import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { buildScoreSummary, STAGE_SCORE_MAX, TOTAL_SCORE_MAX } from "../utils/score";

interface RewardScreenProps {
  scores: {
    findParts: number;
    assembly: number;
    hammer: number;
    rhythm: number;
  };
  onRestart: () => void;
}

interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  minScore: number;
  color: string;
}

const BADGES: Badge[] = [
  {
    id: "badge1",
    emoji: "🎖️",
    title: "5등 메달",
    description: "환산 점수 50점 달성",
    minScore: 50,
    color: "#CD7F32",
  },
  {
    id: "badge2",
    emoji: "🏅",
    title: "4등 메달",
    description: "환산 점수 60점 달성",
    minScore: 60,
    color: "#C0C0C0",
  },
  {
    id: "badge3",
    emoji: "🥉",
    title: "3등 메달",
    description: "환산 점수 70점 달성",
    minScore: 70,
    color: "#FFD700",
  },
  {
    id: "badge4",
    emoji: "🥈",
    title: "2등 메달",
    description: "환산 점수 80점 달성",
    minScore: 80,
    color: "#4CAF50",
  },
  {
    id: "badge5",
    emoji: "🥇",
    title: "1등 메달",
    description: "환산 점수 90점 달성",
    minScore: 90,
    color: "#FF8C00",
  },
];

export function RewardScreen({ scores, onRestart }: RewardScreenProps) {
  const [revealedIndex, setRevealedIndex] = useState(-1);
  const summary = buildScoreSummary(scores);
  const stageScores = [
    { label: "나무블럭 만들기", score: summary.stageScores.findParts },
    { label: "테트리스 조립", score: summary.stageScores.assembly },
    { label: "두더지 게임", score: summary.stageScores.hammer },
    { label: "리듬 게임", score: summary.stageScores.rhythm },
  ];
  const totalRawScore = summary.totalRawScore;
  const totalScore = summary.totalScore100;

  const earnedBadges = BADGES.filter((b) => totalScore >= b.minScore);
  const revealedCount = Math.min(revealedIndex + 1, earnedBadges.length);

  const revealNext = () => {
    const nextIdx = revealedIndex + 1;
    if (nextIdx < earnedBadges.length) {
      setRevealedIndex(nextIdx);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
        colors: ["#FFD700", "#FF8C00", "#DC143C"],
      });
    }
  };

  const allRevealed = revealedIndex >= earnedBadges.length - 1;
  const hasAllBadges = earnedBadges.length === BADGES.length;

  return (
    <div
      className="size-full flex flex-col items-center relative overflow-hidden overflow-y-auto"
      style={{
        background: "linear-gradient(180deg, #1a0f05 0%, #3D2B1F 30%, #5C3317 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      {/* Stars background */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: "#FFD700",
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
        />
      ))}

      {/* Header */}
      <motion.div
        className="pt-8 text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h1 style={{ fontSize: 28, color: "#FFD700", textShadow: "0 0 10px rgba(255,215,0,0.5)" }}>
          🎁 보상 획득!
        </h1>
        <p style={{ fontSize: 14, color: "#DEB887", marginTop: 4 }}>
          획득한 배지: {revealedCount} / {BADGES.length}
        </p>
        <p style={{ fontSize: 13, color: "#FFE3A6", marginTop: 4 }}>
          최종 환산 점수: {totalScore}점 / 100점
        </p>
        <p style={{ fontSize: 11, color: "#D5B98A", marginTop: 2 }}>
          원점수 {totalRawScore} / {TOTAL_SCORE_MAX}점
        </p>
        <p style={{ fontSize: 11, color: "#D5B98A", marginTop: 1 }}>
          총 최고점: {TOTAL_SCORE_MAX.toLocaleString()}점
        </p>
      </motion.div>

      <div className="w-full px-6 pt-4 grid grid-cols-2 gap-2">
        {stageScores.map((item) => (
          <div
            key={item.label}
            className="rounded-lg px-3 py-2"
            style={{ background: "rgba(255,248,220,0.14)", border: "1px solid rgba(255,248,220,0.24)" }}
          >
            <p style={{ fontSize: 11, color: "#E6CDA6" }}>{item.label}</p>
            <p style={{ fontSize: 13, color: "#FFF2DA", marginTop: 2 }}>
              {item.score} / {STAGE_SCORE_MAX}
            </p>
            <p style={{ fontSize: 10, color: "#D8C19A", marginTop: 1 }}>
              최고점 {STAGE_SCORE_MAX.toLocaleString()}점
            </p>
          </div>
        ))}
      </div>

      {/* Badge cards */}
      <div className="flex-1 w-full px-6 py-6 space-y-4">
        {earnedBadges.map((badge, i) => (
          <AnimatePresence key={badge.id}>
            {i <= revealedIndex ? (
              <motion.div
                className="w-full p-4 rounded-xl flex items-center gap-4"
                style={{
                  background: "linear-gradient(135deg, rgba(255,248,220,0.95), rgba(222,184,135,0.95))",
                  border: `3px solid ${badge.color}`,
                  boxShadow: `0 4px 16px rgba(0,0,0,0.3), 0 0 12px ${badge.color}33`,
                }}
                initial={{ scale: 0, rotateY: 180 }}
                animate={{ scale: 1, rotateY: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <motion.div
                  className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${badge.color}, ${badge.color}CC)`,
                    boxShadow: `0 0 12px ${badge.color}66`,
                  }}
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                >
                  <span style={{ fontSize: 32 }}>{badge.emoji}</span>
                </motion.div>
                <div>
                  <h3 style={{ fontSize: 18, color: "#5C3317" }}>{badge.title}</h3>
                  <p style={{ fontSize: 12, color: "#8B4513" }}>{badge.description}</p>
                </div>
              </motion.div>
            ) : i === revealedIndex + 1 ? (
              <motion.div
                className="w-full p-4 rounded-xl flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "2px dashed rgba(255,215,0,0.3)",
                  height: 80,
                }}
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span style={{ fontSize: 24, color: "rgba(255,215,0,0.5)" }}>❓</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        ))}

        {/* Locked badges */}
        {BADGES.filter((b) => totalScore < b.minScore).map((badge) => (
          <div
            key={badge.id}
            className="w-full p-4 rounded-xl flex items-center gap-4 opacity-40"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "2px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <span style={{ fontSize: 24 }}>🔒</span>
            </div>
            <div>
              <h3 style={{ fontSize: 16, color: "#888" }}>{badge.title}</h3>
              <p style={{ fontSize: 11, color: "#666" }}>{badge.minScore}점 이상 필요 (100점 환산)</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="w-full px-6 pb-6 space-y-3">
        {!allRevealed ? (
          <motion.button
            className="w-full py-4 rounded-xl text-white"
            style={{
              background: "linear-gradient(180deg, #FFD700, #FFA500)",
              border: "3px solid #B8860B",
              boxShadow: "0 0 20px rgba(255,215,0,0.3)",
              fontSize: 18,
              color: "#5C3317",
            }}
            onClick={revealNext}
            whileTap={{ scale: 0.95 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            🎁 배지 열기! ({revealedIndex + 2}/{earnedBadges.length})
          </motion.button>
        ) : (
          <>
            {hasAllBadges && (
              <motion.div
                className="w-full p-4 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,140,0,0.3))",
                  border: "2px solid rgba(255,215,0,0.8)",
                  boxShadow: "0 0 16px rgba(255,215,0,0.35)",
                }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p style={{ fontSize: 17, color: "#FFE9B8", textAlign: "center" }}>🎉 5개 배지 모두 획득!</p>
                <p style={{ fontSize: 15, color: "#FFF5DE", textAlign: "center", marginTop: 4 }}>
                  쿠폰 1000원 제공 대상입니다.
                </p>
              </motion.div>
            )}
            <motion.button
              className="w-full py-4 rounded-xl text-white"
              style={{
                background: "linear-gradient(180deg, #FF8C00, #E8740C)",
                border: "3px solid #B8560B",
                fontSize: 18,
              }}
              onClick={onRestart}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              🔄 다시 만들기!
            </motion.button>
            <motion.p
              className="text-center"
              style={{ fontSize: 13, color: "#DEB887" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              더 높은 점수로 모든 배지를 모아보세요! ✨
            </motion.p>
          </>
        )}
      </div>
    </div>
  );
}
