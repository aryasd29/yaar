"use client";
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Frame, Loading, useRequireMe } from "@/components/Shell";
import { Button, Card, Chip, EmptyState, TopBar } from "@/components/ui";
import { LIVE, amAdmin, supa } from "@/lib/remote";
import { useYaar } from "@/lib/store";

type Report = { id: string; created_at: string; reason: string; details: string | null; status: string; reporter: string; reporter_name: string | null; reported: string; reported_name: string | null; reported_suspended: boolean; reports_against: number };
type Step = { step: string; people: number; total: number };
type Stats = { members: number; matches: number; messages: number; open_reports: number; suspended: number };

const STEP_LABEL: Record<string, string> = {
  signup_completed: "Finished sign-up", reaction_sent: "Sent a reaction", match_created: "Got a match", first_message: "Sent a first message",
  date_confirmed: "Confirmed a date", date_attended: "Went on a date (north star)", feedback_given: "Gave feedback",
};

/** Moderation and metrics. Only accounts listed in the `admins` table can see anything here. */
export default function AdminPage() {
  return <Frame nav width="wide"><Admin /></Frame>;
}

type VerificationRow = { user_id: string; name: string | null; status: "verified" | "revoked"; selfie_path: string | null; match_score: number | null; created_at: string; photo: string | null };

