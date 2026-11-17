"use client";
import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Frame, Loading, useRequireMe } from "@/components/Shell";
import { Button, Card, EmptyState, TopBar } from "@/components/ui";
import { Coco, type CocoMood } from "@/components/Coco";
import { useYaar } from "@/lib/store";
import { STARTER_SUGGESTIONS, THIS_OR_THAT } from "@/lib/seed";
import type { Profile } from "@/lib/types";

type Round =
  | { type: "choice"; q: string; options: string[]; answer?: string; reveal?: string }
  | { type: "write"; q: string; theirs: string; placeholder: string };
interface Game { id: string; title: string; blurb: string; mood: CocoMood; tone: string; rounds: (them: Profile, me: Profile) => Round[] }

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

const GAMES: Game[] = [
  { id: "guess", title: "Guess My Answer", blurb: "Guess how they answered 5 quick picks.", mood: "curious", tone: "bg-coral-soft",
    rounds: (t) => THIS_OR_THAT.filter((q) => t.thisOrThat[q.id]).slice(0, 5).map((q) => ({ type: "choice", q: `${t.name}: ${q.a} or ${q.b}?`, options: [q.a, q.b], answer: t.thisOrThat[q.id] === "a" ? q.a : q.b })) },
  { id: "tot", title: "This or That", blurb: "Answer together and compare.", mood: "excited", tone: "bg-peri-soft",
    rounds: (t) => shuffle(THIS_OR_THAT).slice(0, 5).map((q) => ({ type: "choice", q: `${q.a} or ${q.b}?`, options: [q.a, q.b], reveal: t.thisOrThat[q.id] ? `${t.name} picked ${t.thisOrThat[q.id] === "a" ? q.a : q.b}` : `${t.name} hasn't answered this one yet` })) },
  { id: "truths", title: "Two Truths and a Lie", blurb: "Spot the made-up fact.", mood: "thinking", tone: "bg-butter-soft",
    rounds: (t) => {
      const lie = shuffle(STARTER_SUGGESTIONS.filter((s) => !t.starterPack.includes(s)))[0];
      const truths = t.starterPack.slice(0, 2).map((s) => `I'm really into ${s}`);
      return [{ type: "choice", q: `Which one is ${t.name}'s lie?`, options: shuffle([...truths, `I'm really into ${lie}`]), answer: `I'm really into ${lie}`, reveal: `Ha! ${t.name} is not into ${lie}.` }];
    } },
  { id: "unpopular", title: "Unpopular Opinion", blurb: "Agree or disagree, then share yours.", mood: "cool", tone: "bg-sage-soft",
    rounds: (t) => [
      { type: "choice", q: `${t.name} says: “${t.hotTake}”`, options: ["Totally agree", "Hard disagree", "It's complicated"], reveal: "Bring this up in the chat, it's a great debate." },
      { type: "write", q: "Your unpopular opinion", theirs: t.hotTake, placeholder: "Coffee tastes better in a steel tumbler…" },
    ] },
  { id: "finish", title: "Finish My Sentence", blurb: "Complete a playful prompt.", mood: "excited", tone: "bg-coral-soft",
    rounds: (t) => [
      { type: "write", q: "My perfect Sunday starts with…", theirs: `${t.starterPack[1] ?? "a long breakfast"} and no alarms`, placeholder: "filter coffee and a long walk" },
      { type: "write", q: "The fastest way to win me over is…", theirs: `knowing a good place for ${t.starterPack[0]}`, placeholder: "good food recommendations" },
    ] },
  { id: "know", title: "How Well Do You Know Me?", blurb: "Questions from their scrapbook.", mood: "celebrating", tone: "bg-peri-soft",
    rounds: (t) => {
      const others = shuffle(STARTER_SUGGESTIONS.filter((s) => !t.starterPack.includes(s)));
      const rs: Round[] = [{ type: "choice", q: `Which is in ${t.name}'s starter pack?`, options: shuffle([t.starterPack[0], others[0], others[1]]), answer: t.starterPack[0] }];
      if (t.moments[1]) rs.push({ type: "choice", q: `Finish ${t.name}'s caption: “${t.moments[1].caption.split(" ").slice(0, 3).join(" ")}…”`, options: shuffle([t.moments[1].caption, `${t.moments[1].caption.split(" ").slice(0, 3).join(" ")} and loving it`, `${t.moments[1].caption.split(" ").slice(0, 3).join(" ")}, never again`]), answer: t.moments[1].caption });
      rs.push({ type: "choice", q: `Where does ${t.name} live?`, options: shuffle([t.area, "Whitefield", "Jayanagar", "Hebbal"].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3)), answer: t.area });
      return rs;
    } },
];

export default function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Frame><Room matchId={id} /></Frame>;
}

