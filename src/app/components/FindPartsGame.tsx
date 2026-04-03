import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WOODPECKER_PARTS, type WoodpeckerPart } from "../data/woodpeckerParts";
import blockTexture0 from "../../assets/woodpecker/blk.png";
import blockTexture1 from "../../assets/woodpecker/blk1.png";
import blockTexture2 from "../../assets/woodpecker/blk2.png";
import blockTexture3 from "../../assets/woodpecker/blk3.png";
import blockTexture4 from "../../assets/woodpecker/blk4.png";
import woodBlockBgmTrack from "../../assets/woodpecker/woodblock-bgm.mp3";
import {
  startBGM,
  stopBGM,
  sfxButtonPress,
  sfxComplete,
  sfxPuzzleBlocked,
  sfxPuzzleRescue,
  sfxWoodBlockSlide,
} from "./tetris-sounds";

interface FindPartsGameProps {
  onComplete: (score: number) => void;
  soundOn?: boolean;
}

type Axis = "h" | "v";
type Phase = "ready" | "playing" | "roundClear" | "roundFail" | "complete";

interface PuzzlePiece {
  id: string;
  row: number;
  col: number;
  len: number;
  axis: Axis;
  color: string;
  isTarget?: boolean;
}

interface SlideDestination {
  row: number;
  col: number;
}

interface PuzzleRound {
  id: number;
  parMoves: number;
  pieces: PuzzlePiece[];
}

interface RoundVariantCandidate {
  pieces: PuzzlePiece[];
  parMoves: number;
  signature: string;
  fitScore: number;
  diversityScore: number;
  styleProfile: string;
  variationPenalty: number;
}

interface MoveDiversitySnapshot {
  movablePieces: number;
  multiOptionPieces: number;
  totalDestinations: number;
  horizontalMovers: number;
  verticalMovers: number;
}

interface DragState {
  pieceId: string;
  pointerId: number;
  axis: Axis;
  startClientX: number;
  startClientY: number;
  startRow: number;
  startCol: number;
  minOffsetCells: number;
  maxOffsetCells: number;
}

const GRID_SIZE = 6;
const EXIT_ROW = 2;
const EXIT_COL = GRID_SIZE - 1;
const ROUND_SCORE_TARGET_MOVES = [10, 15, 20, 25, 26, 27] as const;
const ROUND_TIME_LIMIT_MS = 60000;
const ROUND_SCORE_MAX = 100;
const FIND_PARTS_STAGE_MAX_SCORE = 2500;
type DifficultyTier = "easy1" | "easy2" | "mid1" | "mid2" | "hard1" | "hard2";

const ROUND_DIFFICULTY_ORDER: DifficultyTier[] = [
  "easy1",
  "easy1",
  "easy2",
  "easy2",
  "mid1",
  "mid1",
];

