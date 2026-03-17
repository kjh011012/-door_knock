import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { WoodpeckerSVG } from "./WoodpeckerSVG";
import { Volume2, VolumeX } from "lucide-react";

interface TitleScreenProps {
  onStart: () => void;
  onHowTo: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
}

export function TitleScreen({ onStart, onHowTo, soundOn, onToggleSound }: TitleScreenProps) {
  const [knock, setKnock] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setKnock(true);
      setTimeout(() => setKnock(false), 200);
      setTimeout(() => {
        setKnock(true);
        setTimeout(() => setKnock(false), 200);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="size-full flex flex-col items-center justify-between relative overflow-hidden py-8 px-4"
      style={{
        background: "linear-gradient(180deg, #FFF8DC 0%, #F5DEB3 40%, #DEB887 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      {/* Window with light */}
      <div className="absolute top-4 right-4 w-20 h-20">
        <div
          className="w-full h-full rounded-lg"
          style={{
            background: "linear-gradient(135deg, #87CEEB 0%, #B0E0E6 100%)",
            border: "4px solid #8B6914",
            boxShadow: "inset 0 0 20px rgba(255,255,200,0.5)",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-px h-full" style={{ background: "#8B6914" }} />
            <div className="absolute w-full h-px" style={{ background: "#8B6914" }} />
          </div>
        </div>
        {/* Warm light rays */}
        <motion.div
          className="absolute -bottom-4 -left-4 w-28 h-28 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,200,50,0.15) 0%, transparent 70%)" }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      {/* Sound toggle */}
      <button
        onClick={onToggleSound}
        className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(180deg, #DEB887, #C4A67A)",
          border: "2px solid #8B6914",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {soundOn ? (
          <Volume2 size={18} color="#5C3317" />
        ) : (
          <VolumeX size={18} color="#5C3317" />
        )}
      </button>

      {/* Title */}
      <motion.div
        className="text-center mt-8 z-10"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, type: "spring" }}
      >
        <h1 style={{ fontSize: 32, color: "#5C3317", textShadow: "1px 1px 2px rgba(0,0,0,0.15)" }}>
          딱따구리
        </h1>
        <h2 style={{ fontSize: 24, color: "#8B4513" }}>도어노크 만들기</h2>
        <motion.p
          className="mt-2"
          style={{ fontSize: 14, color: "#A0522D" }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ✨ 나만의 톡톡 공방 ✨
        </motion.p>
      </motion.div>

      {/* Door with woodpecker */}
      <motion.div
        className="relative flex-1 flex items-center justify-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {/* Door */}
        <div
          className="relative w-48 h-64 rounded-t-xl"
          style={{
            background: "linear-gradient(180deg, #A0522D 0%, #8B4513 100%)",
            border: "4px solid #654321",
            boxShadow: "4px 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          {/* Door panels */}
          <div
            className="absolute top-4 left-4 right-4 h-24 rounded"
            style={{ border: "2px solid #654321", opacity: 0.5 }}
          />
          <div
            className="absolute bottom-4 left-4 right-4 h-24 rounded"
            style={{ border: "2px solid #654321", opacity: 0.5 }}
          />
          {/* Door handle */}
          <div
            className="absolute right-4 top-1/2 w-4 h-8 rounded-full"
            style={{ background: "#DAA520", border: "1px solid #B8860B", transform: "translateY(-50%)" }}
          />

          {/* Woodpecker on door */}
          <motion.div
            className="absolute -top-16 left-1/2"
            style={{ transform: "translateX(-50%)" }}
            animate={knock ? { rotate: [0, -15, 0] } : {}}
            transition={{ duration: 0.15 }}
          >
            <WoodpeckerSVG size={70} />
          </motion.div>

          {/* Knock effect */}
          {knock && (
            <motion.div
              className="absolute top-8 left-1/2 -translate-x-1/2"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span style={{ fontSize: 20 }}>💥</span>
            </motion.div>
          )}

          {/* "톡톡" text */}
          <motion.div
            className="absolute -right-14 top-4"
            animate={knock ? { scale: [0, 1.2, 1], opacity: [0, 1, 0] } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span
              className="px-2 py-1 rounded-lg"
              style={{
                background: "#FFD700",
                color: "#5C3317",
                fontSize: 14,
                fontFamily: "'Jua', sans-serif",
              }}
            >
              톡톡!
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs z-10">
        <motion.button
          onClick={onStart}
          className="w-full py-4 rounded-xl text-white"
          style={{
            background: "linear-gradient(180deg, #FF8C00, #E8740C)",
            border: "3px solid #B8560B",
            boxShadow: "0 4px 12px rgba(232,116,12,0.4), inset 0 1px 0 rgba(255,255,255,0.3)",
            fontSize: 20,
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          🔨 시작하기!
        </motion.button>

        <motion.button
          onClick={onHowTo}
          className="w-full py-3 rounded-xl"
          style={{
            background: "linear-gradient(180deg, #DEB887, #C4A67A)",
            border: "3px solid #8B6914",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)",
            color: "#5C3317",
            fontSize: 16,
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          📖 만드는 방법 보기
        </motion.button>
      </div>
    </div>
  );
}
