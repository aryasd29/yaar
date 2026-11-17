"use client";
import { useEffect, useState } from "react";
import { demoToolsEnabled } from "@/lib/config";
import { ChevronDown, FastForward, RotateCcw } from "lucide-react";
import { useYaar } from "@/lib/store";
import { PrototypeTag } from "./ui";

/** Evaluator-only helper: time-based features (drops, expiry) are hard to see without moving the clock. */
export function DemoClock() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const { fastForward, resetDemo, clockOffset } = useYaar();
  useEffect(() => setEnabled(demoToolsEnabled()), []);
  if (!enabled) return null;
  const days = Math.round(clockOffset / 86_400_000);
  return (
    <div className="mt-6 rounded-[20px] border-2 border-dashed border-peri-ink/30 bg-peri-soft/50 p-3">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-10 w-full items-center justify-between gap-2 text-left">
        <span className="flex items-center gap-2"><PrototypeTag>Demo tools</PrototypeTag><span className="text-[13px] font-semibold text-peri-ink">Move the clock</span></span>
        <ChevronDown size={18} className={open ? "rotate-180 text-peri-ink transition" : "text-peri-ink transition"} />
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-[12.5px] text-peri-ink">Drops, date nudges and match expiry depend on time. Skip ahead to see them. {days > 0 && `Clock is ${days} day${days > 1 ? "s" : ""} ahead.`}</p>
          <div className="flex flex-wrap gap-2">
            {[1, 5, 14].map((d) => (
              <button key={d} onClick={() => fastForward(d)} className="flex min-h-10 items-center gap-1 rounded-full bg-paper px-3 text-[13px] font-semibold text-peri-ink shadow-soft"><FastForward size={14} /> +{d} day{d > 1 ? "s" : ""}</button>
            ))}
            <button onClick={() => { if (confirm("Reset the demo? This clears your profile on this device.")) { resetDemo(); location.href = "/"; } }} className="flex min-h-10 items-center gap-1 rounded-full bg-paper px-3 text-[13px] font-semibold text-danger shadow-soft"><RotateCcw size={14} /> Reset demo</button>
          </div>
        </div>
      )}
    </div>
  );
}
