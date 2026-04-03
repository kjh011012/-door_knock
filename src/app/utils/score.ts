export interface GameScores {
  findParts: number;
  assembly: number;
  hammer: number;
  rhythm: number;
}

export type StageKey = keyof GameScores;

const RAW_STAGE_MAX: Record<StageKey, number> = {
  findParts: 100,
  assembly: 100,
  hammer: 100,
  rhythm: 100,
};

export const TOTAL_SCORE_MAX = 10000;
export const STAGE_SCORE_MAX = 2500;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitize(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, score);
}

function normalizeRawScore(stage: StageKey, score: number): number {
  const safe = sanitize(score);

  // Current pipeline: each stage reports 0~100 (result-ready score).
  if (safe <= 100) return safe;

  // Legacy compatibility: old builds might still send 0~1000 or 0~2500.
  if (safe <= 1000) return safe / 10;
  if (safe <= 2500) return (safe / 2500) * 100;

  return 100;
}

export function toStageScore(stage: StageKey, rawScore: number): number {
  const normalizedRaw = normalizeRawScore(stage, rawScore);
  const ratio = clamp(normalizedRaw / RAW_STAGE_MAX[stage], 0, 1);
  return Math.round(ratio * STAGE_SCORE_MAX);
}

export function buildScoreSummary(scores: GameScores): {
  stageScores: Record<StageKey, number>;
  totalRawScore: number;
  totalScore100: number;
} {
  const stageScores: Record<StageKey, number> = {
    findParts: toStageScore("findParts", scores.findParts),
    assembly: toStageScore("assembly", scores.assembly),
    hammer: toStageScore("hammer", scores.hammer),
    rhythm: toStageScore("rhythm", scores.rhythm),
  };

  const totalRawScore =
    stageScores.findParts +
    stageScores.assembly +
    stageScores.hammer +
    stageScores.rhythm;
  const totalScore100 = Math.round((totalRawScore / TOTAL_SCORE_MAX) * 100);

  return { stageScores, totalRawScore, totalScore100 };
}
