"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Sheet } from "./ui";
import { useYaar } from "@/lib/store";
import { LIVE, deleteMyData } from "@/lib/remote";

/** A careful, two-step delete: explains what goes, then asks you to type DELETE. */
export function DeleteAccount({ trigger }: { trigger: (open: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const resetDemo = useYaar((s) => s.resetDemo);
  const close = () => { setOpen(false); setTyped(""); setErr(null); };
  const run = async () => {
    setBusy(true); setErr(null);
    const r = await deleteMyData();
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "Something went wrong.");
    resetDemo();
    location.href = "/";
  };
  return (
    <>
      {trigger(() => setOpen(true))}
      <Sheet open={open} onClose={close} title="Delete your account?">
        <p className="text-[14.5px]">This permanently removes:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-muted">
          <li>Your scrapbook, photos and voice note</li>
          <li>Your matches, chats and date plans</li>
          <li>Reactions you sent and received</li>
          {LIVE && <li>Your login, so you&apos;d need to sign up again to come back</li>}
        </ul>
        <p className="mt-3 text-[13.5px] text-muted">Just need a break? Set your Social Battery to low instead. Nobody new sees you until you&apos;re back.</p>
        <label className="mt-4 block text-[13px] font-semibold">
          Type DELETE to confirm
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" className="mt-1 min-h-12 w-full rounded-[14px] border-2 border-line bg-paper px-4 text-[16px] outline-none focus:border-danger" />
        </label>
        {err && <p role="alert" className="mt-2 rounded-xl bg-coral-soft px-3 py-2 text-[13.5px] text-coral-ink">{err}</p>}
        <Button variant="danger" full className="mt-4" disabled={typed.trim().toUpperCase() !== "DELETE" || busy} onClick={run}>
          <Trash2 size={18} /> {busy ? "Deleting…" : "Delete my account forever"}
        </Button>
        <button onClick={close} className="mt-1 min-h-11 w-full text-[14px] font-semibold text-muted">Keep my account</button>
      </Sheet>
    </>
  );
}
