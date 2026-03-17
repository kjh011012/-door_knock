import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";

interface BalanceGameProps {
  onComplete: (score: number) => void;
}

export function BalanceGame({ onComplete }: BalanceGameProps) {
  const [pivotX, setPivotX] = useState(50); // Pivot position 0-100
  const [weightPos, setWeightPos] = useState(30); // Counterweight position
  const [tilt, setTilt] = useState(0); // Current tilt angle
  const [isStable, setIsStable] = useState(false);
  const [stableTimer, setStableTimer] = useState(0);
  const [phase, setPhase] = useState<"pivot" | "weight" | "test">("pivot");
  const [showGuide, setShowGuide] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Calculate tilt based on physics
  useEffect(() => {
    // Woodpecker body center is at ~60, head extends to ~75
    // We want balance when pivot + weight offset = body center of mass
    const bodyCenter = 55;
    const headWeight = 30;
    const bodyWeight = 50;
    const counterWeight = 20;

    // Torque calculation
    const bodyTorque = bodyWeight * (bodyCenter - pivotX) * 0.3;
    const headTorque = headWeight * (70 - pivotX) * 0.3;
    const counterTorque = counterWeight * (weightPos - pivotX) * 0.3;

    const totalTorque = bodyTorque + headTorque - counterTorque;
    const newTilt = Math.max(-25, Math.min(25, totalTorque * 0.5));
    setTilt(newTilt);

    const balanced = Math.abs(newTilt) < 3;
    setIsStable(balanced);
  }, [pivotX, weightPos]);

  // Stable timer for completion
  useEffect(() => {
    if (phase !== "test") return;

    if (isStable) {
      intervalRef.current = setInterval(() => {
        setStableTimer((t) => {
          if (t >= 100) {
            clearInterval(intervalRef.current);
            const accuracy = Math.max(0, 100 - Math.abs(tilt) * 10);
            setTimeout(() => onComplete(accuracy), 500);
            return 100;
          }
          return t + 2;
        });
      }, 50);
    } else {
      clearInterval(intervalRef.current);
      setStableTimer(0);
    }

    return () => clearInterval(intervalRef.current);
  }, [isStable, phase, tilt, onComplete]);

  const handleNext = () => {
    if (phase === "pivot") setPhase("weight");
    else if (phase === "weight") {
      setPhase("test");
      setShowGuide(false);
    }
  };

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
        <h2 style={{ fontSize: 20, color: "#5C3317" }}>⚖️ 균형 맞추기!</h2>
        <p style={{ fontSize: 13, color: "#8B4513" }}>
          {phase === "pivot"
            ? "중심축 위치를 조정하세요"
            : phase === "weight"
            ? "무게추 위치를 조정하세요"
            : "균형을 유지하세요!"}
        </p>

        {/* Phase indicators */}
        <div className="flex gap-2 mt-2">
          {["pivot", "weight", "test"].map((p, i) => (
            <div
              key={p}
              className="flex-1 py-1 rounded-lg text-center"
              style={{
                background: phase === p ? "#FF8C00" : i < ["pivot", "weight", "test"].indexOf(phase) ? "#4CAF50" : "rgba(0,0,0,0.1)",
                color: phase === p || i < ["pivot", "weight", "test"].indexOf(phase) ? "white" : "#888",
                fontSize: 11,
                border: phase === p ? "2px solid #B8560B" : "1px solid transparent",
              }}
            >
              {p === "pivot" ? "중심축" : p === "weight" ? "무게추" : "테스트"}
            </div>
          ))}
        </div>
      </div>

      {/* Main visualization */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
        {/* Balance guide */}
        {showGuide && (
          <motion.div
            className="absolute top-2 left-4 right-4 p-3 rounded-xl z-20"
            style={{
              background: "rgba(255,248,220,0.95)",
              border: "2px solid #FFD700",
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p style={{ fontSize: 12, color: "#5C3317" }}>
              💡 딱따구리가 기울지 않도록 중심점과 무게추를 조절하세요!
            </p>
          </motion.div>
        )}

        {/* The woodpecker on balance beam */}
        <div className="relative w-full max-w-xs h-72">
          {/* Pivot point (triangle) */}
          <div
            className="absolute bottom-12"
            style={{ left: `${pivotX}%`, transform: "translateX(-50%)" }}
          >
            <svg width="30" height="24" viewBox="0 0 30 24">
              <polygon points="15,0 0,24 30,24" fill="#8B6914" stroke="#654321" strokeWidth="2" />
            </svg>
          </div>

          {/* Balance beam */}
          <motion.div
            className="absolute bottom-16 w-full"
            style={{
              transformOrigin: `${pivotX}% 50%`,
            }}
            animate={{ rotate: tilt }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
          >
            {/* Beam */}
            <div
              className="w-full h-3 rounded-full"
              style={{
                background: "linear-gradient(180deg, #A0522D, #8B4513)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
              }}
            />

            {/* Center line marker */}
            <div
              className="absolute -top-4 w-0.5 h-3"
              style={{
                left: "50%",
                background: "rgba(255,0,0,0.4)",
              }}
            />

            {/* Woodpecker on beam */}
            <motion.div
              className="absolute -top-36"
              style={{ left: "50%", transform: "translateX(-50%)" }}
            >
              <svg viewBox="0 0 80 120" width="70" height="105">
                {/* Body */}
                <ellipse cx="40" cy="70" rx="18" ry="30" fill="#8B4513" />
                <ellipse cx="40" cy="75" rx="12" ry="20" fill="#DEB887" opacity="0.5" />
                {/* Head */}
                <circle cx="48" cy="38" r="16" fill="#DC143C" />
                {/* Crest */}
                <path d="M 52 24 L 62 16 L 56 28 L 66 22 L 58 32" fill="#DC143C" />
                {/* Beak */}
                <polygon points="62,36 80,34 62,40" fill="#FFD700" />
                {/* Eye */}
                <circle cx="52" cy="35" r="3" fill="white" />
                <circle cx="53" cy="34" r="1.5" fill="#222" />
                {/* Wing */}
                <ellipse cx="28" cy="65" rx="10" ry="18" fill="#654321" transform="rotate(-10 28 65)" />
                {/* Tail */}
                <path d="M 32 95 L 25 115 L 38 100 L 40 118 L 45 100 L 50 115 L 48 95" fill="#654321" />
              </svg>
            </motion.div>

            {/* Counterweight */}
            <motion.div
              className="absolute -top-8"
              style={{ left: `${weightPos}%`, transform: "translateX(-50%)" }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(180deg, #666, #444)",
                  border: "2px solid #333",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}
              >
                <span style={{ fontSize: 10, color: "white" }}>W</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Base */}
          <div
            className="absolute bottom-0 w-full h-12 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #C4A67A, #A0845A)",
              border: "3px solid #8B6914",
            }}
          />

          {/* Tilt indicator */}
          <div className="absolute -right-2 top-1/2 -translate-y-1/2">
            <div className="flex flex-col items-center gap-1">
              <span style={{ fontSize: 10, color: tilt < -3 ? "#FF4444" : "#aaa" }}>↗️</span>
              <span style={{ fontSize: 10, color: Math.abs(tilt) < 3 ? "#4CAF50" : "#aaa" }}>⚖️</span>
              <span style={{ fontSize: 10, color: tilt > 3 ? "#FF4444" : "#aaa" }}>↘️</span>
            </div>
          </div>
        </div>

        {/* Balance meter */}
        {phase === "test" && (
          <div className="w-full max-w-xs mt-4">
            <div className="flex justify-between mb-1">
              <span style={{ fontSize: 12, color: "#5C3317" }}>균형 안정도</span>
              <span style={{ fontSize: 12, color: isStable ? "#4CAF50" : "#FF8C00" }}>
                {isStable ? "✅ 안정!" : "⚠️ 흔들림"}
              </span>
            </div>
            <div
              className="w-full h-4 rounded-full overflow-hidden"
              style={{ background: "rgba(0,0,0,0.15)", border: "2px solid #8B6914" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${stableTimer}%`,
                  background: stableTimer > 70
                    ? "linear-gradient(90deg, #4CAF50, #66BB6A)"
                    : "linear-gradient(90deg, #FF8C00, #FFD700)",
                }}
              />
            </div>
            <p className="text-center mt-1" style={{ fontSize: 11, color: "#8B4513" }}>
              균형을 유지하면 게이지가 차올라요!
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 pb-6">
        {phase !== "test" ? (
          <>
            <div className="mb-3">
              <label
                className="block mb-1"
                style={{ fontSize: 13, color: "#5C3317" }}
              >
                {phase === "pivot" ? "🔺 중심축 위치" : "⚫ 무게추 위치"}
              </label>
              <input
                type="range"
                min="20"
                max="80"
                value={phase === "pivot" ? pivotX : weightPos}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (phase === "pivot") setPivotX(val);
                  else setWeightPos(val);
                }}
                className="w-full h-3 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(90deg, #8B6914, #DEB887)`,
                  accentColor: "#FF8C00",
                }}
              />
              <div className="flex justify-between">
                <span style={{ fontSize: 10, color: "#888" }}>왼쪽</span>
                <span style={{ fontSize: 10, color: "#888" }}>오른쪽</span>
              </div>
            </div>
            <motion.button
              className="w-full py-4 rounded-xl text-white"
              style={{
                background: "linear-gradient(180deg, #FF8C00, #E8740C)",
                border: "3px solid #B8560B",
                fontSize: 18,
              }}
              onClick={handleNext}
              whileTap={{ scale: 0.95 }}
            >
              {phase === "pivot" ? "다음: 무게추 조정 →" : "균형 테스트 시작! →"}
            </motion.button>
          </>
        ) : (
          <div className="text-center">
            <p style={{ fontSize: 14, color: "#5C3317" }}>
              슬라이더로 미세 조정하세요!
            </p>
            <input
              type="range"
              min="15"
              max="85"
              value={weightPos}
              onChange={(e) => setWeightPos(Number(e.target.value))}
              className="w-full h-3 rounded-full appearance-none cursor-pointer mt-2"
              style={{ accentColor: "#FF8C00" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
