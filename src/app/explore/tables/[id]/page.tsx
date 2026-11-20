"use client";
import { use, useState } from "react";
import { motion } from "motion/react";
import { CalendarDays, Info, MapPin, ShieldCheck, Ticket, Users } from "lucide-react";
import { Frame } from "@/components/Shell";
import { EventImage } from "@/components/EventCard";
import { Avatar } from "@/components/Moment";
import { Badge, Button, Card, EmptyState, SectionLabel, Sheet, TopBar } from "@/components/ui";
import { Coco } from "@/components/Coco";
import Link from "next/link";
import { useYaar } from "@/lib/store";
import { pay } from "@/lib/pay";
import { track } from "@/lib/remote";
import { FREE_SEAT_MAX, isPlus, seatPrice } from "@/lib/plus";
import { PlusTag } from "@/components/PlusBits";
import { DEMO_PEOPLE, DEMO_TABLES, fmtPrice, fmtTableWhen, tableDate } from "@/lib/seed";

export default function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = DEMO_TABLES.find((x) => x.id === id);
  const { joinedTables, toggleTable, me, now, toast, plus, useFreeSeat: claimFreeSeat } = useYaar();
  const [confirm, setConfirm] = useState(false);
  const [joinedNow, setJoinedNow] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!t) return <Frame><TopBar back="/explore/tables" /><EmptyState title="We couldn't find that Table" body="It may have ended. Have a look at what's on this week." action={<Button href="/explore/tables">See all Tables</Button>} /></Frame>;
  const going = joinedTables.includes(t.id);
  const full = t.left === 0 && !going;
  const left = going ? Math.max(0, t.left - 1) : t.left;
  const when = fmtTableWhen(tableDate(t, now()));
  const sp = seatPrice(t, plus, now());
  const plusOn = isPlus(plus, now());
  const book = async () => {
    if (sp.price > 0) {
      setBusy(true);
      const r = await pay([{ kind: "seat", tableId: t.id }], { name: me?.name }, `Seat at ${t.title}`, [`${t.title}, ${when}`, `One seat · ${fmtPrice(t.price)}`]);
      setBusy(false);
      if (r.status === "error") return toast(r.error, "warn");
      if (r.status !== "paid") return;
    } else if (sp.free) claimFreeSeat();
    toggleTable(t.id);
    track("seat_booked", { price: sp.price, plusSeat: sp.free });
    setJoinedNow(true);
  };
  const attendees = DEMO_PEOPLE.slice(+t.id.slice(1) % 5, (+t.id.slice(1) % 5) + (t.seats - t.left)).slice(0, 5);

  return (
    <Frame width="medium">
      <TopBar back="/explore/tables" title={t.circle} />
      <main className="pb-8 md:px-8 lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-8">
        <div>
          <EventImage t={t} credit className="mx-5 aspect-[4/3] rounded-[24px] border-2 border-charcoal md:mx-0" />
          <div className="mx-5 mt-3 flex items-start gap-2 rounded-[16px] border-2 border-dashed border-charcoal/30 bg-paper px-3 py-2.5 text-[13px] md:mx-0">
            <Info size={16} className="mt-0.5 shrink-0" />
            <span><b>Sample event.</b> This shows how Tables will work. Payments run in Razorpay test mode, so no real money is taken.</span>
          </div>
        </div>
        <div>
          <section className="px-5 pt-4 md:px-0 lg:pt-0">
            <Badge tone="butter">{t.circle}</Badge>
            <h1 className="mt-2 text-[26px] leading-tight">{t.title}</h1>
            <p className="mt-2 text-[15px]">{t.blurb}</p>
            <ul className="mt-3 space-y-1.5 text-[14.5px] text-muted">
              <li className="flex items-center gap-2"><CalendarDays size={16} /> {when}</li>
              <li className="flex items-center gap-2"><MapPin size={16} /> {t.area}. The exact place is shared after you join.</li>
              <li className="flex items-center gap-2"><Ticket size={16} /> {t.price === 0 ? "Free" : `${fmtPrice(t.price)} per seat, covers organising`}</li>
              <li className="flex items-center gap-2"><Users size={16} /> {t.seats} seats, {full ? "none left" : `${left} left`}</li>
            </ul>
          </section>
          <section className="mt-5 px-5 md:px-0">
            <SectionLabel>Who&apos;s going</SectionLabel>
            <div className="flex items-center gap-2">
              <span className="flex -space-x-3">{attendees.map((p) => <Avatar key={p.id} p={p} size={40} />)}{going && me && <Avatar p={me} size={40} />}</span>
              <span className="text-[13px] text-muted">Sample attendees. First names only, shown to people going.</span>
            </div>
          </section>
          <Card tone="sage" className="mx-5 mt-5 text-[14px] text-sage-ink md:mx-0">
            <div className="mb-1 flex items-center gap-2 font-semibold"><ShieldCheck size={17} /> Table rules</div>
            Verified people only. Public, host-checked venues. Joining a Table never signals romantic interest. Be kind or be removed.
          </Card>
          <div className="sticky bottom-0 z-20 mt-4 bg-gradient-to-t from-vanilla via-vanilla to-vanilla/0 px-5 pb-6 pt-4 md:px-0">
            {going ? (
              <div className="space-y-2">
                <p className="text-center text-[13.5px] font-semibold text-sage-ink">You have a seat. See you there!</p>
                <Button variant="secondary" full onClick={() => { toggleTable(t.id); toast("Removed from your plans", "info"); }}>Remove from my plans</Button>
              </div>
            ) : full ? (
              <Button full disabled>This Table is full</Button>
            ) : (
              <Button full onClick={() => setConfirm(true)}>{t.price === 0 ? "Save my seat" : sp.free ? "Book with my free Plus seat" : `Book a seat · ${fmtPrice(t.price)}`}</Button>
            )}
            {!going && !full && <p className="mt-1.5 text-center text-[12px] text-muted">{sp.free ? "Your Isle Plus seat for this month covers it." : t.price > 0 && !plusOn && t.price <= FREE_SEAT_MAX ? <>Free with <Link href="/plus" className="font-semibold underline">Isle Plus</Link>, which includes a seat every month.</> : t.price === 0 ? "Free to join. Sample event." : "Sample event, test payments only."}</p>}
          </div>
        </div>
      </main>
      <Sheet open={confirm} onClose={() => { setConfirm(false); setJoinedNow(false); }} title={joinedNow ? "You have a seat!" : "Book your seat"}>
        {joinedNow ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center">
            <Coco mood="celebrating" size={110} />
            <p className="mt-2 text-[15px] text-muted">It&apos;s in your plans. You&apos;ll get the exact place the day before, plus a reminder.</p>
            <Button full className="mt-4" onClick={() => { setConfirm(false); setJoinedNow(false); }}>Done</Button>
          </motion.div>
        ) : (
          <div>
            <p className="text-[14.5px] text-muted">{t.title}, {when}, {t.area}</p>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-vanilla p-3">
              <span>Seat</span>
              {sp.free ? <span className="flex items-center gap-2"><s className="text-muted">{fmtPrice(t.price)}</s><b>Free</b><PlusTag /></span> : <b>{fmtPrice(t.price)}</b>}
            </div>
            <p className="mt-2 text-[12.5px] text-muted">Free cancellation up to 24 hours before. The seat fee covers the host and venue booking.</p>
            <div className="mt-3 rounded-[14px] bg-butter-soft px-3 py-2 text-[13px] text-butter-ink">Sample event: payments run in test mode, so no real money moves.</div>
            <Button full className="mt-4" disabled={busy} onClick={book}>{busy ? "Opening checkout…" : sp.price > 0 ? `Pay ${fmtPrice(sp.price)} and book` : "Confirm my seat"}</Button>
          </div>
        )}
      </Sheet>
    </Frame>
  );
}
