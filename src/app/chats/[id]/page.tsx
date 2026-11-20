"use client";
import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DatePlan } from "@/lib/types";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { CalendarHeart, Info, ShieldCheck, DoorOpen, Gamepad2, Heart, Hourglass, Lightbulb, Send, Sparkles, X } from "lucide-react";
import { Frame, Loading, useRequireMe } from "@/components/Shell";
import { Avatar } from "@/components/Moment";
import { Badge, Button, Card, EmptyState, PrototypeTag, Sheet, TopBar, SampleBadge } from "@/components/ui";
import { SafetyMenu } from "@/components/ProfileBits";
import { DateMiniCard } from "@/components/DateBits";
import { ChatList } from "@/components/ChatList";
import { Coco } from "@/components/Coco";
import { matchState, useYaar } from "@/lib/store";
import { PlusLock } from "@/components/PlusBits";
import { isPlus } from "@/lib/plus";
import { conversationPulse, DAY, fmtTime, redFlags, SITUATIONS, SOFT_EXIT_REASONS, styleOf, suggestReplies, suggestIdeas, type Situation } from "@/lib/logic";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Frame width="wide">
      <div className="lg:grid lg:grid-cols-[360px_1fr]">
        <aside className="no-scrollbar sticky top-0 hidden h-dvh overflow-y-auto border-r border-line lg:block"><ChatList activeId={id} /></aside>
        <div className="min-w-0"><Chat id={id} /></div>
      </div>
    </Frame>
  );
}

