"use client";
import Link from "next/link";
import clsx from "clsx";
import { Check, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { Frame } from "@/components/Shell";
import { EventImage } from "@/components/EventCard";
import { Button, Chip, PrototypeTag, SectionLabel, TopBar } from "@/components/ui";
import { Coco } from "@/components/Coco";
import { useYaar } from "@/lib/store";
import { CIRCLES, TABLE_AREAS, fmtPrice, fmtTableWhen, tableDate } from "@/lib/seed";
import { useTables } from "@/lib/useTables";

const SITUATIONS = [
  { id: "new", label: "Just moved here", note: "Easy, low-pressure first steps." },
  { id: "work", label: "Moved for work a few months ago", note: "Weeknight plans near work." },
  { id: "while", label: "Been here a while, want new people", note: "Something a bit different." },
  { id: "explore", label: "Just exploring", note: "A mix of everything." },
];

const TIPS: Record<string, string[]> = {
  new: ["Get a Namma Metro card, it's the easiest way across town at rush hour.", "Carry a light jacket. Bengaluru evenings surprise everyone in their first month."],
  work: ["Weeknight Tables near your office make it easy to show up after work.", "Book autos through an app at peak hours to avoid haggling."],
  while: ["Try an area you've never had a reason to visit, like Basavanagudi on a Sunday morning.", "Circles are the easiest way to find people with your exact niche."],
  explore: ["Cubbon Park is car-free on Sunday mornings.", "Darshinis are the fastest, cheapest breakfast in the city."],
};

export default function Starter() {
  const { joinedCircles, toggleCircle, starterPlan: sp, setStarter, now } = useYaar();
  const { tables: allTables, live } = useTables();
  const t = now();
  const step = !sp.situation ? 0 : sp.interests.length === 0 ? 1 : !sp.area ? 2 : 3;
  const toggleInterest = (c: string) => setStarter({ interests: sp.interests.includes(c) ? sp.interests.filter((x) => x !== c) : [...sp.interests, c] });

  // Build the plan from your answers: Tables that match your interests (nearby first), circles to join, and local tips.
  const tables = allTables
    .filter((x) => x.left > 0 && !x.cancelled && (sp.interests.includes(x.circle) || (sp.situation === "new" && x.circle === "New to Bengaluru")))
    .sort((a, b) => Number(b.area === sp.area) - Number(a.area === sp.area) || a.price - b.price)
    .slice(0, 3);
  const circles = CIRCLES.filter((c) => sp.interests.includes(c.name)).slice(0, 3);
  const tips = TIPS[sp.situation ?? "explore"];
  const items = [
    ...tables.map((x) => ({ id: `t:${x.id}`, label: `Go to "${x.title}"` })),
    ...circles.map((c) => ({ id: `c:${c.id}`, label: `Join the ${c.name} circle` })),
    { id: "profile", label: "Add a voice note to your scrapbook" },
  ];
  const doneCount = items.filter((i) => sp.done.includes(i.id)).length;
  const toggleDone = (id: string) => setStarter({ done: sp.done.includes(id) ? sp.done.filter((x) => x !== id) : [...sp.done, id] });

  const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <section className={clsx("rounded-[24px] border-2 p-4 transition", step === n - 1 ? "border-charcoal bg-paper shadow-[0_4px_0_0_#1b2d45]" : "border-transparent bg-paper/60")}>
      <h2 className="flex items-center gap-2 text-[17px]"><span className={clsx("grid h-7 w-7 place-items-center rounded-full border-2 border-charcoal text-[13px]", step > n - 1 ? "bg-sage" : "bg-butter")}>{step > n - 1 ? <Check size={14} /> : n}</span>{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );

  return (
    <Frame width="medium">
      <TopBar back="/explore" title="City Starter Pack" right={sp.situation ? <button onClick={() => setStarter({ situation: undefined, interests: [], area: undefined, done: [] })} className="flex min-h-11 items-center gap-1 rounded-full px-3 text-[13px] font-semibold hover:bg-charcoal/5"><RotateCcw size={15} /> Start over</button> : undefined} />
      <main className="px-5 pb-12 md:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3"><Coco mood={step === 3 ? "cheering" : "curious"} size={70} /><p className="text-[15px] text-muted">Three quick questions and you get a first-month plan for meeting people in Bengaluru. Your answers stay on this device.</p></div>
          <Step n={1} title="Where are you at?">
            <div className="space-y-2" role="radiogroup" aria-label="Your situation">
              {SITUATIONS.map((x) => (
                <button key={x.id} role="radio" aria-checked={sp.situation === x.id} onClick={() => setStarter({ situation: x.id })} className={clsx("flex min-h-14 w-full items-center justify-between gap-2 rounded-[16px] border-2 px-4 py-2 text-left", sp.situation === x.id ? "border-charcoal bg-sage-soft" : "border-line bg-paper")}>
                  <span><span className="block font-semibold">{x.label}</span><span className="block text-[12.5px] text-muted">{x.note}</span></span>
                  {sp.situation === x.id && <Check size={18} />}
                </button>
              ))}
            </div>
          </Step>
          {step >= 1 && (
            <Step n={2} title="What are you into?">
              <div className="flex flex-wrap gap-2">{CIRCLES.map((c) => <Chip key={c.id} active={sp.interests.includes(c.name)} onClick={() => toggleInterest(c.name)}>{c.emoji} {c.name}</Chip>)}</div>
            </Step>
          )}
          {step >= 2 && (
            <Step n={3} title="Which area is easiest for you?">
              <div className="flex flex-wrap gap-2">{TABLE_AREAS.map((a) => <Chip key={a} active={sp.area === a} onClick={() => setStarter({ area: a })}>{a}</Chip>)}</div>
            </Step>
          )}
        </div>

        <div className="mt-6 lg:sticky lg:top-6 lg:mt-0">
          {step < 3 ? (
            <div className="rounded-[24px] border-2 border-dashed border-charcoal/25 p-6 text-center text-[14.5px] text-muted">Your plan appears here once you&apos;ve answered.</div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 rounded-[26px] bg-sage-soft p-4">
              <div>
                <p className="font-display text-[20px] font-extrabold text-sage-ink">Your first month</p>
                <div className="mt-2 flex items-center gap-2"><div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-charcoal bg-paper"><div className="h-full bg-sage transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} /></div><span className="text-[13px] font-bold">{doneCount}/{items.length}</span></div>
              </div>
              <section>
                <SectionLabel>Tables to try</SectionLabel>
                {tables.length === 0 ? <p className="text-[14px] text-muted">No open Tables match yet. <Link href="/explore/tables" className="font-semibold underline">Browse all</Link></p> : (
                  <div className="space-y-2">{tables.map((x) => (
                    <Link key={x.id} href={`/explore/tables/${x.id}`} className="flex items-center gap-3 rounded-[18px] bg-paper p-2 shadow-soft">
                      <EventImage t={x} className="aspect-[4/3] w-20 shrink-0 rounded-[12px]" />
                      <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{x.title}</span><span className="block text-[12.5px] text-muted">{fmtTableWhen(tableDate(x, t))}, {x.area}, {fmtPrice(x.price)}</span></span>
                    </Link>))}</div>
                )}
              </section>
              {circles.length > 0 && (
                <section>
                  <SectionLabel>Circles for you</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">{circles.map((c) => { const on = joinedCircles.includes(c.id); return (
                    <button key={c.id} onClick={() => toggleCircle(c.id)} aria-pressed={on} className={clsx("rounded-[16px] border-2 p-3 text-left", on ? "border-charcoal bg-peri-soft" : "border-transparent bg-paper")}>
                      <span className="text-[22px]" aria-hidden>{c.emoji}</span><span className="block font-semibold">{c.name}</span><span className="text-[12px] text-muted">{on ? "Joined" : "Tap to join"}</span>
                    </button>); })}</div>
                </section>
              )}
              <section>
                <SectionLabel>Checklist</SectionLabel>
                <ul className="space-y-1.5">{items.map((i) => { const d = sp.done.includes(i.id); return (
                  <li key={i.id}><button onClick={() => toggleDone(i.id)} aria-pressed={d} className="flex min-h-11 w-full items-center gap-3 rounded-[14px] bg-paper px-3 text-left text-[14.5px]">
                    <span className={clsx("grid h-6 w-6 shrink-0 place-items-center rounded-[7px] border-2 border-charcoal", d && "bg-sage")}>{d && <Check size={14} />}</span>
                    <span className={clsx(d && "text-muted line-through")}>{i.label}</span>
                  </button></li>); })}</ul>
              </section>
              <section>
                <SectionLabel>Local tips</SectionLabel>
                <ul className="space-y-1.5 text-[14px]">{tips.map((x) => <li key={x} className="rounded-[14px] bg-paper px-3 py-2">{x}</li>)}</ul>
              </section>
              {doneCount === items.length && <p className="text-center font-hand text-[24px] text-sage-ink">you&apos;re basically a local now ✨</p>}
              <Button full variant="secondary" href="/explore">Back to Explore</Button>
              {!live && <PrototypeTag>Suggestions use sample events</PrototypeTag>}
            </motion.div>
          )}
        </div>
      </main>
    </Frame>
  );
}
