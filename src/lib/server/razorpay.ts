import "server-only";
import crypto from "node:crypto";

/** Razorpay, used with TEST keys (rzp_test_…): real checkout and refunds, no real money. */
const keys = () => ({ id: process.env.RAZORPAY_KEY_ID, secret: process.env.RAZORPAY_KEY_SECRET });
export const razorpayOn = () => !!(keys().id && keys().secret);
const auth = () => "Basic " + Buffer.from(`${keys().id}:${keys().secret}`).toString("base64");

export async function createOrder(amountRupees: number, receipt: string, notes: Record<string, string>) {
  const r = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: auth() },
    body: JSON.stringify({ amount: amountRupees * 100, currency: "INR", receipt: receipt.slice(0, 40), notes }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.description ?? "Couldn't start the payment.");
  return { orderId: j.id as string, keyId: keys().id!, test: keys().id!.startsWith("rzp_test_") };
}

export function signatureOk(orderId: string, paymentId: string, signature: string) {
  const secret = keys().secret;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/** Refund part or all of a captured payment. Returns false if Razorpay refused. */
export async function refund(paymentId: string, amountRupees: number, note: string) {
  if (!razorpayOn()) return true;
  const r = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: auth() },
    body: JSON.stringify({ amount: amountRupees * 100, notes: { reason: note.slice(0, 200) } }),
  });
  return r.ok;
}
