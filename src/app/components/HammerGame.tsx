import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import moleTrack from "../../assets/woodpecker/mole-bgm.mp3";
import { stopBGM, sfxCountdownTick, sfxHammerBeat, sfxHammerMiss, sfxHammerPeg } from "./tetris-sounds";

interface HammerGameProps {
  onComplete: (score: number) => void;
}

type Phase = "ready" | "countdown" | "playing" | "results";
type HitJudge = "PERFECT" | "GREAT" | "GOOD" | "MISS";

interface MoleNote {
  id: number;
  hole: number;
  time: number;
  hit: boolean;
  missed: boolean;
  judge?: HitJudge;
}

interface HitEffect {
  id: number;
  hole: number;
  judge: HitJudge;
}

interface HammerSwing {
  id: number;
  hole: number;
}

interface ComboBurst {
  id: number;
  combo: number;
  label: "COMBO" | "FEVER" | "OVERDRIVE";
  angle: number;
  x: number;
  y: number;
}

interface HolePosition {
  x: number;
  y: number;
}

const DEFAULT_HOLE_LAYOUT: HolePosition[] = [
  { x: 50.0, y: 23.0 },
  { x: 65.9, y: 28.2 },
  { x: 75.8, y: 41.8 },
  { x: 75.8, y: 58.2 },
  { x: 65.9, y: 71.8 },
  { x: 50.0, y: 77.0 },
  { x: 34.1, y: 71.8 },
  { x: 24.2, y: 58.2 },
  { x: 24.2, y: 41.8 },
  { x: 34.1, y: 28.2 },
];
const HOLE_COUNT = DEFAULT_HOLE_LAYOUT.length;
const HOLE_DIAMETER_PERCENT = 16;
const GAME_DURATION_MS = 60000;
const HIT_WINDOW_MS = {
  PERFECT: 50,
  GREAT: 102,
  GOOD: 160,
};
const MOLE_SHOW_MS = 1000;
const MOLE_FULL_HOLD_MS = 760;
const MOLE_HIDE_MS = 980;
const HAMMER_STAGE_MAX_SCORE = 2500;
const HAMMER_RESULT_MAX_SCORE = 100;

const JUDGE_POINT_SCORES: Record<Exclude<HitJudge, "MISS">, number> = {
  PERFECT: 50,
  GREAT: 36,
  GOOD: 24,
};
const MISTAP_DEDUCTION = Math.round(JUDGE_POINT_SCORES.PERFECT / 3);

const JUDGE_COLORS: Record<HitJudge, string> = {
  PERFECT: "#FFD700",
  GREAT: "#7ED957",
  GOOD: "#4FC3F7",
  MISS: "#FF6B6B",
};

