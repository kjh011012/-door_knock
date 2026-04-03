import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import rhythmTrack from "../../assets/woodpecker/rhythm-bgm.mp3";
import { sfxCountdownTick, sfxRhythmTap } from "./tetris-sounds";

interface RhythmGameProps {
  onComplete: (score: number) => void;
}

type Phase = "intro" | "countdown" | "playing" | "results";
type HitJudge = "PERFECT" | "GREAT" | "GOOD" | "MISS";

interface Note {
  id: number;
  lane: number;
  time: number;
  hit: boolean;
  missed: boolean;
  judge?: HitJudge;
}

interface HitEffect {
  id: number;
  lane: number;
  judge: HitJudge;
}

interface ScreenFlash {
  id: number;
  color: string;
  opacity: number;
}

const LANE_COUNT = 3;
const LANE_COLORS = ["#FF6B6B", "#FFD93D", "#6BCB77"];
const LANE_EMOJIS = ["🥁", "⭐", "🔔"];

const HIT_WINDOW_MS = {
  PERFECT: 45,
  GREAT: 95,
  GOOD: 150,
};

const NOTE_TRAVEL_MS = 1900;
const SONG_PADDING_END_MS = 700;
const RHYTHM_STAGE_MAX_SCORE = 2500;
const RHYTHM_RESULT_MAX_SCORE = 100;
const MISTAP_DEDUCTION = 50;
const NOTE_MISS_DEDUCTION = 35;
const INPUT_TIMING_OFFSET_MS = 35;
const LATE_HIT_BONUS_WINDOW_MS = 80;

const JUDGE_ACCURACY_SCORES: Record<HitJudge, number> = {
  PERFECT: 100,
  GREAT: 75,
  GOOD: 45,
  MISS: 0,
};

const JUDGE_COLORS: Record<HitJudge, string> = {
  PERFECT: "#FFD700",
  GREAT: "#4CAF50",
  GOOD: "#4FC3F7",
  MISS: "#FF5252",
};

