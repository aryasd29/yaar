"use client";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import clsx from "clsx";

/** A small "Plus" tag. */
export function PlusTag({ className }: { className?: string }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded-full bg-[linear-gradient(90deg,#FFC94D,#FF9C84)] px-2 py-0.5 text-[11px] font-extrabold text-charcoal", className)}><Sparkles size={11} /> Plus</span>;
}

/** Where a Plus feature would be: says what it does and links to the Plus page. Never blocks anything that's free. */
export function PlusLock({ title, body, className, compact }: { title: string; body: string; className?: string; compact?: boolean }) {
  return (
    <Link href="/plus" className={clsx("group flex items-start gap-3 rounded-[20px] border-2 border-dashed border-charcoal/30 bg-paper/80 p-3.5 transition hover:border-charcoal/60", className)}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(135deg,#FFC94D,#FF9C84)]"><Sparkles size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-semibold">{title}<PlusTag /></span>
        {!compact && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{body}</span>}
      </span>
      <span className="self-center text-[13px] font-bold text-coral-ink group-hover:underline">See Plus</span>
    </Link>
  );
}
