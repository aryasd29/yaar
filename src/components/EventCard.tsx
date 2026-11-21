"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { MapPin, Users } from "lucide-react";
import { Scene } from "./Scene";
import { Badge } from "./ui";
import { fmtPrice, fmtTableWhen, tableDate } from "@/lib/seed";
import type { TableEvent } from "@/lib/types";

type Photo = { url: string | null; alt?: string; credit?: string; link?: string };
const cache = new Map<string, Promise<Photo>>();
const getPhoto = (q: string) => {
  if (!cache.has(q)) cache.set(q, fetch(`/api/photos?q=${encodeURIComponent(q)}`).then((r) => r.json()).catch(() => ({ url: null })));
  return cache.get(q)!;
};

/** A real photo when one is available, otherwise the illustration. Always the same shape, so cards line up. */
export function EventImage({ t, className, credit = false }: { t: TableEvent; className?: string; credit?: boolean }) {
  const [p, setP] = useState<Photo | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { let on = true; getPhoto(t.photoQuery).then((x) => on && setP(x)); return () => { on = false; }; }, [t.photoQuery]);
  return (
    <div className={clsx("relative overflow-hidden bg-vanilla", className)}>
      <Scene k={t.scene} className="absolute inset-0 h-full w-full" />
      {p?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.url} alt={p.alt ?? ""} onLoad={() => setLoaded(true)} className={clsx("absolute inset-0 h-full w-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")} />
      )}
      {credit && p?.url && p.credit && (
        <a href={p.link} target="_blank" rel="noreferrer" className="absolute bottom-1.5 right-1.5 rounded-full bg-charcoal/70 px-2 py-0.5 text-[10.5px] text-paper">Photo: {p.credit} / Unsplash</a>
      )}
    </div>
  );
}

export function EventCard({ t, now, going, compact = false }: { t: TableEvent; now: number; going: boolean; compact?: boolean }) {
  const full = t.left === 0 && !going;
  const left = t.live || !going ? t.left : Math.max(0, t.left - 1);
  return (
    <Link href={`/explore/tables/${t.id}`} className={clsx("group flex flex-col overflow-hidden rounded-[22px] border-2 border-charcoal bg-paper shadow-[0_4px_0_0_#1b2d45] transition hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-[0_1px_0_0_#1b2d45]", compact && "w-[240px] shrink-0 lg:w-auto")}>
      <div className="relative">
        <EventImage t={t} className="aspect-[4/3] w-full" />
        <span className="absolute left-2 top-2 rounded-full border-2 border-charcoal bg-butter px-2 py-0.5 text-[11.5px] font-bold">{fmtPrice(t.price)}</span>
        {t.cancelled ? <span className="absolute right-2 top-2 rounded-full border-2 border-charcoal bg-coral-soft px-2 py-0.5 text-[11.5px] font-bold">Cancelled</span>
          : t.hosting ? <span className="absolute right-2 top-2 rounded-full border-2 border-charcoal bg-peri px-2 py-0.5 text-[11.5px] font-bold">You&apos;re hosting</span>
          : going && <span className="absolute right-2 top-2 rounded-full border-2 border-charcoal bg-sage px-2 py-0.5 text-[11.5px] font-bold">You&apos;re going</span>}
        {full && <span className="absolute right-2 top-2 rounded-full border-2 border-charcoal bg-paper px-2 py-0.5 text-[11.5px] font-bold">Full</span>}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <span className="text-[12.5px] font-semibold text-coral-ink">{fmtTableWhen(tableDate(t, now))}</span>
        <span className="mt-0.5 line-clamp-2 font-display text-[16.5px] font-extrabold leading-tight">{t.title}</span>
        <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1"><MapPin size={12} /> {t.area}</span>
          <span className="inline-flex items-center gap-1"><Users size={12} /> {full ? "No seats left" : `${left} of ${t.seats} left`}</span>
        </span>
        {t.live ? (t.hostName && <span className="mt-1.5 text-[12px] text-muted">Hosted by {t.hosting ? "you" : t.hostName}</span>) : <span className="mt-2"><Badge tone="peri">Sample event</Badge></span>}
      </div>
    </Link>
  );
}
