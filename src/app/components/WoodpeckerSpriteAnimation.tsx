import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { WoodpeckerSVG } from "./WoodpeckerSVG";

interface TimelineFrame {
  src: string;
  durationMs: number;
}

const SPEED_MULTIPLIER = 1.6;

function collectFrames(modules: Record<string, unknown>): string[] {
  return Object.entries(modules)
    .sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    )
    .map(([, value]) => String(value));
}

function collectNumberedFrames(modules: Record<string, unknown>): string[] {
  return Object.entries(modules)
    .filter(([path]) => /\/\d+\.(png|jpe?g|webp)$/i.test(path))
    .sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    )
    .map(([, value]) => String(value));
}

const DOOR_FRAMES = collectFrames(
  import.meta.glob("../../assets/woodpecker/door/*.{png,jpg,jpeg,webp}", {
    eager: true,
    import: "default",
  })
);

const HAMMER_FRAMES = collectFrames(
  import.meta.glob("../../assets/woodpecker/hammer/*.{png,jpg,jpeg,webp}", {
    eager: true,
    import: "default",
  })
);

const FINISH_FRAMES = collectFrames(
  import.meta.glob("../../assets/woodpecker/finish/*.{png,jpg,jpeg,webp}", {
    eager: true,
    import: "default",
  })
);

const ROOT_FRAMES = collectNumberedFrames(
  import.meta.glob("../../assets/woodpecker/*.{png,jpg,jpeg,webp}", {
    eager: true,
    import: "default",
  })
);

function buildTimeline(): TimelineFrame[] {
  if (ROOT_FRAMES.length > 0) {
    const rootFrameDuration = Math.round(120 * SPEED_MULTIPLIER);
    const rootTimeline = ROOT_FRAMES.map((src) => ({
      src,
      durationMs: rootFrameDuration,
    }));
    rootTimeline.push({
      src: ROOT_FRAMES[ROOT_FRAMES.length - 1],
      durationMs: Math.round(700 * SPEED_MULTIPLIER),
    });
    return rootTimeline;
  }

  const timeline: TimelineFrame[] = [];

  const appendClip = (frames: string[], fps: number, loops: number, pauseMs: number) => {
    if (frames.length === 0) return;
    const frameDuration = Math.max(40, Math.round((1000 / fps) * SPEED_MULTIPLIER));

    for (let i = 0; i < loops; i += 1) {
      frames.forEach((src) => {
        timeline.push({ src, durationMs: frameDuration });
      });
    }

    timeline.push({
      src: frames[frames.length - 1],
      durationMs: Math.round(pauseMs * SPEED_MULTIPLIER),
    });
  };

  appendClip(DOOR_FRAMES, 7, 2, 280);
  appendClip(HAMMER_FRAMES, 8, 2, 320);
  appendClip(FINISH_FRAMES, 4, 1, 900);

  return timeline;
}

export function WoodpeckerSpriteAnimation() {
  const timeline = useMemo(() => buildTimeline(), []);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (timeline.length <= 1) return;

    const timer = window.setTimeout(() => {
      setFrameIndex((prev) => (prev + 1) % timeline.length);
    }, timeline[frameIndex].durationMs);

    return () => window.clearTimeout(timer);
  }, [frameIndex, timeline]);

  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <WoodpeckerSVG size={120} />
        <p style={{ fontSize: 12, color: "#8B4513" }}>
          src/assets/woodpecker 폴더에 프레임을 넣어주세요
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="flex items-center justify-center w-full"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <img
        src={timeline[frameIndex].src}
        alt="딱따구리 애니메이션"
        style={{
          width: "min(88vw, 320px)",
          height: "auto",
          objectFit: "contain",
          userSelect: "none",
          pointerEvents: "none",
          filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.16))",
        }}
        draggable={false}
      />
    </motion.div>
  );
}
