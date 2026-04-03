import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SplashScreen } from "./components/SplashScreen";
import { TitleScreen } from "./components/TitleScreen";
import { HowToPlay } from "./components/HowToPlay";
import { FindPartsGame } from "./components/FindPartsGame";
import { AssemblyGame } from "./components/AssemblyGame";
import { HammerGame } from "./components/HammerGame";
import { CustomizeScreen, type Customization } from "./components/CustomizeScreen";
import { ResultScreen } from "./components/ResultScreen";
import { RewardScreen } from "./components/RewardScreen";
import { RhythmGame } from "./components/RhythmGame";
import { DEFAULT_WORKSHOP_BGM, startBGM, stopBGM } from "./components/tetris-sounds";
import { WOODPECKER_PARTS } from "./data/woodpeckerParts";
import type { GameScores } from "./utils/score";

type GameStage =
  | "splash"
  | "title"
  | "howto"
  | "workbench"
  | "findParts"
  | "assembly"
  | "hammer"
  | "customize"
  | "rhythm"
  | "result"
  | "reward";
type DifficultyMode = "easy" | "hell";

const STAGE_ORDER: GameStage[] = [
  "findParts",
  "assembly",
  "hammer",
  "customize",
  "rhythm",
];

const DEBUG_STAGE_OPTIONS: Array<{ value: GameStage; label: string }> = [
  { value: "splash", label: "splash" },
  { value: "title", label: "title" },
  { value: "howto", label: "howto" },
  { value: "workbench", label: "workbench" },
  { value: "findParts", label: "findParts" },
  { value: "assembly", label: "assembly" },
  { value: "hammer", label: "hammer" },
  { value: "customize", label: "customize" },
  { value: "rhythm", label: "rhythm" },
  { value: "result", label: "result" },
  { value: "reward", label: "reward" },
];

