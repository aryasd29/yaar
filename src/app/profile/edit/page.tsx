"use client";
import { DIET, HABIT, LANGUAGES, PETS } from "@/lib/plus";
import type { Diet, Habit, Pets } from "@/lib/types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check } from "lucide-react";
import { MomentSlots } from "@/components/MomentSlots";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Frame, Loading, useRequireMe } from "@/components/Shell";
import { Button, Card, Chip, SectionLabel, TopBar } from "@/components/ui";
import { useYaar } from "@/lib/store";
import { INTEREST_TAGS, STARTER_SUGGESTIONS, THIS_OR_THAT } from "@/lib/seed";
import { INTENT_LABEL, type Intent, type Profile } from "@/lib/types";
import { splitHotTake } from "@/lib/logic";

export default function EditPage() {
  return <Frame><Edit /></Frame>;
}

function Edit() {
  const me = useRequireMe();
  if (!me) return <Loading />;
  return <EditForm me={me} />;
}

function EditForm({ me }: { me: Profile }) {
  const router = useRouter();
  const { updateMe, toast } = useYaar();
  const [d, setD] = useState<Profile>(() => { const h = splitHotTake(me); return { ...me, hotTake: h.answer, hotTakePrompt: h.prompt }; });
  const [err, setErr] = useState("");
  // Arriving from the profile's "edit this section" links: scroll to that section.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }, []);
  const set = (patch: Partial<Profile>) => { setD({ ...d, ...patch }); setErr(""); };

  const save = () => {
    if (d.moments.length < 3) return setErr("Keep at least 3 moments.");
    if (d.moments.some((m) => !m.caption.trim())) return setErr("Every moment needs a caption.");
    if (d.starterPack.length < 3) return setErr("Your starter pack needs at least 3 things.");
    if (d.hotTake.trim().length < 8) return setErr("Your hot take is a bit short.");
    updateMe(d); toast("Scrapbook saved", "good"); router.push("/profile");
  };

  return (
    <>
      <TopBar back="/profile" title="Edit scrapbook" />
      <main className="space-y-6 px-5 pb-6">
        <section id="moments" className="scroll-mt-20">
          <SectionLabel>Moments ({d.moments.length}/6)</SectionLabel>
          <MomentSlots moments={d.moments} tape={d.theme?.tape} onChange={(moments) => set({ moments })} />
        </section>

        <section id="intent" className="scroll-mt-20">
          <SectionLabel>Shared Intent</SectionLabel>
          <div className="space-y-2">{(Object.keys(INTENT_LABEL) as Intent[]).map((k) => (
            <button key={k} onClick={() => set({ intent: k })} aria-pressed={d.intent === k} className={clsx("min-h-12 w-full rounded-[16px] border-2 px-4 text-left text-[15px]", d.intent === k ? "border-coral bg-coral-soft" : "border-line bg-paper")}>{INTENT_LABEL[k]}</button>
          ))}</div>
        </section>

        <section id="starter" className="scroll-mt-20">
          <SectionLabel>Starter pack ({d.starterPack.length}/5)</SectionLabel>
          <div className="flex flex-wrap gap-2">{[...new Set([...STARTER_SUGGESTIONS, ...d.starterPack])].map((s) => (
            <Chip key={s} active={d.starterPack.includes(s)} onClick={() => set({ starterPack: d.starterPack.includes(s) ? d.starterPack.filter((x) => x !== s) : d.starterPack.length < 5 ? [...d.starterPack, s] : d.starterPack })}>{s}</Chip>
          ))}</div>
        </section>

        <section id="interests" className="scroll-mt-20">
          <SectionLabel>Interests</SectionLabel>
          <div className="flex flex-wrap gap-2">{INTEREST_TAGS.map((t) => <Chip key={t} active={d.interests.includes(t)} onClick={() => set({ interests: d.interests.includes(t) ? d.interests.filter((x) => x !== t) : [...d.interests, t] })}>{t}</Chip>)}</div>
        </section>

        <section id="hottake" className="scroll-mt-20">
          <SectionLabel>Hot take</SectionLabel>
          {d.hotTakePrompt && <p className="mb-1.5 text-[14px] font-semibold text-muted">{d.hotTakePrompt}</p>}
          <textarea value={d.hotTake} onChange={(e) => set({ hotTake: e.target.value })} rows={2} maxLength={140} aria-label="Hot take" className="w-full rounded-[14px] border-2 border-line bg-paper px-4 py-3 text-[16px] outline-none focus:border-coral" />
        </section>

        <section id="voice" className="scroll-mt-20">
          <SectionLabel>Voice note</SectionLabel>
          <VoiceRecorder value={d.voice} onChange={(v) => set({ voice: v ?? undefined })} />
        </section>

        <section id="tot" className="scroll-mt-20">
          <SectionLabel>This or That</SectionLabel>
          <Card className="space-y-2">{THIS_OR_THAT.map((q) => (
            <div key={q.id} className="grid grid-cols-2 gap-2">{(["a", "b"] as const).map((side) => (
              <button key={side} onClick={() => set({ thisOrThat: { ...d.thisOrThat, [q.id]: side } })} aria-pressed={d.thisOrThat[q.id] === side} className={clsx("flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] border-2 text-[14px] font-semibold transition", d.thisOrThat[q.id] === side ? "border-charcoal bg-butter text-charcoal" : d.thisOrThat[q.id] ? "border-line text-muted" : "border-line hover:border-charcoal/40")}>{d.thisOrThat[q.id] === side && <Check size={15} strokeWidth={3} />}{side === "a" ? q.a : q.b}</button>
            ))}</div>
          ))}</Card>
        </section>
        <section id="lifestyle" className="scroll-mt-20">
          <SectionLabel>Lifestyle (optional)</SectionLabel>
          <Card className="space-y-4">
            <p className="text-[13px] text-muted">Only used by people&apos;s lifestyle filters. Leave anything blank and you&apos;ll never be filtered out on it.</p>
            <LifestyleRow label="Food" options={Object.entries(DIET)} value={d.lifestyle?.diet} onChange={(v) => set({ lifestyle: { ...d.lifestyle, diet: v as Diet | undefined } })} />
            <LifestyleRow label="Drinking" options={Object.entries(HABIT)} value={d.lifestyle?.drinks} onChange={(v) => set({ lifestyle: { ...d.lifestyle, drinks: v as Habit | undefined } })} />
            <LifestyleRow label="Smoking" options={Object.entries(HABIT)} value={d.lifestyle?.smokes} onChange={(v) => set({ lifestyle: { ...d.lifestyle, smokes: v as Habit | undefined } })} />
            <LifestyleRow label="Pets" options={Object.entries(PETS)} value={d.lifestyle?.pets} onChange={(v) => set({ lifestyle: { ...d.lifestyle, pets: v as Pets | undefined } })} />
            <div>
              <p className="mb-1.5 text-[13px] font-semibold">Languages you speak</p>
              <div className="flex flex-wrap gap-2">{LANGUAGES.map((l) => { const on = d.lifestyle?.languages?.includes(l); return (
                <Chip key={l} active={on} onClick={() => set({ lifestyle: { ...d.lifestyle, languages: on ? d.lifestyle!.languages!.filter((x) => x !== l) : [...(d.lifestyle?.languages ?? []), l] } })}>{l}</Chip>); })}</div>
            </div>
          </Card>
        </section>
      </main>
      <div className="sticky bottom-0 z-20 bg-gradient-to-t from-vanilla via-vanilla to-vanilla/0 px-5 pb-6 pt-6">
        {err && <p role="alert" className="mb-2 rounded-xl bg-coral-soft px-3 py-2 text-[13.5px] text-coral-ink">{err}</p>}
        <Button full onClick={save}>Save scrapbook</Button>
      </div>
    </>
  );
}

function LifestyleRow({ label, options, value, onChange }: { label: string; options: [string, string][]; value?: string; onChange: (v: string | undefined) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">{options.map(([k, l]) => <Chip key={k} active={value === k} onClick={() => onChange(value === k ? undefined : k)}>{l}</Chip>)}</div>
    </div>
  );
}
