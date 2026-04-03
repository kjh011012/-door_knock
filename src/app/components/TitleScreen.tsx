import { motion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { WoodpeckerSpriteAnimation } from "./WoodpeckerSpriteAnimation";
import workshopBackground from "../../assets/woodpecker/workshop-background.png";
import titleImage from "../../assets/woodpecker/main_top.png";

interface TitleScreenProps {
  onStart: () => void;
  onHowTo: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
}

export function TitleScreen({ onStart, onHowTo, soundOn, onToggleSound }: TitleScreenProps) {
  return (
    <div
      className="size-full flex flex-col items-center justify-between relative overflow-y-auto overflow-x-hidden px-4"
      style={{
        background: "linear-gradient(180deg, #F9E7C4 0%, #F5D9A6 100%)",
        fontFamily: "'Jua', sans-serif",
        paddingTop: "clamp(8px, 2.2vh, 28px)",
        paddingBottom: "clamp(10px, 2.4vh, 30px)",
        rowGap: "clamp(8px, 1.8vh, 18px)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${workshopBackground})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          backgroundPosition: "center top",
          opacity: 0.95,
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,248,220,0.34) 0%, rgba(255,248,220,0.18) 30%, rgba(255,248,220,0.28) 100%)",
        }}
      />

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
        className="text-center z-10"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, type: "spring" }}
      >
        <img
          src={titleImage}
          alt="공방의 딱따구리 나만의 도어노크 만들기"
          style={{
            width: "min(92vw, 360px)",
            height: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0 8px 16px rgba(255,248,220,0.35))",
          }}
          draggable={false}
        />
        <motion.div
          className="mx-auto mt-2"
          style={{
            width: 72,
            height: 4,
            borderRadius: 999,
            background: "linear-gradient(90deg, rgba(192,122,24,0) 0%, rgba(192,122,24,0.8) 50%, rgba(192,122,24,0) 100%)",
          }}
          animate={{ opacity: [0.35, 0.8, 0.35], scaleX: [0.92, 1, 0.92] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
        </motion.div>
      </motion.div>

      {/* Sprite animation area */}
      <motion.div
        className="relative flex items-center justify-center w-full shrink-0"
        style={{ height: "clamp(106px, 19vh, 168px)" }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <WoodpeckerSpriteAnimation compact />
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
