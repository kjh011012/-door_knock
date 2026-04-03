import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface HowToPlayProps {
  onBack: () => void;
}

const steps = [
  {
    emoji: "🧠",
    title: "부품 찾기",
    desc: "카드가 잠깐 보여요! 위치를 기억한 후\n카드가 가려지면 딱따구리 부품을 찾아요!",
    tip: "💡 메모리 퍼즐! 집중해서 위치를 잘 기억하세요!",
  },
  {
    emoji: "🧩",
    title: "조립하기",
    desc: "부품을 선택하고 실루엣 위에 놓아서\n딱따구리를 조립해요!",
    tip: "💡 부품 이름이 적힌 곳에 맞는 부품을 놓으세요!",
  },
  {
    emoji: "🔨",
    title: "리듬 두더지",
    desc: "노래 박자에 맞춰 두더지가 튀어나와요!\n타이밍에 맞춰 망치로 탭하세요!",
    tip: "💡 PERFECT 연타로 콤보를 쌓으면 점수가 크게 올라가요!",
  },
  {
    emoji: "🚪",
    title: "작동 테스트",
    desc: "문을 터치하면 딱따구리가 톡톡!\n잘 만들었으면 리듬감 있게 움직여요.",
    tip: "💡 두더지 리듬 점수가 높을수록 더 안정적으로 작동해요!",
  },
  {
    emoji: "🎨",
    title: "꾸미기",
    desc: "색을 칠하고, 눈 모양을 바꾸고,\n패턴을 넣어서 나만의 딱따구리를 만들어요!",
    tip: "💡 세상에 하나뿐인 나만의 작품을 만들어봐요!",
  },
  {
    emoji: "🎵",
    title: "리듬 톡톡",
    desc: "신나는 음악에 맞춰 딱따구리가 문을 두드려요!\n노트가 내려오면 타이밍에 맞춰 탭!",
    tip: "💡 최종 스코어가 결정되는 핵심 스테이지! PERFECT를 노려보세요!",
  },
];

export function HowToPlay({ onBack }: HowToPlayProps) {
  const [stepIndex, setStepIndex] = useState(0);

  return (
    <div
      className="size-full flex flex-col relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FFF8DC 0%, #F5DEB3 50%, #DEB887 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(180deg, #DEB887, #C4A67A)",
            border: "2px solid #8B6914",
          }}
        >
          <span style={{ fontSize: 18 }}>←</span>
        </button>
        <h2 style={{ fontSize: 20, color: "#5C3317" }}>📖 만드는 방법</h2>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1 mx-4 mb-4">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setStepIndex(i)}
            className="flex-1 h-2 rounded-full"
            style={{
              background: i === stepIndex
                ? "linear-gradient(90deg, #FF8C00, #FFD700)"
                : i < stepIndex
                ? "#4CAF50"
                : "rgba(0,0,0,0.15)",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            className="w-full p-6 rounded-2xl text-center"
            style={{
              background: "rgba(255,248,220,0.9)",
              border: "3px solid #8B6914",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            }}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.span
              style={{ fontSize: 60 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {steps[stepIndex].emoji}
            </motion.span>
            <h3 style={{ fontSize: 24, color: "#5C3317", marginTop: 12 }}>
              {stepIndex + 1}. {steps[stepIndex].title}
            </h3>
            <p style={{ fontSize: 15, color: "#8B4513", marginTop: 8, whiteSpace: "pre-line", lineHeight: 1.6 }}>
              {steps[stepIndex].desc}
            </p>
            <div
              className="mt-4 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,215,0,0.2)", border: "1px solid #FFD700" }}
            >
              <p style={{ fontSize: 13, color: "#8B6914" }}>{steps[stepIndex].tip}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-4 pb-6 flex gap-3">
        <button
          onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
          className="flex-1 py-3 rounded-xl"
          style={{
            background: stepIndex === 0 ? "#ccc" : "linear-gradient(180deg, #DEB887, #C4A67A)",
            border: "2px solid " + (stepIndex === 0 ? "#bbb" : "#8B6914"),
            color: stepIndex === 0 ? "#999" : "#5C3317",
            fontSize: 16,
          }}
          disabled={stepIndex === 0}
        >
          ← 이전
        </button>
        <button
          onClick={() => {
            if (stepIndex >= steps.length - 1) onBack();
            else setStepIndex(stepIndex + 1);
          }}
          className="flex-1 py-3 rounded-xl text-white"
          style={{
            background: "linear-gradient(180deg, #FF8C00, #E8740C)",
            border: "2px solid #B8560B",
            fontSize: 16,
          }}
        >
          {stepIndex >= steps.length - 1 ? "시작하기! 🔨" : "다음 →"}
        </button>
      </div>
    </div>
  );
}
