import { useState } from "react";
import { motion } from "motion/react";
import { WoodpeckerSVG } from "./WoodpeckerSVG";

interface CustomizeScreenProps {
  onComplete: (customization: Customization) => void;
}

export interface Customization {
  bodyColor: string;
  headColor: string;
  beakColor: string;
  wingColor: string;
  eyeStyle: "normal" | "happy" | "star" | "heart";
  pattern: "none" | "dots" | "stripes" | "zigzag";
}

const BODY_COLORS = [
  { color: "#8B4513", name: "원목" },
  { color: "#D2691E", name: "밝은 나무" },
  { color: "#2E5A2E", name: "그린" },
  { color: "#4169E1", name: "블루" },
  { color: "#9370DB", name: "퍼플" },
  { color: "#FF69B4", name: "핑크" },
];

const HEAD_COLORS = [
  { color: "#DC143C", name: "빨강" },
  { color: "#FF8C00", name: "주황" },
  { color: "#FFD700", name: "노랑" },
  { color: "#4CAF50", name: "초록" },
  { color: "#4169E1", name: "파랑" },
  { color: "#9370DB", name: "보라" },
];

const EYE_STYLES: { value: "normal" | "happy" | "star" | "heart"; emoji: string; name: string }[] = [
  { value: "normal", emoji: "👀", name: "기본" },
  { value: "happy", emoji: "😊", name: "행복" },
  { value: "star", emoji: "⭐", name: "별" },
  { value: "heart", emoji: "💖", name: "하트" },
];

const PATTERNS: { value: "none" | "dots" | "stripes" | "zigzag"; emoji: string; name: string }[] = [
  { value: "none", emoji: "⬜", name: "없음" },
  { value: "dots", emoji: "⚪", name: "물방울" },
  { value: "stripes", emoji: "📏", name: "줄무늬" },
  { value: "zigzag", emoji: "⚡", name: "지그재그" },
];

export function CustomizeScreen({ onComplete }: CustomizeScreenProps) {
  const [custom, setCustom] = useState<Customization>({
    bodyColor: "#8B4513",
    headColor: "#DC143C",
    beakColor: "#FFD700",
    wingColor: "#654321",
    eyeStyle: "normal",
    pattern: "none",
  });

  const [tab, setTab] = useState<"color" | "eye" | "pattern">("color");

  const update = (key: keyof Customization, value: string) => {
    setCustom((prev) => ({ ...prev, [key]: value }));
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
      <div className="px-4 pt-4 pb-2 text-center">
        <h2 style={{ fontSize: 20, color: "#5C3317" }}>🎨 꾸미기!</h2>
        <p style={{ fontSize: 13, color: "#8B4513" }}>나만의 딱따구리를 꾸며보세요!</p>
      </div>

      {/* Preview */}
      <div className="flex justify-center py-4">
        <motion.div
          className="p-4 rounded-2xl"
          style={{
            background: "linear-gradient(180deg, #C4A67A, #A0845A)",
            border: "4px solid #8B6914",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <WoodpeckerSVG
            size={100}
            bodyColor={custom.bodyColor}
            headColor={custom.headColor}
            beakColor={custom.beakColor}
            wingColor={custom.wingColor}
            eyeStyle={custom.eyeStyle}
            pattern={custom.pattern}
          />
        </motion.div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2 mx-4 mb-2">
        {[
          { id: "color" as const, label: "🎨 색칠", },
          { id: "eye" as const, label: "👁️ 눈" },
          { id: "pattern" as const, label: "✨ 패턴" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 rounded-lg"
            style={{
              background: tab === t.id ? "#FF8C00" : "#DEB887",
              color: tab === t.id ? "white" : "#5C3317",
              border: tab === t.id ? "2px solid #B8560B" : "2px solid #8B6914",
              fontSize: 13,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Options */}
      <div className="flex-1 mx-4 overflow-y-auto">
        {tab === "color" && (
          <div className="space-y-4">
            <div>
              <p style={{ fontSize: 13, color: "#5C3317", marginBottom: 6 }}>몸통 색상</p>
              <div className="flex gap-2 flex-wrap">
                {BODY_COLORS.map((c) => (
                  <motion.button
                    key={c.color}
                    className="w-12 h-12 rounded-xl"
                    style={{
                      background: c.color,
                      border: custom.bodyColor === c.color ? "3px solid #FFD700" : "2px solid rgba(0,0,0,0.2)",
                      boxShadow: custom.bodyColor === c.color ? "0 0 8px rgba(255,215,0,0.5)" : "none",
                    }}
                    onClick={() => update("bodyColor", c.color)}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 13, color: "#5C3317", marginBottom: 6 }}>머리 색상</p>
              <div className="flex gap-2 flex-wrap">
                {HEAD_COLORS.map((c) => (
                  <motion.button
                    key={c.color}
                    className="w-12 h-12 rounded-xl"
                    style={{
                      background: c.color,
                      border: custom.headColor === c.color ? "3px solid #FFD700" : "2px solid rgba(0,0,0,0.2)",
                      boxShadow: custom.headColor === c.color ? "0 0 8px rgba(255,215,0,0.5)" : "none",
                    }}
                    onClick={() => update("headColor", c.color)}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "eye" && (
          <div className="flex gap-3 flex-wrap justify-center">
            {EYE_STYLES.map((e) => (
              <motion.button
                key={e.value}
                className="w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1"
                style={{
                  background: custom.eyeStyle === e.value ? "#FFD700" : "#FFF8DC",
                  border: custom.eyeStyle === e.value ? "3px solid #FF8C00" : "2px solid #8B6914",
                }}
                onClick={() => update("eyeStyle", e.value)}
                whileTap={{ scale: 0.9 }}
              >
                <span style={{ fontSize: 28 }}>{e.emoji}</span>
                <span style={{ fontSize: 11, color: "#5C3317" }}>{e.name}</span>
              </motion.button>
            ))}
          </div>
        )}

        {tab === "pattern" && (
          <div className="flex gap-3 flex-wrap justify-center">
            {PATTERNS.map((p) => (
              <motion.button
                key={p.value}
                className="w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1"
                style={{
                  background: custom.pattern === p.value ? "#FFD700" : "#FFF8DC",
                  border: custom.pattern === p.value ? "3px solid #FF8C00" : "2px solid #8B6914",
                }}
                onClick={() => update("pattern", p.value)}
                whileTap={{ scale: 0.9 }}
              >
                <span style={{ fontSize: 28 }}>{p.emoji}</span>
                <span style={{ fontSize: 11, color: "#5C3317" }}>{p.name}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Complete button */}
      <div className="px-4 pb-6 pt-3">
        <motion.button
          className="w-full py-4 rounded-xl text-white"
          style={{
            background: "linear-gradient(180deg, #FF8C00, #E8740C)",
            border: "3px solid #B8560B",
            boxShadow: "0 4px 12px rgba(232,116,12,0.4)",
            fontSize: 18,
          }}
          onClick={() => onComplete(custom)}
          whileTap={{ scale: 0.95 }}
        >
          ✅ 완성!
        </motion.button>
      </div>
    </div>
  );
}
