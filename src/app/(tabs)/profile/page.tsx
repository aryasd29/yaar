"use client";
import { PlusLock, PlusTag } from "@/components/PlusBits";
import { isPlus, scrapbookReview } from "@/lib/plus";
import { LIVE, amAdmin } from "@/lib/remote";
import { DeleteAccount } from "@/components/DeleteAccount";
import { NotificationBell } from "@/components/PageHeader";
import Link from "next/link";
import clsx from "clsx";
import { motion } from "motion/react";
import { BatteryMedium, Bell, Check, ChevronRight, Eye, Lock, LogOut, Trash2, MapPin, Pencil, Plus, ShieldCheck, SlidersHorizontal, Sparkles, UserCheck } from "lucide-react";
import { Loading, useRequireMe } from "@/components/Shell";
import { Moment } from "@/components/Moment";
import { Badge, Button, Chip } from "@/components/ui";
import { VoiceNote } from "@/components/ProfileBits";
import { Coco } from "@/components/Coco";
import { DemoClock } from "@/components/DemoClock";
import { useEffect, useState } from "react";
import { useYaar } from "@/lib/store";
import { MomentSlots } from "@/components/MomentSlots";
import { StarterSticker } from "@/components/StarterSticker";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Sheet } from "@/components/ui";
import { displayArea, preferenceSummary, profileCompletion, splitHotTake } from "@/lib/logic";
import { THIS_OR_THAT } from "@/lib/seed";
import { BATTERY, INTENT_LABEL, LOCATION_LABEL, PAPER_BG, TAPE_BG, type LocationVisibility, type PaperTone, type Profile, type ScrapTheme } from "@/lib/types";

/* Each scrapbook section owns one colour from the palette, so colour tells you where you are. */
const TONE = {
  moments: "bg-paper",
  hottake: "bg-butter-soft",
  interests: "bg-sage-soft",
  starter: "bg-coral-soft",
  voice: "bg-peri-soft",
  tot: "bg-charcoal text-paper",
} as const;

