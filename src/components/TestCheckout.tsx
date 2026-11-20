"use client";
import { useSyncExternalStore } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { Button, Sheet } from "./ui";
import { testCheckout } from "@/lib/pay";

/** The labelled test checkout used when no payment provider keys are set. No money moves. */
export function TestCheckout() {
  const p = useSyncExternalStore(testCheckout.subscribe, testCheckout.get, () => null);
  return (
    <Sheet open={!!p} onClose={() => testCheckout.finish({ status: "cancelled" })} title="Checkout">
      {p && (
        <div>
          <p className="font-display text-[19px] font-extrabold">{p.title}</p>
          <ul className="mt-3 space-y-1.5 rounded-[16px] bg-vanilla p-3 text-[14px]">
            {p.lines.map((l) => <li key={l}>{l}</li>)}
            <li className="flex justify-between border-t border-line pt-2 font-bold"><span>Total</span><span>₹{p.amount}</span></li>
          </ul>
          <div className="mt-3 flex items-start gap-2 rounded-[14px] bg-butter-soft px-3 py-2 text-[13px] text-butter-ink">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            <span><b>Test mode.</b> No real money moves. With Razorpay keys set, this opens Razorpay&apos;s secure checkout instead.</span>
          </div>
          <Button full className="mt-4" onClick={() => testCheckout.finish({ status: "paid", paymentId: `test_${Date.now().toString(36)}`, amount: p.amount, test: true })}><CreditCard size={17} /> Pay ₹{p.amount} (test)</Button>
          <button className="mt-1 min-h-11 w-full text-[14px] font-semibold text-muted" onClick={() => testCheckout.finish({ status: "cancelled" })}>Cancel</button>
        </div>
      )}
    </Sheet>
  );
}
