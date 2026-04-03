// ============================================
// Woodpecker Workshop - Original Melody Sound Engine
// 프로젝트 전용 오리지널 무가사 BGM + SFX
// ============================================

import workshopBgmTrack from "../../assets/woodpecker/workshop-bgm.mp3";

let audioCtx: AudioContext | null = null;
let bgmAudio: HTMLAudioElement | null = null;
let bgmUnlockHandler: (() => void) | null = null;
let currentBgmSource = workshopBgmTrack;
let currentBgmVolume = 0.55;
export const DEFAULT_WORKSHOP_BGM = workshopBgmTrack;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// --- Helper: 8bit 스퀘어파 노트 ---
function playNote(
  freq: number,
  duration: number,
  volume = 0.15,
  type: OscillatorType = "square",
  delay = 0
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + delay + duration
  );
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

// --- Helper: 노이즈 ---
function playNoise(duration: number, volume = 0.08, delay = 0) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(5000, ctx.currentTime + delay);
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + delay + duration
  );
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime + delay);
}

// --- Helper: 드럼 킥 ---
function playKick(delay = 0, volume = 0.25) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, ctx.currentTime + delay);
  osc.frequency.exponentialRampToValueAtTime(
    30,
    ctx.currentTime + delay + 0.12
  );
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + delay + 0.15
  );
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + 0.15);
}

function playSnare(delay = 0, volume = 0.18) {
  const ctx = getCtx();
  const bufferSize = Math.floor(ctx.sampleRate * 0.11);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.setValueAtTime(1500, ctx.currentTime + delay);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.11);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSource.start(ctx.currentTime + delay);

  const bodyOsc = ctx.createOscillator();
  bodyOsc.type = "triangle";
  bodyOsc.frequency.setValueAtTime(210, ctx.currentTime + delay);
  bodyOsc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + delay + 0.07);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(volume * 0.45, ctx.currentTime + delay);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.08);
  bodyOsc.connect(bodyGain);
  bodyGain.connect(ctx.destination);
  bodyOsc.start(ctx.currentTime + delay);
  bodyOsc.stop(ctx.currentTime + delay + 0.09);
}

function playCymbal(delay = 0, volume = 0.14) {
  const ctx = getCtx();
  const bufferSize = Math.floor(ctx.sampleRate * 0.13);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.setValueAtTime(6800, ctx.currentTime + delay);
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(9800, ctx.currentTime + delay);
  bandpass.Q.setValueAtTime(0.8, ctx.currentTime + delay);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.13);

  source.connect(highpass);
  highpass.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime + delay);
}

// ========== SFX ==========

export function sfxMove() {
  playNote(440, 0.06, 0.08, "square");
}

export function sfxRotate() {
  playNote(587, 0.06, 0.1, "square");
  playNote(784, 0.06, 0.1, "square", 0.04);
}

export function sfxSoftDrop() {
  playNote(220, 0.04, 0.06, "triangle");
}

export function sfxHardDrop() {
  playKick(0, 0.3);
  playNote(130, 0.1, 0.15, "sawtooth");
  playNoise(0.08, 0.12);
}

export function sfxLock() {
  playNote(330, 0.08, 0.1, "square");
  playNote(165, 0.1, 0.08, "triangle");
}

export function sfxLineClear(count: number) {
  // 클리어 수에 따라 더 화려한 사운드
  if (count === 1) {
    playNote(523, 0.1, 0.12, "square");
    playNote(659, 0.1, 0.12, "square", 0.08);
    playNote(784, 0.15, 0.12, "square", 0.16);
  } else if (count === 2) {
    playNote(523, 0.08, 0.14, "square");
    playNote(659, 0.08, 0.14, "square", 0.06);
    playNote(784, 0.08, 0.14, "square", 0.12);
    playNote(1047, 0.15, 0.14, "square", 0.18);
  } else if (count === 3) {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      playNote(f, 0.08, 0.15, "square", i * 0.05);
    });
    playNoise(0.15, 0.06, 0.1);
  } else {
    // 4줄! 테트리스! 가장 화려한 사운드
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => {
      playNote(f, 0.12, 0.18, "square", i * 0.04);
      playNote(f * 1.5, 0.08, 0.08, "sawtooth", i * 0.04 + 0.02);
    });
    playKick(0, 0.35);
    playKick(0.15, 0.25);
    playNoise(0.2, 0.1, 0.15);
  }
}

