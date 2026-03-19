// ============================================
// Tetris Assembly Game - 8-bit Sound Engine
// Web Audio API로 만든 신나는 칩튠 사운드
// ============================================

let audioCtx: AudioContext | null = null;

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

// ========== BGM ENGINE ==========
// BPM 160의 신나는 8비트 테트리스 BGM
// 4/4박자, 끝없이 반복되는 루프

const BPM = 160;
const BEAT = 60 / BPM; // 1비트 길이 (초)
const BAR = BEAT * 4;   // 1마디 길이

// 멜로디 (코로뵤이키 스타일 오리지널)
// [음, 길이(비트단위)] - 0이면 쉼표
const MELODY_A: [number, number][] = [
  [659, 1], [494, 0.5], [523, 0.5], [587, 1], [523, 0.5], [494, 0.5],
  [440, 1], [440, 0.5], [523, 0.5], [659, 1], [587, 0.5], [523, 0.5],
  [494, 1], [494, 0.5], [523, 0.5], [587, 1], [659, 1],
  [523, 1], [440, 1], [440, 1], [0, 1],
];

const MELODY_B: [number, number][] = [
  [587, 1.5], [698, 0.5], [880, 1], [784, 0.5], [698, 0.5],
  [659, 1.5], [523, 0.5], [659, 1], [587, 0.5], [523, 0.5],
  [494, 1], [494, 0.5], [523, 0.5], [587, 1], [659, 1],
  [523, 1], [440, 1], [440, 1], [0, 1],
];

// 베이스라인 (각 마디의 근음)
const BASS_NOTES: [number, number][] = [
  [165, 4], [220, 4], [175, 4], [196, 2], [220, 2],
  [175, 4], [165, 4], [175, 4], [220, 4],
];

// 드럼 패턴 (1마디 = 4비트, 각 16분음표 위치)
// K=킥, H=하이햇, S=스네어(노이즈)
const DRUM_PATTERN = "K-H-S-H-K-H-S-HH"; // 16단계

let bgmTimers: ReturnType<typeof setTimeout>[] = [];
let bgmPlaying = false;
let bgmLoopCount = 0;

function scheduleMelody(
  notes: [number, number][],
  startTime: number,
  volume = 0.1
) {
  let t = startTime;
  for (const [freq, beats] of notes) {
    const dur = beats * BEAT;
    if (freq > 0) {
      const delay = t - getCtx().currentTime;
      if (delay > 0) {
        const timer = setTimeout(() => {
          if (!bgmPlaying) return;
          playNote(freq, dur * 0.85, volume, "square");
          // 하모니 (옥타브 위 살짝)
          playNote(freq * 2, dur * 0.5, volume * 0.25, "triangle");
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
        playNote(f, d * 0.9, 0.1, "triangle");
        // 서브베이스
        playNote(f * 0.5, d * 0.6, 0.06, "sine");
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
        if (c === "K") playKick(0, 0.18);
        else if (c === "S") playNoise(0.06, 0.08);
        else if (c === "H") playNoise(0.03, 0.04);
      }, delay * 1000);
      bgmTimers.push(timer);
    }
    t += stepDur;
    stepIdx++;
  }
}

function scheduleArpeggio(startTime: number, duration: number) {
  // 배경 아르페지오 (분위기 추가)
  const arpNotes = [262, 330, 392, 523, 392, 330];
  const arpDur = BEAT / 3;
  let t = startTime;
  let idx = 0;
  while (t < startTime + duration) {
    const delay = t - getCtx().currentTime;
    const freq = arpNotes[idx % arpNotes.length];
    if (delay > 0) {
      const timer = setTimeout(() => {
        if (!bgmPlaying) return;
        playNote(freq, arpDur * 0.7, 0.03, "sine");
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

  // 멜로디 A → 멜로디 B 반복
  const useB = bgmLoopCount % 2 === 1;
  const melody = useB ? MELODY_B : MELODY_A;

  const totalBeats = melody.reduce((sum, [, b]) => sum + b, 0);
  const totalDur = totalBeats * BEAT;

  scheduleMelody(melody, now, 0.1);
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

export function startBGM() {
  if (bgmPlaying) return;
  bgmPlaying = true;
  bgmLoopCount = 0;
  getCtx(); // ensure context is created
  playBGMLoop();
}

export function stopBGM() {
  bgmPlaying = false;
  bgmTimers.forEach((t) => clearTimeout(t));
  bgmTimers = [];
}

export function cleanupAudio() {
  stopBGM();
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}
