"use client";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Camera, Keyboard, ScanLine } from "lucide-react";
import { Button, Input } from "./ui";
import { useYaar } from "@/lib/store";
import { LIVE } from "@/lib/remote";
import type { DatePlan, Profile } from "@/lib/types";

/**
 * Checking in together at the date. Each person has a private 6-letter code for this date.
 * Scanning (or typing) the other person's code proves you're in the same place, and the database
 * checks you both in. Works with the phone camera (BarcodeDetector, or jsQR where that's missing).
 */
export function CheckIn({ plan, them, me, onDone }: { plan: DatePlan; them: Profile; me: Profile; onDone: () => void }) {
  const { checkIn, updatePlan, toast } = useYaar();
  const [code, setCode] = useState<string | null>(LIVE ? null : "DEMO42");
  const [mode, setMode] = useState<"show" | "scan" | "type">("show");
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => { if (LIVE) void import("@/lib/live").then((l) => l.myCheckinCode(plan.id)).then(setCode); }, [plan.id]);

  const submit = async (raw: string) => {
    const theirs = raw.trim().toUpperCase().replace(/^ISLE:[^:]+:/, "");
    if (!/^[A-Z0-9]{6}$/.test(theirs)) { setErr("That isn't an Isle check-in code."); return; }
    setBusy(true); setErr("");
    if (!LIVE) { finish(); return; }
    const r = await (await import("@/lib/live")).checkIn(plan.id, theirs);
    setBusy(false);
    const msg: Record<string, string> = {
      wrong_code: `That code doesn't match ${them.name}'s. Ask them to open their check-in screen.`,
      too_early: "Check-in opens an hour before your date.",
      too_late: "Check-in for this date has closed.",
      no_time: "This date doesn't have a time yet.",
      error: "Couldn't check in. Check your connection and try again.",
    };
    if (r !== "ok") { setErr(msg[r] ?? msg.error); setMode("type"); return; }
    finish();
  };

  const finish = () => {
    checkIn(plan.id);
    updatePlan(plan.id, { checkins: { ...plan.checkins, [me.id]: true, [them.id]: true }, stage: "checkedin" });
    toast(`Checked in with ${them.name}. Have a lovely time!`, "good");
    onDone();
  };

  // Camera scanning
  useEffect(() => {
    if (mode !== "scan") return;
    let stream: MediaStream | null = null;
    let alive = true;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const v = video.current!;
        v.srcObject = stream; await v.play();
        const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
        const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
        const jsQR = detector ? null : (await import("jsqr")).default;
        const canvas = document.createElement("canvas");
        const loop = async () => {
          if (!alive) return;
          let text: string | null = null;
          if (detector) { const r = await detector.detect(v).catch(() => []); text = r[0]?.rawValue ?? null; }
          else if (jsQR && v.videoWidth) {
            canvas.width = v.videoWidth; canvas.height = v.videoHeight;
            const g = canvas.getContext("2d", { willReadFrequently: true })!; g.drawImage(v, 0, 0);
            const img = g.getImageData(0, 0, canvas.width, canvas.height);
            text = jsQR(img.data, img.width, img.height)?.data ?? null;
          }
          if (text?.startsWith("ISLE:")) { alive = false; stream?.getTracks().forEach((t) => t.stop()); void submit(text); return; }
          setTimeout(loop, 250);
        };
        void loop();
      } catch {
        setErr("Couldn't open the camera. Type their code instead.");
        setMode("type");
      }
    })();
    return () => { alive = false; stream?.getTracks().forEach((t) => t.stop()); };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center text-center">
      {mode === "scan" ? (
        <>
          <p className="text-[14px] text-muted">Point your camera at {them.name}&apos;s code.</p>
          <div className="relative mt-3 aspect-square w-full max-w-[280px] overflow-hidden rounded-[24px] border-4 border-charcoal bg-charcoal">
            <video ref={video} playsInline muted className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-[18%] rounded-[18px] border-4 border-dashed border-paper/80" />
          </div>
          <Button variant="ghost" className="mt-3" onClick={() => setMode("show")}>Show my code instead</Button>
        </>
      ) : (
        <>
          <p className="text-[14px] text-muted">Show this to {them.name}, or scan theirs. One scan checks you both in.</p>
          <div className="mt-4 rounded-[24px] bg-white p-4 shadow-soft">
            {code ? <QRCodeSVG value={`ISLE:${plan.id}:${code}`} size={200} fgColor="#1b2d45" /> : <div className="grid h-[200px] w-[200px] place-items-center text-muted">Loading…</div>}
          </div>
          <p className="mt-2 font-display text-[26px] font-extrabold tracking-[0.25em]" aria-label={`Your code: ${code?.split("").join(" ")}`}>{code ?? "······"}</p>
          <p className="text-[12.5px] text-muted">Your private code for this date only.</p>
          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <Button onClick={() => { setErr(""); setMode("scan"); }}><Camera size={17} /> Scan theirs</Button>
            <Button variant="secondary" onClick={() => { setErr(""); setMode("type"); }}><Keyboard size={17} /> Type theirs</Button>
          </div>
          {mode === "type" && (
            <form className="mt-3 w-full" onSubmit={(e) => { e.preventDefault(); void submit(typed); }}>
              <Input label={`${them.name}'s code`} value={typed} maxLength={6} autoCapitalize="characters" autoComplete="off" onChange={(e) => setTyped(e.target.value.toUpperCase())} />
              <Button full className="mt-2" disabled={busy || typed.length !== 6}><ScanLine size={17} /> {busy ? "Checking…" : "Check us in"}</Button>
            </form>
          )}
        </>
      )}
      {err && <p role="alert" className="mt-3 w-full rounded-xl bg-coral-soft px-3 py-2 text-[13.5px] text-coral-ink">{err}</p>}
    </div>
  );
}