const ROUND_POOLS: Record<DifficultyTier, Array<Omit<PuzzleRound, "id">>> = {
  easy1: [
    {
      parMoves: 11,
      pieces: [
        { id: "target", row: 2, col: 1, len: 2, axis: "h", color: "#D79A4B", isTarget: true },
        { id: "o", row: 3, col: 0, len: 3, axis: "v", color: "#86502B" },
        { id: "a", row: 0, col: 3, len: 2, axis: "v", color: "#A86A3A" },
        { id: "b", row: 1, col: 4, len: 2, axis: "h", color: "#8F562C" },
        { id: "c", row: 4, col: 3, len: 2, axis: "v", color: "#B97B44" },
        { id: "d", row: 3, col: 3, len: 2, axis: "h", color: "#7E4D28" },
        { id: "p", row: 3, col: 2, len: 3, axis: "v", color: "#A36736" },
        { id: "e", row: 4, col: 4, len: 2, axis: "h", color: "#C48950" },
        { id: "f", row: 2, col: 5, len: 2, axis: "v", color: "#6D3F1F" },
      ],
    },
    {
      parMoves: 9,
      pieces: [
        { id: "target", row: 2, col: 3, len: 2, axis: "h", color: "#D79A4B", isTarget: true },
        { id: "o", row: 0, col: 0, len: 3, axis: "v", color: "#86502B" },
        { id: "a", row: 0, col: 3, len: 2, axis: "v", color: "#A86A3A" },
        { id: "b", row: 1, col: 4, len: 2, axis: "h", color: "#8F562C" },
        { id: "c", row: 4, col: 3, len: 2, axis: "v", color: "#B97B44" },
        { id: "d", row: 3, col: 3, len: 2, axis: "h", color: "#7E4D28" },
        { id: "p", row: 1, col: 2, len: 3, axis: "v", color: "#A36736" },
        { id: "e", row: 4, col: 4, len: 2, axis: "h", color: "#C48950" },
        { id: "f", row: 2, col: 5, len: 2, axis: "v", color: "#6D3F1F" },
      ],
    },
    {
      parMoves: 11,
      pieces: [
        { id: "target", row: 2, col: 2, len: 2, axis: "h", color: "#D79A4B", isTarget: true },
        { id: "o", row: 2, col: 0, len: 3, axis: "v", color: "#86502B" },
        { id: "a", row: 0, col: 3, len: 2, axis: "v", color: "#A86A3A" },
        { id: "b", row: 1, col: 4, len: 2, axis: "h", color: "#8F562C" },
        { id: "c", row: 4, col: 3, len: 2, axis: "v", color: "#B97B44" },
        { id: "d", row: 3, col: 3, len: 2, axis: "h", color: "#7E4D28" },
        { id: "p", row: 3, col: 2, len: 3, axis: "v", color: "#A36736" },
        { id: "e", row: 4, col: 4, len: 2, axis: "h", color: "#C48950" },
        { id: "f", row: 2, col: 5, len: 2, axis: "v", color: "#6D3F1F" },
      ],
    },
  ],
  easy2: [
    {
      parMoves: 12,
      pieces: [
        { id: "target", row: 2, col: 0, len: 2, axis: "h", color: "#D79A4B", isTarget: true },
        { id: "o", row: 3, col: 0, len: 3, axis: "v", color: "#86502B" },
        { id: "a", row: 0, col: 3, len: 2, axis: "v", color: "#A86A3A" },
        { id: "b", row: 1, col: 4, len: 2, axis: "h", color: "#8F562C" },
        { id: "c", row: 4, col: 3, len: 2, axis: "v", color: "#B97B44" },
        { id: "d", row: 3, col: 3, len: 2, axis: "h", color: "#7E4D28" },
        { id: "p", row: 2, col: 2, len: 3, axis: "v", color: "#A36736" },
        { id: "e", row: 4, col: 4, len: 2, axis: "h", color: "#C48950" },
        { id: "f", row: 2, col: 5, len: 2, axis: "v", color: "#6D3F1F" },
      ],
    },
    {
      parMoves: 13,
      pieces: [
        { id: "target", row: 2, col: 0, len: 2, axis: "h", color: "#D79A4B", isTarget: true },
        { id: "o", row: 3, col: 0, len: 3, axis: "v", color: "#86502B" },
        { id: "a", row: 1, col: 3, len: 2, axis: "v", color: "#A86A3A" },
        { id: "b", row: 1, col: 4, len: 2, axis: "h", color: "#8F562C" },
        { id: "c", row: 4, col: 3, len: 2, axis: "v", color: "#B97B44" },
        { id: "d", row: 3, col: 3, len: 2, axis: "h", color: "#7E4D28" },
        { id: "p", row: 1, col: 2, len: 3, axis: "v", color: "#A36736" },
        { id: "e", row: 4, col: 4, len: 2, axis: "h", color: "#C48950" },
        { id: "f", row: 2, col: 5, len: 2, axis: "v", color: "#6D3F1F" },
      ],
    },
    {
      parMoves: 14,
      pieces: [
        { id: "target", row: 2, col: 0, len: 2, axis: "h", color: "#D79A4B", isTarget: true },
        { id: "o", row: 3, col: 0, len: 3, axis: "v", color: "#86502B" },
        { id: "a", row: 1, col: 3, len: 2, axis: "v", color: "#A86A3A" },
        { id: "b", row: 1, col: 4, len: 2, axis: "h", color: "#8F562C" },
        { id: "c", row: 4, col: 3, len: 2, axis: "v", color: "#B97B44" },
        { id: "d", row: 3, col: 1, len: 2, axis: "h", color: "#7E4D28" },
        { id: "p", row: 0, col: 2, len: 3, axis: "v", color: "#A36736" },
        { id: "e", row: 4, col: 4, len: 2, axis: "h", color: "#C48950" },
        { id: "f", row: 2, col: 5, len: 2, axis: "v", color: "#6D3F1F" },
      ],
    },
  ],
  mid1: [
    {
      parMoves: 17,
      pieces: [
        { id: "target", row: 2, col: 0, len: 2, axis: "h", color: "#D79A4B", isTarget: true },
        { id: "o", row: 3, col: 0, len: 3, axis: "v", color: "#86502B" },
        { id: "a", row: 1, col: 3, len: 2, axis: "v", color: "#A86A3A" },
        { id: "b", row: 1, col: 4, len: 2, axis: "h", color: "#8F562C" },
        { id: "c", row: 4, col: 3, len: 2, axis: "v", color: "#B97B44" },
        { id: "d", row: 3, col: 1, len: 2, axis: "h", color: "#7E4D28" },
        { id: "p", row: 0, col: 2, len: 3, axis: "v", color: "#A36736" },
        { id: "e", row: 4, col: 1, len: 2, axis: "h", color: "#C48950" },
        { id: "f", row: 2, col: 5, len: 2, axis: "v", color: "#6D3F1F" },
      ],
    },
    {
      parMoves: 17,
      pieces: [
        { id: "target", row: 2, col: 0, len: 2, axis: "h", color: "#D79A4B", isTarget: true },
        { id: "o", row: 3, col: 0, len: 3, axis: "v", color: "#86502B" },
        { id: "a", row: 0, col: 3, len: 2, axis: "v", color: "#A86A3A" },
        { id: "b", row: 1, col: 4, len: 2, axis: "h", color: "#8F562C" },
        { id: "c", row: 3, col: 3, len: 2, axis: "v", color: "#B97B44" },
        { id: "d", row: 3, col: 1, len: 2, axis: "h", color: "#7E4D28" },
        { id: "p", row: 0, col: 2, len: 3, axis: "v", color: "#A36736" },
        { id: "e", row: 4, col: 1, len: 2, axis: "h", color: "#C48950" },
        { id: "f", row: 3, col: 5, len: 2, axis: "v", color: "#6D3F1F" },
      ],
    },
  ],
  mid2: [
    {
      parMoves: 19,
      pieces: [
        { id: "target", row: 2, col: 0, len: 2, axis: "h", color: "#D79A4B", isTarget: true },
        { id: "o", row: 3, col: 0, len: 3, axis: "v", color: "#86502B" },
        { id: "a", row: 1, col: 3, len: 2, axis: "v", color: "#A86A3A" },
        { id: "b", row: 1, col: 4, len: 2, axis: "h", color: "#8F562C" },
        { id: "c", row: 4, col: 3, len: 2, axis: "v", color: "#B97B44" },
        { id: "d", row: 3, col: 3, len: 2, axis: "h", color: "#7E4D28" },
        { id: "p", row: 1, col: 2, len: 3, axis: "v", color: "#A36736" },
        { id: "e", row: 4, col: 1, len: 2, axis: "h", color: "#C48950" },
        { id: "f", row: 2, col: 5, len: 2, axis: "v", color: "#6D3F1F" },
      ],
    },
    {
      parMoves: 19,
      pieces: [
        { id: "target", row: 2, col: 0, len: 2, axis: "h", color: "#D79A4B", isTarget: true },
        { id: "o", row: 3, col: 0, len: 3, axis: "v", color: "#86502B" },
        { id: "a", row: 0, col: 3, len: 2, axis: "v", color: "#A86A3A" },
        { id: "b", row: 1, col: 4, len: 2, axis: "h", color: "#8F562C" },
        { id: "c", row: 2, col: 3, len: 2, axis: "v", color: "#B97B44" },
        { id: "d", row: 3, col: 4, len: 2, axis: "h", color: "#7E4D28" },
        { id: "p", row: 0, col: 2, len: 3, axis: "v", color: "#A36736" },
        { id: "e", row: 4, col: 1, len: 2, axis: "h", color: "#C48950" },
        { id: "f", row: 4, col: 5, len: 2, axis: "v", color: "#6D3F1F" },
      ],
    },
  ],
  hard1: [
    {
      parMoves: 20,
      pieces: [
        { id: "target", row: 2, col: 0, len: 2, axis: "h", color: "#D79A4B", isTarget: true },
        { id: "o", row: 3, col: 0, len: 3, axis: "v", color: "#86502B" },
        { id: "a", row: 0, col: 3, len: 2, axis: "v", color: "#A86A3A" },
        { id: "b", row: 1, col: 4, len: 2, axis: "h", color: "#8F562C" },
        { id: "c", row: 2, col: 3, len: 2, axis: "v", color: "#B97B44" },
        { id: "d", row: 3, col: 4, len: 2, axis: "h", color: "#7E4D28" },
        { id: "p", row: 0, col: 2, len: 3, axis: "v", color: "#A36736" },
        { id: "e", row: 4, col: 3, len: 2, axis: "h", color: "#C48950" },
        { id: "f", row: 4, col: 5, len: 2, axis: "v", color: "#6D3F1F" },
      ],
    },
    {
      parMoves: 21,
      pieces: [
        { id: "target", row: 2, col: 0, len: 2, axis: "h", color: "#D79A4B", isTarget: true },
        { id: "o", row: 3, col: 0, len: 3, axis: "v", color: "#86502B" },
        { id: "a", row: 0, col: 3, len: 2, axis: "v", color: "#A86A3A" },
        { id: "b", row: 1, col: 4, len: 2, axis: "h", color: "#8F562C" },
        { id: "c", row: 2, col: 3, len: 2, axis: "v", color: "#B97B44" },
        { id: "d", row: 3, col: 4, len: 2, axis: "h", color: "#7E4D28" },
        { id: "p", row: 1, col: 2, len: 3, axis: "v", color: "#A36736" },
        { id: "e", row: 4, col: 3, len: 2, axis: "h", color: "#C48950" },
        { id: "f", row: 4, col: 5, len: 2, axis: "v", color: "#6D3F1F" },
      ],
    },
  ],
  hard2: [
    {
      parMoves: 22,
      pieces: [
        { id: "target", row: 2, col: 1, len: 2, axis: "h", color: "#D79A4B", isTarget: true },
        { id: "o", row: 3, col: 0, len: 3, axis: "v", color: "#86502B" },
        { id: "a", row: 0, col: 3, len: 2, axis: "v", color: "#A86A3A" },
        { id: "b", row: 1, col: 4, len: 2, axis: "h", color: "#8F562C" },
        { id: "c", row: 2, col: 3, len: 2, axis: "v", color: "#B97B44" },
        { id: "d", row: 3, col: 4, len: 2, axis: "h", color: "#7E4D28" },
        { id: "p", row: 3, col: 2, len: 3, axis: "v", color: "#A36736" },
        { id: "e", row: 4, col: 3, len: 2, axis: "h", color: "#C48950" },
        { id: "f", row: 4, col: 5, len: 2, axis: "v", color: "#6D3F1F" },
      ],
    },
    {
      parMoves: 23,
      pieces: [
        { id: "target", row: 2, col: 1, len: 2, axis: "h", color: "#D79A4B", isTarget: true },
        { id: "o", row: 1, col: 0, len: 3, axis: "v", color: "#86502B" },
        { id: "a", row: 0, col: 3, len: 2, axis: "v", color: "#A86A3A" },
        { id: "b", row: 1, col: 4, len: 2, axis: "h", color: "#8F562C" },
        { id: "c", row: 2, col: 3, len: 2, axis: "v", color: "#B97B44" },
        { id: "d", row: 3, col: 4, len: 2, axis: "h", color: "#7E4D28" },
        { id: "p", row: 3, col: 2, len: 3, axis: "v", color: "#A36736" },
        { id: "e", row: 4, col: 3, len: 2, axis: "h", color: "#C48950" },
        { id: "f", row: 4, col: 5, len: 2, axis: "v", color: "#6D3F1F" },
      ],
    },
  ],
};

