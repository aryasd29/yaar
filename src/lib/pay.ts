"use client";
/**
 * Paying for things on Isle. Razorpay Checkout when the server has keys (test keys: no real money moves);
 * otherwise an in-app test checkout, clearly labelled, so the whole flow can be tried.
 */
export type PayItem = { kind: "plus"; plan: "intro" | "monthly" | "quarterly" } | { kind: "seat"; tableId: string } | { kind: "bundle"; plus?: boolean } | { kind: "deposit" };
export type PayResult = { status: "paid"; paymentId: string; amount: number; test: boolean } | { status: "cancelled" } | { status: "error"; error: string };


/* The in-app test checkout is a small dialog rendered by <TestCheckout/> in the app frame. */
type Pending = { title: string; amount: number; lines: string[]; resolve: (r: PayResult) => void };
let pending: Pending | null = null;
const listeners = new Set<() => void>();
export const testCheckout = {
  get: () => pending,
  subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
  finish: (r: PayResult) => { const p = pending; pending = null; listeners.forEach((l) => l()); p?.resolve(r); },
};

export async function pay(items: PayItem[], who: { name?: string; email?: string }, title: string, lines: string[]): Promise<PayResult> {
  try {
    const r = await fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "order", items }) });
    const j = await r.json();
    if (!r.ok) return { status: "error", error: j.error ?? "Couldn't start the payment." };
    if (j.mode === "demo") {
      return await new Promise<PayResult>((resolve) => { pending = { title, amount: j.amount / 100, lines, resolve }; listeners.forEach((l) => l()); });
    }
    if (!window.Razorpay) {
      await new Promise<void>((res, rej) => { const sc = document.createElement("script"); sc.src = "https://checkout.razorpay.com/v1/checkout.js"; sc.onload = () => res(); sc.onerror = () => rej(new Error("load")); document.body.appendChild(sc); });
    }
    return await new Promise<PayResult>((resolve) => {
      const rz = new window.Razorpay!({
        key: j.keyId, order_id: j.orderId, amount: j.amount, currency: "INR", name: "Isle", description: title,
        prefill: { name: who.name, email: who.email }, theme: { color: "#FF7A5C" },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const v = await fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature }) }).then((x) => x.json());
          resolve(v.ok ? { status: "paid", paymentId: resp.razorpay_payment_id, amount: j.amount / 100, test: !!j.test } : { status: "error", error: "We couldn't confirm that payment." });
        },
        modal: { ondismiss: () => resolve({ status: "cancelled" }) },
      });
      rz.open();
    });
  } catch {
    return { status: "error", error: "Couldn't reach the payment service. Check your connection." };
  }
}
