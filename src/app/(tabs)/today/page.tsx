"use client";
import { SKY, SkyBodies, Waves, skyPhase } from "@/components/Sea";
import { NotificationBell } from "@/components/PageHeader";
import { useCallback, useEffect, useState } from "react";
import { TideArrival } from "@/components/TideArrival";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Loading, useRequireMe } from "@/components/Shell";
import { Button, EmptyState, Sticker } from "@/components/ui";
import { Coco } from "@/components/Coco";
import { Doodle } from "@/components/Doodle";
import { Bottle, type BottleTone } from "@/components/Bottle";
import { BatterySheet } from "@/components/BatterySheet";
import { DemoClock } from "@/components/DemoClock";
import { useYaar } from "@/lib/store";
import { sharedGround } from "@/lib/logic";
import { BATTERY, type Battery } from "@/lib/types";
import { nextYaarHour, yaarHourLabel } from "@/lib/config";

const TONES: BottleTone[] = ["coral", "butter", "sage", "peri"];
const TILTS = [-2, 1.5, -1, 2, -1.5, 1];

export default function Today() {
  const me = useRequireMe();
  const router = useRouter();
  const { drop, people, ensureDrop, now, reactions, setBattery: setBatteryLevel } = useYaar();
  const [battery, setBattery] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [tide, setTide] = useState(false);
  const [landed, setLanded] = useState(true);
  useEffect(() => { if (me) ensureDrop(); }, [me, ensureDrop]);
  // The tide rolls in once per drop, the first time you see it.
  const tideKey = drop.day;
  const introCount = drop.ids.length;
  useEffect(() => {
    if (!tideKey || !introCount || me?.battery === "low") return;
    let seen: string | null = null;
    try { seen = localStorage.getItem("isle-tide-seen"); } catch { /* ignore */ }
    if (seen !== tideKey) { setLanded(false); setTide(true); }
  }, [tideKey, introCount, me?.battery]);
  const finishTide = useCallback(() => {
    setTide(false); setLanded(true);
    try { localStorage.setItem("isle-tide-seen", tideKey); } catch { /* ignore */ }
  }, [tideKey]);
  if (!me) return <Loading />;

  const t = new Date(now());
  const phase = skyPhase(new Date(t));
  const night = phase === "night";
  const next = nextYaarHour(+t);
  const hrs = Math.floor((+next - +t) / 3_600_000), mins = Math.floor(((+next - +t) % 3_600_000) / 60_000);
  const intros = drop.ids.map((id) => people.find((p) => p.id === id)!).filter(Boolean);
  const reactedTo = new Set(reactions.filter((r) => r.from === me.id).map((r) => r.to));
  const opened = drop.opened.length;
  const allOpened = intros.length > 0 && opened >= intros.length;
  const nextLabel = `${next.toLocaleDateString("en-IN", { weekday: "long" }) === t.toLocaleDateString("en-IN", { weekday: "long" }) ? "today" : "tomorrow"} at ${yaarHourLabel()}`;
  const countdown = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;

  const open = (id: string) => {
    if (opening) return;
    if (drop.opened.includes(id)) return router.push(`/u/${id}`);
    setOpening(id);
    setTimeout(() => router.push(`/u/${id}`), 900);
  };

  return (
    <main className="pb-10">
      <TideArrival show={tide} count={intros.length} onDone={finishTide} />
      {/* Greeting band */}
      <header className={`relative overflow-hidden rounded-b-[36px] border-b-2 border-charcoal px-5 pb-14 pt-6 transition-colors duration-700 md:px-8 lg:mx-10 lg:mt-6 lg:rounded-[36px] lg:border-2 lg:px-10 lg:pb-16 lg:pt-8 ${night ? "text-paper" : "text-charcoal"}`}
        style={{ background: `linear-gradient(180deg, ${SKY[phase].top} 0%, ${SKY[phase].bottom} 100%)` }} data-sky={phase}>
        <SkyBodies phase={phase} />
        {!night && <><Doodle kind="gull" className="absolute left-[56%] top-8 hidden sm:block" size={22} color="#1b2d45" /><Doodle kind="gull" className="absolute left-[61%] top-5 hidden sm:block" size={16} color="#1b2d45" /></>}
        <Waves height={46} layers={night ? ["#2C5A8F", "#1E4472", "#16345A"] : ["#7DB9EC", "#5C9BD6", "#3F7FBF"]} />
        <div className="relative z-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-hand text-[22px] leading-none opacity-80">{SKY[phase].label}, it&apos;s {t.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 className="mt-1 text-[38px] leading-[1.02] lg:text-[52px]">Hi {me.name}!</h1>
            <p className="mt-1.5 max-w-[260px] text-[15px] font-medium opacity-85 lg:max-w-none">
              {me.battery === "low" ? "You're on a break. No new bottles until you recharge." : allOpened ? `You've opened all ${intros.length} bottles. More wash up ${nextLabel}.` : intros.length ? `${intros.length - opened} of ${intros.length} bottles still corked.` : `No bottles right now. The next tide comes in ${nextLabel}.`}
            </p>
          </div>
          <div className="flex items-start gap-2 self-end sm:self-auto"><BatteryControl level={me.battery} onChange={setBatteryLevel} onMore={() => setBattery(true)} /><NotificationBell className="lg:hidden" /></div>
        </div>
        <div className="absolute bottom-3 right-4 z-[1] lg:right-12"><Coco mood={night ? "calm" : "excited"} size={104} /></div>
      </header>

      <div className="px-5 md:px-8 lg:grid lg:grid-cols-[340px_1fr] lg:items-start lg:gap-10 lg:px-10">
        <aside className="lg:sticky lg:top-6">
          {/* Tide: a sunset over the sea */}
          <section className="relative mt-6 overflow-hidden rounded-[28px] border-2 border-charcoal bg-[linear-gradient(180deg,#FFD3A8_0%,#FFA27F_55%,#FF7A5C_100%)] p-5 pb-16 text-charcoal shadow-[0_5px_0_0_#1b2d45]" aria-labelledby="yh">
            {/* the sun setting into the sea */}
            <svg viewBox="0 0 300 70" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-16 w-full" aria-hidden>
              <circle cx="232" cy="40" r="30" fill="#FFC94D" />
              <path d="M0 40 Q20 32 40 40 T80 40 T120 40 T160 40 T200 40 T240 40 T280 40 T320 40 V70 H0Z" fill="#7DB9EC" />
              <path d="M0 54 Q25 46 50 54 T100 54 T150 54 T200 54 T250 54 T300 54 V70 H0Z" fill="#1b2d45" opacity=".25" />
            </svg>
            <Doodle kind="gull" className="absolute right-6 top-5" size={22} />
            <Doodle kind="gull" className="absolute right-14 top-9" size={15} />
            <span className="font-hand text-[22px] text-charcoal/80">every evening, {yaarHourLabel().toLowerCase()}</span>
            <h2 id="yh" className="text-[28px] leading-none">Tide</h2>
            <p className="mt-2 max-w-[86%] text-[14px] text-charcoal/80">Every evening a few messages in a bottle wash ashore, picked for you. Open them one at a time. No swiping.</p>
            <div className="mt-4 flex gap-1.5" aria-label={`${opened} of ${intros.length} opened`}>
              {intros.map((p) => (drop.opened.includes(p.id)
                ? <BottleIcon key={p.id} open />
                : <BottleIcon key={p.id} />))}
            </div>
            <p className="relative z-10 mt-3 text-[13px] text-charcoal/85">
              {me.battery === "low" ? "The tide is paused while your battery is low." : allOpened ? <>All opened. <b>Next tide in {countdown}</b> ({nextLabel}).</> : <>{intros.length - opened} still corked. <b>Next tide in {countdown}</b>; these stay open until then.</>}
            </p>
          </section>
          <StarterLink className="hidden lg:flex" />
          <div className="hidden lg:block"><DemoClock /></div>
        </aside>

        {me.battery === "low" ? (
          <section className="mt-6 rounded-[28px] border-2 border-charcoal bg-peri p-2">
            <EmptyState mood="calm" title="You're taking a little break" body="No new bottles or reminders while your battery is low. Your chats stay open." action={<Button onClick={() => setBattery(true)}>Recharge</Button>} />
          </section>
        ) : (
          <section className="mt-6" aria-label="Today's bottles">
            {intros.length === 0 ? (
              <div className="rounded-[28px] border-2 border-dashed border-charcoal/30 p-2">
                <EmptyState mood="curious" title="That's everyone for today" body="We'd rather send a few good people than a hundred random ones. Meanwhile, a Table is a low-pressure way to meet people." action={<Button href="/explore" variant="secondary">Explore Tables</Button>} />
              </div>
            ) : (
              <>
                {allOpened ? (
                  <div className="relative z-10 mb-16 flex items-center gap-3 rounded-[24px] border-2 border-charcoal bg-sage p-4 shadow-[0_4px_0_0_#1b2d45]" role="status">
                    <Coco mood="cheering" size={64} bob={false} />
                    <div className="flex-1">
                      <p className="font-display text-[18px] font-extrabold">That&apos;s everyone for today</p>
                      <p className="text-[14px] text-charcoal/80">You&apos;ve opened all {intros.length}. Your next bottles wash up {nextLabel}, in {countdown}. You can still revisit anyone below.</p>
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 font-hand text-[22px] leading-none text-charcoal/70 lg:mb-5">tap a bottle to open it ↓</p>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3" style={allOpened ? { rowGap: "5.5rem" } : undefined}>
                  {intros.map((p, i) => {
                    const g = sharedGround(me, p);
                    const isOpen = drop.opened.includes(p.id);
                    const teaser = g.agree >= 5 ? `${g.agree} picks in common` : `into ${p.starterPack[0]}`;
                    return (
                      <motion.button
                        key={p.id}
                        onClick={() => open(p.id)}
                        aria-label={isOpen ? `Open ${p.name}'s scrapbook` : `Open sealed introduction: ${teaser}`}
                        className="group relative text-left"
                        initial={{ y: 40, opacity: 0, rotate: -12 }} animate={landed ? { y: 0, opacity: 1, rotate: 0 } : { y: 40, opacity: 0, rotate: -12 }} transition={{ delay: i * 0.08, type: "spring", damping: 11, stiffness: 140 }}
                        whileHover={{ y: -4, rotate: TILTS[i % TILTS.length] * -0.6 }} whileTap={{ scale: 0.96 }}
                      >
                        <Bottle p={p} tone={TONES[i % 4]} teaser={teaser} opening={opening === p.id} opened={isOpen} tilt={TILTS[i % TILTS.length]} />
                        <div className="mt-2 flex items-center justify-between gap-1 px-1">
                          <span className="truncate text-[13.5px] font-bold">{isOpen ? `${p.name}, ${p.age}` : "Sealed"}</span>
                          {reactedTo.has(p.id) ? <Sticker tone="coral" tilt={-4} className="!px-2 !py-0.5 !text-[11.5px]">reacted ♥</Sticker> : isOpen ? <span className="text-[12px] text-muted">{p.area}</span> : null}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}
      </div>

      <div className="px-5 md:px-8 lg:hidden">
        <StarterLink className="flex" />
        <DemoClock />
      </div>
      <BatterySheet open={battery} onClose={() => setBattery(false)} />
    </main>
  );
}

function StarterLink({ className }: { className?: string }) {
  return (
    <Link href="/explore/starter" className={clsx("mt-6 items-center gap-3 rounded-[24px] border-2 border-charcoal bg-sage p-4 shadow-[0_4px_0_0_#1b2d45] transition active:translate-y-[3px] active:shadow-[0_1px_0_0_#1b2d45]", className)}>
      <Coco mood="curious" size={52} bob={false} />
      <span className="flex-1"><span className="block font-display text-[17px] font-extrabold">New to Bengaluru?</span><span className="block text-[13.5px] text-charcoal/75">Your City Starter Pack: Tables, circles and weekend plans.</span></span>
      <ArrowRight size={20} />
    </Link>
  );
}

const LEVELS: Battery[] = ["low", "some", "full"];

/** Tap a bar to set your Social Battery right here; "More" explains what each level does. */
function BatteryControl({ level, onChange, onMore }: { level: Battery; onChange: (b: Battery) => void; onMore: () => void }) {
  const idx = LEVELS.indexOf(level);
  return (
    <div className="mt-1 flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1.5 rounded-full border-2 border-charcoal bg-paper py-1 text-charcoal pl-2.5 pr-1 shadow-[0_3px_0_0_#1b2d45]" role="radiogroup" aria-label="Social battery">
        <span className="text-[12px] font-bold">Battery</span>
        {LEVELS.map((l, i) => (
          <button key={l} role="radio" aria-checked={level === l} aria-label={BATTERY[l].label} onClick={() => onChange(l)}
            className={clsx("h-6 w-4 rounded-[5px] border-2 border-charcoal transition-colors", i <= idx ? (idx === 0 ? "bg-peri" : idx === 1 ? "bg-butter" : "bg-sage") : "bg-transparent")} />
        ))}
        <button onClick={onMore} className="ml-0.5 grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[11.5px] font-bold hover:bg-charcoal/5" aria-label="What do battery levels do?">?</button>
      </div>
      <span className="pr-1 text-[11.5px] font-semibold opacity-85">{BATTERY[level].label}</span>
    </div>
  );
}

/** Tiny bottle used to count today's introductions. */
function BottleIcon({ open = false }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <rect x="3" y="8" width="15" height="10" rx="5" fill={open ? "#FFF9F0" : "rgb(255 249 240 / 0.45)"} stroke="#1b2d45" strokeWidth="1.8" />
      <rect x="17" y="10.5" width="4" height="5" rx="1.2" fill={open ? "transparent" : "#C98D5B"} stroke="#1b2d45" strokeWidth="1.6" strokeDasharray={open ? "2 2" : undefined} />
      {open && <path d="M7 13 H14" stroke="#FF7A5C" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}
