import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WoodpeckerHead } from "./WoodpeckerSVG";

const loadingMessages = [
  "나무를 준비하고 있어요… 🪵",
  "딱따구리를 만들고 있어요… 🐦",
  "망치를 준비하는 중! 🔨",
];

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % loadingMessages.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 400);
          return 100;
        }
        return p + 2;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [onComplete]);

  // Sawdust particles
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 280 + 20,
    delay: Math.random() * 2,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 2 + 2,
  }));

  return (
    <div
      className="size-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #5C3317 0%, #8B6914 40%, #A0522D 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      {/* Sawdust particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: "#DEB887",
            left: p.x,
            top: -10,
          }}
          animate={{
            y: [0, 600],
            x: [0, Math.sin(p.id) * 30],
            opacity: [0.8, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* Scattered parts on workbench */}
      <div className="relative mb-8">
        {/* Workbench surface */}
        <motion.div
          className="w-72 h-40 rounded-xl relative flex items-center justify-center"
          style={{
            background: "linear-gradient(180deg, #DEB887 0%, #D2B48C 50%, #C4A67A 100%)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.2)",
            border: "3px solid #8B6914",
          }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Wood grain lines */}
          <div className="absolute inset-0 overflow-hidden rounded-xl opacity-20">
            {[20, 45, 70, 95, 120].map((y) => (
              <div
                key={y}
                className="absolute w-full h-px"
                style={{ top: y, background: "#8B4513" }}
              />
            ))}
          </div>

          {/* Scattered parts */}
          <motion.div
            className="absolute"
            style={{ top: 20, left: 30 }}
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <svg width="40" height="30" viewBox="0 0 40 30">
              <ellipse cx="20" cy="15" rx="18" ry="12" fill="#8B4513" opacity="0.7" />
              <text x="20" y="18" textAnchor="middle" fill="white" fontSize="8">몸통</text>
            </svg>
          </motion.div>

          <motion.div
            className="absolute"
            style={{ top: 60, right: 40 }}
            animate={{ rotate: [3, -3, 3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <svg width="30" height="30" viewBox="0 0 30 30">
              <circle cx="15" cy="15" r="12" fill="#DC143C" opacity="0.7" />
              <text x="15" y="18" textAnchor="middle" fill="white" fontSize="7">머리</text>
            </svg>
          </motion.div>

          <motion.div
            className="absolute"
            style={{ bottom: 25, left: 60 }}
            animate={{ x: [-3, 3, -3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg width="35" height="15" viewBox="0 0 35 15">
              <polygon points="0,7 35,3 35,12" fill="#FFD700" opacity="0.7" />
            </svg>
          </motion.div>

          {/* Woodpecker head bouncing */}
          <motion.div
            className="absolute"
            style={{ top: -25, right: -15 }}
            animate={{ y: [0, -8, 0], rotate: [0, -10, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
          >
            <WoodpeckerHead size={50} />
          </motion.div>

          {/* Nail */}
          <motion.div
            className="absolute"
            style={{ bottom: 15, right: 55 }}
            animate={{ rotate: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <svg width="8" height="25" viewBox="0 0 8 25">
              <rect x="3" y="0" width="2" height="20" fill="#888" />
              <circle cx="4" cy="0" r="4" fill="#AAA" />
            </svg>
          </motion.div>
        </motion.div>
      </div>

      {/* Logo */}
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h1
          className="text-[#FFF8DC] drop-shadow-lg"
          style={{ fontSize: 28, textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}
        >
          🐦 딱따구리 도어노크
        </h1>
        <p className="text-[#DEB887] mt-1" style={{ fontSize: 14 }}>
          나만의 톡톡 공방
        </p>
      </motion.div>

      {/* Progress bar */}
      <div className="w-64 mb-4">
        <div
          className="w-full h-4 rounded-full overflow-hidden"
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "2px solid #8B6914",
          }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #FFD700, #FF8C00)",
              width: `${progress}%`,
            }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      {/* Loading message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={msgIndex}
          className="text-[#FFF8DC]"
          style={{ fontSize: 15 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {loadingMessages[msgIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
