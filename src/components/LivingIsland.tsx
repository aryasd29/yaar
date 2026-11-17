"use client";
import { useRef } from "react";
import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { Coco, useCursorLook } from "./Coco";
import { Waves } from "./Sea";

const GLASS = ["#FFC6B6", "#FFE08F", "#BDEBE2"];

/**
 * The landing-page scene. `progress` (0→1, from page scroll) moves the day along:
 * morning → sunset (bottles wash ashore) → starry night (a second isle drifts over and a bridge forms).
 */
export function LivingIsland({ progress, onBottle }: { progress: MotionValue<number>; onBottle: (i: number) => void }) {
  const reduce = useReducedMotion();
  const cocoRef = useRef<HTMLDivElement>(null);
  const look = useCursorLook(cocoRef);

  const top = useTransform(progress, [0, 0.4, 0.75, 1], ["#BFE6FB", "#FFB38A", "#24406A", "#0F1E33"]);
  const bottom = useTransform(progress, [0, 0.4, 0.75, 1], ["#FFE3C4", "#FF8F6B", "#FF9C84", "#24406A"]);
  const sky = useTransform([top, bottom], ([t, b]) => `linear-gradient(180deg, ${t} 0%, ${b} 100%)`);
  const sunY = useTransform(progress, [0, 0.55, 0.7], ["0%", "190%", "260%"]);
  const sunOpacity = useTransform(progress, [0.55, 0.7], [1, 0]);
  const nightOpacity = useTransform(progress, [0.62, 0.82], [0, 1]);
  const friendX = useTransform(progress, [0.7, 0.92], ["140%", "0%"]);
  const bridge = useTransform(progress, [0.86, 0.96], [0, 1]);
  // Bottles drift in from the open sea during the evening, and are gone (opened) by night.
  const bottleX = [
    useTransform(progress, [0.18, 0.45], ["120%", "0%"]),
    useTransform(progress, [0.24, 0.51], ["140%", "0%"]),
    useTransform(progress, [0.3, 0.57], ["160%", "0%"]),
  ];
  const bottleOpacity = [
    useTransform(progress, [0.18, 0.26, 0.7, 0.8], [0, 1, 1, 0]),
    useTransform(progress, [0.24, 0.32, 0.7, 0.8], [0, 1, 1, 0]),
    useTransform(progress, [0.3, 0.38, 0.7, 0.8], [0, 1, 1, 0]),
  ];

  return (
    <motion.div className="relative h-full w-full overflow-hidden rounded-[32px] border-2 border-charcoal" style={{ background: sky }}>
      {/* stars and moon at night */}
      <motion.div className="absolute inset-0" style={{ opacity: nightOpacity }} aria-hidden>
        {[[8, 12], [18, 30], [27, 8], [36, 22], [47, 12], [57, 28], [66, 8], [76, 20], [88, 10], [94, 30], [12, 44], [83, 40]].map(([x, y], i) => (
          <span key={i} className="twinkle absolute h-[3px] w-[3px] rounded-full bg-[#FFF4D6]" style={{ left: `${x}%`, top: `${y}%`, ["--tw" as string]: `${2 + (i % 4) * 0.6}s` }} />
        ))}
        <svg viewBox="0 0 40 40" className="absolute right-[14%] top-[9%] h-16 w-16 drop-shadow-[0_0_18px_rgba(255,244,214,0.55)]"><path d="M26 5 A15 15 0 1 0 35 29 A11.5 11.5 0 1 1 26 5 Z" fill="#FFF4D6" /></svg>
      </motion.div>

      {/* the sun: rises high in the morning, sets into the sea by evening */}
      <motion.span className="absolute right-[18%] top-[14%] h-20 w-20 rounded-full bg-[#FFC94D] shadow-[0_0_60px_18px_rgba(255,201,77,0.5)] lg:h-24 lg:w-24" style={{ y: sunY, opacity: sunOpacity }} aria-hidden />

      <Waves height={130} layers={["#7DB9EC", "#5C9BD6", "#3F7FBF"]} />

      {/* our isle, with a palm */}
      <div className="absolute bottom-[58px] left-[4%] z-10 w-[64%] max-w-[360px] lg:max-w-[480px]">
        <svg viewBox="0 0 300 120" className="w-full" aria-hidden>
          <path d="M210 98 Q218 56 204 22" stroke="#1b2d45" strokeWidth="7" fill="none" strokeLinecap="round" />
          <g fill="#3FB3A0" stroke="#1b2d45" strokeWidth="3" strokeLinejoin="round">
            <path d="M204 22 Q176 4 150 20 Q178 16 204 28Z" /><path d="M204 22 Q232 0 262 14 Q234 16 206 28Z" />
            <path d="M204 22 Q190 -6 204 -18 Q208 4 208 26Z" /><path d="M204 22 Q182 32 172 56 Q192 34 206 28Z" /><path d="M204 22 Q228 32 238 56 Q220 34 204 28Z" />
          </g>
          <circle cx="198" cy="30" r="6" fill="#8A5A3C" stroke="#1b2d45" strokeWidth="2.5" /><circle cx="210" cy="32" r="6" fill="#8A5A3C" stroke="#1b2d45" strokeWidth="2.5" />
          <ellipse cx="150" cy="102" rx="142" ry="18" fill="#F3DDB8" stroke="#1b2d45" strokeWidth="3" />
          <path d="M30 106 Q150 126 270 104" stroke="#FFF9F0" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".85" />
        </svg>
        <div ref={cocoRef} className="absolute bottom-[12%] left-[22%] w-[34%]">
          <Coco mood="excited" size={140} className="h-auto w-full" look={look} bob={!reduce} />
        </div>
      </div>

      {/* bottles washing ashore: tap one to peek inside */}
      <div className="absolute bottom-[40px] right-[4%] z-20 flex w-[44%] max-w-[260px] flex-col items-end gap-1">
        {bottleX.map((x, i) => (
          <motion.button key={i} type="button" onClick={() => onBottle(i)} style={{ x, opacity: bottleOpacity[i] }} aria-label={`Open sample message in a bottle ${i + 1}`}
            className="block w-[64%] rounded-full outline-offset-4" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
            <svg viewBox="0 0 120 60" className="bob w-full" style={{ ["--bob" as string]: `${2.8 + i * 0.5}s` }} aria-hidden>
              <path d="M30 12 H70 Q84 12 89 24 H101 Q104 24 104 27 V35 Q104 38 101 38 H89 Q84 50 70 50 H30 Q12 50 12 31 Q12 12 30 12 Z" fill={GLASS[i]} stroke="#1b2d45" strokeWidth="3" />
              <rect x="102" y="23" width="9" height="16" rx="3" fill="#C98D5B" stroke="#1b2d45" strokeWidth="2.5" />
              <rect x="26" y="22" width="50" height="18" rx="9" fill="#FFF9F0" stroke="#1b2d45" strokeWidth="2" />
              <path d="M51 22 V40" stroke="#FF7A5C" strokeWidth="3" />
            </svg>
          </motion.button>
        ))}
      </div>

      {/* at night, a friend's isle drifts over and a little bridge appears */}
      <motion.div className="absolute bottom-[60px] right-[3%] z-10 w-[34%] max-w-[200px]" style={{ x: friendX }} aria-hidden>
        <div className="mx-auto w-[56%]"><FriendCoco /></div>
        <svg viewBox="0 0 160 30" className="-mt-1 w-full"><ellipse cx="80" cy="14" rx="76" ry="12" fill="#F3DDB8" stroke="#1b2d45" strokeWidth="2.5" /></svg>
      </motion.div>
      <motion.div className="absolute bottom-[78px] left-[58%] z-10 flex gap-[3px]" style={{ opacity: bridge, scaleX: bridge, originX: 0 }} aria-hidden>
        {[...Array(8)].map((_, i) => <span key={i} className="h-3 w-[9px] rounded-[2px] border border-charcoal bg-[#C98D5B]" />)}
      </motion.div>
    </motion.div>
  );
}

/** The other coconut, a little shy. */
function FriendCoco() {
  return <Coco mood="calm" size={90} className="h-auto w-full" bob={false} />;
}
