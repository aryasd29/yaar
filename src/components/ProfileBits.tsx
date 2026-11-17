"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { motion } from "motion/react";
import { Flag, Heart, MoreHorizontal, Pause, Play, ShieldBan } from "lucide-react";
import { Button, Card, Sheet, SectionLabel } from "./ui";
import { useYaar } from "@/lib/store";
import { sharedGround } from "@/lib/logic";
import { THIS_OR_THAT } from "@/lib/seed";
import type { Profile, ReactTarget } from "@/lib/types";

export function SharedGround({ me, p }: { me: Profile; p: Profile }) {
  const g = sharedGround(me, p);
  const rows: [string, string, string][] = [
    ["Relationship intentions", g.intentAligned, g.intentAligned === "Aligned" ? "text-sage-ink" : g.intentAligned === "Compatible" ? "text-peri-ink" : "text-coral-ink"],
    ["This or That", `${g.agree} of ${g.answered} agree`, "text-charcoal"],
    ["Texting pace", g.pace, "text-charcoal"],
    ["Interests", g.sharedInterests.length ? `${g.sharedInterests.length} shared` : "Different, worth exploring", "text-charcoal"],
  ];
  return (
    <Card tone="peri">
      <SectionLabel>Your shared ground</SectionLabel>
      <dl className="divide-y divide-peri-ink/10">
        {rows.map(([k, v, c]) => (
          <div key={k} className="flex items-center justify-between py-2 text-[14.5px]"><dt className="text-peri-ink">{k}</dt><dd className={clsx("font-semibold", c)}>{v}</dd></div>
        ))}
      </dl>
      {g.sharedInterests.length > 0 && <p className="mt-2 text-[13px] text-peri-ink">Both into {g.sharedInterests.join(", ")}.</p>}
      <p className="mt-2 text-[11.5px] text-peri-ink/70">Real overlaps from your answers, not a prediction about the two of you.</p>
    </Card>
  );
}

