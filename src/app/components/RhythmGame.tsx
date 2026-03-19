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
  lane: number;
  time: number;
  hit: boolean;
  missed: boolean;
  type: "normal" | "big" | "hold";
}

type HitJudge = "PERFECT" | "GREAT" | "GOOD" | "MISS";

interface HitEffect {
  id: number;
  lane: number;
  judge: HitJudge;
  time: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  speed: number;
}

// ===== 음악 엔진 =====
const BPM = 155;
const BEAT_MS = 60000 / BPM;
const SONG_OFFSET = 2500; // 2.5s countdown

// 더 다이나믹한 노트 패턴 - BPM 155로 신나게!
function generateNotes(): Note[] {
  const notes: Note[] = [];
  let id = 0;

  const add = (beat: number, lane: number, type: Note["type"] = "normal") => {
    notes.push({ id: id++, lane, time: beat * BEAT_MS + SONG_OFFSET, hit: false, missed: false, type });
  };

  // === 인트로 (간단, 워밍업) beats 0-7 ===
  add(0, 1); add(2, 1); add(4, 0); add(6, 2);

  // === 벌스 1 (점점 빨라짐) beats 8-15 ===
  add(8, 1); add(9, 0); add(10, 2); add(11, 1);
  add(12, 0, "big"); add(13, 2); add(14, 1); add(14.5, 0);
  add(15, 2);

  // === 빌드업 beats 16-19 ===
  add(16, 0); add(16.5, 1); add(17, 2); add(17.5, 1);
  add(18, 0); add(18.33, 1); add(18.66, 2);
  add(19, 0); add(19.25, 1); add(19.5, 2); add(19.75, 0);

  // === 코러스 1 (최고조! 동시노트) beats 20-27 ===
  add(20, 0, "big"); add(20, 2, "big");
  add(21, 1, "big");
  add(22, 0); add(22.5, 2);
  add(23, 1); add(23.5, 0); add(23.75, 2);
  add(24, 1, "big"); add(24, 0);
  add(25, 2); add(25.5, 1);
  add(26, 0); add(26, 2);
  add(27, 1, "big");

  // === 브레이크 (짧은 쉼) beats 28-29 ===
  add(28, 1); add(29.5, 1);

  // === 벌스 2 (변주) beats 30-37 ===
  add(30, 2); add(31, 0); add(31.5, 2);
  add(32, 1, "big"); add(33, 0); add(33.5, 1); add(34, 2);
  add(34.5, 0); add(35, 1); add(35.5, 2); add(35.75, 0);
  add(36, 1, "big"); add(37, 2); add(37.5, 0);

  // === 빌드업 2 beats 38-41 ===
  add(38, 0); add(38.25, 1); add(38.5, 2); add(38.75, 0);
  add(39, 1); add(39.25, 2); add(39.5, 0); add(39.75, 1);
  add(40, 0); add(40.25, 1); add(40.5, 2);
  add(41, 0, "big"); add(41, 1, "big"); add(41, 2, "big");

  // === 코러스 2 (최고조!) beats 42-49 ===
  add(42, 1, "big"); add(42.5, 0); add(42.75, 2);
  add(43, 1); add(43.5, 0); add(43.75, 2);
  add(44, 0, "big"); add(44, 2, "big");
  add(45, 1); add(45.33, 0); add(45.66, 2);
  add(46, 1, "big"); add(46.5, 0); add(46.5, 2);
  add(47, 1); add(47.25, 0); add(47.5, 2); add(47.75, 1);
  add(48, 0, "big"); add(48, 1, "big"); add(48, 2, "big");
  add(49, 1);

  // === 피날레 beats 50-53 ===
  add(50, 0); add(50.25, 1); add(50.5, 2);
  add(51, 0); add(51.25, 1); add(51.5, 2); add(51.75, 0);
  add(52, 0, "big"); add(52, 1, "big"); add(52, 2, "big");

  return notes;
}

const TOTAL_SONG_MS = 55 * BEAT_MS + SONG_OFFSET + 2000;

// ===== 오디오 =====
function createCtx() {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

function playNote(ctx: AudioContext, time: number, freq: number, type: OscillatorType, dur: number, vol: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + dur + 0.01);
}