const JUDGE_INTENSITY: Record<HitJudge, number> = {
  PERFECT: 1,
  GREAT: 0.8,
  GOOD: 0.62,
  MISS: 0.45,
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

function generateTrackNotes(durationMs: number): Note[] {
  const safeDuration = Number.isFinite(durationMs) && durationMs > 12000 ? durationMs : 90000;
  const startMs = 1800;
  const endMs = Math.max(startMs + 24000, safeDuration - 1200);
  const beatMs = 60000 / 140;
  const rng = createSeededRng(Math.floor(safeDuration));

  const notes: Note[] = [];
  let id = 0;
  let time = startMs;
  let lastLane = 1;

  while (time < endMs) {
    const progress = (time - startMs) / Math.max(1, endMs - startMs);
    const spawnChance = progress < 0.22 ? 0.74 : progress < 0.55 ? 0.86 : progress < 0.82 ? 0.93 : 0.98;

    if (rng() <= spawnChance) {
      let lane = Math.floor(rng() * LANE_COUNT);
      if (lane === lastLane && rng() < 0.55) {
        lane = (lane + 1 + Math.floor(rng() * 2)) % LANE_COUNT;
      }

      notes.push({
        id: id++,
        lane,
        time,
        hit: false,
        missed: false,
      });
      lastLane = lane;

      const chordChance = progress < 0.45 ? 0.06 : progress < 0.75 ? 0.14 : 0.22;
      if (rng() < chordChance) {
        const chordLane = (lane + 1 + Math.floor(rng() * 2)) % LANE_COUNT;
        notes.push({
          id: id++,
          lane: chordLane,
          time,
          hit: false,
          missed: false,
        });
      }

      const offbeatChance = progress < 0.35 ? 0.08 : progress < 0.7 ? 0.18 : 0.28;
      const offbeatTime = time + beatMs * 0.5;
      if (rng() < offbeatChance && offbeatTime < endMs) {
        let offLane = Math.floor(rng() * LANE_COUNT);
        if (offLane === lane) offLane = (offLane + 1) % LANE_COUNT;
        notes.push({
          id: id++,
          lane: offLane,
          time: offbeatTime,
          hit: false,
          missed: false,
        });
      }
    }

    time += beatMs;
  }

  notes.sort((a, b) => (a.time === b.time ? a.id - b.id : a.time - b.time));
  return notes;
}

function calculateAccuracyPercent(notes: Note[]): number {
  if (!notes.length) return 0;
  const weighted = notes.reduce((sum, note) => sum + JUDGE_ACCURACY_SCORES[note.judge ?? "MISS"], 0);
  return clamp(Math.round(weighted / notes.length), 0, 100);
}

export function RhythmGame({ onComplete }: RhythmGameProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [countdown, setCountdown] = useState(3);
  const [isPreparing, setIsPreparing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [effects, setEffects] = useState<HitEffect[]>([]);
  const [progress, setProgress] = useState(0);
  const [timelineMs, setTimelineMs] = useState(0);
  const [trackDurationMs, setTrackDurationMs] = useState(0);

  const [score, setScore] = useState(RHYTHM_STAGE_MAX_SCORE);
  const [finalScore, setFinalScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [activeLanes, setActiveLanes] = useState<boolean[]>(() =>
    Array.from({ length: LANE_COUNT }, () => false)
  );
  const [laneEnergy, setLaneEnergy] = useState<number[]>([0, 0, 0]);
  const [cameraKick, setCameraKick] = useState({ x: 0, y: 0, scale: 1 });
  const [screenFlash, setScreenFlash] = useState<ScreenFlash | null>(null);

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

  const notesRef = useRef<Note[]>([]);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const scoreRef = useRef(RHYTHM_STAGE_MAX_SCORE);
  const effectIdRef = useRef(0);
  const flashIdRef = useRef(0);
  const endGuardRef = useRef(false);
  const lastUiTickRef = useRef(0);

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

  const scheduleCountdownTimer = useCallback((delayMs: number, handler: () => void) => {
    const timerId = window.setTimeout(handler, delayMs);
    countdownTimersRef.current.push(timerId);
  }, []);

  const applyScoreDelta = useCallback((delta: number) => {
    scoreRef.current = clamp(scoreRef.current + delta, 0, RHYTHM_STAGE_MAX_SCORE);
    setScore(scoreRef.current);
  }, []);

  const triggerImpactFX = useCallback(
    (lane: number, judge: HitJudge) => {
      const intensity = JUDGE_INTENSITY[judge];

      setLaneEnergy((prev) => {
        const next = [...prev];
        next[lane] = Math.max(next[lane], intensity);
        return next;
      });

      scheduleCountdownTimer(200, () => {
        setLaneEnergy((prev) => {
          const next = [...prev];
          next[lane] = Math.max(0, next[lane] - 0.45);
          return next;
        });
      });
      scheduleCountdownTimer(430, () => {
        setLaneEnergy((prev) => {
          const next = [...prev];
          next[lane] = Math.max(0, next[lane] - 0.55);
          return next;
        });
      });

      const flashId = flashIdRef.current++;
      const flashOpacity =
        judge === "PERFECT" ? 0.62 : judge === "GREAT" ? 0.5 : judge === "GOOD" ? 0.38 : 0.28;
      setScreenFlash({ id: flashId, color: JUDGE_COLORS[judge], opacity: flashOpacity });
      scheduleCountdownTimer(130, () => {
        setScreenFlash((prev) => (prev?.id === flashId ? null : prev));
      });

      const kickStrength = judge === "PERFECT" ? 1 : judge === "GREAT" ? 0.82 : judge === "GOOD" ? 0.66 : 0.5;
      setCameraKick({
        x: (Math.random() - 0.5) * 16 * kickStrength,
        y: -7 * kickStrength,
        scale: 1 + 0.02 * kickStrength,
      });
      scheduleCountdownTimer(110, () => {
        setCameraKick({ x: 0, y: 0, scale: 1 });
      });
    },
    [scheduleCountdownTimer]
  );

  const ensureAudioReady = useCallback(async (): Promise<{ audio: HTMLAudioElement; durationMs: number }> => {
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(rhythmTrack);
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

  const finishRun = useCallback(() => {
    if (endGuardRef.current) return;
    endGuardRef.current = true;

    stopPlayback(false);

    const computedFinal = clamp(Math.round(scoreRef.current), 0, RHYTHM_STAGE_MAX_SCORE);
    const resultScore100 = Math.round((computedFinal / RHYTHM_STAGE_MAX_SCORE) * RHYTHM_RESULT_MAX_SCORE);
    setFinalScore(computedFinal);
    setProgress(100);
    setTimelineMs(trackDurationMs > 0 ? trackDurationMs : timelineMs);
    setPhase("results");

    completeTimerRef.current = window.setTimeout(() => {
      onComplete(resultScore100);
    }, 2200);
  }, [onComplete, stopPlayback, trackDurationMs, timelineMs]);

  const handleLaneTap = useCallback(
    (lane: number) => {
      if (phase !== "playing") return;

      const audio = audioRef.current;
      if (!audio) return;

      sfxRhythmTap(lane);
      setActiveLanes((prev) => {
        const next = [...prev];
        next[lane] = true;
        return next;
      });
      scheduleCountdownTimer(120, () => {
        setActiveLanes((prev) => {
          const next = [...prev];
          next[lane] = false;
          return next;
        });
      });

      const elapsed = audio.currentTime * 1000 - INPUT_TIMING_OFFSET_MS;
      let bestIndex = -1;
      let bestDiff = Number.POSITIVE_INFINITY;

      for (let i = 0; i < notesRef.current.length; i++) {
        const note = notesRef.current[i];
        if (note.lane !== lane || note.hit || note.missed) continue;

        const delta = elapsed - note.time;
        const inEarlyWindow = delta >= -HIT_WINDOW_MS.GOOD;
        const inLateWindow = delta <= HIT_WINDOW_MS.GOOD + LATE_HIT_BONUS_WINDOW_MS;
        const diff = Math.abs(delta);

        if (inEarlyWindow && inLateWindow && diff < bestDiff) {
          bestDiff = diff;
          bestIndex = i;
        }
      }

      if (bestIndex < 0) {
        const missEffectId = effectIdRef.current++;
        setEffects((prev) => [...prev, { id: missEffectId, lane, judge: "MISS" }]);
        scheduleCountdownTimer(560, () => {
          setEffects((prev) => prev.filter((effect) => effect.id !== missEffectId));
        });
        triggerImpactFX(lane, "MISS");
        setJudgeStats((prev) => ({ ...prev, MISS: prev.MISS + 1 }));
        applyScoreDelta(-MISTAP_DEDUCTION);
        if (comboRef.current > 0) {
          comboRef.current = 0;
          setCombo(0);
        }
        return;
      }

      let judge: Exclude<HitJudge, "MISS">;
      if (bestDiff <= HIT_WINDOW_MS.PERFECT) judge = "PERFECT";
      else if (bestDiff <= HIT_WINDOW_MS.GREAT) judge = "GREAT";
      else judge = "GOOD";

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

      const effectId = effectIdRef.current++;
      setEffects((prev) => [...prev, { id: effectId, lane, judge }]);
      scheduleCountdownTimer(560, () => {
        setEffects((prev) => prev.filter((effect) => effect.id !== effectId));
      });
      triggerImpactFX(lane, judge);
    },
    [phase, scheduleCountdownTimer, triggerImpactFX, applyScoreDelta]
  );

  const startGame = useCallback(async () => {
    if (isPreparing || phase === "playing" || phase === "countdown") return;

    setLoadError(null);
    setIsPreparing(true);
    endGuardRef.current = false;

    stopPlayback(true);

    try {
      const { audio, durationMs } = await ensureAudioReady();
      const generatedNotes = generateTrackNotes(durationMs);

      notesRef.current = generatedNotes;
      setNotes(generatedNotes);
      setEffects([]);
      setTrackDurationMs(durationMs);

      comboRef.current = 0;
      maxComboRef.current = 0;
      scoreRef.current = RHYTHM_STAGE_MAX_SCORE;
      setCombo(0);
      setMaxCombo(0);
      setScore(RHYTHM_STAGE_MAX_SCORE);
      setFinalScore(0);
      setProgress(0);
      setTimelineMs(0);
      setJudgeStats({ PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 });
      setLaneEnergy([0, 0, 0]);
      setCameraKick({ x: 0, y: 0, scale: 1 });
      setScreenFlash(null);
      lastUiTickRef.current = 0;

      setPhase("countdown");
      setCountdown(3);
      sfxCountdownTick(3);

      scheduleCountdownTimer(850, () => {
        setCountdown(2);
        sfxCountdownTick(2);
      });
      scheduleCountdownTimer(1700, () => {
        setCountdown(1);
        sfxCountdownTick(1);
      });
      scheduleCountdownTimer(2550, () => {
        const beginPlayback = async () => {
          try {
            audio.currentTime = 0;
            await audio.play();
            setPhase("playing");
            setIsPreparing(false);

            const runLoop = () => {
              if (endGuardRef.current) return;

              const elapsed = audio.currentTime * 1000;
              if (elapsed - lastUiTickRef.current >= 16) {
                lastUiTickRef.current = elapsed;
                setTimelineMs(elapsed);
                setProgress(clamp((elapsed / durationMs) * 100, 0, 100));
              }

              let changed = false;
              let newlyMissed = 0;
              const missedLanes: number[] = [];
              const missCutoff =
                elapsed - INPUT_TIMING_OFFSET_MS - HIT_WINDOW_MS.GOOD - LATE_HIT_BONUS_WINDOW_MS;
              const updated = notesRef.current.map((note) => {
                if (note.hit || note.missed) return note;
                if (missCutoff > note.time) {
                  changed = true;
                  newlyMissed++;
                  missedLanes.push(note.lane);
                  return { ...note, missed: true, judge: "MISS" };
                }
                return note;
              });

              if (changed) {
                notesRef.current = updated;
                setNotes(updated);
                if (newlyMissed > 0) {
                  comboRef.current = 0;
                  setCombo(0);
                  setJudgeStats((prev) => ({ ...prev, MISS: prev.MISS + newlyMissed }));
                  applyScoreDelta(-newlyMissed * NOTE_MISS_DEDUCTION);

                  missedLanes.slice(0, 3).forEach((missedLane) => {
                    const missEffectId = effectIdRef.current++;
                    setEffects((prev) => [...prev, { id: missEffectId, lane: missedLane, judge: "MISS" }]);
                    scheduleCountdownTimer(560, () => {
                      setEffects((prev) => prev.filter((effect) => effect.id !== missEffectId));
                    });
                    triggerImpactFX(missedLane, "MISS");
                  });
                }
              }

              const lastNoteTime = updated.length ? updated[updated.length - 1].time : 0;
              const allJudged = updated.every((note) => note.hit || note.missed);
              const shouldFinishByNotes = allJudged && elapsed > lastNoteTime + HIT_WINDOW_MS.GOOD + 450;
              const shouldFinishByDuration = elapsed >= durationMs + SONG_PADDING_END_MS;

              if (audio.ended || shouldFinishByNotes || shouldFinishByDuration) {
                finishRun();
                return;
              }

              rafRef.current = requestAnimationFrame(runLoop);
            };

            rafRef.current = requestAnimationFrame(runLoop);
          } catch {
            setLoadError("오디오 재생을 시작하지 못했어요. 다시 시도해 주세요.");
            setPhase("intro");
            setIsPreparing(false);
          }
        };

        void beginPlayback();
      });
    } catch {
      setLoadError("오디오 파일을 불러오지 못했어요. 파일 경로를 확인해 주세요.");
      setPhase("intro");
      setIsPreparing(false);
    }
  }, [ensureAudioReady, finishRun, isPreparing, phase, scheduleCountdownTimer, stopPlayback, triggerImpactFX, applyScoreDelta]);

  useEffect(() => {
    if (phase !== "playing") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === "a" || key === "arrowleft") {
        event.preventDefault();
        handleLaneTap(0);
      } else if (key === "s" || key === "arrowdown") {
        event.preventDefault();
        handleLaneTap(1);
      } else if (key === "d" || key === "arrowright") {
        event.preventDefault();
        handleLaneTap(2);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, handleLaneTap]);

  useEffect(() => {
    return () => {
      stopPlayback(true);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, [stopPlayback]);

  return (
    <div
      className="size-full flex flex-col relative overflow-hidden select-none"
      style={{
        background: "radial-gradient(circle at 50% 0%, #2f1f5a 0%, #1b1138 42%, #120a26 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      {phase === "intro" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            className="w-full max-w-sm text-center p-6 rounded-3xl"
            style={{
              background: "linear-gradient(180deg, rgba(255,248,220,0.96), rgba(236,207,157,0.96))",
              border: "3px solid #C07A18",
              boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
            }}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h2 style={{ fontSize: 28, color: "#5C3317", marginTop: 14 }}>리듬 톡톡 스테이지</h2>
            <p style={{ fontSize: 14, color: "#7A4A25", marginTop: 8, lineHeight: 1.7 }}>
              제공해주신 음악 트랙으로 플레이해요.
              <br />
              노트가 판정선에 닿을 때 눌러주세요.
            </p>

            <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(92,51,23,0.08)" }}>
              <p style={{ fontSize: 12, color: "#704220" }}>트랙</p>
              <p style={{ fontSize: 14, color: "#5C3317", marginTop: 2 }}>고라데이로 딱딱딱.mp3</p>
            </div>

            <div className="flex justify-center gap-2 mt-4">
              {[0, 1, 2].map((lane) => (
                <div
                  key={lane}
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: `${LANE_COLORS[lane]}22`,
                    border: `2px solid ${LANE_COLORS[lane]}`,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{LANE_EMOJIS[lane]}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12, color: "#7A4A25", marginTop: 10 }}>
              버튼 터치 또는 키보드 A / S / D
            </p>

            {loadError && (
              <p style={{ fontSize: 12, color: "#C62828", marginTop: 10 }}>{loadError}</p>
            )}

            <motion.button
              className="w-full mt-5 py-4 rounded-xl text-white"
              style={{
                background: isPreparing
                  ? "linear-gradient(180deg, #9E9E9E, #7E7E7E)"
                  : "linear-gradient(180deg, #FF8C00, #E8740C)",
                border: "3px solid #B8560B",
                boxShadow: "0 8px 16px rgba(232,116,12,0.35)",
                fontSize: 20,
              }}
              onClick={startGame}
              disabled={isPreparing}
              whileTap={isPreparing ? undefined : { scale: 0.96 }}
            >
              {isPreparing ? "오디오 준비 중..." : "🎵 시작하기"}
            </motion.button>
          </motion.div>
        </div>
      )}

      {phase === "countdown" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center" style={{ background: "rgba(15,8,30,0.68)" }}>
          <motion.p
            key={countdown}
            initial={{ scale: 1.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ fontSize: 86, color: "#FFD54F", textShadow: "0 0 18px rgba(255,213,79,0.55)" }}
          >
            {countdown}
          </motion.p>
          <p style={{ fontSize: 15, color: "#FFF8DC", marginTop: 8 }}>준비하세요!</p>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div className="px-4 pt-3 pb-1 flex items-center justify-between z-20">
            <div>
              <span style={{ fontSize: 11, color: "#B8AEE1" }}>SCORE</span>
              <p style={{ fontSize: 20, color: "#FFD54F" }}>{score.toLocaleString()} / {RHYTHM_STAGE_MAX_SCORE}</p>
            </div>
            <div className="text-center">
              <span style={{ fontSize: 11, color: "#B8AEE1" }}>COMBO</span>
              <motion.p
                style={{ fontSize: combo >= 10 ? 24 : 20, color: combo >= 10 ? "#FFB74D" : "#FFFFFF" }}
                animate={combo >= 10 ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.28 }}
              >
                {combo}x
              </motion.p>
            </div>
            <div className="text-right">
              <span style={{ fontSize: 11, color: "#B8AEE1" }}>ACC</span>
              <p style={{ fontSize: 18, color: "#4DD0E1" }}>{accuracy}%</p>
            </div>
          </div>

          <div className="mx-4 mb-2">
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.14)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #FF8C00, #FFD54F)",
                }}
              />
            </div>
          </div>

          <AnimatePresence>
            {combo >= 18 && (
              <motion.div
                className="mx-4 mb-2 py-1.5 rounded-xl text-center"
                style={{
                  background: "linear-gradient(90deg, rgba(255,82,82,0.88), rgba(255,213,79,0.9), rgba(76,175,80,0.88))",
                  border: "2px solid rgba(255,255,255,0.45)",
                  boxShadow: "0 0 24px rgba(255,213,79,0.38)",
                }}
                initial={{ opacity: 0, y: -8, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: [1, 1.02, 1] }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, repeat: Infinity }}
              >
                <span style={{ fontSize: 14, color: "#1F1207", letterSpacing: 1 }}>OVERDRIVE COMBO x{combo}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            className="flex-1 relative mx-4 mb-2 rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.6))",
              border: "2px solid rgba(255,255,255,0.14)",
            }}
            animate={{ x: cameraKick.x, y: cameraKick.y, scale: cameraKick.scale }}
            transition={{ type: "spring", stiffness: 380, damping: 20, mass: 0.45 }}
          >
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 50% 12%, rgba(255,213,79,0.24) 0%, rgba(255,107,107,0.12) 36%, rgba(21,10,38,0.08) 100%)",
              }}
              animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.05, 1] }}
              transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(120deg, rgba(255,107,107,0.14), rgba(255,213,79,0.12), rgba(107,203,119,0.14))",
                mixBlendMode: "screen",
              }}
              animate={combo >= 10 ? { opacity: [0.18, 0.48, 0.18] } : { opacity: 0.12 }}
              transition={{ duration: combo >= 10 ? 0.4 : 1, repeat: Infinity }}
            />

            <AnimatePresence>
              {screenFlash && (
                <motion.div
                  key={screenFlash.id}
                  className="absolute inset-0 z-30 pointer-events-none"
                  style={{
                    background: screenFlash.color,
                    mixBlendMode: "screen",
                  }}
                  initial={{ opacity: screenFlash.opacity }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                />
              )}
            </AnimatePresence>

            <div className="absolute inset-0 flex">
              {Array.from({ length: LANE_COUNT }).map((_, lane) => (
                <div
                  key={lane}
                  className="flex-1 relative"
                  style={{ borderRight: lane < LANE_COUNT - 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 h-20"
                    style={{
                      background: `linear-gradient(0deg, ${LANE_COLORS[lane]}30 0%, transparent 100%)`,
                    }}
                  />
                  <motion.div
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      background: `linear-gradient(0deg, ${LANE_COLORS[lane]}CC 0%, ${LANE_COLORS[lane]}44 45%, transparent 100%)`,
                      filter: "blur(2px)",
                    }}
                    animate={{
                      height: `${14 + laneEnergy[lane] * 48}%`,
                      opacity: 0.12 + laneEnergy[lane] * 0.6,
                    }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  />
                </div>
              ))}
            </div>

            <div
              className="absolute left-0 right-0 z-10"
              style={{
                bottom: "16%",
                height: 4,
                background: "linear-gradient(90deg, #FF6B6B, #FFD54F, #6BCB77)",
                boxShadow: "0 0 12px rgba(255,213,79,0.55)",
              }}
            />

            {notes.map((note) => {
              if (note.hit || note.missed) return null;
              const yPercent = ((timelineMs - note.time + NOTE_TRAVEL_MS) / NOTE_TRAVEL_MS) * 84;
              if (yPercent < -12 || yPercent > 100) return null;

              return (
                <div
                  key={note.id}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${note.lane * 33.333 + 2.2}%`,
                    top: `${yPercent}%`,
                    width: "29%",
                    height: 44,
                    willChange: "transform",
                  }}
                >
                  <div
                    className="relative w-full h-full rounded-xl flex items-center justify-center overflow-hidden"
                    style={{
                      background: `linear-gradient(180deg, ${LANE_COLORS[note.lane]}, ${LANE_COLORS[note.lane]}BB)`,
                      border: `2px solid ${LANE_COLORS[note.lane]}`,
                      boxShadow: `0 0 20px ${LANE_COLORS[note.lane]}99`,
                    }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 42%, rgba(255,255,255,0.2) 100%)",
                      }}
                    />
                    <div
                      className="absolute inset-[3px] rounded-lg"
                      style={{ border: "1px solid rgba(255,255,255,0.58)" }}
                    />
                    <span style={{ fontSize: 20 }}>{LANE_EMOJIS[note.lane]}</span>
                  </div>
                </div>
              );
            })}

            <AnimatePresence>
              {effects.map((effect) => (
                <motion.div
                  key={effect.id}
                  className="absolute z-20 text-center pointer-events-none"
                  style={{
                    left: `${effect.lane * 33.333 + 2.2}%`,
                    bottom: "16%",
                    width: "29%",
                  }}
                  initial={{ opacity: 1, y: 0, scale: 0.7 }}
                  animate={{ opacity: 0, y: -64, scale: 1.26 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.56 }}
                >
                  <motion.div
                    className="absolute left-1/2 top-1/2 rounded-full"
                    style={{
                      width: 16,
                      height: 16,
                      background: JUDGE_COLORS[effect.judge],
                      filter: "blur(1px)",
                      transform: "translate(-50%, -50%)",
                    }}
                    initial={{ scale: 0.2, opacity: 0.75 }}
                    animate={{ scale: 3.6, opacity: 0 }}
                    transition={{ duration: 0.32 }}
                  />

                  {Array.from({
                    length:
                      effect.judge === "PERFECT"
                        ? 12
                        : effect.judge === "GREAT"
                        ? 10
                        : effect.judge === "GOOD"
                        ? 8
                        : 7,
                  }).map((_, index, array) => {
                    const angle = (Math.PI * 2 * index) / array.length;
                    const spread =
                      effect.judge === "PERFECT"
                        ? 66
                        : effect.judge === "GREAT"
                        ? 54
                        : effect.judge === "GOOD"
                        ? 46
                        : 40;
                    const jitter = (effect.id * (index + 3) * 17) % 11;
                    const radius = spread + jitter;
                    return (
                      <motion.span
                        key={`${effect.id}-${index}`}
                        className="absolute rounded-full"
                        style={{
                          width: effect.judge === "PERFECT" ? 6 : 5,
                          height: effect.judge === "PERFECT" ? 6 : 5,
                          left: "50%",
                          top: "50%",
                          background: JUDGE_COLORS[effect.judge],
                          boxShadow: `0 0 10px ${JUDGE_COLORS[effect.judge]}`,
                        }}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                        animate={{
                          x: Math.cos(angle) * radius,
                          y: Math.sin(angle) * radius - 18,
                          opacity: 0,
                          scale: 0.2,
                        }}
                        transition={{ duration: 0.44, ease: "easeOut" }}
                      />
                    );
                  })}

                  <span
                    style={{
                      fontSize: effect.judge === "PERFECT" ? 20 : 17,
                      color: JUDGE_COLORS[effect.judge],
                      textShadow: `0 0 16px ${JUDGE_COLORS[effect.judge]}`,
                      letterSpacing: 0.6,
                    }}
                  >
                    {effect.judge}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>

          </motion.div>

          <div className="flex gap-3 mx-4 mb-4">
            {Array.from({ length: LANE_COUNT }).map((_, lane) => (
              <motion.button
                key={lane}
                className="flex-1 py-5 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    activeLanes[lane]
                      ? `linear-gradient(180deg, ${LANE_COLORS[lane]}, ${LANE_COLORS[lane]}AA)`
                      : `linear-gradient(180deg, ${LANE_COLORS[lane]}CC, ${LANE_COLORS[lane]}88)`,
                  border: `3px solid ${LANE_COLORS[lane]}`,
                  boxShadow: `0 0 ${10 + laneEnergy[lane] * 22}px ${LANE_COLORS[lane]}AA`,
                  touchAction: "none",
                  userSelect: "none",
                  WebkitTapHighlightColor: "transparent",
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  handleLaneTap(lane);
                }}
                onClick={(event) => event.preventDefault()}
                whileTap={{ scale: 0.9 }}
                animate={{ y: activeLanes[lane] ? -4 : 0, scale: 1 + laneEnergy[lane] * 0.06 }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
              >
                <span style={{ fontSize: 28 }}>{LANE_EMOJIS[lane]}</span>
              </motion.button>
            ))}
          </div>
        </>
      )}

      {phase === "results" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            className="w-full p-6 rounded-2xl text-center"
            style={{
              background: "linear-gradient(180deg, rgba(255,248,220,0.97), rgba(224,193,140,0.97))",
              border: "3px solid #FFD54F",
              boxShadow: "0 0 30px rgba(255,213,79,0.3)",
            }}
            initial={{ scale: 0.86, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 160 }}
          >
            <span style={{ fontSize: 50 }}>🎼</span>
            <h2 style={{ fontSize: 24, color: "#5C3317", marginTop: 8 }}>리듬 결과</h2>

            <motion.p
              style={{ fontSize: 40, color: "#E8740C", marginTop: 10 }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              {finalScore} / {RHYTHM_STAGE_MAX_SCORE}점
            </motion.p>
            <p style={{ fontSize: 12, color: "#7A5A2A", marginTop: 2 }}>
              리절트 전달 점수: {Math.round((finalScore / RHYTHM_STAGE_MAX_SCORE) * RHYTHM_RESULT_MAX_SCORE)} / {RHYTHM_RESULT_MAX_SCORE}
            </p>

            <div className="flex justify-center gap-8 mt-2">
              <div>
                <p style={{ fontSize: 11, color: "#7A5A2A" }}>MAX COMBO</p>
                <p style={{ fontSize: 19, color: "#5C3317" }}>{maxCombo}x</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "#7A5A2A" }}>정확도</p>
                <p style={{ fontSize: 19, color: "#5C3317" }}>{accuracy}%</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {(["PERFECT", "GREAT", "GOOD", "MISS"] as HitJudge[]).map((judge, index) => (
                <motion.div
                  key={judge}
                  className="flex items-center justify-between px-4 py-2 rounded-lg"
                  style={{ background: "rgba(0,0,0,0.06)" }}
                  initial={{ x: -18, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.28 + index * 0.08 }}
                >
                  <span style={{ fontSize: 14, color: JUDGE_COLORS[judge] }}>{judge}</span>
                  <span style={{ fontSize: 17, color: "#5C3317" }}>{judgeStats[judge]}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
