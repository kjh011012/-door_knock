import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import coloringTemplate from "../../assets/woodpecker/customizing-template.png";
import { DEFAULT_WORKSHOP_BGM, startBGM, stopBGM } from "./tetris-sounds";

interface CustomizeScreenProps {
  onComplete: (customization: Customization) => void;
  soundOn: boolean;
}

export interface Customization {
  bodyColor: string;
  headColor: string;
  beakColor: string;
  wingColor: string;
  eyeStyle: "normal" | "happy" | "star" | "heart";
  pattern: "none" | "dots" | "stripes" | "zigzag";
}

interface Point {
  x: number;
  y: number;
}

interface PaintStroke {
  points: Point[];
  color: string;
  size: number;
  mode: "brush" | "eraser" | "bucket";
}

const PALETTE = [
  "#F44336",
  "#FF9800",
  "#FFD54F",
  "#81C784",
  "#4FC3F7",
  "#5C6BC0",
  "#BA68C8",
  "#EC407A",
  "#8D6E63",
  "#FFFFFF",
  "#212121",
];

const TEMPLATE_ASPECT_RATIO = 675 / 922;

const BRUSH_SIZES = [
  { label: "얇게", value: 6 },
  { label: "보통", value: 12 },
  { label: "굵게", value: 20 },
] as const;

const PRESET_CUSTOMS: Array<{
  id: string;
  name: string;
  bodyColor: string;
  headColor: string;
  beakColor: string;
  wingColor: string;
  eyeStyle: Customization["eyeStyle"];
  pattern: Customization["pattern"];
}> = [
  {
    id: "classic",
    name: "클래식",
    bodyColor: "#8B4513",
    headColor: "#DC143C",
    beakColor: "#FFD700",
    wingColor: "#654321",
    eyeStyle: "normal",
    pattern: "none",
  },
  {
    id: "forest",
    name: "숲속",
    bodyColor: "#3F704D",
    headColor: "#6A994E",
    beakColor: "#F2CC8F",
    wingColor: "#2D6A4F",
    eyeStyle: "happy",
    pattern: "dots",
  },
  {
    id: "sunset",
    name: "노을",
    bodyColor: "#D97706",
    headColor: "#EF4444",
    beakColor: "#F59E0B",
    wingColor: "#7C2D12",
    eyeStyle: "star",
    pattern: "stripes",
  },
  {
    id: "dream",
    name: "드림",
    bodyColor: "#7C3AED",
    headColor: "#EC4899",
    beakColor: "#FDE68A",
    wingColor: "#4338CA",
    eyeStyle: "heart",
    pattern: "zigzag",
  },
];

function getPointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: PaintStroke) {
  if (stroke.points.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = stroke.mode === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    ctx.beginPath();
    ctx.arc(p.x, p.y, stroke.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i += 1) {
    const p = stroke.points[i];
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

function parseHexColor(hex: string): [number, number, number] {
  const safe = hex.replace("#", "").trim();
  if (safe.length === 3) {
    const r = parseInt(safe[0] + safe[0], 16);
    const g = parseInt(safe[1] + safe[1], 16);
    const b = parseInt(safe[2] + safe[2], 16);
    return [r, g, b];
  }
  const r = parseInt(safe.slice(0, 2), 16);
  const g = parseInt(safe.slice(2, 4), 16);
  const b = parseInt(safe.slice(4, 6), 16);
  return [r, g, b];
}

function isColorNear(data: Uint8ClampedArray, offset: number, target: [number, number, number, number], tolerance: number) {
  return (
    Math.abs(data[offset] - target[0]) <= tolerance &&
    Math.abs(data[offset + 1] - target[1]) <= tolerance &&
    Math.abs(data[offset + 2] - target[2]) <= tolerance &&
    Math.abs(data[offset + 3] - target[3]) <= tolerance
  );
}

export function CustomizeScreen({ onComplete, soundOn }: CustomizeScreenProps) {
  const [custom, setCustom] = useState<Customization>({
    bodyColor: "#8B4513",
    headColor: "#DC143C",
    beakColor: "#FFD700",
    wingColor: "#654321",
    eyeStyle: "normal",
    pattern: "none",
  });

  const [tool, setTool] = useState<"brush" | "eraser" | "bucket">("brush");
  const [brushColor, setBrushColor] = useState("#F44336");
  const [brushSize, setBrushSize] = useState(12);
  const [strokes, setStrokes] = useState<PaintStroke[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<PaintStroke[]>([]);
  const [activePresetId, setActivePresetId] = useState(PRESET_CUSTOMS[0].id);
  const [panelOpen, setPanelOpen] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const templateImageRef = useRef<HTMLImageElement | null>(null);
  const barrierMaskRef = useRef<{ width: number; height: number; data: Uint8Array } | null>(null);
  const canvasMetricsRef = useRef({ width: 1, height: 1, dpr: 1 });
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<PaintStroke | null>(null);

  const rebuildBarrierMask = useCallback((width: number, height: number, dpr: number) => {
    const image = templateImageRef.current;
    if (!image || width <= 0 || height <= 0) return;

    const pixelWidth = Math.max(1, Math.floor(width * dpr));
    const pixelHeight = Math.max(1, Math.floor(height * dpr));
    const offscreen = document.createElement("canvas");
    offscreen.width = pixelWidth;
    offscreen.height = pixelHeight;

    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;
    offCtx.clearRect(0, 0, pixelWidth, pixelHeight);
    offCtx.drawImage(image, 0, 0, pixelWidth, pixelHeight);
    const imageData = offCtx.getImageData(0, 0, pixelWidth, pixelHeight).data;
    const mask = new Uint8Array(pixelWidth * pixelHeight);

    for (let i = 0; i < mask.length; i += 1) {
      const o = i * 4;
      const r = imageData[o];
      const g = imageData[o + 1];
      const b = imageData[o + 2];
      const a = imageData[o + 3];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      // Treat dark contour pixels as fill barriers.
      mask[i] = a > 42 && luminance < 182 ? 1 : 0;
    }

    barrierMaskRef.current = { width: pixelWidth, height: pixelHeight, data: mask };
  }, []);

  const applyBucketFill = useCallback(
    (ctx: CanvasRenderingContext2D, point: Point, colorHex: string, dpr: number) => {
      const pixelWidth = ctx.canvas.width;
      const pixelHeight = ctx.canvas.height;
      if (pixelWidth <= 0 || pixelHeight <= 0) return;

      const startX = Math.floor(point.x * dpr);
      const startY = Math.floor(point.y * dpr);
      if (startX < 0 || startY < 0 || startX >= pixelWidth || startY >= pixelHeight) return;

      const barrier = barrierMaskRef.current;
      const hasBarrierMask = barrier && barrier.width === pixelWidth && barrier.height === pixelHeight;
      const barrierData = hasBarrierMask ? barrier.data : null;

      const startIdx = startY * pixelWidth + startX;
      if (barrierData && barrierData[startIdx] === 1) return;

      const img = ctx.getImageData(0, 0, pixelWidth, pixelHeight);
      const data = img.data;
      const targetOffset = startIdx * 4;
      const target: [number, number, number, number] = [
        data[targetOffset],
        data[targetOffset + 1],
        data[targetOffset + 2],
        data[targetOffset + 3],
      ];

      const [r, g, b] = parseHexColor(colorHex);
      const fill: [number, number, number, number] = [r, g, b, 255];
      if (
        Math.abs(target[0] - fill[0]) < 2 &&
        Math.abs(target[1] - fill[1]) < 2 &&
        Math.abs(target[2] - fill[2]) < 2 &&
        Math.abs(target[3] - fill[3]) < 2
      ) {
        return;
      }

      const visited = new Uint8Array(pixelWidth * pixelHeight);
      const stack: number[] = [startIdx];
      const tolerance = 18;

      while (stack.length > 0) {
        const idx = stack.pop()!;
        if (visited[idx] === 1) continue;
        visited[idx] = 1;

        if (barrierData && barrierData[idx] === 1) continue;

        const offset = idx * 4;
        if (!isColorNear(data, offset, target, tolerance)) continue;

        data[offset] = fill[0];
        data[offset + 1] = fill[1];
        data[offset + 2] = fill[2];
        data[offset + 3] = fill[3];

        const x = idx % pixelWidth;
        const y = (idx / pixelWidth) | 0;
        if (x > 0) stack.push(idx - 1);
        if (x < pixelWidth - 1) stack.push(idx + 1);
        if (y > 0) stack.push(idx - pixelWidth);
        if (y < pixelHeight - 1) stack.push(idx + pixelWidth);
      }

      ctx.putImageData(img, 0, 0);
    },
    []
  );

  const redrawAll = useCallback((drawStrokes: PaintStroke[]) => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = window.devicePixelRatio || 1;

    const needResize =
      canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr);
    if (needResize) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      rebuildBarrierMask(width, height, dpr);
    }
    canvasMetricsRef.current = { width, height, dpr };

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    for (const stroke of drawStrokes) {
      if (stroke.mode === "bucket") {
        applyBucketFill(ctx, stroke.points[0], stroke.color, dpr);
      } else {
        drawStroke(ctx, stroke);
      }
    }
  }, [applyBucketFill, rebuildBarrierMask]);

  useEffect(() => {
    redrawAll(strokes);
  }, [strokes, redrawAll]);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      templateImageRef.current = image;
      const metrics = canvasMetricsRef.current;
      rebuildBarrierMask(metrics.width, metrics.height, metrics.dpr);
      redrawAll(strokes);
    };
    image.src = coloringTemplate;
    return () => {
      templateImageRef.current = null;
      barrierMaskRef.current = null;
    };
  }, [rebuildBarrierMask, redrawAll, strokes]);

  useEffect(() => {
    const onResize = () => redrawAll(strokes);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [redrawAll, strokes]);

  useEffect(() => {
    if (!soundOn) {
      stopBGM();
      return;
    }
    startBGM({ source: DEFAULT_WORKSHOP_BGM, volume: 0.55 });
    return () => {
      stopBGM();
    };
  }, [soundOn]);

  const beginDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const point = getPointFromEvent(event);

    if (tool === "bucket") {
      const bucketStroke: PaintStroke = {
        points: [point],
        color: brushColor,
        size: brushSize,
        mode: "bucket",
      };
      setStrokes((prev) => [...prev, bucketStroke]);
      setRedoStrokes([]);
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    currentStrokeRef.current = {
      points: [point],
      color: brushColor,
      size: brushSize,
      mode: tool,
    };
  };

  const continueDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    event.preventDefault();
    const point = getPointFromEvent(event);
    currentStrokeRef.current.points.push(point);
    redrawAll([...strokes, currentStrokeRef.current]);
  };

  const endDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!currentStrokeRef.current) return;

    const finalized = currentStrokeRef.current;
    currentStrokeRef.current = null;

    if (finalized.points.length > 0) {
      setStrokes((prev) => [...prev, finalized]);
      setRedoStrokes([]);
    }
  };

  const undo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      const removed = prev[prev.length - 1];
      setRedoStrokes((redo) => [...redo, removed]);
      return next;
    });
  };

  const redo = () => {
    setRedoStrokes((prev) => {
      if (prev.length === 0) return prev;
      const restored = prev[prev.length - 1];
      setStrokes((current) => [...current, restored]);
      return prev.slice(0, -1);
    });
  };

  const clearCanvas = () => {
    setStrokes([]);
    setRedoStrokes([]);
  };

  const applyPreset = (presetId: string) => {
    setActivePresetId(presetId);
    const preset = PRESET_CUSTOMS.find((item) => item.id === presetId);
    if (!preset) return;
    setCustom({
      bodyColor: preset.bodyColor,
      headColor: preset.headColor,
      beakColor: preset.beakColor,
      wingColor: preset.wingColor,
      eyeStyle: preset.eyeStyle,
      pattern: preset.pattern,
    });
  };

  const paintedRatio = useMemo(() => {
    if (strokes.length === 0) return 0;
    const weighted = strokes.reduce((sum, stroke) => {
      if (stroke.mode === "bucket") return sum + 1500;
      return sum + stroke.points.length * stroke.size;
    }, 0);
    return Math.min(100, Math.round(weighted / 220));
  }, [strokes]);

  return (
    <div
      className="size-full flex flex-col relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FFF8DC 0%, #F5DEB3 45%, #DEB887 100%)",
        fontFamily: "'Jua', sans-serif",
      }}
    >
      <div className="px-4 pt-4 pb-2 text-center">
        <h2 style={{ fontSize: 22, color: "#5C3317" }}>🎨 컬러링 타임</h2>
        <p style={{ fontSize: 13, color: "#8B4513" }}>
          마음껏 색칠해 보세요! 브러시로 칠하고, 지우개로 다듬을 수 있어요.
        </p>
      </div>

      <div className="px-4">
        <div
          className="rounded-xl px-3 py-2 flex items-center justify-between"
          style={{ background: "rgba(255,248,220,0.92)", border: "2px solid #B5894B" }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 12, color: "#6B4226" }}>색칠 진척</span>
            <span style={{ fontSize: 14, color: "#5C3317" }}>{paintedRatio}%</span>
          </div>
          <button
            className="px-2.5 py-1.5 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #FF8C00, #E8740C)",
              border: "2px solid #B8560B",
              color: "#fff",
              fontSize: 11,
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            }}
            onClick={() => setPanelOpen((prev) => !prev)}
          >
            {panelOpen ? "도구 닫기" : "도구 열기"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative px-4 pt-2 pb-3">
        <div className="h-full flex items-center justify-center">
          <div
            className="mx-auto"
            style={{
              width: "100%",
              maxWidth: 360,
              minWidth: 180,
              maxHeight: "58vh",
            }}
          >
            <div
              ref={stageRef}
              className="relative w-full rounded-2xl overflow-hidden mx-auto"
              style={{
                aspectRatio: `${TEMPLATE_ASPECT_RATIO}`,
                background: "linear-gradient(180deg, #fffef8, #fff9ed)",
                border: "4px solid #8B6914",
                boxShadow: "0 8px 20px rgba(0,0,0,0.16)",
                touchAction: "none",
              }}
            >
              <img
                src={coloringTemplate}
                alt="딱따구리 컬러링 도안"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                style={{ opacity: 0.22 }}
                draggable={false}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                onPointerDown={beginDrawing}
                onPointerMove={continueDrawing}
                onPointerUp={endDrawing}
                onPointerCancel={endDrawing}
              />
              <img
                src={coloringTemplate}
                alt="딱따구리 라인"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                style={{ opacity: 0.96, mixBlendMode: "multiply" }}
                draggable={false}
              />
            </div>
          </div>
        </div>

        <motion.div
          className="absolute top-2 bottom-2 right-0 z-30 w-[68%] max-w-[250px] rounded-l-2xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(255,248,220,0.98), rgba(242,220,184,0.98))",
            borderLeft: "3px solid #8B6914",
            borderTop: "3px solid #8B6914",
            borderBottom: "3px solid #8B6914",
            boxShadow: "-8px 0 16px rgba(0,0,0,0.18)",
          }}
          initial={false}
          animate={{ x: panelOpen ? 0 : "102%" }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
        >
          <div className="h-full overflow-y-auto px-3 py-3 space-y-2">
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 rounded-lg"
                style={{
                  background: tool === "brush" ? "#FF8C00" : "#E9D3AF",
                  color: tool === "brush" ? "#fff" : "#5C3317",
                  border: "2px solid #B8560B",
                  fontSize: 12,
                }}
                onClick={() => setTool("brush")}
              >
                🖌️
              </button>
              <button
                className="flex-1 py-2 rounded-lg"
                style={{
                  background: tool === "eraser" ? "#6B4226" : "#E9D3AF",
                  color: tool === "eraser" ? "#fff" : "#5C3317",
                  border: "2px solid #5C3317",
                  fontSize: 12,
                }}
                onClick={() => setTool("eraser")}
              >
                🧽
              </button>
              <button
                className="flex-1 py-2 rounded-lg"
                style={{
                  background: tool === "bucket" ? "#1E88E5" : "#E9D3AF",
                  color: tool === "bucket" ? "#fff" : "#5C3317",
                  border: "2px solid #1565C0",
                  fontSize: 12,
                }}
                onClick={() => setTool("bucket")}
              >
                🪣
              </button>
            </div>

            <div className="rounded-xl px-2 py-2" style={{ background: "rgba(255,248,220,0.85)", border: "2px solid #D4B483" }}>
              <p style={{ fontSize: 11, color: "#6B4226", marginBottom: 4 }}>
                도구: {tool === "brush" ? "브러시" : tool === "eraser" ? "지우개" : "버킷"} · {brushSize}px
              </p>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((color) => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded-full"
                    style={{
                      background: color,
                      border: brushColor === color ? "4px solid #5C3317" : "2px solid rgba(0,0,0,0.35)",
                      boxShadow: brushColor === color ? "0 0 0 2px #FFD166" : "0 1px 2px rgba(0,0,0,0.2)",
                    }}
                    onClick={() => {
                      setBrushColor(color);
                      setTool("brush");
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl px-2 py-2" style={{ background: "rgba(255,248,220,0.85)", border: "2px solid #D4B483" }}>
              <p style={{ fontSize: 11, color: "#6B4226", marginBottom: 6 }}>브러시 굵기</p>
              <div className="flex gap-1.5">
                {BRUSH_SIZES.map((item) => (
                  <button
                    key={item.value}
                    className="flex-1 py-1.5 rounded-lg"
                    style={{
                      background: brushSize === item.value ? "#FFD166" : "#F3E2C2",
                      border: brushSize === item.value ? "2px solid #B8560B" : "2px solid #C9A473",
                      color: "#5C3317",
                      fontSize: 11,
                    }}
                    onClick={() => setBrushSize(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                className="py-1.5 rounded-lg"
                style={{ background: "#EFD8B1", border: "2px solid #B5894B", color: "#5C3317", fontSize: 11 }}
                onClick={undo}
                disabled={strokes.length === 0}
              >
                ↩️
              </button>
              <button
                className="py-1.5 rounded-lg"
                style={{ background: "#EFD8B1", border: "2px solid #B5894B", color: "#5C3317", fontSize: 11 }}
                onClick={redo}
                disabled={redoStrokes.length === 0}
              >
                ↪️
              </button>
              <button
                className="py-1.5 rounded-lg"
                style={{ background: "#EFD8B1", border: "2px solid #B5894B", color: "#5C3317", fontSize: 11 }}
                onClick={clearCanvas}
              >
                🗑️
              </button>
            </div>

            <div>
              <p style={{ fontSize: 11, color: "#6B4226", marginBottom: 4 }}>완성 스타일</p>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_CUSTOMS.map((preset) => (
                  <button
                    key={preset.id}
                    className="py-1.5 rounded-lg"
                    style={{
                      background: activePresetId === preset.id ? "#FF8C00" : "#E9D3AF",
                      color: activePresetId === preset.id ? "#fff" : "#5C3317",
                      border: activePresetId === preset.id ? "2px solid #B8560B" : "2px solid #B5894B",
                      fontSize: 11,
                    }}
                    onClick={() => applyPreset(preset.id)}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-4 pb-5 pt-3">
        <motion.button
          className="w-full py-4 rounded-xl text-white"
          style={{
            background: "linear-gradient(180deg, #FF8C00, #E8740C)",
            border: "3px solid #B8560B",
            boxShadow: "0 4px 12px rgba(232,116,12,0.4)",
            fontSize: 18,
          }}
          onClick={() => onComplete(custom)}
          whileTap={{ scale: 0.96 }}
        >
          ✅ 색칠 완료하고 다음으로
        </motion.button>
      </div>
    </div>
  );
}