export function VoiceNote({ v, onReact, reacted, bare }: { v: NonNullable<Profile["voice"]>; onReact?: () => void; reacted?: boolean; bare?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const toggle = () => {
    if (v.audioUrl) {
      if (!audio.current) {
        audio.current = new Audio(v.audioUrl);
        audio.current.ontimeupdate = () => setProgress(audio.current ? audio.current.currentTime / Math.max(1, v.seconds) : 0);
        audio.current.onended = () => { setPlaying(false); setProgress(0); };
      }
      if (playing) audio.current.pause(); else void audio.current.play();
      setPlaying(!playing);
    } else {
      setPlaying(true); setTimeout(() => setPlaying(false), 2600);
    }
  };
  const Wrap = bare ? "div" : Card;
  return (
    <Wrap>
      {bare ? <p className="mb-2 text-[13.5px] font-semibold text-peri-ink">{v.prompt}</p> : <div className="flex items-center justify-between"><SectionLabel>Voice note · {v.prompt}</SectionLabel>{onReact && <ReactBtn onClick={onReact} reacted={reacted} label="voice note" />}</div>}
      {(v.audioUrl || v.seconds > 0) && (
        <div className="flex items-center gap-3">
          <button onClick={toggle} aria-label={playing ? "Pause voice note" : "Play voice note"} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-charcoal bg-charcoal text-paper active:scale-95">{playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}</button>
          <div className="flex h-10 flex-1 items-center gap-[3px]" aria-hidden>
            {[...Array(28)].map((_, i) => (
              <motion.span key={i} className={clsx("w-[4px] rounded-full", playing && (!v.audioUrl || i / 28 < progress) ? "bg-coral" : "bg-charcoal/20")}
                animate={{ height: playing && !v.audioUrl ? [6, 10 + ((i * 13) % 24), 6] : 6 + ((i * 9) % 20) }}
                transition={playing && !v.audioUrl ? { duration: 0.55, repeat: Infinity, delay: i * 0.025 } : { duration: 0.2 }} />
            ))}
          </div>
          <span className="text-[12.5px] font-semibold text-muted">0:{String(v.seconds).padStart(2, "0")}</span>
        </div>
      )}
      {v.transcript && <p className={clsx("mt-3 rounded-xl px-3 py-2 text-[14px] italic leading-relaxed", bare ? "bg-paper/70" : "bg-vanilla")}>“{v.transcript}”</p>}
      {!v.audioUrl && <p className="mt-1.5 text-[11.5px] text-muted">{bare ? "Caption only, no audio recorded yet." : "Demo profile: caption shown, no recorded audio."}</p>}
    </Wrap>
  );
}

export function ReactBtn({ onClick, reacted, label }: { onClick: () => void; reacted?: boolean; label: string }) {
  return (
    <motion.button whileTap={{ scale: 0.85 }} onClick={onClick} aria-label={`React to ${label}`}
      className={clsx("flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition", reacted ? "bg-coral text-charcoal" : "bg-coral-soft text-coral-ink")}>
      <Heart size={15} fill={reacted ? "currentColor" : "none"} /> {reacted ? "Reacted" : "React"}
    </motion.button>
  );
}

export function ThisOrThatCompare({ me, p, onReact, compare = true }: { me: Profile; p: Profile; onReact?: (q: string) => void; compare?: boolean }) {
  const qs = THIS_OR_THAT.filter((q) => p.thisOrThat[q.id]).slice(0, 6);
  return (
    <Card>
      <SectionLabel>This or That</SectionLabel>
      <ul className="space-y-2">
        {qs.map((q) => {
          const theirs = p.thisOrThat[q.id] === "a" ? q.a : q.b;
          const mine = compare && me.thisOrThat[q.id] ? (me.thisOrThat[q.id] === "a" ? q.a : q.b) : null;
          const same = mine === theirs;
          return (
            <li key={q.id} className="flex items-center gap-2 rounded-[14px] bg-vanilla px-3 py-2">
              <span className="flex-1 text-[14px]"><span className="text-muted">{q.a} or {q.b}?</span> <b className="font-semibold">{theirs}</b></span>
              {mine && <span className={clsx("text-[12px] font-semibold", same ? "text-sage-ink" : "text-butter-ink")}>{same ? "✓ same" : `you: ${mine}`}</span>}
              {onReact && <button onClick={() => onReact(`${q.a} or ${q.b}: ${theirs}`)} aria-label={`React to their answer ${theirs}`} className="grid h-9 w-9 place-items-center rounded-full text-coral-ink hover:bg-coral-soft"><Heart size={16} /></button>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const NOTE_STARTERS: Record<string, string[]> = {
  moment: ["okay this is a great photo", "wait, I need the story behind this", "this caption made me laugh"],
  hottake: ["finally someone said it", "respectfully, you're wrong and I can explain", "okay but hear me out…"],
  voice: ["your voice note made my day", "okay that story was great", "I have so many follow-up questions"],
  starter: ["same! tell me more", "this is the right answer"],
  answer: ["same answer, obviously", "we need to talk about this one"],
};

export function ReactSheet({ open, onClose, target, them, onSent }: { open: boolean; onClose: () => void; target: ReactTarget | null; them: Profile; onSent: () => void }) {
  const react = useYaar((s) => s.react);
  const [note, setNote] = useState("");
  if (!target) return null;
  return (
    <Sheet open={open} onClose={onClose} title={`React to ${them.name}'s ${target.kind === "hottake" ? "hot take" : target.kind === "voice" ? "voice note" : target.kind === "answer" ? "answer" : target.kind === "starter" ? "starter pack" : "moment"}`}>
      <div className="rounded-[16px] bg-vanilla px-4 py-3 text-[15px]">{target.label}</div>
      <label className="mt-4 block text-[13px] font-semibold" htmlFor="rx-note">Add a note (optional, it becomes your first message)</label>
      <textarea id="rx-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} rows={3} placeholder="Say something about it…"
        className="mt-1.5 w-full rounded-[14px] border-2 border-line bg-paper px-4 py-3 text-[16px] outline-none focus:border-coral" />
      <div className="mt-2 flex flex-wrap gap-2">
        {(NOTE_STARTERS[target.kind] ?? []).map((s) => <button key={s} onClick={() => setNote(s)} className="min-h-9 rounded-full bg-butter-soft px-3 text-[13px] font-medium text-butter-ink">{s}</button>)}
      </div>
      <p className="mt-4 text-[12.5px] text-muted">If {them.name} reacts back, your chat opens. If not, they&apos;re never told you were passed on.</p>
      <Button full className="mt-3" onClick={() => { react(them.id, target, note.trim()); setNote(""); onSent(); onClose(); }}><Heart size={18} /> Send reaction</Button>
    </Sheet>
  );
}

export const REPORT_REASONS = ["Fake profile or scam", "Asked for money", "Inappropriate messages", "Made me feel unsafe", "Underage", "Something else"];

export function SafetyMenu({ them, onBlocked, extra, openReport, onClosed }: { them: Profile; onBlocked?: () => void; extra?: React.ReactNode; openReport?: boolean; onClosed?: () => void }) {
  const [openSelf, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "report">("menu");
  useEffect(() => { if (openReport) setMode("report"); }, [openReport]);
  const open = openSelf || !!openReport;
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const { block, report } = useYaar();
  const close = () => { setOpen(false); setMode("menu"); setReason(""); setDetails(""); onClosed?.(); };
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={`Safety and options for ${them.name}`} className="grid h-11 w-11 place-items-center rounded-full hover:bg-charcoal/5"><MoreHorizontal size={22} /></button>
      <Sheet open={open} onClose={close} title={mode === "menu" ? `${them.name}` : `Report ${them.name}`}>
        {mode === "menu" ? (
          <div className="space-y-2">
            {extra}
            <Button variant="secondary" full className="!justify-start" onClick={() => setMode("report")}><Flag size={18} /> Report</Button>
            <Button variant="danger" full className="!justify-start" onClick={() => { block(them.id); close(); onBlocked?.(); }}><ShieldBan size={18} /> Block now</Button>
            <p className="pt-1 text-[12.5px] text-muted">Blocking is instant and silent. {them.name} won&apos;t be told and can&apos;t contact you again.</p>
          </div>
        ) : (
          <div>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-[13px] font-semibold">What happened?</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r} className={clsx("flex min-h-12 cursor-pointer items-center gap-3 rounded-[14px] border-2 px-4 text-[15px]", reason === r ? "border-coral bg-coral-soft" : "border-line")}>
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-[#FF7A5C]" /> {r}
                </label>
              ))}
            </fieldset>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder="Anything else we should know? (optional)" className="mt-3 w-full rounded-[14px] border-2 border-line bg-paper px-4 py-3 text-[15px] outline-none focus:border-coral" aria-label="Report details" />
            <Button full className="mt-3" disabled={!reason} onClick={() => { report(them.id, reason, details); block(them.id); close(); onBlocked?.(); }}>Report and block</Button>
            <button className="mt-2 min-h-11 w-full text-[14px] font-semibold text-muted" disabled={!reason} onClick={() => { report(them.id, reason, details); close(); }}>Report without blocking</button>
            <p className="mt-2 text-[12px] text-muted">If you&apos;re in danger right now, call 112.</p>
          </div>
        )}
      </Sheet>
    </>
  );
}
