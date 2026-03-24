import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Customization } from "./CustomizeScreen";
import { WoodpeckerSVG } from "./WoodpeckerSVG";

interface RhythmGameProps {
  onComplete: (score: number) => void;
  customization: Customization;
}

interface Note {
  id: number;
  lane: number; // 0=left, 1=center, 2=right
  time: number; // ms from start
  hit: boolean;
  missed: boolean;
}

type HitJudge = "PERFECT" | "GREAT" | "GOOD" | "MISS";

interface HitEffect {
  id: number;
  lane: number;
  judge: HitJudge;
  time: number;
}

// BPM 140 신나는 곡 - 음표 패턴 생성
function generateSongNotes(): Note[] {
  const bpm = 140;
  const beatMs = 60000 / bpm;
  const notes: Note[] = [];
  let id = 0;

  // 패턴 정의 (lane: 0=좌, 1=중, 2=우)
  // 인트로 (4비트 쉬운 패턴)
  const intro = [
    { beat: 0, lane: 1 },
    { beat: 2, lane: 1 },
    { beat: 4, lane: 0 },
    { beat: 6, lane: 2 },
  ];

  // 벌스 1 (좀 더 빠른 패턴)
  const verse1 = [
    { beat: 8, lane: 1 },
    { beat: 9, lane: 0 },
    { beat: 10, lane: 2 },
    { beat: 11, lane: 1 },
    { beat: 12, lane: 0 },
    { beat: 13, lane: 2 },
    { beat: 14, lane: 1 },
    { beat: 15, lane: 1 },
  ];

  // 코러스 (동��� + 빠른 패턴)
  const chorus = [
    { beat: 16, lane: 0 },
    { beat: 16, lane: 2 },
    { beat: 17, lane: 1 },
    { beat: 18, lane: 0 },
    { beat: 18.5, lane: 2 },
    { beat: 19, lane: 1 },
    { beat: 20, lane: 0 },
    { beat: 20, lane: 2 },
    { beat: 21, lane: 1 },
    { beat: 22, lane: 0 },
    { beat: 22.5, lane: 1 },
    { beat: 23, lane: 2 },
  ];

  // 벌스 2
  const verse2 = [
    { beat: 24, lane: 1 },
    { beat: 25, lane: 2 },
    { beat: 25.5, lane: 0 },
    { beat: 26, lane: 1 },
    { beat: 27, lane: 0 },
    { beat: 27.5, lane: 2 },
    { beat: 28, lane: 1 },
    { beat: 29, lane: 0 },
    { beat: 29.5, lane: 1 },
    { beat: 30, lane: 2 },
    { beat: 31, lane: 1 },
  ];

  // 클라이맥스
  const climax = [
    { beat: 32, lane: 0 },
    { beat: 32, lane: 1 },
    { beat: 32, lane: 2 },
    { beat: 33, lane: 1 },
    { beat: 34, lane: 0 },
    { beat: 34.5, lane: 2 },
    { beat: 35, lane: 1 },
    { beat: 35.5, lane: 0 },
    { beat: 36, lane: 2 },
    { beat: 36.5, lane: 1 },
    { beat: 37, lane: 0 },
    { beat: 37, lane: 2 },
    { beat: 38, lane: 1 },
    { beat: 39, lane: 0 },
    { beat: 39, lane: 1 },
    { beat: 39, lane: 2 },
  ];

  // 피날레
  const finale = [
    { beat: 40, lane: 1 },
    { beat: 41, lane: 0 },
    { beat: 41, lane: 2 },
    { beat: 42, lane: 1 },
    { beat: 44, lane: 0 },
    { beat: 44, lane: 1 },
    { beat: 44, lane: 2 },
  ];

  const allBeats = [...intro, ...verse1, ...chorus, ...verse2, ...climax, ...finale];

  for (const beat of allBeats) {
    notes.push({
      id: id++,
      lane: beat.lane,
      time: beat.beat * beatMs + 3000, // 3s offset for startup
      hit: false,
      missed: false,
    });
  }

  return notes;
}

// Web Audio API로 신나는 비트 생성
function createAudioContext() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function playBeat(ctx: AudioContext, time: number, freq: number, type: OscillatorType = "square", duration = 0.08) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.15, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + duration);
}

function playKick(ctx: AudioContext, time: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);
  gain.gain.setValueAtTime(0.4, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.2);
}

