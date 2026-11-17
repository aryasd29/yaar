"use client";
import { LIVE, isSample } from "@/lib/remote";
import clsx from "clsx";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, FlaskConical, X } from "lucide-react";
import { ReactNode, useEffect, useRef } from "react";
import { Coco, CocoMood } from "./Coco";

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";

const btnBase =
  "inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-[var(--radius-btn)] font-display font-extrabold text-[15.5px] tracking-[-0.005em] transition-all duration-150 select-none border-2 border-charcoal disabled:opacity-50 disabled:shadow-none disabled:translate-y-0";
/* Chunky, pressable buttons: a solid "ink" ledge underneath that disappears when pressed. */
const btnVariants: Record<BtnVariant, string> = {
  primary: "bg-coral text-charcoal shadow-[0_4px_0_0_#1b2d45] hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_0_#1b2d45]",
  secondary: "bg-paper text-charcoal shadow-[0_4px_0_0_#1b2d45] hover:bg-white active:translate-y-[3px] active:shadow-[0_1px_0_0_#1b2d45]",
  ghost: "border-transparent text-charcoal hover:bg-charcoal/5 active:scale-[0.97] font-semibold",
  danger: "bg-paper text-danger border-danger shadow-[0_4px_0_0_#C4382A] active:translate-y-[3px] active:shadow-[0_1px_0_0_#C4382A]",
  soft: "bg-peri text-charcoal shadow-[0_4px_0_0_#1b2d45] active:translate-y-[3px] active:shadow-[0_1px_0_0_#1b2d45]",
};

export function Button({
  variant = "primary", className, children, href, full, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; href?: string; full?: boolean }) {
  const cls = clsx(btnBase, btnVariants[variant], full && "w-full", className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} {...props}>{children}</button>;
}

export function Card({ className, children, tone = "paper", ...props }: React.HTMLAttributes<HTMLDivElement> & { tone?: "paper" | "coral" | "butter" | "sage" | "peri" }) {
  const tones = { paper: "bg-paper", coral: "bg-coral-soft", butter: "bg-butter-soft", sage: "bg-sage-soft", peri: "bg-peri-soft" };
  return <div className={clsx("rounded-[var(--radius-card)] shadow-soft p-4", tones[tone], className)} {...props}>{children}</div>;
}

export function Chip({ children, active, onClick, className, tone }: { children: ReactNode; active?: boolean; onClick?: () => void; className?: string; tone?: "butter" | "sage" | "peri" | "coral" }) {
  const toneCls = tone ? { butter: "bg-butter-soft text-butter-ink", sage: "bg-sage-soft text-sage-ink", peri: "bg-peri-soft text-peri-ink", coral: "bg-coral-soft text-coral-ink" }[tone] : "";
  const cls = clsx(
    "inline-flex items-center gap-1.5 rounded-full px-3.5 min-h-9 text-[13.5px] font-medium transition whitespace-nowrap",
    active ? "bg-charcoal text-paper border-2 border-charcoal" : toneCls || "bg-paper border-2 border-line text-charcoal hover:border-charcoal/40",
    onClick && "active:scale-95 cursor-pointer",
    className,
  );
  return onClick ? <button type="button" onClick={onClick} className={cls} aria-pressed={active}>{children}</button> : <span className={cls}>{children}</span>;
}

export function Badge({ children, tone = "sage", className }: { children: ReactNode; tone?: "sage" | "peri" | "butter" | "coral"; className?: string }) {
  const t = { sage: "bg-sage-soft text-sage-ink", peri: "bg-peri-soft text-peri-ink", butter: "bg-butter-soft text-butter-ink", coral: "bg-coral-soft text-coral-ink" }[tone];
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold", t, className)}>{children}</span>;
}

