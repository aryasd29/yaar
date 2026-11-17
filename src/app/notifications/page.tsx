"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CalendarHeart, Heart, Hourglass, Mail, MessageCircle, Settings, Sparkles, DoorOpen } from "lucide-react";
import { Frame, Loading, useRequireMe } from "@/components/Shell";
import { Avatar } from "@/components/Moment";
import { Button, Chip, EmptyState } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { useYaar } from "@/lib/store";
import { relTime } from "@/lib/logic";
import { useNotifications, type NotifKind } from "@/lib/notifications";

const ICON: Record<NotifKind, { icon: React.ReactNode; tone: string }> = {
  reaction: { icon: <Heart size={16} />, tone: "bg-coral" },
  match: { icon: <Sparkles size={16} />, tone: "bg-butter" },
  message: { icon: <MessageCircle size={16} />, tone: "bg-peri" },
  date: { icon: <CalendarHeart size={16} />, tone: "bg-sage" },
  feedback: { icon: <CalendarHeart size={16} />, tone: "bg-sage" },
  expiring: { icon: <Hourglass size={16} />, tone: "bg-butter" },
  drop: { icon: <Mail size={16} />, tone: "bg-coral" },
  closed: { icon: <DoorOpen size={16} />, tone: "bg-peri" },
};

export default function NotificationsPage() {
  return <Frame nav width="medium"><Notifications /></Frame>;
}

function Notifications() {
  const me = useRequireMe();
  const router = useRouter();
  const { people, markNotifs, notifRead, now } = useYaar();
  const { items, unread } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  if (!me) return <Loading />;
  const t = now();
  const list = items.filter((i) => filter === "all" || !notifRead[i.id]);
  const today = list.filter((i) => t - i.at < 86_400_000);
  const earlier = list.filter((i) => t - i.at >= 86_400_000);

  const Row = ({ n }: { n: (typeof items)[number] }) => {
    const isUnread = !notifRead[n.id];
    const who = n.avatarOf ? people.find((p) => p.id === n.avatarOf) : undefined;
    return (
      <li>
        <button onClick={() => { markNotifs([n.id]); router.push(n.href); }}
          className={clsx("flex w-full items-start gap-3 rounded-[20px] p-3 text-left transition hover:bg-paper focus-visible:bg-paper", isUnread ? "bg-paper shadow-soft" : "")}>
          <span className="relative shrink-0">
            {who ? <Avatar p={who} size={46} /> : <span className={clsx("grid h-[46px] w-[46px] place-items-center rounded-full border-2 border-charcoal", ICON[n.kind].tone)}>{ICON[n.kind].icon}</span>}
            {who && <span className={clsx("absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-charcoal", ICON[n.kind].tone)}>{ICON[n.kind].icon}</span>}
          </span>
          <span className="min-w-0 flex-1">
            <span className={clsx("block text-[15px]", isUnread ? "font-bold" : "font-medium")}>{n.title}</span>
            <span className="block truncate text-[13.5px] text-muted">{n.body}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="text-[12px] text-muted">{relTime(n.at, t)}</span>
            {isUnread && <span className="h-2.5 w-2.5 rounded-full bg-coral" aria-label="Unread" />}
          </span>
        </button>
      </li>
    );
  };

  return (
    <main className="pb-10">
      <PageHeader title="Notifications" sub="Reactions, matches, messages and dates, all in one place." right={
        <Link href="/profile/settings/notifications" aria-label="Notification settings" className="grid h-11 w-11 place-items-center rounded-full hover:bg-charcoal/5"><Settings size={19} /></Link>
      } />
      <div className="px-5 md:px-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
            <Chip active={filter === "unread"} onClick={() => setFilter("unread")}>Unread ({unread})</Chip>
          </div>
          {unread > 0 && <Button variant="ghost" className="!min-h-10" onClick={() => markNotifs(items.map((i) => i.id))}>Mark all as read</Button>}
        </div>
        {list.length === 0 ? (
          <EmptyState mood="calm" title={filter === "unread" ? "You're all caught up" : "Nothing yet"} body={filter === "unread" ? "No unread notifications. Nice." : "Reactions, matches and date reminders will show up here."} action={filter === "unread" ? <Button variant="secondary" onClick={() => setFilter("all")}>Show all</Button> : <Button href="/today">Go to the shore</Button>} />
        ) : (
          <div className="mt-4 space-y-5">
            {today.length > 0 && <section><h2 className="mb-1 px-1 text-[15px] text-muted">Today</h2><ul className="space-y-1">{today.map((n) => <Row key={n.id} n={n} />)}</ul></section>}
            {earlier.length > 0 && <section><h2 className="mb-1 px-1 text-[15px] text-muted">Earlier</h2><ul className="space-y-1">{earlier.map((n) => <Row key={n.id} n={n} />)}</ul></section>}
          </div>
        )}
      </div>
    </main>
  );
}