function playHiHat(ctx: AudioContext, time: number) {
  const bufferSize = ctx.sampleRate * 0.05;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7000;
  gain.gain.setValueAtTime(0.12, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(time);
}

function scheduleMusic(ctx: AudioContext) {
  const bpm = 140;
  const beatDuration = 60 / bpm;
  const totalBeats = 48;
  const startTime = ctx.currentTime + 3; // 3s offset

  // 멜로디 (신나는 동요풍)
  const melodyNotes = [
    // 인트로 - "톡톡톡" 느낌
    { beat: 0, freq: 523.25 }, { beat: 0.5, freq: 587.33 },
    { beat: 1, freq: 659.25 }, { beat: 2, freq: 783.99 },
    { beat: 3, freq: 659.25 }, { beat: 4, freq: 523.25 },
    { beat: 5, freq: 587.33 }, { beat: 6, freq: 659.25 },
    { beat: 7, freq: 523.25 },
    // 벌스
    { beat: 8, freq: 783.99 }, { beat: 9, freq: 698.46 },
    { beat: 10, freq: 659.25 }, { beat: 11, freq: 587.33 },
    { beat: 12, freq: 523.25 }, { beat: 13, freq: 587.33 },
    { beat: 14, freq: 659.25 }, { beat: 15, freq: 783.99 },
    // 코러스 - 더 신나게
    { beat: 16, freq: 1046.5 }, { beat: 16.5, freq: 987.77 },
    { beat: 17, freq: 880 }, { beat: 18, freq: 783.99 },
    { beat: 18.5, freq: 880 }, { beat: 19, freq: 987.77 },
    { beat: 20, freq: 1046.5 }, { beat: 21, freq: 880 },
    { beat: 22, freq: 783.99 }, { beat: 23, freq: 659.25 },
    // 벌스 2
    { beat: 24, freq: 523.25 }, { beat: 25, freq: 659.25 },
    { beat: 26, freq: 783.99 }, { beat: 27, freq: 880 },
    { beat: 28, freq: 783.99 }, { beat: 29, freq: 659.25 },
    { beat: 30, freq: 587.33 }, { beat: 31, freq: 523.25 },
    // 클라이맥스
    { beat: 32, freq: 1046.5 }, { beat: 33, freq: 987.77 },
    { beat: 34, freq: 1174.66 }, { beat: 35, freq: 1046.5 },
    { beat: 36, freq: 987.77 }, { beat: 37, freq: 880 },
    { beat: 38, freq: 1046.5 }, { beat: 39, freq: 1174.66 },
    // 피날레
    { beat: 40, freq: 1318.51 }, { beat: 41, freq: 1174.66 },
    { beat: 42, freq: 1046.5 }, { beat: 43, freq: 1174.66 },
    { beat: 44, freq: 1318.51 },
  ];

  // 드럼 패턴
  for (let beat = 0; beat < totalBeats; beat++) {
    const time = startTime + beat * beatDuration;
    // 킥드럼: 매 비트
    if (beat % 2 === 0) playKick(ctx, time);
    // 하이햇: 매 반비트
    playHiHat(ctx, time);
    playHiHat(ctx, time + beatDuration * 0.5);
    // 스네어 (노이즈)
    if (beat % 2 === 1) {
      const bufSize = ctx.sampleRate * 0.1;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 3000;
      g.gain.setValueAtTime(0.15, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      src.connect(f);
      f.connect(g);
      g.connect(ctx.destination);
      src.start(time);
    }
  }

  // 멜로디
  for (const note of melodyNotes) {
    const time = startTime + note.beat * beatDuration;
    playBeat(ctx, time, note.freq, "triangle", 0.2);
    // 하모니
    playBeat(ctx, time, note.freq * 1.5, "sine", 0.15);
  }

  // 베이스라인
  const bassNotes = [523.25, 392, 440, 349.23];
  for (let beat = 0; beat < totalBeats; beat += 4) {
    const time = startTime + beat * beatDuration;
    const freq = bassNotes[(beat / 4) % bassNotes.length] / 2;
    playBeat(ctx, time, freq, "sawtooth", beatDuration * 3.5);
  }
}

function playHitSound(ctx: AudioContext, judge: HitJudge) {
  const now = ctx.currentTime;
  if (judge === "PERFECT") {
    playBeat(ctx, now, 1200, "sine", 0.1);
    playBeat(ctx, now + 0.05, 1500, "sine", 0.1);
  } else if (judge === "GREAT") {
    playBeat(ctx, now, 1000, "sine", 0.08);
  } else if (judge === "GOOD") {
    playBeat(ctx, now, 800, "sine", 0.06);
  } else {
    playBeat(ctx, now, 200, "sawtooth", 0.15);
  }
}

const LANE_COLORS = ["#FF6B6B", "#FFD700", "#6BCB77"];
const LANE_EMOJIS = ["🔴", "⭐", "🟢"];
const JUDGE_COLORS: Record<HitJudge, string> = {
  PERFECT: "#FFD700",
  GREAT: "#4CAF50",
  GOOD: "#2196F3",
  MISS: "#FF4444",
};
const JUDGE_SCORES: Record<HitJudge, number> = {
  PERFECT: 100,
  GREAT: 70,
  GOOD: 40,
  MISS: 0,
};

const TOTAL_SONG_MS = 48 * (60000 / 140) + 3000 + 2000;
const HIT_WINDOW = { PERFECT: 50, GREAT: 100, GOOD: 160 };
const NOTE_TRAVEL_MS = 2000; // How long notes take to fall

export function RhythmGame({ onComplete, customization }: RhythmGameProps) {
  const [phase, setPhase] = useState<"intro" | "playing" | "results">("intro");
  const [notes, setNotes] = useState<Note[]>([]);
  const [effects, setEffects] = useState<HitEffect[]>([]);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [judgeStats, setJudgeStats] = useState({ PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 });
  const [progress, setProgress] = useState(0);
  const [isKnocking, setIsKnocking] = useState(false);
  const [knockLane, setKnockLane] = useState(-1);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef(0);
  const animFrameRef = useRef<number>();
  const notesRef = useRef<Note[]>([]);
  const effectIdRef = useRef(0);
  const scoreRef = useRef(0);

  const startGame = useCallback(() => {
    const ctx = createAudioContext();
    audioCtxRef.current = ctx;
    const songNotes = generateSongNotes();
    setNotes(songNotes);
    notesRef.current = songNotes;

    scheduleMusic(ctx);
    startTimeRef.current = performance.now();
    setPhase("playing");

    // Game loop
    const gameLoop = () => {
      const elapsed = performance.now() - startTimeRef.current;
      setProgress(Math.min(100, (elapsed / TOTAL_SONG_MS) * 100));

      // Check for missed notes
      const updatedNotes = notesRef.current.map((n) => {
        if (!n.hit && !n.missed && elapsed > n.time + HIT_WINDOW.GOOD) {
          return { ...n, missed: true };
        }
        return n;
      });

      // Count new misses
      const newMisses = updatedNotes.filter(
        (n, i) => n.missed && !notesRef.current[i].missed
      );
      if (newMisses.length > 0) {
        setCombo(0);
        setJudgeStats((prev) => ({ ...prev, MISS: prev.MISS + newMisses.length }));
      }

      notesRef.current = updatedNotes;
      setNotes([...updatedNotes]);

      if (elapsed < TOTAL_SONG_MS) {
        animFrameRef.current = requestAnimationFrame(gameLoop);
      } else {
        // Song ended
        setTimeout(() => {
          setPhase("results");
          const totalNotes = notesRef.current.length;
          const hitNotes = notesRef.current.filter((n) => n.hit).length;
          const finalScore = totalNotes > 0 ? Math.min(100, Math.round((hitNotes / totalNotes) * 100)) : 0;
          setTimeout(() => onComplete(Math.max(10, finalScore)), 2500);
        }, 1000);
      }
    };
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [onComplete, score]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const handleLaneTap = useCallback(
    (lane: number) => {
      if (phase !== "playing") return;

      const elapsed = performance.now() - startTimeRef.current;
      setIsKnocking(true);
      setKnockLane(lane);
      setTimeout(() => setIsKnocking(false), 150);

      // Find closest unhit note in this lane
      let bestNote: Note | null = null;
      let bestDiff = Infinity;

      for (const note of notesRef.current) {
        if (note.lane !== lane || note.hit || note.missed) continue;
        const diff = Math.abs(elapsed - note.time);
        if (diff < bestDiff && diff < HIT_WINDOW.GOOD) {
          bestDiff = diff;
          bestNote = note;
        }
      }

      if (bestNote) {
        let judge: HitJudge;
        if (bestDiff <= HIT_WINDOW.PERFECT) judge = "PERFECT";
        else if (bestDiff <= HIT_WINDOW.GREAT) judge = "GREAT";
        else judge = "GOOD";

        const noteScore = JUDGE_SCORES[judge] * (1 + combo * 0.05);

        // Update note
        notesRef.current = notesRef.current.map((n) =>
          n.id === bestNote!.id ? { ...n, hit: true } : n
        );
        setNotes([...notesRef.current]);

        setScore((s) => {
          const newScore = s + Math.round(noteScore);
          scoreRef.current = newScore;
          return newScore;
        });
        setCombo((c) => {
          const newCombo = c + 1;
          setMaxCombo((m) => Math.max(m, newCombo));
          return newCombo;
        });
        setJudgeStats((prev) => ({ ...prev, [judge]: prev[judge] + 1 }));

        // Hit effect
        const effectId = effectIdRef.current++;
        setEffects((prev) => [...prev, { id: effectId, lane, judge, time: Date.now() }]);
        setTimeout(() => {
          setEffects((prev) => prev.filter((e) => e.id !== effectId));
        }, 600);

        // Play hit sound
        if (audioCtxRef.current) {
          playHitSound(audioCtxRef.current, judge);
        }
      }
    },
    [phase, combo]
  );

  const elapsed = phase === "playing" ? performance.now() - startTimeRef.current : 0;

  return (
    <div
      className="size-full flex flex-col relative overflow-hidden select-none"
      style={{
        background: "linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 40%, #1a0a2e 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      {/* Intro */}
      {phase === "intro" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            className="text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <WoodpeckerSVG
                size={90}
                bodyColor={customization.bodyColor}
                headColor={customization.headColor}
                beakColor={customization.beakColor}
                wingColor={customization.wingColor}
                eyeStyle={customization.eyeStyle}
                pattern={customization.pattern}
              />
            </motion.div>

            <h1 style={{ fontSize: 28, color: "#FFD700", marginTop: 16, textShadow: "0 0 10px rgba(255,215,0,0.5)" }}>
              🎵 리듬 톡톡!
            </h1>
            <p style={{ fontSize: 15, color: "#DEB887", marginTop: 8, lineHeight: 1.8 }}>
              음악에 맞춰 딱따구리가 문을 두드려요!
              <br />
              노트가 내려오면 타이밍에 맞춰 탭!
            </p>

            <div className="flex justify-center gap-4 mt-6 mb-6">
              {[0, 1, 2].map((lane) => (
                <motion.div
                  key={lane}
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: `${LANE_COLORS[lane]}33`,
                    border: `2px solid ${LANE_COLORS[lane]}`,
                  }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 1, delay: lane * 0.2, repeat: Infinity }}
                >
                  <span style={{ fontSize: 24 }}>{LANE_EMOJIS[lane]}</span>
                </motion.div>
              ))}
            </div>

            <motion.button
              className="px-12 py-4 rounded-xl text-white"
              style={{
                background: "linear-gradient(180deg, #FF8C00, #E8740C)",
                border: "3px solid #B8560B",
                boxShadow: "0 0 20px rgba(255,140,0,0.4)",
                fontSize: 22,
              }}
              onClick={startGame}
              whileTap={{ scale: 0.95 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🎶 음악 시작!
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* Playing */}
      {phase === "playing" && (
        <>
          {/* Top HUD */}
          <div className="px-4 pt-3 pb-1 flex items-center justify-between z-20">
            <div>
              <span style={{ fontSize: 11, color: "#aaa" }}>SCORE</span>
              <p style={{ fontSize: 20, color: "#FFD700" }}>{score.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <span style={{ fontSize: 11, color: "#aaa" }}>COMBO</span>
              <motion.p
                style={{ fontSize: combo >= 10 ? 24 : 20, color: combo >= 10 ? "#FF8C00" : "#fff" }}
                animate={combo >= 10 ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {combo}x
              </motion.p>
            </div>
            <div className="text-right">
              <span style={{ fontSize: 11, color: "#aaa" }}>MAX</span>
              <p style={{ fontSize: 16, color: "#4CAF50" }}>{maxCombo}x</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mx-4 mb-1">
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #FF8C00, #FFD700)",
                }}
              />
            </div>
          </div>

          {/* Note lanes */}
          <div className="flex-1 relative mx-4 mb-2 rounded-xl overflow-hidden"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "2px solid rgba(255,255,255,0.1)",
            }}
          >
            {/* Lane dividers */}
            <div className="absolute inset-0 flex">
              {[0, 1, 2].map((lane) => (
                <div key={lane} className="flex-1 relative" style={{ borderRight: lane < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  {/* Lane glow at bottom */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-16"
                    style={{
                      background: `linear-gradient(0deg, ${LANE_COLORS[lane]}22, transparent)`,
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Hit line */}
            <div
              className="absolute left-0 right-0 h-1 z-10"
              style={{
                bottom: "12%",
                background: "linear-gradient(90deg, #FF6B6B, #FFD700, #6BCB77)",
                boxShadow: "0 0 10px rgba(255,215,0,0.5)",
              }}
            />

            {/* Falling notes */}
            {notes.map((note) => {
              if (note.hit || note.missed) return null;
              const noteElapsed = elapsed - note.time + NOTE_TRAVEL_MS;
              const yPercent = (noteElapsed / NOTE_TRAVEL_MS) * 88;
              if (yPercent < -10 || yPercent > 100) return null;

              return (
                <motion.div
                  key={note.id}
                  className="absolute flex items-center justify-center z-5"
                  style={{
                    left: `${(note.lane * 33.33) + 5}%`,
                    top: `${yPercent}%`,
                    width: "24%",
                    height: 40,
                  }}
                >
                  <div
                    className="w-full h-full rounded-xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(180deg, ${LANE_COLORS[note.lane]}, ${LANE_COLORS[note.lane]}AA)`,
                      boxShadow: `0 0 12px ${LANE_COLORS[note.lane]}66`,
                      border: `2px solid ${LANE_COLORS[note.lane]}`,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{LANE_EMOJIS[note.lane]}</span>
                  </div>
                </motion.div>
              );
            })}

            {/* Hit effects */}
            <AnimatePresence>
              {effects.map((eff) => (
                <motion.div
                  key={eff.id}
                  className="absolute z-20 flex flex-col items-center"
                  style={{
                    left: `${(eff.lane * 33.33) + 5}%`,
                    bottom: "12%",
                    width: "24%",
                  }}
                  initial={{ opacity: 1, y: 0, scale: 0.5 }}
                  animate={{ opacity: 0, y: -60, scale: 1.3 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      color: JUDGE_COLORS[eff.judge],
                      textShadow: `0 0 8px ${JUDGE_COLORS[eff.judge]}`,
                    }}
                  >
                    {eff.judge}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Woodpecker at bottom center */}
            <motion.div
              className="absolute z-15"
              style={{ bottom: "14%", left: "50%", transform: "translateX(-50%)" }}
              animate={
                isKnocking
                  ? { rotate: knockLane === 0 ? -15 : knockLane === 2 ? 15 : 0, y: [0, -5, 0] }
                  : { y: [0, -3, 0] }
              }
              transition={isKnocking ? { duration: 0.1 } : { duration: 1, repeat: Infinity }}
            >
              <WoodpeckerSVG
                size={35}
                bodyColor={customization.bodyColor}
                headColor={customization.headColor}
                beakColor={customization.beakColor}
                eyeStyle="happy"
              />
            </motion.div>
          </div>

          {/* Tap buttons */}
          <div className="flex gap-3 mx-4 mb-4">
            {[0, 1, 2].map((lane) => (
              <motion.button
                key={lane}
                className="flex-1 py-5 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(180deg, ${LANE_COLORS[lane]}CC, ${LANE_COLORS[lane]}88)`,
                  border: `3px solid ${LANE_COLORS[lane]}`,
                  boxShadow: `0 2px 10px ${LANE_COLORS[lane]}44`,
                }}
                onClick={() => handleLaneTap(lane)}
                whileTap={{ scale: 0.88, brightness: 1.3 }}
              >
                <span style={{ fontSize: 28 }}>{LANE_EMOJIS[lane]}</span>
              </motion.button>
            ))}
          </div>
        </>
      )}

      {/* Results */}
      {phase === "results" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            className="w-full p-6 rounded-2xl text-center"
            style={{
              background: "linear-gradient(180deg, rgba(255,248,220,0.95), rgba(222,184,135,0.95))",
              border: "3px solid #FFD700",
              boxShadow: "0 0 30px rgba(255,215,0,0.3)",
            }}
            initial={{ scale: 0, rotateY: 180 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{ type: "spring", stiffness: 150 }}
          >
            <span style={{ fontSize: 50 }}>🎵</span>
            <h2 style={{ fontSize: 24, color: "#5C3317", marginTop: 8 }}>리듬 결과!</h2>

            <motion.p
              style={{ fontSize: 36, color: "#FF8C00", marginTop: 12 }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              {score.toLocaleString()}점
            </motion.p>

            <div className="flex justify-center gap-6 mt-4">
              <div className="text-center">
                <span style={{ fontSize: 11, color: "#888" }}>MAX COMBO</span>
                <p style={{ fontSize: 20, color: "#5C3317" }}>{maxCombo}x</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {(["PERFECT", "GREAT", "GOOD", "MISS"] as HitJudge[]).map((j) => (
                <motion.div
                  key={j}
                  className="flex items-center justify-between px-4 py-2 rounded-lg"
                  style={{ background: "rgba(0,0,0,0.05)" }}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 + ["PERFECT", "GREAT", "GOOD", "MISS"].indexOf(j) * 0.1 }}
                >
                  <span style={{ fontSize: 14, color: JUDGE_COLORS[j] }}>{j}</span>
                  <span style={{ fontSize: 16, color: "#5C3317" }}>{judgeStats[j]}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}