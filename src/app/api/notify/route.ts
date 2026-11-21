import { NextResponse } from "next/server";
import webpush from "web-push";
import { adminClient, caller } from "@/lib/server/supa";

/**
 * Tell the other person when something happens: a new match, a confirmed date or a new message.
 *  - Push notifications to every device they've turned them on for (needs VAPID keys).
 *  - Email for matches and dates (needs RESEND_API_KEY).
 * Message notifications never include the message itself, and are sent at most once a minute per chat.
 * The caller must be signed in and part of the match. Each person's notification settings are respected.
 */
type Prefs = { reactions?: boolean; messages?: boolean; dateReminders?: boolean };

export async function POST(req: Request) {
  const db = adminClient();
  if (!db) return NextResponse.json({ skipped: true });
  const user = await caller(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { type, matchId } = await req.json().catch(() => ({}));
  if (!matchId || !["match", "date", "message"].includes(type)) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { data: match } = await db.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (!match || ![match.user_a, match.user_b].includes(user.id)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const otherId = match.user_a === user.id ? match.user_b : match.user_a;

  // At most one message notification per chat per minute
  if (type === "message") {
    const { count } = await db.from("messages").select("id", { count: "exact", head: true })
      .eq("match_id", matchId).eq("from_id", user.id).gt("created_at", new Date(Date.now() - 60_000).toISOString());
    if ((count ?? 0) > 1) return NextResponse.json({ skipped: "recent" });
  }

  const [{ data: me }, { data: priv }] = await Promise.all([
    db.from("profiles").select("data").eq("id", user.id).maybeSingle(),
    db.from("private_details").select("data").eq("id", otherId).maybeSingle(),
  ]);
  const prefs = (priv?.data as { settings?: { notifications?: Prefs } } | null)?.settings?.notifications ?? {};
  const wanted = type === "match" ? prefs.reactions !== false : type === "date" ? prefs.dateReminders !== false : prefs.messages !== false;
  if (!wanted) return NextResponse.json({ skipped: "settings" });

  const name = (me?.data as { name?: string } | null)?.name ?? "Someone";
  const site = new URL(req.url).origin;
  const title = type === "match" ? `You and ${name} found each other` : type === "date" ? `${name} confirmed your date` : `New message from ${name}`;
  const body = type === "match" ? `${name} reacted back. Your chat is open.` : type === "date" ? "The details are in your chat." : "Open Isle to read it.";
  const url = `/chats/${matchId}`;
  const out: { push?: number; email?: boolean } = {};

  // Push
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv_ = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv_) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hello@isle.app", pub, priv_);
    const { data: subs } = await db.from("push_subscriptions").select("endpoint, keys").eq("user_id", otherId);
    let sent = 0;
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title, body, url, tag: `${type}-${matchId}` }), { TTL: 3600 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint); // device unsubscribed
      }
    }
    out.push = sent;
  }

  // Email (matches and dates only)
  const resend = process.env.RESEND_API_KEY;
  if (resend && type !== "message") {
    const { data: other } = await db.auth.admin.getUserById(otherId);
    const email = other.user?.email;
    if (email) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resend}` },
        body: JSON.stringify({
          from: process.env.NOTIFY_FROM ?? "Isle <onboarding@resend.dev>", to: email, subject: `${title} on Isle`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;background:#FFF9F0;border-radius:20px;color:#1b2d45"><h2 style="margin:0 0 8px">${title}</h2><p>${body}</p><p><a href="${site}${url}" style="display:inline-block;background:#FF7A5C;color:#1b2d45;padding:12px 20px;border-radius:14px;font-weight:700;text-decoration:none">Open Isle</a></p><p style="font-size:12px;color:#5d6878">You can turn these off in Profile → Notifications.</p></div>`,
        }),
      });
      out.email = r.ok;
    }
  }
  return NextResponse.json(out);
}
