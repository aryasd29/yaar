"use client";
import { useMemo, useState } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { Frame } from "@/components/Shell";
import { EventCard } from "@/components/EventCard";
import { Button, Chip, EmptyState, PrototypeTag, Toggle, TopBar } from "@/components/ui";
import { useYaar } from "@/lib/store";
import { TABLE_AREAS, TABLE_CATEGORIES, tableDate } from "@/lib/seed";
import { useTables } from "@/lib/useTables";

type When = "any" | "today" | "weekend" | "week";
type Price = "any" | "free" | "under300";
const WHEN: [When, string][] = [["any", "Any day"], ["today", "Today"], ["weekend", "This weekend"], ["week", "Next 7 days"]];
const PRICE: [Price, string][] = [["any", "Any price"], ["free", "Free"], ["under300", "Under ₹300"]];

export default function Tables() {
  const { now } = useYaar();
  const { tables, isGoing, loaded, live } = useTables();
  const t = now();
  const [when, setWhen] = useState<When>("any");
  const [cat, setCat] = useState<string>("all");
  const [area, setArea] = useState<string>("all");
  const [price, setPrice] = useState<Price>("any");
  const [seats, setSeats] = useState(false);
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    const today = new Date(t); today.setHours(0, 0, 0, 0);
    return tables.filter((x) => {
      const d = tableDate(x, t);
      const days = Math.floor((d.getTime() - today.getTime()) / 86_400_000);
      if (when === "today" && days !== 0) return false;
      if (when === "weekend" && (!(d.getDay() === 0 || d.getDay() === 6) || days > 7)) return false;
      if (when === "week" && days > 7) return false;
      if (cat !== "all" && x.circle !== cat) return false;
      if (area !== "all" && x.area !== area) return false;
      if (price === "free" && x.price !== 0) return false;
      if (price === "under300" && x.price >= 300) return false;
      if (seats && x.left === 0 && !isGoing(x)) return false;
      return true;
    }).sort((a, b) => tableDate(a, t).getTime() - tableDate(b, t).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, when, cat, area, price, seats, tables]);

  const active = (when !== "any" ? 1 : 0) + (cat !== "all" ? 1 : 0) + (area !== "all" ? 1 : 0) + (price !== "any" ? 1 : 0) + (seats ? 1 : 0);
  const reset = () => { setWhen("any"); setCat("all"); setArea("all"); setPrice("any"); setSeats(false); };
  const select = "min-h-11 w-full rounded-[14px] border-2 border-charcoal bg-paper px-3 text-[14.5px] font-semibold";

  return (
    <Frame width="wide">
      <TopBar back="/explore" title="Tables" sub="Small meetups hosted by selfie-checked members" right={live ? <Button href="/explore/tables/new" className="!min-h-10 !px-3"><Plus size={16} /> Host</Button> : undefined} />
      <main className="px-5 pb-12 md:px-8 lg:px-10">
        {!live && <PrototypeTag>Sample events. Dates move with today so the demo always has something on.</PrototypeTag>}
        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="When">
          {WHEN.map(([k, l]) => <Chip key={k} active={when === k} onClick={() => setWhen(k)}>{l}</Chip>)}
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="more-filters" className="ml-auto flex min-h-11 items-center gap-1.5 rounded-full border-2 border-charcoal bg-paper px-3.5 text-[14px] font-bold">
            <SlidersHorizontal size={16} /> Filters{active > 0 ? ` (${active})` : ""}
          </button>
        </div>
        {open && (
          <div id="more-filters" className="mt-3 grid gap-3 rounded-[22px] bg-paper p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-[13px] font-semibold">Category<select className={`${select} mt-1`} value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All categories</option>{TABLE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="text-[13px] font-semibold">Area<select className={`${select} mt-1`} value={area} onChange={(e) => setArea(e.target.value)}><option value="all">All of Bengaluru</option>{TABLE_AREAS.map((c) => <option key={c}>{c}</option>)}</select></label>
            <fieldset className="text-[13px] font-semibold"><legend>Price</legend><div className="mt-1 flex flex-wrap gap-1.5">{PRICE.map(([k, l]) => <Chip key={k} active={price === k} onClick={() => setPrice(k)}>{l}</Chip>)}</div></fieldset>
            <div className="self-end text-[14px] font-semibold"><Toggle checked={seats} onChange={setSeats} label="Seats available only" /></div>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between" aria-live="polite">
          <p className="text-[14px] font-semibold">{list.length} {list.length === 1 ? "Table" : "Tables"}</p>
          {active > 0 && <button onClick={reset} className="min-h-11 text-[13.5px] font-bold text-coral-ink underline underline-offset-2">Clear filters</button>}
        </div>
        {!loaded ? (
          <p className="mt-6 text-center text-muted">Loading Tables…</p>
        ) : tables.length === 0 ? (
          <EmptyState mood="excited" title="No Tables yet" body="Be the first: host a small, friendly meetup. Board games, a walk, a dosa breakfast. Anything that's easy to say yes to." action={<Button href="/explore/tables/new"><Plus size={17} /> Host a Table</Button>} />
        ) : list.length === 0 ? (
          <EmptyState mood="thinking" title="No Tables match" body="Try another day or area, or clear the filters." action={<Button variant="secondary" onClick={reset}>Clear filters</Button>} />
        ) : (
          <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((x) => <EventCard key={x.id} t={x} now={t} going={isGoing(x)} />)}</div>
        )}
      </main>
    </Frame>
  );
}
