import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import tetrisBgmTrack from "../../assets/woodpecker/Tetris-Bradinsky-tetis(mp3hamster.net).mp3";
import tetrisReadyBgmTrack from "../../assets/woodpecker/Tetris-NES-Karinka(mp3hamster.net).mp3";
import {
  startBGM,
  stopBGM,
  sfxMove,
  sfxRotate,
  sfxSoftDrop,
  sfxHardDrop,
  sfxLock,
  sfxLineClear,
  sfxCombo,
  sfxGameOver,
  sfxComplete,
  sfxPartAssembled,
} from "./tetris-sounds";

interface AssemblyGameProps {
  onComplete: (score: number) => void;
}

const COLS = 10;
const ROWS = 20;
const GOAL_LINES = 10;
const TIME_LIMIT_MS = 120000;
const SPEED_UP_START_MS = 40000;
const MAX_TIME_SPEEDUP_RATIO = 0.32;
const ASSEMBLY_STAGE_MAX_SCORE = 2500;
const ASSEMBLY_RESULT_MAX_SCORE = 100;
const ASSEMBLY_START_SCORE = ASSEMBLY_STAGE_MAX_SCORE;
const SCORE_SPEED_CLEAR_BONUS_MAX = 420;
const LINE_CLEAR_BONUS: Record<number, number> = {
  1: 50,
  2: 100,
  3: 150,
  4: 200,
};

const SHAPES = [
  [[0,0],[0,1],[0,2],[0,3]], // I
  [[0,0],[0,1],[1,0],[1,1]], // O
  [[0,0],[0,1],[0,2],[1,1]], // T
  [[0,1],[0,2],[1,0],[1,1]], // S
  [[0,0],[0,1],[1,1],[1,2]], // Z
  [[0,0],[0,1],[0,2],[1,0]], // L
  [[0,0],[0,1],[0,2],[1,2]], // J
];

const COLORS = [
  "#4ECDC4","#FFD93D","#C084FC","#6BCB77",
  "#FF6B6B","#FF8C42","#60A5FA",
];

type Cell = number | null;
type Grid = Cell[][];
interface Piece { shape: number[][]; colorIdx: number; row: number; col: number; }

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getScoreDecayPerSec(elapsedSec: number): number {
  if (elapsedSec < 40) return 15;
  if (elapsedSec < 70) return 16;
  if (elapsedSec < 90) return 17;
  return 18;
}

function emptyGrid(): Grid { return Array.from({length:ROWS},()=>Array(COLS).fill(null)); }
function mkPiece(): Piece {
  const i = Math.floor(Math.random()*7);
  return { shape: SHAPES[i].map(c=>[...c]), colorIdx: i, row: 0, col: 3 };
}
function rotateCW(s: number[][]): number[][] {
  const mR = Math.max(...s.map(c=>c[0]));
  return s.map(([r,c])=>[c, mR-r]);
}
function valid(g: Grid, p: Piece): boolean {
  for (const [dr,dc] of p.shape) {
    const r=p.row+dr, c=p.col+dc;
    if (r<0||r>=ROWS||c<0||c>=COLS) return false;
    if (g[r][c]!==null) return false;
  }
  return true;
}
function place(g: Grid, p: Piece): Grid {
  const ng = g.map(r=>[...r]);
  for (const [dr,dc] of p.shape) {
    const r=p.row+dr, c=p.col+dc;
    if (r>=0&&r<ROWS&&c>=0&&c<COLS) ng[r][c]=p.colorIdx;
  }
  return ng;
}
function clearRows(g: Grid): {grid:Grid; cleared:number; rows:number[]} {
  const rows: number[] = [];
  const ng: Grid = emptyGrid();
  let write = ROWS - 1;

  // 아래에서 위로 읽으면서, 클리어되지 않은 줄을 아래부터 다시 채운다.
  for (let r = ROWS - 1; r >= 0; r--) {
    if (g[r].every((c) => c !== null)) {
      rows.push(r);
      continue;
    }
    ng[write] = [...g[r]];
    write--;
  }

  if (!rows.length) return { grid: g.map((row) => [...row]), cleared: 0, rows: [] };
  rows.sort((a, b) => a - b);
  return { grid: ng, cleared: rows.length, rows };
}