const TOTAL_ROUNDS = ROUND_DIFFICULTY_ORDER.length;
const BLOCK_TEXTURES = [
  blockTexture0,
  blockTexture1,
  blockTexture2,
  blockTexture3,
  blockTexture4,
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clonePieces(pieces: PuzzlePiece[]): PuzzlePiece[] {
  return pieces.map((piece) => ({ ...piece }));
}

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let n = Math.imul(t ^ (t >>> 15), t | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getOccupancy(
  pieces: PuzzlePiece[],
  ignorePieceId?: string
): (string | null)[][] {
  const cells = Array.from({ length: GRID_SIZE }, () =>
    Array<string | null>(GRID_SIZE).fill(null)
  );

  for (const piece of pieces) {
    if (ignorePieceId && piece.id === ignorePieceId) continue;
    for (let i = 0; i < piece.len; i++) {
      const row = piece.axis === "h" ? piece.row : piece.row + i;
      const col = piece.axis === "h" ? piece.col + i : piece.col;
      cells[row][col] = piece.id;
    }
  }

  return cells;
}

function getSlideDestinations(
  pieces: PuzzlePiece[],
  pieceId: string
): SlideDestination[] {
  const piece = pieces.find((item) => item.id === pieceId);
  if (!piece) return [];

  const occupancy = getOccupancy(pieces, piece.id);
  const destinations: SlideDestination[] = [];

  if (piece.axis === "h") {
    let col = piece.col - 1;
    while (col >= 0 && occupancy[piece.row][col] === null) {
      destinations.push({ row: piece.row, col });
      col--;
    }

    let nextHeadCol = piece.col + piece.len;
    while (
      nextHeadCol < GRID_SIZE &&
      occupancy[piece.row][nextHeadCol] === null
    ) {
      const nextCol = nextHeadCol - piece.len + 1;
      destinations.push({ row: piece.row, col: nextCol });
      nextHeadCol++;
    }
  } else {
    let row = piece.row - 1;
    while (row >= 0 && occupancy[row][piece.col] === null) {
      destinations.push({ row, col: piece.col });
      row--;
    }

    let nextHeadRow = piece.row + piece.len;
    while (
      nextHeadRow < GRID_SIZE &&
      occupancy[nextHeadRow][piece.col] === null
    ) {
      const nextRow = nextHeadRow - piece.len + 1;
      destinations.push({ row: nextRow, col: piece.col });
      nextHeadRow++;
    }
  }

  return destinations;
}

function isSolved(pieces: PuzzlePiece[]): boolean {
  const target = pieces.find((piece) => piece.isTarget);
  if (!target) return false;
  return target.row === EXIT_ROW && target.col + target.len - 1 === EXIT_COL;
}

function applyMove(
  pieces: PuzzlePiece[],
  pieceId: string,
  row: number,
  col: number
): PuzzlePiece[] {
  return pieces.map((piece) =>
    piece.id === pieceId ? { ...piece, row, col } : piece
  );
}

const TIER_MOVE_RANGES: Record<DifficultyTier, [number, number]> = {
  easy1: [3, 5],
  easy2: [5, 7],
  mid1: [8, 10],
  mid2: [10, 12],
  hard1: [11, 13],
  hard2: [12, 14],
};

const TIER_SCRAMBLE_SETTINGS: Record<
  DifficultyTier,
  { base: number; randomSpan: number; attemptScale: number }
> = {
  easy1: { base: 1, randomSpan: 4, attemptScale: 0.12 },
  easy2: { base: 1, randomSpan: 6, attemptScale: 0.16 },
  mid1: { base: 3, randomSpan: 10, attemptScale: 0.2 },
  mid2: { base: 4, randomSpan: 12, attemptScale: 0.24 },
  hard1: { base: 5, randomSpan: 13, attemptScale: 0.26 },
  hard2: { base: 6, randomSpan: 14, attemptScale: 0.28 },
};

const TIER_DIVERSITY_TARGETS: Record<DifficultyTier, number> = {
  easy1: 8,
  easy2: 10,
  mid1: 12,
  mid2: 13,
  hard1: 14,
  hard2: 15,
};

const TIER_VARIATION_REQUIREMENTS: Record<
  DifficultyTier,
  { minLongMoved: number; minShortMoved: number; minTotalMoved: number }
> = {
  easy1: { minLongMoved: 1, minShortMoved: 3, minTotalMoved: 5 },
  easy2: { minLongMoved: 1, minShortMoved: 4, minTotalMoved: 6 },
  mid1: { minLongMoved: 2, minShortMoved: 4, minTotalMoved: 6 },
  mid2: { minLongMoved: 2, minShortMoved: 5, minTotalMoved: 7 },
  hard1: { minLongMoved: 2, minShortMoved: 5, minTotalMoved: 7 },
  hard2: { minLongMoved: 2, minShortMoved: 6, minTotalMoved: 8 },
};

function encodeState(pieces: PuzzlePiece[]): string {
  return pieces.map((piece) => `${piece.row},${piece.col}`).join("|");
}

function analyzeMoveDiversity(pieces: PuzzlePiece[]): MoveDiversitySnapshot {
  let movablePieces = 0;
  let multiOptionPieces = 0;
  let totalDestinations = 0;
  let horizontalMovers = 0;
  let verticalMovers = 0;

  for (const piece of pieces) {
    const destinations = getSlideDestinations(pieces, piece.id);
    if (!destinations.length) continue;

    movablePieces++;
    totalDestinations += destinations.length;
    if (destinations.length >= 2) multiOptionPieces++;
    if (piece.axis === "h") horizontalMovers++;
    else verticalMovers++;
  }

  return {
    movablePieces,
    multiOptionPieces,
    totalDestinations,
    horizontalMovers,
    verticalMovers,
  };
}

function getMoveDiversityScore(snapshot: MoveDiversitySnapshot): number {
  const axisBalance = Math.min(snapshot.horizontalMovers, snapshot.verticalMovers);
  const weighted =
    snapshot.movablePieces * 2 +
    snapshot.multiOptionPieces * 2.4 +
    snapshot.totalDestinations * 0.75 +
    axisBalance * 1.5;
  return Math.round(weighted);
}

function getMoveStyleProfile(snapshot: MoveDiversitySnapshot): string {
  const moverBand = Math.min(6, snapshot.movablePieces);
  const optionBand = Math.min(5, snapshot.multiOptionPieces);
  const destinationBand = Math.min(6, Math.floor(snapshot.totalDestinations / 3));
  const axisShape =
    snapshot.horizontalMovers === snapshot.verticalMovers
      ? "bal"
      : snapshot.horizontalMovers > snapshot.verticalMovers
        ? "h"
        : "v";
  return `${moverBand}-${optionBand}-${destinationBand}-${axisShape}`;
}

function getBlockVariationPenalty(
  tier: DifficultyTier,
  candidatePieces: PuzzlePiece[],
  previousPieces: PuzzlePiece[] | null
): number {
  if (!previousPieces) return 0;

  const prevById = new Map(previousPieces.map((piece) => [piece.id, piece]));
  let longMoved = 0;
  let shortMoved = 0;
  let totalMoved = 0;
  let unchanged = 0;
  let totalManhattan = 0;

  for (const piece of candidatePieces) {
    if (piece.isTarget) continue;
    const prev = prevById.get(piece.id);
    if (!prev) continue;
    const moved = prev.row !== piece.row || prev.col !== piece.col;
    if (!moved) {
      unchanged++;
      continue;
    }

    totalMoved++;
    totalManhattan += Math.abs(prev.row - piece.row) + Math.abs(prev.col - piece.col);
    if (piece.len >= 3) longMoved++;
    else shortMoved++;
  }

  const requirement = TIER_VARIATION_REQUIREMENTS[tier];
  const longDeficit = Math.max(0, requirement.minLongMoved - longMoved);
  const shortDeficit = Math.max(0, requirement.minShortMoved - shortMoved);
  const totalDeficit = Math.max(0, requirement.minTotalMoved - totalMoved);
  const overlapPenalty = Math.max(0, unchanged - 1) * 2.2;
  const displacementBonus = Math.min(2.2, totalManhattan * 0.12);

  if (longDeficit === 0 && shortDeficit === 0 && totalDeficit === 0) {
    const surplus = Math.max(0, totalMoved - requirement.minTotalMoved);
    return Math.max(0, 0.8 - surplus * 0.24 + overlapPenalty - displacementBonus);
  }

  return longDeficit * 7 + shortDeficit * 4 + totalDeficit * 3 + overlapPenalty - displacementBonus;
}

function getHistoryVariationPenalty(
  tier: DifficultyTier,
  candidatePieces: PuzzlePiece[],
  historyPieces: PuzzlePiece[][]
): number {
  if (!historyPieces.length) return 0;

  const recent = historyPieces.slice(-2).reverse();
  let totalPenalty = 0;

  for (let i = 0; i < recent.length; i++) {
    const reference = recent[i];
    const basePenalty = getBlockVariationPenalty(tier, candidatePieces, reference);
    const weight = i === 0 ? 1.5 : 0.9;
    totalPenalty += basePenalty * weight;
  }

  return totalPenalty;
}

function getCandidateSelectionScore(
  candidate: RoundVariantCandidate,
  usedStyleProfiles: Set<string>
): number {
  const repeatedStylePenalty = usedStyleProfiles.has(candidate.styleProfile) ? 4.2 : 0;
  const diversityBonus = Math.min(1.4, candidate.diversityScore / 24);
  return candidate.fitScore + repeatedStylePenalty - diversityBonus;
}

function solveMinMoves(startPieces: PuzzlePiece[], maxStates = 90000): number {
  if (isSolved(startPieces)) return 0;
  const queue: Array<{ pieces: PuzzlePiece[]; depth: number }> = [
    { pieces: clonePieces(startPieces), depth: 0 },
  ];
  const visited = new Set<string>([encodeState(startPieces)]);
  let cursor = 0;

  while (cursor < queue.length && visited.size <= maxStates) {
    const current = queue[cursor++];
    for (const piece of current.pieces) {
      const destinations = getSlideDestinations(current.pieces, piece.id);
      for (const destination of destinations) {
        const nextPieces = applyMove(
          current.pieces,
          piece.id,
          destination.row,
          destination.col
        );
        const key = encodeState(nextPieces);
        if (visited.has(key)) continue;
        if (isSolved(nextPieces)) return current.depth + 1;
        visited.add(key);
        queue.push({ pieces: nextPieces, depth: current.depth + 1 });
      }
    }
  }

  return -1;
}

function rangeDistance(value: number, range: [number, number]): number {
  if (value < range[0]) return range[0] - value;
  if (value > range[1]) return value - range[1];
  return 0;
}

function getTierFitScore(tier: DifficultyTier, minMoves: number): number {
  const range = TIER_MOVE_RANGES[tier];
  const distance = rangeDistance(minMoves, range);
  const targetMid = (range[0] + range[1]) / 2;
  return distance * 10 + Math.abs(minMoves - targetMid);
}

function scramblePieces(
  base: PuzzlePiece[],
  rng: () => number,
  steps: number
): PuzzlePiece[] {
  let pieces = clonePieces(base);
  let previousReverse = "";

  for (let i = 0; i < steps; i++) {
    const candidates: Array<{ pieceId: string; row: number; col: number; reverse: string }> = [];
    for (const piece of pieces) {
      const destinations = getSlideDestinations(pieces, piece.id);
      for (const destination of destinations) {
        const nextKey = `${piece.id}:${destination.row},${destination.col}`;
        if (nextKey === previousReverse) continue;
        candidates.push({
          pieceId: piece.id,
          row: destination.row,
          col: destination.col,
          reverse: `${piece.id}:${piece.row},${piece.col}`,
        });
      }
    }
    if (!candidates.length) break;

    const picked = candidates[Math.floor(rng() * candidates.length)];
    previousReverse = picked.reverse;
    pieces = applyMove(pieces, picked.pieceId, picked.row, picked.col);
  }

  if (isSolved(pieces)) {
    const target = pieces.find((piece) => piece.isTarget);
    if (target) {
      const leftMoves = getSlideDestinations(pieces, target.id).filter(
        (destination) => destination.col < target.col
      );
      if (leftMoves.length) {
        const farLeft = leftMoves[leftMoves.length - 1];
        pieces = applyMove(pieces, target.id, farLeft.row, farLeft.col);
      }
    }
  }

  return pieces;
}

function buildRoundVariant(
  template: Omit<PuzzleRound, "id">,
  tier: DifficultyTier,
  rng: () => number,
  usedSignatures: Set<string>,
  recentHistoryPieces: PuzzlePiece[][]
): RoundVariantCandidate | null {
  let best: RoundVariantCandidate | null = null;
  const scrambleSettings = TIER_SCRAMBLE_SETTINGS[tier];
  const diversityTarget = TIER_DIVERSITY_TARGETS[tier];

  const consider = (candidate: PuzzlePiece[], fallbackParMoves: number) => {
    const signature = getPiecesSignature(candidate);
    if (usedSignatures.has(signature)) return;

    const minMoves = solveMinMoves(candidate);
    if (minMoves < 1) return;

    const diversity = analyzeMoveDiversity(candidate);
    const diversityScore = getMoveDiversityScore(diversity);
    const styleProfile = getMoveStyleProfile(diversity);
    const diversityGap = Math.max(0, diversityTarget - diversityScore);
    const diversityBonus = Math.min(1.2, Math.max(0, diversityScore - diversityTarget) * 0.08);
    const variationPenalty = getHistoryVariationPenalty(
      tier,
      candidate,
      recentHistoryPieces
    );
    const fitScore =
      getTierFitScore(tier, minMoves) +
      diversityGap * 1.9 -
      diversityBonus +
      variationPenalty;

    if (!best || fitScore < best.fitScore) {
      best = {
        pieces: clonePieces(candidate),
        parMoves: minMoves > 0 ? minMoves : fallbackParMoves,
        signature,
        fitScore,
        diversityScore,
        styleProfile,
        variationPenalty,
      };
      return;
    }

    if (
      best &&
      Math.abs(fitScore - best.fitScore) < 0.3 &&
      diversityScore > best.diversityScore
    ) {
      best = {
        pieces: clonePieces(candidate),
        parMoves: minMoves > 0 ? minMoves : fallbackParMoves,
        signature,
        fitScore,
        diversityScore,
        styleProfile,
        variationPenalty,
      };
    }
  };

  consider(template.pieces, template.parMoves);

  for (let attempt = 0; attempt < 140; attempt++) {
    const steps =
      scrambleSettings.base +
      Math.floor(rng() * scrambleSettings.randomSpan) +
      Math.floor(attempt * scrambleSettings.attemptScale);
    const candidate = scramblePieces(template.pieces, rng, steps);
    consider(candidate, template.parMoves);
    if (
      best &&
      best.fitScore <= 0.1 &&
      best.diversityScore >= diversityTarget &&
      best.variationPenalty <= 1.6
    ) {
      break;
    }
  }

  return best;
}

function getPiecesSignature(pieces: PuzzlePiece[]): string {
  return pieces.map((piece) => `${piece.id}:${piece.row},${piece.col}`).join("|");
}

function findUniqueReachableState(
  startPieces: PuzzlePiece[],
  usedSignatures: Set<string>,
  maxStates = 150000
): PuzzlePiece[] | null {
  const queue: PuzzlePiece[][] = [clonePieces(startPieces)];
  const visited = new Set<string>([encodeState(startPieces)]);
  let cursor = 0;

  while (cursor < queue.length && visited.size <= maxStates) {
    const current = queue[cursor++];
    const signature = getPiecesSignature(current);
    if (!usedSignatures.has(signature) && !isSolved(current)) {
      return clonePieces(current);
    }

    for (const piece of current) {
      const destinations = getSlideDestinations(current, piece.id);
      for (const destination of destinations) {
        const next = applyMove(current, piece.id, destination.row, destination.col);
        const key = encodeState(next);
        if (visited.has(key)) continue;
        visited.add(key);
        queue.push(next);
      }
    }
  }

  return null;
}

function tryCreateProgressiveRounds(seed: number): PuzzleRound[] | null {
  const rng = createRng(seed ^ 0xa341316c);
  const used = new Set<string>();
  const usedStyleProfiles = new Set<string>();
  const rounds: PuzzleRound[] = [];

  for (let index = 0; index < ROUND_DIFFICULTY_ORDER.length; index++) {
    const tier = ROUND_DIFFICULTY_ORDER[index];
    const diversityTarget = TIER_DIVERSITY_TARGETS[tier];
    const recentHistoryPieces = rounds
      .slice(-2)
      .map((round) => round.pieces);
    const pool = shuffleWithRng(ROUND_POOLS[tier], rng);
    let picked: RoundVariantCandidate | null = null;

    for (const template of pool) {
      const candidate = buildRoundVariant(
        template,
        tier,
        rng,
        used,
        recentHistoryPieces
      );
      if (!candidate) continue;
      const candidateScore = getCandidateSelectionScore(candidate, usedStyleProfiles);
      const pickedScore = picked
        ? getCandidateSelectionScore(picked, usedStyleProfiles)
        : Number.POSITIVE_INFINITY;

      if (
        !picked ||
        candidateScore < pickedScore ||
        (Math.abs(candidateScore - pickedScore) < 0.25 &&
          candidate.diversityScore > picked.diversityScore)
      ) {
        picked = candidate;
      }
      if (
        candidate.fitScore <= 0.1 &&
        candidate.diversityScore >= diversityTarget &&
        candidate.variationPenalty <= 1.6
      ) {
        break;
      }
    }

    if (!picked) {
      for (const template of pool) {
        let walker = clonePieces(template.pieces);
        for (let step = 0; step < 260; step++) {
          const moves: Array<{ pieceId: string; row: number; col: number }> = [];
          for (const piece of walker) {
            const destinations = getSlideDestinations(walker, piece.id);
            for (const destination of destinations) {
              moves.push({
                pieceId: piece.id,
                row: destination.row,
                col: destination.col,
              });
            }
          }

          if (!moves.length) break;
          const move = moves[Math.floor(rng() * moves.length)];
          walker = applyMove(walker, move.pieceId, move.row, move.col);

          const signature = getPiecesSignature(walker);
          if (used.has(signature) || isSolved(walker)) continue;

          const minMoves = solveMinMoves(walker);
          if (minMoves < 1) continue;
          const diversity = analyzeMoveDiversity(walker);
          const diversityScore = getMoveDiversityScore(diversity);
          const styleProfile = getMoveStyleProfile(diversity);
          const diversityGap = Math.max(0, diversityTarget - diversityScore);
          const variationPenalty = getHistoryVariationPenalty(
            tier,
            walker,
            recentHistoryPieces
          );

          const candidate: RoundVariantCandidate = {
            pieces: clonePieces(walker),
            parMoves: minMoves,
            signature,
            fitScore:
              getTierFitScore(tier, minMoves) +
              diversityGap * 1.9 +
              0.5 +
              variationPenalty,
            diversityScore,
            styleProfile,
            variationPenalty,
          };

          const candidateScore = getCandidateSelectionScore(candidate, usedStyleProfiles);
          const pickedScore = picked
            ? getCandidateSelectionScore(picked, usedStyleProfiles)
            : Number.POSITIVE_INFINITY;
          if (
            !picked ||
            candidateScore < pickedScore ||
            (Math.abs(candidateScore - pickedScore) < 0.25 &&
              candidate.diversityScore > picked.diversityScore)
          ) {
            picked = candidate;
          }

          if (
            candidate.fitScore <= 0.7 &&
            candidate.diversityScore >= diversityTarget &&
            candidate.variationPenalty <= 1.6 &&
            !usedStyleProfiles.has(candidate.styleProfile)
          ) {
            break;
          }
        }

        if (
          picked &&
          picked.fitScore <= 0.7 &&
          picked.diversityScore >= diversityTarget &&
          picked.variationPenalty <= 1.6 &&
          !usedStyleProfiles.has(picked.styleProfile)
        ) {
          break;
        }
      }
    }

    if (!picked) {
      for (const template of pool) {
        const reachable = findUniqueReachableState(template.pieces, used);
        if (!reachable) continue;
        const minMoves = solveMinMoves(reachable);
        if (minMoves < 1) continue;
        const diversity = analyzeMoveDiversity(reachable);
        const diversityScore = getMoveDiversityScore(diversity);
        const diversityGap = Math.max(0, diversityTarget - diversityScore);
        const variationPenalty = getHistoryVariationPenalty(
          tier,
          reachable,
          recentHistoryPieces
        );
        const candidate: RoundVariantCandidate = {
          pieces: clonePieces(reachable),
          parMoves: minMoves,
          signature: getPiecesSignature(reachable),
          fitScore:
            getTierFitScore(tier, minMoves) +
            diversityGap * 1.9 +
            1 +
            variationPenalty,
          diversityScore,
          styleProfile: getMoveStyleProfile(diversity),
          variationPenalty,
        };
        const candidateScore = getCandidateSelectionScore(candidate, usedStyleProfiles);
        const pickedScore = picked
          ? getCandidateSelectionScore(picked, usedStyleProfiles)
          : Number.POSITIVE_INFINITY;
        if (
          !picked ||
          candidateScore < pickedScore ||
          (Math.abs(candidateScore - pickedScore) < 0.25 &&
            candidate.diversityScore > picked.diversityScore)
        ) {
          picked = candidate;
        }
      }
    }

    if (!picked || used.has(picked.signature)) {
      return null;
    }

    used.add(picked.signature);
    usedStyleProfiles.add(picked.styleProfile);
    rounds.push({
      id: index + 1,
      parMoves: picked.parMoves,
      pieces: clonePieces(picked.pieces),
    });
  }

  return rounds;
}

function createProgressiveRounds(seed: number): PuzzleRound[] {
  for (let attempt = 0; attempt < 12; attempt++) {
    const attemptSeed = (seed + Math.imul(attempt + 1, 0x9e3779b9)) >>> 0;
    const rounds = tryCreateProgressiveRounds(attemptSeed);
    if (rounds) return rounds;
  }

  const used = new Set<string>();
  const usedStyleProfiles = new Set<string>();
  const deterministicRounds: PuzzleRound[] = [];
  const deterministicRng = createRng(seed ^ 0x51ed270b);

  for (let index = 0; index < ROUND_DIFFICULTY_ORDER.length; index++) {
    const tier = ROUND_DIFFICULTY_ORDER[index];
    const diversityTarget = TIER_DIVERSITY_TARGETS[tier];
    const recentHistoryPieces = deterministicRounds
      .slice(-2)
      .map((round) => round.pieces);
    const pool = ROUND_POOLS[tier];
    let picked: RoundVariantCandidate | null = null;

    for (const template of pool) {
      const reachable = findUniqueReachableState(template.pieces, used, 250000);
      if (!reachable) continue;
      const minMoves = solveMinMoves(reachable);
      if (minMoves < 1) continue;
      const diversity = analyzeMoveDiversity(reachable);
      const diversityScore = getMoveDiversityScore(diversity);
      const diversityGap = Math.max(0, diversityTarget - diversityScore);
      const variationPenalty = getHistoryVariationPenalty(
        tier,
        reachable,
        recentHistoryPieces
      );
      const candidate: RoundVariantCandidate = {
        pieces: clonePieces(reachable),
        parMoves: minMoves,
        signature: getPiecesSignature(reachable),
        fitScore:
          getTierFitScore(tier, minMoves) +
          diversityGap * 1.9 +
          1 +
          variationPenalty,
        diversityScore,
        styleProfile: getMoveStyleProfile(diversity),
        variationPenalty,
      };
      const candidateScore = getCandidateSelectionScore(candidate, usedStyleProfiles);
      const pickedScore = picked
        ? getCandidateSelectionScore(picked, usedStyleProfiles)
        : Number.POSITIVE_INFINITY;
      if (
        !picked ||
        candidateScore < pickedScore ||
        (Math.abs(candidateScore - pickedScore) < 0.25 &&
          candidate.diversityScore > picked.diversityScore)
      ) {
        picked = candidate;
      }
    }

    if (!picked) {
      for (const template of pool) {
        let walker = clonePieces(template.pieces);
        for (let step = 0; step < 320; step++) {
          const signature = getPiecesSignature(walker);
          if (!used.has(signature) && !isSolved(walker)) {
            const minMoves = solveMinMoves(walker);
            if (minMoves > 0) {
              const diversity = analyzeMoveDiversity(walker);
              const diversityScore = getMoveDiversityScore(diversity);
              const diversityGap = Math.max(0, diversityTarget - diversityScore);
              const variationPenalty = getHistoryVariationPenalty(
                tier,
                walker,
                recentHistoryPieces
              );
              const candidate: RoundVariantCandidate = {
                pieces: clonePieces(walker),
                parMoves: minMoves,
                signature,
                fitScore:
                  getTierFitScore(tier, minMoves) +
                  diversityGap * 1.9 +
                  1.2 +
                  variationPenalty,
                diversityScore,
                styleProfile: getMoveStyleProfile(diversity),
                variationPenalty,
              };
              const candidateScore = getCandidateSelectionScore(candidate, usedStyleProfiles);
              const pickedScore = picked
                ? getCandidateSelectionScore(picked, usedStyleProfiles)
                : Number.POSITIVE_INFINITY;
              if (
                !picked ||
                candidateScore < pickedScore ||
                (Math.abs(candidateScore - pickedScore) < 0.25 &&
                  candidate.diversityScore > picked.diversityScore)
              ) {
                picked = candidate;
              }
            }
          }

          const moves: Array<{ pieceId: string; row: number; col: number }> = [];
          for (const piece of walker) {
            const destinations = getSlideDestinations(walker, piece.id);
            for (const destination of destinations) {
              moves.push({
                pieceId: piece.id,
                row: destination.row,
                col: destination.col,
              });
            }
          }

          if (!moves.length) break;
          const move = moves[Math.floor(deterministicRng() * moves.length)];
          walker = applyMove(walker, move.pieceId, move.row, move.col);
        }

        if (
          picked &&
          picked.fitScore <= 0.9 &&
          picked.diversityScore >= diversityTarget &&
          picked.variationPenalty <= 1.6 &&
          !usedStyleProfiles.has(picked.styleProfile)
        ) {
          break;
        }
      }
    }

    if (!picked) {
      const fallbackTemplate =
        pool.find((template) => !used.has(getPiecesSignature(template.pieces))) ?? pool[0];
      const fallbackPieces = clonePieces(fallbackTemplate.pieces);
      const fallbackMoves = solveMinMoves(fallbackPieces);
      const diversity = analyzeMoveDiversity(fallbackPieces);
      const diversityScore = getMoveDiversityScore(diversity);
      const diversityGap = Math.max(0, diversityTarget - diversityScore);
      const variationPenalty = getHistoryVariationPenalty(
        tier,
        fallbackPieces,
        recentHistoryPieces
      );
      picked = {
        pieces: fallbackPieces,
        parMoves: fallbackMoves > 0 ? fallbackMoves : fallbackTemplate.parMoves,
        signature: getPiecesSignature(fallbackPieces),
        fitScore:
          getTierFitScore(
            tier,
            fallbackMoves > 0 ? fallbackMoves : fallbackTemplate.parMoves
          ) +
          diversityGap * 1.9 +
          2 +
          variationPenalty,
        diversityScore,
        styleProfile: getMoveStyleProfile(diversity),
        variationPenalty,
      };
    }

    if (used.has(picked.signature)) {
      const retryRounds = tryCreateProgressiveRounds(
        (seed + Math.imul(index + 5, 0x7f4a7c15)) >>> 0
      );
      if (retryRounds) return retryRounds;

      const backupTemplate =
        pool.find((template) => !used.has(getPiecesSignature(template.pieces))) ?? null;
      if (backupTemplate) {
        const backupPieces = clonePieces(backupTemplate.pieces);
        const backupMoves = solveMinMoves(backupPieces);
        const backupDiversity = analyzeMoveDiversity(backupPieces);
        const backupDiversityScore = getMoveDiversityScore(backupDiversity);
        const variationPenalty = getHistoryVariationPenalty(
          tier,
          backupPieces,
          recentHistoryPieces
        );
        picked = {
          pieces: backupPieces,
          parMoves: backupMoves > 0 ? backupMoves : backupTemplate.parMoves,
          signature: getPiecesSignature(backupPieces),
          fitScore: getTierFitScore(
            tier,
            backupMoves > 0 ? backupMoves : backupTemplate.parMoves
          ) + variationPenalty,
          diversityScore: backupDiversityScore,
          styleProfile: getMoveStyleProfile(backupDiversity),
          variationPenalty,
        };
      }
    }

    if (used.has(picked.signature)) {
      let walker = clonePieces(picked.pieces);
      for (let attempt = 0; attempt < 220; attempt++) {
        const moves: Array<{ pieceId: string; row: number; col: number }> = [];
        for (const piece of walker) {
          const destinations = getSlideDestinations(walker, piece.id);
          for (const destination of destinations) {
            moves.push({
              pieceId: piece.id,
              row: destination.row,
              col: destination.col,
            });
          }
        }
        if (!moves.length) break;
        const move = moves[Math.floor(deterministicRng() * moves.length)];
        walker = applyMove(walker, move.pieceId, move.row, move.col);
        const signature = getPiecesSignature(walker);
        if (used.has(signature) || isSolved(walker)) continue;

        const minMoves = solveMinMoves(walker);
        if (minMoves < 1) continue;
        const diversity = analyzeMoveDiversity(walker);
        const variationPenalty = getHistoryVariationPenalty(
          tier,
          walker,
          recentHistoryPieces
        );
        picked = {
          pieces: clonePieces(walker),
          parMoves: minMoves,
          signature,
          fitScore: getTierFitScore(tier, minMoves) + variationPenalty,
          diversityScore: getMoveDiversityScore(diversity),
          styleProfile: getMoveStyleProfile(diversity),
          variationPenalty,
        };
        break;
      }
    }

    if (used.has(picked.signature)) {
      const emergencyTemplate =
        pool.find((template) => !used.has(getPiecesSignature(template.pieces))) ?? null;
      if (emergencyTemplate) {
        const emergencyPieces = clonePieces(emergencyTemplate.pieces);
        const emergencyMoves = solveMinMoves(emergencyPieces);
        const emergencyDiversity = analyzeMoveDiversity(emergencyPieces);
        const variationPenalty = getHistoryVariationPenalty(
          tier,
          emergencyPieces,
          recentHistoryPieces
        );
        picked = {
          pieces: emergencyPieces,
          parMoves:
            emergencyMoves > 0 ? emergencyMoves : emergencyTemplate.parMoves,
          signature: getPiecesSignature(emergencyPieces),
          fitScore: getTierFitScore(
            tier,
            emergencyMoves > 0 ? emergencyMoves : emergencyTemplate.parMoves
          ) + variationPenalty,
          diversityScore: getMoveDiversityScore(emergencyDiversity),
          styleProfile: getMoveStyleProfile(emergencyDiversity),
          variationPenalty,
        };
      }
    }

    used.add(picked.signature);
    usedStyleProfiles.add(picked.styleProfile);
    deterministicRounds.push({
      id: index + 1,
      parMoves: picked.parMoves,
      pieces: clonePieces(picked.pieces),
    });
  }

  return deterministicRounds;
}

function getRoundTargetMoves(roundIdx: number): number {
  return ROUND_SCORE_TARGET_MOVES[clamp(roundIdx, 0, ROUND_SCORE_TARGET_MOVES.length - 1)];
}

function calculateRoundScore(moves: number, targetMoves: number): number {
  const over = Math.max(0, moves - targetMoves);
  return clamp(ROUND_SCORE_MAX - over * 2, 0, ROUND_SCORE_MAX);
}

function calculateFindPartsFinalScores(
  scores: number[],
  roundCount: number
): { stageScore2500: number; resultScore100: number } {
  const safeRoundCount = Math.max(1, roundCount);
  const totalRoundScore = scores.reduce((sum, value) => sum + clamp(value ?? 0, 0, ROUND_SCORE_MAX), 0);
  const maxRoundScore = safeRoundCount * ROUND_SCORE_MAX;
  const stageScore2500 = Math.round((totalRoundScore / Math.max(1, maxRoundScore)) * FIND_PARTS_STAGE_MAX_SCORE);
  const resultScore100 = Math.round((stageScore2500 / FIND_PARTS_STAGE_MAX_SCORE) * 100);
  return { stageScore2500, resultScore100 };
}

function getPieceTexture(piece: PuzzlePiece): string {
  if (piece.isTarget) return BLOCK_TEXTURES[0];

  let hash = 0;
  for (let i = 0; i < piece.id.length; i++) {
    hash = (hash * 33 + piece.id.charCodeAt(i)) >>> 0;
  }
  return BLOCK_TEXTURES[(hash % (BLOCK_TEXTURES.length - 1)) + 1];
}

function buildSession(seedText: string): {
  rounds: PuzzleRound[];
  rewardOrder: WoodpeckerPart[];
} {
  const seedBase = hashSeed(seedText);
  const rounds = createProgressiveRounds(seedBase);
  const rng = createRng(seedBase ^ 0x9e3779b9);
  const rewardOrder = shuffleWithRng(WOODPECKER_PARTS, rng);
  return { rounds, rewardOrder };
}

export function FindPartsGame({ onComplete, soundOn = true }: FindPartsGameProps) {
  const initialSession = useMemo(
    () => buildSession(`${Date.now()}-${Math.random()}`),
    []
  );

  const [phase, setPhase] = useState<Phase>("ready");
  const [rounds, setRounds] = useState<PuzzleRound[]>(initialSession.rounds);
  const [rewardOrder, setRewardOrder] = useState<WoodpeckerPart[]>(
    initialSession.rewardOrder
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [pieces, setPieces] = useState<PuzzlePiece[]>(
    initialSession.rounds[0] ? clonePieces(initialSession.rounds[0].pieces) : []
  );
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [collectedParts, setCollectedParts] = useState<WoodpeckerPart[]>([]);
  const [lastReward, setLastReward] = useState<WoodpeckerPart | null>(null);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [shakeBoard, setShakeBoard] = useState(false);
  const [roundTimeLeftMs, setRoundTimeLeftMs] = useState(ROUND_TIME_LIMIT_MS);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const roundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundDeadlineRef = useRef<number | null>(null);

  const currentRound = rounds[roundIndex];
  const currentRoundTargetMoves = getRoundTargetMoves(roundIndex);
  const currentRoundScore = calculateRoundScore(moveCount, currentRoundTargetMoves);
  const roundTimeLeftSec = Math.max(0, Math.ceil(roundTimeLeftMs / 1000));

  useEffect(() => {
    if (!currentRound) return;
    setPieces(clonePieces(currentRound.pieces));
    setMoveCount(0);
    setSelectedPieceId(null);
    setDraggingPieceId(null);
    setDragOffsetPx(0);
    dragRef.current = null;
  }, [currentRound]);

  useEffect(() => {
    if (!soundOn) {
      stopBGM();
      return;
    }
    // 랜덤박스 탈출 퍼즐 화면(시작 전 포함)에서는 이 트랙을 유지한다.
    startBGM({ source: woodBlockBgmTrack, volume: 0.58 });
  }, [soundOn]);

  const stopRoundTimer = useCallback(() => {
    if (roundTimerRef.current) {
      clearInterval(roundTimerRef.current);
      roundTimerRef.current = null;
    }
    roundDeadlineRef.current = null;
  }, []);

  const startRoundTimer = useCallback(() => {
    stopRoundTimer();
    const deadline = Date.now() + ROUND_TIME_LIMIT_MS;
    roundDeadlineRef.current = deadline;
    setRoundTimeLeftMs(ROUND_TIME_LIMIT_MS);

    roundTimerRef.current = setInterval(() => {
      const remain = Math.max(0, deadline - Date.now());
      setRoundTimeLeftMs(remain);

      if (remain <= 0) {
        stopRoundTimer();
        dragRef.current = null;
        setSelectedPieceId(null);
        setDraggingPieceId(null);
        setDragOffsetPx(0);
        setPhase((prev) => (prev === "playing" ? "roundFail" : prev));
        sfxPuzzleBlocked();
      }
    }, 120);
  }, [stopRoundTimer]);

  useEffect(() => {
    if (phase === "playing" && currentRound) {
      startRoundTimer();
      return;
    }
    stopRoundTimer();
  }, [phase, currentRound, roundIndex, startRoundTimer, stopRoundTimer]);

  useEffect(() => {
    return () => {
      stopRoundTimer();
      stopBGM();
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [stopRoundTimer]);

  const getCellSizePx = useCallback(() => {
    if (!boardRef.current) return 1;
    return boardRef.current.getBoundingClientRect().width / GRID_SIZE;
  }, []);

  const startGame = useCallback(() => {
    sfxButtonPress();
    const session = buildSession(`${Date.now()}-${Math.random()}`);
    setRounds(session.rounds);
    setRewardOrder(session.rewardOrder);
    setRoundIndex(0);
    setCollectedParts([]);
    setLastReward(null);
    setRoundScores([]);
    setMoveCount(0);
    setSelectedPieceId(null);
    setDraggingPieceId(null);
    setDragOffsetPx(0);
    setRoundTimeLeftMs(ROUND_TIME_LIMIT_MS);
    setPieces(clonePieces(session.rounds[0].pieces));
    setPhase("playing");
  }, []);

  const completeCurrentRound = useCallback(
    (nextMoveCount: number) => {
      if (!currentRound) return;

      const targetMoves = getRoundTargetMoves(roundIndex);
      const roundScore = calculateRoundScore(nextMoveCount, targetMoves);
      const reward =
        rewardOrder[roundIndex % rewardOrder.length] ??
        WOODPECKER_PARTS[roundIndex % WOODPECKER_PARTS.length];

      setLastReward(reward);
      setCollectedParts((prev) => [...prev, reward]);

      const nextScores = [...roundScores];
      nextScores[roundIndex] = roundScore;
      setRoundScores(nextScores);

      const isLastRound = roundIndex >= rounds.length - 1;
      if (isLastRound) {
        stopRoundTimer();
        stopBGM();
        setPhase("complete");
        sfxComplete();
        const { resultScore100 } = calculateFindPartsFinalScores(nextScores, rounds.length);
        completeTimerRef.current = setTimeout(() => onComplete(resultScore100), 1700);
      } else {
        stopRoundTimer();
        setPhase("roundClear");
      }
    },
    [currentRound, onComplete, rewardOrder, roundIndex, roundScores, rounds.length, stopRoundTimer]
  );

  const movePiece = useCallback(
    (pieceId: string, row: number, col: number) => {
      if (phase !== "playing") return;
      const piece = pieces.find((item) => item.id === pieceId);
      if (!piece) return;

      const possible = getSlideDestinations(pieces, pieceId);
      const allowed = possible.find(
        (destination) => destination.row === row && destination.col === col
      );

      if (!allowed) {
        setShakeBoard(true);
        sfxPuzzleBlocked();
        setTimeout(() => setShakeBoard(false), 280);
        return;
      }

      const nextPieces = applyMove(pieces, pieceId, row, col);
      const nextMoveCount = moveCount + 1;
      setPieces(nextPieces);
      setMoveCount(nextMoveCount);
      sfxWoodBlockSlide();

      if (isSolved(nextPieces)) {
        sfxPuzzleRescue();
        completeCurrentRound(nextMoveCount);
      }
    },
    [completeCurrentRound, moveCount, phase, pieces]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, piece: PuzzlePiece) => {
      if (phase !== "playing") return;
      const destinations = getSlideDestinations(pieces, piece.id);
      if (!destinations.length) {
        setShakeBoard(true);
        sfxPuzzleBlocked();
        setTimeout(() => setShakeBoard(false), 280);
        return;
      }

      const offsets = destinations.map((destination) =>
        piece.axis === "h" ? destination.col - piece.col : destination.row - piece.row
      );
      const minOffset = Math.min(0, ...offsets);
      const maxOffset = Math.max(0, ...offsets);

      dragRef.current = {
        pieceId: piece.id,
        pointerId: event.pointerId,
        axis: piece.axis,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startRow: piece.row,
        startCol: piece.col,
        minOffsetCells: minOffset,
        maxOffsetCells: maxOffset,
      };

      setSelectedPieceId(piece.id);
      setDraggingPieceId(piece.id);
      setDragOffsetPx(0);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [phase, pieces]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, pieceId: string) => {
      const dragState = dragRef.current;
      if (!dragState) return;
      if (dragState.pointerId !== event.pointerId || dragState.pieceId !== pieceId) return;

      const cellSize = getCellSizePx();
      const rawDeltaPx =
        dragState.axis === "h"
          ? event.clientX - dragState.startClientX
          : event.clientY - dragState.startClientY;
      const minPx = dragState.minOffsetCells * cellSize;
      const maxPx = dragState.maxOffsetCells * cellSize;
      setDragOffsetPx(clamp(rawDeltaPx, minPx, maxPx));
    },
    [getCellSizePx]
  );

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, pieceId: string) => {
      const dragState = dragRef.current;
      if (!dragState) return;
      if (dragState.pointerId !== event.pointerId || dragState.pieceId !== pieceId) return;

      const cellSize = getCellSizePx();
      const rawDeltaCells =
        (dragState.axis === "h"
          ? event.clientX - dragState.startClientX
          : event.clientY - dragState.startClientY) / cellSize;
      const snappedOffset = Math.round(
        clamp(rawDeltaCells, dragState.minOffsetCells, dragState.maxOffsetCells)
      );

      dragRef.current = null;
      setDraggingPieceId(null);
      setDragOffsetPx(0);

      if (snappedOffset === 0) return;

      const targetRow =
        dragState.axis === "v" ? dragState.startRow + snappedOffset : dragState.startRow;
      const targetCol =
        dragState.axis === "h" ? dragState.startCol + snappedOffset : dragState.startCol;
      movePiece(pieceId, targetRow, targetCol);
    },
    [getCellSizePx, movePiece]
  );

  const goNextRound = useCallback(() => {
    sfxButtonPress();
    setPhase("playing");
    setRoundIndex((prev) => prev + 1);
  }, []);

  const retryCurrentRound = useCallback(() => {
    if (!currentRound) return;
    sfxButtonPress();
    setPieces(clonePieces(currentRound.pieces));
    setMoveCount(0);
    setSelectedPieceId(null);
    setDraggingPieceId(null);
    setDragOffsetPx(0);
    dragRef.current = null;
    setRoundTimeLeftMs(ROUND_TIME_LIMIT_MS);
    setPhase("playing");
  }, [currentRound]);

  const cellPercent = 100 / GRID_SIZE;

  return (
    <div
      className="size-full flex flex-col relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #FFF8DC 0%, #F5DEB3 46%, #DEB887 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: 20, color: "#5C3317" }}>🎁 랜덤 박스 탈출 퍼즐</h2>
          <span
            className="px-3 py-1 rounded-lg"
            style={{
              background: "rgba(92,51,23,0.08)",
              border: "1px solid rgba(92,51,23,0.25)",
              color: "#5C3317",
              fontSize: 12,
            }}
          >
            {Math.min(roundIndex + 1, rounds.length)} / {rounds.length} 라운드
          </span>
        </div>

        <div className="mt-2 flex gap-1.5">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, index) => {
            const opened = index < collectedParts.length;
            const isCurrent = !opened && phase !== "complete" && index === roundIndex;
            return (
              <motion.div
                key={index}
                className="flex-1 h-2 rounded-full transition-all duration-300"
                style={{
                  background: opened
                    ? "linear-gradient(90deg, #4CAF50, #7BC67E)"
                    : isCurrent
                      ? "linear-gradient(90deg, rgba(255,140,0,0.35), rgba(255,140,0,0.95), rgba(255,140,0,0.35))"
                      : "rgba(0,0,0,0.15)",
                }}
                animate={isCurrent ? { opacity: [0.35, 1, 0.35] } : { opacity: 1 }}
                transition={isCurrent ? { duration: 0.85, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
              />
            );
          })}
        </div>

        {currentRound && (
          <div
            className="mt-3 rounded-xl px-3 py-2 flex items-center justify-between gap-2"
            style={{
              background: "rgba(255,248,220,0.82)",
              border: "2px solid #C69C5D",
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center"
                style={{
                  background:
                    "repeating-linear-gradient(90deg, rgba(255,248,220,0.22) 0px, rgba(255,248,220,0.22) 6px, rgba(92,51,23,0) 6px, rgba(92,51,23,0) 12px), linear-gradient(180deg, #C98D4A, #A86733)",
                  border: "2px solid #6A3E1F",
                }}
              >
                <span style={{ fontSize: 18 }}>🎁</span>
              </div>
              <div>
                <p style={{ fontSize: 14, color: "#5C3317" }}>랜덤 상자 구출하기</p>
                <p style={{ fontSize: 11, color: "#8B4513" }}>
                  목표 {currentRoundTargetMoves}회 · 현재 {moveCount}회 · 점수 {currentRoundScore}점 · 남은 {roundTimeLeftSec}초
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {phase === "ready" && (
        <div className="flex-1 px-5 pb-5 flex items-center justify-center">
          <motion.div
            className="w-full rounded-2xl p-6 text-center"
            style={{
              background: "rgba(255,248,220,0.95)",
              border: "3px solid #8B6914",
              boxShadow: "0 6px 20px rgba(92,51,23,0.16)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span style={{ fontSize: 52 }}>🪵</span>
            <h3 style={{ fontSize: 22, color: "#5C3317", marginTop: 10 }}>
              Hard Free the Box
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "#8B4513",
                marginTop: 8,
                lineHeight: 1.8,
              }}
            >
              블록을 직접 드래그해서 길을 만들고
              <br />
              랜덤 박스를 오른쪽 출구로 탈출시키세요.
              <br />
              구출할 때마다 랜덤 부품을 1개 획득합니다.
              <br />
              라운드별 목표: 1R 10회, 2R 15회, 3R 20회, 4R 25회, 5R 26회, 6R 27회
              <br />
              각 라운드는 제한시간 1분, 시간이 끝나면 실패 후 재도전합니다.
              <br />
              각 라운드는 100점 시작, 목표 초과 1회마다 2점 감점됩니다.
            </p>
            <motion.button
              className="w-full mt-5 py-4 rounded-xl text-white"
              style={{
                background: "linear-gradient(180deg, #FF8C00, #E8740C)",
                border: "3px solid #B8560B",
                boxShadow: "0 4px 12px rgba(232,116,12,0.4)",
                fontSize: 20,
              }}
              whileTap={{ scale: 0.96 }}
              onClick={startGame}
            >
              ▶ 퍼즐 시작하기
            </motion.button>
          </motion.div>
        </div>
      )}

      {(phase === "playing" || phase === "roundClear" || phase === "roundFail" || phase === "complete") &&
        currentRound && (
          <div className="flex-1 px-4 pb-4">
            <motion.div
              ref={boardRef}
              className="relative w-full max-w-[380px] mx-auto aspect-square rounded-2xl overflow-hidden"
              style={{
                background:
                  "repeating-linear-gradient(0deg, rgba(92,51,23,0.11) 0px, rgba(92,51,23,0.11) 2px, transparent 2px, transparent 24px), linear-gradient(180deg, #C4A67A, #B38E62 60%, #A57B52)",
                border: "4px solid #8B6914",
                boxShadow: "inset 0 3px 12px rgba(0,0,0,0.22)",
              }}
              animate={shakeBoard ? { x: [-3, 3, -3, 3, 0] } : {}}
              transition={{ duration: 0.28 }}
            >
              <div
                className="absolute rounded-r-xl flex items-center justify-center"
                style={{
                  top: `${EXIT_ROW * cellPercent}%`,
                  right: -14,
                  width: 28,
                  height: `${cellPercent}%`,
                  background: "linear-gradient(180deg, #FFD46C, #F4B14D)",
                  border: "2px solid #8B6914",
                  boxShadow: "0 0 16px rgba(255,212,108,0.55)",
                  zIndex: 2,
                }}
              >
                <span style={{ fontSize: 18 }}>🚪</span>
              </div>

              <div className="absolute inset-0 opacity-22 pointer-events-none">
                {Array.from({ length: GRID_SIZE - 1 }).map((_, i) => (
                  <div
                    key={`h-${i}`}
                    className="absolute w-full"
                    style={{
                      top: `${(i + 1) * cellPercent}%`,
                      borderTop: "1px solid rgba(92,51,23,0.45)",
                    }}
                  />
                ))}
                {Array.from({ length: GRID_SIZE - 1 }).map((_, i) => (
                  <div
                    key={`v-${i}`}
                    className="absolute h-full"
                    style={{
                      left: `${(i + 1) * cellPercent}%`,
                      borderLeft: "1px solid rgba(92,51,23,0.45)",
                    }}
                  />
                ))}
              </div>

              {pieces.map((piece) => {
                const widthCells = piece.axis === "h" ? piece.len : 1;
                const heightCells = piece.axis === "v" ? piece.len : 1;
                const active = selectedPieceId === piece.id;
                const dragging = draggingPieceId === piece.id;
                const dragOffsetX = dragging && piece.axis === "h" ? dragOffsetPx : 0;
                const dragOffsetY = dragging && piece.axis === "v" ? dragOffsetPx : 0;

                return (
                  <motion.button
                    key={piece.id}
                    className="absolute rounded-xl overflow-hidden flex items-center justify-center touch-none select-none"
                    style={{
                      left: `calc(${piece.col * cellPercent}% + ${dragOffsetX}px)`,
                      top: `calc(${piece.row * cellPercent}% + ${dragOffsetY}px)`,
                      width: `${widthCells * cellPercent}%`,
                      height: `${heightCells * cellPercent}%`,
                      backgroundImage: `url(${getPieceTexture(piece)})`,
                      backgroundSize: "100% 100%",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      border: piece.isTarget
                        ? "3px solid #FAD26C"
                        : active
                          ? "3px solid #FFD46C"
                          : "3px solid #5C3317",
                      boxShadow: active
                        ? "0 0 0 3px rgba(255,212,108,0.35)"
                        : "0 3px 8px rgba(0,0,0,0.2)",
                      zIndex: piece.isTarget ? 40 : active ? 35 : 20,
                      transition: dragging
                        ? "none"
                        : "left 360ms cubic-bezier(0.16, 1, 0.3, 1), top 360ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease",
                      willChange: "left, top",
                      cursor: phase === "playing" ? (dragging ? "grabbing" : "grab") : "default",
                      touchAction: "none",
                    }}
                    onPointerDown={(event) => handlePointerDown(event, piece)}
                    onPointerMove={(event) => handlePointerMove(event, piece.id)}
                    onPointerUp={(event) => finishDrag(event, piece.id)}
                    onPointerCancel={(event) => finishDrag(event, piece.id)}
                  >
                    {piece.isTarget ? (
                      <div className="w-full h-full flex items-center justify-center gap-1 px-2 pointer-events-none">
                        <span style={{ fontSize: 24 }}>🎁</span>
                        <span style={{ fontSize: 11, color: "#5C3317" }}>
                          랜덤 박스
                        </span>
                      </div>
                    ) : (
                      <>
                        <div
                          className="absolute w-2.5 h-2.5 rounded-full"
                          style={{
                            top: 6,
                            left: 6,
                            background: "rgba(255,248,220,0.45)",
                            border: "1px solid rgba(92,51,23,0.35)",
                          }}
                        />
                        <div
                          className="absolute w-2.5 h-2.5 rounded-full"
                          style={{
                            right: 6,
                            bottom: 6,
                            background: "rgba(255,248,220,0.45)",
                            border: "1px solid rgba(92,51,23,0.35)",
                          }}
                        />
                      </>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>

            <p
              className="mt-3 text-center"
              style={{ fontSize: 12, color: "#6B3E1F", lineHeight: 1.6 }}
            >
              블록을 누른 채로 밀어서 이동시키세요.
              <br />
              길을 뚫어 랜덤 박스를 출구로 탈출시키면 보상이 열립니다.
            </p>
          </div>
        )}

      <AnimatePresence>
        {phase === "roundFail" && (
          <motion.div
            className="absolute inset-0 flex items-end justify-center px-6 pb-8"
            style={{ background: "rgba(255,248,220,0.86)", zIndex: 45 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full rounded-2xl p-6 text-center"
              style={{
                background: "linear-gradient(135deg, #FFE8E8, #FFD6D6)",
                border: "3px solid #D9534F",
                boxShadow: "0 10px 24px rgba(92,51,23,0.16)",
              }}
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
            >
              <span style={{ fontSize: 48 }}>⏰</span>
              <p style={{ fontSize: 24, color: "#8A2E2B", marginTop: 6 }}>시간 초과! 실패</p>
              <p style={{ fontSize: 14, color: "#8A2E2B", marginTop: 6, lineHeight: 1.6 }}>
                제한시간 1분이 지났어요.
                <br />
                현재 라운드를 다시 도전해보세요!
              </p>
              <motion.button
                className="w-full mt-6 py-4 rounded-xl text-white"
                style={{
                  background: "linear-gradient(180deg, #FF8C00, #E8740C)",
                  border: "3px solid #B8560B",
                  boxShadow: "0 4px 12px rgba(232,116,12,0.4)",
                  fontSize: 19,
                }}
                whileTap={{ scale: 0.97 }}
                onClick={retryCurrentRound}
              >
                다시 도전하기
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "roundClear" && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center px-6"
            style={{ background: "rgba(255,248,220,0.86)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full rounded-2xl p-6 text-center"
              style={{
                background: "linear-gradient(135deg, #E8F5E9, #C8E6C9)",
                border: "3px solid #4CAF50",
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <span style={{ fontSize: 50 }}>🎉</span>
              <p style={{ fontSize: 24, color: "#2E5A2E", marginTop: 6 }}>
                랜덤 박스 오픈!
              </p>
              {lastReward && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <img
                    src={lastReward.image}
                    alt={lastReward.name}
                    style={{
                      width: 50,
                      height: 50,
                      objectFit: "contain",
                      transform: `rotate(${lastReward.cardRotation ?? 0}deg)`,
                    }}
                  />
                  <p style={{ fontSize: 16, color: "#2E5A2E" }}>
                    {lastReward.name} 획득!
                  </p>
                </div>
              )}
              {currentRound && (
                <p style={{ fontSize: 14, color: "#2E5A2E", marginTop: 6 }}>
                  {moveCount}회 이동 · 점수{" "}
                  {calculateRoundScore(moveCount, currentRoundTargetMoves)}점
                </p>
              )}
              <motion.button
                className="w-full mt-5 py-3 rounded-xl text-white"
                style={{
                  background: "linear-gradient(180deg, #4CAF50, #3C9A43)",
                  border: "2px solid #2E7D32",
                  fontSize: 18,
                }}
                whileTap={{ scale: 0.97 }}
                onClick={goNextRound}
              >
                다음 퍼즐 →
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "complete" && (
          (() => {
            const { stageScore2500, resultScore100 } = calculateFindPartsFinalScores(roundScores, rounds.length);
            return (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: "rgba(255,248,220,0.88)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="w-full rounded-2xl p-6 text-center"
              style={{
                background: "linear-gradient(135deg, #FFE082, #FFD54F)",
                border: "3px solid #E0A800",
              }}
              initial={{ scale: 0.86, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 180 }}
            >
              <span style={{ fontSize: 52 }}>🏆</span>
              <p style={{ fontSize: 24, color: "#5C3317", marginTop: 8 }}>
                랜덤 부품 상자 수집 완료!
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {collectedParts.map((part, index) => (
                  <div
                    key={`${part.partId}-${index}`}
                    className="px-2 py-1 rounded-lg flex items-center gap-1"
                    style={{ background: "rgba(255,248,220,0.75)", border: "1px solid #B87D32" }}
                  >
                    <img
                      src={part.image}
                      alt={part.name}
                      style={{
                        width: 22,
                        height: 22,
                        objectFit: "contain",
                        transform: `rotate(${part.cardRotation ?? 0}deg)`,
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#5C3317" }}>{part.name}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 14, color: "#8B4513", marginTop: 8 }}>
                스테이지 점수 {stageScore2500} / {FIND_PARTS_STAGE_MAX_SCORE}
              </p>
              <p style={{ fontSize: 13, color: "#8B4513", marginTop: 4 }}>
                리절트 전달 점수 {resultScore100} / 100
              </p>
            </motion.div>
          </motion.div>
            );
          })()
        )}
      </AnimatePresence>
    </div>
  );
}
