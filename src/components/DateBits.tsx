"use client";
import Link from "next/link";
import clsx from "clsx";
import { CalendarHeart, Clock, MapPin } from "lucide-react";
import { Avatar } from "./Moment";
import { Scene } from "./Scene";
import { Badge } from "./ui";
import { useYaar } from "@/lib/store";
import { VENUES } from "@/lib/seed";
import type { DatePlan } from "@/lib/types";

export const fmtSlot = (iso?: string) => iso ? new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Time not set";

export function usePlan(planId: string) {
  const { plans, matches, people, me } = useYaar();
  const plan = plans.find((p) => p.id === planId);
  const match = matches.find((m) => m.id === plan?.matchId);
  const them = people.find((p) => p.id === match?.users[1]);
  const idea = plan?.ideas.find((i) => i.id === plan.chosenIdea);
  const venue = VENUES.find((v) => v.id === plan?.venueId);
  return { plan, match, them, idea, venue, me };
}

const STAGE_LABEL: Record<DatePlan["stage"], string> = {
  pick: "Picking ideas", venue: "Choosing a place", time: "Choosing a time", review: "Almost there", confirmed: "Confirmed", checkedin: "You met!", done: "Done", cancelled: "Cancelled",
};

/** The shared date card: the same card both people see. */
export function DateCard({ planId, compact }: { planId: string; compact?: boolean }) {
  const { plan, them, idea, venue, me } = usePlan(planId);
  if (!plan || !them || !me) return null;
  return (
    <div className="overflow-hidden rounded-[24px] bg-paper shadow-lift">
      <div className={clsx("relative", compact ? "h-24" : "h-36")}>
        <Scene k={venue?.scene ?? "coffee"} className="h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-charcoal/60 to-transparent px-4 pb-2 pt-8">
          <span className="flex -space-x-3"><Avatar p={me} size={40} /><Avatar p={them} size={40} /></span>
          <Badge tone={plan.stage === "cancelled" ? "coral" : "sage"}>{STAGE_LABEL[plan.stage]}</Badge>
        </div>
      </div>
      <div className="space-y-1.5 p-4">
        <p className="text-[12px] font-bold uppercase tracking-wide text-coral-ink">Your date with {them.name}</p>
        <h3 className="text-[21px] leading-tight">{idea ? `${idea.emoji} ${idea.title}` : "Date idea"}</h3>
        {venue && <p className="flex items-center gap-1.5 text-[14px] text-muted"><MapPin size={15} /> {venue.name}, {venue.area}</p>}
        <p className="flex items-center gap-1.5 text-[14px] text-muted"><Clock size={15} /> {fmtSlot(plan.slot)}</p>
        {venue?.perk && !compact && <p className="text-[13.5px] font-semibold text-sage-ink">Isle perk: {venue.perk}</p>}
      </div>
    </div>
  );
}

export function DateMiniCard({ planId }: { planId: string }) {
  const { plan } = usePlan(planId);
  if (!plan) return null;
  return (
    <Link href={`/date/${planId}`} className="mx-auto my-3 block w-[88%] max-w-[420px] transition active:scale-[0.98]" aria-label="Open date card">
      <div className="mb-1 flex items-center justify-center gap-1 text-[12px] font-semibold text-muted"><CalendarHeart size={13} /> Isle planned a date</div>
      <DateCard planId={planId} compact />
    </Link>
  );
}
