"use client";
import { useRef, useState } from "react";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, RefreshCw, Star, Trash2 } from "lucide-react";
import { Moment } from "./Moment";
import { Scene, type SceneKey } from "./Scene";
import { compressImage } from "@/lib/image";
import { uid } from "@/lib/logic";
import type { Moment as M, ScrapTheme } from "@/lib/types";

const SCENES: SceneKey[] = ["sunrise", "coffee", "books", "plant", "guitar", "dog", "cat", "dosa", "pottery", "boardgame", "beach", "cycle", "concert", "kitchen", "rain", "city"];

/**
 * Six moment slots. Every slot takes a real photo (compressed on the device), a caption,
 * and can be moved, made the cover (first) or removed. Illustrations remain as an option.
 */
export function MomentSlots({ moments, onChange, tape }: { moments: M[]; onChange: (m: M[]) => void; tape?: ScrapTheme["tape"] }) {
  const input = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<{ mode: "add" } | { mode: "replace"; id: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  const pick = (t: typeof target) => { setErr(null); setTarget(t); input.current?.click(); };
  const onFile = async (f?: File) => {
    if (!f || !target) return;
    setBusy(true); setErr(null);
    try {
      const photoUrl = await compressImage(f);
      if (target.mode === "add") { const m = { id: uid("mo"), photoUrl, caption: "" }; onChange([...moments, m]); setFocusId(m.id); }
      else onChange(moments.map((x) => (x.id === target.id ? { ...x, photoUrl, scene: undefined } : x)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong with that photo.");
    } finally { setBusy(false); setTarget(null); }
  };
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= moments.length) return; const n = [...moments]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
        {[...Array(6)].map((_, i) => {
          const m = moments[i];
          if (!m) {
            const next = i === moments.length;
            return (
              <button key={`empty-${i}`} type="button" disabled={!next || busy} onClick={() => pick({ mode: "add" })}
                className={clsx("flex aspect-[4/5] flex-col items-center justify-center gap-1.5 rounded-[12px] border-2 border-dashed text-[13px] font-semibold transition",
                  next ? "border-charcoal/35 text-charcoal hover:border-charcoal hover:bg-paper" : "border-charcoal/10 text-muted/50")}
                aria-label={next ? `Add photo to slot ${i + 1}` : `Slot ${i + 1}, add earlier slots first`}>
                {busy && next ? <Loader2 className="animate-spin" /> : <ImagePlus size={22} />}
                {next ? (busy ? "Adding…" : i === 0 ? "Add your cover photo" : "Add photo") : `Slot ${i + 1}`}
              </button>
            );
          }
          return (
            <div key={m.id} className="relative">
              <Moment m={{ ...m, caption: m.caption || " " }} i={i} size="sm" tape={tape} />
              {i === 0 && <span className="absolute -left-1 top-2 z-10 rounded-full border-2 border-charcoal bg-butter px-2 py-0.5 text-[11px] font-bold">Cover</span>}
              <input value={m.caption} maxLength={40} autoFocus={focusId === m.id}
                onChange={(e) => onChange(moments.map((x) => (x.id === m.id ? { ...x, caption: e.target.value } : x)))}
                placeholder="Write a caption" aria-label={`Caption for photo ${i + 1}`}
                className={clsx("mt-2 min-h-11 w-full rounded-[12px] border-2 bg-paper px-3 font-hand text-[19px] outline-none focus:border-coral", m.caption.trim() ? "border-line" : "border-coral/60")} />
              <div className="mt-1.5 flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <IconBtn label="Move earlier" onClick={() => move(i, -1)} disabled={i === 0}><ArrowLeft size={15} /></IconBtn>
                  <IconBtn label="Move later" onClick={() => move(i, 1)} disabled={i === moments.length - 1}><ArrowRight size={15} /></IconBtn>
                  {i !== 0 && <IconBtn label="Make cover photo" onClick={() => onChange([m, ...moments.filter((x) => x.id !== m.id)])}><Star size={15} /></IconBtn>}
                </div>
                <div className="flex gap-1">
                  <IconBtn label={`Replace photo ${i + 1}`} onClick={() => pick({ mode: "replace", id: m.id })}><RefreshCw size={15} /></IconBtn>
                  <IconBtn label={`Remove photo ${i + 1}`} onClick={() => onChange(moments.filter((x) => x.id !== m.id))}><Trash2 size={15} /></IconBtn>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {err && <p role="alert" className="mt-3 rounded-xl bg-coral-soft px-3 py-2 text-[13.5px] text-coral-ink">{err}</p>}
      <p className="mt-3 text-[12.5px] text-muted">
        Photos are resized on your device before saving. {moments.length < 3 && "Add at least 3. "}
        <button type="button" className="font-semibold text-charcoal underline underline-offset-2" onClick={() => setPicker(!picker)}>{picker ? "Hide illustrations" : "No photo handy? Use an illustration"}</button>
      </p>
      {picker && moments.length < 6 && (
        <div className="mt-3 grid grid-cols-4 gap-2 rounded-[18px] bg-paper p-3 shadow-soft sm:grid-cols-8">
          {SCENES.map((k) => (
            <button key={k} type="button" onClick={() => { const m = { id: uid("mo"), scene: k, caption: "" }; onChange([...moments, m]); setFocusId(m.id); }}
              className="aspect-square overflow-hidden rounded-xl border-2 border-transparent hover:border-charcoal active:scale-95" aria-label={`Add ${k} illustration`}>
              <Scene k={k} className="h-full w-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-full border-2 border-line bg-paper text-charcoal transition hover:border-charcoal disabled:opacity-30 disabled:hover:border-line">
      {children}
    </button>
  );
}