export function sfxCombo(comboCount: number) {
  // 콤보가 높을수록 음이 올라감
  const baseFreq = 440 + comboCount * 80;
  playNote(baseFreq, 0.06, 0.1, "square");
  playNote(baseFreq * 1.25, 0.06, 0.1, "square", 0.04);
  playNote(baseFreq * 1.5, 0.1, 0.1, "square", 0.08);
}

export function sfxGameOver() {
  // 슬프게 내려가는 사운드
  [784, 659, 523, 440, 330, 262].forEach((f, i) => {
    playNote(f, 0.2, 0.12, "square", i * 0.15);
    playNote(f * 0.5, 0.2, 0.06, "triangle", i * 0.15);
  });
  playKick(0.6, 0.3);
  playNoise(0.4, 0.06, 0.7);
}

export function sfxComplete() {
  // 팡파레! 승리의 멜로디
  const melody = [
    [523, 0.12], [523, 0.12], [523, 0.12], [523, 0.3],
    [415, 0.3], [466, 0.3], [523, 0.15], [466, 0.08], [523, 0.5],
  ] as [number, number][];
  let t = 0;
  melody.forEach(([freq, dur]) => {
    playNote(freq, dur, 0.16, "square", t);
    playNote(freq * 2, dur * 0.8, 0.06, "triangle", t);
    t += dur + 0.02;
  });
  // 화려한 아르페지오 마무리
  [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => {
    playNote(f, 0.15, 0.1, "square", t + i * 0.06);
  });
  playKick(0, 0.3);
  playKick(t, 0.35);
}

export function sfxPartAssembled() {
  // 부품 조립 성공! 짧은 승리음
  playNote(659, 0.1, 0.12, "square");
  playNote(784, 0.1, 0.12, "square", 0.08);
  playNote(1047, 0.2, 0.15, "square", 0.16);
  playKick(0, 0.2);
}

export function sfxButtonPress() {
  playNote(660, 0.04, 0.07, "square");
}

export function sfxWoodBlockSlide() {
  // 나무 블록이 작업대 위를 스치는 느낌
  playNoise(0.05, 0.045);
  playNote(210, 0.06, 0.06, "triangle");
  playNote(170, 0.07, 0.05, "sine", 0.02);
}

export function sfxPuzzleSlide() {
  playNote(392, 0.05, 0.09, "triangle");
  playNote(440, 0.08, 0.06, "sine", 0.03);
}

export function sfxPuzzleBlocked() {
  playNote(180, 0.07, 0.08, "sawtooth");
  playNote(130, 0.08, 0.06, "triangle", 0.04);
}

export function sfxPuzzleRescue() {
  [659, 784, 988].forEach((freq, index) => {
    playNote(freq, 0.1, 0.13, "square", index * 0.06);
  });
  playKick(0, 0.22);
}

export function sfxHammerBeat() {
  playNote(980, 0.03, 0.05, "square");
}

export function sfxHammerPeg() {
  playKick(0, 0.16);
  playNote(238, 0.05, 0.08, "triangle");
  playNoise(0.03, 0.03);
}

export function sfxHammerMiss() {
  playNote(165, 0.07, 0.08, "triangle");
  playNoise(0.04, 0.04);
}

export function sfxCountdownTick(count: number) {
  const clamped = Math.max(1, Math.min(3, Math.floor(count)));
  const baseByCount: Record<number, number> = {
    3: 523,
    2: 659,
    1: 784,
  };
  const freq = baseByCount[clamped] ?? 523;
  playNote(freq, 0.1, 0.11, "square");
  playNote(freq * 1.5, 0.08, 0.05, "triangle", 0.03);
}

export function sfxRhythmTap(lane: number) {
  const laneIndex = Math.max(0, Math.min(2, Math.floor(lane)));
  if (laneIndex === 0) {
    playKick(0, 0.22);
    return;
  }
  if (laneIndex === 1) {
    playSnare(0, 0.16);
    return;
  }
  playCymbal(0, 0.13);
}

// ========== BGM ENGINE ==========
// 5~12세 어린이가 듣기 편한 밝은 오리지널 멜로디 루프

const BPM = 126;
const BEAT = 60 / BPM; // 1비트 길이 (초)
const BAR = BEAT * 4;

