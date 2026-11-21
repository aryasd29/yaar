"use client";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { CalendarDays, Flag, Info, MapPin, ShieldCheck, Ticket, Users } from "lucide-react";
import { Frame } from "@/components/Shell";
import { EventImage } from "@/components/EventCard";
import { Avatar } from "@/components/Moment";
import { Badge, Button, Card, EmptyState, SectionLabel, Sheet, TopBar } from "@/components/ui";
import { Coco } from "@/components/Coco";
import { PlusTag } from "@/components/PlusBits";
import { useYaar } from "@/lib/store";
import { pay } from "@/lib/pay";
import { track } from "@/lib/remote";
import { FREE_SEAT_MAX, isPlus, seatPrice } from "@/lib/plus";
import { useTables } from "@/lib/useTables";
import { DEMO_PEOPLE, fmtPrice, fmtTableWhen, tableDate } from "@/lib/seed";
import type { Profile } from "@/lib/types";
import type { TablePerson } from "@/lib/live";

const L = () => import("@/lib/live");

export default function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { tables, isGoing, loaded, live } = useTables();
  const t = tables.find((x) => x.id === id);
  const { toggleTable, me, now, toast, plus, useFreeSeat: claimFreeSeat, report } = useYaar();
  const [confirm, setConfirm] = useState(false);
  const [joinedNow, setJoinedNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [people, setPeople] = useState<TablePerson[]>([]);
  const [place, setPlace] = useState<string | null>(null);
  const going = t ? isGoing(t) : false;

  const refreshDetails = useCallback(async () => {
    if (!live || !t || !(t.going || t.hosting)) { setPeople([]); setPlace(null); return; }
    const d = await (await L()).tableDetails(t.id);
    setPeople(d.people); setPlace(d.place);
  }, [live, t]);
  useEffect(() => { void refreshDetails(); }, [refreshDetails]);

  if (!t) {
    if (!loaded) return <Frame><TopBar back="/explore/tables" /><p className="mt-10 text-center text-muted">Loading…</p></Frame>;
    return <Frame><TopBar back="/explore/tables" /><EmptyState title="We couldn't find that Table" body="It may have ended or been cancelled. Have a look at what's on this week." action={<Button href="/explore/tables">See all Tables</Button>} /></Frame>;
  }

  const full = t.left === 0 && !going;
  const left = live || !going ? t.left : Math.max(0, t.left - 1);
  const when = fmtTableWhen(tableDate(t, now()));
  const started = tableDate(t, now()).getTime() < now();
  const sp = seatPrice(t, plus, now());
  const plusOn = isPlus(plus, now());
  const refundable = tableDate(t, now()).getTime() - now() > 24 * 3_600_000;

  const book = async () => {
    setBusy(true);
    if (live && t.price === 0) {
      const err = await (await L()).joinFreeTable(t.id);
      setBusy(false);
      if (err) return toast(err, "warn");
    } else if (sp.price > 0 || (live && t.price > 0)) {
      const r = await pay([{ kind: "seat", tableId: t.id, price: t.price, title: t.title }], { name: me?.name }, `Seat at ${t.title}`, { plus: plusOn });
      setBusy(false);
      if (r.status === "error") return toast(r.error, "warn");
      if (r.status !== "paid") return;
      if (live) await Promise.all([(await L()).loadTables(), (await L()).loadCommerce()]);
      else toggleTable(t.id);
    } else {
      setBusy(false);
      if (sp.free) claimFreeSeat();
      toggleTable(t.id);
    }
    track("seat_booked", { price: t.price, plusSeat: sp.free });
    setJoinedNow(true);
  };

  const leave = async () => {
    setBusy(true);
    if (!live) { toggleTable(t.id); setBusy(false); setLeaving(false); return toast("Removed from your plans", "info"); }
    const l = await L();
    if (t.hosting) {
      const r = await l.cancelTable(t.id);
      setBusy(false); setLeaving(false);
      return r.error ? toast(r.error, "warn") : toast(r.refunded ? `Table cancelled. ${r.refunded} paid seat${r.refunded > 1 ? "s were" : " was"} refunded.` : "Table cancelled. Everyone going will see it's off.", "info");
    }
    const r = await l.leaveTable(t.id);
    setBusy(false); setLeaving(false);
    if (r.error) return toast(r.error, "warn");
    toast(r.refund ? `You've left the Table. ₹${r.refund} is on its way back to you.` : "You've left the Table.", "info");
  };

  const demoAttendees: Profile[] = live ? [] : DEMO_PEOPLE.slice(+t.id.slice(1) % 5, (+t.id.slice(1) % 5) + (t.seats - t.left)).slice(0, 5);

  return (
    <Frame width="medium">
      <TopBar back="/explore/tables" title={t.circle} />
      <main className="pb-8 md:px-8 lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-8">
        <div>
          <EventImage t={t} credit className="mx-5 aspect-[4/3] rounded-[24px] border-2 border-charcoal md:mx-0" />
          {!live && (
            <div className="mx-5 mt-3 flex items-start gap-2 rounded-[16px] border-2 border-dashed border-charcoal/30 bg-paper px-3 py-2.5 text-[13px] md:mx-0">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span><b>Sample event.</b> This shows how Tables work in the offline demo.</span>
            </div>
          )}
          {t.cancelled && <p role="status" className="mx-5 mt-3 rounded-[16px] bg-coral-soft px-3 py-2.5 text-[14px] font-semibold text-coral-ink md:mx-0">This Table was cancelled by the host. Paid seats were refunded.</p>}
        </div>
        <div>
          <section className="px-5 pt-4 md:px-0 lg:pt-0">
            <Badge tone="butter">{t.circle}</Badge>
            <h1 className="mt-2 text-[26px] leading-tight">{t.title}</h1>
            {t.blurb && <p className="mt-2 whitespace-pre-line text-[15px]">{t.blurb}</p>}
            <ul className="mt-3 space-y-1.5 text-[14.5px] text-muted">
              <li className="flex items-center gap-2"><CalendarDays size={16} /> {when}</li>
              <li className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0" />
                {place ? <span><b className="text-charcoal">{place}</b>, {t.area}</span> : <span>{t.area}. The exact place is shared once you join.</span>}
              </li>
              <li className="flex items-center gap-2"><Ticket size={16} /> {t.price === 0 ? "Free to join. Everyone pays for their own order." : `${fmtPrice(t.price)} per seat, covers the host and venue booking`}</li>
              <li className="flex items-center gap-2"><Users size={16} /> {t.seats} seats including the host, {full ? "none left" : `${left} left`}</li>
              {live && t.hostName && <li className="flex items-center gap-2"><ShieldCheck size={16} /> Hosted by {t.hosting ? "you" : t.hostName}, selfie-checked</li>}
            </ul>
          </section>
          <section className="mt-5 px-5 md:px-0">
            <SectionLabel>Who&apos;s going</SectionLabel>
            {live ? (
              going ? (
                <div className="flex flex-wrap gap-2">
                  {people.map((p) => (
                    <span key={p.user_id} className="flex items-center gap-2 rounded-full bg-paper py-1 pl-1 pr-3 shadow-soft">
                      <Avatar p={{ id: p.user_id, name: p.name, moments: [{ id: "a", scene: p.scene ?? "coffee", caption: "", photoUrl: p.photo ?? undefined }] } as unknown as Profile} size={32} />
                      <span className="text-[13.5px] font-semibold">{p.name}{p.is_host && " (host)"}</span>
                    </span>
                  ))}
                </div>
              ) : <p className="text-[13.5px] text-muted">{t.seats - t.left} going. First names are shown to people who join.</p>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex -space-x-3">{demoAttendees.map((p) => <Avatar key={p.id} p={p} size={40} />)}{going && me && <Avatar p={me} size={40} />}</span>
                <span className="text-[13px] text-muted">Sample attendees. First names only, shown to people going.</span>
              </div>
            )}
          </section>
          <Card tone="sage" className="mx-5 mt-5 !p-4 md:mx-0">
            <p className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} /> Table rules</p>
            <p className="mt-1 text-[14px] text-sage-ink">Selfie-checked people only. Public places. Joining a Table never signals romantic interest. Be kind or be removed.</p>
          </Card>
          {live && !t.hosting && t.host && (
            <button className="mx-5 mt-3 flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-muted underline-offset-2 hover:underline md:mx-0" onClick={() => report(t.host!, "Table", `Table: ${t.title}`)}>
              <Flag size={14} /> Report this Table
            </button>
          )}
          <div className="sticky bottom-0 z-20 mt-4 bg-gradient-to-t from-vanilla via-vanilla to-vanilla/0 px-5 pb-6 pt-4 md:px-0">
            {t.cancelled || started ? (
              <Button full disabled>{t.cancelled ? "Cancelled" : "This Table has started"}</Button>
            ) : t.hosting ? (
              <Button variant="secondary" full onClick={() => setLeaving(true)}>Cancel this Table</Button>
            ) : going ? (
              <div className="space-y-2">
                <p className="text-center text-[13.5px] font-semibold text-sage-ink">You have a seat. See you there!</p>
                <Button variant="secondary" full onClick={() => setLeaving(true)}>Leave this Table</Button>
              </div>
            ) : full ? (
              <Button full disabled>This Table is full</Button>
            ) : (
              <Button full onClick={() => setConfirm(true)}>{t.price === 0 ? "Join this Table" : sp.free ? "Book with my free Plus seat" : `Book a seat · ${fmtPrice(t.price)}`}</Button>
            )}
            {!going && !full && !t.cancelled && !started && (
              <p className="mt-1.5 text-center text-[12px] text-muted">
                {sp.free ? "Your Isle Plus seat for this month covers it." : t.price > 0 && !plusOn && t.price <= FREE_SEAT_MAX ? <>Free with <Link href="/plus" className="font-semibold underline">Isle Plus</Link>, which includes a seat every month.</> : t.price === 0 ? "Free to join." : "Payments are in test mode. No real money moves."}
              </p>
            )}
          </div>
        </div>
      </main>

      <Sheet open={confirm} onClose={() => { setConfirm(false); setJoinedNow(false); }} title={joinedNow ? "You have a seat!" : t.price === 0 ? "Join this Table" : "Book your seat"}>
        {joinedNow ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center">
            <Coco mood="celebrating" size={110} />
            <p className="mt-2 text-[15px] text-muted">{live ? "The exact place is now on the Table page, along with who else is going." : "It's in your plans."}</p>
            <Button full className="mt-4" onClick={() => { setConfirm(false); setJoinedNow(false); }}>Done</Button>
          </motion.div>
        ) : (
          <div>
            <p className="text-[14.5px] text-muted">{t.title}, {when}, {t.area}</p>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-vanilla p-3">
              <span>Seat</span>
              {t.price === 0 ? <b>Free</b> : sp.free ? <span className="flex items-center gap-2"><s className="text-muted">{fmtPrice(t.price)}</s><b>Free</b><PlusTag /></span> : <b>{fmtPrice(t.price)}</b>}
            </div>
            <p className="mt-2 text-[12.5px] text-muted">{t.price === 0 ? "If you can't make it, leave the Table so someone else can take your seat." : "Cancel up to 24 hours before for a full refund. A Plus seat comes back to you."}</p>
            <Button full className="mt-4" disabled={busy} onClick={book}>{busy ? "Working…" : t.price === 0 || sp.free ? "Confirm my seat" : `Continue to pay ${fmtPrice(sp.price)}`}</Button>
          </div>
        )}
      </Sheet>

      <Sheet open={leaving} onClose={() => setLeaving(false)} title={t.hosting ? "Cancel this Table?" : "Leave this Table?"}>
        <p className="text-[15px] text-muted">
          {t.hosting ? "Everyone going will see it's cancelled, and anyone who paid gets a full refund."
            : t.price === 0 ? "Your seat goes back to the Table for someone else."
            : refundable ? "You'll get a full refund (or your Plus seat back), because it's more than 24 hours away."
            : "It's less than 24 hours away, so this seat can't be refunded. The host will be glad of the space though."}
        </p>
        <Button full className="mt-4" disabled={busy} onClick={leave}>{busy ? "Working…" : t.hosting ? "Cancel the Table" : "Leave the Table"}</Button>
        <button className="mt-1 min-h-11 w-full text-[14px] font-semibold text-muted" onClick={() => setLeaving(false)}>Keep it</button>
      </Sheet>
    </Frame>
  );
}
