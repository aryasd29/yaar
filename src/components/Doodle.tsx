/* Hand-drawn doodles used as small accents. Decorative only. */
type Kind = "star" | "squiggle" | "heart" | "sparkle" | "swirl" | "arrow" | "moon" | "dots" | "wave" | "shell" | "palm" | "sun" | "gull";

export function Doodle({ kind, className, color = "#1b2d45", size = 28 }: { kind: Kind; className?: string; color?: string; size?: number }) {
  const common = { fill: "none", stroke: color, strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      {kind === "star" && <path {...common} d="M20 4 L24 15 L36 16 L27 24 L30 36 L20 29 L10 36 L13 24 L4 16 L16 15 Z" />}
      {kind === "squiggle" && <path {...common} d="M3 22 Q8 12 13 22 T23 22 T33 22 T39 20" />}
      {kind === "heart" && <path {...common} d="M20 33 C6 24 4 15 10 10 C14 7 18 9 20 13 C22 9 26 7 30 10 C36 15 34 24 20 33 Z" />}
      {kind === "sparkle" && <path {...common} d="M20 4 V14 M20 26 V36 M4 20 H14 M26 20 H36 M10 10 L14 14 M26 26 L30 30 M30 10 L26 14 M14 26 L10 30" />}
      {kind === "swirl" && <path {...common} d="M20 20 m0 0 a3 3 0 1 1 3 3 a6 6 0 1 1 -6 -6 a9 9 0 1 1 9 9 a12 12 0 1 1 -12 -12" />}
      {kind === "arrow" && <path {...common} d="M4 30 Q14 8 32 12 M26 6 L33 12 L26 18" />}
      {kind === "moon" && <path {...common} fill={color} stroke="none" d="M26 6 A14 14 0 1 0 34 28 A11 11 0 1 1 26 6 Z" />}
      {kind === "wave" && <path {...common} d="M2 24 Q8 16 14 24 T26 24 T38 24 M8 32 Q13 27 18 32 T28 32" />}
      {kind === "shell" && <g {...common}><path d="M20 34 L6 16 Q20 2 34 16 Z" /><path d="M20 34 L14 10 M20 34 L20 7 M20 34 L26 10 M20 34 L10 14 M20 34 L30 14" /></g>}
      {kind === "palm" && <g {...common}><path d="M22 38 Q24 26 20 14" /><path d="M20 14 Q10 6 3 12 M20 14 Q30 5 37 11 M20 14 Q12 14 8 24 M20 14 Q29 15 32 24 M20 14 Q20 6 24 2" /></g>}
      {kind === "sun" && <g {...common}><circle cx="20" cy="20" r="7" /><path d="M20 4 V9 M20 31 V36 M4 20 H9 M31 20 H36 M9 9 L12 12 M28 28 L31 31 M31 9 L28 12 M12 28 L9 31" /></g>}
      {kind === "gull" && <path {...common} d="M4 20 Q12 12 20 20 Q28 12 36 20" />}
      {kind === "dots" && <g fill={color}><circle cx="8" cy="20" r="2.5" /><circle cx="20" cy="20" r="2.5" /><circle cx="32" cy="20" r="2.5" /></g>}
    </svg>
  );
}
