"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useScroll, useSpring } from "motion/react";
import { CalendarHeart, Heart, ShieldCheck, Sparkles } from "lucide-react";
import { Frame } from "@/components/Shell";
import { Button, Sheet } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { Moment } from "@/components/Moment";
import { LivingIsland } from "@/components/LivingIsland";
import { StarterSticker } from "@/components/StarterSticker";
import { useYaar } from "@/lib/store";
import { DEMO_PEOPLE } from "@/lib/seed";
import { splitHotTake } from "@/lib/logic";

const STORY = [
  {
    kicker: "good morning, isle",
    title: "Dating that actually gets you to the date.",
    body: "No swiping. No CVs. A few people each evening, a little help talking, and a safe way to meet in person.",
    hero: true,
  },
  {
    kicker: "scrapbooks, not CVs",
    title: "Show who you are, not where you work.",
    body: "Photos with captions, a hot take, a 15-second voice note, your starter pack. People react to one specific thing they love, so every chat starts with something real.",
    icon: <Heart size={20} />,
  },
  {
    kicker: "every evening at 8",
    title: "The tide brings a few bottles.",
    body: "A handful of hand-picked people wash ashore each evening. You open them one at a time, like letters. Tap a bottle in the picture to peek inside one.",
    icon: <Sparkles size={20} />,
  },
  {
    kicker: "and when you click",
    title: "Two isles, one bridge.",
    body: "Games to break the ice, a date idea you both like, verified venues, a trusted-contact check-in, and an optional ₹99 show-up promise that's refunded when you both turn up.",
    icon: <CalendarHeart size={20} />,
  },
];