function findComponents(g: Grid): number[][][] {
  const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const components: number[][][] = [];
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (g[r][c] === null || seen[r][c]) continue;
      const stack = [[r, c]];
      const cells: number[][] = [];
      seen[r][c] = true;

      while (stack.length) {
        const [cr, cc] = stack.pop() as number[];
        cells.push([cr, cc]);
        for (const [dr, dc] of dirs) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
          if (seen[nr][nc] || g[nr][nc] === null) continue;
          seen[nr][nc] = true;
          stack.push([nr, nc]);
        }
      }

      components.push(cells);
    }
  }

  return components;
}

function canComponentFall(g: Grid, cells: number[][]): boolean {
  const own = new Set(cells.map(([r, c]) => `${r},${c}`));
  for (const [r, c] of cells) {
    if (r === ROWS - 1) return false;
    if (!own.has(`${r + 1},${c}`) && g[r + 1][c] !== null) return false;
  }
  return true;
}

function applyCascadeGravity(g: Grid): Grid {
  let current = g.map((row) => [...row]);

  while (true) {
    const components = findComponents(current);
    const movable = components.map((cells) => canComponentFall(current, cells));
    if (!movable.some(Boolean)) return current;

    const next = emptyGrid();
    components.forEach((cells, index) => {
      const dy = movable[index] ? 1 : 0;
      cells.forEach(([r, c]) => {
        next[r + dy][c] = current[r][c];
      });
    });
    current = next;
  }
}

function ghostRow(g: Grid, p: Piece): number {
  let gr = p.row;
  while(valid(g, {...p, row:gr+1})) gr++;
  return gr;
}

type Phase = "ready"|"playing"|"clearing"|"gameover"|"complete";
type FailureReason = "stack" | "time" | null;

interface GS {
  phase: Phase;
  grid: Grid;
  cur: Piece;
  next: Piece;
  lines: number;
  score: number;
  combo: number;
  pieces: number;
  level: number;
  clearFx: number[];
  failureReason: FailureReason;
  finalScore2500: number;
  clearTimeMs: number;
}

function initGS(): GS {
  return {
    phase:"ready", grid:emptyGrid(), cur:mkPiece(), next:mkPiece(),
    lines:0, score:ASSEMBLY_START_SCORE, combo:0, pieces:0, level:1, clearFx:[],
    failureReason: null,
    finalScore2500: 0,
    clearTimeMs: 0,
  };
}

