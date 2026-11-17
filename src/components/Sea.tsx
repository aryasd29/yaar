"use client";
import clsx from "clsx";

export type SkyPhase = "morning" | "day" | "sunset" | "night";

/** What the sky over the isle looks like at a given time. */
export function skyPhase(d: Date): SkyPhase {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 10) return "morning";
  if (h >= 10 && h < 16.5) return "day";
  if (h >= 16.5 && h < 21) return "sunset";
  return "night";
}

export const SKY: Record<SkyPhase, { top: string; bottom: string; label: string }> = {
  morning: { top: "#BFE6FB", bottom: "#FFE3C4", label: "Good morning" },
  day: { top: "#7DB9EC", bottom: "#BFE3FA", label: "Hello" },
  sunset: { top: "#FFB38A", bottom: "#FF7A5C", label: "Good evening" },
  night: { top: "#0F1E33", bottom: "#24406A", label: "Good night" },
};

/** Endless, drifting waves. Each layer is drawn twice side by side so it loops seamlessly. */
export function Waves({ className, layers = ["#7DB9EC", "#5C9BD6", "#3F7FBF"], height = 60, foam = true }: { className?: string; layers?: string[]; height?: number; foam?: boolean }) {
  return (
    <div className={clsx("pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden", className)} style={{ height }} aria-hidden>
      {layers.map((c, i) => (
        <div key={i} className="wave-drift absolute bottom-0 left-0 flex w-[200%]" style={{ height: height - i * (height / (layers.length + 1)), ["--drift" as string]: `${14 + i * 6}s`, animationDirection: i % 2 ? "reverse" : "normal" }}>
          {[0, 1].map((k) => (
            <svg key={k} viewBox="0 0 400 40" preserveAspectRatio="none" className="h-full w-1/2">
              <path d={`M0 ${12 + i * 3} Q25 ${2 + i * 3} 50 ${12 + i * 3} T100 ${12 + i * 3} T150 ${12 + i * 3} T200 ${12 + i * 3} T250 ${12 + i * 3} T300 ${12 + i * 3} T350 ${12 + i * 3} T400 ${12 + i * 3} V40 H0Z`} fill={c} />
              {foam && i === 0 && <path d={`M0 12 Q25 2 50 12 T100 12 T150 12 T200 12 T250 12 T300 12 T350 12 T400 12`} stroke="#FFF9F0" strokeWidth="2.5" fill="none" opacity=".8" />}
            </svg>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Sun, moon and stars for a phase. Positioned absolutely; put inside a relative container. */
export function SkyBodies({ phase }: { phase: SkyPhase }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {phase === "night" ? (
        <>
          {STARS.map(([x, y, s, t], i) => (
            <span key={i} className="twinkle absolute rounded-full bg-[#FFF4D6]" style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, ["--tw" as string]: `${t}s` }} />
          ))}
          <svg viewBox="0 0 40 40" className="absolute left-[50%] top-[10%] h-14 w-14 drop-shadow-[0_0_16px_rgba(255,244,214,0.55)]"><path d="M26 5 A15 15 0 1 0 35 29 A11.5 11.5 0 1 1 26 5 Z" fill="#FFF4D6" /></svg>
        </>
      ) : phase === "sunset" ? (
        <span className="absolute bottom-6 right-[16%] h-24 w-24 rounded-full bg-[#FFC94D] shadow-[0_0_60px_20px_rgba(255,201,77,0.45)]" />
      ) : phase === "morning" ? (
        <span className="absolute bottom-10 left-[38%] h-16 w-16 rounded-full bg-[#FFC94D] shadow-[0_0_50px_14px_rgba(255,201,77,0.5)]" />
      ) : (
        <span className="absolute right-[30%] top-[10%] h-14 w-14 rounded-full bg-[#FFD966] shadow-[0_0_50px_16px_rgba(255,217,102,0.55)]" />
      )}
    </div>
  );
}

const STARS: [number, number, number, number][] = [
  [8, 18, 3, 2.6], [16, 40, 2, 3.4], [24, 12, 2.5, 2.2], [33, 30, 2, 3.8], [42, 16, 3, 2.9], [51, 38, 2, 3.1],
  [58, 10, 2.5, 2.4], [66, 28, 2, 3.6], [72, 46, 2, 2.8], [88, 34, 3, 3.3], [94, 14, 2, 2.5], [4, 52, 2, 3.9],
];