const JUDGE_ACCURACY_SCORES: Record<HitJudge, number> = {
  PERFECT: 100,
  GREAT: 75,
  GOOD: 48,
  MISS: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createSeededRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let n = Math.imul(t ^ (t >>> 15), t | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function getNoteWindow(noteTime: number) {
  const holdHalf = MOLE_FULL_HOLD_MS * 0.5;
  const appearAt = noteTime - (MOLE_SHOW_MS + holdHalf);
  const fullyShownFrom = noteTime - holdHalf;
  const fullyShownTo = noteTime + holdHalf;
  const disappearAt = fullyShownTo + MOLE_HIDE_MS;
  return { appearAt, fullyShownFrom, fullyShownTo, disappearAt };
}

function generateScatteredHoleLayout(): HolePosition[] {
  const margin = HOLE_DIAMETER_PERCENT * 0.52 + 2;
  const minX = margin;
  const maxX = 100 - margin;
  const minY = margin;
  const maxY = 100 - margin;
  const minDistance = HOLE_DIAMETER_PERCENT + 2.2;

  const points: HolePosition[] = [];

  for (let i = 0; i < HOLE_COUNT; i += 1) {
    let best: HolePosition | null = null;
    let bestScore = -1;

    for (let attempt = 0; attempt < 420; attempt += 1) {
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);

      let nearest = Number.POSITIVE_INFINITY;
      for (const p of points) {
        const dist = Math.hypot(p.x - x, p.y - y);
        if (dist < nearest) nearest = dist;
      }

      if (points.length > 0 && nearest < minDistance && attempt < 300) {
        continue;
      }

      // Pick candidates that are farther from existing holes to keep a scattered look.
      const score = (points.length === 0 ? 100 : nearest) + Math.random() * 0.75;
      if (score > bestScore) {
        best = { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
        bestScore = score;
      }
    }

    if (!best) {
      return [...DEFAULT_HOLE_LAYOUT];
    }
    points.push(best);
  }

  return points;
}

function generateMoleChart(durationMs: number): MoleNote[] {
  const safeDuration = Number.isFinite(durationMs) && durationMs > 20000 ? durationMs : GAME_DURATION_MS;
  const startMs = 1400;
  const endMs = Math.max(startMs + 44000, safeDuration - 1000);
  const rng = createSeededRng(Math.floor(safeDuration));

  const notes: MoleNote[] = [];
  let id = 0;
  let time = startMs;
  let lastHole = 1;

  while (time < endMs) {
    const progress = clamp((time - startMs) / Math.max(1, endMs - startMs), 0, 1);
    const intervalMs = 1120 - 650 * Math.pow(progress, 1.1);
    const spawnChance = 0.75 + progress * 0.17;

    if (rng() <= spawnChance) {
      let hole = Math.floor(rng() * HOLE_COUNT);
      if (hole === lastHole && rng() < 0.64) {
        hole = (hole + 1 + Math.floor(rng() * 4)) % HOLE_COUNT;
      }

      notes.push({
        id: id++,
        hole,
        time,
        hit: false,
        missed: false,
      });
      lastHole = hole;

      const doubleChance = 0.01 + progress * 0.12;
      if (rng() < doubleChance) {
        let second = Math.floor(rng() * HOLE_COUNT);
        if (second === hole) second = (second + 1 + Math.floor(rng() * 3)) % HOLE_COUNT;
        notes.push({
          id: id++,
          hole: second,
          time,
          hit: false,
          missed: false,
        });
      }

      const syncopationChance = progress < 0.55 ? 0.03 : progress < 0.82 ? 0.08 : 0.12;
      const offbeatTime = time + intervalMs * 0.62;
      if (rng() < syncopationChance && offbeatTime < endMs) {
        let offHole = Math.floor(rng() * HOLE_COUNT);
        if (offHole === hole) offHole = (offHole + 2) % HOLE_COUNT;
        notes.push({
          id: id++,
          hole: offHole,
          time: offbeatTime,
          hit: false,
          missed: false,
        });
      }
    }

    time += intervalMs;
  }

  notes.sort((a, b) => (a.time === b.time ? a.id - b.id : a.time - b.time));
  return notes;
}

function calculateAccuracyPercent(notes: MoleNote[]): number {
  if (!notes.length) return 0;
  const weighted = notes.reduce((sum, note) => sum + JUDGE_ACCURACY_SCORES[note.judge ?? "MISS"], 0);
  return clamp(Math.round(weighted / notes.length), 0, 100);
}

export function HammerGame({ onComplete }: HammerGameProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [countdown, setCountdown] = useState(3);
  const [isPreparing, setIsPreparing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [notes, setNotes] = useState<MoleNote[]>([]);
  const [holeLayout, setHoleLayout] = useState<HolePosition[]>(() => generateScatteredHoleLayout());
  const [effects, setEffects] = useState<HitEffect[]>([]);
  const [swings, setSwings] = useState<HammerSwing[]>([]);
  const [timelineMs, setTimelineMs] = useState(0);
  const [trackDurationMs, setTrackDurationMs] = useState(0);

  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [activeHole, setActiveHole] = useState<number | null>(null);
  const [screenFlash, setScreenFlash] = useState<{ color: string; id: number } | null>(null);
  const [mistapPenalty, setMistapPenalty] = useState(0);
  const [comboBurst, setComboBurst] = useState<ComboBurst | null>(null);

  const [judgeStats, setJudgeStats] = useState<Record<HitJudge, number>>({
    PERFECT: 0,
    GREAT: 0,
    GOOD: 0,
    MISS: 0,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>();
  const countdownTimersRef = useRef<number[]>([]);
  const completeTimerRef = useRef<number>();

  const notesRef = useRef<MoleNote[]>([]);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const mistapPenaltyRef = useRef(0);
  const scoreRef = useRef(0);
  const effectIdRef = useRef(0);
  const swingIdRef = useRef(0);
  const flashIdRef = useRef(0);
  const comboBurstIdRef = useRef(0);
  const endGuardRef = useRef(false);
  const beatIndexRef = useRef(0);

  const accuracy = useMemo(() => calculateAccuracyPercent(notes), [notes]);

  const clearTimers = useCallback(() => {
    for (const timerId of countdownTimersRef.current) {
      window.clearTimeout(timerId);
    }
    countdownTimersRef.current = [];

    if (completeTimerRef.current) {
      window.clearTimeout(completeTimerRef.current);
      completeTimerRef.current = undefined;
    }
  }, []);

  const stopPlayback = useCallback(
    (resetAudio: boolean) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      clearTimers();

      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        if (resetAudio) {
          audio.currentTime = 0;
        }
      }
    },
    [clearTimers]
  );

  const scheduleTimer = useCallback((delayMs: number, handler: () => void) => {
    const timerId = window.setTimeout(handler, delayMs);
    countdownTimersRef.current.push(timerId);
  }, []);

  const applyScoreDelta = useCallback((delta: number) => {
    scoreRef.current = clamp(scoreRef.current + delta, 0, HAMMER_STAGE_MAX_SCORE);
    setScore(scoreRef.current);
  }, []);

  const ensureAudioReady = useCallback(async (): Promise<{ audio: HTMLAudioElement; durationMs: number }> => {
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(moleTrack);
      audio.preload = "auto";
      audioRef.current = audio;
    }

    if (audio.readyState >= 1 && Number.isFinite(audio.duration) && audio.duration > 0) {
      return { audio, durationMs: audio.duration * 1000 };
    }

    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("audio-load-failed"));
      };
      const cleanup = () => {
        audio!.removeEventListener("loadedmetadata", onReady);
        audio!.removeEventListener("canplaythrough", onReady);
        audio!.removeEventListener("error", onError);
      };

      audio!.addEventListener("loadedmetadata", onReady);
      audio!.addEventListener("canplaythrough", onReady);
      audio!.addEventListener("error", onError);
      audio!.load();
    });

    const durationMs = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : 90000;
    return { audio, durationMs };
  }, []);

  const pushHitEffect = useCallback(
    (hole: number, judge: HitJudge) => {
      const effectId = effectIdRef.current++;
      setEffects((prev) => [...prev, { id: effectId, hole, judge }]);

      const flashId = flashIdRef.current++;
      setScreenFlash({ color: JUDGE_COLORS[judge], id: flashId });

      scheduleTimer(160, () => {
        setScreenFlash((prev) => (prev?.id === flashId ? null : prev));
      });
      scheduleTimer(430, () => {
        setEffects((prev) => prev.filter((effect) => effect.id !== effectId));
      });
    },
    [scheduleTimer]
  );

  const triggerSwing = useCallback(
    (hole: number) => {
      const swingId = swingIdRef.current++;
      setSwings((prev) => [...prev, { id: swingId, hole }]);
      scheduleTimer(210, () => {
        setSwings((prev) => prev.filter((swing) => swing.id !== swingId));
      });
    },
    [scheduleTimer]
  );

  const finishRun = useCallback(() => {
    if (endGuardRef.current) return;
    endGuardRef.current = true;

    stopPlayback(false);

    const computedFinal = clamp(Math.round(scoreRef.current), 0, HAMMER_STAGE_MAX_SCORE);
    const resultScore100 = Math.round((computedFinal / HAMMER_STAGE_MAX_SCORE) * HAMMER_RESULT_MAX_SCORE);
    setFinalScore(computedFinal);
    setTimelineMs(trackDurationMs > 0 ? trackDurationMs : timelineMs);
    setPhase("results");

    completeTimerRef.current = window.setTimeout(() => {
      onComplete(resultScore100);
    }, 2200);
  }, [onComplete, stopPlayback, timelineMs, trackDurationMs]);

  const handleHoleTap = useCallback(
    (hole: number) => {
      if (phase !== "playing") return;

      const audio = audioRef.current;
      if (!audio) return;

      setActiveHole(hole);
      window.setTimeout(() => setActiveHole((prev) => (prev === hole ? null : prev)), 140);
      triggerSwing(hole);

      const elapsed = audio.currentTime * 1000;
      let bestIndex = -1;
      let bestDiff = Number.POSITIVE_INFINITY;

      for (let i = 0; i < notesRef.current.length; i += 1) {
        const note = notesRef.current[i];
        if (note.hole !== hole || note.hit || note.missed) continue;

        const window = getNoteWindow(note.time);
        if (elapsed < window.appearAt || elapsed > window.disappearAt) continue;

        const diff = Math.abs(elapsed - note.time);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIndex = i;
        }
      }

      if (bestIndex < 0) {
        comboRef.current = 0;
        setCombo(0);
        mistapPenaltyRef.current += 1;
        setMistapPenalty(mistapPenaltyRef.current);
        applyScoreDelta(-MISTAP_DEDUCTION);
        setJudgeStats((prev) => ({ ...prev, MISS: prev.MISS + 1 }));
        pushHitEffect(hole, "MISS");
        sfxHammerMiss();
        return;
      }

      let judge: Exclude<HitJudge, "MISS">;
      if (bestDiff <= HIT_WINDOW_MS.PERFECT) judge = "PERFECT";
      else if (bestDiff <= HIT_WINDOW_MS.GREAT) judge = "GREAT";
      else judge = "GOOD"; // 화면에 보이는 타이밍이면 최소 GOOD 처리

      const updatedNotes = notesRef.current.map((note, index) =>
        index === bestIndex ? { ...note, hit: true, judge } : note
      );
      notesRef.current = updatedNotes;
      setNotes(updatedNotes);

      setJudgeStats((prev) => ({ ...prev, [judge]: prev[judge] + 1 }));

      const nextCombo = comboRef.current + 1;
      comboRef.current = nextCombo;
      setCombo(nextCombo);
      if (nextCombo > maxComboRef.current) {
        maxComboRef.current = nextCombo;
        setMaxCombo(nextCombo);
      }

      const multiplier = 1 + Math.min(0.9, (nextCombo - 1) * 0.025);
      const gained = Math.round(JUDGE_POINT_SCORES[judge] * multiplier);
      applyScoreDelta(gained);

      pushHitEffect(hole, judge);
      sfxHammerPeg();
    },
    [phase, pushHitEffect, triggerSwing, applyScoreDelta]
  );

  const startGame = useCallback(async () => {
    if (isPreparing || phase === "playing" || phase === "countdown") return;

    setLoadError(null);
    setIsPreparing(true);
    endGuardRef.current = false;

    stopPlayback(true);

    try {
      const { audio } = await ensureAudioReady();
      const generated = generateMoleChart(GAME_DURATION_MS);

      notesRef.current = generated;
      setNotes(generated);
      setHoleLayout(generateScatteredHoleLayout());
      setEffects([]);
      setSwings([]);
      setTrackDurationMs(GAME_DURATION_MS);

      comboRef.current = 0;
      maxComboRef.current = 0;
      mistapPenaltyRef.current = 0;
      scoreRef.current = 0;
      setCombo(0);
      setMaxCombo(0);
      setMistapPenalty(0);
      setScore(0);
      setFinalScore(0);
      setTimelineMs(0);
      setJudgeStats({ PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 });

      setPhase("countdown");
      setCountdown(3);
      sfxCountdownTick(3);

      scheduleTimer(850, () => {
        setCountdown(2);
        sfxCountdownTick(2);
      });
      scheduleTimer(1700, () => {
        setCountdown(1);
        sfxCountdownTick(1);
      });
      scheduleTimer(2550, () => {
        const beginPlayback = async () => {
          try {
            audio.currentTime = 0;
            audio.loop = true;
            await audio.play();
            setPhase("playing");
            setIsPreparing(false);
            beatIndexRef.current = 0;

            const runLoop = () => {
              if (endGuardRef.current) return;

              const elapsed = audio.currentTime * 1000;
              setTimelineMs(elapsed);

              while (
                beatIndexRef.current < notesRef.current.length &&
                elapsed >= notesRef.current[beatIndexRef.current].time - 26
              ) {
                sfxHammerBeat();
                beatIndexRef.current += 1;
              }

              let changed = false;
              const missedHoles: number[] = [];

              const updated = notesRef.current.map((note) => {
                if (note.hit || note.missed) return note;
                const window = getNoteWindow(note.time);
                if (elapsed > window.disappearAt + 40) {
                  changed = true;
                  missedHoles.push(note.hole);
                  return { ...note, missed: true, judge: "MISS" as const };
                }
                return note;
              });

              if (changed) {
                notesRef.current = updated;
                setNotes(updated);
                comboRef.current = 0;
                setCombo(0);
                setJudgeStats((prev) => ({ ...prev, MISS: prev.MISS + missedHoles.length }));

                missedHoles.slice(0, 3).forEach((hole) => {
                  pushHitEffect(hole, "MISS");
                });
                sfxHammerMiss();
              }

              const shouldFinishByDuration = elapsed >= GAME_DURATION_MS;

              if (shouldFinishByDuration) {
                finishRun();
                return;
              }

              rafRef.current = requestAnimationFrame(runLoop);
            };

            rafRef.current = requestAnimationFrame(runLoop);
          } catch {
            setLoadError("오디오 재생을 시작하지 못했어요. 다시 시도해 주세요.");
            setPhase("ready");
            setIsPreparing(false);
          }
        };

        void beginPlayback();
      });
    } catch {
      setLoadError("두더지게임 오디오 파일을 불러오지 못했어요.");
      setPhase("ready");
      setIsPreparing(false);
    }
  }, [ensureAudioReady, finishRun, isPreparing, phase, scheduleTimer, stopPlayback, pushHitEffect, applyScoreDelta]);

  useEffect(() => {
    if (phase !== "playing") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      const keyMap: Record<string, number> = {
        "1": 0,
        "2": 1,
        "3": 2,
        "4": 3,
        "5": 4,
        "6": 5,
        "7": 6,
        "8": 7,
        "9": 8,
        "0": 9,
      };

      const mapped = keyMap[key];
      if (mapped === undefined) return;
      event.preventDefault();
      handleHoleTap(mapped);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, handleHoleTap]);

  useEffect(() => {
    if (phase !== "playing" || combo < 5) return;
    const id = comboBurstIdRef.current++;
    const label: ComboBurst["label"] =
      combo >= 26 ? "OVERDRIVE" : combo >= 14 ? "FEVER" : "COMBO";
    const angle = (Math.random() - 0.5) * 14;
    const x = (Math.random() - 0.5) * 34;
    const y = (Math.random() - 0.5) * 18;

    setComboBurst({ id, combo, label, angle, x, y });
    const timerId = window.setTimeout(() => {
      setComboBurst((prev) => (prev?.id === id ? null : prev));
    }, 260);
    return () => window.clearTimeout(timerId);
  }, [combo, phase]);

  useEffect(() => {
    // 이전 스테이지에서 남은 공용 BGM을 정리하고 시작한다.
    stopBGM();
    return () => {
      stopPlayback(true);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, [stopPlayback]);

  const visibleMoles = useMemo(() => {
    const map = new Map<number, { pop: number; noteTime: number; noteId: number }>();

    for (const note of notes) {
      if (note.hit || note.missed) continue;

      const { appearAt, fullyShownFrom, fullyShownTo, disappearAt } = getNoteWindow(note.time);
      if (timelineMs < appearAt || timelineMs > disappearAt) continue;

      let pop = 0;
      if (timelineMs < fullyShownFrom) {
        pop = clamp((timelineMs - appearAt) / MOLE_SHOW_MS, 0, 1);
      } else if (timelineMs <= fullyShownTo) {
        pop = 1;
      } else {
        pop = clamp(1 - (timelineMs - fullyShownTo) / MOLE_HIDE_MS, 0, 1);
      }

      const prev = map.get(note.hole);
      if (!prev || Math.abs(note.time - timelineMs) < Math.abs(prev.noteTime - timelineMs)) {
        map.set(note.hole, { pop, noteTime: note.time, noteId: note.id });
      }
    }

    return map;
  }, [notes, timelineMs]);

  const elapsedSeconds = Math.floor(timelineMs / 1000);
  const totalSeconds = Math.max(1, Math.floor(trackDurationMs / 1000));

  return (
    <div
      className="size-full flex flex-col relative overflow-hidden select-none"
      style={{
        background:
          "radial-gradient(circle at 18% 12%, #2E8BFF 0%, #182E66 28%, #0C1632 60%, #070C1E 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(125deg, rgba(110,231,255,0.16) 0%, rgba(110,231,255,0) 32%, rgba(255,85,221,0.2) 100%)",
        }}
        animate={{ opacity: [0.24, 0.55, 0.24] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />

      <AnimatePresence>
        {screenFlash && (
          <motion.div
            key={screenFlash.id}
            className="absolute inset-0 pointer-events-none z-40"
            style={{ background: screenFlash.color, mixBlendMode: "screen" }}
            initial={{ opacity: 0.56 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {comboBurst && phase === "playing" && (
          <motion.div
            key={comboBurst.id}
            className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 1.65, y: 22, rotate: comboBurst.angle }}
              animate={{ scale: [1.65, 1, 0.8], y: [22, comboBurst.y, -32], x: [0, comboBurst.x, comboBurst.x * 1.15], rotate: [comboBurst.angle, comboBurst.angle * 0.35, 0] }}
              transition={{ duration: 0.26, ease: "easeOut" }}
            >
              <p
                style={{
                  fontSize: 16,
                  letterSpacing: 2.8,
                  color: comboBurst.label === "OVERDRIVE" ? "#FF8AF4" : comboBurst.label === "FEVER" ? "#FFE082" : "#B2F5FF",
                  textShadow:
                    comboBurst.label === "OVERDRIVE"
                      ? "0 0 12px rgba(255,138,244,0.9), 0 0 26px rgba(96,195,255,0.6)"
                      : comboBurst.label === "FEVER"
                      ? "0 0 10px rgba(255,224,130,0.95), 0 0 22px rgba(96,195,255,0.5)"
                      : "0 0 9px rgba(178,245,255,0.95), 0 0 18px rgba(96,195,255,0.45)",
                }}
              >
                {comboBurst.label}
              </p>
              <p
                style={{
                  fontSize: 56,
                  fontWeight: 800,
                  lineHeight: 0.95,
                  color: "#FFFFFF",
                  textShadow:
                    "0 0 14px rgba(255,255,255,0.95), 0 0 34px rgba(96,195,255,0.75), 0 0 52px rgba(255,84,208,0.55)",
                }}
              >
                x{comboBurst.combo}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full px-4 pt-4 pb-2 z-20">
        <h2 style={{ fontSize: 21, color: "#D9F6FF", textShadow: "0 0 12px rgba(62,203,255,0.55)" }}>
          🔨 네오 리듬 두더지
        </h2>
        <p style={{ fontSize: 13, color: "#9FDBFF" }}>비트에 맞춰 포털에서 튀어나오는 두더지를 정확히 타격하세요!</p>

        <div className="mt-2 grid grid-cols-4 gap-2">
          {(
            [
              { label: "SCORE", value: `${score.toLocaleString()} / ${HAMMER_STAGE_MAX_SCORE}`, color: "#FF8C00" },
              { label: "COMBO", value: `${combo}x`, color: combo >= 10 ? "#FF5E62" : "#6B4328" },
              { label: "ACC", value: `${accuracy}%`, color: "#1C8CCF" },
              { label: "진행(초)", value: `${elapsedSeconds}s / ${totalSeconds}s`, color: "#4D9E57" },
            ] as const
          ).map((item) => (
            <div
              key={item.label}
              className="rounded-xl px-2 py-2 text-center"
              style={{ background: "rgba(10,20,50,0.78)", border: `2px solid ${item.color}88`, boxShadow: `0 0 12px ${item.color}33` }}
            >
              <p style={{ fontSize: 10, color: "#9FC9FF" }}>{item.label}</p>
              <p style={{ fontSize: 16, color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pb-4 z-20">
        <motion.div
          className="relative w-full h-full rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #10284F, #0B1B3A 58%, #08152F)",
            border: "4px solid #3ECBFF",
            boxShadow: "inset 0 10px 30px rgba(6,20,54,0.55), 0 0 26px rgba(62,203,255,0.35)",
          }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 20%, rgba(137,255,255,0.3) 0%, rgba(255,255,255,0) 56%)",
            }}
            animate={{ opacity: [0.22, 0.52, 0.22] }}
            transition={{ duration: 0.72, repeat: Infinity }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(110,231,255,0.24) 1px, transparent 1px), linear-gradient(90deg, rgba(110,231,255,0.2) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
            }}
          />

          <div className="absolute inset-0 p-3">
            {holeLayout.map((layout, hole) => {
              const mole = visibleMoles.get(hole);
              const holeEffects = effects.filter((effect) => effect.hole === hole);
              const holeSwings = swings.filter((swing) => swing.hole === hole);
              const isActive = activeHole === hole;

              return (
                <motion.button
                  key={hole}
                  type="button"
                  className="absolute"
                  style={{
                    left: `${layout.x}%`,
                    top: `${layout.y}%`,
                    width: `${HOLE_DIAMETER_PERCENT}%`,
                    aspectRatio: "1 / 1",
                    transform: "translate(-50%, -50%)",
                    borderRadius: 999,
                    cursor: phase === "playing" ? "pointer" : "default",
                    touchAction: "manipulation",
                  }}
                  onPointerDown={() => handleHoleTap(hole)}
                >
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: isActive
                        ? "radial-gradient(circle at 42% 32%, #74EEFF 0%, #3AAAF4 52%, #1B3E90 100%)"
                        : "radial-gradient(circle at 42% 32%, #4DD8FF 0%, #2F78DF 52%, #1A2E75 100%)",
                      border: isActive ? "3px solid #FFD166" : "2px solid #1E5BD6",
                      boxShadow: isActive
                        ? "inset 0 2px 9px rgba(2,10,30,0.6), 0 0 14px rgba(116,238,255,0.7)"
                        : "inset 0 2px 9px rgba(2,10,30,0.55), 0 0 8px rgba(77,216,255,0.45)",
                    }}
                  />

                  <div
                    className="absolute rounded-full overflow-hidden"
                    style={{
                      inset: "12%",
                      background: "radial-gradient(circle at 50% 46%, #080E25 0%, #050A18 78%, #04070F 100%)",
                      border: "1px solid rgba(135,231,255,0.38)",
                    }}
                  >
                    <AnimatePresence>
                      {mole && (
                        <motion.div
                          className="absolute left-1/2 -translate-x-1/2"
                          style={{ bottom: "-34%", width: "82%", height: "96%" }}
                          initial={{ y: 92, scale: 0.64, opacity: 0 }}
                          animate={{
                            y: (1 - mole.pop) * 92,
                            scale: 0.64 + mole.pop * 0.36,
                            opacity: 0.78 + mole.pop * 0.22,
                          }}
                          exit={{ y: 96, opacity: 0, scale: 0.64 }}
                          transition={{ duration: 0.18 }}
                        >
                          <div
                            className="absolute left-1/2 -translate-x-1/2 rounded-full"
                            style={{
                              top: "4%",
                              width: "26%",
                              aspectRatio: "1 / 1",
                              background: "#7A4A2C",
                              border: "2px solid #412311",
                            }}
                          />
                          <div
                            className="absolute rounded-full"
                            style={{
                              left: "10%",
                              right: "10%",
                              bottom: "2%",
                              height: "78%",
                              background: "linear-gradient(180deg, #9E6840 0%, #6F4223 66%, #4D2D19 100%)",
                              border: "2px solid #442612",
                            }}
                          />
                          <div className="absolute rounded-full" style={{ left: "27%", top: "34%", width: "12%", aspectRatio: "1 / 1", background: "#fff" }} />
                          <div className="absolute rounded-full" style={{ right: "27%", top: "34%", width: "12%", aspectRatio: "1 / 1", background: "#fff" }} />
                          <div className="absolute rounded-full" style={{ left: "30%", top: "36%", width: "6%", aspectRatio: "1 / 1", background: "#18110A" }} />
                          <div className="absolute rounded-full" style={{ right: "30%", top: "36%", width: "6%", aspectRatio: "1 / 1", background: "#18110A" }} />
                          <div
                            className="absolute left-1/2 -translate-x-1/2 rounded-full"
                            style={{
                              top: "52%",
                              width: "22%",
                              height: "12%",
                              background: "#E7B28B",
                              border: "1px solid #A96E49",
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {holeSwings.map((swing) => (
                      <motion.div
                        key={swing.id}
                        className="absolute left-1/2 -translate-x-1/2 text-4xl"
                        style={{ top: "-52%" }}
                        initial={{ y: -24, rotate: -40, opacity: 0 }}
                        animate={{ y: 16, rotate: 12, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.16 }}
                      >
                        🔨
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <AnimatePresence>
                    {holeEffects.map((effect) => (
                      <motion.div
                        key={effect.id}
                        className="absolute inset-0 pointer-events-none"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <motion.div
                          className="absolute left-1/2 -translate-x-1/2 rounded-full"
                          style={{
                            top: "50%",
                            width: 18,
                            height: 18,
                            background: JUDGE_COLORS[effect.judge],
                            filter: "blur(1px)",
                          }}
                          initial={{ scale: 0.2, opacity: 0.75 }}
                          animate={{ scale: 3.4, opacity: 0 }}
                          transition={{ duration: 0.28 }}
                        />
                        {Array.from({ length: effect.judge === "PERFECT" ? 18 : effect.judge === "GREAT" ? 14 : 11 }).map((_, idx, list) => {
                          const angle = (Math.PI * 2 * idx) / list.length;
                          const radius =
                            effect.judge === "PERFECT"
                              ? 78
                              : effect.judge === "GREAT"
                              ? 62
                              : 54;
                          return (
                            <motion.span
                              key={`${effect.id}-${idx}`}
                              className="absolute rounded-full"
                              style={{
                                left: "50%",
                                top: "50%",
                                width: effect.judge === "PERFECT" ? 6 : 5,
                                height: effect.judge === "PERFECT" ? 6 : 5,
                                background: JUDGE_COLORS[effect.judge],
                                boxShadow: `0 0 10px ${JUDGE_COLORS[effect.judge]}`,
                              }}
                              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                              animate={{
                                x: Math.cos(angle) * radius,
                                y: Math.sin(angle) * radius - 18,
                                opacity: 0,
                                scale: 0.3,
                              }}
                              transition={{ duration: 0.35, ease: "easeOut" }}
                            />
                          );
                        })}
                        <motion.div
                          className="absolute left-1/2 -translate-x-1/2"
                          style={{
                            top: "-34%",
                            color: JUDGE_COLORS[effect.judge],
                            fontSize: effect.judge === "PERFECT" ? 16 : 14,
                            textShadow: `0 0 12px ${JUDGE_COLORS[effect.judge]}`,
                          }}
                          initial={{ y: 0, opacity: 1, scale: 0.8 }}
                          animate={{ y: -26, opacity: 0, scale: 1.2 }}
                          transition={{ duration: 0.4 }}
                        >
                          {effect.judge}
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {phase === "countdown" && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center z-40"
                style={{ background: "rgba(5,10,28,0.62)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  key={countdown}
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(6,23,49,0.92)", border: "4px solid #6EE7FF", boxShadow: "0 0 20px rgba(110,231,255,0.5)" }}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.3, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <span style={{ fontSize: 44, color: "#D9F6FF" }}>{countdown}</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {phase === "ready" && (
            <div className="absolute inset-0 flex items-center justify-center p-6 z-30">
              <div
                className="w-full rounded-2xl p-5 text-center"
                style={{ background: "rgba(8,22,50,0.9)", border: "3px solid #48CAFF", boxShadow: "0 0 24px rgba(72,202,255,0.32)" }}
              >
                <p style={{ fontSize: 24, color: "#D9F6FF" }}>🎯 네오 리듬 두더지!</p>
                <p className="mt-2" style={{ fontSize: 14, color: "#A8DBFF", lineHeight: 1.65 }}>
                  점수는 타격 성공 시 누적되어 올라갑니다.
                  <br />
                  헛손질하면 {MISTAP_DEDUCTION}점 차감됩니다.
                  <br />
                  노래 박자에 맞춰 두더지를 정확하게 탭하세요.
                </p>
                <p style={{ fontSize: 12, color: "#8AC8F5", marginTop: 8 }}>
                  조작: 홀 터치 또는 키보드 1~0
                </p>
                {loadError && (
                  <p style={{ fontSize: 12, color: "#C62828", marginTop: 8 }}>{loadError}</p>
                )}
                <motion.button
                  className="w-full mt-4 py-4 rounded-xl text-white"
                  style={{
                    background: isPreparing
                      ? "linear-gradient(180deg, #9E9E9E, #7E7E7E)"
                      : "linear-gradient(180deg, #FF8C00, #E8740C)",
                    border: "3px solid #B8560B",
                    boxShadow: "0 6px 14px rgba(232,116,12,0.35)",
                    fontSize: 20,
                  }}
                  onClick={startGame}
                  disabled={isPreparing}
                  whileTap={isPreparing ? undefined : { scale: 0.96 }}
                >
                  {isPreparing ? "오디오 준비 중..." : "🔨 두더지 시작"}
                </motion.button>
              </div>
            </div>
          )}

          {phase === "results" && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center p-6 z-40"
              style={{ background: "rgba(5,10,28,0.62)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="w-full rounded-2xl p-6 text-center"
                style={{
                  background: "linear-gradient(180deg, rgba(8,22,50,0.95), rgba(10,36,70,0.95))",
                  border: "4px solid #6EE7FF",
                  boxShadow: "0 0 30px rgba(110,231,255,0.45)",
                }}
                initial={{ scale: 0.75, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 180, damping: 16 }}
              >
                <p style={{ fontSize: 16, color: "#A9DBFF" }}>리듬 두더지 완료!</p>
                <p style={{ fontSize: 34, color: "#E6FAFF", marginTop: 6, textShadow: "0 0 16px rgba(110,231,255,0.45)" }}>
                  {finalScore} / {HAMMER_STAGE_MAX_SCORE}점
                </p>
                <p style={{ fontSize: 13, color: "#A9DBFF", marginTop: 4 }}>
                  PERFECT {judgeStats.PERFECT} / GREAT {judgeStats.GREAT} / GOOD {judgeStats.GOOD} / MISS {judgeStats.MISS}
                </p>
                <p style={{ fontSize: 12, color: "#89C7EE", marginTop: 4 }}>
                  최대 콤보 x{maxCombo} · 헛스윙 {mistapPenalty}회
                </p>
                <p style={{ fontSize: 12, color: "#89C7EE", marginTop: 2 }}>
                  리절트 전달 점수: {Math.round((finalScore / HAMMER_STAGE_MAX_SCORE) * HAMMER_RESULT_MAX_SCORE)} / {HAMMER_RESULT_MAX_SCORE}
                </p>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>

      <div className="w-full px-4 pb-5 z-20">
        <div className="mb-2 flex items-center justify-between" style={{ fontSize: 12, color: "#A9DBFF" }}>
          <span>트랙: 두더지게임.mp3</span>
          <span>{phase === "playing" ? "망치 타격 효과 ON" : ""}</span>
        </div>
        {phase === "playing" && combo >= 12 && (
          <motion.div
            className="w-full py-2 rounded-xl text-center"
            style={{
              background: "linear-gradient(90deg, rgba(255,82,82,0.88), rgba(255,213,79,0.92), rgba(126,217,87,0.88))",
              border: "2px solid rgba(255,255,255,0.45)",
              boxShadow: "0 0 24px rgba(255,213,79,0.42)",
              color: "#2A1608",
              fontSize: 14,
              letterSpacing: 1,
            }}
            animate={{ scale: [1, 1.03, 1], opacity: [0.82, 1, 0.82] }}
            transition={{ duration: 0.45, repeat: Infinity }}
          >
            SUPER WHACK COMBO x{combo}
          </motion.div>
        )}
      </div>
    </div>
  );
}
