"use client";
/**
 * Paying for things on Isle.
 * 1. The server prices the basket (Plus perks and Isle credit included) and the member reviews it in Isle's checkout sheet.
 * 2. Then Razorpay Checkout opens (with Razorpay test keys: real checkout, no real money), or, without keys,
 *    Isle's own labelled test payment. The server records the payment and applies what was bought.
 * Without a database (the offline demo) the sheet works the same and nothing leaves the device.
 */
import { LIVE, api, type RazorpayResponse } from "./remote";
import { BUNDLE_PRICE, PARTNER_DISCOUNT, PLANS } from "./plus";

export type PayItem =
  | { kind: "plus"; plan: "intro" | "monthly" | "quarterly" }
  | { kind: "seat"; tableId: string; price?: number; title?: string }
  | { kind: "bundle"; planId: string }
  | { kind: "deposit"; planId: string };
export type PayResult = { status: "paid"; payment: string; amount: number; test: boolean } | { status: "cancelled" } | { status: "error"; error: string };
export type QuoteLine = { label: string; price: number; freePlus?: boolean; item: PayItem };
export type Quote = { lines: QuoteLine[]; total: number; credit: number; provider: "razorpay" | "test" | "demo" };

/* ---------- the checkout sheet (rendered by <TestCheckout/>) ---------- */
export type CheckoutState = {
  title: string; quote: Quote; useCredit: boolean; busy: boolean; error?: string;
  decide: (choice: { useCredit: boolean } | null) => void;
};
let state: CheckoutState | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const checkout = {
  get: () => state,
  subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
  set: (patch: Partial<CheckoutState>) => { if (state) { state = { ...state, ...patch }; emit(); } },
  close: () => { state = null; emit(); },
};

/** Card total once credit is applied. Deposits are always paid by card so they can be refunded to it. */
export function payable(q: Quote, useCredit: boolean) {
  const deposits = q.lines.filter((l) => l.item.kind === "deposit").reduce((a, l) => a + l.price, 0);
  const credit = useCredit ? Math.min(Math.max(q.credit, 0), q.total - deposits) : 0;
  return { credit, amount: q.total - credit };
}

function localQuote(items: PayItem[], plus: boolean): Quote {
  const lines: QuoteLine[] = items.map((i) => {
    switch (i.kind) {
      case "plus": return { item: i, label: `Isle Plus, ${PLANS[i.plan].label.toLowerCase()}`, price: PLANS[i.plan].price };
      case "seat": return { item: i, label: `Seat: ${i.title ?? "Table"}`, price: i.price ?? 0 };
      case "bundle": return { item: i, label: "Coffee and dessert for two", price: Math.round(BUNDLE_PRICE * (plus ? 1 - PARTNER_DISCOUNT : 1)) };
      case "deposit": return { item: i, label: "Show-up promise (refundable)", price: 99 };
    }
  });
  return { lines, total: lines.reduce((a, l) => a + l.price, 0), credit: 0, provider: "demo" };
}

async function loadRazorpay() {
  if (window.Razorpay) return;
  await new Promise<void>((res, rej) => { const sc = document.createElement("script"); sc.src = "https://checkout.razorpay.com/v1/checkout.js"; sc.onload = () => res(); sc.onerror = () => rej(new Error("load")); document.body.appendChild(sc); });
}

export async function pay(items: PayItem[], who: { name?: string; email?: string }, title: string, opts?: { plus?: boolean }): Promise<PayResult> {
  // 1. Price it
  let quote: Quote;
  if (LIVE) {
    const q = await api<Quote>("/api/pay", { action: "quote", items });
    if (q.error) return { status: "error", error: q.error };
    quote = q;
  } else quote = localQuote(items, !!opts?.plus);

  // 2. Review in Isle's checkout sheet; payment happens from inside it
  return await new Promise<PayResult>((resolve) => {
    const finish = (r: PayResult) => { checkout.close(); resolve(r); };
    state = {
      title, quote, useCredit: quote.credit > 0, busy: false,
      decide: async (choice) => {
        if (!choice) return finish({ status: "cancelled" });
        if (!LIVE) return finish({ status: "paid", payment: `demo_${Date.now().toString(36)}`, amount: payable(quote, false).amount, test: true });
        checkout.set({ busy: true, error: undefined });
        const o = await api<{ mode: "free" | "test" | "razorpay"; payment: string; amount: number; keyId?: string; orderId?: string; test?: boolean }>("/api/pay", { action: "order", items, useCredit: choice.useCredit });
        if (o.error) return checkout.set({ busy: false, error: o.error });
        if (o.mode === "free") return finish({ status: "paid", payment: o.payment, amount: 0, test: true });
        if (o.mode === "test") {
          const c = await api("/api/pay", { action: "confirm", payment: o.payment });
          if (c.error) return checkout.set({ busy: false, error: c.error });
          return finish({ status: "paid", payment: o.payment, amount: o.amount, test: true });
        }
        try { await loadRazorpay(); } catch { return checkout.set({ busy: false, error: "Couldn't load Razorpay. Check your connection." }); }
        checkout.close();
        const rz = new window.Razorpay!({
          key: o.keyId, order_id: o.orderId, amount: o.amount * 100, currency: "INR", name: "Isle", description: title,
          prefill: { name: who.name, email: who.email }, theme: { color: "#FF7A5C" },
          handler: async (resp: RazorpayResponse) => {
            const c = await api("/api/pay", { action: "confirm", payment: o.payment, orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature });
            resolve(c.error ? { status: "error", error: c.error } : { status: "paid", payment: o.payment, amount: o.amount, test: !!o.test });
          },
          modal: { ondismiss: () => resolve({ status: "cancelled" }) },
        });
        rz.open();
      },
    };
    emit();
  });
}
