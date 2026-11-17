"use client";
import clsx from "clsx";
import { Sheet } from "./ui";
import { useYaar } from "@/lib/store";
import { BATTERY, type Battery } from "@/lib/types";

export function BatterySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useYaar((s) => s.me);
  const setBattery = useYaar((s) => s.setBattery);
  return (
    <Sheet open={open} onClose={onClose} title="Your social battery">
      <p className="-mt-1 mb-4 text-[14px] text-muted">Only you see this. It decides whether you get new introductions and reminders.</p>
      <div className="space-y-2.5">
        {(Object.keys(BATTERY) as Battery[]).map((b) => (
          <button key={b} onClick={() => { setBattery(b); onClose(); }} aria-pressed={me?.battery === b}
            className={clsx("flex min-h-16 w-full items-center gap-3 rounded-[18px] border-2 px-4 text-left transition", me?.battery === b ? "border-sage-ink bg-sage-soft" : "border-line bg-paper")}>
            <span className="text-[26px]" aria-hidden>{BATTERY[b].emoji}</span>
            <span><span className="block font-semibold">{BATTERY[b].label}</span><span className="block text-[13.5px] text-muted">{BATTERY[b].desc}</span></span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
