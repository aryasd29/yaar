"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { motion } from "motion/react";
import { CalendarHeart, Check, Coffee, EyeOff, Filter, Hourglass, MessageCircleHeart, RotateCcw, Snowflake, Sparkles, Ticket, Waves as WavesIcon } from "lucide-react";
import { Frame, Loading, useRequireMe } from "@/components/Shell";
import { Button, Card, TopBar } from "@/components/ui";
import { Coco } from "@/components/Coco";
import { PlusTag } from "@/components/PlusBits";
import { Waves } from "@/components/Sea";
import { useYaar } from "@/lib/store";
import { pay } from "@/lib/pay";
import { FREE_SEAT_MAX, FREEZE_DAYS, PLANS, freeSeatAvailable, isPlus } from "@/lib/plus";
import type { PlusPlan } from "@/lib/types";

const GROUPS = [
  { title: "Pays for itself", tone: "bg-sage-soft text-sage-ink", items: [
    { icon: <Ticket size={18} />, name: "A free Tables seat every month", body: `Any Table up to ₹${FREE_SEAT_MAX}. One seat already covers your month.` },
    { icon: <Coffee size={18} />, name: "15% off dates at partner cafés", body: "Applied when you plan a date through Isle, and on the coffee-and-dessert bundle." },
  ] },
  { title: "Never lose the moment", tone: "bg-butter-soft text-butter-ink", items: [
    { icon: <Sparkles size={18} />, name: "Spark again", body: "Reopen a match that closed after 15 quiet days. Once per match." },
    { icon: <Snowflake size={18} />, name: "Freeze my matches", body: `Exams, travel, a crazy month? Nothing closes for ${FREEZE_DAYS} days.` },
    { icon: <RotateCcw size={18} />, name: "Rewind", body: "Bring back someone you passed on by mistake." },
  ] },
  { title: "Better introductions", tone: "bg-peri-soft text-peri-ink", items: [
    { icon: <Filter size={18} />, name: "Lifestyle filters", body: "Food habits, drinking, smoking and languages. Only changes who you see." },
    { icon: <WavesIcon size={18} />, name: "Second Tide", body: "Two or three more people at 10 PM, on top of your evening Tide." },
    { icon: <MessageCircleHeart size={18} />, name: "Why you two?", body: "See exactly why Isle introduced you, with openers to use." },
  ] },
  { title: "Privacy and confidence", tone: "bg-coral-soft text-coral-ink", items: [
    { icon: <EyeOff size={18} />, name: "Incognito", body: "Only people you've reacted to can see your scrapbook." },
    { icon: <Hourglass size={18} />, name: "Coco's scrapbook review", body: "Honest tips on your photos, captions and hot take, plus your best cover photo." },
  ] },
];

export default function PlusPage() {
  return <Frame nav width="medium"><Plus /></Frame>;
}