// C major / G major 기반의 밝은 멜로디
const MELODY_A: [number, number][] = [
  [523, 0.5], [659, 0.5], [784, 1], [659, 0.5], [587, 0.5], [523, 1],
  [587, 0.5], [659, 0.5], [784, 1], [880, 0.5], [784, 0.5], [659, 1],
  [523, 0.5], [587, 0.5], [659, 1], [587, 0.5], [523, 0.5], [494, 1],
  [523, 0.5], [587, 0.5], [659, 1.5], [0, 0.5],
];

const MELODY_B: [number, number][] = [
  [659, 0.5], [784, 0.5], [988, 1], [880, 0.5], [784, 0.5], [659, 1],
  [698, 0.5], [784, 0.5], [880, 1], [784, 0.5], [698, 0.5], [659, 1],
  [587, 0.5], [659, 0.5], [698, 1], [659, 0.5], [587, 0.5], [523, 1],
  [587, 0.5], [659, 0.5], [523, 1.5], [0, 0.5],
];

// 베이스라인
const BASS_NOTES: [number, number][] = [
  [131, 2], [196, 2], [165, 2], [196, 2],
  [147, 2], [220, 2], [165, 2], [196, 2],
  [131, 2], [196, 2], [165, 2], [220, 2],
];

// 16분음표 드럼 패턴
const DRUM_PATTERN = "K-HHS-H-K-HHS-H-";

let bgmTimers: ReturnType<typeof setTimeout>[] = [];
let bgmPlaying = false;
let bgmLoopCount = 0;

function scheduleMelody(
  notes: [number, number][],
  startTime: number,
  volume = 0.08
) {
  let t = startTime;
  for (const [freq, beats] of notes) {
    const dur = beats * BEAT;
    if (freq > 0) {
      const delay = t - getCtx().currentTime;
      if (delay > 0) {
        const timer = setTimeout(() => {
          if (!bgmPlaying) return;
          playNote(freq, dur * 0.8, volume, "triangle");
          playNote(freq * 2, dur * 0.45, volume * 0.18, "sine");
        }, delay * 1000);
        bgmTimers.push(timer);
      }
    }
    t += dur;
  }
  return t;
}

function scheduleBass(startTime: number, duration: number) {
  const bassNotes = BASS_NOTES;
  let t = startTime;
  let noteIdx = 0;
  while (t < startTime + duration) {
    const [freq, beats] = bassNotes[noteIdx % bassNotes.length];
    const dur = beats * BEAT;
    const delay = t - getCtx().currentTime;
    if (delay > 0) {
      const f = freq;
      const d = dur;
      const timer = setTimeout(() => {
        if (!bgmPlaying) return;
        playNote(f, d * 0.85, 0.08, "triangle");
        playNote(f * 0.5, d * 0.55, 0.035, "sine");
      }, delay * 1000);
      bgmTimers.push(timer);
    }
    t += dur;
    noteIdx++;
  }
}

function scheduleDrums(startTime: number, duration: number) {
  const stepDur = BEAT / 4; // 16분음표 간격
  let t = startTime;
  let stepIdx = 0;
  while (t < startTime + duration) {
    const ch = DRUM_PATTERN[stepIdx % DRUM_PATTERN.length];
    const delay = t - getCtx().currentTime;
    if (delay > 0) {
      const c = ch;
      const timer = setTimeout(() => {
        if (!bgmPlaying) return;
        if (c === "K") playKick(0, 0.12);
        else if (c === "S") playNoise(0.05, 0.05);
        else if (c === "H") playNoise(0.025, 0.025);
      }, delay * 1000);
      bgmTimers.push(timer);
    }
    t += stepDur;
    stepIdx++;
  }
}

function scheduleArpeggio(startTime: number, duration: number) {
  const arpNotes = [392, 523, 659, 784, 659, 523];
  const arpDur = BEAT / 2;
  let t = startTime;
  let idx = 0;
  while (t < startTime + duration) {
    const delay = t - getCtx().currentTime;
    const freq = arpNotes[idx % arpNotes.length];
    if (delay > 0) {
      const timer = setTimeout(() => {
        if (!bgmPlaying) return;
        playNote(freq, arpDur * 0.55, 0.02, "sine");
      }, delay * 1000);
      bgmTimers.push(timer);
    }
    t += arpDur;
    idx++;
  }
}

