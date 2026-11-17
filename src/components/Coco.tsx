"use client";
import { useEffect, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "motion/react";

export type CocoMood = "excited" | "thinking" | "cheering" | "cool" | "curious" | "celebrating" | "calm";

const SHELL = "#8A5A3C";
const SHELL_DARK = "#6A4229";
const FIBRE = "#5A3820";
const FLESH = "#FFF4E2";
const INK = "#1b2d45";
const LEAF = "#3FB3A0";
const LEAF_DARK = "#1F8A7A";
const SUN = "#FFC94D";
const LAGOON = "#7DB9EC";
const CORAL = "#FF7A5C";

/**
 * Coco: Isle's mascot, a cheerful little coconut with a sprout on top.
 * Original illustration, drawn in code. `look` (-1..1 on each axis) moves the pupils,
 * so Coco can watch the cursor.
 */
export function Coco({ mood = "calm", size = 120, className, bob = true, look }: { mood?: CocoMood; size?: number; className?: string; bob?: boolean; look?: { x: number; y: number } }) {
  const reduce = useReducedMotion();
  const tilt = mood === "curious" ? -8 : 0;
  const armsUp = mood === "excited" || mood === "cheering" || mood === "celebrating";
  const lx = (look?.x ?? 0) * 2.6;
  const ly = (look?.y ?? 0) * 2.2;

  return (
    <motion.svg
      viewBox="0 0 120 130"
      width={size}
      height={(size * 130) / 120}
      className={className}
      role="img"
      aria-label={`Coco the coconut, feeling ${mood}`}
      animate={bob && !reduce ? { y: [0, -3, 0] } : undefined}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      {mood === "celebrating" && (
        <g>
          <rect x="8" y="22" width="6" height="6" rx="1.5" fill={SUN} transform="rotate(20 11 25)" />
          <rect x="104" y="18" width="6" height="6" rx="1.5" fill={LAGOON} transform="rotate(-15 107 21)" />
          <circle cx="16" cy="52" r="3" fill={LEAF} />
          <circle cx="106" cy="48" r="3" fill={CORAL} />
          <rect x="98" y="70" width="5" height="5" rx="1.2" fill={LEAF} transform="rotate(30 100 72)" />
          <rect x="12" y="76" width="5" height="5" rx="1.2" fill={LAGOON} transform="rotate(-25 14 78)" />
        </g>
      )}
      {mood === "thinking" && (
        <g fill={LAGOON}>
          <circle cx="98" cy="28" r="4" />
          <circle cx="106" cy="18" r="5.5" />
          <circle cx="92" cy="36" r="2.5" />
        </g>
      )}
      {mood === "curious" && (
        <text x="98" y="32" fontSize="22" fontWeight="800" fill={LAGOON} fontFamily="Nunito Sans Variable, sans-serif">?</text>
      )}

      <g transform={`rotate(${tilt} 60 75)`}>
        {/* legs */}
        <rect x="42" y="104" width="12" height="16" rx="6" fill={SHELL_DARK} />
        <rect x="66" y="104" width="12" height="16" rx="6" fill={SHELL_DARK} />
        <ellipse cx="47" cy="121" rx="9" ry="4.5" fill={SHELL_DARK} />
        <ellipse cx="73" cy="121" rx="9" ry="4.5" fill={SHELL_DARK} />

        {/* arms */}
        <g stroke={SHELL_DARK} strokeWidth="9" strokeLinecap="round" fill="none">
          {armsUp ? (
            <><path d="M28 70 Q14 54 16 40" /><path d="M92 70 Q106 54 104 40" /></>
          ) : mood === "thinking" ? (
            <><path d="M28 78 Q16 86 20 96" /><path d="M92 78 Q84 90 70 88" /></>
          ) : mood === "cool" ? (
            <><path d="M28 76 Q14 84 22 96" /><path d="M92 74 Q108 64 106 52" /></>
          ) : (
            <><path d="M28 76 Q16 86 20 98" /><path d="M92 76 Q104 86 100 98" /></>
          )}
        </g>

        {/* sprout on top (a party hat replaces it when celebrating) */}
        {mood !== "celebrating" && (
          <g>
            <path d="M60 34 Q59 24 61 18" stroke={LEAF_DARK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M61 20 Q48 8 38 16 Q50 22 61 21 Z" fill={LEAF} stroke={LEAF_DARK} strokeWidth="2" strokeLinejoin="round" />
            <path d="M61 20 Q74 6 86 13 Q73 21 61 21 Z" fill={LEAF} stroke={LEAF_DARK} strokeWidth="2" strokeLinejoin="round" />
          </g>
        )}

        {/* the coconut shell */}
        <path d="M60 30 C84 30 98 48 98 72 C98 96 82 110 60 110 C38 110 22 96 22 72 C22 48 36 30 60 30 Z" fill={SHELL} />
        {/* hairy fibres */}
        <g stroke={FIBRE} strokeWidth="2" strokeLinecap="round" opacity=".55">
          <path d="M30 56 l-5 -3" /><path d="M27 70 l-6 0" /><path d="M29 86 l-5 3" /><path d="M90 56 l5 -3" />
          <path d="M93 70 l6 0" /><path d="M91 86 l5 3" /><path d="M40 40 l-3 -4" /><path d="M80 40 l3 -4" /><path d="M48 104 l-2 4" /><path d="M72 104 l2 4" />
        </g>
        {/* the three little coconut "eyes" on top */}
        <g fill={FIBRE}><circle cx="52" cy="41" r="2.4" /><circle cx="60" cy="38" r="2.4" /><circle cx="68" cy="41" r="2.4" /></g>
        <ellipse cx="42" cy="48" rx="7" ry="4" fill="#fff" opacity="0.18" />

        {/* creamy coconut flesh where the face is */}
        <ellipse cx="60" cy="74" rx="30" ry="27" fill={FLESH} />
        <ellipse cx="60" cy="74" rx="30" ry="27" fill="none" stroke="#EADBC2" strokeWidth="3" />

        {mood === "celebrating" && (
          <g>
            <path d="M48 34 L60 6 L72 34 Z" fill={SUN} />
            <circle cx="60" cy="6" r="4" fill={CORAL} />
            <path d="M52 26 L68 26" stroke={CORAL} strokeWidth="3" />
          </g>
        )}

        {/* eyes */}
        {mood === "cheering" ? (
          <g stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none">
            <path d="M42 68 Q48 61 54 68" />
            <path d="M66 68 Q72 61 78 68" />
          </g>
        ) : mood === "cool" ? (
          <g>
            <path d="M36 62 H84 V68 Q84 78 74 78 H70 Q64 78 62 70 H58 Q56 78 50 78 H46 Q36 78 36 68 Z" fill={INK} />
            <path d="M42 65 L48 65" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          </g>
        ) : (
          <g>
            <ellipse cx="48" cy="67" rx={mood === "curious" ? 7.5 : 6.5} ry={mood === "excited" ? 8.5 : 7.5} fill="#fff" stroke={INK} strokeWidth="1.6" />
            <ellipse cx="72" cy="67" rx="6.5" ry={mood === "excited" ? 8.5 : 7.5} fill="#fff" stroke={INK} strokeWidth="1.6" />
            <circle cx={(mood === "thinking" ? 50 : 49) + lx} cy={(mood === "thinking" ? 64 : 68) + ly} r="3.6" fill={INK} />
            <circle cx={(mood === "thinking" ? 74 : 73) + lx} cy={(mood === "thinking" ? 64 : 68) + ly} r="3.6" fill={INK} />
            <circle cx={50.5 + lx} cy={65.5 + ly} r="1.2" fill="#fff" />
            <circle cx={74.5 + lx} cy={65.5 + ly} r="1.2" fill="#fff" />
          </g>
        )}

        {/* cheeks */}
        <ellipse cx="39" cy="80" rx="5" ry="3" fill={CORAL} opacity="0.5" />
        <ellipse cx="81" cy="80" rx="5" ry="3" fill={CORAL} opacity="0.5" />

        {/* mouth */}
        {mood === "thinking" || mood === "curious" ? (
          <ellipse cx="60" cy="85" rx="3.5" ry="3" fill={INK} />
        ) : mood === "cool" ? (
          <path d="M53 87 Q61 91 68 85" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : mood === "calm" ? (
          <path d="M53 84 Q60 90 67 84" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M50 82 Q60 97 70 82 Z" fill={INK} />
        )}
      </g>
    </motion.svg>
  );
}

/** Pupils follow the pointer: returns a -1..1 vector from an element's centre to the cursor. */
export function useCursorLook(ref: RefObject<HTMLElement | null>) {
  const [look, setLook] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.max(1, Math.hypot(dx, dy));
      const k = Math.min(1, d / 220);
      setLook({ x: (dx / d) * k, y: (dy / d) * k });
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [ref]);
  return look;
}
