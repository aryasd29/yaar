"use client";
import { use, useEffect, useState } from "react";
import clsx from "clsx";
import { Check, Clock, Copy, Flag, MapPin, Phone, ScanLine, Share2, ShieldCheck, Users } from "lucide-react";
import { Frame, Loading, useRequireMe } from "@/components/Shell";
import { Button, Card, EmptyState, PrototypeTag, SectionLabel, Sheet, Toggle, TopBar } from "@/components/ui";
import { DateCard, usePlan } from "@/components/DateBits";
import { Coco } from "@/components/Coco";
import { CheckIn } from "@/components/CheckIn";
import { useYaar } from "@/lib/store";
import { LIVE, pushPlan } from "@/lib/remote";
import type { DateExtras } from "@/lib/live";

const L = () => import("@/lib/live");

export default function DatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Frame><DateView planId={id} /></Frame>;
}

function DateView({ planId }: { planId: string }) {
  const meReady = useRequireMe();
  const { plan, them, venue, me, match } = usePlan(planId);
  const { giveFeedback, cancelPlan, startPlan, toast, settings } = useYaar();
  const [qr, setQr] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [locShare, setLocShare] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [extras, setExtras] = useState<DateExtras | null>(null);

  // Live app: deposits, bundles and check-ins come from the database; settle the promise once it's due.
  const stage = plan?.stage;
  useEffect(() => {
    if (!LIVE || !plan) return;
    let on = true;
    void (async () => {
      const l = await L();
      setLocShare(l.sharingNow(plan.id));
      const slotT = plan.slot ? +new Date(plan.slot) : 0;
      if (stage === "checkedin" || stage === "done" || stage === "cancelled" || (slotT && Date.now() > slotT + 6 * 3_600_000)) {
        const r = await l.settleDate(plan.id);
        if (on && r.settled) toast("Your show-up promise has been settled.", "good");
      }
      const x = await l.dateExtras(plan.id);
      if (on) setExtras(x);
    })();
    return () => { on = false; };
  }, [plan?.id, stage]); // eslint-disable-line react-hooks/exhaustive-deps
  const [answer, setAnswer] = useState<"yes" | "maybe" | "no" | null>(null);
  const [comfort, setComfort] = useState<"comfortable" | "unsure" | "uncomfortable" | null>(null);
  if (!meReady || !me) return <Loading />;
  if (!plan || !them || !match) return <><TopBar back="/chats" /><EmptyState title="Date not found" /></>;

  const cancelAndRefund = async () => {
    cancelPlan(plan.id);
    if (!LIVE) return;
    const updated = useYaar.getState().plans.find((p) => p.id === plan.id);
    if (updated) await pushPlan(updated);
    await (await L()).settleDate(plan.id);
  };
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
                <Toggle checked={locShare} onChange={async (v) => {
                  if (!LIVE) { setLocShare(v); toast(v ? "Live location shared with your trusted contact." : "Location sharing stopped.", "info"); return; }
                  const l = await L();
                  if (!v) { await l.stopLocationShare(plan.id); setLocShare(false); setShareUrl(null); return toast("Location sharing stopped.", "info"); }
                  const r = await l.startLocationShare(plan.id);
                  if (r.error) return toast(r.error, "warn");
                  setLocShare(true); setShareUrl(r.url!);
                }} label="Share live location for 6 hours" description="Through a private link you send to someone you trust. Stops automatically." />
                {LIVE && locShare && shareUrl && (
                  <div className="rounded-[14px] bg-sage-soft p-3 text-[13.5px] text-sage-ink">
                    <p className="font-semibold">Send this link to {settings.trustedContact?.name ?? "someone you trust"}:</p>
                    <p className="mt-1 break-all font-mono text-[12px]">{shareUrl}</p>
                    <div className="mt-2 flex gap-2">
                      <Button variant="secondary" className="!min-h-10 flex-1" onClick={() => { void navigator.clipboard?.writeText(shareUrl); toast("Link copied", "good"); }}><Copy size={15} /> Copy</Button>
                      <Button className="!min-h-10 flex-1" href={`https://wa.me/${settings.trustedContact?.phone ? `91${settings.trustedContact.phone.replace(/\D/g, "").slice(-10)}` : ""}?text=${encodeURIComponent(`I'm on a date via Isle. You can see where I am until it ends: ${shareUrl}`)}`}><Share2 size={15} /> WhatsApp</Button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <a href="tel:112" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[16px] bg-danger font-semibold text-white"><Phone size={18} /> Emergency 112</a>
                  <Button variant="secondary" className="flex-1" href={`/chats/${match.id}`}><Flag size={17} /> Report</Button>
                </div>
                {!LIVE && locShare && <PrototypeTag className="mt-2">Location sharing is simulated in the offline demo</PrototypeTag>}
              </Card>
            </section>

            {(depositOn || extras?.deposits.some((d) => d.user_id === me.id)) && (
              <Card tone="peri" className="text-[14px] text-peri-ink">
                <SectionLabel>Your ₹99 show-up promise</SectionLabel>
                Held safely by Razorpay. Refunded after you both check in. If {them.name} doesn&apos;t come, you get yours back plus theirs as Isle credit.
                <PrototypeTag className="mt-2">Test mode: no real money moves</PrototypeTag>
              </Card>
            )}
            {extras?.bundles.filter((b) => b.status === "paid").map((b) => (
              <Card key={b.user_id} tone="butter" className="text-[14px] text-butter-ink">
                <SectionLabel>☕ Coffee and dessert for two</SectionLabel>
                Prepaid{b.user_id === me.id ? " by you" : ` by ${them.name}`}. Show code <b className="font-display text-[17px] tracking-widest text-charcoal">ISLE-{b.code}</b> at the counter.
              </Card>
            ))}

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
              {extras?.deposits.find((d) => d.user_id === me.id)?.status === "refunded" && <div className="mt-4 rounded-2xl bg-peri-soft p-3 text-[13.5px] text-peri-ink">Your ₹99 show-up promise has been refunded.</div>}
              <div className="mt-4 rounded-2xl bg-sage-soft p-3 text-[13.5px] text-sage-ink"><Check size={15} className="mr-1 inline" />Date attended. Your private show-up record is updated{me.reliable ? ", and your profile shows the Reliable badge" : ""}.</div>
              <Button variant="secondary" full className="mt-3" href={`/chats/${match.id}`}>Back to chat</Button>
            </Card>
          );
        })()}

        {plan.stage === "cancelled" && <EmptyState mood="calm" title="This date was cancelled" body="Refund rules were applied. You can plan something else from the chat." action={<Button href={`/chats/${match.id}`}>Back to chat</Button>} />}
      </main>

      <Sheet open={qr} onClose={() => setQr(false)} title="Check in together">
        {qr && <CheckIn plan={plan} them={them} me={me} onDone={() => setQr(false)} />}
      </Sheet>

      <Sheet open={cancel} onClose={() => setCancel(false)} title="Cancel or reschedule">
        <div className="space-y-2 text-[14px]">
          <p className={clsx("rounded-xl p-3", hoursAway >= 24 ? "bg-sage-soft text-sage-ink" : "bg-butter-soft text-butter-ink")}>
            {hoursAway >= 24 ? "More than 24 hours away: cancel free. Any deposits and bundles are refunded in full." : "Less than 24 hours away: deposits and bundles are still refunded in full, but late cancellations go on your private show-up record. Cancelling for safety reasons is never counted."}
          </p>
          <Button variant="secondary" full href={`/chats/${match.id}/plan`} onClick={() => useYaar.getState().updatePlan(plan.id, { stage: "time" })}>Pick a new time instead</Button>
          <Button variant="danger" full onClick={() => { void cancelAndRefund(); setCancel(false); }}>Cancel date</Button>
          <Button variant="ghost" full onClick={() => { void cancelAndRefund(); setCancel(false); toast("Cancelled for safety. Any payments are being refunded.", "info"); }}>I don&apos;t feel safe going</Button>
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
