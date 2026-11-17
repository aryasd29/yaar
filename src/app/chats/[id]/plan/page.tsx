"use client";
import { isSample, payDeposit } from "@/lib/remote";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { motion } from "motion/react";
import { CalendarCheck, Check, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Frame, Loading, useRequireMe } from "@/components/Shell";
import { Scene } from "@/components/Scene";
import { Badge, Button, Card, Chip, EmptyState, PrototypeTag, SectionLabel, Toggle, TopBar } from "@/components/ui";
import { DateCard, usePlan } from "@/components/DateBits";
import { Coco } from "@/components/Coco";
import { useYaar } from "@/lib/store";
import { DATE_CATALOG, VENUES } from "@/lib/seed";
import { ideaReason } from "@/lib/logic";

export default function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Frame><Planner matchId={id} /></Frame>;
}

const SLOT_TIMES = ["11:00", "16:00", "17:30", "19:00"];

function Planner({ matchId }: { matchId: string }) {
  const me = useRequireMe();
  const router = useRouter();
  const { startPlan, pickIdeas, updatePlan, confirmPlan, matches, now, settings } = useYaar();
  const [planId, setPlanId] = useState<string | null>(null);
  const match = matches.find((m) => m.id === matchId);
  useEffect(() => { if (me && match && match.status === "active" && !planId) setPlanId(startPlan(matchId)); }, [me, match, matchId, planId, startPlan]);
  const { plan, them, idea } = usePlan(planId ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const [noOverlap, setNoOverlap] = useState(false);
  const [custom, setCustom] = useState("");
  const [deposit, setDeposit] = useState(false);
  const [share, setShare] = useState(!!settings.trustedContact);
  const [remind, setRemind] = useState(true);
  const [done, setDone] = useState(false);
  const [paying, setPaying] = useState(false);
  const toast = useYaar((s) => s.toast);

  const days = useMemo(() => {
    const base = new Date(now()); base.setHours(0, 0, 0, 0);
    return [...Array(7)].map((_, i) => new Date(+base + (i + 1) * 86_400_000));
  }, [now]);
  // Simulated availability for the other person (prototype): roughly 60% of slots.
  const real = !isSample(them?.id);
  // Sample people get simulated availability. With a real person, any slot can be proposed; they see it in the plan.
  const theyFree = (d: Date, t: string) => real || ((d.getDate() * 7 + t.length * 3 + Number(t.slice(0, 2))) % 5) < 3;

  useEffect(() => {
    if (plan && ["confirmed", "checkedin", "done"].includes(plan.stage) && !done) router.replace(`/date/${plan.id}`);
  }, [plan, done, router]);

  if (!me) return <Loading />;
  if (!match || match.status !== "active") return <><TopBar back={`/chats/${matchId}`} /><EmptyState title="This match is closed" /></>;
  if (!plan || !them) return <Loading />;

  const stage = plan.stage;
  if (["confirmed", "checkedin", "done"].includes(stage) && !done) return <Loading />;
  const venues = VENUES.filter((v) => v.activity === idea?.activity);
  const step = stage === "pick" ? 1 : stage === "venue" ? 2 : stage === "time" ? 3 : 4;

  return (
    <>
      <TopBar back={`/chats/${matchId}`} title="Date Planner" sub={`with ${them.name} · step ${Math.min(step, 4)} of 4`} />
      <div className="mx-5 flex gap-1.5" aria-hidden>{[1, 2, 3, 4].map((s) => <span key={s} className={clsx("h-1.5 flex-1 rounded-full", s <= step ? "bg-coral" : "bg-line")} />)}</div>

      <main className="px-5 pb-6 pt-5">
        {done ? (
          <section className="flex flex-col items-center pt-4 text-center">
            <motion.div initial={{ scale: 0.4, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12 }} className="grid h-24 w-24 place-items-center rounded-[26px] bg-sage-soft text-sage-ink shadow-soft">
              <CalendarCheck size={48} />
            </motion.div>
            <h1 className="mt-4 text-[28px]">It&apos;s a date!</h1>
            <p className="mt-1 text-muted">Your shared date card is in the chat. {them.name} sees the same card.</p>
            <div className="mt-5 w-full"><DateCard planId={plan.id} /></div>
            <Button full className="mt-5" href={`/date/${plan.id}`}>Open date & safety centre</Button>
          </section>
        ) : stage === "pick" ? (
          <section>
            <h1 className="text-[26px] leading-tight">Which of these would you enjoy?</h1>
            <p className="mt-1 text-[14.5px] text-muted">Pick any you like. {them.name} picks privately too. You&apos;ll only see what you both chose. <Lock size={13} className="inline" /></p>
            <div className="mt-5 space-y-3">
              {plan.ideas.map((d) => {
                const on = picked.includes(d.id);
                return (
                  <button key={d.id} onClick={() => setPicked(on ? picked.filter((x) => x !== d.id) : [...picked, d.id])} aria-pressed={on}
                    className={clsx("flex w-full items-center gap-3 rounded-[22px] border-2 p-3 text-left transition active:scale-[0.98]", on ? "border-coral bg-coral-soft" : "border-line bg-paper")}>
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] bg-vanilla text-[28px]" aria-hidden>{d.emoji}</span>
                    <span className="flex-1">
                      <span className="block font-display text-[17px]">{d.title}</span>
                      <span className="block text-[13.5px] text-muted">{d.blurb}</span>
                      <span className="mt-1 block text-[12.5px] font-semibold text-sage-ink">{ideaReason(d, me, them)}</span>
                    </span>
                    <span className={clsx("grid h-7 w-7 shrink-0 place-items-center rounded-full border-2", on ? "border-coral bg-coral text-charcoal" : "border-line")}>{on && <Check size={16} />}</span>
                  </button>
                );
              })}
            </div>
            {real && plan.picks[me.id]?.length && !plan.picks[them.id]?.length ? (
              <Card tone="peri" className="mt-4">
                <div className="flex gap-3"><Coco mood="calm" size={54} bob={false} /><p className="text-[14px] text-peri-ink">Your picks are saved. When {them.name} picks too, you&apos;ll both see the ideas you have in common. Nobody sees picks that don&apos;t match.</p></div>
              </Card>
            ) : null}
            {noOverlap && !(real && !plan.picks[them.id]?.length) && (
              <Card tone="butter" className="mt-4">
                <div className="flex gap-3"><Coco mood="thinking" size={54} bob={false} /><p className="text-[14px] text-butter-ink">No overlap on these yet, and that&apos;s fine. Your picks stay private. Try different ideas, or suggest your own.</p></div>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => {
                    const rest = DATE_CATALOG.filter((d) => !plan.ideas.some((x) => x.id === d.id)).slice(0, 3);
                    updatePlan(plan.id, { ideas: rest, picks: real ? {} : { [them.id]: [rest[0].id, rest[1].id] } }); setPicked([]); setNoOverlap(false);
                  }}>Show 3 more</Button>
                </div>
                <form className="mt-2 flex gap-2" onSubmit={(e) => {
                  e.preventDefault(); if (!custom.trim()) return;
                  const d = { id: "custom", activity: "coffee", title: custom.trim(), blurb: "Your own idea", tags: [], emoji: "💡" };
                  updatePlan(plan.id, { ideas: [d], chosenIdea: "custom", picks: { [me.id]: ["custom"], [them.id]: ["custom"] }, stage: "venue" }); setNoOverlap(false);
                }}>
                  <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Suggest your own idea" maxLength={40} className="min-h-12 flex-1 rounded-[14px] border-2 border-line bg-paper px-3 text-[15px] outline-none focus:border-coral" aria-label="Your own date idea" />
                  <Button type="submit" variant="secondary">Suggest</Button>
                </form>
              </Card>
            )}
          </section>
        ) : stage === "venue" ? (
          <section>
            <Badge tone="sage"><Sparkles size={12} /> You both picked this</Badge>
            <h1 className="mt-2 text-[26px] leading-tight">{idea?.emoji} {idea?.title}</h1>
            <p className="mt-1 text-[14.5px] text-muted">Pick a public, easy-to-reach place.</p>
            <div className="mt-4 space-y-3">
              {(venues.length ? venues : VENUES.filter((v) => v.activity === "coffee")).map((v) => (
                <button key={v.id} onClick={() => updatePlan(plan.id, { venueId: v.id, stage: "time" })} className="flex w-full gap-3 overflow-hidden rounded-[22px] bg-paper p-2.5 text-left shadow-soft transition active:scale-[0.98]">
                  <Scene k={v.scene} className="h-20 w-20 shrink-0 rounded-[16px]" />
                  <span className="flex-1 py-0.5">
                    <span className="flex items-center gap-2"><span className="font-display text-[16.5px]">{v.name}</span>{v.partner && <Badge tone="peri">Partner</Badge>}</span>
                    <span className="block text-[13.5px] text-muted">{v.area} · {v.price}</span>
                    {v.perk && <span className="mt-0.5 block text-[13px] font-semibold text-sage-ink">{v.perk}</span>}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4"><PrototypeTag>Venues and perks are sample data</PrototypeTag></div>
          </section>
        ) : stage === "time" ? (
          <section>
            <h1 className="text-[26px] leading-tight">When works?</h1>
            <p className="mt-1 text-[14.5px] text-muted">{real ? `Pick a time that suits you. ${them.name} sees it in the plan and can change it.` : <>Times marked <b className="text-sage-ink">both free</b> work for {them.name} too.</>}</p>
            <div className="mt-4 space-y-4">
              {days.map((d) => (
                <div key={+d}>
                  <SectionLabel>{d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {SLOT_TIMES.map((t) => {
                      const iso = new Date(`${d.toISOString().slice(0, 10)}T${t}:00`).toISOString();
                      const both = theyFree(d, t);
                      return (
                        <button key={t} disabled={!both} onClick={() => updatePlan(plan.id, { slot: iso, stage: "review" })}
                          className={clsx("min-h-12 rounded-[14px] border-2 px-3 text-[14px] font-semibold transition", both ? "border-sage bg-sage-soft text-sage-ink active:scale-95" : "border-line bg-paper text-muted/60 line-through")}>
                          {new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}{both && !real && <span className="block text-[10.5px] font-bold">both free</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {!real && <div className="mt-4"><PrototypeTag>Their availability is simulated</PrototypeTag></div>}
          </section>
        ) : (
          <section className="space-y-4">
            <h1 className="text-[26px] leading-tight">Looks good?</h1>
            <DateCard planId={plan.id} />
            <Card>
              <Toggle checked={deposit} onChange={setDeposit} label="Lock it in with ₹99 (optional)" description="Both pay ₹99, held safely. Both show up: full refund. One no-show: the person who came gets both. Neither: both refunded minus a small fee." />
              {deposit && <div className="mt-1 flex items-center gap-2"><PrototypeTag>Test mode: Razorpay test payments only, no real money moves</PrototypeTag></div>}
            </Card>
            <Card>
              <SectionLabel>Date Assurance</SectionLabel>
              <Toggle checked={share} onChange={setShare} label="Share plan with a trusted contact" description={settings.trustedContact ? `${settings.trustedContact.name} gets the place and time` : "Add a contact in Safety settings"} />
              <Toggle checked={remind} onChange={setRemind} label="Check in on me during the date" description="A discreet 'all good?' notification 45 minutes in" />
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted"><ShieldCheck size={14} /> Cancel free up to 24 hours before. Cancelling for safety reasons is never penalised.</p>
            </Card>
          </section>
        )}
      </main>

      {!done && (stage === "pick" || stage === "review") && (
        <div className="sticky bottom-0 z-20 bg-gradient-to-t from-vanilla via-vanilla to-vanilla/0 px-5 pb-6 pt-6">
          {stage === "pick" ? (
            <Button full disabled={!picked.length} onClick={() => { pickIdeas(plan.id, picked); const p = useYaar.getState().plans.find((x) => x.id === plan.id); if (p?.stage === "pick") setNoOverlap(true); }}>
              {picked.length ? `Save my ${picked.length} pick${picked.length > 1 ? "s" : ""}` : "Pick at least one idea"}
            </Button>
          ) : (
            <Button full disabled={paying} onClick={async () => {
              let paidId: string | undefined;
              if (deposit) {
                setPaying(true);
                const r = await payDeposit(plan.id, { name: me.name });
                setPaying(false);
                if (r.status === "cancelled") return;
                if (r.status === "error") return toast(r.error, "warn");
                if (r.status === "paid") paidId = r.paymentId;
              }
              updatePlan(plan.id, { deposit: { ...plan.deposit, [me.id]: deposit }, ...(paidId ? { depositPayment: { ...(plan.depositPayment ?? {}), [me.id]: paidId } } : {}), trustedContact: share ? settings.trustedContact?.name : undefined, checkInReminder: remind });
              confirmPlan(plan.id); setDone(true);
            }}>{paying ? "Opening payment…" : deposit ? "Pay ₹99 and confirm" : "Confirm date"}</Button>
          )}
          {stage === "review" && <button onClick={() => updatePlan(plan.id, { stage: "time" })} className="mt-1 min-h-11 w-full text-[14px] font-semibold text-muted">Change time</button>}
        </div>
      )}
      {!done && (stage === "venue" || stage === "time") && (
        <div className="sticky bottom-0 z-20 px-5 pb-6">
          <Chip onClick={() => updatePlan(plan.id, { stage: stage === "time" ? "venue" : "pick" })} className="mx-auto shadow-soft">← Back a step</Chip>
        </div>
      )}
    </>
  );
}
