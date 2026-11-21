"use client";
import { useSyncExternalStore } from "react";
import { CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Sheet, Toggle } from "./ui";
import { checkout, payable } from "@/lib/pay";

/** Isle's checkout sheet: what you're buying, at server prices, with Isle credit if you have any. */
export function TestCheckout() {
  const c = useSyncExternalStore(checkout.subscribe, checkout.get, () => null);
  const p = c ? payable(c.quote, c.useCredit) : null;
  const cancel = () => { if (!c?.busy) c?.decide(null); };
  return (
    <Sheet open={!!c} onClose={cancel} title="Checkout">
      {c && p && (
        <div>
          <p className="font-display text-[19px] font-extrabold">{c.title}</p>
          <ul className="mt-3 space-y-1.5 rounded-[16px] bg-vanilla p-3 text-[14px]">
            {c.quote.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{l.label}{l.freePlus && <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-butter px-1.5 text-[11px] font-bold"><Sparkles size={10} /> Plus seat</span>}</span>
                <span className="shrink-0 font-semibold">{l.price === 0 ? "Free" : `₹${l.price}`}</span>
              </li>
            ))}
            {p.credit > 0 && <li className="flex justify-between text-sage-ink"><span>Isle credit</span><span className="font-semibold">−₹{p.credit}</span></li>}
            <li className="flex justify-between border-t border-line pt-2 font-bold"><span>To pay</span><span>₹{p.amount}</span></li>
          </ul>
          {c.quote.credit > 0 && (
            <div className="mt-2"><Toggle checked={c.useCredit} onChange={(v) => checkout.set({ useCredit: v })} label={`Use my Isle credit (₹${c.quote.credit})`} description="The show-up promise is always paid by card, so it can be refunded to it." /></div>
          )}
          <div className="mt-3 flex items-start gap-2 rounded-[14px] bg-butter-soft px-3 py-2 text-[13px] text-butter-ink">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            <span>{c.quote.provider === "razorpay" ? <><b>Razorpay test mode.</b> Pay with Razorpay&apos;s test card or UPI ID success@razorpay. No real money moves.</> : <><b>Test mode.</b> No real money moves. Add Razorpay test keys to use Razorpay&apos;s checkout.</>}</span>
          </div>
          {c.error && <p role="alert" className="mt-3 rounded-xl bg-coral-soft px-3 py-2 text-[13.5px] text-coral-ink">{c.error}</p>}
          <Button full className="mt-4" disabled={c.busy} onClick={() => c.decide({ useCredit: c.useCredit })}>
            <CreditCard size={17} /> {c.busy ? "Working…" : p.amount === 0 ? "Confirm" : c.quote.provider === "razorpay" ? `Continue to pay ₹${p.amount}` : `Pay ₹${p.amount} (test)`}
          </Button>
          <button className="mt-1 min-h-11 w-full text-[14px] font-semibold text-muted disabled:opacity-50" disabled={c.busy} onClick={cancel}>Cancel</button>
        </div>
      )}
    </Sheet>
  );
}
