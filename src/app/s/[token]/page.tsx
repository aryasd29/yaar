"use client";
import { use, useEffect, useState } from "react";
import { MapPin, Phone, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supa } from "@/lib/remote";
import { VENUES } from "@/lib/seed";

/**
 * What a trusted contact sees when someone shares their live location from a date.
 * No account needed: the link itself is the permission, and it stops working when sharing ends.
 */
type Share = { name: string; lat: number | null; lng: number | null; accuracy: number | null; updated_at: string | null; expires_at: string; live: boolean; place: string | null; slot: string | null };

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [s, setS] = useState<Share | null | "missing">(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let on = true;
    const load = async () => {
      if (!supa) { setS("missing"); return; }
      const { data } = await supa.rpc("view_location_share", { t: token });
      if (!on) return;
      const row = (data as Share[] | null)?.[0];
      setS(row ?? "missing");
      setNow(Date.now());
    };
    void load();
    const id = setInterval(load, 15_000);
    return () => { on = false; clearInterval(id); };
  }, [token]);

  if (s === null) return <Wrap><p className="text-center text-muted">Loading…</p></Wrap>;
  if (s === "missing") return <Wrap><h1 className="text-[24px]">This link isn&apos;t active</h1><p className="mt-2 text-muted">It may have ended or been mistyped. If you&apos;re worried about someone, call them, and in an emergency call 112.</p></Wrap>;

  const venue = VENUES.find((v) => v.id === s.place);
  const ago = s.updated_at ? Math.max(0, Math.round((now - Date.parse(s.updated_at)) / 60_000)) : null;
  const d = 0.004;
  const map = s.lat != null && s.lng != null ? `https://www.openstreetmap.org/export/embed.html?bbox=${s.lng - d}%2C${s.lat - d}%2C${s.lng + d}%2C${s.lat + d}&layer=mapnik&marker=${s.lat}%2C${s.lng}` : null;

  return (
    <Wrap>
      <p className="flex items-center gap-2 text-[13px] font-semibold text-sage-ink"><ShieldCheck size={16} /> {s.name} shared this with you from Isle</p>
      <h1 className="mt-1 text-[26px] leading-tight">{s.live ? `${s.name} is on a date` : `${s.name} has stopped sharing`}</h1>
      {(venue || s.slot) && (
        <p className="mt-1 flex items-start gap-1.5 text-[15px] text-muted"><MapPin size={16} className="mt-1 shrink-0" />
          <span>{venue ? `${venue.name}, ${venue.address}` : "Place not set"}{s.slot ? ` · ${new Date(s.slot).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : ""}</span>
        </p>
      )}
      {s.live && map ? (
        <>
          <iframe title={`Where ${s.name} is now`} src={map} className="mt-4 aspect-square w-full rounded-[20px] border-2 border-charcoal" loading="lazy" />
          <p className="mt-2 text-[13.5px] text-muted">Updated {ago === 0 ? "just now" : `${ago} min ago`}{s.accuracy ? `, accurate to about ${Math.round(s.accuracy)} m` : ""}. Refreshes every 15 seconds.</p>
          <a className="mt-2 inline-block text-[14px] font-semibold underline" href={`https://www.google.com/maps?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer">Open in Google Maps</a>
        </>
      ) : s.live ? (
        <p className="mt-4 rounded-[16px] bg-butter-soft p-3 text-[14px] text-butter-ink">Waiting for {s.name}&apos;s phone to send a location…</p>
      ) : (
        <p className="mt-4 rounded-[16px] bg-sage-soft p-3 text-[14px] text-sage-ink">Sharing has ended. That usually just means the date is over.</p>
      )}
      <div className="mt-6 rounded-[18px] bg-paper p-4 text-[14px] shadow-soft">
        <p className="font-semibold">If something feels wrong</p>
        <p className="mt-1 text-muted">Call {s.name} first. If you can&apos;t reach them and you&apos;re worried, call the police on 112 and share this page.</p>
        <a href="tel:112" className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-danger font-semibold text-white"><Phone size={18} /> Call 112</a>
      </div>
      <p className="mt-6 text-[12px] text-muted">Map data © OpenStreetMap contributors. This link stops working when sharing ends.</p>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-6">
      <div className="mb-5"><Logo size={26} /></div>
      {children}
    </main>
  );
}