export function AssemblyGame({ onComplete }: AssemblyGameProps) {
  const gsRef = useRef<GS>(initGS());
  const [, setTick] = useState(0);
  const render = useCallback(()=>setTick(t=>t+1),[]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Game loop refs
  const rafRef = useRef(0);
  const lastDropRef = useRef(0);
  const startedAtRef = useRef(0);
  const lastHudSecondRef = useRef(Math.ceil(TIME_LIMIT_MS / 1000));
  const lastDecayElapsedSecRef = useRef(0);
  const completeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);
  const [timeLeftMs, setTimeLeftMs] = useState(TIME_LIMIT_MS);

  const gs = gsRef.current;

  // --- Game actions (mutate gsRef directly, then render) ---

  function dropSpeed(nowTs: number) {
    const base = Math.max(150, 600 - (gsRef.current.level - 1) * 80);
    if (!startedAtRef.current) return base;

    const elapsedMs = Math.max(0, nowTs - startedAtRef.current);
    if (elapsedMs <= SPEED_UP_START_MS) return base;

    const speedupProgress = clamp(
      (elapsedMs - SPEED_UP_START_MS) / Math.max(1, TIME_LIMIT_MS - SPEED_UP_START_MS),
      0,
      1
    );
    const stageBoost =
      elapsedMs >= 90000 ? 0.12 : elapsedMs >= 70000 ? 0.08 : 0.04;
    const speedMultiplier = (1 - MAX_TIME_SPEEDUP_RATIO * speedupProgress) * (1 - stageBoost);
    return Math.max(70, Math.round(base * speedMultiplier));
  }

  function spawnNext(): boolean {
    const g = gsRef.current;
    const np = g.next;
    if (!valid(g.grid, np)) {
      g.phase = "gameover";
      g.failureReason = "stack";
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }
      stopLoop();
      stopBGM();
      sfxGameOver();
      render();
      return false;
    }
    g.cur = np;
    g.next = mkPiece();
    g.pieces++;
    return true;
  }

  function lockCurrent() {
    const g = gsRef.current;
    const p = g.cur;

    // 바닥까지 강제 이동
    const gr = ghostRow(g.grid, p);
    const finalP = {...p, row: gr};
    g.cur = finalP;

    const newGrid = place(g.grid, finalP);
    let totalCleared = 0;
    let finalGrid = newGrid;
    let chain = clearRows(finalGrid);

    while (chain.cleared > 0) {
      totalCleared += chain.cleared;
      finalGrid = applyCascadeGravity(chain.grid);
      chain = clearRows(finalGrid);
    }

    if (totalCleared > 0) {
      sfxLineClear(totalCleared);
      g.combo++;
      if (g.combo > 1) sfxCombo(g.combo);
      g.lines += totalCleared;
      g.level = Math.floor(g.lines/3)+1;
      g.grid = finalGrid;
      g.clearFx = [];
      const lineBonus = LINE_CLEAR_BONUS[Math.min(4, totalCleared)] ?? 0;
      g.score = clamp(g.score + lineBonus, 0, ASSEMBLY_STAGE_MAX_SCORE);

      sfxPartAssembled();

      if (g.lines >= GOAL_LINES) {
        const clearTimeMs = Math.max(0, performance.now() - startedAtRef.current);
        const remainingRatio = clamp((TIME_LIMIT_MS - clearTimeMs) / TIME_LIMIT_MS, 0, 1);
        const speedBonus = Math.round(remainingRatio * SCORE_SPEED_CLEAR_BONUS_MAX);
        const finalScore2500 = clamp(
          Math.round(g.score + speedBonus),
          0,
          ASSEMBLY_STAGE_MAX_SCORE
        );
        const resultScore100 = Math.round(
          (finalScore2500 / ASSEMBLY_STAGE_MAX_SCORE) * ASSEMBLY_RESULT_MAX_SCORE
        );

        g.phase = "complete";
        g.clearTimeMs = clearTimeMs;
        g.finalScore2500 = finalScore2500;
        g.score = finalScore2500;
        stopBGM();
        sfxComplete();
        render();
        if (completeTimeoutRef.current) {
          clearTimeout(completeTimeoutRef.current);
          completeTimeoutRef.current = null;
        }
        completeTimeoutRef.current = setTimeout(() => {
          completeTimeoutRef.current = null;
          if (gsRef.current.phase !== "complete") return;
          onCompleteRef.current(resultScore100);
        }, 2000);
      } else {
        g.phase = "playing";
        spawnNext();
        render();
      }
    } else {
      sfxLock();
      g.grid = newGrid;
      g.combo = 0;
      spawnNext();
      render();
    }
  }

  function moveDown() {
    const g = gsRef.current;
    if (g.phase !== "playing") return;
    const moved = {...g.cur, row: g.cur.row + 1};
    if (valid(g.grid, moved)) {
      g.cur = moved;
      render();
    } else {
      lockCurrent();
    }
  }

  function moveLeft() {
    const g = gsRef.current;
    if (g.phase !== "playing") return;
    const moved = {...g.cur, col: g.cur.col - 1};
    if (valid(g.grid, moved)) { g.cur = moved; sfxMove(); render(); }
  }

  function moveRight() {
    const g = gsRef.current;
    if (g.phase !== "playing") return;
    const moved = {...g.cur, col: g.cur.col + 1};
    if (valid(g.grid, moved)) { g.cur = moved; sfxMove(); render(); }
  }

  function rotate() {
    const g = gsRef.current;
    if (g.phase !== "playing") return;
    const rotated = {...g.cur, shape: rotateCW(g.cur.shape)};
    for (const off of [0,-1,1,-2,2]) {
      const kicked = {...rotated, col: rotated.col + off};
      if (valid(g.grid, kicked)) { g.cur = kicked; sfxRotate(); render(); return; }
    }
  }

  function hardDrop() {
    const g = gsRef.current;
    if (g.phase !== "playing") return;
    sfxHardDrop();
    const gr = ghostRow(g.grid, g.cur);
    g.cur = {...g.cur, row: gr};
    lockCurrent();
  }

  // --- Game loop (requestAnimationFrame) ---

  function gameLoop(timestamp: number) {
    if (!runningRef.current) return;
    const g = gsRef.current;
    if (g.phase !== "playing") { runningRef.current = false; return; }

    const elapsedTotal = Math.max(0, timestamp - startedAtRef.current);
    const elapsedSec = Math.floor(elapsedTotal / 1000);
    if (elapsedSec > lastDecayElapsedSecRef.current) {
      let decayTotal = 0;
      for (let sec = lastDecayElapsedSecRef.current + 1; sec <= elapsedSec; sec++) {
        decayTotal += getScoreDecayPerSec(sec);
      }
      g.score = clamp(g.score - decayTotal, 0, ASSEMBLY_STAGE_MAX_SCORE);
      lastDecayElapsedSecRef.current = elapsedSec;
    }

    const remaining = Math.max(0, TIME_LIMIT_MS - elapsedTotal);
    const remainingSec = Math.ceil(remaining / 1000);
    if (remainingSec !== lastHudSecondRef.current) {
      lastHudSecondRef.current = remainingSec;
      setTimeLeftMs(remaining);
    }

    if (remaining <= 0) {
      g.phase = "gameover";
      g.failureReason = "time";
      setTimeLeftMs(0);
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }
      stopLoop();
      stopBGM();
      sfxGameOver();
      render();
      return;
    }

    const elapsed = timestamp - lastDropRef.current;
    if (elapsed >= dropSpeed(timestamp)) {
      lastDropRef.current = timestamp;
      moveDown();
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }

  function startLoop() {
    const now = performance.now();
    runningRef.current = true;
    startedAtRef.current = now;
    lastDropRef.current = now;
    lastHudSecondRef.current = Math.ceil(TIME_LIMIT_MS / 1000);
    lastDecayElapsedSecRef.current = 0;
    setTimeLeftMs(TIME_LIMIT_MS);
    rafRef.current = requestAnimationFrame(gameLoop);
  }

  function stopLoop() {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
  }

  function startGame() {
    if (completeTimeoutRef.current) {
      clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = null;
    }
    gsRef.current = {...initGS(), phase: "playing"};
    setTimeLeftMs(TIME_LIMIT_MS);
    render();
    startLoop();
  }

  // Cleanup
  useEffect(()=>{
    return ()=>{
      stopLoop();
      stopBGM();
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }
    };
  },[]);

  const {phase, grid, cur, next, lines, score, combo, pieces, clearFx, failureReason, clearTimeMs} = gs;
  const remainingSeconds = Math.ceil(Math.max(0, timeLeftMs) / 1000);

  useEffect(() => {
    if (phase === "ready") {
      startBGM({ source: tetrisReadyBgmTrack, volume: 0.56 });
      return;
    }

    if (phase === "playing" || phase === "clearing" || phase === "gameover") {
      startBGM({ source: tetrisBgmTrack, volume: 0.56 });
    }
  }, [phase]);

  // Keyboard
  useEffect(()=>{
    const h = (e: KeyboardEvent) => {
      if (gsRef.current.phase !== "playing") return;
      switch(e.key) {
        case "ArrowLeft": moveLeft(); break;
        case "ArrowRight": moveRight(); break;
        case "ArrowDown": sfxSoftDrop(); moveDown(); break;
        case "ArrowUp": rotate(); break;
        case " ": hardDrop(); e.preventDefault(); break;
      }
    };
    window.addEventListener("keydown", h);
    return ()=>window.removeEventListener("keydown", h);
  },[]);

  // --- Render ---
  const gr = phase === "playing" ? ghostRow(grid, cur) : cur.row;

  // Build display grid
  const dg: (Cell|"ghost")[][] = grid.map(r=>[...r]);
  if (phase === "playing") {
    for (const [dr,dc] of cur.shape) {
      const r=gr+dr, c=cur.col+dc;
      if (r>=0&&r<ROWS&&c>=0&&c<COLS&&dg[r][c]===null) dg[r][c]="ghost" as any;
    }
    for (const [dr,dc] of cur.shape) {
      const r=cur.row+dr, c=cur.col+dc;
      if (r>=0&&r<ROWS&&c>=0&&c<COLS) dg[r][c]=cur.colorIdx;
    }
  }

  return (
    <div className="size-full flex flex-col relative overflow-hidden"
      style={{background:"linear-gradient(180deg,#FFF8DC 0%,#F5DEB3 50%,#DEB887 100%)",fontFamily:"'Jua',sans-serif"}}>

      {phase==="ready"&&(
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div className="text-center p-6 rounded-2xl w-full"
            style={{background:"rgba(255,248,220,0.95)",border:"3px solid #8B6914",boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}
            initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}>
            <span style={{fontSize:50}}>🧩</span>
            <h3 style={{fontSize:24,color:"#5C3317",marginTop:8}}>테트리스 조립!</h3>
            <p style={{fontSize:14,color:"#8B4513",marginTop:8,lineHeight:1.8}}>
              블록을 쌓아서 줄을 완성하세요!<br/>
              <strong style={{color:"#E8740C"}}>{GOAL_LINES}줄</strong>을 <strong style={{color:"#E8740C"}}>2분 안</strong>에 클리어하면 성공!<br/>
              40초 이후부터 블록 속도가 조금씩 빨라집니다.
            </p>
            <div className="flex justify-center gap-2 mt-4 mb-4 flex-wrap">
              {SHAPES.map((shape,idx)=>(
                <div key={idx} className="relative" style={{width:40,height:40}}>
                  {shape.map(([r,c],i)=>(
                    <div key={i} className="absolute rounded-sm"
                      style={{width:9,height:9,left:c*10+2,top:r*10+10,background:COLORS[idx],border:"1px solid rgba(0,0,0,0.15)"}}/>
                  ))}
                </div>
              ))}
            </div>
            <div className="p-3 rounded-lg mb-4" style={{background:"rgba(139,69,19,0.08)"}}>
              <p style={{fontSize:11,color:"#8B4513",lineHeight:1.6}}>
                ⬅️➡️ 이동 &nbsp; 🔄 회전 &nbsp; ⬇️ 빠르게 &nbsp; 💥 즉시 낙하
              </p>
            </div>
            <motion.button className="w-full py-4 rounded-xl text-white"
              style={{background:"linear-gradient(180deg,#FF8C00,#E8740C)",border:"3px solid #B8560B",boxShadow:"0 4px 12px rgba(232,116,12,0.4)",fontSize:20}}
              onClick={startGame} whileTap={{scale:0.95}}>
              🧩 조립 시작!
            </motion.button>
          </motion.div>
        </div>
      )}

      {(phase==="playing"||phase==="clearing")&&(
        <>
          <div className="px-3 pt-3 pb-1 flex items-center justify-between">
            <div><span style={{fontSize:10,color:"#8B4513"}}>현재 점수</span><p style={{fontSize:18,color:"#5C3317"}}>{score} / {ASSEMBLY_STAGE_MAX_SCORE}</p></div>
            <div className="text-center"><span style={{fontSize:10,color:"#8B4513"}}>남은 시간</span><p style={{fontSize:18,color:"#E8740C"}}>{remainingSeconds}s</p></div>
            <div className="text-right"><span style={{fontSize:10,color:"#8B4513"}}>COMBO</span><p style={{fontSize:18,color:combo>0?"#FF4444":"#5C3317"}}>{combo}x</p></div>
          </div>

          <div className="px-3 mb-1">
            <div className="flex items-center gap-2">
              <span style={{fontSize:11,color:"#8B4513"}}>{lines}/{GOAL_LINES}줄</span>
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{background:"rgba(0,0,0,0.1)",border:"1px solid #8B6914"}}>
                <motion.div className="h-full rounded-full" style={{background:"linear-gradient(90deg,#4CAF50,#66BB6A)"}}
                  animate={{width:`${(lines/GOAL_LINES)*100}%`}} transition={{type:"spring",stiffness:200}}/>
              </div>
              <span style={{fontSize:11,color:"#4CAF50"}}>{Math.round((lines/GOAL_LINES)*100)}%</span>
            </div>
          </div>

          <div className="flex-1 flex mx-2 mb-1 gap-2 min-h-0">
            <div className="flex-1 relative rounded-lg overflow-hidden"
              style={{background:"linear-gradient(180deg,#1a0a2e,#2d1b4e)",border:"3px solid #8B6914",boxShadow:"inset 0 0 20px rgba(0,0,0,0.5)"}}>
              <div className="absolute inset-0 opacity-10">
                {Array.from({length:COLS-1},(_,i)=>(
                  <div key={`v${i}`} className="absolute top-0 bottom-0" style={{left:`${((i+1)/COLS)*100}%`,width:1,background:"#fff"}}/>
                ))}
                {Array.from({length:ROWS-1},(_,i)=>(
                  <div key={`h${i}`} className="absolute left-0 right-0" style={{top:`${((i+1)/ROWS)*100}%`,height:1,background:"#fff"}}/>
                ))}
              </div>

              {dg.map((row,r)=>row.map((cell,c)=>{
                if (cell===null) return null;
                const isClr = clearFx.includes(r);
                const isG = cell===("ghost" as any);
                const ci = isG ? cur.colorIdx : (cell as number);
                const col = COLORS[ci];
                return (
                  <motion.div key={`${r}-${c}`} className="absolute rounded-sm"
                    style={{left:`${(c/COLS)*100}%`,top:`${(r/ROWS)*100}%`,width:`${100/COLS}%`,height:`${100/ROWS}%`,padding:1}}
                    animate={isClr?{opacity:[1,0],scale:[1,1.3]}:{}} transition={isClr?{duration:0.25}:{}}>
                    <div className="size-full rounded-sm" style={{
                      background:isG?`${col}30`:`linear-gradient(135deg,${col},${col}CC)`,
                      border:isG?`1px dashed ${col}60`:`1px solid ${col}`,
                      boxShadow:isG?"none":`inset 0 1px 2px rgba(255,255,255,0.3), 0 1px 3px rgba(0,0,0,0.3)`
                    }}/>
                  </motion.div>
                );
              }))}

              <AnimatePresence>
                {clearFx.map(row=>(
                  <motion.div key={`cl-${row}`} className="absolute left-0 right-0"
                    style={{top:`${(row/ROWS)*100}%`,height:`${100/ROWS}%`,background:"rgba(255,255,255,0.8)"}}
                    initial={{opacity:1,scaleX:1}} animate={{opacity:0,scaleX:1.1}} exit={{opacity:0}} transition={{duration:0.3}}/>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-2" style={{width:65}}>
              <div className="p-2 rounded-lg" style={{background:"rgba(92,51,23,0.1)",border:"2px solid #8B6914"}}>
                <span className="block text-center mb-1" style={{fontSize:9,color:"#8B4513"}}>NEXT</span>
                <div className="relative mx-auto" style={{width:44,height:44}}>
                  {next.shape.map(([r,c],i)=>(
                    <div key={i} className="absolute rounded-sm"
                      style={{width:10,height:10,left:c*11+2,top:r*11+6,background:COLORS[next.colorIdx],
                        border:`1px solid ${COLORS[next.colorIdx]}`,boxShadow:"inset 0 1px 2px rgba(255,255,255,0.3)"}}/>
                  ))}
                </div>
              </div>
              <div className="flex-1 rounded-lg p-2 flex flex-col items-center justify-center"
                style={{background:"rgba(255,248,220,0.8)",border:"2px solid #8B6914"}}>
                <div className="relative" style={{width:40,height:50}}>
                  <div className="absolute rounded-lg" style={{left:8,top:18,width:24,height:30,background:lines>=2?"#8B4513":"#ddd",transition:"background 0.5s"}}/>
                  <div className="absolute rounded-full" style={{left:10,top:2,width:20,height:18,background:lines>=4?"#DC143C":"#ddd",transition:"background 0.5s"}}/>
                  <div style={{position:"absolute",left:30,top:8,width:0,height:0,borderTop:"4px solid transparent",borderBottom:"4px solid transparent",
                    borderLeft:`8px solid ${lines>=6?"#FFD700":"#ddd"}`,transition:"border-color 0.5s"}}/>
                  <div className="absolute rounded" style={{left:2,top:22,width:10,height:16,background:lines>=8?"#654321":"#ddd",transition:"background 0.5s"}}/>
                  {lines>=4&&<div className="absolute rounded-full" style={{left:16,top:7,width:5,height:5,background:"#fff",border:"1.5px solid #333"}}/>}
                </div>
                <span style={{fontSize:8,color:"#8B4513",marginTop:4}}>
                  {lines<2?"몸통...":lines<4?"머리...":lines<6?"부리...":lines<8?"날개...":lines<10?"거의 완성!":"완성!"}
                </span>
              </div>
            </div>
          </div>

          <div className="px-2 pb-3">
            <div className="flex gap-1.5 items-center justify-center">
              {([
                {emoji:"⬅️",fn:moveLeft},
                {emoji:"⬇️",fn:()=>{sfxSoftDrop();moveDown();}},
                {emoji:"➡️",fn:moveRight},
              ] as const).map(({emoji,fn},i)=>(
                <motion.button key={i} className="flex items-center justify-center rounded-xl"
                  style={{width:56,height:56,background:"linear-gradient(180deg,#C4A67A,#A0845A)",border:"2px solid #8B6914",boxShadow:"0 3px 0 #654321"}}
                  onClick={fn} whileTap={{scale:0.9,y:2}}>
                  <span style={{fontSize:22}}>{emoji}</span>
                </motion.button>
              ))}
              <div style={{width:8}}/>
              <motion.button className="flex items-center justify-center rounded-xl"
                style={{width:56,height:56,background:"linear-gradient(180deg,#4ECDC4,#3BAFA8)",border:"2px solid #2E8B7A",boxShadow:"0 3px 0 #1A6B5A"}}
                onClick={rotate} whileTap={{scale:0.9,y:2}}>
                <span style={{fontSize:22}}>🔄</span>
              </motion.button>
              <motion.button className="flex items-center justify-center rounded-xl"
                style={{width:56,height:56,background:"linear-gradient(180deg,#FF8C00,#E8740C)",border:"2px solid #B8560B",boxShadow:"0 3px 0 #8B4000"}}
                onClick={hardDrop} whileTap={{scale:0.9,y:2}}>
                <span style={{fontSize:22}}>💥</span>
              </motion.button>
            </div>
          </div>
        </>
      )}

      <AnimatePresence>
        {phase==="gameover"&&(
          <motion.div className="absolute inset-0 z-30 flex items-center justify-center"
            style={{background:"rgba(92,51,23,0.85)"}} initial={{opacity:0}} animate={{opacity:1}}>
            <motion.div className="text-center p-6 rounded-2xl mx-6"
              style={{background:"rgba(255,248,220,0.95)",border:"3px solid #8B6914"}}
              initial={{scale:0}} animate={{scale:1}} transition={{type:"spring"}}>
              <motion.span style={{fontSize:50,display:"block"}} animate={{rotate:[0,-10,10,-10,0]}} transition={{duration:0.6,repeat:2}}>😵</motion.span>
              <h3 style={{fontSize:22,color:"#5C3317",marginTop:8}}>
                {failureReason === "time" ? "시간이 종료됐어요!" : "블록이 가득 찼어요!"}
              </h3>
              <p style={{fontSize:14,color:"#8B4513",marginTop:8}}>{lines}/{GOAL_LINES}줄 클리어 · 남은 시간 {remainingSeconds}s</p>
              <p style={{fontSize:13,color:"#FF4444",marginTop:4,lineHeight:1.6}}>
                {failureReason === "time" ? (
                  <>
                    2분 제한 안에 클리어할수록
                    <br />
                    {ASSEMBLY_STAGE_MAX_SCORE}점에 가까워집니다!
                  </>
                ) : (
                  <>
                    {GOAL_LINES}줄을 2분 안에 클리어해야
                    <br />
                    다음 단계로 갈 수 있어요!
                  </>
                )}
              </p>
              <motion.button className="w-full py-4 rounded-xl text-white mt-5"
                style={{background:"linear-gradient(180deg,#FF8C00,#E8740C)",border:"3px solid #B8560B",boxShadow:"0 4px 12px rgba(232,116,12,0.4)",fontSize:18}}
                onClick={startGame} whileTap={{scale:0.95}} initial={{y:10,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:0.5}}>
                🔄 다시 도전!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase==="complete"&&(
          <motion.div className="absolute inset-0 z-30 flex items-center justify-center"
            style={{background:"rgba(255,248,220,0.9)"}} initial={{opacity:0}} animate={{opacity:1}}>
            <motion.div className="text-center" initial={{scale:0,rotate:-10}} animate={{scale:1,rotate:0}} transition={{type:"spring",stiffness:200}}>
              <motion.span style={{fontSize:60}} animate={{rotate:[0,10,-10,0]}} transition={{duration:0.5,repeat:3}}>🎉</motion.span>
              <p style={{fontSize:26,color:"#5C3317",marginTop:8}}>조립 완료!</p>
              <p style={{fontSize:15,color:"#8B4513",marginTop:4}}>
                {GOAL_LINES}줄 클리어! · {pieces}개 블록 사용 · {(clearTimeMs / 1000).toFixed(1)}초
              </p>
              <p style={{fontSize:18,color:"#E8740C",marginTop:4}}>
                최종 점수: {score.toLocaleString()} / {ASSEMBLY_STAGE_MAX_SCORE}
              </p>
              <p style={{fontSize:13,color:"#8B4513",marginTop:2}}>
                리절트 전달 점수: {Math.round((score / ASSEMBLY_STAGE_MAX_SCORE) * ASSEMBLY_RESULT_MAX_SCORE)} / {ASSEMBLY_RESULT_MAX_SCORE}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
