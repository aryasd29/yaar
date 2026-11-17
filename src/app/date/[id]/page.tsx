"use client";
import { use, useState } from "react";
import clsx from "clsx";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Clock, Flag, MapPin, Navigation, Phone, ScanLine, ShieldCheck, Users } from "lucide-react";
import { Frame, Loading, useRequireMe } from "@/components/Shell";
import { Button, Card, EmptyState, PrototypeTag, SectionLabel, Sheet, Toggle, TopBar } from "@/components/ui";
import { DateCard, usePlan } from "@/components/DateBits";
import { Coco } from "@/components/Coco";
import { useYaar } from "@/lib/store";

export default function DatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Frame><DateView planId={id} /></Frame>;
}

function DateView({ planId }: { planId: string }) {
  const meReady = useRequireMe();
  const { plan, them, venue, me, match } = usePlan(planId);
  const { checkIn, giveFeedback, cancelPlan, startPlan, toast } = useYaar();
  const [qr, setQr] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [locShare, setLocShare] = useState(false);
  const [answer, setAnswer] = useState<"yes" | "maybe" | "no" | null>(null);
  const [comfort, setComfort] = useState<"comfortable" | "unsure" | "uncomfortable" | null>(null);
  if (!meReady || !me) return <Loading />;
  if (!plan || !them || !match) return <><TopBar back="/chats" /><EmptyState title="Date not found" /></>;

  const slot = plan.slot ? new Date(plan.slot) : null;
  const hoursAway = slot ? (+slot - Date.now()) / 3_600_000 : 99;
  const depositOn = plan.deposit[me.id];

  return (
    <>
      <TopBar back={`/chats/${match.id}`} title={`Date with ${them.name}`} />
      <main className="space-y-4 px-5 pb-12 pt-2">
        <DateCard planId={plan.id} />

        {plan.stage === "confirmed" && (
          <>
            <Card tone="sage">
              <div className="flex items-center gap-3">
                <ScanLine className="shrink-0 text-sage-ink" />
                <div className="flex-1"><p className="font-semibold text-sage-ink">At the venue?</p><p className="text-[13.5px] text-sage-ink/80">Scan each other&apos;s code to confirm you both made it. {depositOn ? "This also refunds your ₹99." : ""}</p></div>
              </div>
              <Button full className="mt-3" onClick={() => setQr(true)}>I&apos;m here: check in</Button>
            </Card>

            <section aria-labelledby="safety">
              <h2 id="safety" className="mb-2 flex items-center gap-2 text-[19px]"><ShieldCheck className="text-sage-ink" size={20} /> Date Safety Centre</h2>
              <Card className="space-y-1">
                <Row icon={<Users size={18} />} title="Trusted contact" body={plan.trustedContact ? `${plan.trustedContact} has the place and time` : "Not shared. Add a contact in Safety settings."} />
                <Row icon={<Clock size={18} />} title="Check-in" body={plan.checkInReminder ? "We'll ask 'all good?' 45 minutes in. Ignore it twice and your contact is alerted." : "Off"} />
                <Row icon={<MapPin size={18} />} title="Venue" body={venue ? `${venue.name}, ${venue.address}` : "—"} />
                <Toggle checked={locShare} onChange={(v) => { setLocShare(v); toast(v ? "Live location shared with your trusted contact for 3 hours." : "Location sharing stopped.", "info"); }} label="Share live location for 3 hours" description="Only with your trusted contact. Stops automatically." />
                <div className="flex gap-2 pt-2">
                  <a href="tel:112" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[16px] bg-danger font-semibold text-white"><Phone size={18} /> Emergency 112</a>
                  <Button variant="secondary" className="flex-1" href={`/chats/${match.id}`}><Flag size={17} /> Report</Button>
                </div>
                {locShare && <PrototypeTag className="mt-2">Location sharing simulated</PrototypeTag>}
              </Card>
            </section>

            {depositOn && (
              <Card tone="peri" className="text-[14px] text-peri-ink">
                <SectionLabel>Your ₹99 deposit</SectionLabel>
                Held safely. Both {them.name} and you locked it in. Refunded automatically after you both check in.
                <PrototypeTag className="mt-2">Test mode</PrototypeTag>
              </Card>
            )}

            <button onClick={() => setCancel(true)} className="min-h-12 w-full text-[14px] font-semibold text-muted">Need to cancel or reschedule?</button>
          </>
        )}

        {plan.stage === "checkedin" && (
          <section>
            <Card className="text-center">
              <Coco mood="cheering" size={90} className="mx-auto" />
              <h2 className="mt-2 text-[22px]">How did it go with {them.name}?</h2>
              <p className="mt-1 text-[14px] text-muted">Only you see your answer. {them.name} only finds out if you both say yes.</p>
              <div className="mt-4 space-y-2">
                {([["yes", "Yes, definitely"], ["maybe", "Maybe, I'd like to talk more"], ["no", "No, thank you"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setAnswer(k)} aria-pressed={answer === k} className={clsx("min-h-12 w-full rounded-[16px] border-2 text-[15px] font-semibold transition", answer === k ? "border-coral bg-coral-soft" : "border-line bg-paper")}>{l}</button>
                ))}
              </div>
              <p className="mb-2 mt-5 text-[14px] font-semibold">Did you feel comfortable?</p>
              <div className="grid grid-cols-3 gap-2">
                {([["comfortable", "Yes"], ["unsure", "Not sure"], ["uncomfortable", "No"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setComfort(k)} aria-pressed={comfort === k} className={clsx("min-h-12 rounded-[14px] border-2 text-[14px] font-semibold", comfort === k ? "border-peri-ink bg-peri-soft text-peri-ink" : "border-line bg-paper")}>{l}</button>
                ))}
              </div>
              {comfort === "uncomfortable" && <p className="mt-3 rounded-xl bg-coral-soft p-2 text-[13px] text-coral-ink">We&apos;re sorry. You can report or block from the chat at any time, and our safety team will follow up.</p>}
              <Button full className="mt-5" disabled={!answer || !comfort} onClick={() => answer && comfort && giveFeedback(plan.id, answer, comfort)}>Save privately</Button>
              <p className="mt-2 text-[12px] text-muted">This is never a public rating. Your attendance adds to your private show-up record.</p>
            </Card>
          </section>
        )}

        {plan.stage === "done" && (() => {
          const mine = plan.feedback[me.id], theirs = plan.feedback[them.id];
          const both = mine === "yes" && theirs === "yes";
          return (
            <Card className="text-center">
              <Coco mood={both ? "celebrating" : "calm"} size={96} className="mx-auto" />
              {both ? (
                <>
                  <h2 className="mt-2 text-[22px]">You both want a second date ✨</h2>
                  <p className="mt-1 text-[14px] text-muted">Nice! We&apos;ll suggest something new for round two.</p>
                  <Button full className="mt-4" onClick={() => { const id = startPlan(match.id); location.href = `/chats/${match.id}/plan?p=${id}`; }}>Plan a second date</Button>
                </>
              ) : mine === "no" ? (
                <>
                  <h2 className="mt-2 text-[22px]">Thanks for being honest</h2>
                  <p className="mt-1 text-[14px] text-muted">{them.name} isn&apos;t told your answer. You can close the match kindly from the chat whenever you&apos;re ready.</p>
                </>
              ) : (
                <>
                  <h2 className="mt-2 text-[22px]">Saved privately</h2>
                  <p className="mt-1 text-[14px] text-muted">Your chat stays open. Keep talking and see where it goes.</p>
                </>
              )}
              <div className="mt-4 rounded-2xl bg-sage-soft p-3 text-[13.5px] text-sage-ink"><Check size={15} className="mr-1 inline" />Date attended. Your private show-up record is updated{me.reliable ? ", and your profile shows the Reliable badge" : ""}.</div>
              <Button variant="secondary" full className="mt-3" href={`/chats/${match.id}`}>Back to chat</Button>
            </Card>
          );
        })()}

        {plan.stage === "cancelled" && <EmptyState mood="calm" title="This date was cancelled" body="Refund rules were applied. You can plan something else from the chat." action={<Button href={`/chats/${match.id}`}>Back to chat</Button>} />}
      </main>

      <Sheet open={qr} onClose={() => { setQr(false); setScanning(false); }} title="Check in together">
        <div className="flex flex-col items-center text-center">
          <p className="text-[14px] text-muted">Show this to {them.name}, or scan theirs.</p>
          <div className="mt-4 rounded-[24px] bg-white p-4 shadow-soft"><QRCodeSVG value={`isle://checkin/${plan.id}/${me.id}`} size={200} fgColor="#1b2d45" /></div>
          <p className="mt-2 text-[12.5px] text-muted">Code changes every visit and works only at {venue?.name ?? "the venue"}.</p>
          {scanning ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-2 font-semibold text-sage-ink"><Navigation size={18} className="animate-pulse" /> Scanning {them.name}&apos;s code…</motion.div>
          ) : (
            <Button full className="mt-5" onClick={() => { setScanning(true); setTimeout(() => { checkIn(plan.id); setQr(false); setScanning(false); toast(`Checked in with ${them.name}. Have a lovely time!`, "good"); }, 1500); }}><ScanLine size={18} /> Scan {them.name}&apos;s code</Button>
          )}
          <PrototypeTag className="mt-3">Scanning is simulated in this demo</PrototypeTag>
        </div>
      </Sheet>

      <Sheet open={cancel} onClose={() => setCancel(false)} title="Cancel or reschedule">
        <div className="space-y-2 text-[14px]">
          <p className={clsx("rounded-xl p-3", hoursAway >= 24 ? "bg-sage-soft text-sage-ink" : "bg-butter-soft text-butter-ink")}>
            {hoursAway >= 24 ? "More than 24 hours away: cancel free, any deposits are fully refunded." : `Less than 24 hours away: ${depositOn ? `half your ₹99 goes to ${them.name}.` : "no deposit, so no charge."} Cancelling for safety reasons is never penalised.`}
          </p>
          <Button variant="secondary" full href={`/chats/${match.id}/plan`} onClick={() => useYaar.getState().updatePlan(plan.id, { stage: "time" })}>Pick a new time instead</Button>
          <Button variant="danger" full onClick={() => { cancelPlan(plan.id); setCancel(false); }}>Cancel date</Button>
          <Button variant="ghost" full onClick={() => { cancelPlan(plan.id); setCancel(false); toast("Cancelled for safety. Nothing was charged.", "info"); }}>I don&apos;t feel safe going</Button>
        </div>
      </Sheet>
    </>
  );
}

function Row({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3 py-2">
      <span className="mt-0.5 text-sage-ink">{icon}</span>
      <span><span className="block text-[14.5px] font-semibold">{title}</span><span className="block text-[13.5px] text-muted">{body}</span></span>
    </div>
  );
}
