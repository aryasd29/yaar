"use client";
import clsx from "clsx";
import { Heart } from "lucide-react";
import { motion } from "motion/react";
import { Scene } from "./Scene";
import { TAPE_BG, type Moment as M, type Profile, type ScrapTheme } from "@/lib/types";

const tilts = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "rotate-0", "-rotate-[1.5deg]"];

/** A scrapbook polaroid: photo (or illustrated stand-in), tape and a handwritten caption. */
export function Moment({ m, i = 0, size = "md", onReact, reacted, tape }: { m: M; i?: number; size?: "sm" | "md" | "lg"; onReact?: () => void; reacted?: boolean; tape?: ScrapTheme["tape"] }) {
  const h = size === "lg" ? "aspect-[4/4.3]" : size === "sm" ? "aspect-square" : "aspect-[4/4.4]";
  return (
    <figure className={clsx("relative rounded-[10px] bg-white p-2 pb-1 shadow-soft", tilts[i % tilts.length])}>
      <span className="tape" aria-hidden style={tape ? { background: TAPE_BG[tape] } : undefined} />
      <div className={clsx("relative overflow-hidden rounded-[6px] bg-vanilla", h)}>
        {m.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.photoUrl} alt={m.caption} className="h-full w-full object-cover" />
        ) : (
          <Scene k={m.scene ?? "city"} className="h-full w-full" />
        )}
        {onReact && (
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onReact}
            aria-label={`React to "${m.caption}"`}
            className={clsx("absolute bottom-2 right-2 grid h-11 w-11 place-items-center rounded-full shadow-soft transition", reacted ? "bg-coral text-charcoal" : "bg-white/95 text-coral-ink")}
          >
            <Heart size={20} fill={reacted ? "currentColor" : "none"} />
          </motion.button>
        )}
      </div>
      <figcaption className={clsx("px-1 pt-1 font-hand leading-tight text-charcoal", size === "sm" ? "text-[15px]" : "text-[20px]")}>
        {m.caption}
      </figcaption>
    </figure>
  );
}

export function Avatar({ p, size = 44, className }: { p: Pick<Profile, "name" | "moments">; size?: number; className?: string }) {
  const m = p.moments[0];
  return (
    <span className={clsx("relative inline-block shrink-0 overflow-hidden rounded-full border-2 border-white bg-coral-soft shadow-soft", className)} style={{ width: size, height: size }}>
      {m?.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : m ? (
        <Scene k={m.scene ?? "city"} className="h-full w-full" />
      ) : (
        <span className="grid h-full w-full place-items-center font-display text-coral-ink">{p.name[0]}</span>
      )}
    </span>
  );
}
