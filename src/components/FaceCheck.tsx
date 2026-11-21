"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, RotateCcw, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { Button } from "./ui";
import { Coco } from "./Coco";
import type { Profile } from "@/lib/types";

/**
 * Isle's automatic selfie check, run entirely on this device with open-source face models (face-api, MIT).
 *  1. Liveness: a live face that turns to one side, then the other, then smiles. A printed photo or a still
 *     image on a screen can't do this.
 *  2. Match: the face in the camera is compared with the faces in the member's scrapbook photos.
 * If both pass, the selfie is stored privately for spot checks and the badge is granted by the database.
 */
type FaceApi = typeof import("@vladmandic/face-api");
type Phase = "intro" | "loading" | "noref" | "camera" | "straight" | "side1" | "side2" | "smile" | "checking" | "passed" | "failed" | "error";

const PROMPT: Partial<Record<Phase, string>> = {
  straight: "Look straight at the camera",
  side1: "Slowly turn your head to one side",
  side2: "Now turn to the other side",
  smile: "Last one: give us a smile",
  checking: "Checking it's you…",
};
const STEP_ORDER: Phase[] = ["straight", "side1", "side2", "smile"];

export function FaceCheck({ me, onVerified }: { me: Profile; onVerified: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const api = useRef<FaceApi | null>(null);
  const refs = useRef<Float32Array[]>([]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [msg, setMsg] = useState("");
  const [hint, setHint] = useState("");
  const [running, setRunning] = useState(false);
  const photos = me.moments.filter((m) => m.photoUrl).map((m) => m.photoUrl!);

  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  useEffect(() => () => stop(), []);

  const start = async () => {
    setPhase("loading"); setMsg("");
    try {
      const faceapi = api.current ?? (await import("@vladmandic/face-api"));
      api.current = faceapi;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        faceapi.nets.faceExpressionNet.loadFromUri("/models"),
      ]);
      // Faces in the scrapbook to compare against
      refs.current = [];
      for (const url of photos.slice(0, 6)) {
        try {
          const img = await faceapi.fetchImage(url);
          const d = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })).withFaceLandmarks(true).withFaceDescriptor();
          if (d) refs.current.push(d.descriptor);
        } catch { /* skip photos that can't be read */ }
      }
      if (!refs.current.length) { setPhase("noref"); return; }
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      setPhase("camera");
      setRunning(true);
    } catch (e) {
      setPhase("error");
      setMsg((e as Error)?.name === "NotAllowedError" ? "Camera permission is off. Allow the camera for Isle in your browser settings and try again." : "We couldn't start the check on this device. Try another browser or device.");
    }
  };

  // Attach the stream and run the liveness steps
  useEffect(() => {
    if (!running || !video.current || !stream.current || !api.current) return;
    const faceapi = api.current;
    const v = video.current;
    v.srcObject = stream.current;
    let alive = true;
    let step = 0;
    let sideSign = 0;
    let frontal: Float32Array | null = null;
    let shot: Blob | null = null;
    const seen = { turned: false, smiled: false, frames: 0 };
    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

    const grab = () => new Promise<Blob | null>((res) => {
      const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext("2d")!.drawImage(v, 0, 0); c.toBlob((b) => res(b), "image/jpeg", 0.85);
    });

    const tick = async () => {
      if (!alive) return;
      if (v.readyState < 2) { setTimeout(tick, 200); return; }
      const all = await faceapi.detectAllFaces(v, opts).withFaceLandmarks(true).withFaceExpressions();
      seen.frames++;
      const phaseNow = STEP_ORDER[step];
      setPhase(phaseNow);
      if (all.length !== 1) { setHint(all.length === 0 ? "We can't see your face. Move into good light." : "Only one person in the frame, please."); setTimeout(tick, 180); return; }
      setHint("");
      const f = all[0];
      const lm = f.landmarks.positions;
      // Yaw: where the nose tip sits between the outer eye corners (0.5 = facing the camera)
      const left = lm[36], right = lm[45], nose = lm[30];
      const yaw = (nose.x - left.x) / Math.max(1, right.x - left.x) - 0.5;
      const box = f.detection.box;
      if (phaseNow === "straight") {
        const close = box.width > v.videoWidth * 0.22;
        if (!close) setHint("Come a little closer.");
        else if (Math.abs(yaw) >= 0.08) setHint("Face the camera straight on.");
        else {
          const d = await faceapi.detectSingleFace(v, opts).withFaceLandmarks(true).withFaceDescriptor();
          if (d) { frontal = d.descriptor; shot = await grab(); step = 1; }
        }
      } else if (phaseNow === "side1") {
        if (Math.abs(yaw) > 0.17) { sideSign = Math.sign(yaw); step = 2; }
      } else if (phaseNow === "side2") {
        if (Math.sign(yaw) === -sideSign && Math.abs(yaw) > 0.17) { seen.turned = true; step = 3; }
      } else if (phaseNow === "smile") {
        if (f.expressions.happy > 0.8) { seen.smiled = true; step = 4; }
      }
      if (step < 4) { setTimeout(tick, 150); return; }

      // All steps done: compare with the scrapbook and send the result
      alive = false;
      setPhase("checking");
      stop();
      setRunning(false);
      const dist = Math.min(...refs.current.map((r) => faceapi.euclideanDistance(r, frontal!)));
      const score = Math.max(0, Math.min(1, 1 - dist));
      if (!shot || dist > 0.5) {
        setPhase("failed");
        setMsg("The face in the camera didn't match the photos in your scrapbook closely enough. Use a clear, recent photo of yourself as one of your moments, then try again.");
        return;
      }
      const l = await import("@/lib/live");
      const r = await l.submitSelfie(shot, seen, Math.round(score * 1000) / 1000);
      if (r.ok) { setPhase("passed"); onVerified(); }
      else { setPhase("failed"); setMsg(r.error ?? "The check didn't pass. Please try again in good light."); }
    };
    void v.play().then(() => setTimeout(tick, 300));
    return () => { alive = false; };
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const live = STEP_ORDER.includes(phase) || phase === "camera" || phase === "checking";
  const doneSteps = Math.max(0, STEP_ORDER.indexOf(phase));

  return (
    <div className="flex flex-col items-center text-center">
      {live ? (
        <>
          <div className="relative aspect-[3/4] w-full max-w-[320px] overflow-hidden rounded-[32px] border-4 border-charcoal bg-charcoal">
            <video ref={video} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            <div className="pointer-events-none absolute inset-[12%] rounded-[50%] border-4 border-dashed border-paper/70" />
          </div>
          <p aria-live="polite" className="mt-4 min-h-7 font-display text-[19px] font-extrabold">{PROMPT[phase] ?? "Starting the camera…"}</p>
          <p className="min-h-5 text-[13.5px] text-muted">{hint}</p>
          <div className="mt-2 flex gap-1.5" aria-hidden>{STEP_ORDER.map((s, i) => <span key={s} className={clsx("h-2 w-8 rounded-full", i < doneSteps || phase === "checking" ? "bg-sage" : i === doneSteps ? "bg-coral" : "bg-line")} />)}</div>
        </>
      ) : phase === "passed" ? (
        <>
          <Coco mood="celebrating" size={120} />
          <p className="mt-3 flex items-center gap-2 font-display text-[22px] font-extrabold"><Check size={22} /> You&apos;re selfie-checked</p>
          <p className="mt-1 text-[14.5px] text-muted">The badge is on your scrapbook now, and you can host Tables.</p>
          <Button className="mt-4" href="/profile">Back to my profile</Button>
        </>
      ) : (
        <>
          <Coco mood={phase === "failed" || phase === "error" || phase === "noref" ? "thinking" : "curious"} size={110} />
          {phase === "noref" ? (
            <>
              <p className="mt-3 font-display text-[20px] font-extrabold">Add a photo of your face first</p>
              <p className="mt-1 max-w-[440px] text-[14.5px] text-muted">The check compares your camera with the photos in your scrapbook, and we couldn&apos;t find a clear face in them yet.</p>
              <Button className="mt-4" href="/profile/edit">Add a photo</Button>
            </>
          ) : (
            <>
              <p className="mt-3 font-display text-[20px] font-extrabold">{phase === "failed" || phase === "error" ? "That didn't work" : "Get your Selfie-checked badge"}</p>
              <p className="mt-1 max-w-[440px] text-[14.5px] text-muted">{msg || "About a minute. You'll look at the camera, turn your head each way and smile. It runs on this device and compares you with your scrapbook photos."}</p>
              <ul className="mt-4 space-y-1.5 text-left text-[13.5px]">
                <li className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-sage-ink" /> Your selfie is stored privately. Other members never see it.</li>
                <li className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-sage-ink" /> Isle&apos;s team may spot-check it and can remove the badge if it isn&apos;t you.</li>
              </ul>
              <Button className="mt-5" disabled={phase === "loading"} onClick={start}>
                {phase === "loading" ? "Getting ready…" : phase === "failed" || phase === "error" ? <><RotateCcw size={17} /> Try again</> : <><Camera size={17} /> Start the check</>}
              </Button>
              {photos.length === 0 && <p className="mt-2 text-[12.5px] text-muted">You&apos;ll need at least one photo of yourself in your scrapbook.</p>}
            </>
          )}
        </>
      )}
    </div>
  );
}
