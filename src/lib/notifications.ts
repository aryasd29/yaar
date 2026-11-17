"use client";
import { DAY } from "./logic";
import { matchState, useYaar } from "./store";
import { lastYaarHour } from "./config";

export type NotifKind = "reaction" | "match" | "message" | "date" | "feedback" | "expiring" | "drop" | "closed";
export interface Notif { id: string; kind: NotifKind; title: string; body: string; href: string; at: number; avatarOf?: string }

/**
 * The notification feed is built from what's actually in your account (reactions, matches, messages,
 * dates and drops), so it never shows anything that didn't happen.
 */
export function useNotifications() {
  const s = useYaar();
  const me = s.me;
  if (!me) return { items: [] as Notif[], unread: 0 };
  const now = s.now();
  const name = (id: string) => s.people.find((p) => p.id === id)?.name ?? "Someone";
  const items: Notif[] = [];

  for (const r of s.reactions.filter((r) => r.to === me.id && r.status === "pending")) {
    items.push({ id: `rx:${r.id}`, kind: "reaction", title: `${name(r.from)} reacted to ${r.target.label}`, body: r.note || "Tap to see it and react back.", href: "/likes", at: r.createdAt, avatarOf: r.from });
  }
  for (const m of s.matches) {
    const other = m.users[1];
    const st = matchState(m, now);
    items.push({ id: `match:${m.id}`, kind: "match", title: `You matched with ${name(other)}`, body: "Your chat is open. Say hi when you're ready.", href: `/chats/${m.id}`, at: m.createdAt, avatarOf: other });
    if (m.status === "ended" && m.endedBy && m.endedBy !== me.id && m.endReason !== "blocked") {
      items.push({ id: `closed:${m.id}`, kind: "closed", title: `${name(other)} closed the match`, body: "They sent a kind note. No hard feelings, and good luck out there.", href: "/chats", at: m.lastActivityAt });
    }
    if (!st.ended && st.expiring) items.push({ id: `exp:${m.id}:${Math.floor(now / DAY)}`, kind: "expiring", title: `Your match with ${name(other)} expires tomorrow`, body: "No messages for 14 days. Say hi to keep it.", href: `/chats/${m.id}`, at: now - 60_000, avatarOf: other });
    const last = [...s.messages].reverse().find((x) => x.matchId === m.id && x.kind === "text");
    if (last && last.from === other && m.status === "active") items.push({ id: `msg:${last.id}`, kind: "message", title: `New message from ${name(other)}`, body: last.body, href: `/chats/${m.id}`, at: last.createdAt, avatarOf: other });
  }
  for (const p of s.plans) {
    const m = s.matches.find((x) => x.id === p.matchId);
    if (!m) continue;
    const other = m.users[1];
    if (p.stage === "confirmed" && p.slot) {
      const t = new Date(p.slot).getTime();
      items.push({ id: `date:${p.id}`, kind: "date", title: `Date with ${name(other)} is confirmed`, body: new Date(t).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }), href: `/date/${p.id}`, at: p.createdAt, avatarOf: other });
    }
    if (p.stage === "checkedin") items.push({ id: `fb:${p.id}`, kind: "feedback", title: `How did it go with ${name(other)}?`, body: "Your answer stays private.", href: `/date/${p.id}`, at: p.createdAt + 60_000, avatarOf: other });
  }
  if (s.drop.ids.length && me.battery !== "low") {
    const sealed = s.drop.ids.filter((x) => !s.drop.opened.includes(x)).length;
    if (sealed) items.push({ id: `drop:${s.drop.day}`, kind: "drop", title: "The tide brought new bottles", body: `${sealed} still sealed. Open them one at a time.`, href: "/today", at: lastYaarHour(now).getTime() });
  }

  items.sort((a, b) => b.at - a.at);
  const unread = items.filter((i) => !s.notifRead[i.id]).length;
  return { items, unread };
}