export default function App() {
  const [stage, setStage] = useState<GameStage>("splash");
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>("hell");
  const [playerAge, setPlayerAge] = useState<number | null>(null);
  const [showAgePrompt, setShowAgePrompt] = useState(false);
  const [ageInput, setAgeInput] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [scores, setScores] = useState<GameScores>({
    findParts: 0,
    assembly: 0,
    hammer: 0,
    rhythm: 0,
  });
  const [customization, setCustomization] = useState<Customization>({
    bodyColor: "#8B4513",
    headColor: "#DC143C",
    beakColor: "#FFD700",
    wingColor: "#654321",
    eyeStyle: "normal",
    pattern: "none",
  });
  const showDevSelector =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("dev") === "1";

  const sanitizeAgeInput = useCallback((value: string) => {
    return value.replace(/\D+/g, "").slice(0, 3);
  }, []);

  const updateScore = useCallback((key: keyof GameScores, value: number) => {
    const safeValue = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    setScores((prev) => ({ ...prev, [key]: safeValue }));
  }, []);

  const handleRestart = useCallback(() => {
    setScores({ findParts: 0, assembly: 0, hammer: 0, rhythm: 0 });
    setCustomization({
      bodyColor: "#8B4513",
      headColor: "#DC143C",
      beakColor: "#FFD700",
      wingColor: "#654321",
      eyeStyle: "normal",
      pattern: "none",
    });
    setStage("title");
  }, []);

  const handleToggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      if (!next) {
        stopBGM();
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const preGameStages: GameStage[] = ["splash", "title", "howto", "workbench", "result", "reward"];
    const shouldPlayPreGameBGM = soundOn && preGameStages.includes(stage);

    if (shouldPlayPreGameBGM) {
      startBGM({ source: DEFAULT_WORKSHOP_BGM, volume: 0.55 });
      return;
    }

    stopBGM();
  }, [soundOn, stage]);

  useEffect(() => {
    const stageToScoreKey: Partial<Record<GameStage, keyof GameScores>> = {
      findParts: "findParts",
      assembly: "assembly",
      hammer: "hammer",
      rhythm: "rhythm",
    };

    const scoreKey = stageToScoreKey[stage];
    if (!scoreKey) return;

    setScores((prev) => (prev[scoreKey] === 0 ? prev : { ...prev, [scoreKey]: 0 }));
  }, [stage]);

  useEffect(() => {
    const setViewportHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${height}px`);
    };

    setViewportHeight();
    window.addEventListener("resize", setViewportHeight);
    window.visualViewport?.addEventListener("resize", setViewportHeight);

    return () => {
      window.removeEventListener("resize", setViewportHeight);
      window.visualViewport?.removeEventListener("resize", setViewportHeight);
    };
  }, []);

  const renderStage = () => {
    switch (stage) {
      case "splash":
        return <SplashScreen onComplete={() => setStage("title")} />;

      case "title":
        return (
          <TitleScreen
            onStart={() => {
              setAgeInput(playerAge ? String(playerAge) : "");
              setShowAgePrompt(true);
            }}
            onHowTo={() => setStage("howto")}
            soundOn={soundOn}
            onToggleSound={handleToggleSound}
          />
        );

      case "howto":
        return <HowToPlay onBack={() => setStage("title")} />;

      case "workbench":
        return <WorkbenchScreen onStart={() => setStage("findParts")} />;

      case "findParts":
        return (
          <FindPartsGame
            soundOn={soundOn}
            difficultyMode={difficultyMode}
            onComplete={(score) => {
              updateScore("findParts", score);
              setStage("assembly");
            }}
          />
        );

      case "assembly":
        return (
          <AssemblyGame
            onComplete={(score) => {
              updateScore("assembly", score);
              setStage("hammer");
            }}
          />
        );

      case "hammer":
        return (
          <HammerGame
            onComplete={(score) => {
              updateScore("hammer", score);
              setStage("customize");
            }}
          />
        );

      case "customize":
        return (
          <CustomizeScreen
            soundOn={soundOn}
            onComplete={(custom) => {
              setCustomization(custom);
              setStage("rhythm");
            }}
          />
        );

      case "rhythm":
        return (
          <RhythmGame
            onComplete={(score) => {
              updateScore("rhythm", score);
              setStage("result");
            }}
          />
        );

      case "result":
        return (
          <ResultScreen
            scores={scores}
            onNext={() => setStage("reward")}
            onRetry={handleRestart}
          />
        );

      case "reward":
        return <RewardScreen scores={scores} onRestart={handleRestart} />;

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "var(--app-vh, 100dvh)",
        height: "var(--app-vh, 100dvh)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#2C1810",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      {/* Mobile frame */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 430,
          height: "var(--app-vh, 100dvh)",
          maxHeight: 900,
          overflow: "hidden",
          background: "#FFF8DC",
          boxShadow: "0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {showDevSelector && (
          <div
            style={{
              position: "absolute",
              top: "calc(8px + env(safe-area-inset-top))",
              right: 8,
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 8px",
              borderRadius: 10,
              background: "rgba(32,20,12,0.85)",
              border: "1px solid rgba(255,248,220,0.4)",
            }}
          >
            <span style={{ fontSize: 10, color: "#FFF8DC" }}>DEV</span>
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value as GameStage)}
              style={{
                fontSize: 11,
                padding: "4px 6px",
                borderRadius: 6,
                border: "1px solid rgba(255,248,220,0.5)",
                background: "#FFF8DC",
                color: "#4A2A14",
              }}
            >
              {DEBUG_STAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {showAgePrompt && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1400,
              background: "rgba(23,13,8,0.58)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 340,
                borderRadius: 20,
                background: "linear-gradient(180deg, #FFF8DC, #F3DFC0)",
                border: "3px solid #8B6914",
                boxShadow: "0 14px 32px rgba(0,0,0,0.28)",
                padding: 18,
              }}
            >
              <h3 style={{ fontSize: 22, color: "#5C3317", textAlign: "center" }}>나이 입력</h3>
              <p style={{ fontSize: 13, color: "#7A4A25", marginTop: 6, textAlign: "center", lineHeight: 1.55 }}>
                나이를 입력하고 시작 버튼을 눌러주세요.
              </p>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min={1}
                max={120}
                value={ageInput}
                onChange={(event) => setAgeInput(sanitizeAgeInput(event.target.value))}
                onPaste={(event) => {
                  event.preventDefault();
                  const pasted = event.clipboardData.getData("text");
                  setAgeInput(sanitizeAgeInput(pasted));
                }}
                placeholder="나이를 입력하세요"
                style={{
                  width: "100%",
                  marginTop: 14,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "2px solid #C9A473",
                  background: "#FFFDF6",
                  color: "#4A2A14",
                  fontSize: 16,
                  outline: "none",
                }}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  onClick={() => setShowAgePrompt(false)}
                  style={{
                    flex: 1,
                    padding: "11px 10px",
                    borderRadius: 12,
                    border: "2px solid #B5894B",
                    background: "#EFD8B1",
                    color: "#5C3317",
                    fontSize: 14,
                  }}
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    if (!ageInput.trim()) return;
                    const parsedAge = Number(ageInput);
                    const safeAge = Number.isFinite(parsedAge)
                      ? Math.min(120, Math.max(1, Math.round(parsedAge)))
                      : NaN;
                    if (!Number.isFinite(safeAge)) return;

                    setPlayerAge(safeAge);
                    setDifficultyMode(safeAge <= 15 ? "easy" : "hell");
                    setShowAgePrompt(false);
                    setStage("workbench");
                  }}
                  style={{
                    flex: 1,
                    padding: "11px 10px",
                    borderRadius: 12,
                    border: "2px solid #B8560B",
                    background: "linear-gradient(180deg, #FF8C00, #E8740C)",
                    color: "#fff",
                    fontSize: 14,
                  }}
                >
                  시작
                </button>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            style={{
              position: "absolute",
              inset: 0,
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStage()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Workbench intro screen
function WorkbenchScreen({ onStart }: { onStart: () => void }) {
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
        <h2 style={{ fontSize: 22, color: "#5C3317" }}>🪵 작업대</h2>
        <p style={{ fontSize: 14, color: "#8B4513" }}>도어노커에 들어갈 진짜 부품을 확인해요.</p>
      </div>

      {/* Parts summary */}
      <div className="mx-4 mb-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,248,220,0.78)", border: "2px solid #C69C5D" }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 12, color: "#8B4513" }}>준비된 부품</span>
          <span style={{ fontSize: 12, color: "#5C3317" }}>{WOODPECKER_PARTS.length}개</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {WOODPECKER_PARTS.map((part) => (
            <span
              key={part.partId}
              className="px-2 py-1 rounded-lg"
              style={{ background: "#E9D3AB", fontSize: 11, color: "#5C3317" }}
            >
              {part.name}
            </span>
          ))}
        </div>
      </div>

      {/* Workbench */}
      <div
        className="flex-1 mx-4 mb-2 relative rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #C4A67A, #B8956A, #A0845A)",
          border: "4px solid #8B6914",
          boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)",
        }}
      >
        {/* Wood grain */}
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="absolute w-full"
              style={{ top: `${i * 10}%`, height: 1, background: "#5C3317" }}
            />
          ))}
        </div>

        {/* Scattered parts */}
        {WOODPECKER_PARTS.map((part, i) => (
          <motion.div
            key={part.partId}
            className="absolute flex flex-col items-center"
            style={{
              left: `${part.bench.x}%`,
              top: `${part.bench.y}%`,
              transform: `rotate(${part.bench.rotation}deg)`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.15, type: "spring" }}
          >
            <motion.img
              src={part.image}
              alt={part.name}
              style={{
                width: Math.round(part.bench.width * 0.72),
                height: "auto",
                filter: "drop-shadow(0 8px 12px rgba(92,51,23,0.18))",
                pointerEvents: "none",
              }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
            />
            <span
              className="px-2 py-0.5 rounded mt-1"
              style={{
                background: "rgba(255,248,220,0.9)",
                fontSize: 10,
                color: "#5C3317",
              }}
            >
              {part.name}
            </span>
          </motion.div>
        ))}

        {/* Central guide */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div
            className="px-4 py-2 rounded-xl"
            style={{ background: "rgba(255,248,220,0.8)", border: "2px dashed #8B6914" }}
          >
            <span style={{ fontSize: 13, color: "#5C3317" }}>이 6개 부품을 기억한 뒤 다음 단계에서 찾아보세요.</span>
          </div>
        </motion.div>
      </div>

      {/* Quiz card */}
      <motion.div
        className="mx-4 mb-2 p-3 rounded-xl"
        style={{
          background: "linear-gradient(135deg, #E8F5E9, #C8E6C9)",
          border: "2px solid #4CAF50",
        }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p style={{ fontSize: 12, color: "#2E5A2E" }}>
          🧠 <strong>기억할 부품</strong> 머리, 몸통, 부리, 왼쪽 날개, 오른쪽 날개, 다리 순서로 살펴보고 다음 게임에서 같은 조각을 찾아주세요.
        </p>
      </motion.div>

      {/* Buttons */}
      <div className="px-4 pb-4 flex gap-3">
        <motion.button
          className="flex-1 py-4 rounded-xl text-white"
          style={{
            background: "linear-gradient(180deg, #FF8C00, #E8740C)",
            border: "3px solid #B8560B",
            boxShadow: "0 4px 12px rgba(232,116,12,0.4)",
            fontSize: 18,
          }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
        >
          🔨 만들기 시작!
        </motion.button>
      </div>
    </div>
  );
}
