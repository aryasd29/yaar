"use client";
import { use, useState } from "react";
import { motion } from "motion/react";
import { CalendarDays, Info, MapPin, ShieldCheck, Ticket, Users } from "lucide-react";
import { Frame } from "@/components/Shell";
import { EventImage } from "@/components/EventCard";
import { Avatar } from "@/components/Moment";
import { Badge, Button, Card, EmptyState, SectionLabel, Sheet, TopBar } from "@/components/ui";
import { Coco } from "@/components/Coco";
import { useYaar } from "@/lib/store";
import { DEMO_PEOPLE, DEMO_TABLES, fmtPrice, fmtTableWhen, tableDate } from "@/lib/seed";

export default function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = DEMO_TABLES.find((x) => x.id === id);
  const { joinedTables, toggleTable, me, now, toast } = useYaar();
  const [confirm, setConfirm] = useState(false);
  const [joinedNow, setJoinedNow] = useState(false);
  if (!t) return <Frame><TopBar back="/explore/tables" /><EmptyState title="We couldn't find that Table" body="It may have ended. Have a look at what's on this week." action={<Button href="/explore/tables">See all Tables</Button>} /></Frame>;
  const going = joinedTables.includes(t.id);
  const full = t.left === 0 && !going;
  const left = going ? Math.max(0, t.left - 1) : t.left;
  const when = fmtTableWhen(tableDate(t, now()));
  const attendees = DEMO_PEOPLE.slice(+t.id.slice(1) % 5, (+t.id.slice(1) % 5) + (t.seats - t.left)).slice(0, 5);

  return (
    <Frame width="medium">
      <TopBar back="/explore/tables" title={t.circle} />
      <main className="pb-8 md:px-8 lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-8">
        <div>
          <EventImage t={t} credit className="mx-5 aspect-[4/3] rounded-[24px] border-2 border-charcoal md:mx-0" />
          <div className="mx-5 mt-3 flex items-start gap-2 rounded-[16px] border-2 border-dashed border-charcoal/30 bg-paper px-3 py-2.5 text-[13px] md:mx-0">
            <Info size={16} className="mt-0.5 shrink-0" />
            <span><b>Sample event.</b> This shows how Tables will work. It isn&apos;t a real booking, no seat is held and no money is taken.</span>
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
                <p className="text-center text-[13.5px] font-semibold text-sage-ink">In your plans (demo)</p>
                <Button variant="secondary" full onClick={() => { toggleTable(t.id); toast("Removed from your plans", "info"); }}>Remove from my plans</Button>
              </div>
            ) : full ? (
              <Button full disabled>This Table is full</Button>
            ) : (
              <Button full onClick={() => setConfirm(true)}>Try the booking flow</Button>
            )}
            {!going && !full && <p className="mt-1.5 text-center text-[12px] text-muted">Demo only. No real seat is reserved.</p>}
          </div>
        </div>
      </main>
      <Sheet open={confirm} onClose={() => { setConfirm(false); setJoinedNow(false); }} title={joinedNow ? "Added to your plans" : "Booking preview"}>
        {joinedNow ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center">
            <Coco mood="celebrating" size={110} />
            <p className="mt-2 text-[15px] text-muted">This is how a confirmed seat would look. In the real app you&apos;d get the exact place the day before, plus a reminder.</p>
            <Button full className="mt-4" onClick={() => { setConfirm(false); setJoinedNow(false); }}>Done</Button>
          </motion.div>
        ) : (
          <div>
            <p className="text-[14.5px] text-muted">{t.title}, {when}, {t.area}</p>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-vanilla p-3"><span>Seat</span><b>{fmtPrice(t.price)}</b></div>
            <p className="mt-2 text-[12.5px] text-muted">Real Tables would have free cancellation up to 24 hours before.</p>
            <div className="mt-3 rounded-[14px] bg-butter-soft px-3 py-2 text-[13px] text-butter-ink">Sample event: nothing is charged and no seat is held.</div>
            <Button full className="mt-4" onClick={() => { toggleTable(t.id); setJoinedNow(true); }}>Add to my plans (demo)</Button>
          </div>
        )}
      </Sheet>
    </Frame>
  );
}