function Plus() {
  const me = useRequireMe();
  const router = useRouter();
  const { plus, activatePlus, cancelPlus, resumePlus, freezeMatches, unfreezeMatches, now, toast } = useYaar();
  const [plan, setPlan] = useState<PlusPlan>(plus ? "monthly" : "intro");
  const [busy, setBusy] = useState(false);
  if (!me) return <Loading />;
  const t = now();
  const active = isPlus(plus, t);
  const fmt = (ms: number) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const plans = (plus ? (["monthly", "quarterly"] as PlusPlan[]) : (["intro", "monthly", "quarterly"] as PlusPlan[]));

  const buy = async () => {
    setBusy(true);
    const r = await pay([{ kind: "plus", plan }], { name: me.name }, `Isle Plus · ${PLANS[plan].label}`, [`Isle Plus, ${PLANS[plan].label.toLowerCase()} · ₹${PLANS[plan].price}`, PLANS[plan].note]);
    setBusy(false);
    if (r.status === "error") return toast(r.error, "warn");
    if (r.status !== "paid") return;
    activatePlus(plan, r.paymentId);
    toast("Welcome to Isle Plus! Your free Tables seat is ready.", "good");
  };

  return (
    <main className="pb-14">
      <TopBar back={() => router.back()} title="Isle Plus" />
      {/* hero */}
      <section className="relative mx-5 overflow-hidden rounded-[30px] border-2 border-charcoal bg-[linear-gradient(180deg,#FFD3A8_0%,#FFA27F_65%,#FF8F6B_100%)] p-6 pb-24 md:mx-8 md:p-8 md:pb-28">
        <span className="absolute right-[10%] top-6 h-20 w-20 rounded-full bg-[#FFC94D] shadow-[0_0_50px_16px_rgba(255,201,77,0.45)]" aria-hidden />
        <Waves height={70} />
        <div className="absolute bottom-5 right-6 md:right-10"><Coco mood={active ? "celebrating" : "cool"} size={110} /></div>
        <PlusTag className="!text-[12.5px]" />
        <h1 className="mt-3 max-w-[460px] text-[32px] leading-[1.05] md:text-[42px]">{active ? `You're on Plus, ${me.name}` : "More dates, less waiting."}</h1>
        <p className="mt-2 max-w-[440px] text-[15.5px] text-charcoal/85">{active ? `${plus!.autoRenew ? "Renews" : "Ends"} on ${fmt(plus!.until)}.` : "A free Tables seat every month and 15% off café dates mean Plus pays for itself if you go out once."}</p>
      </section>

      {active && (
        <section className="mx-5 mt-5 grid gap-3 md:mx-8 md:grid-cols-2">
          <Card tone="sage" className="!p-4">
            <p className="font-semibold">This month&apos;s free Tables seat</p>
            <p className="text-[13.5px] text-sage-ink/80">{freeSeatAvailable(plus, t) ? `Ready to use on any Table up to ₹${FREE_SEAT_MAX}.` : "Used this month. A new one arrives on the 1st."}</p>
            <Button variant="secondary" className="mt-3 !min-h-10" href="/explore/tables">Find a Table</Button>
          </Card>
          <Card tone="peri" className="!p-4">
            <p className="font-semibold">Freeze my matches</p>
            <p className="text-[13.5px] text-peri-ink/80">{plus!.freezeUntil && plus!.freezeUntil > t ? `Frozen until ${fmt(plus!.freezeUntil)}. Nothing closes until then.` : `Going quiet for a while? Keep every match open for ${FREEZE_DAYS} days.`}</p>
            {plus!.freezeUntil && plus!.freezeUntil > t
              ? <Button variant="secondary" className="mt-3 !min-h-10" onClick={() => { unfreezeMatches(); toast("Matches unfrozen.", "info"); }}>Unfreeze</Button>
              : <Button variant="secondary" className="mt-3 !min-h-10" onClick={() => { freezeMatches(); toast(`Matches frozen for ${FREEZE_DAYS} days.`, "good"); }}><Snowflake size={16} /> Freeze for {FREEZE_DAYS} days</Button>}
          </Card>
        </section>
      )}

      {/* what you get */}
      <section className="mx-5 mt-6 grid gap-4 md:mx-8 md:grid-cols-2" aria-label="What you get">
        {GROUPS.map((g) => (
          <div key={g.title} className="rounded-[24px] bg-paper p-4 shadow-soft">
            <p className={clsx("inline-block rounded-full px-2.5 py-0.5 text-[12.5px] font-bold", g.tone)}>{g.title}</p>
            <ul className="mt-3 space-y-3">
              {g.items.map((it) => (
                <li key={it.name} className="flex gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-vanilla">{it.icon}</span>
                  <span><span className="block font-semibold leading-tight">{it.name}</span><span className="block text-[13.5px] leading-snug text-muted">{it.body}</span></span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <p className="mx-5 mt-4 rounded-[18px] bg-sage-soft px-4 py-3 text-[13.5px] text-sage-ink md:mx-8"><b>Always free for everyone:</b> matching, chat, reactions, the date planner, the show-up promise and every safety tool. Plus never shows you to more people or ranks you higher.</p>

      {/* plans */}
      <section className="mx-5 mt-6 md:mx-8" aria-labelledby="plans">
        <h2 id="plans" className="text-[22px]">{active ? "Extend your membership" : "Choose a plan"}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Plans">
          {plans.map((k) => {
            const p = PLANS[k];
            return (
              <button key={k} role="radio" aria-checked={plan === k} onClick={() => setPlan(k)}
                className={clsx("relative rounded-[22px] border-2 p-4 text-left transition", plan === k ? "border-charcoal bg-paper shadow-[0_4px_0_0_#1b2d45]" : "border-line bg-paper/60 hover:border-charcoal/40")}>
                {k === "intro" && <span className="absolute -top-3 left-4 rounded-full border-2 border-charcoal bg-butter px-2 py-0.5 text-[11.5px] font-bold">Try it</span>}
                {k === "quarterly" && <span className="absolute -top-3 left-4 rounded-full border-2 border-charcoal bg-sage px-2 py-0.5 text-[11.5px] font-bold">Best value</span>}
                <span className="block font-semibold">{p.label}</span>
                <span className="block font-display text-[30px] font-extrabold">₹{p.price}</span>
                <span className="block text-[13px] text-muted">{p.note}</span>
                {plan === k && <Check size={18} className="absolute right-4 top-4" />}
              </button>
            );
          })}
        </div>
        <motion.div layout className="mt-4">
          <Button full onClick={buy} disabled={busy}>{busy ? "Opening checkout…" : active ? `Add ${PLANS[plan].label.toLowerCase()} · ₹${PLANS[plan].price}` : `Get Isle Plus · ₹${PLANS[plan].price}`}</Button>
          <p className="mt-2 text-center text-[12.5px] text-muted">Test mode: no real money moves. Cancel anytime; Plus stays on until the end of what you&apos;ve paid for.</p>
        </motion.div>
        {active && (
          <p className="mt-4 text-center text-[13.5px]">
            {plus!.autoRenew
              ? <button className="min-h-11 font-semibold text-muted underline underline-offset-2" onClick={() => { cancelPlus(); toast(`Auto-renew is off. Plus stays on until ${fmt(plus!.until)}.`, "info"); }}>Cancel auto-renew</button>
              : <button className="min-h-11 font-semibold underline underline-offset-2" onClick={() => { resumePlus(); toast("Auto-renew is back on.", "good"); }}>Turn auto-renew back on</button>}
          </p>
        )}
      </section>
      <div className="mx-5 mt-8 flex items-center gap-2 text-[13px] text-muted md:mx-8"><CalendarHeart size={16} /> Plus members go on more dates, which is the only number Isle cares about.</div>
    </main>
  );
}
