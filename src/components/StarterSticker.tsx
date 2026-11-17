"use client";
import { Scene } from "./Scene";
import { starterArt } from "@/lib/logic";

const TILTS = [-3, 2, -1.5, 3, -2];

/** A starter-pack item as a die-cut sticker with a small matching illustration. */
export function StarterSticker({ text, i = 0 }: { text: string; i?: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border-[3px] border-white bg-paper py-1 pl-1 pr-3.5 text-[14px] font-bold text-charcoal shadow-[0_3px_8px_-2px_rgb(27_45_69/0.35)]"
      style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)` }}>
      <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-charcoal/80"><Scene k={starterArt(text)} className="h-full w-full" /></span>
      {text}
    </span>
  );
}
