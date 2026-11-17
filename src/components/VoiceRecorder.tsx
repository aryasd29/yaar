"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Mic, Pause, Play, RotateCcw, Square, Trash2 } from "lucide-react";
import { Button, Chip } from "./ui";
import { VOICE_PROMPTS } from "@/lib/seed";
import type { Profile } from "@/lib/types";

type Voice = NonNullable<Profile["voice"]>;
const MAX = 15;
const BARS = 32;

/**
 * Record, listen back, re-record or delete a 15-second voice note.
 * Uses the real microphone (MediaRecorder + a live level meter). Falls back to a caption if the mic isn't available.
 */
export function VoiceRecorder({ value, onChange }: { value: Voice | null | undefined; onChange: (v: Voice | null) => void }) {
  const [prompt, setPrompt] = useState(value?.prompt ?? VOICE_PROMPTS[0]);
  const [phase, setPhase] = useState<"idle" | "recording" | "done">(value?.audioUrl ? "done" : "idle");
  const [secs, setSecs] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.08));
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const transcript = value?.transcript ?? "";

  const cleanup = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
  };
  useEffect(() => () => { cleanup(); audio.current?.pause(); }, []);

  const start = async () => {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Recording isn't supported in this browser. You can add a caption now and record later on your phone.");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
      ctx.createMediaStreamSource(s).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const history: number[] = Array(BARS).fill(0.08);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0; for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
        history.push(Math.max(0.08, Math.min(1, peak * 2.2))); history.shift();
        setLevels([...history]);
        raf.current = requestAnimationFrame(tick);
      };
      tick();
      const mr = new MediaRecorder(s); const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        cleanup(); void ctx.close();
        const seconds = Math.max(1, Math.min(MAX, Math.round((Date.now() - startedAt.current) / 1000)));
        const r = new FileReader();
        r.onload = () => { onChange({ prompt, seconds, transcript, audioUrl: String(r.result) }); setPhase("done"); };
        r.readAsDataURL(new Blob(chunks, { type: mr.mimeType || "audio/webm" }));
      };
      rec.current = mr; startedAt.current = Date.now(); mr.start(); setPhase("recording"); setSecs(0);
      timer.current = setInterval(() => {
        const t = Math.floor((Date.now() - startedAt.current) / 1000);
        setSecs(t);
        if (t >= MAX && mr.state === "recording") mr.stop();
      }, 200);
    } catch {
      setError("We couldn't use your microphone. Check the browser's mic permission, or add a caption for now.");
    }
  };
  const stop = () => { if (rec.current?.state === "recording") rec.current.stop(); };

  const toggle = () => {
    if (!value?.audioUrl) return;
    if (!audio.current || audio.current.src !== value.audioUrl) {
      audio.current?.pause();
      audio.current = new Audio(value.audioUrl);
      audio.current.ontimeupdate = () => setProgress(audio.current ? audio.current.currentTime / (value.seconds || 1) : 0);
      audio.current.onended = () => { setPlaying(false); setProgress(0); };
    }
    if (playing) { audio.current.pause(); setPlaying(false); } else { void audio.current.play(); setPlaying(true); }
  };

  const bars = phase === "recording" ? levels : Array.from({ length: BARS }, (_, i) => 0.18 + (((i * 37) % 23) / 23) * (value?.audioUrl ? 0.75 : 0.25));

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Voice note prompt">
        {VOICE_PROMPTS.map((p) => <Chip key={p} tone="peri" active={prompt === p} onClick={() => { setPrompt(p); if (value) onChange({ ...value, prompt: p }); }}>{p}</Chip>)}
      </div>
      <div className="mt-4 rounded-[22px] border-2 border-charcoal bg-paper p-4">
        <div className="flex h-16 items-center gap-[3px]" aria-hidden>
          {bars.map((h, i) => (
            <span key={i} className={clsx("flex-1 rounded-full transition-[height] duration-75",
              phase === "recording" ? "bg-coral" : value?.audioUrl ? (i / BARS < progress ? "bg-coral" : "bg-peri-ink/70") : "bg-line")}
              style={{ height: `${Math.round(h * 100)}%` }} />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-display text-[18px] font-extrabold" aria-live="polite">
            {phase === "recording" ? <><span className="mr-2 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-danger align-middle" />0:{String(secs).padStart(2, "0")} / 0:{MAX}</>
              : value?.audioUrl ? `0:${String(value.seconds).padStart(2, "0")} recorded` : value ? "Caption only" : "Up to 15 seconds"}
          </span>
          <div className="flex gap-2">
            {phase === "recording" ? (
              <Button onClick={stop} className="!min-h-11"><Square size={16} /> Stop</Button>
            ) : value?.audioUrl ? (
              <>
                <Button variant="secondary" onClick={toggle} className="!min-h-11 !px-4" aria-label={playing ? "Pause" : "Play your voice note"}>{playing ? <Pause size={17} /> : <Play size={17} />}</Button>
                <Button variant="secondary" onClick={() => { audio.current?.pause(); setPlaying(false); void start(); }} className="!min-h-11 !px-4" aria-label="Record again"><RotateCcw size={17} /></Button>
                <Button variant="danger" onClick={() => { audio.current?.pause(); setPlaying(false); onChange(transcript ? { prompt, seconds: 0, transcript } : null); setPhase("idle"); }} className="!min-h-11 !px-4" aria-label="Delete recording"><Trash2 size={17} /></Button>
              </>
            ) : (
              <Button onClick={start} className="!min-h-11"><Mic size={17} /> Record</Button>
            )}
          </div>
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-butter-soft px-3 py-2 text-[13.5px] text-butter-ink">{error}</p>}
      </div>
      <label className="mt-4 block text-[13px] font-semibold" htmlFor="voice-caption">Caption (shown with your note, and helps people who can&apos;t play audio)</label>
      <textarea id="voice-caption" value={transcript} rows={2} maxLength={160}
        onChange={(e) => { const t = e.target.value; onChange(value ? { ...value, transcript: t } : t.trim() ? { prompt, seconds: 0, transcript: t } : null); }}
        className="mt-1.5 w-full rounded-[14px] border-2 border-line bg-paper px-4 py-3 text-[16px] outline-none focus:border-coral" placeholder="An auto driver once gave me a full TED talk…" />
    </div>
  );
}
