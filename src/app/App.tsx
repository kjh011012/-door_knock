import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SplashScreen } from "./components/SplashScreen";
import { TitleScreen } from "./components/TitleScreen";
import { HowToPlay } from "./components/HowToPlay";
import { FindPartsGame } from "./components/FindPartsGame";
import { AssemblyGame } from "./components/AssemblyGame";
import { HammerGame } from "./components/HammerGame";
import { BalanceGame } from "./components/BalanceGame";
import { OperationTest } from "./components/OperationTest";
import { CustomizeScreen, type Customization } from "./components/CustomizeScreen";
import { ResultScreen } from "./components/ResultScreen";
import { RewardScreen } from "./components/RewardScreen";
import { RhythmGame } from "./components/RhythmGame";

type GameStage =
  | "splash"
  | "title"
  | "howto"
  | "workbench"
  | "findParts"
  | "assembly"
  | "hammer"
  | "balance"
  | "operation"
  | "customize"
  | "rhythm"
  | "result"
  | "reward";

const STAGE_ORDER: GameStage[] = [
  "findParts",
  "assembly",
  "hammer",
  "balance",
  "operation",
  "customize",
];

interface Scores {
  findParts: number;
  assembly: number;
  hammer: number;
  balance: number;
  operation: number;
  rhythm: number;
}

export default function App() {
  const [stage, setStage] = useState<GameStage>("splash");
  const [soundOn, setSoundOn] = useState(true);
  const [scores, setScores] = useState<Scores>({
    findParts: 0,
    assembly: 0,
    hammer: 0,
    balance: 0,
    operation: 0,
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

  const updateScore = useCallback((key: keyof Scores, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  }, []);

  const goToNextStage = useCallback(() => {
    const currentIndex = STAGE_ORDER.indexOf(stage);
    if (currentIndex >= 0 && currentIndex < STAGE_ORDER.length - 1) {
      setStage(STAGE_ORDER[currentIndex + 1]);
    }
  }, [stage]);

  const handleRestart = useCallback(() => {
    setScores({ findParts: 0, assembly: 0, hammer: 0, balance: 0, operation: 0, rhythm: 0 });
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

  const totalScore = Math.round(
    (scores.findParts + scores.assembly + scores.hammer + scores.balance + scores.operation + scores.rhythm) / 6
  );

  const renderStage = () => {
    switch (stage) {
      case "splash":
        return <SplashScreen onComplete={() => setStage("title")} />;

      case "title":
        return (
          <TitleScreen
            onStart={() => setStage("workbench")}
            onHowTo={() => setStage("howto")}
            soundOn={soundOn}
            onToggleSound={() => setSoundOn(!soundOn)}
          />
        );

      case "howto":
        return <HowToPlay onBack={() => setStage("title")} />;

      case "workbench":
        return <WorkbenchScreen onStart={() => setStage("findParts")} />;

      case "findParts":
        return (
          <FindPartsGame
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
              setStage("balance");
            }}
          />
        );

      case "balance":
        return (
          <BalanceGame
            onComplete={(score) => {
              updateScore("balance", score);
              setStage("operation");
            }}
          />
        );

      case "operation":
        return (
          <OperationTest
            onComplete={(score) => {
              updateScore("operation", score);
              setStage("customize");
            }}
            balanceScore={scores.balance}
            hammerScore={scores.hammer}
          />
        );

      case "customize":
        return (
          <CustomizeScreen
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
            customization={customization}
          />
        );

      case "result":
        return (
          <ResultScreen
            scores={scores}
            customization={customization}
            onNext={() => setStage("reward")}
          />
        );

      case "reward":
        return <RewardScreen totalScore={totalScore} onRestart={handleRestart} />;

      default:
        return null;
    }
  };

  return (
    <div
      className="size-full flex items-center justify-center"
      style={{ background: "#2C1810", fontFamily: "'Jua', sans-serif" }}
    >
      {/* Mobile frame */}
      <div
        className="relative w-full max-w-md h-full max-h-[900px] overflow-hidden"
        style={{
          boxShadow: "0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            className="absolute inset-0"
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
  const parts = [
    { emoji: "🪵", name: "몸통", x: 20, y: 25, rot: -10 },
    { emoji: "🔴", name: "머리", x: 65, y: 20, rot: 15 },
    { emoji: "📐", name: "부리", x: 40, y: 55, rot: -5 },
    { emoji: "🍂", name: "날개", x: 70, y: 60, rot: 20 },
    { emoji: "🔩", name: "스프링", x: 25, y: 70, rot: 0 },
    { emoji: "🔨", name: "망치", x: 55, y: 40, rot: -15 },
  ];

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
        <p style={{ fontSize: 14, color: "#8B4513" }}>부품들이 흩어져 있어요!</p>
      </div>

      {/* Progress bar */}
      <div className="mx-4 mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span style={{ fontSize: 11, color: "#8B4513" }}>진행률</span>
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.1)", border: "1px solid #8B6914" }}>
            <div className="h-full w-0 rounded-full" style={{ background: "linear-gradient(90deg, #FF8C00, #FFD700)" }} />
          </div>
          <span style={{ fontSize: 11, color: "#8B4513" }}>0%</span>
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
        {parts.map((part, i) => (
          <motion.div
            key={part.name}
            className="absolute flex flex-col items-center"
            style={{
              left: `${part.x}%`,
              top: `${part.y}%`,
              transform: `rotate(${part.rot}deg)`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.15, type: "spring" }}
          >
            <motion.span
              style={{ fontSize: 36 }}
              animate={{ y: [0, -5, 0], rotate: [part.rot, part.rot + 5, part.rot] }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
            >
              {part.emoji}
            </motion.span>
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
            <span style={{ fontSize: 13, color: "#5C3317" }}>이 부품들로 딱따구리를 만들어요!</span>
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
          🧠 <strong>알고 있나요?</strong> 딱따구리는 하루에 약 12,000번 나무를 두드려요! 우리도 딱따구리처럼 톡톡 두드리는 도어노크를 만들어봐요!
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