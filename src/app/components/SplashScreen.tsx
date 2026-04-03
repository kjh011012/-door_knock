import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import landingImage from "../../assets/woodpecker/landing-woodpecker.png";

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

  return (
    <div
      className="size-full relative overflow-hidden"
      style={{
        background: "#1F130B",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.55 }}
      >
        <img
          src={landingImage}
          alt="딱따구리 톡톡 공방 랜딩"
          className="size-full"
          style={{ objectFit: "contain" }}
          draggable={false}
        />
      </motion.div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.08) 55%, rgba(0,0,0,0.62) 100%)",
        }}
      />

      <div className="absolute left-0 right-0 bottom-0 px-6 pb-10">
        <div
          className="w-full h-4 rounded-full overflow-hidden"
          style={{
            background: "rgba(0,0,0,0.36)",
            border: "2px solid rgba(255,248,220,0.55)",
            boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
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

        <AnimatePresence mode="wait">
          <motion.p
            key={msgIndex}
            className="text-[#FFF8DC] mt-3 text-center"
            style={{ fontSize: 15 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {loadingMessages[msgIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