function Chat({ id }: { id: string }) {
  const me = useRequireMe();
  const router = useRouter();
  const { matches, messages, people, plans, settings, sendMessage, now, dismissedNudges, dismissNudge, softExit, dismissedFlags, dismissFlag, plus, sparkAgain, toast } = useYaar();
  const plusOn = isPlus(plus, now());
  const [reportOpen, setReportOpen] = useState(false);
  const match = matches.find((m) => m.id === id);
  const them = people.find((p) => p.id === match?.users[1]);
  const msgs = useMemo(() => messages.filter((m) => m.matchId === id).sort((a, b) => a.createdAt - b.createdAt), [messages, id]);
  const [text, setText] = useState("");
  const [help, setHelp] = useState(false);
  const [exit, setExit] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  if (!me) return <Loading />;
  if (!match || !them) return <><TopBar back="/chats" /><EmptyState title="Chat not found" action={<Button href="/chats">Back to chats</Button>} /></>;

  const t = now();
  const st = matchState(match, t);
  const ended = st.ended;
  const activePlan = plans.find((p) => p.matchId === id && !["done", "cancelled"].includes(p.stage));
  const texts = msgs.filter((m) => m.kind === "text");
  const recentBoth = texts.some((m) => m.from === me.id && t - m.createdAt < 3 * DAY) && texts.some((m) => m.from === them.id && t - m.createdAt < 3 * DAY);
  const nudgeOk = !ended && !activePlan && me.battery !== "low" && texts.length >= 6 && recentBoth && !(dismissedNudges[id] && t - dismissedNudges[id] < 5 * DAY);
  const pulseRaw = settings.conversationPulse && !ended ? conversationPulse(msgs, me.id, t) : null;
  const pulse = pulseRaw && !dismissedNudges[`pulse:${id}:${pulseRaw.kind}`] ? pulseRaw : null;
  // Gentle tips (e.g. "moving to WhatsApp") show once per chat; only "pause" items repeat.
  const firstTipId = msgs.find((m) => m.from !== me.id && m.kind === "text" && redFlags(m.body)?.level === "tip")?.id;
  const ideas = suggestIdeas(me, them);

  const send = (body = text) => {
    const b = body.trim();
    if (!b || ended) return;
    sendMessage(id, b);
    setText("");
  };

  const exitExtra = !ended ? (
    <Button variant="secondary" full className="!justify-start" onClick={() => setExit(true)}><DoorOpen size={18} /> End this match kindly</Button>
  ) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar back="/chats"
        title={<Link href={`/u/${them.id}`} className="flex items-center gap-2"><Avatar p={them} size={36} /><span>{them.name}</span><SampleBadge id={them.id} className="hidden sm:inline-flex" /></Link>}
        right={<>
          {!ended && <Link href={`/chats/${id}/play`} aria-label="Chemistry Room" className="grid h-11 w-11 place-items-center rounded-full text-peri-ink hover:bg-peri-soft"><Gamepad2 size={22} /></Link>}
          {!ended && <Link href={activePlan && activePlan.stage !== "pick" ? `/date/${activePlan.id}` : `/chats/${id}/plan`} aria-label="Plan a date" className="grid h-11 w-11 place-items-center rounded-full text-coral-ink hover:bg-coral-soft"><CalendarHeart size={22} /></Link>}
          <SafetyMenu them={them} extra={exitExtra} openReport={reportOpen} onClosed={() => setReportOpen(false)} onBlocked={() => router.replace("/chats")} />
        </>} />

      {st.expiring && !ended && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-2xl bg-butter-soft px-3 py-2 text-[13.5px] font-medium text-butter-ink"><Hourglass size={16} /> No messages for 14 days. This match expires tomorrow. Say hi?</div>
      )}

      {!ended && <PlanStrip id={id} plan={activePlan} nudge={nudgeOk} onLater={() => dismissNudge(id)} name={them.name} ideaCount={ideas.length} firstIdea={ideas[0] ? `${ideas[0].emoji} ${ideas[0].title}` : undefined} />}

      <main className="flex-1 space-y-2 px-4 pb-4 pt-2 md:px-8" aria-live="polite">
        <div className="mx-auto mb-3 max-w-[300px] text-center text-[12px] text-muted">
          You matched {new Date(match.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}. Be kind, and keep personal details private until you&apos;re comfortable.
        </div>
        {msgs.length === 0 && (
          <div className="flex flex-col items-center py-6 text-center">
            <Coco mood="excited" size={90} />
            <p className="mt-2 max-w-[260px] text-[14px] text-muted">Say hi to {them.name}! Stuck? Tap <b>Help me reply</b> or start a game in the Chemistry Room.</p>
          </div>
        )}
        {msgs.map((m) => {
          if (m.kind === "date") return <DateMiniCard key={m.id} planId={String(m.meta?.planId)} />;
          if (m.kind === "game") return (
            <div key={m.id} className={clsx("max-w-[82%] md:max-w-[520px] rounded-[18px] border-2 border-peri/60 bg-peri-soft px-3.5 py-2.5 text-[14.5px] text-peri-ink", m.from === me.id ? "ml-auto" : "")}>
              <div className="mb-0.5 flex items-center gap-1 text-[11.5px] font-bold uppercase tracking-wide"><Gamepad2 size={13} /> Chemistry Room</div>{m.body}
            </div>
          );
          const mine = m.from === me.id;
          const flagRes = !mine && settings.redFlagRadar && !dismissedFlags.includes(m.id) ? redFlags(m.body) : null;
          const flags = flagRes && (flagRes.level === "pause" || m.id === firstTipId) ? flagRes : null;
          const reaction = m.meta?.reaction as { label?: string } | undefined;
          return (
            <motion.div key={m.id} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.18 }} className={clsx("flex flex-col", mine ? "items-end" : "items-start")}>
              {reaction?.label && <span className="mb-1 flex items-center gap-1 text-[12px] text-muted"><Heart size={11} className="text-coral-ink" fill="currentColor" />Reacted to {reaction.label}</span>}
              <div className={clsx("max-w-[80%] md:max-w-[520px] rounded-[20px] px-4 py-2.5 text-[15.5px] leading-snug", mine ? "rounded-br-md bg-charcoal text-paper" : "rounded-bl-md bg-paper shadow-soft")}>{m.body}</div>
              <span className="mt-0.5 px-1 text-[11px] text-muted">{fmtTime(m.createdAt)}</span>
              {flags && <RadarNote level={flags.level} items={flags.items} them={them.name} onDismiss={() => dismissFlag(m.id)} onReport={() => setReportOpen(true)} />}
            </motion.div>
          );
        })}
        {ended && (
          <Card tone="peri" className="mt-4 text-center">
            <p className="text-[14.5px] text-peri-ink">{match.endReason === "blocked" ? "You blocked this person." : match.endedBy === me.id ? `You closed this match. ${them.name} got a kind note, not your reason.` : "This match expired after 15 quiet days."}</p>
            {match.status !== "ended" && (plusOn
              ? (plus!.sparked.includes(match.id)
                ? <p className="mt-2 text-[13px] text-muted">You&apos;ve already sparked this chat once.</p>
                : <Button className="mt-3" onClick={() => { if (sparkAgain(match.id)) toast(`Sparked! ${them.name} will see your chat is open again.`, "good"); }}><Sparkles size={17} /> Spark again</Button>)
              : <PlusLock className="mt-3 text-left" title="Spark again" body={`Reopen this chat with ${them.name}. Once per match, with Isle Plus.`} />)}
          </Card>
        )}
        <div ref={endRef} />
      </main>

      {!ended && (
        <div className="sticky bottom-0 z-10 space-y-2 bg-gradient-to-t from-vanilla via-vanilla to-vanilla/0 px-3 pb-4 pt-4 md:px-8">
          <AnimatePresence>
            {pulse && (
              <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 rounded-[18px] bg-peri-soft px-3 py-2 text-[13.5px] text-peri-ink">
                <Lightbulb size={17} className="mt-0.5 shrink-0" />
                <span className="flex-1"><b>Pulse:</b> {pulse.tip}</span>
                <button onClick={() => dismissNudge(`pulse:${id}:${pulse.kind}`)} aria-label="Dismiss this tip" className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-peri/30"><X size={16} /></button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="no-scrollbar flex gap-2 overflow-x-auto" role="toolbar" aria-label="Quick actions">
            <Link href={`/chats/${id}/play`} className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border-2 border-charcoal bg-peri px-3 text-[13px] font-bold"><Gamepad2 size={15} /> Play a game</Link>
            <Link href={activePlan && activePlan.stage !== "pick" ? `/date/${activePlan.id}` : `/chats/${id}/plan`} className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border-2 border-charcoal bg-coral px-3 text-[13px] font-bold"><CalendarHeart size={15} /> {activePlan ? "Our date" : "Plan a date"}</Link>
            {settings.aiHelp && <button type="button" onClick={() => setHelp(true)} className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border-2 border-charcoal bg-butter px-3 text-[13px] font-bold"><Sparkles size={15} /> Help me reply</button>}
          </div>
          <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder={`Message ${them.name}`} aria-label={`Message ${them.name}`}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              className="max-h-32 min-h-12 flex-1 resize-none rounded-[16px] border-2 border-line bg-paper px-4 py-3 text-[16px] outline-none focus:border-coral" />
            <button type="submit" aria-label="Send" disabled={!text.trim()} className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-coral text-charcoal shadow-soft transition active:scale-90 disabled:opacity-40"><Send size={19} /></button>
          </form>
        </div>
      )}

      <HelpMeReply open={help} onClose={() => setHelp(false)} matchId={id} onPick={(t) => { setText(t); setHelp(false); }} />

      <Sheet open={exit} onClose={() => setExit(false)} title="End this match kindly">
        <SoftExit name={them.name} meName={me.name} onDone={(reason) => { softExit(id, reason); setExit(false); }} />
      </Sheet>
    </div>
  );
}

/**
 * Red Flag Radar, two tones:
 *  - "pause": money, private details, pressure. A calm card with what to watch for and an easy report.
 *  - "tip": everyday things like moving to WhatsApp. A small, neutral note, shown once per chat.
 */
function RadarNote({ level, items, them, onDismiss, onReport }: { level: "pause" | "tip"; items: { title: string; why: string }[]; them: string; onDismiss: () => void; onReport: () => void }) {
  if (level === "tip") return (
    <div role="note" className="mt-1.5 flex max-w-[88%] items-start gap-2 rounded-[14px] bg-paper/70 px-3 py-2 text-[12.5px] text-muted md:max-w-[520px]">
      <Info size={14} className="mt-0.5 shrink-0" />
      <span className="flex-1">{items[0].why}</span>
      <button onClick={onDismiss} aria-label="Dismiss tip" className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-charcoal/5"><X size={14} /></button>
    </div>
  );
  return (
    <div role="note" className="mt-1.5 w-[88%] rounded-[18px] border-2 border-charcoal/15 bg-butter-soft p-3 text-[13.5px] text-butter-ink md:max-w-[520px]">
      <div className="flex items-center gap-1.5 font-semibold"><ShieldCheck size={16} /> A quick safety check</div>
      <ul className="mt-1.5 space-y-1">{items.map((f) => <li key={f.title}><b>{f.title}.</b> {f.why}</li>)}</ul>
      <p className="mt-1.5 text-[12px] opacity-80">This is an automatic check of the words, not a judgement about {them}. Only you see it.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={onDismiss} className="min-h-10 rounded-full border-2 border-charcoal bg-paper px-3.5 text-[13px] font-semibold">Looks fine, hide this</button>
        <button onClick={onReport} className="min-h-10 rounded-full px-3 text-[13px] font-semibold underline underline-offset-2">Report {them}</button>
      </div>
    </div>
  );
}

/** Pinned under the header so the date plan is always one tap away, without covering the composer. */
function PlanStrip({ id, plan, name, nudge, onLater, firstIdea }: { id: string; plan?: DatePlan; name: string; nudge: boolean; onLater: () => void; ideaCount: number; firstIdea?: string }) {
  if (plan && plan.stage !== "pick") {
    const when = plan.slot ? new Date(plan.slot).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : null;
    return (
      <Link href={`/date/${plan.id}`} className="mx-4 mb-2 flex items-center gap-3 rounded-[18px] border-2 border-charcoal bg-sage-soft px-3 py-2 md:mx-8">
        <CalendarHeart size={20} className="shrink-0" />
        <span className="min-w-0 flex-1 text-[13.5px]"><b className="block">{plan.stage === "confirmed" ? "Date confirmed" : plan.stage === "checkedin" ? "How did it go?" : "Planning a date"}</b><span className="block truncate text-charcoal/75">{plan.ideas.find((i) => i.id === plan.chosenIdea)?.title ?? (plan.stage !== "confirmed" && plan.stage !== "checkedin" ? "Picking a time and place" : "Your date")}{when ? ` · ${when}` : ""}</span></span>
        <span className="text-[13px] font-bold underline underline-offset-2">Open</span>
      </Link>
    );
  }
  if (!nudge) return null;
  return (
    <div className="mx-4 mb-2 flex flex-wrap items-center gap-2 rounded-[18px] border-2 border-charcoal bg-coral-soft px-3 py-2 md:mx-8">
      <CalendarHeart size={20} className="shrink-0 text-coral-ink" />
      <span className="min-w-0 flex-1 text-[13.5px] text-coral-ink"><b>Chatting a lot with {name}?</b> {firstIdea ? <>Try {firstIdea}.</> : "A date idea is ready."}</span>
      <Link href={`/chats/${id}/plan`} className="min-h-9 rounded-full border-2 border-charcoal bg-coral px-3 py-1 text-[13px] font-bold">See ideas</Link>
      <button onClick={onLater} className="min-h-9 rounded-full px-2 text-[13px] font-semibold text-coral-ink">Later</button>
    </div>
  );
}

function HelpMeReply({ open, onClose, matchId, onPick }: { open: boolean; onClose: () => void; matchId: string; onPick: (t: string) => void }) {
  const { me, matches, people, messages } = useYaar();
  const [sit, setSit] = useState<Situation>("keep");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"ai" | "fallback">("fallback");
  const [items, setItems] = useState<{ tone: string; text: string; why: string }[]>([]);
  const match = matches.find((m) => m.id === matchId);
  const them = people.find((p) => p.id === match?.users[1]);

  useEffect(() => {
    if (!open || !me || !them) return;
    const msgs = messages.filter((m) => m.matchId === matchId && m.kind === "text");
    const lastThem = [...msgs].reverse().find((m) => m.from === them.id)?.body ?? "";
    const style = styleOf(msgs, me.id);
    let alive = true;
    setLoading(true);
    fetch("/api/reply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: sit, style, history: msgs.slice(-8).map((m) => ({ me: m.from === me.id, text: m.body })), them: { name: them.name, starterPack: them.starterPack, hotTake: them.hotTake, captions: them.moments.map((m) => m.caption) } }),
    }).then((r) => r.json()).then((j) => {
      if (!alive) return;
      if (j.source === "ai") { setItems(j.suggestions); setSource("ai"); }
      else { setItems(suggestReplies(sit, lastThem, them, style)); setSource("fallback"); }
    }).catch(() => { if (alive) { setItems(suggestReplies(sit, lastThem, them, style)); setSource("fallback"); } })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [open, sit, me, them, messages, matchId]);

  const toneCls: Record<string, string> = { Playful: "bg-coral-soft text-coral-ink", Casual: "bg-sage-soft text-sage-ink", Thoughtful: "bg-peri-soft text-peri-ink" };
  return (
    <Sheet open={open} onClose={onClose} title="Help me reply">
      <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
        {SITUATIONS.map((s) => (
          <button key={s.id} onClick={() => setSit(s.id)} aria-pressed={sit === s.id} className={clsx("min-h-10 shrink-0 rounded-full px-3.5 text-[13.5px] font-semibold", sit === s.id ? "bg-charcoal text-paper" : "border border-line bg-paper")}>{s.label}</button>
        ))}
      </div>
      <div className="space-y-2.5" aria-busy={loading}>
        {loading ? [0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-[18px] bg-charcoal/[0.06]" />)
          : items.map((s, i) => (
            <button key={i} onClick={() => onPick(s.text)} className="w-full rounded-[18px] border-2 border-line bg-paper p-3 text-left transition hover:border-coral active:scale-[0.98]">
              <span className={clsx("rounded-full px-2 py-0.5 text-[11.5px] font-bold", toneCls[s.tone] ?? "bg-butter-soft")}>{s.tone}</span>
              <span className="mt-1.5 block text-[15.5px]">{s.text}</span>
              {s.why && <span className="mt-1 block text-[12.5px] text-muted">Why: {s.why}</span>}
            </button>
          ))}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-muted">Tap one to edit it in the box. Nothing is ever sent for you. {source === "ai" ? "Suggestions use AI on your last few messages, and nothing is stored." : <>Using built-in suggestions. <PrototypeTag className="ml-1">AI turns on with an API key</PrototypeTag></>} You can turn this off in Settings.</p>
    </Sheet>
  );
}

function SoftExit({ name, meName, onDone }: { name: string; meName: string; onDone: (reason: string) => void }) {
  const [reason, setReason] = useState<string>("");
  return (
    <div>
      <p className="-mt-1 text-[14px] text-muted">A respectful alternative to ghosting. {name} gets a gentle closing note. Your reason stays private and only helps us improve.</p>
      <fieldset className="mt-4 space-y-2">
        <legend className="sr-only">Reason (optional)</legend>
        {SOFT_EXIT_REASONS.map((r) => (
          <label key={r} className={clsx("flex min-h-12 cursor-pointer items-center gap-3 rounded-[14px] border-2 px-4 text-[15px]", reason === r ? "border-coral bg-coral-soft" : "border-line")}>
            <input type="radio" name="exit" checked={reason === r} onChange={() => setReason(r)} className="accent-[#FF7A5C]" /> {r}
          </label>
        ))}
      </fieldset>
      <Card tone="sage" className="mt-4 !p-3">
        <p className="text-[12px] font-bold uppercase tracking-wide text-sage-ink">What {name} will see</p>
        <p className="mt-1 text-[14.5px] text-sage-ink">&quot;{meName} has decided to close this match. Thanks for the conversation, and good luck out there 💛&quot;</p>
      </Card>
      <Button full className="mt-4" onClick={() => onDone(reason || "No reason given")}>Send kind note and close</Button>
      <p className="mt-2 text-center text-[12.5px] text-muted">Feeling unsafe? Use Block instead. It&apos;s instant and silent.</p>
      <div className="mt-1 flex justify-center"><Badge tone="peri">No ghosting needed</Badge></div>
    </div>
  );
}