function playKick(ctx: AudioContext, time: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(160, time);
  osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
  gain.gain.setValueAtTime(0.45, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.2);
}

function playSnare(ctx: AudioContext, time: number) {
  const sz = ctx.sampleRate * 0.08;
  const buf = ctx.createBuffer(1, sz, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < sz; i++) d[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 3500;
  g.gain.setValueAtTime(0.2, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  src.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  src.start(time);
}

function playHiHat(ctx: AudioContext, time: number, open = false) {
  const sz = ctx.sampleRate * (open ? 0.08 : 0.03);
  const buf = ctx.createBuffer(1, sz, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < sz; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 8000;
  g.gain.setValueAtTime(open ? 0.15 : 0.1, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + (open ? 0.08 : 0.03));
  src.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  src.start(time);
}

function scheduleMusic(ctx: AudioContext) {
  const beatSec = 60 / BPM;
  const totalBeats = 56;
  const start = ctx.currentTime + SONG_OFFSET / 1000;

  // ===== 멜로디 (신나는 8비트 동요) =====
  const melody: [number, number, number][] = [
    // [beat, freq, duration_beats]
    // 인트로 - 경쾌한 도입
    [0, 659, 0.5], [0.5, 784, 0.5], [1, 880, 1], [2, 784, 0.5], [2.5, 659, 0.5],
    [3, 784, 1], [4, 880, 0.5], [4.5, 988, 0.5], [5, 1047, 1], [6, 880, 1],
    [7, 784, 1],

    // 벌스 - 밝고 경쾌
    [8, 1047, 0.5], [8.5, 988, 0.5], [9, 880, 1], [10, 784, 0.5], [10.5, 880, 0.5],
    [11, 988, 1], [12, 1047, 1], [13, 880, 0.5], [13.5, 784, 0.5],
    [14, 659, 1], [15, 784, 1],

    // 빌드업 - 빠르게 올라가는
    [16, 523, 0.25], [16.25, 587, 0.25], [16.5, 659, 0.25], [16.75, 698, 0.25],
    [17, 784, 0.25], [17.25, 880, 0.25], [17.5, 988, 0.25], [17.75, 1047, 0.25],
    [18, 1175, 0.5], [18.5, 1319, 0.5], [19, 1397, 1],

    // 코러스 1 - 최고조! 높은 음역
    [20, 1319, 0.5], [20.5, 1175, 0.5], [21, 1047, 1],
    [22, 1175, 0.5], [22.5, 1319, 0.5], [23, 1397, 1],
    [24, 1319, 0.5], [24.5, 1175, 0.5], [25, 1047, 0.5], [25.5, 988, 0.5],
    [26, 880, 1], [27, 1047, 1],

    // 브레이크
    [28, 659, 2],

    // 벌스 2
    [30, 784, 0.5], [30.5, 880, 0.5], [31, 988, 1],
    [32, 1047, 0.5], [32.5, 988, 0.5], [33, 880, 0.5], [33.5, 784, 0.5],
    [34, 880, 1], [35, 988, 0.5], [35.5, 1047, 0.5],
    [36, 1175, 1], [37, 1047, 1],

    // 빌드업 2
    [38, 880, 0.25], [38.25, 988, 0.25], [38.5, 1047, 0.25], [38.75, 1175, 0.25],
    [39, 1319, 0.25], [39.25, 1175, 0.25], [39.5, 1319, 0.25], [39.75, 1397, 0.25],
    [40, 1568, 0.5], [40.5, 1397, 0.5], [41, 1760, 1],

    // 코러스 2
    [42, 1568, 0.5], [42.5, 1397, 0.5], [43, 1319, 0.5], [43.5, 1175, 0.5],
    [44, 1319, 1], [45, 1397, 0.5], [45.5, 1568, 0.5],
    [46, 1760, 1], [47, 1568, 0.5], [47.5, 1397, 0.5],
    [48, 1319, 1], [49, 1047, 1],

    // 피날레
    [50, 1175, 0.25], [50.25, 1319, 0.25], [50.5, 1397, 0.25], [50.75, 1568, 0.25],
    [51, 1760, 0.5], [51.5, 1568, 0.5],
    [52, 2093, 1.5],
  ];

  for (const [beat, freq, dur] of melody) {
    const t = start + beat * beatSec;
    playNote(ctx, t, freq, "square", dur * beatSec * 0.85, 0.1);
    playNote(ctx, t, freq * 2, "triangle", dur * beatSec * 0.5, 0.03);
  }

  // ===== 베이스 (그루비한 라인) =====
  const bassPattern = [
    [0, 165, 2], [2, 196, 2], [4, 220, 2], [6, 175, 2],
    [8, 262, 1], [9, 220, 1], [10, 196, 1], [11, 175, 1],
    [12, 165, 2], [14, 196, 2],
  ];
  for (let section = 0; section < 6; section++) {
    for (const [b, f, d] of bassPattern) {
      const beat = b + section * 8 + (section >= 1 ? 2 : 0);
      if (beat >= totalBeats) break;
      const t = start + beat * beatSec;
      playNote(ctx, t, f as number, "sawtooth", (d as number) * beatSec * 0.9, 0.08);
      playNote(ctx, t, (f as number) * 0.5, "sine", (d as number) * beatSec * 0.6, 0.05);
    }
  }

  // ===== 드럼 (다이나믹한 패턴) =====
  for (let beat = 0; beat < totalBeats; beat++) {
    const t = start + beat * beatSec;
    const section = Math.floor(beat / 8);

    // 킥: 1, 3박 (빌드업 구간에서는 더 자주)
    if (beat % 2 === 0 || (section === 2 || section === 5) && beat % 1 === 0) {
      playKick(ctx, t);
    }

    // 스네어: 2, 4박
    if (beat % 2 === 1) {
      playSnare(ctx, t);
    }

    // 하이햇: 8분음표
    playHiHat(ctx, t);
    playHiHat(ctx, t + beatSec * 0.5);

    // 빌드업 구간에서 16분음표 하이햇
    if (section === 2 || section === 5) {
      playHiHat(ctx, t + beatSec * 0.25);
      playHiHat(ctx, t + beatSec * 0.75);
    }

    // 코러스에서 오픈 하이햇
    if ((section === 2 || section === 5) && beat % 4 === 0) {
      playHiHat(ctx, t, true);
    }
  }

  // ===== 아르페지오 (배경 반짝임) =====
  const arpNotes = [523, 659, 784, 1047, 784, 659];
  for (let beat = 20; beat < totalBeats; beat++) {
    const t = start + beat * beatSec;
    for (let i = 0; i < 3; i++) {
      const freq = arpNotes[(beat * 3 + i) % arpNotes.length];
      playNote(ctx, t + i * beatSec / 3, freq, "sine", beatSec / 4, 0.02);
    }
  }

  // ===== FX: 코러스 진입 시 라이저 =====
  [19, 41].forEach(b => {
    const t = start + b * beatSec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, t - beatSec);
    osc.frequency.exponentialRampToValueAtTime(2000, t);
    gain.gain.setValueAtTime(0, t - beatSec);
    gain.gain.linearRampToValueAtTime(0.08, t - beatSec * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t - beatSec);
    osc.stop(t + 0.2);
  });
}

function playHitSfx(ctx: AudioContext, judge: HitJudge) {
  const t = ctx.currentTime;
  if (judge === "PERFECT") {
    playNote(ctx, t, 1200, "sine", 0.08, 0.15);
    playNote(ctx, t + 0.04, 1600, "sine", 0.08, 0.12);
    playNote(ctx, t + 0.08, 2000, "sine", 0.1, 0.08);
  } else if (judge === "GREAT") {
    playNote(ctx, t, 1000, "sine", 0.08, 0.12);
    playNote(ctx, t + 0.05, 1300, "sine", 0.06, 0.08);
  } else if (judge === "GOOD") {
    playNote(ctx, t, 800, "sine", 0.06, 0.08);
  } else {
    playNote(ctx, t, 200, "sawtooth", 0.15, 0.1);
  }
}

// ===== 상수 =====
const LANE_COLORS = ["#FF6B6B", "#FFD700", "#6BCB77"];
const LANE_EMOJIS = ["🔴", "⭐", "🟢"];
const JUDGE_COLORS: Record<HitJudge, string> = { PERFECT: "#FFD700", GREAT: "#4CAF50", GOOD: "#2196F3", MISS: "#FF4444" };
const JUDGE_SCORES: Record<HitJudge, number> = { PERFECT: 100, GREAT: 70, GOOD: 40, MISS: 0 };
const HIT_WINDOW = { PERFECT: 55, GREAT: 110, GOOD: 170 };
const NOTE_TRAVEL_MS = 1800;

export function RhythmGame({ onComplete, customization }: RhythmGameProps) {
  const [phase, setPhase] = useState<"intro" | "countdown" | "playing" | "results">("intro");
  const [notes, setNotes] = useState<Note[]>([]);
  const [effects, setEffects] = useState<HitEffect[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [judgeStats, setJudgeStats] = useState({ PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 });
  const [progress, setProgress] = useState(0);
  const [isKnocking, setIsKnocking] = useState(false);
  const [knockLane, setKnockLane] = useState(-1);
  const [countdown, setCountdown] = useState(3);
  const [bgFlash, setBgFlash] = useState("");
  const [screenShake, setScreenShake] = useState(false);
  const [beatPulse, setBeatPulse] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef(0);
  const animFrameRef = useRef<number>();
  const notesRef = useRef<Note[]>([]);
  const effectIdRef = useRef(0);
  const particleIdRef = useRef(0);
  const comboRef = useRef(0);

  // Beat pulse effect
  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(() => {
      setBeatPulse(true);
      setTimeout(() => setBeatPulse(false), 80);
    }, BEAT_MS);
    return () => clearInterval(interval);
  }, [phase]);

  const startGame = useCallback(() => {
    // Countdown first
    setPhase("countdown");
    setCountdown(3);

    let c = 3;
    const countInterval = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countInterval);

        const ctx = createCtx();
        audioCtxRef.current = ctx;
        const songNotes = generateNotes();
        setNotes(songNotes);
        notesRef.current = songNotes;

        scheduleMusic(ctx);
        startTimeRef.current = performance.now();
        setPhase("playing");

        const gameLoop = () => {
          const elapsed = performance.now() - startTimeRef.current;
          setProgress(Math.min(100, (elapsed / TOTAL_SONG_MS) * 100));

          const updated = notesRef.current.map((n) => {
            if (!n.hit && !n.missed && elapsed > n.time + HIT_WINDOW.GOOD) {
              return { ...n, missed: true };
            }
            return n;
          });

          const newMisses = updated.filter((n, i) => n.missed && !notesRef.current[i].missed);
          if (newMisses.length > 0) {
            setCombo(0);
            comboRef.current = 0;
            setJudgeStats((prev) => ({ ...prev, MISS: prev.MISS + newMisses.length }));
            // Screen shake on miss
            setScreenShake(true);
            setTimeout(() => setScreenShake(false), 200);
          }

          notesRef.current = updated;
          setNotes([...updated]);

          if (elapsed < TOTAL_SONG_MS) {
            animFrameRef.current = requestAnimationFrame(gameLoop);
          } else {
            setTimeout(() => {
              setPhase("results");
              const total = notesRef.current.length;
              const hits = notesRef.current.filter((n) => n.hit).length;
              const finalScore = total > 0 ? Math.min(100, Math.round((hits / total) * 100)) : 0;
              setTimeout(() => onComplete(Math.max(10, finalScore)), 3000);
            }, 1000);
          }
        };
        animFrameRef.current = requestAnimationFrame(gameLoop);
      }
    }, 800);
  }, [onComplete]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const spawnParticles = useCallback((lane: number, judge: HitJudge) => {
    const count = judge === "PERFECT" ? 12 : judge === "GREAT" ? 8 : 4;
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x: (lane * 33.33) + 16,
        y: 85,
        color: judge === "PERFECT" ? LANE_COLORS[lane] : judge === "GREAT" ? "#4CAF50" : "#2196F3",
        angle: Math.random() * Math.PI * 2,
        speed: 2 + Math.random() * 4,
      });
    }
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 600);
  }, []);

  const handleLaneTap = useCallback((lane: number) => {
    if (phase !== "playing") return;
    const elapsed = performance.now() - startTimeRef.current;

    setIsKnocking(true);
    setKnockLane(lane);
    setTimeout(() => setIsKnocking(false), 120);

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

      const multiplier = bestNote.type === "big" ? 1.5 : 1;
      const noteScore = JUDGE_SCORES[judge] * (1 + comboRef.current * 0.05) * multiplier;

      notesRef.current = notesRef.current.map((n) =>
        n.id === bestNote!.id ? { ...n, hit: true } : n
      );
      setNotes([...notesRef.current]);

      setScore((s) => s + Math.round(noteScore));
      setCombo((c) => {
        const nc = c + 1;
        comboRef.current = nc;
        setMaxCombo((m) => Math.max(m, nc));
        return nc;
      });
      setJudgeStats((prev) => ({ ...prev, [judge]: prev[judge] + 1 }));

      // Effects
      const effectId = effectIdRef.current++;
      setEffects((prev) => [...prev, { id: effectId, lane, judge, time: Date.now() }]);
      setTimeout(() => setEffects((prev) => prev.filter((e) => e.id !== effectId)), 700);

      spawnParticles(lane, judge);

      // Background flash
      if (judge === "PERFECT") {
        setBgFlash(LANE_COLORS[lane]);
        setTimeout(() => setBgFlash(""), 150);
      }

      if (audioCtxRef.current) playHitSfx(audioCtxRef.current, judge);
    }
  }, [phase, spawnParticles]);

  const elapsed = phase === "playing" ? performance.now() - startTimeRef.current : 0;

  // Grade calculation for results
  const getGrade = () => {
    const total = notes.length || 1;
    const perfRate = judgeStats.PERFECT / total;
    const hitRate = (judgeStats.PERFECT + judgeStats.GREAT + judgeStats.GOOD) / total;
    if (perfRate >= 0.9) return { grade: "S+", color: "#FFD700", emoji: "👑" };
    if (perfRate >= 0.7) return { grade: "S", color: "#FFD700", emoji: "⭐" };
    if (hitRate >= 0.9) return { grade: "A", color: "#4CAF50", emoji: "🎯" };
    if (hitRate >= 0.7) return { grade: "B", color: "#2196F3", emoji: "👍" };
    if (hitRate >= 0.5) return { grade: "C", color: "#FF8C00", emoji: "💪" };
    return { grade: "D", color: "#FF4444", emoji: "🔄" };
  };

  return (
    <motion.div
      className="size-full flex flex-col relative overflow-hidden select-none"
      style={{
        background: bgFlash
          ? `radial-gradient(circle at 50% 85%, ${bgFlash}44, #1a0a2e)`
          : "linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 40%, #1a0a2e 100%)",
        fontFamily: "'Jua', sans-serif",
        transition: "background 0.1s",
      }}
      animate={screenShake ? { x: [0, -4, 4, -2, 2, 0] } : {}}
      transition={{ duration: 0.2 }}
    >
      {/* Background beat pulse */}
      {phase === "playing" && beatPulse && (
        <div className="absolute inset-0 pointer-events-none z-0"
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,215,0,0.03), transparent)", transition: "opacity 0.1s" }}
        />
      )}

      {/* Stars background */}
      {phase === "playing" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }, (_, i) => (
            <motion.div key={i} className="absolute rounded-full"
              style={{
                width: 2 + Math.random() * 2,
                height: 2 + Math.random() * 2,
                background: "#fff",
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 60}%`,
              }}
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 1 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </div>
      )}

      {/* Intro */}
      {phase === "intro" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 z-10">
          <motion.div className="text-center" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <motion.div animate={{ rotate: [-5, 5, -5] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <WoodpeckerSVG size={90} bodyColor={customization.bodyColor} headColor={customization.headColor}
                beakColor={customization.beakColor} wingColor={customization.wingColor}
                eyeStyle={customization.eyeStyle} pattern={customization.pattern} />
            </motion.div>

            <h1 style={{ fontSize: 30, color: "#FFD700", marginTop: 16, textShadow: "0 0 20px rgba(255,215,0,0.5)" }}>
              🎵 리듬 톡톡!
            </h1>
            <p style={{ fontSize: 14, color: "#DEB887", marginTop: 8, lineHeight: 1.8 }}>
              신나는 음악에 맞춰<br />딱따구리가 문을 두드려요!
            </p>

            <div className="flex justify-center gap-3 mt-6 mb-4">
              {[0, 1, 2].map((lane) => (
                <motion.div key={lane} className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ background: `${LANE_COLORS[lane]}33`, border: `2px solid ${LANE_COLORS[lane]}` }}
                  animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 1, delay: lane * 0.2, repeat: Infinity }}>
                  <span style={{ fontSize: 24 }}>{LANE_EMOJIS[lane]}</span>
                </motion.div>
              ))}
            </div>

            <div className="p-3 rounded-lg mb-4" style={{ background: "rgba(255,255,255,0.05)" }}>
              <p style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
                노트가 내려오면 타이밍에 맞춰 탭!<br />
                ⭐ 큰 노트는 <strong style={{ color: "#FFD700" }}>1.5배</strong> 점수!
              </p>
            </div>

            <motion.button className="px-12 py-4 rounded-xl text-white"
              style={{
                background: "linear-gradient(180deg, #FF8C00, #E8740C)",
                border: "3px solid #B8560B",
                boxShadow: "0 0 25px rgba(255,140,0,0.5)",
                fontSize: 22,
              }}
              onClick={startGame} whileTap={{ scale: 0.95 }}
              animate={{ scale: [1, 1.06, 1], boxShadow: ["0 0 25px rgba(255,140,0,0.3)", "0 0 35px rgba(255,140,0,0.6)", "0 0 25px rgba(255,140,0,0.3)"] }}
              transition={{ duration: 1.5, repeat: Infinity }}>
              🎶 START!
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* Countdown */}
      {phase === "countdown" && (
        <div className="flex-1 flex items-center justify-center z-10">
          <AnimatePresence mode="wait">
            <motion.div key={countdown} className="text-center"
              initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
              <span style={{ fontSize: countdown > 0 ? 80 : 50, color: "#FFD700",
                textShadow: "0 0 30px rgba(255,215,0,0.6)" }}>
                {countdown > 0 ? countdown : "🎵 GO!"}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Playing */}
      {phase === "playing" && (
        <>
          {/* Top HUD */}
          <div className="px-4 pt-2 pb-1 flex items-center justify-between z-20">
            <div>
              <span style={{ fontSize: 10, color: "#888" }}>SCORE</span>
              <p style={{ fontSize: 18, color: "#FFD700" }}>{score.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <AnimatePresence mode="wait">
                <motion.div key={combo}
                  initial={combo > 0 ? { scale: 1.5 } : {}}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}>
                  <span style={{ fontSize: 10, color: "#888" }}>COMBO</span>
                  <p style={{
                    fontSize: combo >= 20 ? 26 : combo >= 10 ? 22 : 18,
                    color: combo >= 20 ? "#FF4444" : combo >= 10 ? "#FF8C00" : "#fff",
                    textShadow: combo >= 10 ? `0 0 10px ${combo >= 20 ? "#FF4444" : "#FF8C00"}` : "none",
                  }}>
                    {combo}x
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="text-right">
              <span style={{ fontSize: 10, color: "#888" }}>MAX</span>
              <p style={{ fontSize: 14, color: "#4CAF50" }}>{maxCombo}x</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mx-4 mb-1 z-20">
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #FF8C00, #FFD700, #FF8C00)", backgroundSize: "200% 100%" }}
                animate={{ width: `${progress}%`, backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ backgroundPosition: { duration: 2, repeat: Infinity }, width: { duration: 0.3 } }}
              />
            </div>
          </div>

          {/* Note lanes */}
          <div className="flex-1 relative mx-3 mb-1 rounded-xl overflow-hidden z-10"
            style={{ background: "rgba(0,0,0,0.4)", border: "2px solid rgba(255,255,255,0.08)" }}>

            {/* Lane backgrounds */}
            <div className="absolute inset-0 flex">
              {[0, 1, 2].map((lane) => (
                <div key={lane} className="flex-1 relative"
                  style={{ borderRight: lane < 2 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div className="absolute bottom-0 left-0 right-0 h-20"
                    style={{ background: `linear-gradient(0deg, ${LANE_COLORS[lane]}15, transparent)` }} />
                </div>
              ))}
            </div>

            {/* Beat lines (moving) */}
            {Array.from({ length: 8 }, (_, i) => {
              const beatOffset = (elapsed % (BEAT_MS * 2)) / (BEAT_MS * 2);
              const y = ((beatOffset + i * 0.25) % 1) * 100;
              return (
                <div key={i} className="absolute left-0 right-0 pointer-events-none"
                  style={{ top: `${y}%`, height: 1, background: `rgba(255,255,255,${0.03 + (i % 2 === 0 ? 0.02 : 0)})` }} />
              );
            })}

            {/* Hit line */}
            <motion.div className="absolute left-0 right-0 h-1 z-10"
              style={{ bottom: "12%", background: "linear-gradient(90deg, #FF6B6B, #FFD700, #6BCB77)", boxShadow: "0 0 12px rgba(255,215,0,0.4)" }}
              animate={beatPulse ? { boxShadow: "0 0 20px rgba(255,215,0,0.7)" } : { boxShadow: "0 0 12px rgba(255,215,0,0.4)" }}
            />

            {/* Hit zone glow */}
            <div className="absolute left-0 right-0 z-5"
              style={{ bottom: "9%", height: "8%", background: "linear-gradient(0deg, rgba(255,215,0,0.08), transparent)" }} />

            {/* Falling notes */}
            {notes.map((note) => {
              if (note.hit || note.missed) return null;
              const noteElapsed = elapsed - note.time + NOTE_TRAVEL_MS;
              const yPct = (noteElapsed / NOTE_TRAVEL_MS) * 88;
              if (yPct < -10 || yPct > 100) return null;
              const isBig = note.type === "big";

              return (
                <motion.div key={note.id} className="absolute flex items-center justify-center"
                  style={{
                    left: `${note.lane * 33.33 + 4}%`,
                    top: `${yPct}%`,
                    width: "26%",
                    height: isBig ? 48 : 38,
                  }}>
                  <div className="w-full h-full rounded-xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(180deg, ${LANE_COLORS[note.lane]}, ${LANE_COLORS[note.lane]}99)`,
                      boxShadow: `0 0 ${isBig ? 18 : 10}px ${LANE_COLORS[note.lane]}66`,
                      border: `${isBig ? 3 : 2}px solid ${LANE_COLORS[note.lane]}`,
                      transform: isBig ? "scale(1.1)" : undefined,
                    }}>
                    <span style={{ fontSize: isBig ? 22 : 16 }}>{LANE_EMOJIS[note.lane]}</span>
                    {isBig && <span style={{ fontSize: 8, color: "#fff", position: "absolute", bottom: 2 }}>×1.5</span>}
                  </div>
                </motion.div>
              );
            })}

            {/* Hit effects */}
            <AnimatePresence>
              {effects.map((eff) => (
                <motion.div key={eff.id} className="absolute z-20 flex flex-col items-center"
                  style={{ left: `${eff.lane * 33.33 + 4}%`, bottom: "12%", width: "26%" }}
                  initial={{ opacity: 1, y: 0, scale: 0.5 }}
                  animate={{ opacity: 0, y: -70, scale: 1.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}>
                  <span style={{
                    fontSize: eff.judge === "PERFECT" ? 18 : 14,
                    color: JUDGE_COLORS[eff.judge],
                    textShadow: `0 0 12px ${JUDGE_COLORS[eff.judge]}`,
                  }}>
                    {eff.judge === "PERFECT" ? "✨PERFECT✨" : eff.judge}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Particles */}
            {particles.map((p) => (
              <motion.div key={p.id} className="absolute rounded-full z-30"
                style={{ left: `${p.x}%`, bottom: "12%", width: 6, height: 6, background: p.color }}
                initial={{ opacity: 1 }}
                animate={{
                  x: Math.cos(p.angle) * p.speed * 30,
                  y: Math.sin(p.angle) * p.speed * 30 - 40,
                  opacity: 0,
                  scale: 0,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            ))}

            {/* Woodpecker */}
            <motion.div className="absolute z-15"
              style={{ bottom: "14%", left: "50%", transform: "translateX(-50%)" }}
              animate={isKnocking
                ? { rotate: knockLane === 0 ? -20 : knockLane === 2 ? 20 : 0, y: [0, -8, 0], scale: 1.1 }
                : { y: [0, -3, 0] }}
              transition={isKnocking ? { duration: 0.1 } : { duration: 1, repeat: Infinity }}>
              <WoodpeckerSVG size={32} bodyColor={customization.bodyColor}
                headColor={customization.headColor} beakColor={customization.beakColor} eyeStyle="happy" />
            </motion.div>
          </div>

          {/* Tap buttons */}
          <div className="flex gap-2 mx-3 mb-3 z-20">
            {[0, 1, 2].map((lane) => (
              <motion.button key={lane}
                className="flex-1 py-4 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(180deg, ${LANE_COLORS[lane]}DD, ${LANE_COLORS[lane]}99)`,
                  border: `3px solid ${LANE_COLORS[lane]}`,
                  boxShadow: `0 3px 0 ${LANE_COLORS[lane]}66, 0 0 12px ${LANE_COLORS[lane]}33`,
                }}
                onClick={() => handleLaneTap(lane)}
                whileTap={{ scale: 0.85, y: 3, boxShadow: `0 0 0 ${LANE_COLORS[lane]}66, 0 0 20px ${LANE_COLORS[lane]}66` }}>
                <span style={{ fontSize: 30 }}>{LANE_EMOJIS[lane]}</span>
              </motion.button>
            ))}
          </div>
        </>
      )}

      {/* Results */}
      {phase === "results" && (() => {
        const { grade, color, emoji } = getGrade();
        return (
          <div className="flex-1 flex flex-col items-center justify-center px-6 z-10">
            <motion.div className="w-full p-6 rounded-2xl text-center"
              style={{
                background: "linear-gradient(180deg, rgba(255,248,220,0.97), rgba(222,184,135,0.97))",
                border: "3px solid #FFD700",
                boxShadow: "0 0 40px rgba(255,215,0,0.3)",
              }}
              initial={{ scale: 0, rotateY: 180 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ type: "spring", stiffness: 150 }}>

              {/* Grade */}
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}>
                <span style={{ fontSize: 40 }}>{emoji}</span>
                <p style={{ fontSize: 50, color, textShadow: `0 0 20px ${color}44` }}>
                  {grade}
                </p>
              </motion.div>

              <h2 style={{ fontSize: 22, color: "#5C3317", marginTop: 4 }}>리듬 결과!</h2>

              <motion.p style={{ fontSize: 32, color: "#FF8C00", marginTop: 8 }}
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}>
                {score.toLocaleString()}점
              </motion.p>

              <div className="flex justify-center gap-8 mt-3">
                <div className="text-center">
                  <span style={{ fontSize: 10, color: "#888" }}>MAX COMBO</span>
                  <p style={{ fontSize: 20, color: "#5C3317" }}>{maxCombo}x</p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                {(["PERFECT", "GREAT", "GOOD", "MISS"] as HitJudge[]).map((j, idx) => (
                  <motion.div key={j} className="flex items-center justify-between px-4 py-2 rounded-lg"
                    style={{ background: "rgba(0,0,0,0.04)" }}
                    initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.7 + idx * 0.1 }}>
                    <span style={{ fontSize: 13, color: JUDGE_COLORS[j] }}>
                      {j === "PERFECT" ? "✨ " : ""}{j}
                    </span>
                    <span style={{ fontSize: 15, color: "#5C3317" }}>{judgeStats[j]}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Floating confetti */}
            {Array.from({ length: 15 }, (_, i) => (
              <motion.div key={i} className="absolute rounded-full"
                style={{
                  width: 6 + Math.random() * 6,
                  height: 6 + Math.random() * 6,
                  background: ["#FF6B6B", "#FFD700", "#4CAF50", "#2196F3", "#C084FC"][i % 5],
                  left: `${Math.random() * 100}%`,
                  top: -10,
                }}
                animate={{ y: [0, 700], x: [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 150], rotate: [0, 360], opacity: [1, 0] }}
                transition={{ duration: 2.5 + Math.random(), delay: Math.random(), repeat: Infinity }}
              />
            ))}
          </div>
        );
      })()}
    </motion.div>
  );
}