function Admin() {
  const me = useRequireMe();
  const toast = useYaar((s) => s.toast);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [funnel, setFunnel] = useState<Step[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [checks, setChecks] = useState<(VerificationRow & { selfie?: string })[]>([]);

  const load = useCallback(async () => {
    if (!supa) return;
    const [r, f, s] = await Promise.all([supa.rpc("admin_reports"), supa.rpc("admin_funnel"), supa.rpc("admin_stats")]);
    if (r.data) setReports(r.data as Report[]);
    if (f.data) setFunnel(f.data as Step[]);
    if (s.data) setStats((s.data as Stats[])[0] ?? null);
    const v = await supa.rpc("admin_verifications");
    if (v.data) {
      const rows = v.data as VerificationRow[];
      const signed = await Promise.all(rows.slice(0, 40).map((x) => x.selfie_path ? supa!.storage.from("selfies").createSignedUrl(x.selfie_path, 600) : Promise.resolve({ data: null })));
      setChecks(rows.map((x, i) => ({ ...x, selfie: signed[i]?.data?.signedUrl })));
    }
  }, []);

  useEffect(() => { if (me) void amAdmin().then((ok) => { setAllowed(ok); if (ok) void load(); }); }, [me, load]);

  if (!me) return <Loading />;
  if (!LIVE) return <><TopBar back="/profile" title="Moderation" /><EmptyState title="Moderation needs the live backend" body="Connect Supabase to review reports." /></>;
  if (allowed === null) return <Loading />;
  if (!allowed) return <><TopBar back="/profile" title="Moderation" /><EmptyState mood="thinking" title="This page is for Isle's moderators" body="Your account doesn't have moderator access." action={<Button href="/today">Back to Today</Button>} /></>;

  const act = async (fn: string, args: Record<string, unknown>, done: string) => {
    const { error } = await supa!.rpc(fn, args);
    if (error) return toast(`That didn't work: ${error.message}`, "warn");
    toast(done, "good");
    void load();
  };
  const list = reports.filter((r) => filter === "all" || r.status === "open");
  const top = Math.max(1, ...funnel.map((s) => s.people));

  return (
    <main className="px-5 pb-12 md:px-8 lg:px-10">
      <TopBar back="/profile" title="Moderation and metrics" />
      {stats && (
        <section className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Totals">
          {([["Members", stats.members], ["Matches", stats.matches], ["Messages", stats.messages], ["Open reports", stats.open_reports], ["Suspended", stats.suspended]] as const).map(([k, v]) => (
            <Card key={k} className="!p-3"><p className="text-[12.5px] font-semibold text-muted">{k}</p><p className="font-display text-[26px] font-extrabold">{v}</p></Card>
          ))}
        </section>
      )}

      <section className="mt-6" aria-labelledby="funnel">
        <h2 id="funnel" className="text-[20px]">Funnel to the north star</h2>
        <p className="text-[13.5px] text-muted">Unique people who reached each step.</p>
        <ol className="mt-3 space-y-2">
          {funnel.map((s) => (
            <li key={s.step} className="grid grid-cols-[180px_1fr_60px] items-center gap-3 text-[14px] md:grid-cols-[240px_1fr_80px]">
              <span className={clsx("font-semibold", s.step === "date_attended" && "text-coral-ink")}>{STEP_LABEL[s.step] ?? s.step}</span>
              <span className="h-4 overflow-hidden rounded-full bg-paper"><span className={clsx("block h-full rounded-full", s.step === "date_attended" ? "bg-coral" : "bg-peri")} style={{ width: `${(s.people / top) * 100}%` }} /></span>
              <span className="text-right font-bold">{s.people}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8" aria-labelledby="reports">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="reports" className="text-[20px]">Reports</h2>
          <div className="flex gap-2"><Chip active={filter === "open"} onClick={() => setFilter("open")}>Open</Chip><Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip></div>
        </div>
        {list.length === 0 ? <EmptyState mood="calm" title="Nothing to review" body="New reports will appear here." /> : (
          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {list.map((r) => (
              <li key={r.id}><Card className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-[17px] font-extrabold">{r.reported_name ?? "Deleted account"} <span className="text-[13px] font-semibold text-muted">· {r.reports_against} report{r.reports_against === 1 ? "" : "s"} in total</span></p>
                    <p className="text-[13px] text-muted">Reported by {r.reporter_name ?? "a member"} · {new Date(r.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                  <span className={clsx("rounded-full px-2.5 py-0.5 text-[12px] font-bold", r.status === "open" ? "bg-butter-soft text-butter-ink" : "bg-sage-soft text-sage-ink")}>{r.status}</span>
                </div>
                <p className="mt-2 text-[14.5px]"><b>{r.reason}</b>{r.details ? `: ${r.details}` : ""}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.reported_suspended
                    ? <Button variant="secondary" className="!min-h-10" onClick={() => act("admin_suspend", { target: r.reported, why: "", on_off: false }, "Suspension lifted")}><ShieldCheck size={16} /> Lift suspension</Button>
                    : <Button variant="danger" className="!min-h-10" onClick={() => { if (confirm(`Suspend ${r.reported_name ?? "this account"}? Their active matches will close.`)) void act("admin_suspend", { target: r.reported, why: r.reason, on_off: true }, "Account suspended"); }}><ShieldAlert size={16} /> Suspend</Button>}
                  {r.status === "open"
                    ? <Button variant="ghost" className="!min-h-10" onClick={() => act("admin_set_report", { report_id: r.id, new_status: "reviewed" }, "Marked as reviewed")}>Mark reviewed</Button>
                    : <Button variant="ghost" className="!min-h-10" onClick={() => act("admin_set_report", { report_id: r.id, new_status: "open" }, "Reopened")}>Reopen</Button>}
                </div>
              </Card></li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="checks">
        <h2 id="checks" className="text-[20px]">Selfie checks</h2>
        <p className="text-[13.5px] text-muted">Badges are granted automatically after the on-device check. Spot-check the selfie against the scrapbook photo and revoke anything that isn&apos;t the same person.</p>
        {checks.length === 0 ? <EmptyState mood="calm" title="No selfie checks yet" body="They'll appear here as members pass the check." /> : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {checks.map((c) => (
              <li key={c.user_id}><Card className="!p-3">
                <div className="grid grid-cols-2 gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.selfie ? <img src={c.selfie} alt={`Selfie from ${c.name ?? "member"}`} className="aspect-square w-full rounded-[12px] object-cover" /> : <div className="grid aspect-square place-items-center rounded-[12px] bg-vanilla text-[12px] text-muted">No selfie</div>}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.photo ? <img src={c.photo} alt={`Scrapbook photo of ${c.name ?? "member"}`} className="aspect-square w-full rounded-[12px] object-cover" /> : <div className="grid aspect-square place-items-center rounded-[12px] bg-vanilla text-[12px] text-muted">No photo</div>}
                </div>
                <p className="mt-2 font-semibold">{c.name ?? "Member"} <span className="text-[12.5px] font-normal text-muted">· match {c.match_score != null ? `${Math.round(c.match_score * 100)}%` : "n/a"}</span></p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={clsx("rounded-full px-2.5 py-0.5 text-[12px] font-bold", c.status === "verified" ? "bg-sage-soft text-sage-ink" : "bg-coral-soft text-coral-ink")}>{c.status}</span>
                  {c.status === "verified"
                    ? <Button variant="danger" className="!min-h-9 !px-3" onClick={() => { if (confirm(`Remove ${c.name ?? "this member"}'s Selfie-checked badge?`)) void act("admin_set_verification", { u: c.user_id, new_status: "revoked" }, "Badge removed"); }}>Revoke</Button>
                    : <Button variant="secondary" className="!min-h-9 !px-3" onClick={() => act("admin_set_verification", { u: c.user_id, new_status: "verified" }, "Badge restored")}>Restore</Button>}
                </div>
              </Card></li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
