import { NextResponse } from "next/server";
import { adminClient, caller, dbError } from "@/lib/server/supa";
import { createOrder, razorpayOn, refund, signatureOk } from "@/lib/server/razorpay";

/**
 * One checkout for everything Isle sells: Isle Plus, Tables seats, date bundles and the ₹99 show-up promise.
 * Prices, Plus perks and Isle credit are worked out by the database (price_items), never by the browser,
 * and only this server can record a payment.
 *
 *   quote       { items }                       → lines, total, credit available
 *   order       { items, useCredit }            → { mode: "free" | "test" | "razorpay", payment, amount, ... }
 *   confirm     { payment, orderId?, paymentId?, signature? } → records it and applies what was bought
 *   cancelSeat  { tableId }                     → cancels a seat, refunding when allowed
 *   cancelTable { tableId }                     → host cancels; everyone with a paid seat is refunded
 *   settle      { planId }                      → settles a date's show-up promise and bundles
 *
 * With Razorpay TEST keys, people pay through Razorpay's real checkout and refunds go back through Razorpay.
 * Without keys, the app shows its own labelled test checkout. Either way, no real money moves.
 */
type Refund = { payment: string | null; provider_id: string | null; provider: string | null; amount: number; why?: string };

export async function POST(req: Request) {
  const db = adminClient();
  if (!db) return NextResponse.json({ error: "Payments aren't set up on this server yet (SUPABASE_SERVICE_ROLE_KEY is missing)." }, { status: 503 });
  const user = await caller(req);
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items.slice(0, 5) : [];

  const sendRefunds = async (list: Refund[], note: string) => {
    for (const r of list) {
      if (!r.payment || r.amount <= 0) continue;
      const ok = r.provider === "razorpay" && r.provider_id ? await refund(r.provider_id, r.amount, note) : true;
      if (ok) await db.rpc("mark_refunded", { pid: r.payment, amount: r.amount });
    }
  };

  switch (body.action) {
    case "quote": {
      const { data, error } = await db.rpc("price_items", { u: user.id, items });
      if (error) return NextResponse.json({ error: dbError(error) }, { status: 400 });
      return NextResponse.json({ ...data, provider: razorpayOn() ? "razorpay" : "test" });
    }

    case "order": {
      const provider = razorpayOn() ? "razorpay" : "test";
      const { data, error } = await db.rpc("create_order", { u: user.id, items, use_credit: !!body.useCredit, provider_: provider });
      if (error) return NextResponse.json({ error: dbError(error) }, { status: 400 });
      const o = data as { payment: string; amount: number; credit: number; total: number };
      if (o.amount === 0) {
        const f = await db.rpc("fulfil_payment", { pid: o.payment, provider_payment: null });
        if (f.error) return NextResponse.json({ error: dbError(f.error) }, { status: 409 });
        return NextResponse.json({ mode: "free", payment: o.payment, amount: 0, credit: o.credit, done: true });
      }
      if (provider === "test") return NextResponse.json({ mode: "test", payment: o.payment, amount: o.amount, credit: o.credit });
      try {
        const rz = await createOrder(o.amount, o.payment, { isle_payment: o.payment, member: user.id });
        await db.from("payments").update({ order_id: rz.orderId }).eq("id", o.payment);
        return NextResponse.json({ mode: "razorpay", payment: o.payment, amount: o.amount, credit: o.credit, ...rz });
      } catch (e) {
        await db.from("payments").update({ status: "failed" }).eq("id", o.payment);
        return NextResponse.json({ error: (e as Error).message }, { status: 502 });
      }
    }

    case "confirm": {
      const { data: p } = await db.from("payments").select("*").eq("id", body.payment).eq("user_id", user.id).maybeSingle();
      if (!p) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
      let providerPayment: string;
      if (p.provider === "razorpay") {
        if (body.orderId !== p.order_id || !signatureOk(body.orderId, body.paymentId, body.signature)) {
          return NextResponse.json({ error: "We couldn't confirm that payment with Razorpay." }, { status: 400 });
        }
        providerPayment = body.paymentId;
      } else if (p.provider === "test" && !razorpayOn()) {
        providerPayment = `test_${p.id.slice(0, 8)}`;
      } else return NextResponse.json({ error: "This payment can't be confirmed that way." }, { status: 400 });
      const { error } = await db.rpc("fulfil_payment", { pid: p.id, provider_payment: providerPayment });
      if (error) {
        // Paid but couldn't be applied (for example the Table filled up in the meantime): give the money back.
        if (p.provider === "razorpay") await refund(providerPayment, p.amount, "Couldn't complete the booking");
        await db.from("payments").update({ status: "refunded", payment_id: providerPayment }).eq("id", p.id);
        return NextResponse.json({ error: `${dbError(error)} You haven't been charged.` }, { status: 409 });
      }
      return NextResponse.json({ ok: true, payment: p.id });
    }

    case "cancelSeat": {
      const { data, error } = await db.rpc("cancel_seat", { u: user.id, t: body.tableId });
      if (error) return NextResponse.json({ error: dbError(error) }, { status: 400 });
      const d = data as { refund?: number; payment?: string };
      if (d.refund && d.payment) {
        const { data: p } = await db.from("payments").select("provider, payment_id").eq("id", d.payment).maybeSingle();
        await sendRefunds([{ payment: d.payment, provider: p?.provider ?? null, provider_id: p?.payment_id ?? null, amount: d.refund }], "Table seat cancelled");
      }
      return NextResponse.json({ ok: true, refund: d.refund ?? 0 });
    }

    case "cancelTable": {
      const { data, error } = await db.rpc("cancel_table", { u: user.id, t: body.tableId });
      if (error) return NextResponse.json({ error: dbError(error) }, { status: 400 });
      const list = (data as { refund?: number; payment?: string }[]).filter((x) => x.refund && x.payment);
      const ids = list.map((x) => x.payment!);
      const { data: ps } = ids.length ? await db.from("payments").select("id, provider, payment_id").in("id", ids) : { data: [] as { id: string; provider: string; payment_id: string }[] };
      await sendRefunds(list.map((x) => { const p = ps?.find((y) => y.id === x.payment); return { payment: x.payment!, provider: p?.provider ?? null, provider_id: p?.payment_id ?? null, amount: x.refund! }; }), "The host cancelled this Table");
      return NextResponse.json({ ok: true, refunded: list.length });
    }

    case "settle": {
      const { data: plan } = await db.from("plans").select("id, match_id").eq("id", body.planId).maybeSingle();
      if (!plan) return NextResponse.json({ error: "Date not found." }, { status: 404 });
      const { data: m } = await db.from("matches").select("user_a, user_b").eq("id", plan.match_id).maybeSingle();
      if (!m || ![m.user_a, m.user_b].includes(user.id)) return NextResponse.json({ error: "Not your date." }, { status: 403 });
      const { data, error } = await db.rpc("settle_date", { p: plan.id });
      if (error) return NextResponse.json({ error: dbError(error) }, { status: 400 });
      await sendRefunds(data as Refund[], "Isle show-up promise");
      return NextResponse.json({ ok: true, settled: (data as Refund[]).length });
    }
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