export default function Welcome() {
  const { hydrated, me, authed } = useYaar();
  const router = useRouter();
  useEffect(() => { if (hydrated && me && authed) router.replace("/today"); }, [hydrated, me, authed, router]);

  const story = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: story, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });
  const [peek, setPeek] = useState<number | null>(null);
  const sample = peek !== null ? DEMO_PEOPLE.filter((p) => p.moments.length >= 2)[peek] : null;

  return (
    <Frame bare width="wide">
      <header className="sticky top-0 z-40 flex items-center justify-between bg-vanilla/80 px-5 py-3 backdrop-blur md:px-8">
        <Link href="/" aria-label="Isle home"><Logo size={30} /></Link>
        <div className="flex items-center gap-2">
          <Link href="/onboarding?mode=login" className="min-h-11 content-center rounded-full px-3 text-[14.5px] font-semibold hover:bg-charcoal/5">Sign in</Link>
          <Button href="/onboarding" className="!min-h-11 !px-4">Get started</Button>
        </div>
      </header>

      <div ref={story} className="relative px-4 md:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
        {/* the scene stays put while the story scrolls past */}
        <div className="sticky top-[68px] z-0 h-[46vh] lg:order-2 lg:h-[calc(100dvh-96px)]">
          <LivingIsland progress={progress} onBottle={setPeek} />
        </div>

        <div className="pointer-events-none relative z-10 lg:order-1">
          {STORY.map((s, i) => (
            <section key={i} className={`flex min-h-[70vh] items-center py-8 lg:min-h-[calc(100dvh-68px)] ${i === 0 ? "-mt-[10vh] lg:mt-0" : ""}`}>
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ amount: 0.5 }} transition={{ duration: 0.5 }}
                className="pointer-events-auto w-full rounded-[28px] border-2 border-charcoal bg-paper/95 p-6 shadow-[0_6px_0_0_#1b2d45] backdrop-blur lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0">
                <p className="font-hand text-[24px] leading-none text-coral-ink">{s.kicker}</p>
                {s.hero ? (
                  <h1 className="mt-2 text-[34px] leading-[1.05] lg:text-[60px] lg:leading-[1.0]">{s.title}</h1>
                ) : (
                  <h2 className="mt-2 flex items-center gap-2 text-[28px] leading-[1.1] lg:text-[44px]">{s.title}</h2>
                )}
                <p className="mt-3 max-w-[520px] text-[16px] leading-relaxed text-muted lg:text-[18.5px]">{s.body}</p>
                {s.hero && (
                  <>
                    <ul className="mt-5 flex flex-wrap gap-2 text-[13.5px] font-semibold">
                      <li className="rounded-full bg-butter-soft px-3 py-1.5 text-butter-ink">✓ Selfie check at sign-up</li>
                      <li className="rounded-full bg-sage-soft px-3 py-1.5 text-sage-ink">✓ Hidden from colleagues</li>
                      <li className="rounded-full bg-peri-soft px-3 py-1.5 text-peri-ink">✓ No swiping</li>
                    </ul>
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row lg:max-w-[440px]">
                      <Button href="/onboarding" full>Get started</Button>
                      <Button href="/onboarding?mode=login" variant="ghost" full>I already have an account</Button>
                    </div>
                    <p className="mt-4 flex items-center gap-1.5 text-[13px] font-semibold text-muted"><span className="inline-block animate-bounce">↓</span> scroll to watch the day go by</p>
                  </>
                )}
              </motion.div>
            </section>
          ))}
        </div>
      </div>

      <section className="mx-4 mb-10 mt-4 overflow-hidden rounded-[32px] border-2 border-charcoal bg-[linear-gradient(180deg,#24406A_0%,#0F1E33_100%)] px-6 py-10 text-center text-paper md:mx-8 lg:py-16">
        <ShieldCheck className="mx-auto text-butter" size={28} />
        <h2 className="mx-auto mt-3 max-w-[640px] text-[30px] leading-tight lg:text-[44px]">Your isle is waiting.</h2>
        <p className="mx-auto mt-2 max-w-[520px] text-[16px] text-paper/80">Make your scrapbook in a few minutes. The next tide comes in this evening.</p>
        <div className="mx-auto mt-6 flex max-w-[420px] flex-col gap-2 sm:flex-row">
          <Button href="/onboarding" full>Get started</Button>
          <Button href="/onboarding?mode=login" variant="secondary" full>Sign in</Button>
        </div>
        <p className="mt-5 text-[12px] text-paper/70">By continuing you agree to Isle&apos;s <Link href="/terms" className="underline">Terms</Link>, <Link href="/privacy" className="underline">Privacy policy</Link> and <Link href="/guidelines" className="underline">Community guidelines</Link>. 18+ only.</p>
      </section>

      <Sheet open={!!sample} onClose={() => setPeek(null)} title="A message in a bottle">
        {sample && (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-display text-[22px] font-extrabold">{sample.name}, {sample.age}</p>
              <span className="rounded-full border border-dashed border-charcoal/40 px-2 py-0.5 text-[11px] font-semibold text-muted">Sample profile</span>
            </div>
            <p className="text-[13.5px] text-muted">{sample.area}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {sample.moments.slice(0, 2).map((m, i) => <Moment key={m.id} m={m} i={i} size="sm" tape={sample.theme?.tape} />)}
            </div>
            <div className="relative mt-5 rounded-[16px] bg-butter-soft px-4 pb-3 pt-4">
              <span className="tape" aria-hidden />
              <p className="text-[12.5px] font-semibold text-butter-ink/80">{splitHotTake(sample).prompt ?? "Hot take"}</p>
              <p className="font-display text-[18px] font-extrabold text-butter-ink">{splitHotTake(sample).answer}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{sample.starterPack.slice(0, 3).map((s, i) => <StarterSticker key={s} text={s} i={i} />)}</div>
            <p className="mt-4 text-[13.5px] text-muted">On Isle, you&apos;d react to one thing here, maybe that hot take, and if they react back, your chat opens.</p>
            <Button href="/onboarding" full className="mt-4">Make my scrapbook</Button>
          </div>
        )}
      </Sheet>
    </Frame>
  );
}