function Room({ matchId }: { matchId: string }) {
  const me = useRequireMe();
  const { matches, people } = useYaar();
  const [game, setGame] = useState<Game | null>(null);
  const match = matches.find((m) => m.id === matchId);
  const them = people.find((p) => p.id === match?.users[1]);
  if (!me) return <Loading />;
  if (!match || !them) return <EmptyState title="Chat not found" />;
  if (game) return <Play game={game} them={them} me={me} matchId={matchId} onExit={() => setGame(null)} />;

  return (
    <>
      <TopBar back={`/chats/${matchId}`} title="Chemistry Room" sub={`Games for you and ${them.name}`} />
      <main className="px-5 pb-10 pt-2">
        <Card tone="peri" className="flex items-center gap-3">
          <Coco mood="excited" size={70} />
          <p className="text-[14px] text-peri-ink">Something to do together instead of small talk. Totally optional. Results get shared in your chat.</p>
        </Card>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {GAMES.map((g, i) => (
            <motion.button key={g.id} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.04 }} onClick={() => setGame(g)}
              className={clsx("flex min-h-[168px] flex-col items-start rounded-[22px] p-3.5 text-left shadow-soft transition active:scale-[0.97]", g.tone)}>
              <Coco mood={g.mood} size={54} bob={false} />
              <span className="mt-2 font-display text-[16px] leading-tight">{g.title}</span>
              <span className="mt-1 text-[12.5px] leading-snug text-muted">{g.blurb}</span>
            </motion.button>
          ))}
        </div>
      </main>
    </>
  );
}

function Play({ game, them, me, matchId, onExit }: { game: Game; them: Profile; me: Profile; matchId: string; onExit: () => void }) {
  const rounds = useMemo(() => game.rounds(them, me), [game, them, me]);
  const { sendMessage } = useYaar();
  const router = useRouter();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [written, setWritten] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const done = i >= rounds.length;
  const r = rounds[i];
  const scored = rounds.filter((x) => x.type === "choice" && x.answer).length;

  const submit = () => {
    if (!r) return;
    if (r.type === "choice") {
      if (!picked) return setErr("Pick an answer first.");
      if (r.answer && picked === r.answer) setScore(score + 1);
      setLog([...log, `${r.q.replace(/^.*?: /, "")} → ${picked}`]);
    } else {
      if (written.trim().length < 2) return setErr("Write a few words first.");
      setLog([...log, `${r.q} ${written.trim()}`]);
    }
    setErr(""); setRevealed(true);
  };
  const next = () => { setI(i + 1); setPicked(null); setWritten(""); setRevealed(false); };
  const share = () => {
    const summary = scored ? `${game.title}: I got ${score}/${scored} about ${them.name}!` : `${game.title}: ${log[log.length - 1] ?? "played a round"}`;
    sendMessage(matchId, summary, "game", { game: game.id });
    router.push(`/chats/${matchId}`);
  };

  return (
    <>
      <TopBar back={onExit} title={game.title} sub={done ? "Finished" : `Round ${i + 1} of ${rounds.length}`} />
      <div className="mx-5 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={i} aria-valuemax={rounds.length}>
        <motion.div className="h-full bg-peri-ink" animate={{ width: `${(Math.min(i + (revealed ? 1 : 0), rounds.length) / rounds.length) * 100}%` }} transition={{ duration: 0.25 }} />
      </div>
      <main className="px-5 pb-6 pt-6">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.section key="done" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center">
              <Coco mood="celebrating" size={130} />
              <h1 className="mt-3 text-[28px]">{scored ? `${score}/${scored}!` : "Nice one!"}</h1>
              <p className="mt-1 text-muted">{scored ? (score === scored ? `You really get ${them.name}.` : `Now you know ${them.name} a little better.`) : "Share it in the chat and keep the conversation going."}</p>
              <Button full className="mt-6" onClick={share}>Share in chat <ArrowRight size={18} /></Button>
              <Button full variant="ghost" className="mt-1" onClick={onExit}>Play another game</Button>
            </motion.section>
          ) : (
            <motion.section key={i} initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} transition={{ duration: 0.2 }}>
              <h1 className="text-[24px] leading-snug">{r.q}</h1>
              {r.type === "choice" ? (
                <div className="mt-5 space-y-2.5">
                  {r.options.map((o) => {
                    const right = revealed && r.answer === o, wrong = revealed && picked === o && r.answer && r.answer !== o;
                    return (
                      <motion.button key={o} whileTap={{ scale: 0.97 }} disabled={revealed} onClick={() => { setPicked(o); setErr(""); }} aria-pressed={picked === o}
                        className={clsx("min-h-14 w-full rounded-[18px] border-2 px-4 text-left text-[16px] font-semibold transition",
                          right ? "border-sage-ink bg-sage-soft text-sage-ink" : wrong ? "border-coral bg-coral-soft text-coral-ink" : picked === o ? "border-peri-ink bg-peri-soft" : "border-line bg-paper")}>
                        {o} {right && "✓"}
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <textarea value={written} onChange={(e) => { setWritten(e.target.value); setErr(""); }} disabled={revealed} rows={3} maxLength={120} placeholder={r.placeholder} aria-label={r.q}
                  className="mt-5 w-full rounded-[18px] border-2 border-line bg-paper px-4 py-3 text-[17px] outline-none focus:border-coral" />
              )}
              {err && <p role="alert" className="mt-2 text-[13.5px] text-danger">{err}</p>}
              {revealed && (
                <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-4 rounded-[18px] bg-butter-soft p-3 text-[14.5px] text-butter-ink">
                  {r.type === "write" ? <>{them.name}&apos;s answer: <b>“{r.theirs}”</b></> : r.reveal ?? (r.answer === picked ? "Spot on!" : `It was ${r.answer}.`)}
                </motion.div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>
      {!done && (
        <div className="sticky bottom-0 z-20 bg-gradient-to-t from-vanilla via-vanilla to-vanilla/0 px-5 pb-6 pt-6">
          {revealed ? <Button full onClick={next}>{i + 1 < rounds.length ? "Next" : "See result"}</Button> : <Button full onClick={submit}>Lock in</Button>}
        </div>
      )}
    </>
  );
}
