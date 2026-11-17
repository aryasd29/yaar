import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Email the other person when something important happens (new match, confirmed date).
 * Needs SUPABASE_SERVICE_ROLE_KEY (server only, never exposed) and RESEND_API_KEY.
 * Without them it does nothing. The caller must be signed in and be part of the match.
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, service = process.env.SUPABASE_SERVICE_ROLE_KEY, resend = process.env.RESEND_API_KEY;
  if (!url || !service || !resend) return NextResponse.json({ skipped: true });
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  const { type, matchId } = await req.json().catch(() => ({}));
  if (!token || !matchId || !["match", "date"].includes(type)) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: match } = await admin.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (!match || ![match.user_a, match.user_b].includes(caller.user.id)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const otherId = match.user_a === caller.user.id ? match.user_b : match.user_a;
  const [{ data: other }, { data: me }, { data: priv }] = await Promise.all([
    admin.auth.admin.getUserById(otherId),
    admin.from("profiles").select("data").eq("id", caller.user.id).maybeSingle(),
    admin.from("private_details").select("data").eq("id", otherId).maybeSingle(),
  ]);
  const email = other.user?.email;
  const prefs = (priv?.data as { settings?: { notifications?: Record<string, boolean> } } | null)?.settings?.notifications;
  if (!email || (type === "match" && prefs?.reactions === false) || (type === "date" && prefs?.dateReminders === false)) return NextResponse.json({ skipped: true });

  const name = (me?.data as { name?: string } | null)?.name ?? "Someone";
  const site = new URL(req.url).origin;
  const subject = type === "match" ? `You and ${name} found each other on Isle` : `${name} confirmed your date on Isle`;
  const line = type === "match" ? `${name} reacted back. Your chat is open whenever you're ready.` : `${name} locked in your date. The details are in your chat.`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resend}` },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM ?? "Isle <onboarding@resend.dev>", to: email, subject,
      html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;background:#FFF9F0;border-radius:20px;color:#1b2d45"><h2 style="margin:0 0 8px">${subject}</h2><p>${line}</p><p><a href="${site}/chats/${matchId}" style="display:inline-block;background:#FF7A5C;color:#1b2d45;padding:12px 20px;border-radius:14px;font-weight:700;text-decoration:none">Open Isle</a></p><p style="font-size:12px;color:#5d6878">You can turn these emails off in Profile → Notifications.</p></div>`,
    }),
  });
  return NextResponse.json({ sent: r.ok });
}
