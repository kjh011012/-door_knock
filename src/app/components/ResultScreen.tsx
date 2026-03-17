import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { WoodpeckerSVG } from "./WoodpeckerSVG";
import type { Customization } from "./CustomizeScreen";
import confetti from "canvas-confetti";

interface ResultScreenProps {
  scores: {
    findParts: number;
    assembly: number;
    hammer: number;
    balance: number;
    operation: number;
    rhythm: number;
  };
  customization: Customization;
  onNext: () => void;
}

function getGrade(total: number): { emoji: string; label: string; message: string } {
  if (total >= 90) return { emoji: "👑", label: "장인", message: "완벽한 균형! 진정한 목공 장인!" };
  if (total >= 70) return { emoji: "😄", label: "잘됨", message: "톡톡! 잘 작동해요!" };
  if (total >= 50) return { emoji: "🙂", label: "보통", message: "나쁘지 않아요! 연습하면 더 잘 만들 수 있어요!" };
  return { emoji: "😢", label: "실패", message: "다시 도전해봐요! 할 수 있어요!" };
}

export function ResultScreen({ scores, customization, onNext }: ResultScreenProps) {
  const [showDetails, setShowDetails] = useState(false);

  const totalScore = Math.round(
    (scores.findParts + scores.assembly + scores.hammer + scores.balance + scores.operation + scores.rhythm) / 6
  );
  const grade = getGrade(totalScore);

  useEffect(() => {
    if (totalScore >= 70) {
      const timer = setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#FFD700", "#FF8C00", "#DC143C", "#4CAF50"],
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [totalScore]);

  const scoreItems = [
    { label: "부품 찾기", score: scores.findParts, emoji: "🔍" },
    { label: "조립", score: scores.assembly, emoji: "🧩" },
    { label: "망치질", score: scores.hammer, emoji: "🔨" },
    { label: "균형 맞추기", score: scores.balance, emoji: "⚖️" },
    { label: "작동 테스트", score: scores.operation, emoji: "🚪" },
    { label: "리듬 톡톡", score: scores.rhythm, emoji: "🎵" },
  ];

  return (
    <div
      className="size-full flex flex-col items-center relative overflow-hidden overflow-y-auto"
      style={{
        background: "linear-gradient(180deg, #FFF8DC 0%, #F5DEB3 40%, #DEB887 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      {/* Header */}
      <div className="pt-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          <span style={{ fontSize: 64 }}>{grade.emoji}</span>
        </motion.div>
        <motion.h1
          style={{ fontSize: 28, color: "#5C3317" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {grade.label}!
        </motion.h1>
      </div>

      {/* Woodpecker showcase */}
      <motion.div
        className="my-4 p-6 rounded-2xl relative"
        style={{
          background: "linear-gradient(180deg, #C4A67A, #A0845A)",
          border: "4px solid #8B6914",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
      >
        <motion.div
          animate={{ rotate: [-3, 3, -3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <WoodpeckerSVG
            size={120}
            bodyColor={customization.bodyColor}
            headColor={customization.headColor}
            beakColor={customization.beakColor}
            wingColor={customization.wingColor}
            eyeStyle={customization.eyeStyle}
            pattern={customization.pattern}
          />
        </motion.div>
        {/* Sparkles */}
        {totalScore >= 70 && (
          <>
            {[...Array(5)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute"
                style={{
                  fontSize: 16,
                  top: `${20 + Math.random() * 60}%`,
                  left: `${10 + Math.random() * 80}%`,
                }}
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
              >
                ✨
              </motion.span>
            ))}
          </>
        )}
      </motion.div>

      {/* Message */}
      <motion.p
        className="px-6 text-center"
        style={{ fontSize: 16, color: "#5C3317" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {grade.message}
      </motion.p>

      {/* Total score */}
      <motion.div
        className="mt-4 px-6 py-3 rounded-xl"
        style={{
          background: "linear-gradient(180deg, #FFD700, #FFA500)",
          border: "3px solid #B8860B",
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8, type: "spring" }}
      >
        <span style={{ fontSize: 24, color: "#5C3317" }}>총점: {totalScore}점</span>
      </motion.div>

      {/* Score details */}
      <motion.button
        className="mt-3 px-4 py-2 rounded-lg"
        style={{ background: "#DEB887", border: "2px solid #8B6914", color: "#5C3317", fontSize: 13 }}
        onClick={() => setShowDetails(!showDetails)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {showDetails ? "점수 숨기기" : "📊 상세 점수 보기"}
      </motion.button>

      {showDetails && (
        <motion.div
          className="w-full px-6 mt-2 space-y-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          {scoreItems.map((item, i) => (
            <motion.div
              key={item.label}
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{ background: "rgba(255,248,220,0.8)", border: "1px solid #DEB887" }}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <span style={{ fontSize: 18 }}>{item.emoji}</span>
              <span className="flex-1" style={{ fontSize: 13, color: "#5C3317" }}>{item.label}</span>
              <div
                className="w-24 h-3 rounded-full overflow-hidden"
                style={{ background: "rgba(0,0,0,0.1)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      item.score >= 80
                        ? "linear-gradient(90deg, #4CAF50, #66BB6A)"
                        : item.score >= 50
                        ? "linear-gradient(90deg, #FF8C00, #FFD700)"
                        : "linear-gradient(90deg, #FF4444, #FF6666)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.score}%` }}
                  transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                />
              </div>
              <span style={{ fontSize: 12, color: "#8B4513", width: 30, textAlign: "right" }}>
                {item.score}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Next button */}
      <div className="w-full px-6 py-6 mt-auto">
        <motion.button
          className="w-full py-4 rounded-xl text-white"
          style={{
            background: "linear-gradient(180deg, #FF8C00, #E8740C)",
            border: "3px solid #B8560B",
            boxShadow: "0 4px 12px rgba(232,116,12,0.4)",
            fontSize: 18,
          }}
          onClick={onNext}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          🎁 보상 받기!
        </motion.button>
      </div>
    </div>
  );
}