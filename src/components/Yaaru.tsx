"use client";
import { motion, useReducedMotion } from "motion/react";

export type YaaruMood = "excited" | "thinking" | "cheering" | "cool" | "curious" | "celebrating" | "calm";

const CORAL = "#FF806E";
const CORAL_DARK = "#E9654F";
const INK = "#343238";
const BUTTER = "#F8D86A";
const PERI = "#A9B8F0";
const SAGE = "#A9C9A3";

/** Yaaru: Yaar's coral blob mascot. Original illustration, drawn in code. */
export function Yaaru({ mood = "calm", size = 120, className, bob = true }: { mood?: YaaruMood; size?: number; className?: string; bob?: boolean }) {
  const reduce = useReducedMotion();
  const tilt = mood === "curious" ? -8 : 0;
  const armsUp = mood === "excited" || mood === "cheering" || mood === "celebrating";

  return (
    <motion.svg
      viewBox="0 0 120 130"
      width={size}
      height={(size * 130) / 120}
      className={className}
      role="img"
      aria-label={`Yaaru, feeling ${mood}`}
      animate={bob && !reduce ? { y: [0, -3, 0] } : undefined}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* confetti for celebrating */}
      {mood === "celebrating" && (
        <g>
          <rect x="8" y="22" width="6" height="6" rx="1.5" fill={BUTTER} transform="rotate(20 11 25)" />
          <rect x="104" y="18" width="6" height="6" rx="1.5" fill={PERI} transform="rotate(-15 107 21)" />
          <circle cx="16" cy="52" r="3" fill={SAGE} />
          <circle cx="106" cy="48" r="3" fill={BUTTER} />
          <rect x="98" y="70" width="5" height="5" rx="1.2" fill={SAGE} transform="rotate(30 100 72)" />
          <rect x="12" y="76" width="5" height="5" rx="1.2" fill={PERI} transform="rotate(-25 14 78)" />
        </g>
      )}
      {mood === "thinking" && (
        <g fill={PERI}>
          <circle cx="96" cy="26" r="4" />
          <circle cx="104" cy="16" r="5.5" />
          <circle cx="90" cy="34" r="2.5" />
        </g>
      )}
      {mood === "curious" && (
        <text x="96" y="30" fontSize="22" fontWeight="800" fill={PERI} fontFamily="Nunito Sans Variable, sans-serif">?</text>
      )}

      <g transform={`rotate(${tilt} 60 75)`}>
        {/* legs */}
        <rect x="42" y="104" width="12" height="16" rx="6" fill={CORAL_DARK} />
        <rect x="66" y="104" width="12" height="16" rx="6" fill={CORAL_DARK} />
        <ellipse cx="47" cy="121" rx="9" ry="4.5" fill={CORAL_DARK} />
        <ellipse cx="73" cy="121" rx="9" ry="4.5" fill={CORAL_DARK} />

        {/* arms */}
        {armsUp ? (
          <>
            <path d="M28 70 Q14 54 16 40" stroke={CORAL_DARK} strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M92 70 Q106 54 104 40" stroke={CORAL_DARK} strokeWidth="9" strokeLinecap="round" fill="none" />
          </>
        ) : mood === "thinking" ? (
          <>
            <path d="M28 78 Q16 86 20 96" stroke={CORAL_DARK} strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M92 78 Q84 90 70 88" stroke={CORAL_DARK} strokeWidth="9" strokeLinecap="round" fill="none" />
          </>
        ) : mood === "cool" ? (
          <>
            <path d="M28 76 Q14 84 22 96" stroke={CORAL_DARK} strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M92 74 Q108 64 106 52" stroke={CORAL_DARK} strokeWidth="9" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <path d="M28 76 Q16 86 20 98" stroke={CORAL_DARK} strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M92 76 Q104 86 100 98" stroke={CORAL_DARK} strokeWidth="9" strokeLinecap="round" fill="none" />
          </>
        )}

        {/* body blob */}
        <path
          d="M60 30 C84 30 98 48 98 72 C98 96 82 110 60 110 C38 110 22 96 22 72 C22 48 36 30 60 30 Z"
          fill={CORAL}
        />
        <ellipse cx="60" cy="88" rx="22" ry="14" fill="#FF9A8B" />
        <ellipse cx="44" cy="44" rx="8" ry="5" fill="#FFB3A7" opacity="0.7" />

        {/* party hat */}
        {mood === "celebrating" && (
          <g>
            <path d="M48 34 L60 6 L72 34 Z" fill={BUTTER} />
            <circle cx="60" cy="6" r="4" fill={PERI} />
            <path d="M52 26 L68 26" stroke={PERI} strokeWidth="3" />
          </g>
        )}

        {/* eyes */}
        {mood === "cheering" ? (
          <g stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none">
            <path d="M42 64 Q48 57 54 64" />
            <path d="M66 64 Q72 57 78 64" />
          </g>
        ) : mood === "cool" ? (
          <g>
            <path d="M36 58 H84 V64 Q84 74 74 74 H70 Q64 74 62 66 H58 Q56 74 50 74 H46 Q36 74 36 64 Z" fill={INK} />
            <path d="M42 61 L48 61" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          </g>
        ) : (
          <g>
            <ellipse cx="48" cy="64" rx={mood === "curious" ? 7.5 : 6.5} ry={mood === "excited" ? 8.5 : 7.5} fill="#fff" />
            <ellipse cx="72" cy="64" rx="6.5" ry={mood === "excited" ? 8.5 : 7.5} fill="#fff" />
            <circle cx={mood === "thinking" ? 50 : 49} cy={mood === "thinking" ? 61 : 65} r="3.6" fill={INK} />
            <circle cx={mood === "thinking" ? 74 : 73} cy={mood === "thinking" ? 61 : 65} r="3.6" fill={INK} />
            <circle cx="50.5" cy="62.5" r="1.2" fill="#fff" />
            <circle cx="74.5" cy="62.5" r="1.2" fill="#fff" />
          </g>
        )}

        {/* cheeks */}
        <ellipse cx="38" cy="76" rx="5" ry="3" fill="#FF6B57" opacity="0.45" />
        <ellipse cx="82" cy="76" rx="5" ry="3" fill="#FF6B57" opacity="0.45" />

        {/* mouth */}
        {mood === "thinking" || mood === "curious" ? (
          <ellipse cx="60" cy="80" rx="3.5" ry="3" fill={INK} />
        ) : mood === "cool" ? (
          <path d="M53 82 Q61 86 68 80" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : mood === "calm" ? (
          <path d="M53 79 Q60 85 67 79" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M50 77 Q60 92 70 77 Z" fill={INK} />
        )}
      </g>
    </motion.svg>
  );
}
