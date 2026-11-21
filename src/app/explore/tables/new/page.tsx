"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ShieldCheck } from "lucide-react";
import { Frame, Loading, useRequireMe } from "@/components/Shell";
import { Button, Card, Chip, EmptyState, Input, SectionLabel, TopBar } from "@/components/ui";
import { Scene } from "@/components/Scene";
import { useYaar } from "@/lib/store";
import { LIVE, amAdmin, track } from "@/lib/remote";
import { TABLE_AREAS, TABLE_CATEGORIES } from "@/lib/seed";

const SCENES = ["coffee", "dosa", "boardgame", "books", "pottery", "cycle", "sunrise", "concert", "kitchen", "city", "plant", "guitar"] as const;
const pad = (n: number) => String(n).padStart(2, "0");

export default function NewTablePage() {
  return <Frame width="medium"><NewTable /></Frame>;
}

function NewTable() {
  const me = useRequireMe();
  const router = useRouter();
  const toast = useYaar((s) => s.toast);
  const [admin, setAdmin] = useState(false);
  const soon = new Date(Date.now() + 2 * 86_400_000);
  const [f, setF] = useState({
    title: "", blurb: "", circle: TABLE_CATEGORIES[0] ?? "New to Bengaluru", area: TABLE_AREAS[0] ?? "Koramangala", place: "",
    date: `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}`, time: "18:30", seats: 6, price: 0, scene: "coffee",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void amAdmin().then(setAdmin); }, []);
  if (!me) return <Loading />;
  if (!LIVE) return <><TopBar back="/explore/tables" /><EmptyState title="Hosting needs the live app" body="In the offline demo you can browse and join sample Tables." /></>;
  if (!me.verified && !admin) return (
    <>
      <TopBar back="/explore/tables" title="Host a Table" />
      <EmptyState mood="curious" title="Pass the selfie check first" body="Everyone who hosts a Table has passed Isle's selfie check, so guests know who they're meeting. It takes about a minute." action={<Button href="/verify"><ShieldCheck size={17} /> Do the selfie check</Button>} />
    </>
  );

  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const submit = async () => {
    setErr("");
    const startsAt = new Date(`${f.date}T${f.time}:00`);
    if (f.title.trim().length < 4) return setErr("Give your Table a name of at least 4 characters.");
    if (f.place.trim().length < 3) return setErr("Add the exact place. Only people who join will see it.");
    if (!(startsAt.getTime() > Date.now() + 30 * 60_000)) return setErr("Pick a time at least 30 minutes from now.");
    setBusy(true);
    const l = await import("@/lib/live");
    const r = await l.createTable({ ...f, startsAt, price: admin ? f.price : 0 });
    setBusy(false);
    if (r.error && !r.id) return setErr(r.error);
    track("table_hosted", { seats: f.seats, price: admin ? f.price : 0 });
    toast("Your Table is live! People can find it in Explore.", "good");
    router.replace(`/explore/tables/${r.id}`);
  };

  return (
    <>
      <TopBar back="/explore/tables" title="Host a Table" />
      <main className="space-y-4 px-5 pb-32 md:px-8">
        <p className="text-[15px] text-muted">A small meetup that&apos;s easy to say yes to. You&apos;re the host: arrive a little early and help people say hello.</p>
        <Card className="space-y-3">
          <Input label="Name" value={f.title} maxLength={80} placeholder="Sunday dosa breakfast" onChange={(e) => set({ title: e.target.value })} />
          <label className="block text-[14px] font-semibold">What happens
            <textarea value={f.blurb} maxLength={600} rows={3} placeholder="We'll share a big table, order too much, and talk about everything but work." onChange={(e) => set({ blurb: e.target.value })} className="mt-1 w-full rounded-[14px] border-2 border-line bg-paper px-3 py-2 text-[15px] font-normal focus:border-charcoal" />
          </label>
        </Card>
        <Card>
          <SectionLabel>Circle</SectionLabel>
          <div className="flex flex-wrap gap-2">{TABLE_CATEGORIES.map((c) => <Chip key={c} active={f.circle === c} onClick={() => set({ circle: c })}>{c}</Chip>)}</div>
        </Card>
        <Card className="space-y-3">
          <SectionLabel>When and where</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
            <Input label="Time" type="time" value={f.time} onChange={(e) => set({ time: e.target.value })} />
          </div>
          <label className="block text-[14px] font-semibold">Area
            <select value={f.area} onChange={(e) => set({ area: e.target.value })} className="mt-1 min-h-12 w-full rounded-[14px] border-2 border-line bg-paper px-3 text-[15px] font-normal">{TABLE_AREAS.map((a) => <option key={a}>{a}</option>)}</select>
          </label>
          <Input label="Exact place (shown only to people who join)" value={f.place} maxLength={200} placeholder="Café name, street, landmark" onChange={(e) => set({ place: e.target.value })} />
          <p className="text-[12.5px] text-muted">Public places only: cafés, parks, bookshops, board-game cafés. Never a home.</p>
        </Card>
        <Card>
          <SectionLabel>Seats: {f.seats} (including you)</SectionLabel>
          <input type="range" min={3} max={12} value={f.seats} onChange={(e) => set({ seats: +e.target.value })} className="w-full accent-[#FF7A5C]" aria-label="Seats" />
          {admin ? (
            <div className="mt-3"><Input label="Seat price in ₹ (admins only; 0 = free)" type="number" min={0} max={5000} value={String(f.price)} onChange={(e) => set({ price: Math.max(0, Math.min(5000, Math.round(+e.target.value || 0))) })} /></div>
          ) : (
            <p className="mt-2 text-[13px] text-muted">Member Tables are free to join. Everyone pays for their own order at the venue.</p>
          )}
        </Card>
        <Card>
          <SectionLabel>Picture</SectionLabel>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{SCENES.map((k) => (
            <button key={k} aria-label={k} aria-pressed={f.scene === k} onClick={() => set({ scene: k })} className={clsx("overflow-hidden rounded-[14px] border-2 transition", f.scene === k ? "border-charcoal" : "border-transparent opacity-80")}>
              <Scene k={k} className="aspect-square w-full" />
            </button>
          ))}</div>
        </Card>
      </main>
      <div className="sticky bottom-0 z-20 bg-gradient-to-t from-vanilla via-vanilla to-vanilla/0 px-5 pb-6 pt-6 md:px-8">
        {err && <p role="alert" className="mb-2 rounded-xl bg-coral-soft px-3 py-2 text-[13.5px] text-coral-ink">{err}</p>}
        <Button full disabled={busy} onClick={submit}>{busy ? "Publishing…" : "Publish my Table"}</Button>
      </div>
    </>
  );
}
