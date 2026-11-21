"use client";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Users } from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { PageHeader } from "@/components/PageHeader";
import { Loading, useRequireMe } from "@/components/Shell";
import { Scene } from "@/components/Scene";
import { Card, PrototypeTag, SectionLabel } from "@/components/ui";
import { Coco } from "@/components/Coco";
import { useYaar } from "@/lib/store";
import { CIRCLES, tableDate } from "@/lib/seed";
import { useTables } from "@/lib/useTables";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";

const PLANS = [
  { title: "Sunday at Cubbon Park", body: "Morning walk, then breakfast at a darshini nearby.", scene: "plant" },
  { title: "Church Street book crawl", body: "Three secondhand bookstores and a coffee stop.", scene: "books" },
  { title: "Indie gig night", body: "Small venues with local bands, every weekend.", scene: "concert" },
] as const;

export default function Explore() {
  const me = useRequireMe();
  const { joinedCircles, toggleCircle, now, starterPlan } = useYaar();
  const { tables, isGoing, live } = useTables();
  if (!me) return <Loading />;
  const t = now();
  const upcoming = tables.filter((x) => !x.cancelled).sort((a, b) => tableDate(a, t).getTime() - tableDate(b, t).getTime()).slice(0, 6);
  const mine = tables.filter((x) => isGoing(x));
  return (
    <main className="pb-10">
      <PageHeader title="The Mainland" sub="Bengaluru beyond your isle. Make friends first and meet people without the pressure." />
      {!live && <div className="px-5 md:px-8 lg:px-10"><PrototypeTag>Events and circles here are sample data.</PrototypeTag></div>}

      <Link href="/explore/starter" className="mx-5 mt-4 flex items-center gap-3 rounded-[24px] bg-sage-soft p-4 shadow-soft md:mx-8 lg:mx-10 lg:max-w-[640px]">
        <Coco mood="excited" size={64} bob={false} />
        <span className="flex-1"><span className="block font-display text-[18px] text-sage-ink">Your City Starter Pack</span><span className="block text-[13.5px] text-sage-ink/80">{starterPlan.situation ? `${starterPlan.done.length} things ticked off. Pick up where you left off.` : "New here? Answer three questions and get a first-month plan."}</span></span>
        <ArrowRight className="text-sage-ink" size={20} />
      </Link>

      {mine.length > 0 && (
        <section className="mt-6 px-5 md:px-8 lg:px-10">
          <SectionLabel>Your Tables</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{mine.map((x) => <EventCard key={x.id} t={x} now={t} going />)}</div>
        </section>
      )}
      <section className="mt-6">
        <div className="flex items-end justify-between px-5 md:px-8 lg:px-10"><SectionLabel>Tables this week</SectionLabel><Link href="/explore/tables" className="mb-2 min-h-11 content-center text-[13.5px] font-bold text-coral-ink underline-offset-2 hover:underline">{tables.length ? `See all ${tables.length}` : "See Tables"}</Link></div>
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-3 pt-1 md:px-8 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-10">
          {upcoming.map((x) => <EventCard key={x.id} t={x} now={t} going={isGoing(x)} compact />)}
          {upcoming.length === 0 && (
            <div className="flex w-full flex-col items-start gap-3 rounded-[22px] border-2 border-dashed border-charcoal/30 p-5 lg:col-span-3">
              <p className="font-display text-[18px] font-extrabold">No Tables this week yet</p>
              <p className="text-[14px] text-muted">Host one: a walk in Cubbon Park, board games, filter coffee and a book. Small and easy to say yes to.</p>
              <Button href="/explore/tables/new"><Plus size={17} /> Host a Table</Button>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 px-5 md:px-8 lg:px-10">
        <SectionLabel>Interest circles</SectionLabel>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {CIRCLES.map((c) => {
            const on = joinedCircles.includes(c.id);
            return (
              <button key={c.id} onClick={() => toggleCircle(c.id)} aria-pressed={on} className={clsx("flex min-h-24 flex-col items-start rounded-[20px] p-3 text-left shadow-soft transition active:scale-[0.97]", on ? "bg-peri-soft" : "bg-paper")}>
                <span className="text-[24px]" aria-hidden>{c.emoji}</span>
                <span className="mt-1 font-semibold leading-tight">{c.name}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[12px] text-muted"><Users size={12} /> {live ? `${tables.filter((x) => x.circle === c.name && !x.cancelled).length} upcoming` : c.members.toLocaleString("en-IN")} · {on ? "Following" : "Follow"}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12px] text-muted">Following a circle puts its Tables in your City Starter Pack. Joining a Table never signals romantic interest.</p>
      </section>

      <section className="mt-6 px-5 md:px-8 lg:px-10">
        <SectionLabel>Weekend plans and city guides</SectionLabel>
        <div className="space-y-3 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
          {PLANS.map((p) => (
            <Card key={p.title} className="flex items-center gap-3 !p-2.5">
              <Scene k={p.scene} className="h-16 w-16 shrink-0 rounded-[14px]" />
              <span><span className="block font-semibold">{p.title}</span><span className="block text-[13.5px] text-muted">{p.body}</span></span>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
