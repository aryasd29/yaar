"use client";
import { NotificationBell } from "./PageHeader";
import Link from "next/link";
import clsx from "clsx";
import { CalendarHeart, Hourglass } from "lucide-react";
import { Loading, useRequireMe } from "@/components/Shell";
import { Avatar } from "@/components/Moment";
import { Badge, Button, EmptyState, SectionLabel, SampleBadge } from "@/components/ui";
import { matchState, useYaar } from "@/lib/store";
import { relTime } from "@/lib/logic";

export function ChatList({ activeId }: { activeId?: string }) {
  const me = useRequireMe();
  const { matches, messages, people, plans, now } = useYaar();
  if (!me) return <Loading />;
  const t = now();
  const rows = matches.map((m) => {
    const other = people.find((p) => p.id === m.users[1])!;
    const msgs = messages.filter((x) => x.matchId === m.id && x.kind === "text");
    const last = msgs[msgs.length - 1];
    const st = matchState(m, t);
    const plan = plans.find((p) => p.matchId === m.id && ["confirmed", "checkedin"].includes(p.stage));
    return { m, other, last, st, plan };
  });
  const active = rows.filter((r) => !r.st.ended).sort((a, b) => b.m.lastActivityAt - a.m.lastActivityAt);
  const closed = rows.filter((r) => r.st.ended);
  const fresh = active.filter((r) => !r.last);
  const talking = active.filter((r) => r.last);

  return (
    <div className="px-5 pb-8 pt-5 md:px-8 lg:px-5">
      <div className="flex items-center justify-between"><h1 className="text-[30px]">Chats</h1><NotificationBell className="lg:hidden" /></div>
      {active.length === 0 && closed.length === 0 && (
        <EmptyState mood="curious" title="No matches yet" body="React to something you like in today's drop. When they react back, your chat appears here." action={<Button href="/today">Go to the shore</Button>} />
      )}

      {fresh.length > 0 && (
        <section className="mt-4">
          <SectionLabel>New matches</SectionLabel>
          <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-2">
            {fresh.map(({ m, other }) => (
              <Link key={m.id} href={`/chats/${m.id}`} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-center">
                <span className="rounded-full bg-gradient-to-tr from-coral via-butter to-peri p-[3px]"><Avatar p={other} size={66} className="!border-0" /></span>
                <span className="text-[13px] font-semibold">{other.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {talking.length > 0 && (
        <section className="mt-4">
          <SectionLabel>Conversations</SectionLabel>
          <ul className="space-y-2">
            {talking.map(({ m, other, last, st, plan }) => (
              <li key={m.id}>
                <Link href={`/chats/${m.id}`} className={clsx("flex items-center gap-3 rounded-[20px] p-3 shadow-soft transition active:scale-[0.99]", m.id === activeId ? "bg-coral-soft" : "bg-paper", st.expiring && "ring-2 ring-butter")}>
                  <Avatar p={other} size={52} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2"><span className="flex items-center gap-1.5"><span className="font-display text-[16.5px]">{other.name}</span><SampleBadge id={other.id} /></span><span className="text-[12px] text-muted">{relTime(m.lastActivityAt, t)}</span></span>
                    <span className="block truncate text-[14px] text-muted">{last.from === me.id ? "You: " : ""}{last.body}</span>
                    <span className="mt-1 flex gap-1.5">
                      {plan && <Badge tone="sage"><CalendarHeart size={12} /> Date planned</Badge>}
                      {st.expiring && <Badge tone="butter"><Hourglass size={12} /> Expires tomorrow, say hi?</Badge>}
                      {!st.expiring && st.daysQuiet >= 7 && <Badge tone="butter">Quiet for {st.daysQuiet} days</Badge>}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {closed.length > 0 && (
        <section className="mt-6">
          <SectionLabel>Closed</SectionLabel>
          <ul className="space-y-2 opacity-75">
            {closed.map(({ m, other, st }) => (
              <li key={m.id} className="flex items-center gap-3 rounded-[20px] bg-paper/60 p-3">
                <Avatar p={other} size={40} />
                <span className="flex-1 text-[13.5px] text-muted">
                  <b className="text-charcoal">{other.name}</b> · {m.endReason === "blocked" ? "Blocked" : m.endedBy === me.id ? "You closed this match kindly" : st.ended && m.status === "active" ? "Expired after 15 quiet days" : "Closed"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
