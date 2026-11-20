"use client";
import { PlusLock, PlusTag } from "@/components/PlusBits";
import { isPlus, whyYouTwo } from "@/lib/plus";
import type { Profile } from "@/lib/types";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, EyeOff, Lock, MapPin, X } from "lucide-react";
import clsx from "clsx";
import { StarterSticker } from "@/components/StarterSticker";
import { Frame, Loading, useRequireMe } from "@/components/Shell";
import { Moment } from "@/components/Moment";
import { Badge, Button, Card, Chip, EmptyState, SectionLabel, TopBar, SampleBadge } from "@/components/ui";
import { ReactBtn, ReactSheet, SafetyMenu, SharedGround, ThisOrThatCompare, VoiceNote } from "@/components/ProfileBits";
import { useYaar } from "@/lib/store";
import { displayArea, splitHotTake } from "@/lib/logic";
import { INTENT_SHORT, PAPER_BG, type ReactTarget } from "@/lib/types";

export default function ScrapbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Frame width="medium"><Scrapbook id={id} /></Frame>;
}

function Scrapbook({ id }: { id: string }) {
  const me = useRequireMe();
  const router = useRouter();
  const { people, reactions, openIntro, pass, matches, settings, drop, toast } = useYaar();
  const reduce = useReducedMotion();
  const preview = id === "me";
  const p = preview ? me : people.find((x) => x.id === id);
  const [target, setTarget] = useState<ReactTarget | null>(null);
  const [pop, setPop] = useState(0);
  useEffect(() => { if (p && !preview) openIntro(p.id); }, [p, preview, openIntro]);
  if (!me) return <Loading />;
  if (!p) return <><TopBar back="/today" /><EmptyState title="This profile isn't available" body="They may have paused their account." action={<Button href="/today">Back to Today</Button>} /></>;

  const sent = reactions.find((r) => r.from === me.id && r.to === p.id);
  const match = matches.find((m) => m.users.includes(p.id) && m.status === "active");
  const reactedKey = sent ? `${sent.target.kind}:${sent.target.refId ?? ""}` : "";
  const ask = (t: ReactTarget) => { if (sent || match || preview) return; setTarget(t); };
  const hot = splitHotTake(p);
  const tape = p.theme?.tape;

  // Moving between today's introductions
  const inDrop = !preview && drop.ids.includes(p.id);
  const idx = drop.ids.indexOf(p.id);
  const prevId = inDrop && idx > 0 ? drop.ids[idx - 1] : null;
  const nextId = inDrop ? drop.ids.slice(idx + 1).find((x) => !drop.opened.includes(x)) ?? drop.ids[idx + 1] ?? null : null;
  const go = (to: string | null, dir: 1 | -1) => {
    try { sessionStorage.setItem("yaar-intro-dir", String(dir)); } catch { /* ignore */ }
    if (to) router.push(`/u/${to}`);
    else { toast("That's everyone from today's tide. New bottles wash up at the next Tide.", "info"); router.push("/today"); }
  };
  const dir = (() => { try { return Number(sessionStorage.getItem("yaar-intro-dir") ?? 1); } catch { return 1; } })();

  return (
    <>
      <TopBar back={preview ? "/profile" : inDrop ? "/today" : () => router.back()} title={preview ? "Preview: how others see you" : `${p.name}'s scrapbook`} right={preview ? undefined : <SafetyMenu them={p} onBlocked={() => router.replace("/today")} />} />
      {inDrop && (
        <nav aria-label="Today's introductions" className="flex items-center gap-2 px-4 pb-2 md:px-8">
          <Link href={prevId ? `/u/${prevId}` : "#"} onClick={() => { try { sessionStorage.setItem("yaar-intro-dir", "-1"); } catch { /* ignore */ } }} aria-disabled={!prevId} tabIndex={prevId ? 0 : -1}
            className={clsx("grid h-10 w-10 place-items-center rounded-full border-2 border-charcoal bg-paper", !prevId && "pointer-events-none opacity-30")} aria-label="Previous introduction"><ChevronLeft size={18} /></Link>
          <div className="flex flex-1 items-center justify-center gap-1.5">
            {drop.ids.map((x) => <span key={x} className={clsx("h-2 rounded-full transition-all", x === p.id ? "w-6 bg-coral" : drop.opened.includes(x) ? "w-2 bg-charcoal/40" : "w-2 bg-charcoal/15")} />)}
            <span className="ml-2 text-[12.5px] font-semibold text-muted">{idx + 1} of {drop.ids.length}</span>
          </div>
          <button onClick={() => go(drop.ids[idx + 1] ?? null, 1)} className="grid h-10 w-10 place-items-center rounded-full border-2 border-charcoal bg-paper" aria-label={drop.ids[idx + 1] ? "Next introduction" : "Back to Today"}><ChevronRight size={18} /></button>
        </nav>
      )}
      {preview && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-[18px] border-2 border-dashed border-charcoal/25 bg-paper px-3 py-2.5 text-[13px] md:mx-8">
          <EyeOff size={16} className="mt-0.5 shrink-0" />
          <span>This is exactly what others see. Hidden from everyone: your work and college, show-up count, exact location{(settings.locationVisibility ?? "area") !== "area" ? ", and your neighbourhood" : ""}. <Link href="/profile/settings/privacy" className="font-semibold underline underline-offset-2">Privacy settings</Link></span>
        </div>
      )}
      <AnimatePresence mode="wait" initial={false}>
      <motion.main key={p.id} initial={reduce ? false : { x: 36 * dir, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={reduce ? undefined : { x: -36 * dir, opacity: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}
        className="px-5 pb-6 pt-2 md:mx-4 md:rounded-[32px] md:px-6 md:py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-10" style={{ background: PAPER_BG[p.theme?.paper ?? "vanilla"] }}>
        <div className="space-y-5 lg:sticky lg:top-16">
        <div className="relative px-6 pt-3 lg:px-4">
          <Moment m={p.moments[0]} i={0} size="lg" tape={tape} onReact={preview ? undefined : () => ask({ kind: "moment", refId: p.moments[0].id, label: `“${p.moments[0].caption}”` })} reacted={reactedKey === `moment:${p.moments[0].id}`} />
        </div>
        {p.moments.length > 1 && (
          <div className="hidden grid-cols-2 gap-4 px-1 lg:grid">
            {p.moments.slice(1).map((m, i) => (
              <Moment key={m.id} m={m} i={i + 1} size="sm" tape={tape} onReact={preview ? undefined : () => ask({ kind: "moment", refId: m.id, label: `“${m.caption}”` })} reacted={reactedKey === `moment:${m.id}`} />
            ))}
          </div>
        )}
        </div>
        <div className="mt-5 space-y-5 lg:mt-3">

        <section>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[30px] leading-none">{p.name}, {p.age}</h1>{!preview && <SampleBadge id={p.id} />}
            {p.verified && <Badge><span title="Passed the selfie check at sign-up. In this version the check is simulated; production would use a verification provider.">✓ Selfie-checked</span></Badge>}
            {p.reliable && <Badge tone="peri">Reliable</Badge>}
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-muted">{(preview ? displayArea(p, settings) : displayArea(p)) && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {preview ? displayArea(p, settings) : displayArea(p)}</span>}{p.pronouns && <span>{p.pronouns}</span>}</p>
          <div className="mt-3"><Chip tone="coral">{INTENT_SHORT[p.intent]}</Chip></div>
        </section>

        {!preview && <SharedGround me={me} p={p} />}
        {!preview && <WhyYouTwo me={me} p={p} />}

        <Card tone="butter">
          <div className="flex items-center justify-between"><SectionLabel>{hot.prompt ?? "Hot take"}</SectionLabel>{!preview && <ReactBtn label="hot take" reacted={reactedKey === "hottake:"} onClick={() => ask({ kind: "hottake", label: `“${hot.answer}”` })} />}</div>
          <p className="font-display text-[21px] leading-snug text-butter-ink">{hot.answer}</p>
        </Card>


        {p.moments.length > 1 && (
          <div className="grid grid-cols-2 gap-4 px-1 lg:hidden">
            {p.moments.slice(1).map((m, i) => (
              <Moment key={m.id} m={m} i={i + 1} size="sm" tape={tape} onReact={preview ? undefined : () => ask({ kind: "moment", refId: m.id, label: `“${m.caption}”` })} reacted={reactedKey === `moment:${m.id}`} />
            ))}
          </div>
        )}
        <Card>
          <SectionLabel>Starter pack</SectionLabel>
          <div className="flex flex-wrap gap-2.5 py-1">{p.starterPack.map((s, i) => <StarterSticker key={s} text={s} i={i} />)}</div>
        </Card>

        {p.voice && <VoiceNote v={p.voice} onReact={preview ? undefined : () => ask({ kind: "voice", label: `Voice note: “${p.voice!.transcript}”` })} reacted={reactedKey === "voice:"} />}

        <ThisOrThatCompare me={me} p={p} compare={!preview} onReact={preview ? undefined : (label) => ask({ kind: "answer", label })} />

        {!preview && <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-muted"><Lock size={13} /> Work and college show only after you match, if {p.name} chooses.</p>}
        </div>
      </motion.main>
      </AnimatePresence>

      <div className="sticky bottom-0 z-20 bg-gradient-to-t from-vanilla via-vanilla/95 to-vanilla/0 px-5 pb-6 pt-6 md:px-8 lg:static lg:mx-auto lg:max-w-[560px] lg:bg-none lg:pb-10">
        {preview ? (
          <Button full variant="secondary" href="/profile/edit">Edit my scrapbook</Button>
        ) : match ? (
          <Button full href={`/chats/${match.id}`}>You&apos;ve matched · open chat</Button>
        ) : sent ? (
          <Card tone="coral" className="relative flex items-center gap-3 !p-3">
            {pop > 0 && <HeartBurst key={pop} />}
            <motion.span key={`h${pop}`} initial={{ scale: 0.3 }} animate={{ scale: [1.4, 1] }} transition={{ duration: 0.25 }} className="text-[26px]" aria-hidden>💗</motion.span>
            <span className="flex-1 text-[14px] font-medium text-coral-ink">Reaction sent. If {p.name} reacts back, you&apos;ll match.</span>
            {inDrop && <Button className="shrink-0 !min-h-11" onClick={() => go(nextId, 1)}>Next</Button>}
          </Card>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="secondary" aria-label={`Pass on ${p.name}`} className="!w-14 !px-0" onClick={() => { pass(p.id); go(nextId, 1); }}><X size={22} /></Button>
            <p className="flex-1 text-[13.5px] leading-snug text-muted">Tap <b className="text-coral-ink">♥ React</b> on a moment, the hot take, the voice note or an answer to connect.</p>
            {inDrop && <Button variant="secondary" className="shrink-0" onClick={() => go(nextId, 1)}>Next</Button>}
          </div>
        )}
      </div>

      <ReactSheet open={!!target} onClose={() => setTarget(null)} target={target} them={p} onSent={() => setPop((n) => n + 1)} />
    </>
  );
}

/** A quick burst of hearts when you react. Decorative; skipped with reduced motion. */
function HeartBurst() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span className="pointer-events-none absolute left-7 top-1/2" aria-hidden>
      {[...Array(9)].map((_, i) => (
        <motion.span key={i} className="absolute text-[16px]" initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
          animate={{ x: Math.cos((i / 9) * Math.PI * 2) * 60, y: Math.sin((i / 9) * Math.PI * 2) * 46 - 30, opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.8, ease: "easeOut" }}>{["💗", "❤️", "✨"][i % 3]}</motion.span>
      ))}
    </span>
  );
}

/** Isle Plus: the reasons Isle introduced you, with openers. */
function WhyYouTwo({ me, p }: { me: Profile; p: Profile }) {
  const { plus, now } = useYaar();
  if (!isPlus(plus, now())) return <PlusLock title="Why you two?" body={`See exactly why Isle introduced you to ${p.name}, with openers to use.`} />;
  const reasons = whyYouTwo(me, p);
  return (
    <Card tone="peri">
      <div className="flex items-center gap-2"><SectionLabel>Why you two?</SectionLabel><PlusTag className="-mt-2" /></div>
      <ul className="space-y-2 text-[14.5px] text-peri-ink">{reasons.map((r) => <li key={r} className="flex gap-2"><span aria-hidden>🌊</span><span>{r}</span></li>)}</ul>
    </Card>
  );
}
