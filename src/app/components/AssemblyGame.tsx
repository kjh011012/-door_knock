import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  g.forEach((r,i)=>{ if(r.every(c=>c!==null)) rows.push(i); });
  if (!rows.length) return {grid:g, cleared:0, rows:[]};
  const kept = g.filter((_,i)=>!rows.includes(i));
  const empty = Array.from({length:rows.length},()=>Array(COLS).fill(null));
  return {grid:[...empty,...kept], cleared:rows.length, rows};
}
function ghostRow(g: Grid, p: Piece): number {
  let gr = p.row;
  while(valid(g, {...p, row:gr+1})) gr++;
  return gr;
}

// 개별 블록 중력: 빈 칸 위에 떠있는 블록을 아래로 떨어뜨림
function applyGravity(g: Grid): Grid {
  const ng: Grid = Array.from({length:ROWS},()=>Array(COLS).fill(null));
  for (let c = 0; c < COLS; c++) {
    // 각 열에서 블록을 모아서 바닥부터 채움
    const blocks: number[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (g[r][c] !== null) blocks.push(g[r][c] as number);
    }
    for (let i = 0; i < blocks.length; i++) {
      ng[ROWS - 1 - i][c] = blocks[i];
    }
  }
  return ng;
}

type Phase = "ready"|"playing"|"clearing"|"gameover"|"complete";

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
}

function initGS(): GS {
  return {
    phase:"ready", grid:emptyGrid(), cur:mkPiece(), next:mkPiece(),
    lines:0, score:0, combo:0, pieces:0, level:1, clearFx:[]
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
  const runningRef = useRef(false);

  const gs = gsRef.current;

  // --- Game actions (mutate gsRef directly, then render) ---

  function dropSpeed() {
    return Math.max(150, 600 - (gsRef.current.level - 1) * 80);
  }

  function spawnNext(): boolean {
    const g = gsRef.current;
    const np = g.next;
    if (!valid(g.grid, np)) {
      g.phase = "gameover";
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

    // 배치 (중력은 배치 시 적용하지 않음 - 일반 테트리스처럼 놓인 자리에 유지)
    const newGrid = place(g.grid, finalP);

    // 줄 클리어 체크
    const {grid: afterClear, cleared, rows: clearedRows} = clearRows(newGrid);

    if (cleared > 0) {
      // 줄 클리어 후 중력 적용 + 연쇄 클리어
      let totalCleared = cleared;
      let finalGrid = applyGravity(afterClear);
      let chainResult = clearRows(finalGrid);
      while (chainResult.cleared > 0) {
        totalCleared += chainResult.cleared;
        finalGrid = applyGravity(chainResult.grid);
        chainResult = clearRows(finalGrid);
      }
      finalGrid = chainResult.grid;

      sfxLineClear(totalCleared);
      const lineScores = [0,100,300,500,800];
      g.score += (lineScores[Math.min(totalCleared,4)]||totalCleared*200) * g.level;
      g.combo++;
      if (g.combo > 1) sfxCombo(g.combo);
      g.lines += totalCleared;
      g.level = Math.floor(g.lines/3)+1;

      // Show clear effect
      g.phase = "clearing";
      g.grid = newGrid;
      g.clearFx = clearedRows;
      stopLoop();
      render();

      const capturedFinalGrid = finalGrid;
      setTimeout(()=>{
        const g2 = gsRef.current;
        g2.grid = capturedFinalGrid;
        g2.clearFx = [];

        sfxPartAssembled();

        if (g2.lines >= GOAL_LINES) {
          g2.phase = "complete";
          stopBGM();
          sfxComplete();
          render();
          const eff = Math.max(0, 100 - g2.pieces);
          const fs = Math.min(100, Math.round(60 + eff * 0.4));
          setTimeout(()=>onCompleteRef.current(fs), 2000);
        } else {
          g2.phase = "playing";
          if (spawnNext()) {
            startLoop();
          }
          render();
        }
      }, 300);
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

    const elapsed = timestamp - lastDropRef.current;
    if (elapsed >= dropSpeed()) {
      lastDropRef.current = timestamp;
      moveDown();
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }

  function startLoop() {
    runningRef.current = true;
    lastDropRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);
  }

  function stopLoop() {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
  }

  function startGame() {
    gsRef.current = {...initGS(), phase: "playing"};
    startBGM();
    render();
    startLoop();
  }

  // Cleanup
  useEffect(()=>{
    return ()=>{ stopLoop(); stopBGM(); };
  },[]);

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
  const {phase, grid, cur, next, lines, score, combo, pieces, level, clearFx} = gs;
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
              <strong style={{color:"#E8740C"}}>{GOAL_LINES}줄</strong>을 클리어하면<br/>딱따구리 조립 완료!
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
            <div><span style={{fontSize:10,color:"#8B4513"}}>SCORE</span><p style={{fontSize:18,color:"#5C3317"}}>{score.toLocaleString()}</p></div>
            <div className="text-center"><span style={{fontSize:10,color:"#8B4513"}}>LEVEL</span><p style={{fontSize:18,color:"#E8740C"}}>{level}</p></div>
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
              <h3 style={{fontSize:22,color:"#5C3317",marginTop:8}}>블록이 가득 찼어요!</h3>
              <p style={{fontSize:14,color:"#8B4513",marginTop:8}}>{lines}/{GOAL_LINES}줄 클리어</p>
              <p style={{fontSize:13,color:"#FF4444",marginTop:4,lineHeight:1.6}}>
                {GOAL_LINES}줄을 클리어해야<br/>다음 단계로 갈 수 있어요!
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
              <p style={{fontSize:15,color:"#8B4513",marginTop:4}}>{GOAL_LINES}줄 클리어! · {pieces}개 블록 사용</p>
              <p style={{fontSize:18,color:"#E8740C",marginTop:4}}>점수: {score.toLocaleString()}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}