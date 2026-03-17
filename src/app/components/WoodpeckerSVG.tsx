import React from "react";

interface WoodpeckerSVGProps {
  size?: number;
  bodyColor?: string;
  headColor?: string;
  beakColor?: string;
  wingColor?: string;
  eyeStyle?: "normal" | "happy" | "star" | "heart";
  pattern?: "none" | "dots" | "stripes" | "zigzag";
  className?: string;
  style?: React.CSSProperties;
}

export function WoodpeckerSVG({
  size = 200,
  bodyColor = "#8B4513",
  headColor = "#DC143C",
  beakColor = "#FFD700",
  wingColor = "#654321",
  eyeStyle = "normal",
  pattern = "none",
  className = "",
  style = {},
}: WoodpeckerSVGProps) {
  const renderEye = () => {
    switch (eyeStyle) {
      case "happy":
        return (
          <path
            d="M 72 55 Q 75 50, 78 55"
            stroke="#222"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        );
      case "star":
        return (
          <polygon
            points="75,50 76.5,54 80.5,54 77.5,56.5 78.5,60.5 75,58 71.5,60.5 72.5,56.5 69.5,54 73.5,54"
            fill="#222"
          />
        );
      case "heart":
        return (
          <path
            d="M 75 58 C 75 54, 70 52, 72 55 C 70 52, 75 50, 75 54 C 75 50, 80 52, 78 55 C 80 52, 75 54, 75 58"
            fill="#FF69B4"
          />
        );
      default:
        return (
          <>
            <circle cx="75" cy="55" r="4" fill="white" />
            <circle cx="76" cy="54" r="2" fill="#222" />
            <circle cx="77" cy="53" r="0.8" fill="white" />
          </>
        );
    }
  };

  const renderPattern = () => {
    switch (pattern) {
      case "dots":
        return (
          <>
            <circle cx="55" cy="90" r="2" fill="rgba(255,255,255,0.3)" />
            <circle cx="65" cy="100" r="2" fill="rgba(255,255,255,0.3)" />
            <circle cx="50" cy="110" r="2" fill="rgba(255,255,255,0.3)" />
            <circle cx="60" cy="120" r="2" fill="rgba(255,255,255,0.3)" />
            <circle cx="70" cy="105" r="2" fill="rgba(255,255,255,0.3)" />
          </>
        );
      case "stripes":
        return (
          <>
            <line x1="40" y1="90" x2="70" y2="90" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <line x1="38" y1="100" x2="72" y2="100" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <line x1="36" y1="110" x2="74" y2="110" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <line x1="38" y1="120" x2="72" y2="120" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          </>
        );
      case "zigzag":
        return (
          <polyline
            points="40,88 50,95 40,102 50,109 40,116 50,123"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="2"
            fill="none"
          />
        );
      default:
        return null;
    }
  };

  return (
    <svg
      viewBox="0 0 120 180"
      width={size}
      height={size * 1.5}
      className={className}
      style={style}
    >
      {/* Body */}
      <ellipse cx="55" cy="110" rx="25" ry="40" fill={bodyColor} />
      {/* Belly */}
      <ellipse cx="55" cy="115" rx="16" ry="25" fill="#DEB887" opacity="0.6" />
      {/* Pattern */}
      {renderPattern()}
      {/* Tail */}
      <path d="M 45 145 L 35 170 L 50 155 L 55 175 L 60 155 L 65 170 L 60 145" fill={wingColor} />
      {/* Wing */}
      <ellipse cx="38" cy="105" rx="12" ry="22" fill={wingColor} transform="rotate(-10 38 105)" />
      <ellipse cx="38" cy="105" rx="8" ry="16" fill={bodyColor} opacity="0.3" transform="rotate(-10 38 105)" />
      {/* Head */}
      <circle cx="65" cy="58" r="22" fill={headColor} />
      {/* Crest */}
      <path d="M 72 38 L 85 28 L 78 42 L 90 35 L 80 48" fill={headColor} />
      <path d="M 72 38 L 82 30 L 78 42" fill="#FF4500" opacity="0.6" />
      {/* Beak */}
      <polygon points="85,55 110,52 85,60" fill={beakColor} />
      <line x1="85" y1="57" x2="105" y2="55" stroke="#DAA520" strokeWidth="0.5" />
      {/* Eye */}
      {renderEye()}
      {/* Cheek */}
      <circle cx="70" cy="65" r="5" fill="#FF9999" opacity="0.4" />
      {/* Feet */}
      <path d="M 45 148 L 38 160 M 45 148 L 45 160 M 45 148 L 52 158" stroke="#DAA520" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 60 148 L 53 160 M 60 148 L 60 160 M 60 148 L 67 158" stroke="#DAA520" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// Simple woodpecker head for splash/icons
export function WoodpeckerHead({ size = 60, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} className={className}>
      <circle cx="35" cy="40" r="22" fill="#DC143C" />
      <path d="M 42 22 L 55 12 L 48 26 L 60 18 L 50 30" fill="#DC143C" />
      <path d="M 42 22 L 52 14 L 48 26" fill="#FF4500" opacity="0.6" />
      <polygon points="55,38 78,35 55,43" fill="#FFD700" />
      <circle cx="42" cy="37" r="4" fill="white" />
      <circle cx="43" cy="36" r="2" fill="#222" />
      <circle cx="44" cy="35" r="0.8" fill="white" />
      <circle cx="40" cy="47" r="5" fill="#FF9999" opacity="0.4" />
    </svg>
  );
}
