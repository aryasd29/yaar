"use client";
import { Mic } from "lucide-react";
import { Moment } from "./Moment";
import { StarterSticker } from "./StarterSticker";
import { splitHotTake } from "@/lib/logic";
import type { Profile, ReactTarget } from "@/lib/types";

/** Shows the exact scrapbook piece a reaction was about: the photo, the hot take, the voice note or the answer. */
export function ReactedElement({ target, owner }: { target: ReactTarget; owner: Profile }) {
  if (target.kind === "moment") {
    const m = owner.moments.find((x) => x.id === target.refId) ?? owner.moments[0];
    if (!m) return null;
    return <div className="w-[120px]"><Moment m={m} i={1} size="sm" tape={owner.theme?.tape} /></div>;
  }
  if (target.kind === "hottake") {
    const h = splitHotTake(owner);
    return (
      <div className="relative rounded-[14px] bg-butter-soft px-3 pb-2.5 pt-3.5">
        <span className="tape !w-12" aria-hidden />
        {h.prompt && <p className="text-[12px] font-semibold text-butter-ink/80">{h.prompt}</p>}
        <p className="font-display text-[15.5px] font-extrabold leading-snug text-butter-ink">{h.answer}</p>
      </div>
    );
  }
  if (target.kind === "voice" && owner.voice) {
    return (
      <div className="flex items-center gap-2 rounded-[14px] bg-peri-soft px-3 py-2 text-[13.5px] text-peri-ink">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-charcoal text-paper"><Mic size={15} /></span>
        <span className="min-w-0"><b className="block">Voice note · {owner.voice.prompt}</b><span className="block truncate italic">“{owner.voice.transcript}”</span></span>
      </div>
    );
  }
  if (target.kind === "starter") return <StarterSticker text={target.label.replace(/[“”"]/g, "")} />;
  return <div className="rounded-[14px] bg-peri-soft px-3 py-2 text-[13.5px] font-semibold text-peri-ink">This or That · {target.label}</div>;
}