export default function MyProfile() {
  const me = useRequireMe();
  const { prefs, plans, settings, setSettings, signOut, updateMe, toast, plus, now } = useYaar();
  const plusOn = isPlus(plus, now());
  const [voiceOpen, setVoiceOpen] = useState(false);
  if (!me) return <Loading />;

  const attended = plans.filter((p) => ["checkedin", "done"].includes(p.stage)).length;
  const completion = profileCompletion(me);
  const hot = splitHotTake(me);
  const area = displayArea(me, settings);
  const pref = preferenceSummary(prefs);
  const notifOn = Object.values(settings.notifications).filter(Boolean).length;
  const theme: ScrapTheme = me.theme ?? { paper: "vanilla", tape: "butter" };

  return (
    <main className="relative px-5 pb-12 pt-5 md:px-8 lg:px-10 lg:pt-8">
      <div className="absolute right-4 top-4 z-10 lg:hidden"><NotificationBell /></div>
      <div className="lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-10">
        {/* ---------- Left: who you are ---------- */}
        <div className="space-y-5 lg:sticky lg:top-6">
          <section aria-labelledby="me-name" className="relative md:grid md:grid-cols-[230px_1fr] md:items-center md:gap-8 lg:block">
            <div className="mx-auto w-[78%] max-w-[300px] pt-3 md:w-full lg:w-[86%]">
              {me.moments[0]
                ? <Moment m={me.moments[0]} i={0} size="lg" tape={theme.tape} />
                : <Link href="/profile/edit#moments" className="grid aspect-[4/4.4] place-items-center rounded-[10px] border-2 border-dashed border-charcoal/30 bg-paper text-muted"><span className="flex flex-col items-center gap-2"><Plus /> Add your first moment</span></Link>}
            </div>
            <div>
            <div className="mt-4 text-center md:text-left">
              <h1 id="me-name" className="text-[32px] leading-tight">{me.name}, {me.age}</h1>
              <p className="mt-0.5 flex flex-wrap items-center justify-center gap-x-1.5 text-[14.5px] text-muted md:justify-start">
                {area ? <span className="inline-flex items-center gap-1"><MapPin size={14} />{area}</span> : <span className="inline-flex items-center gap-1"><Lock size={13} />Location hidden</span>}
                {me.pronouns && <span>{me.pronouns}</span>}
              </p>
              <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 md:justify-start">
                {me.verified && <Badge><span title="Passed Isle’s automatic selfie check: a live camera check matched to their scrapbook photos. It isn’t a promise about character, so keep using the safety tools.">✓ Selfie-checked</span></Badge>}
                {me.reliable && <Badge tone="peri">Reliable</Badge>}
                <Badge tone="coral">{INTENT_LABEL[me.intent]}</Badge>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button href="/profile/edit"><Pencil size={17} /> Edit</Button>
              <Button variant="secondary" href="/u/me"><Eye size={17} /> Preview</Button>
            </div>
            <p className="mt-2 text-center text-[12.5px] text-muted md:text-left">Preview shows your scrapbook exactly as others see it.</p>
            </div>
          </section>

          <Completion me={me} c={completion} />
          {LIVE && !me.verified && (
            <Link href="/verify" className="mt-4 flex items-center gap-3 rounded-[20px] bg-sage-soft p-3.5 text-sage-ink shadow-soft">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-sage text-charcoal"><ShieldCheck size={20} /></span>
              <span className="flex-1"><span className="block font-semibold text-charcoal">Get your Selfie-checked badge</span><span className="block text-[13px]">One minute with your camera. Needed to host Tables.</span></span>
              <ChevronRight size={18} />
            </Link>
          )}
          <CocoReview />

          {/* Private to you */}
          <section aria-labelledby="private" className="rounded-[26px] border-2 border-dashed border-charcoal/25 p-4">
            <h2 id="private" className="flex items-center gap-2 text-[17px]"><Lock size={16} /> Only you can see this</h2>
            <dl className="mt-3 space-y-3 text-[14.5px]">
              <div>
                <dt className="font-semibold">Show-up record</dt>
                <dd className="text-muted">{attended ? `${attended} date${attended > 1 ? "s" : ""} attended.` : "No dates yet."} {me.reliable ? "Your profile shows a Reliable badge, never a count." : "After a few attended dates, a Reliable badge appears. Counts and no-shows are never shown."}</dd>
              </div>
              <div>
                <dt className="font-semibold">Location others see</dt>
                <dd className="mt-1.5 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Location others see">
                  {(Object.keys(LOCATION_LABEL) as LocationVisibility[]).map((v) => {
                    const on = (settings.locationVisibility ?? "area") === v;
                    return (
                      <button key={v} role="radio" aria-checked={on} onClick={() => setSettings({ locationVisibility: v })}
                        className={clsx("min-h-11 rounded-[12px] border-2 text-[13px] font-semibold transition", on ? "border-charcoal bg-sage text-charcoal" : "border-line bg-paper text-muted hover:border-charcoal/40")}>
                        {LOCATION_LABEL[v]}
                      </button>
                    );
                  })}
                </dd>
                <p className="mt-1.5 text-[12.5px] text-muted">Your exact location is never shared.</p>
              </div>
            </dl>
          </section>
        </div>

        {/* ---------- Right: your scrapbook ---------- */}
        <section aria-labelledby="scrapbook" className="mt-8 rounded-[32px] p-3 transition-colors md:p-4 lg:mt-0" style={{ background: PAPER_BG[theme.paper] }}>
          <div className="mb-4 flex items-end justify-between px-1">
            <h2 id="scrapbook" className="text-[26px]">Your scrapbook</h2>
            <span className="font-hand text-[20px] text-muted">{completion.done} of {completion.total} pieces</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Scrap tone={TONE.moments} title="Moments" edit="moments" className="md:col-span-2" note={`${me.moments.length}/6`}>
              <MomentSlots moments={me.moments} tape={theme.tape} onChange={(moments) => updateMe({ moments })} />
            </Scrap>

            <Scrap tone={TONE.hottake} title="Hot take" edit="hottake" tape>
              {hot.answer ? (
                <>
                  {hot.prompt && <p className="text-[13.5px] font-semibold text-butter-ink/80">{hot.prompt}</p>}
                  <p className="mt-0.5 font-display text-[22px] font-extrabold leading-snug text-butter-ink">{hot.answer}</p>
                </>
              ) : <Missing text="Add a hot take people can react to." href="hottake" />}
            </Scrap>

            <Scrap tone={TONE.interests} title="Interests" edit="interests" note={`${me.interests.length}`}>
              {me.interests.length
                ? <div className="flex flex-wrap gap-2">{me.interests.map((t) => <Chip key={t}>{t}</Chip>)}</div>
                : <Missing text="Pick a few interests for better date ideas." href="interests" />}
            </Scrap>

            <Scrap tone={TONE.starter} title="Starter pack" edit="starter" note={`${me.starterPack.length}/5`}>
              {me.starterPack.length
                ? <div className="flex flex-wrap gap-2.5 py-1">{me.starterPack.map((s, i) => <StarterSticker key={s} text={s} i={i} />)}</div>
                : <Missing text="Add 3 to 5 things that sum you up." href="starter" />}
            </Scrap>

            <Scrap tone={TONE.voice} title="Voice note" edit="voice">
              {me.voice ? (
                <>
                  <VoiceNote v={me.voice} bare />
                  <Button variant="secondary" className="mt-3 !min-h-11 w-full" onClick={() => setVoiceOpen(true)}>{me.voice.audioUrl ? "Re-record or change" : "Record your voice"}</Button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Coco mood="thinking" size={56} bob={false} />
                  <div className="flex-1">
                    <p className="text-[14px] text-peri-ink">15 seconds of you. Optional, but people love them.</p>
                    <Button className="mt-2 !min-h-11" onClick={() => setVoiceOpen(true)}>Record a voice note</Button>
                  </div>
                </div>
              )}
            </Scrap>

            <Scrap tone={TONE.tot} title="This or That" edit="tot" className="md:col-span-2" note={`${Object.keys(me.thisOrThat).length}/10`} dark>
              {Object.keys(me.thisOrThat).length ? (
                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {THIS_OR_THAT.filter((q) => me.thisOrThat[q.id]).map((q) => (
                    <li key={q.id} className="flex items-center gap-1.5" aria-label={`${q.a} or ${q.b}: you picked ${me.thisOrThat[q.id] === "a" ? q.a : q.b}`}>
                      {(["a", "b"] as const).map((side) => {
                        const on = me.thisOrThat[q.id] === side;
                        return (
                          <span key={side} className={clsx("flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full px-2 text-[13.5px] font-bold",
                            on ? "bg-butter text-charcoal" : "border-2 border-dashed border-paper/25 text-paper/55")}>
                            {on && <Check size={14} strokeWidth={3} />}{side === "a" ? q.a : q.b}
                          </span>
                        );
                      })}
                    </li>
                  ))}
                </ul>
              ) : <Missing text="Answer a few quick picks." href="tot" dark />}
            </Scrap>

            <section aria-labelledby="custom" className="rounded-[26px] border-2 border-dashed border-charcoal/20 p-4 md:col-span-2">
              <h3 id="custom" className="text-[17px]">Make it yours</h3>
              <p className="text-[13px] text-muted">Your page colour and tape show on your public scrapbook too.</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Swatches label="Page" value={theme.paper} options={Object.keys(PAPER_BG) as PaperTone[]} color={(k) => PAPER_BG[k as PaperTone]}
                  onPick={(k) => { updateMe({ theme: { ...theme, paper: k as PaperTone } }); }} />
                <Swatches label="Tape" value={theme.tape} options={Object.keys(TAPE_BG)} color={(k) => TAPE_BG[k as ScrapTheme["tape"]]}
                  onPick={(k) => { updateMe({ theme: { ...theme, tape: k as ScrapTheme["tape"] } }); }} />
              </div>
            </section>
          </div>
        </section>
      </div>

      {/* ---------- Settings: clearly separate from the scrapbook ---------- */}
      <section aria-labelledby="settings" className="mt-10 border-t-2 border-dashed border-charcoal/15 pt-8">
        <h2 id="settings" className="text-[22px]">Account and settings</h2>
        <nav aria-label="Settings" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <SettingRow href="/plus" icon={<Sparkles size={20} />} label="Isle Plus" summary={plusOn ? `On until ${new Date(plus!.until).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Free Tables seat monthly, 15% off café dates, and more"} />
          <SettingRow href="/profile/settings/preferences" icon={<SlidersHorizontal size={20} />} label="Dating preferences" summary={`${pref.who}, ages ${pref.ages}, within ${pref.distance}`} />
          <SettingRow href="/profile/settings/privacy" icon={<UserCheck size={20} />} label="Verification and privacy" summary={`${me.verified ? "Selfie-checked" : "Not checked"}. Location: ${LOCATION_LABEL[settings.locationVisibility ?? "area"].toLowerCase()}`} />
          <SettingRow href="/profile/settings/battery" icon={<BatteryMedium size={20} />} label="Social battery" summary={`${BATTERY[me.battery].emoji} ${BATTERY[me.battery].label}: ${BATTERY[me.battery].desc.toLowerCase()}`} />
          <SettingRow href="/profile/settings/notifications" icon={<Bell size={20} />} label="Notifications" summary={`${notifOn} of 4 on`} />
          <SettingRow href="/profile/settings/safety" icon={<ShieldCheck size={20} />} label="Safety" summary={settings.trustedContact ? `Trusted contact: ${settings.trustedContact.name}` : "Add a trusted contact for dates"} />
          <button onClick={() => { signOut(); location.href = "/"; }}
            className="group flex min-h-[72px] items-center gap-3 rounded-[20px] border-2 border-line bg-paper px-4 text-left transition hover:border-danger/50 focus-visible:border-danger">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-vanilla text-danger"><LogOut size={20} /></span>
            <span className="font-semibold text-danger">Sign out</span>
          </button>
          <DeleteAccount trigger={(open) => (
            <button onClick={open} className="group flex min-h-[72px] items-center gap-3 rounded-[20px] border-2 border-line bg-paper px-4 text-left transition hover:border-danger/50 focus-visible:border-danger">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-vanilla text-danger"><Trash2 size={20} /></span>
              <span><span className="block font-semibold text-danger">Delete account</span><span className="block text-[12.5px] text-muted">Removes everything, permanently</span></span>
            </button>
          )} />
        </nav>
        <AdminLink />
        <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          <Link href="/terms" className="underline underline-offset-2">Terms</Link>
          <Link href="/privacy" className="underline underline-offset-2">Privacy policy</Link>
          <Link href="/guidelines" className="underline underline-offset-2">Community guidelines</Link>
        </p>
        <DemoClock />
      </section>

      <Sheet open={voiceOpen} onClose={() => setVoiceOpen(false)} title="Your voice note">
        <VoiceRecorder value={me.voice} onChange={(v) => updateMe({ voice: v ?? undefined })} />
        <Button full className="mt-4" onClick={() => { setVoiceOpen(false); toast("Voice note saved", "good"); }}>Done</Button>
      </Sheet>
    </main>
  );
}

function Scrap({ tone, title, edit, note, tape, dark, className, children }: { tone: string; title: string; edit: string; note?: string; tape?: boolean; dark?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <section className={clsx("relative rounded-[26px] p-4 shadow-soft", tone, className)} aria-label={title}>
      {tape && <span className="tape" aria-hidden />}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className={clsx("flex items-baseline gap-2 text-[17px]", dark && "text-paper")}>
          {title}{note && <span className={clsx("font-hand text-[18px] font-normal", dark ? "text-paper/60" : "text-muted")}>{note}</span>}
        </h3>
        <Link href={`/profile/edit#${edit}`} aria-label={`Edit ${title.toLowerCase()}`}
          className={clsx("grid h-10 w-10 place-items-center rounded-full transition", dark ? "text-paper/80 hover:bg-paper/10" : "text-charcoal/70 hover:bg-charcoal/5")}>
          <Pencil size={16} />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Missing({ text, href, dark }: { text: string; href: string; dark?: boolean }) {
  return (
    <Link href={`/profile/edit#${href}`} className={clsx("flex min-h-12 flex-1 items-center gap-2 rounded-[14px] border-2 border-dashed px-3 text-[14px] font-medium transition", dark ? "border-paper/30 text-paper/80 hover:border-paper/60" : "border-charcoal/20 text-muted hover:border-charcoal/45 hover:text-charcoal")}>
      <Plus size={16} className="shrink-0" /> {text}
    </Link>
  );
}

function Completion({ me, c }: { me: Profile; c: ReturnType<typeof profileCompletion> }) {
  const firstMissing = c.items.find((i) => !i.done);
  const mood = c.pct === 100 ? "celebrating" : c.pct >= 50 ? "excited" : "curious";
  const msg = c.pct === 100
    ? `Your scrapbook is complete, ${me.name}! It looks so you.`
    : firstMissing ? `Looking good! When you feel like it, ${firstMissing.hint}` : "Looking good!";
  return (
    <section aria-labelledby="completion" className="rounded-[26px] bg-paper p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <Coco mood={mood} size={64} bob={false} />
        <div className="relative flex-1 rounded-[18px] rounded-tl-[6px] bg-vanilla px-3 py-2.5 text-[14px] leading-snug">{msg}</div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <h2 id="completion" className="text-[16px]">Scrapbook progress</h2>
        <span className="text-[13px] font-bold text-coral-ink">{c.pct}%</span>
      </div>
      <div className="mt-2 grid grid-cols-6 gap-1" role="progressbar" aria-valuenow={c.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Scrapbook progress">
        {c.items.map((it, i) => (
          <motion.span key={it.id} className={clsx("h-2.5 rounded-full", it.done ? "bg-coral" : "bg-line")} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.05, duration: 0.2 }} style={{ transformOrigin: "left" }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-1.5">
        {c.items.map((it) => (
          <li key={it.id}>
            <Link href={`/profile/edit#${it.id}`} className={clsx("flex min-h-10 items-center gap-1.5 rounded-[12px] px-2 text-[13px] transition hover:bg-vanilla", it.done ? "text-charcoal" : "text-muted")}>
              <span className={clsx("grid h-5 w-5 shrink-0 place-items-center rounded-full", it.done ? "bg-sage text-charcoal" : "border-2 border-dashed border-charcoal/30")}>{it.done && <Check size={12} strokeWidth={3} />}</span>
              <span className="truncate font-medium">{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      {c.pct < 100 && <p className="mt-2 text-[12px] text-muted">Totally optional. More pieces just give people more to react to.</p>}
    </section>
  );
}

function SettingRow({ href, icon, label, summary }: { href: string; icon: React.ReactNode; label: string; summary: string }) {
  return (
    <Link href={href} className="group flex min-h-[72px] items-center gap-3 rounded-[20px] border-2 border-line bg-paper px-4 transition hover:border-charcoal/40 hover:bg-white focus-visible:border-charcoal active:scale-[0.99]">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-vanilla text-charcoal transition group-hover:bg-coral-soft">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="block truncate text-[13px] text-muted">{summary}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function Swatches({ label, value, options, color, onPick }: { label: string; value: string; options: string[]; color: (k: string) => string; onPick: (k: string) => void }) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label={`${label} colour`}>
      <span className="w-10 text-[13px] font-semibold">{label}</span>
      {options.map((k) => (
        <button key={k} role="radio" aria-checked={value === k} aria-label={`${label}: ${k}`} onClick={() => onPick(k)}
          className={clsx("h-9 w-9 rounded-full border-2 transition", value === k ? "scale-110 border-charcoal ring-2 ring-charcoal ring-offset-2 ring-offset-vanilla" : "border-charcoal/25 hover:border-charcoal")}
          style={{ background: color(k) }} />
      ))}
    </div>
  );
}

/** Visible only to moderators. */
function AdminLink() {
  const [ok, setOk] = useState(false);
  useEffect(() => { void amAdmin().then(setOk); }, []);
  if (!ok) return null;
  return <Link href="/admin" className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-charcoal/40 font-semibold">Moderation and metrics</Link>;
}

/** Isle Plus: Coco's honest scrapbook review and best cover photo. Free members see what it does. */
function CocoReview() {
  const { me, plus, now, updateMe } = useYaar();
  if (!me) return null;
  if (!isPlus(plus, now())) return <PlusLock className="mt-4" title="Coco's scrapbook review" body="Honest tips on your photos, captions and hot take, and which photo makes the best cover." />;
  const r = scrapbookReview(me);
  const best = me.moments.filter((m) => m.photoUrl).sort((a, b) => (b.caption?.length ?? 0) - (a.caption?.length ?? 0))[0];
  return (
    <section className="mt-4 rounded-[24px] bg-paper p-4 shadow-soft" aria-labelledby="coco-review">
      <div className="flex items-center gap-3">
        <Coco mood={r.score >= 80 ? "cheering" : "thinking"} size={56} bob={false} />
        <div className="flex-1">
          <h2 id="coco-review" className="flex items-center gap-2 text-[17px]">Coco&apos;s review <PlusTag /></h2>
          <p className="text-[13px] text-muted">Scrapbook strength: <b className="text-charcoal">{r.score}%</b></p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5 text-[13.5px]">
        {r.tips.map((t) => (
          <li key={t.text} className="flex items-start gap-2">
            <span className={clsx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold", t.ok ? "bg-sage text-charcoal" : "bg-butter text-charcoal")}>{t.ok ? "✓" : "!"}</span>
            {t.href && !t.ok ? <Link href={t.href} className="underline-offset-2 hover:underline">{t.text}</Link> : <span className={t.ok ? "text-muted" : ""}>{t.text}</span>}
          </li>
        ))}
      </ul>
      {r.coverTip && best && (
        <div className="mt-3 flex items-center gap-2 rounded-[16px] bg-butter-soft p-3 text-[13.5px] text-butter-ink">
          <span className="flex-1">{r.coverTip}</span>
          <Button variant="secondary" className="!min-h-9 shrink-0 !px-3" onClick={() => updateMe({ moments: [best, ...me.moments.filter((m) => m.id !== best.id)] })}>Make cover</Button>
        </div>
      )}
    </section>
  );
}
