"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Frame } from "@/components/Shell";
import { Button, Input, TopBar } from "@/components/ui";
import { Coco } from "@/components/Coco";
import { useYaar } from "@/lib/store";
import { loadAccount, setNewPassword, supa } from "@/lib/remote";

/** Where the "reset your password" email link lands. */
export default function ResetPassword() {
  const router = useRouter();
  const signIn = useYaar((s) => s.signIn);
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supa) return;
    // The link signs you in for a moment so you can choose a new password.
    supa.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    const { data } = supa.auth.onAuthStateChange((event, session) => { if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const save = async () => {
    if (pw.length < 6) return setErr("Use at least 6 characters.");
    if (pw !== pw2) return setErr("The two passwords don't match.");
    setBusy(true); setErr(null);
    const r = await setNewPassword(pw);
    if (!r.ok) { setBusy(false); return setErr(r.error); }
    signIn("email");
    const res = await loadAccount(r.userId);
    router.replace(res === "loaded" ? "/today" : "/onboarding");
  };

  return (
    <Frame bare>
      <TopBar back="/onboarding?mode=login" title="New password" />
      <main className="px-5 pb-10 pt-4">
        <Coco mood={ready ? "excited" : "thinking"} size={84} />
        <h1 className="mt-3 text-[28px] leading-tight">{ready ? "Choose a new password" : "Opening your reset link…"}</h1>
        {!ready ? (
          <p className="mt-2 text-muted">If nothing happens, the link may have expired. Go back and tap <b>Forgot password?</b> again.</p>
        ) : (
          <div className="mt-5 space-y-3">
            <Input label="New password" type="password" autoComplete="new-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(null); }} hint="At least 6 characters." />
            <Input label="Type it again" type="password" autoComplete="new-password" value={pw2} onChange={(e) => { setPw2(e.target.value); setErr(null); }} />
            {err && <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-[13.5px] font-medium text-coral-ink">{err}</p>}
            <Button full onClick={save} disabled={busy}>{busy ? "Saving…" : "Save and sign in"}</Button>
          </div>
        )}
      </main>
    </Frame>
  );
}
