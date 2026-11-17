"use client";
import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { Scene } from "./Scene";
import type { Profile } from "@/lib/types";

const GLASS = { coral: "#FFC6B6", butter: "#FFE08F", sage: "#BDEBE2", peri: "#C9E2F8" } as const;
export type BottleTone = keyof typeof GLASS;
const INK = "#1b2d45";

/**
 * A message in a bottle, washed up on the sand. Opening it pops the cork and the
 * introduction slides out as a polaroid; then the caller navigates to their scrapbook.
 */
export function Bottle({ p, tone, teaser, opening, opened, tilt = 0 }: { p: Profile; tone: BottleTone; teaser: string; opening?: boolean; opened?: boolean; tilt?: number }) {
  const reduce = useReducedMotion();
  const glass = GLASS[tone];
  const out = opening || opened;
  return (
    <div className="relative" style={{ transform: `rotate(${tilt}deg)` }}>
      <div className="relative aspect-[4/3] w-full">
        {/* sand and a little wave */}
        <svg viewBox="0 0 200 150" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d="M0 150 V118 Q40 104 100 110 T200 112 V150 Z" fill="#F3DDB8" />
          <path d="M6 112 Q22 102 38 110 T70 108" stroke="#7DB9EC" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M150 104 Q164 96 178 103 T198 101" stroke="#7DB9EC" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
          <g fill="#C9A982" opacity=".6"><circle cx="30" cy="134" r="2" /><circle cx="168" cy="138" r="2.2" /><circle cx="120" cy="140" r="1.6" /></g>
        </svg>

        {/* the note: a polaroid that rises out of the bottle */}
        <motion.div
          className="absolute inset-x-[20%] top-[14%] z-10 rounded-[6px] border-2 border-charcoal bg-white p-1.5 pb-5"
          initial={false}
          animate={{ y: out ? (opened && !opening ? "-22%" : "-46%") : "18%", opacity: out ? 1 : 0, scale: out ? 1 : 0.6, rotate: out ? -3 : 0 }}
          transition={{ duration: reduce ? 0 : 0.5, delay: opening ? 0.25 : 0, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <Scene k={p.moments[0]?.scene ?? "city"} className="aspect-[4/3] w-full rounded-[3px]" />
          <span className="absolute bottom-0.5 left-2 font-hand text-[16px] leading-none">{p.name}, {p.age}</span>
        </motion.div>

        {/* the bottle, lying on the sand */}
        <svg viewBox="0 0 200 150" className="absolute inset-0 z-20 h-full w-full" aria-hidden>
          <g transform="rotate(-8 100 88)">
            <path d="M54 56 H118 Q140 56 148 76 H168 Q172 76 172 80 V96 Q172 100 168 100 H148 Q140 120 118 120 H54 Q24 120 24 88 Q24 56 54 56 Z" fill={glass} fillOpacity=".9" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            {/* rolled note inside */}
            <g opacity={out ? 0.25 : 1}>
              <rect x="46" y="74" width="84" height="28" rx="14" fill="#FFF9F0" stroke={INK} strokeWidth="2" />
              <path d="M88 74 V102" stroke="#FF7A5C" strokeWidth="4" />
            </g>
            {/* glass shine */}
            <path d="M40 70 Q60 62 86 64" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".75" />
          </g>
        </svg>

        {/* cork with a heart seal: pops off when opened */}
        <motion.div
          className="absolute left-[89%] top-[51%] z-30 grid h-[24%] w-[9%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[6px] border-2 border-charcoal bg-[#C98D5B] text-[11px] text-paper"
          initial={false}
          animate={out ? { x: 20, y: -46, rotate: 70, opacity: opened && !opening ? 0 : [1, 1, 0] } : { x: 0, y: 0, rotate: -8, opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.45 }}
          aria-hidden
        >
          ♥
        </motion.div>

        {/* handwritten teaser in the sand */}
        {!out && (
          <span className={clsx("absolute inset-x-3 bottom-1.5 z-40 truncate text-center font-hand text-[15px] leading-none text-charcoal/85 sm:text-[17px] lg:text-[18px]")}>{teaser}</span>
        )}
      </div>
    </div>
  );
}
