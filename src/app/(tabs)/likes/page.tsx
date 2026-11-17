"use client";
import { useState } from "react";
import clsx from "clsx";
import { Eye, Heart } from "lucide-react";
import { Loading, useRequireMe } from "@/components/Shell";
import { Avatar } from "@/components/Moment";
import { Button, Sheet, SampleBadge } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { ReactedElement } from "@/components/ReactedElement";
import { Coco } from "@/components/Coco";
import { useYaar } from "@/lib/store";
import { relTime } from "@/lib/logic";
import type { Profile, Reaction } from "@/lib/types";

const KIND: Record<string, string> = { moment: "photo", hottake: "hot take", voice: "voice note", answer: "This or That answer", starter: "starter pack" };

export default function Likes() {
  const me = useRequireMe();
  const { reactions, people, reactBack, pass, now } = useYaar();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [note, setNote] = useState("");
  if (!me) return <Loading />;

  const received = reactions.filter((r) => r.to === me.id && r.status === "pending").sort((a, b) => b.createdAt - a.createdAt);
  const sent = reactions.filter((r) => r.from === me.id && r.status === "pending").sort((a, b) => b.createdAt - a.createdAt);
  const list = tab === "received" ? received : sent;
  const active = reactions.find((r) => r.id === replyTo);
  const activePerson = people.find((p) => p.id === active?.from);

  return (
    <main className="pb-10">
      <PageHeader title="Likes" sub="People react to one specific thing in your scrapbook. React back to open a chat." />
      <div className="px-5 md:px-8 lg:px-10">
        <div role="tablist" aria-label="Likes" className="grid grid-cols-2 rounded-full border-2 border-charcoal bg-paper p-1 md:max-w-[420px]">
          {(["received", "sent"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx("min-h-11 rounded-full text-[14px] font-bold capitalize transition", tab === t ? "bg-charcoal text-paper" : "text-muted hover:text-charcoal")}>
              {t} ({t === "received" ? received.length : sent.length})
            </button>
          ))}
        </div>

        <section className="mt-5 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3" aria-live="polite">
          {list.length === 0 && <div className="md:col-span-full"><EmptyLikes tab={tab} me={me} /></div>}
          {list.map((r) => {
            const other = people.find((x) => x.id === (tab === "received" ? r.from : r.to));
            if (!other) return null;
            const owner = tab === "received" ? me : other;
            return (
              <LikeCard key={r.id} r={r} other={other} owner={owner} received={tab === "received"} when={relTime(r.createdAt, now())}
                onReactBack={() => setReplyTo(r.id)} onPass={() => pass(other.id)} />
            );
          })}
        </section>
        {tab === "received" && received.length > 0 && <p className="mt-4 text-center text-[12.5px] text-muted">&quot;Not for me&quot; is private. They&apos;re never told.</p>}
      </div>

      <Sheet open={!!active} onClose={() => { setReplyTo(null); setNote(""); }} title={`React back to ${activePerson?.name ?? ""}`}>
        <p className="mb-3 text-[14px] text-muted">This opens your chat. Add a first message if you like.</p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={140} placeholder="haha thank you! okay your turn, what's your hot take?" className="w-full rounded-[14px] border-2 border-line bg-paper px-4 py-3 text-[16px] outline-none focus:border-coral" aria-label="First message" />
        <Button full className="mt-3" onClick={() => { if (active) reactBack(active.id, note.trim() || undefined); setReplyTo(null); setNote(""); }}><Heart size={17} /> Match and open chat</Button>
      </Sheet>
    </main>
  );
}

function LikeCard({ r, other, owner, received, when, onReactBack, onPass, example }: { r: Reaction; other: Profile; owner: Profile; received: boolean; when: string; onReactBack?: () => void; onPass?: () => void; example?: boolean }) {
  return (
    <article className={clsx("rounded-[24px] bg-paper p-4 shadow-soft", example && "pointer-events-none opacity-90")} aria-label={`${other.name} reacted to ${received ? "your" : "their"} ${KIND[r.target.kind]}`}>
      <header className="flex items-center gap-3">
        <Avatar p={other} size={46} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-display text-[17px] font-extrabold">{other.name}, {other.age}{!example && <SampleBadge id={other.id} />}</p>
          <p className="flex items-center gap-1 text-[13px] text-muted"><Heart size={12} className="text-coral-ink" fill="currentColor" /> {received ? `Reacted to your ${KIND[r.target.kind]}` : `You reacted to their ${KIND[r.target.kind]}`}</p>
        </div>
        <span className="self-start text-[12px] text-muted">{when}</span>
      </header>
      <div className="mt-3"><ReactedElement target={r.target} owner={owner} /></div>
      {r.note ? (
        <p className="mt-3 rounded-[16px] rounded-tl-[4px] bg-vanilla px-3 py-2 text-[14.5px]">{r.note}</p>
      ) : <p className="mt-3 text-[13px] italic text-muted">{received ? "No message, just a reaction." : "You didn't add a message."}</p>}
      {received ? (
        <div className="mt-4">
          <div className="grid grid-cols-[1fr_1.3fr] gap-2">
            <Button variant="secondary" href={`/u/${other.id}`}><Eye size={16} /> View</Button>
            <Button onClick={onReactBack}><Heart size={16} /> React back</Button>
          </div>
          <button onClick={onPass} className="mt-1 min-h-10 w-full text-[13px] font-semibold text-muted hover:text-charcoal">Not for me</button>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[12.5px] text-muted">Waiting for {other.name} to react back</span>
          <Button variant="secondary" className="!min-h-10" href={`/u/${other.id}`}><Eye size={16} /> View</Button>
        </div>
      )}
    </article>
  );
}

function EmptyLikes({ tab, me }: { tab: "received" | "sent"; me: Profile }) {
  const sample = { id: "example", from: "u_example", to: me.id, target: { kind: "hottake" as const, label: "your hot take" }, note: "okay this hot take is correct, finally someone said it", createdAt: 0, status: "pending" as const };
  const fake: Profile = { id: "u_example", name: "Someone", age: 25, gender: "woman", area: "Bengaluru", verified: true, intent: "open", moments: [{ id: "x", scene: "coffee", caption: "" }], starterPack: [], hotTake: "", thisOrThat: {}, interests: [], battery: "full" };
  return (
    <div className="grid items-center gap-6 md:grid-cols-2">
      <div className="flex flex-col items-center text-center md:items-start md:text-left">
        <Coco mood={tab === "received" ? "calm" : "thinking"} size={96} />
        <h2 className="mt-3 text-[22px]">{tab === "received" ? "No reactions yet" : "Nothing waiting"}</h2>
        <p className="mt-1 max-w-[360px] text-[14.5px] text-muted">
          {tab === "received"
            ? "When someone loves a photo, your hot take or your voice note, they react to that exact piece. It shows up here, and you choose whether to react back."
            : "Reactions you send wait here until the other person reacts back. Then your chat opens."}
        </p>
        <Button className="mt-4" variant="secondary" href={tab === "received" ? "/profile" : "/today"}>{tab === "received" ? "Polish my scrapbook" : "Go to the shore"}</Button>
      </div>
      {tab === "received" && (
        <div className="relative" aria-label="Example of a reaction">
          <span className="absolute -top-3 left-4 z-10 rotate-[-3deg] rounded-full border-2 border-charcoal bg-butter px-2.5 py-0.5 text-[12px] font-bold">Example</span>
          <LikeCard r={sample} other={fake} owner={me} received when="2h" example />
        </div>
      )}
    </div>
  );
}
