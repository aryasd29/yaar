"use client";
import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Coco } from "./Coco";

const GLASS = ["#FFC6B6", "#FFE08F", "#BDEBE2", "#C9E2F8", "#FFC6B6", "#FFE08F"];

/**
 * The tide comes in: a wave rolls up the screen carrying today's bottles, Coco cheers,
 * then the water recedes and the bottles are left on the sand (the grid below).
 * Plays once per drop. Tap, click or press any key to skip.
 */
export function TideArrival({ show, count, onDone }: { show: boolean; count: number; onDone: () => void }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!show) return;
    if (reduce) { onDone(); return; }
    const t = setTimeout(onDone, 3000);
    const skip = () => onDone();
    window.addEventListener("keydown", skip);
    return () => { clearTimeout(t); window.removeEventListener("keydown", skip); };
  }, [show, reduce, onDone]);

  return (
    <AnimatePresence>
      {show && !reduce && (
        <motion.div className="fixed inset-0 z-[65] cursor-pointer overflow-hidden" onClick={onDone} role="status" aria-live="polite"
          initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }}>
          <span className="sr-only">The tide brought {count} new bottles.</span>
          {/* the wave body rising and falling */}
          <motion.div className="absolute inset-x-[-10%] bottom-0 h-[78%] bg-[linear-gradient(180deg,#7DB9EC_0%,#5C9BD6_45%,#3F7FBF_100%)]"
            initial={{ y: "105%" }} animate={{ y: ["105%", "0%", "0%", "110%"] }} transition={{ duration: 2.9, times: [0, 0.25, 0.72, 1], ease: "easeInOut" }}>
            {/* foamy crest */}
            <div className="wave-drift absolute -top-7 left-0 flex w-[200%]" style={{ ["--drift" as string]: "5s" }}>
              {[0, 1].map((k) => (
                <svg key={k} viewBox="0 0 400 40" preserveAspectRatio="none" className="h-8 w-1/2">
                  <path d="M0 28 Q25 6 50 28 T100 28 T150 28 T200 28 T250 28 T300 28 T350 28 T400 28 V40 H0Z" fill="#7DB9EC" />
                  <path d="M0 28 Q25 6 50 28 T100 28 T150 28 T200 28 T250 28 T300 28 T350 28 T400 28" stroke="#FFF9F0" strokeWidth="4" fill="none" />
                </svg>
              ))}
            </div>
            {/* bottles riding the wave */}
            <div className="absolute inset-x-[12%] top-[16%] flex flex-wrap justify-center gap-x-6 gap-y-4">
              {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
                <motion.svg key={i} viewBox="0 0 120 60" className="w-[92px] sm:w-[120px]" initial={{ y: 30, rotate: -20, opacity: 0 }}
                  animate={{ y: [30, -8, 4, -6], rotate: [-20, 6, -4, 3], opacity: 1 }} transition={{ delay: 0.35 + i * 0.09, duration: 1.4, ease: "easeOut" }} aria-hidden>
                  <path d="M30 12 H70 Q84 12 89 24 H101 Q104 24 104 27 V35 Q104 38 101 38 H89 Q84 50 70 50 H30 Q12 50 12 31 Q12 12 30 12 Z" fill={GLASS[i]} stroke="#1b2d45" strokeWidth="3" />
                  <rect x="102" y="23" width="9" height="16" rx="3" fill="#C98D5B" stroke="#1b2d45" strokeWidth="2.5" />
                  <rect x="26" y="22" width="50" height="18" rx="9" fill="#FFF9F0" stroke="#1b2d45" strokeWidth="2" />
                  <path d="M51 22 V40" stroke="#FF7A5C" strokeWidth="3" />
                </motion.svg>
              ))}
            </div>
            <motion.div className="absolute bottom-[14%] left-1/2 flex -translate-x-1/2 flex-col items-center text-center text-paper"
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7, type: "spring", damping: 12 }}>
              <Coco mood="cheering" size={110} bob={false} />
              <p className="mt-1 font-display text-[28px] font-extrabold drop-shadow-[0_2px_0_#1b2d45] sm:text-[34px]">The tide is in!</p>
              <p className="text-[15px] font-semibold opacity-90">{count} {count === 1 ? "bottle" : "bottles"} washed ashore for you</p>
            </motion.div>
          </motion.div>
          <p className="absolute right-4 top-4 rounded-full bg-paper/80 px-3 py-1 text-[12.5px] font-semibold text-charcoal">Tap to skip</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
