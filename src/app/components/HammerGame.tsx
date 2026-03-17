import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

interface HammerGameProps {
  onComplete: (score: number) => void;
}

type HitResult = "PERFECT" | "GOOD" | "BAD" | null;

const TOTAL_NAILS = 5;

export function HammerGame({ onComplete }: HammerGameProps) {
  const [gaugePos, setGaugePos] = useState(0);
  const [gaugeDir, setGaugeDir] = useState(1);
  const [nailIndex, setNailIndex] = useState(0);
  const [lastHit, setLastHit] = useState<HitResult>(null);
  const [nailResults, setNailResults] = useState<HitResult[]>([]);
  const [isHammering, setIsHammering] = useState(false);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [showImpact, setShowImpact] = useState(false);
  const animRef = useRef<number>();
  const speedRef = useRef(2);

  // Increase speed each nail
  useEffect(() => {
    speedRef.current = 2 + nailIndex * 0.5;
  }, [nailIndex]);

  // Gauge animation
  useEffect(() => {
    if (nailIndex >= TOTAL_NAILS || isHammering) return;

    const animate = () => {
      setGaugePos((prev) => {
        let next = prev + gaugeDir * speedRef.current;
        if (next >= 100) {
          setGaugeDir(-1);
          next = 100;
        } else if (next <= 0) {
          setGaugeDir(1);
          next = 0;
        }
        return next;
      });
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [gaugeDir, nailIndex, isHammering]);

  const handleHammer = useCallback(() => {
    if (isHammering || nailIndex >= TOTAL_NAILS) return;
    setIsHammering(true);

    // Determine hit quality based on gauge position (sweet spot: 45-55)
    let result: HitResult;
    const dist = Math.abs(gaugePos - 50);
    if (dist < 8) {
      result = "PERFECT";
      setShakeIntensity(3);
    } else if (dist < 20) {
      result = "GOOD";
      setShakeIntensity(6);
    } else {
      result = "BAD";
      setShakeIntensity(10);
    }

    setLastHit(result);
    setShowImpact(true);

    setTimeout(() => {
      setShowImpact(false);
      setShakeIntensity(0);
      setIsHammering(false);

      const newResults = [...nailResults, result];
      setNailResults(newResults);
      setNailIndex(nailIndex + 1);
      setLastHit(null);

      if (newResults.length >= TOTAL_NAILS) {
        const perfectCount = newResults.filter((r) => r === "PERFECT").length;
        const goodCount = newResults.filter((r) => r === "GOOD").length;
        const score = perfectCount * 20 + goodCount * 12;
        setTimeout(() => onComplete(score), 600);
      }
    }, 800);
  }, [gaugePos, isHammering, nailIndex, nailResults, onComplete]);

  const getHitColor = (result: HitResult) => {
    switch (result) {
      case "PERFECT": return "#FFD700";
      case "GOOD": return "#4CAF50";
      case "BAD": return "#FF4444";
      default: return "#888";
    }
  };

  const getHitText = (result: HitResult) => {
    switch (result) {
      case "PERFECT": return "✨ PERFECT! ✨";
      case "GOOD": return "👍 GOOD!";
      case "BAD": return "😅 다시 도전!";
      default: return "";
    }
  };

  const nailDepth = nailResults.length;

  return (
    <div
      className="size-full flex flex-col items-center relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FFF8DC 0%, #F5DEB3 50%, #DEB887 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      {/* Header */}
      <div className="w-full px-4 pt-4 pb-2">
        <h2 style={{ fontSize: 20, color: "#5C3317" }}>🔨 망치질 타이밍!</h2>
        <p style={{ fontSize: 13, color: "#8B4513" }}>
          게이지가 가운데에 올 때 탭하세요!
        </p>
        {/* Nail progress */}
        <div className="flex gap-2 mt-2">
          {Array.from({ length: TOTAL_NAILS }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-3 rounded-full flex items-center justify-center"
              style={{
                background: i < nailResults.length
                  ? getHitColor(nailResults[i])
                  : i === nailIndex
                  ? "rgba(255,140,0,0.3)"
                  : "rgba(0,0,0,0.1)",
                border: i === nailIndex ? "2px solid #FF8C00" : "1px solid rgba(0,0,0,0.1)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Main game area */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative px-4">
        {/* Wood plank with nail */}
        <motion.div
          className="relative w-64 h-48 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(180deg, #C4A67A, #A0845A)",
            border: "4px solid #8B6914",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
          animate={
            shakeIntensity > 0
              ? { x: [0, -shakeIntensity, shakeIntensity, -shakeIntensity/2, 0] }
              : {}
          }
          transition={{ duration: 0.3 }}
        >
          {/* Wood grain */}
          {[30, 60, 90, 120].map((y) => (
            <div
              key={y}
              className="absolute w-full"
              style={{ top: y, height: 1, background: "rgba(139,69,19,0.15)" }}
            />
          ))}

          {/* Nail */}
          <div className="absolute flex flex-col items-center" style={{ top: "30%" }}>
            {/* Nail head */}
            <div
              className="w-8 h-3 rounded-t-sm"
              style={{
                background: "linear-gradient(180deg, #C0C0C0, #A0A0A0)",
                border: "1px solid #888",
              }}
            />
            {/* Nail body - shows based on how many nails hammered */}
            <motion.div
              className="w-2 rounded-b-sm"
              style={{
                background: "linear-gradient(180deg, #B0B0B0, #808080)",
              }}
              animate={{
                height: Math.max(5, 40 - nailDepth * 8),
              }}
              transition={{ duration: 0.3, type: "spring" }}
            />
          </div>

          {/* Impact effect */}
          <AnimatePresence>
            {showImpact && (
              <>
                <motion.div
                  className="absolute"
                  style={{ top: "28%" }}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 3, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ background: getHitColor(lastHit) }}
                  />
                </motion.div>
                {/* Sparks */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "#FFD700",
                      top: "30%",
                    }}
                    initial={{ x: 0, y: 0, opacity: 1 }}
                    animate={{
                      x: (Math.random() - 0.5) * 80,
                      y: (Math.random() - 0.5) * 60,
                      opacity: 0,
                    }}
                    transition={{ duration: 0.5 }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Hit result text */}
          <AnimatePresence>
            {lastHit && (
              <motion.div
                className="absolute z-20"
                style={{ top: "10%" }}
                initial={{ scale: 0, y: 0 }}
                animate={{ scale: 1.2, y: -20 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ type: "spring" }}
              >
                <span
                  style={{
                    fontSize: 22,
                    color: getHitColor(lastHit),
                    textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
                  }}
                >
                  {getHitText(lastHit)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hammer */}
          <motion.div
            className="absolute z-10"
            style={{ top: "-30%", right: "15%" }}
            animate={
              isHammering
                ? { rotate: [0, -60, 10, 0], y: [0, 40, -5, 0] }
                : { rotate: [-10, -15, -10], y: [0, -5, 0] }
            }
            transition={
              isHammering
                ? { duration: 0.3, times: [0, 0.4, 0.7, 1] }
                : { duration: 1.5, repeat: Infinity }
            }
          >
            <svg width="80" height="80" viewBox="0 0 80 80">
              {/* Handle */}
              <rect x="35" y="25" width="8" height="50" rx="3" fill="#8B4513" />
              <rect x="36" y="25" width="3" height="50" rx="2" fill="#A0522D" opacity="0.5" />
              {/* Head */}
              <rect x="15" y="10" width="48" height="20" rx="4" fill="#666" />
              <rect x="15" y="10" width="48" height="10" rx="4" fill="#888" opacity="0.5" />
            </svg>
          </motion.div>
        </motion.div>

        {/* Timing gauge */}
        <div className="w-72 mt-8">
          <div
            className="relative w-full h-10 rounded-full overflow-hidden"
            style={{
              background: "linear-gradient(90deg, #FF4444 0%, #FF4444 30%, #4CAF50 42%, #FFD700 46%, #FFD700 54%, #4CAF50 58%, #FF4444 70%, #FF4444 100%)",
              border: "3px solid #8B6914",
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.3)",
            }}
          >
            {/* Center marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5"
              style={{ left: "50%", background: "white", opacity: 0.5 }}
            />
            {/* Moving indicator */}
            <motion.div
              className="absolute top-1 bottom-1 w-5 rounded-full"
              style={{
                left: `${gaugePos}%`,
                transform: "translateX(-50%)",
                background: "white",
                boxShadow: "0 0 8px rgba(255,255,255,0.8)",
                border: "2px solid #333",
              }}
            />
          </div>
          <div className="flex justify-between mt-1 px-2">
            <span style={{ fontSize: 10, color: "#FF4444" }}>BAD</span>
            <span style={{ fontSize: 10, color: "#FFD700" }}>PERFECT</span>
            <span style={{ fontSize: 10, color: "#FF4444" }}>BAD</span>
          </div>
        </div>
      </div>

      {/* Hammer button */}
      <div className="w-full px-4 pb-6">
        <motion.button
          className="w-full py-5 rounded-xl text-white"
          style={{
            background: isHammering
              ? "linear-gradient(180deg, #999, #777)"
              : "linear-gradient(180deg, #FF8C00, #E8740C)",
            border: "3px solid " + (isHammering ? "#666" : "#B8560B"),
            boxShadow: isHammering ? "none" : "0 4px 12px rgba(232,116,12,0.4)",
            fontSize: 22,
          }}
          onClick={handleHammer}
          disabled={isHammering || nailIndex >= TOTAL_NAILS}
          whileTap={!isHammering ? { scale: 0.95 } : {}}
        >
          {nailIndex >= TOTAL_NAILS ? "✅ 완료!" : "🔨 망치로 쾅!"}
        </motion.button>
      </div>
    </div>
  );
}