function playBGMLoop() {
  if (!bgmPlaying) return;

  const ctx = getCtx();
  const now = ctx.currentTime + 0.05;

  const useB = bgmLoopCount % 2 === 1;
  const melody = useB ? MELODY_B : MELODY_A;

  const totalBeats = melody.reduce((sum, [, b]) => sum + b, 0);
  const totalDur = totalBeats * BEAT;

  scheduleMelody(melody, now, 0.08);
  scheduleBass(now, totalDur);
  scheduleDrums(now, totalDur);
  scheduleArpeggio(now, totalDur);

  bgmLoopCount++;

  // 다음 루프 예약
  const loopTimer = setTimeout(() => {
    playBGMLoop();
  }, totalDur * 1000 - 50);
  bgmTimers.push(loopTimer);
}

interface BGMOptions {
  source?: string;
  volume?: number;
}

export function startBGM(options?: BGMOptions) {
  const nextSource = options?.source ?? currentBgmSource;
  const nextVolume = options?.volume ?? currentBgmVolume;

  if (bgmAudio && (nextSource !== currentBgmSource || nextVolume !== currentBgmVolume)) {
    bgmAudio.pause();
    bgmAudio.src = "";
    bgmAudio = null;
    bgmPlaying = false;
  }

  currentBgmSource = nextSource;
  currentBgmVolume = nextVolume;
  if (bgmPlaying) return;
  bgmPlaying = true;
  bgmLoopCount = 0;
  bgmTimers.forEach((t) => clearTimeout(t));
  bgmTimers = [];

  if (!bgmAudio) {
    bgmAudio = new Audio(currentBgmSource);
    bgmAudio.loop = true;
    bgmAudio.preload = "auto";
  }
  bgmAudio.volume = currentBgmVolume;

  // 같은 페이지에서 다른 audio가 남아 재생되는 경우를 방지한다.
  if (typeof document !== "undefined") {
    const audios = Array.from(document.querySelectorAll("audio"));
    audios.forEach((audioEl) => {
      if (audioEl !== bgmAudio && !audioEl.paused) {
        audioEl.pause();
        audioEl.currentTime = 0;
      }
    });
  }

  const playPromise = bgmAudio.play();
  if (playPromise) {
    playPromise.catch(() => {
      // 1차 폴백: 무음 자동재생으로 트랙을 먼저 시작한 뒤 즉시 볼륨을 복구한다.
      if (bgmAudio) {
        bgmAudio.muted = true;
        const mutedPlayPromise = bgmAudio.play();
        if (mutedPlayPromise) {
          mutedPlayPromise
            .then(() => {
              bgmPlaying = true;
              window.setTimeout(() => {
                if (!bgmAudio) return;
                bgmAudio.muted = false;
                bgmAudio.volume = currentBgmVolume;
              }, 60);
            })
            .catch(() => {
              // 2차 폴백: 자동재생이 완전히 막힌 환경은 사용자 입력 후 재시도한다.
              bgmPlaying = false;
              if (typeof window !== "undefined" && !bgmUnlockHandler) {
                bgmUnlockHandler = () => {
                  if (!bgmAudio) return;
                  bgmAudio.muted = false;
                  bgmAudio.volume = currentBgmVolume;
                  const retryPromise = bgmAudio.play();
                  if (!retryPromise) return;
                  retryPromise
                    .then(() => {
                      bgmPlaying = true;
                      if (!bgmUnlockHandler) return;
                      window.removeEventListener("pointerdown", bgmUnlockHandler);
                      window.removeEventListener("keydown", bgmUnlockHandler);
                      window.removeEventListener("touchstart", bgmUnlockHandler);
                      bgmUnlockHandler = null;
                    })
                    .catch(() => {
                      // 일부 환경에서는 상호작용이 더 필요할 수 있다.
                    });
                };
                window.addEventListener("pointerdown", bgmUnlockHandler);
                window.addEventListener("keydown", bgmUnlockHandler);
                window.addEventListener("touchstart", bgmUnlockHandler);
              }
            });
        }
      }
    });
  }
}

export function stopBGM() {
  bgmPlaying = false;
  bgmTimers.forEach((t) => clearTimeout(t));
  bgmTimers = [];
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
  }
  if (typeof window !== "undefined" && bgmUnlockHandler) {
    window.removeEventListener("pointerdown", bgmUnlockHandler);
    window.removeEventListener("keydown", bgmUnlockHandler);
    window.removeEventListener("touchstart", bgmUnlockHandler);
    bgmUnlockHandler = null;
  }
}

export function cleanupAudio() {
  stopBGM();
  if (bgmAudio) {
    bgmAudio.src = "";
    bgmAudio = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}
