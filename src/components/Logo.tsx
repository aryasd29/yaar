/** The Isle wordmark: lowercase "isle" with a little sun setting over the sea. */
export function Logo({ size = 30, className }: { size?: number; className?: string }) {
  const s = size;
  return (
    <span className={`inline-flex items-end font-display font-extrabold leading-none text-charcoal ${className ?? ""}`} style={{ fontSize: s }} aria-label="Isle">
      <span aria-hidden>isle</span>
      <svg aria-hidden viewBox="0 0 24 24" width={s * 0.62} height={s * 0.62} className="mb-[0.06em] ml-[0.06em]">
        <path d="M3 15 A9 9 0 0 1 21 15 Z" fill="#FFC94D" />
        <path d="M1 17 Q4.5 14.5 8 17 T15 17 T23 17" stroke="#7DB9EC" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M4 21.5 Q7 19.5 10 21.5 T16 21.5 T21 21.5" stroke="#FF7A5C" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}
