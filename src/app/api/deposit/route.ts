import { NextResponse } from "next/server";
import crypto from "node:crypto";

/**
 * The ₹99 show-up promise, via Razorpay.
 * POST { action: "order", planId }                       → creates a ₹99 order
 * POST { action: "verify", orderId, paymentId, signature } → checks Razorpay's signature
 * Without RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET it answers { mode: "demo" } and the app keeps its test-mode flow.
 * Use Razorpay *test* keys: no real money moves.
 */
export async function POST(req: Request) {
  const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) return NextResponse.json({ mode: "demo" });
  const body = await req.json().catch(() => ({}));

  if (body.action === "order") {
    const r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64") },
      body: JSON.stringify({ amount: 9900, currency: "INR", receipt: String(body.planId ?? "plan").slice(0, 40), notes: { purpose: "Isle show-up promise" } }),
    });
    const j = await r.json();
    if (!r.ok) return NextResponse.json({ error: j?.error?.description ?? "Couldn't start the payment." }, { status: 502 });
    return NextResponse.json({ mode: "live", keyId: id, orderId: j.id, amount: j.amount, test: id.startsWith("rzp_test_") });
  }

  if (body.action === "verify") {
    const expected = crypto.createHmac("sha256", secret).update(`${body.orderId}|${body.paymentId}`).digest("hex");
    const ok = typeof body.signature === "string" && body.signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(body.signature));
    return NextResponse.json({ ok });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
