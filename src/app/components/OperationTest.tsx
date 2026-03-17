import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

interface OperationTestProps {
  onComplete: (score: number) => void;
  balanceScore: number;
  hammerScore: number;
}

export function OperationTest({ onComplete, balanceScore, hammerScore }: OperationTestProps) {
  const [knockCount, setKnockCount] = useState(0);
  const [isKnocking, setIsKnocking] = useState(false);
  const [doorShake, setDoorShake] = useState(false);
  const [showKnockText, setShowKnockText] = useState(false);
  const [rhythm, setRhythm] = useState<number[]>([]);
  const [lastKnockTime, setLastKnockTime] = useState(0);
  const REQUIRED_KNOCKS = 8;

  // Quality depends on previous scores
  const quality = Math.round((balanceScore + hammerScore) / 2);
  const isGood = quality >= 50;

  const handleDoorKnock = useCallback(() => {
    if (isKnocking) return;

    const now = Date.now();
    if (lastKnockTime > 0) {
      setRhythm((prev) => [...prev, now - lastKnockTime]);
    }
    setLastKnockTime(now);

    setIsKnocking(true);
    setKnockCount((c) => c + 1);
    setDoorShake(true);
    setShowKnockText(true);

    setTimeout(() => setDoorShake(false), 200);
    setTimeout(() => setShowKnockText(false), 600);
    setTimeout(() => setIsKnocking(false), 300);

    if (knockCount + 1 >= REQUIRED_KNOCKS) {
      // Calculate rhythm score
      let rhythmScore = 70;
      if (rhythm.length >= 3) {
        const avg = rhythm.reduce((a, b) => a + b, 0) / rhythm.length;
        const variance = rhythm.reduce((a, b) => a + Math.abs(b - avg), 0) / rhythm.length;
        rhythmScore = Math.max(30, Math.min(100, 100 - variance / 5));
      }
      const finalScore = Math.round((rhythmScore + quality) / 2);
      setTimeout(() => onComplete(finalScore), 1000);
    }
  }, [isKnocking, knockCount, lastKnockTime, rhythm, quality, onComplete]);

  return (
    <div
      className="size-full flex flex-col items-center relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #5C3317 0%, #8B6914 30%, #A0522D 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      {/* Header */}
      <div className="w-full px-4 pt-4 pb-2 text-center">
        <h2 style={{ fontSize: 20, color: "#FFF8DC" }}>🚪 작동 테스트!</h2>
        <p style={{ fontSize: 13, color: "#DEB887" }}>
          문을 터치해서 딱따구리를 작동시켜보세요!
        </p>
        {/* Progress */}
        <div className="flex gap-1 mt-2 px-4">
          {Array.from({ length: REQUIRED_KNOCKS }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-2 rounded-full"
              style={{
                background: i < knockCount
                  ? "linear-gradient(90deg, #FFD700, #FF8C00)"
                  : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Door scene */}
      <div className="flex-1 flex items-center justify-center w-full px-4">
        <div className="relative">
          {/* Wall */}
          <div
            className="w-72 h-96 rounded-lg relative"
            style={{
              background: "linear-gradient(180deg, #B8956A, #A0845A)",
              border: "4px solid #654321",
              boxShadow: "inset 0 0 30px rgba(0,0,0,0.2)",
            }}
          >
            {/* Door */}
            <motion.div
              className="absolute inset-4 rounded-lg"
              style={{
                background: "linear-gradient(180deg, #A0522D, #8B4513)",
                border: "3px solid #654321",
                boxShadow: "inset 0 0 20px rgba(0,0,0,0.2), 2px 2px 8px rgba(0,0,0,0.3)",
              }}
              animate={doorShake ? { x: [-2, 2, -2, 2, 0] } : {}}
              transition={{ duration: 0.2 }}
              onClick={handleDoorKnock}
            >
              {/* Door panels */}
              <div
                className="absolute top-3 left-3 right-3 h-28 rounded"
                style={{ border: "2px solid rgba(101,67,33,0.5)" }}
              />
              <div
                className="absolute bottom-3 left-3 right-3 h-28 rounded"
                style={{ border: "2px solid rgba(101,67,33,0.5)" }}
              />

              {/* Door handle */}
              <motion.div
                className="absolute right-4 top-1/2 -translate-y-1/2"
                animate={knockCount > 0 && knockCount < REQUIRED_KNOCKS ? { rotate: [0, -15, 0] } : {}}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="w-5 h-10 rounded-full"
                  style={{
                    background: "linear-gradient(180deg, #DAA520, #B8860B)",
                    border: "1px solid #8B6914",
                    boxShadow: "1px 1px 4px rgba(0,0,0,0.3)",
                  }}
                />
              </motion.div>

              {/* Woodpecker door knocker on door */}
              <motion.div
                className="absolute top-6 left-1/2 -translate-x-1/2"
                animate={
                  isKnocking
                    ? isGood
                      ? { rotate: [0, -25, 5, 0] }
                      : { rotate: [0, -8, 2, 0], x: [-3, 3, -3, 0] }
                    : {}
                }
                transition={{ duration: 0.25 }}
              >
                <svg viewBox="0 0 80 100" width="80" height="100">
                  {/* Mounting plate */}
                  <rect x="25" y="0" width="30" height="10" rx="3" fill="#8B6914" stroke="#654321" />
                  {/* Spring/Rod */}
                  <rect x="38" y="10" width="4" height="15" fill="#888" />
                  {/* Body */}
                  <ellipse cx="40" cy="50" rx="15" ry="22" fill="#8B4513" />
                  <ellipse cx="40" cy="55" rx="10" ry="15" fill="#DEB887" opacity="0.4" />
                  {/* Head */}
                  <circle cx="48" cy="30" r="12" fill="#DC143C" />
                  {/* Crest */}
                  <path d="M 52 20 L 60 14 L 55 24" fill="#FF4500" />
                  {/* Beak - this hits the door */}
                  <polygon points="58,28 75,26 58,32" fill="#FFD700" />
                  {/* Eye */}
                  <circle cx="50" cy="28" r="2.5" fill="white" />
                  <circle cx="51" cy="27" r="1.2" fill="#222" />
                  {/* Wing */}
                  <ellipse cx="30" cy="48" rx="8" ry="14" fill="#654321" />
                  {/* Tail */}
                  <path d="M 33 68 L 28 82 L 37 72 L 40 85 L 43 72 L 48 82 L 47 68" fill="#654321" />
                  {/* Knocker ring */}
                  <circle cx="40" cy="85" r="6" fill="none" stroke="#DAA520" strokeWidth="3" />
                </svg>
              </motion.div>

              {/* Knock effect on door */}
              <AnimatePresence>
                {showKnockText && (
                  <motion.div
                    className="absolute top-20 right-2"
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 1.3, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span
                      className="px-2 py-1 rounded-lg"
                      style={{
                        background: isGood ? "#FFD700" : "#FF8C00",
                        color: "#5C3317",
                        fontSize: 16,
                      }}
                    >
                      {isGood ? "톡톡!" : "삐걱.."}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tap hint */}
              {knockCount === 0 && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <span
                    className="px-4 py-2 rounded-xl"
                    style={{
                      background: "rgba(255,248,220,0.9)",
                      color: "#5C3317",
                      fontSize: 16,
                    }}
                  >
                    👆 터치하세요!
                  </span>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Quality indicator */}
          <div className="absolute -bottom-8 left-0 right-0 text-center">
            <span
              className="px-3 py-1 rounded-lg"
              style={{
                background: isGood ? "rgba(76,175,80,0.9)" : "rgba(255,140,0,0.9)",
                color: "white",
                fontSize: 12,
              }}
            >
              {isGood ? "✨ 잘 만들었어요!" : "🔧 조금 삐뚤하지만 OK!"}
            </span>
          </div>
        </div>
      </div>

      {/* Completion */}
      <AnimatePresence>
        {knockCount >= REQUIRED_KNOCKS && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-30"
            style={{ background: "rgba(0,0,0,0.5)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="p-8 rounded-2xl text-center"
              style={{ background: "#FFF8DC", border: "4px solid #8B6914" }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
            >
              <p style={{ fontSize: 28 }}>{isGood ? "🎉" : "😊"}</p>
              <p style={{ fontSize: 22, color: "#5C3317", marginTop: 8 }}>
                {isGood ? "톡톡! 잘 작동해요!" : "작동은 하네요!"}
              </p>
              <p style={{ fontSize: 14, color: "#8B4513", marginTop: 4 }}>
                {isGood ? "리듬감 있는 소리가 나요!" : "조금 삐걱거리지만 괜찮아요!"}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-12" />
    </div>
  );
}
