"use client";
import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { Scene } from "./Scene";
import type { Profile } from "@/lib/types";

const FILL = { coral: "#FFC4B9", butter: "#FBE59A", sage: "#CFE3CA", peri: "#CFD8F8" } as const;
export type EnvTone = keyof typeof FILL;

/**
 * A sealed introduction. Opening it lifts the flap, breaks the seal and slides
 * a polaroid of the person out, then the caller navigates to their scrapbook.
 */
export function Envelope({ p, tone, teaser, opening, opened, tilt = 0 }: { p: Profile; tone: EnvTone; teaser: string; opening?: boolean; opened?: boolean; tilt?: number }) {
  const reduce = useReducedMotion();
  const fill = FILL[tone];
  const showCard = opening || opened;
  return (
    <div className="relative" style={{ transform: `rotate(${tilt}deg)` }}>
      <div className="relative aspect-[4/3] w-full" style={{ perspective: 600 }}>
        {/* polaroid that slides out */}
        <motion.div
          className="absolute inset-x-[12%] top-[10%] z-10 rounded-[6px] border-2 border-charcoal bg-white p-1.5 pb-5"
          initial={false}
          animate={{ y: showCard ? (opened && !opening ? "-18%" : "-42%") : "8%", opacity: showCard ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.45, delay: opening ? 0.22 : 0, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <Scene k={p.moments[0]?.scene ?? "city"} className="aspect-[4/3] w-full rounded-[3px]" />
          <span className="absolute bottom-0.5 left-2 font-hand text-[16px] leading-none">{p.name}, {p.age}</span>
        </motion.div>

        {/* envelope back */}
        <svg viewBox="0 0 200 150" className="absolute inset-0 h-full w-full" aria-hidden>
          <rect x="3" y="3" width="194" height="144" rx="14" fill={fill} stroke="#343238" strokeWidth="3" />
        </svg>
        {/* front pocket (covers lower part of the polaroid) */}
        <svg viewBox="0 0 200 150" className="absolute inset-0 z-20 h-full w-full" aria-hidden>
          <path d="M3 50 L100 104 L197 50 V133 Q197 147 183 147 H17 Q3 147 3 133 Z" fill={fill} stroke="#343238" strokeWidth="3" strokeLinejoin="round" />
          <path d="M3 147 L82 92 M197 147 L118 92" stroke="#343238" strokeWidth="2.2" opacity=".55" />
        </svg>
        {/* flap */}
        <motion.svg
          viewBox="0 0 200 150" className="absolute inset-0 z-30 h-full w-full" aria-hidden
          style={{ transformOrigin: "50% 2%" }}
          initial={false}
          animate={{ rotateX: showCard ? 180 : 0, zIndex: showCard ? 5 : 30 }}
          transition={{ duration: reduce ? 0 : 0.35, ease: "easeOut" }}
        >
          <path d="M5 6 Q5 3 14 3 H186 Q195 3 195 6 L100 86 Z" fill={fill} stroke="#343238" strokeWidth="3" strokeLinejoin="round" />
        </motion.svg>
        {/* wax seal */}
        <motion.div
          className="absolute left-1/2 top-[50%] z-40 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-charcoal bg-coral text-[18px] shadow-[0_3px_0_0_#343238]"
          initial={false}
          animate={showCard ? { scale: [1, 1.25, 0], rotate: 25, opacity: [1, 1, 0] } : { scale: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.3 }}
          aria-hidden
        >
          ♥
        </motion.div>
        {/* handwritten teaser on the pocket */}
        {!showCard && (
          <span className={clsx("absolute inset-x-3 bottom-2.5 z-40 truncate text-center font-hand text-[15px] leading-none sm:text-[17px] lg:text-[18px] text-charcoal/85")}>{teaser}</span>
        )}
      </div>
    </div>
  );
}
