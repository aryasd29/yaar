import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { DEMO_TABLES } from "@/lib/seed";
import { BUNDLE_PRICE, PARTNER_DISCOUNT, PLANS } from "@/lib/plus";
import type { PlusPlan } from "@/lib/types";

/**
 * One checkout for everything Isle sells. Prices are decided here, never by the browser.
 * POST { action: "order", items: Item[] }  → Razorpay order for the total
 * POST { action: "verify", orderId, paymentId, signature } → checks Razorpay's signature
 * Without RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET it returns { mode: "demo", amount } and the app shows its test checkout.
 * Use Razorpay TEST keys: no real money moves.
 */
type Item =
  | { kind: "plus"; plan: PlusPlan }
  | { kind: "seat"; tableId: string }
  | { kind: "bundle"; plus?: boolean }
  | { kind: "deposit" };

function price(i: Item): number | null {
  switch (i.kind) {
    case "plus": return PLANS[i.plan]?.price ?? null;
    case "seat": return DEMO_TABLES.find((t) => t.id === i.tableId)?.price ?? null;
    // Test mode trusts the Plus flag; in production the server would check the member's subscription.
    case "bundle": return Math.round(BUNDLE_PRICE * (i.plus ? 1 - PARTNER_DISCOUNT : 1));
    case "deposit": return 99;
    default: return null;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;

  if (body.action === "order") {
    const items: Item[] = Array.isArray(body.items) ? body.items.slice(0, 5) : [];
    const prices = items.map(price);
    if (!items.length || prices.some((p) => p === null || p! <= 0)) return NextResponse.json({ error: "Unknown item." }, { status: 400 });
    const amount = prices.reduce((a, b) => a! + b!, 0)! * 100;
    if (!id || !secret) return NextResponse.json({ mode: "demo", amount });
    const r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64") },
      body: JSON.stringify({ amount, currency: "INR", receipt: `isle-${Date.now()}`, notes: { items: JSON.stringify(items).slice(0, 250) } }),
    });
    const j = await r.json();
    if (!r.ok) return NextResponse.json({ error: j?.error?.description ?? "Couldn't start the payment." }, { status: 502 });
    return NextResponse.json({ mode: "live", keyId: id, orderId: j.id, amount: j.amount, test: id.startsWith("rzp_test_") });
  }

  if (body.action === "verify") {
    if (!secret) return NextResponse.json({ ok: false });
    const expected = crypto.createHmac("sha256", secret).update(`${body.orderId}|${body.paymentId}`).digest("hex");
    const ok = typeof body.signature === "string" && body.signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(body.signature));
    return NextResponse.json({ ok });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