export function Input({ label, hint, error, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-semibold text-charcoal">{label}</span>}
      <input
        className={clsx(
          "w-full min-h-12 rounded-[var(--radius-input)] border-2 bg-paper px-4 text-[16px] outline-none transition placeholder:text-muted/70",
          error ? "border-danger" : "border-line focus:border-coral",
          className,
        )}
        aria-invalid={!!error}
        {...props}
      />
      {error ? <span className="mt-1 block text-[13px] text-danger" role="alert">{error}</span> : hint ? <span className="mt-1 block text-[12.5px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextArea({ label, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>}
      <textarea className={clsx("w-full rounded-[var(--radius-input)] border-2 border-line bg-paper px-4 py-3 text-[16px] outline-none focus:border-coral", className)} {...props} />
    </label>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 py-2 text-left">
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {description && <span className="block text-[13px] text-muted">{description}</span>}
      </span>
      <span className={clsx("relative h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-sage-ink" : "bg-line")}>
        <span className={clsx("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

export function TopBar({ title, back, right, sub }: { title?: ReactNode; back?: string | (() => void); right?: ReactNode; sub?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center gap-2 bg-vanilla/90 px-3 backdrop-blur">
      {back && (typeof back === "string" ? (
        <Link href={back} aria-label="Back" className="grid h-11 w-11 place-items-center rounded-full hover:bg-charcoal/5"><ChevronLeft size={24} /></Link>
      ) : (
        <button onClick={back} aria-label="Back" className="grid h-11 w-11 place-items-center rounded-full hover:bg-charcoal/5"><ChevronLeft size={24} /></button>
      ))}
      <div className="min-w-0 flex-1">
        {title && <h1 className="truncate text-[19px]">{title}</h1>}
        {sub && <div className="truncate text-[12.5px] text-muted">{sub}</div>}
      </div>
      {right}
    </header>
  );
}

export function EmptyState({ mood = "curious", title, body, action }: { mood?: CocoMood; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-10 text-center">
      <Coco mood={mood} size={110} />
      <h2 className="mt-4 text-[20px]">{title}</h2>
      {body && <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PrototypeTag({ children = "Prototype", className }: { children?: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full border border-dashed border-peri-ink/50 bg-peri-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-peri-ink", className)}>
      <FlaskConical size={12} /> {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-2xl bg-charcoal/[0.07]", className)} />;
}

/** Bottom sheet modal with focus on content, closes on backdrop or Escape. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    if (!open) return;
    // Move focus into the sheet, keep Tab inside it, and give focus back when it closes.
    const before = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const first = box.current?.querySelector<HTMLElement>("input, textarea, select, button:not([aria-label='Close']), a[href]");
      (first ?? box.current)?.focus();
    }, 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && box.current) {
        const els = [...box.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex='-1'])")];
        if (!els.length) return;
        const a = els[0], z = els[els.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); before?.focus?.(); };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-6">
          <motion.div className="absolute inset-0 bg-charcoal/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}
            className="relative max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] outline-none bg-paper px-5 pb-8 pt-3 shadow-lift lg:max-w-[500px] lg:rounded-[28px] lg:pb-6"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-line lg:hidden" />
            <div className="mb-3 flex items-center justify-between gap-3">
              {title && <h2 className="text-[19px]">{title}</h2>}
              <button onClick={onClose} aria-label="Close" className="ml-auto grid h-10 w-10 place-items-center rounded-full hover:bg-charcoal/5"><X size={20} /></button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2.5 inline-flex flex-col">
      <span className="font-display text-[15px] font-extrabold text-charcoal">{children}</span>
      <svg viewBox="0 0 80 6" className="-mt-0.5 h-1.5 w-14" aria-hidden><path d="M1 4 Q10 0 20 3 T40 3 T60 3 T79 2" fill="none" stroke="#FF7A5C" strokeWidth="2.5" strokeLinecap="round" /></svg>
    </div>
  );
}

/** Die-cut sticker: white outline, slight tilt. Used for starter packs and little flourishes. */
export function Sticker({ children, tone = "butter", tilt = 0, className }: { children: ReactNode; tone?: "butter" | "sage" | "peri" | "coral" | "paper"; tilt?: number; className?: string }) {
  const bg = { butter: "bg-butter", sage: "bg-sage", peri: "bg-peri", coral: "bg-coral", paper: "bg-paper" }[tone];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border-[3px] border-white px-3.5 py-1.5 text-[14px] font-bold text-charcoal shadow-[0_3px_8px_-2px_rgb(27_45_69/0.35)]", bg, className)} style={{ transform: `rotate(${tilt}deg)` }}>
      {children}
    </span>
  );
}

/** In live mode, marks the built-in sample people so nobody mistakes them for real members. */
export function SampleBadge({ id, className }: { id: string; className?: string }) {
  if (!LIVE || !isSample(id)) return null;
  return <span title="A sample profile that ships with Isle, not a real member" className={clsx("inline-flex shrink-0 items-center rounded-full border border-dashed border-charcoal/40 px-2 py-0.5 text-[11px] font-semibold text-muted", className)}>Sample profile</span>;
}
