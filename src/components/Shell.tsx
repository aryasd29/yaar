"use client";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bell, Compass, Heart, MessageCircle, Sun, User } from "lucide-react";
import { useNotifications } from "@/lib/notifications";
import { bootAuth } from "@/lib/remote";
import { Logo } from "./Logo";
import { suggestIdeas } from "@/lib/logic";
import { Moment } from "./Moment";
import { Waves } from "./Sea";
import { ReactNode, useEffect, useState as useStateSafe } from "react";
import { useYaar } from "@/lib/store";
import { Coco } from "./Coco";
import { X } from "lucide-react";
import { yaarHourLabel } from "@/lib/config";

const TABS = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/likes", label: "Likes", icon: Heart },
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/profile", label: "Profile", icon: User },
];

function usePendingLikes() {
  return useYaar((s) => s.reactions.filter((r) => r.to === s.me?.id && r.status === "pending").length);
}
/** Which tab a page belongs to, so the right one stays highlighted on sub-pages. */
const ALIAS: [string, string][] = [["/u/", "/today"], ["/date/", "/chats"]];
const isOn = (path: string, href: string) => {
  const p = ALIAS.find(([pre]) => path.startsWith(pre))?.[1] ?? path;
  return p === href || p.startsWith(href + "/");
};

/** Mobile and tablet: tabs along the bottom. */
export function BottomNav() {
  const path = usePathname();
  const pendingLikes = usePendingLikes();
  return (
    <nav aria-label="Main" className="sticky bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-[560px] justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const on = isOn(path, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={on ? "page" : undefined} className={clsx("relative flex min-h-16 min-w-16 flex-col items-center justify-center gap-0.5 text-[11.5px] font-semibold transition", on ? "text-coral-ink" : "text-muted")}>
                <span className={clsx("grid h-8 w-12 place-items-center rounded-full transition", on && "bg-coral-soft")}>
                  <Icon size={21} strokeWidth={on ? 2.4 : 2} />
                </span>
                {label}
                {label === "Likes" && pendingLikes > 0 && (
                  <span className="absolute right-2 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[11px] font-bold text-charcoal">{pendingLikes}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Laptop and desktop: a sidebar that stays put while you browse. */
export function SideNav() {
  const path = usePathname();
  const pendingLikes = usePendingLikes();
  const me = useYaar((s) => s.me);
  const { unread } = useNotifications();
  const notifOn = path.startsWith("/notifications");
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-paper/70 px-4 py-6 lg:flex">
      <Link href="/today" className="flex items-center gap-2 px-2 font-display text-[30px]">
        <Coco mood="calm" size={40} bob={false} /><Logo size={30} />
      </Link>
      <nav aria-label="Main" className="mt-8">
        <ul className="space-y-1">
          {TABS.map(({ href, label, icon: Icon }) => {
            const on = isOn(path, href);
            return (
              <li key={href}>
                <Link href={href} aria-current={on ? "page" : undefined}
                  className={clsx("flex min-h-12 items-center gap-3 rounded-[16px] px-3 text-[15.5px] font-semibold transition", on ? "bg-coral-soft text-coral-ink" : "text-charcoal hover:bg-charcoal/5")}>
                  <Icon size={21} strokeWidth={on ? 2.4 : 2} />
                  <span className="flex-1">{label}</span>
                  {label === "Likes" && pendingLikes > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-coral px-1.5 text-[12px] font-bold text-charcoal">{pendingLikes}</span>}
                </Link>
              </li>
            );
          })}
          <li className="pt-2">
            <Link href="/notifications" aria-current={notifOn ? "page" : undefined}
              className={clsx("flex min-h-12 items-center gap-3 rounded-[16px] px-3 text-[15.5px] font-semibold transition", notifOn ? "bg-coral-soft text-coral-ink" : "text-charcoal hover:bg-charcoal/5")}>
              <Bell size={21} strokeWidth={notifOn ? 2.4 : 2} />
              <span className="flex-1">Notifications</span>
              {unread > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-coral px-1.5 text-[12px] font-bold text-charcoal">{unread > 9 ? "9+" : unread}</span>}
            </Link>
          </li>
        </ul>
      </nav>
      <InstallPrompt inline />
      <div className="mt-auto rounded-[20px] bg-butter-soft p-4 text-[13px] leading-relaxed text-butter-ink">
        <p className="font-semibold">Tide comes in at {yaarHourLabel()}</p>
        <p>A few good introductions a day. Open them one at a time.</p>
      </div>
      {me && (
        <Link href="/profile" className="mt-3 flex items-center gap-2 rounded-[16px] px-2 py-2 hover:bg-charcoal/5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-coral font-display text-charcoal">{me.name[0]}</span>
          <span className="text-[14px] font-semibold">{me.name}</span>
        </Link>
      )}
    </aside>
  );
}

/**
 * App frame.
 * - Phones: a single column with tabs at the bottom (nav pages).
 * - Tablets: full width, content centred, tabs at the bottom.
 * - Laptops: a sidebar plus content that uses the whole screen.
 * `bare` hides navigation (welcome, onboarding). `width` caps content on large screens.
 */
export function Frame({ children, nav = false, bare = false, width, className }: { children: ReactNode; nav?: boolean; bare?: boolean; width?: "narrow" | "medium" | "wide"; className?: string }) {
  const w = width ?? (nav ? "wide" : "narrow");
  const cap = { narrow: "md:max-w-[680px]", medium: "md:max-w-[960px]", wide: "md:max-w-[1180px]" }[w];
  const toast = useYaar((s) => s.toast);
  const hydrated = useYaar((s) => s.hydrated);
  useEffect(() => { if (hydrated) void bootAuth(); }, [hydrated]);
  useEffect(() => {
    const full = () => toast("Your browser's storage is full, so that change couldn't be saved. Try a smaller photo or remove one.", "warn");
    window.addEventListener("yaar-storage-full", full);
    return () => window.removeEventListener("yaar-storage-full", full);
  }, [toast]);
  return (
    <div className="min-h-dvh bg-vanilla">
      <a href="#main" className="sr-only z-[80] rounded-full bg-charcoal px-4 py-2 font-semibold text-paper focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <div className={clsx("relative flex min-h-dvh", className)}>
        {!bare && <SideNav />}
        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <div id="main" tabIndex={-1} className={clsx("mx-auto w-full flex-1 outline-none", cap)}>{children}</div>
          {nav && <BottomNav />}
        </div>
        <Toasts />
        <MatchCelebration />
        <Suspended />
        {nav && <InstallPrompt />}
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useYaar((s) => s.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[60] mx-auto flex max-w-[420px] flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.2 }}
            className={clsx("pointer-events-auto rounded-2xl px-4 py-3 text-[14px] font-medium shadow-lift", t.tone === "good" ? "bg-sage-soft text-sage-ink" : t.tone === "warn" ? "bg-butter-soft text-butter-ink" : "bg-charcoal text-paper")}>
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const CONFETTI = ["#FF7A5C", "#FFC94D", "#6FD1BF", "#7DB9EC"];

export function MatchCelebration() {
  const id = useYaar((s) => s.celebrate);
  const me = useYaar((s) => s.me);
  const match = useYaar((s) => s.matches.find((m) => m.id === s.celebrate));
  const other = useYaar((s) => s.people.find((p) => p.id === match?.users[1]));
  const reactions = useYaar((s) => s.reactions);
  const clear = useYaar((s) => s.clearCelebrate);
  const router = useRouter();
  const reduce = useReducedMotionSafe();
  const mine = reactions.find((r) => r.from === me?.id && r.to === other?.id);
  const theirs = reactions.find((r) => r.from === other?.id && r.to === me?.id);
  const idea = me && other ? suggestIdeas(me, other)[0] : null;
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && clear();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, clear]);
  return (
    <AnimatePresence>
      {id && other && me && (
        <motion.div className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-charcoal/70 px-5 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="match-title">
          {!reduce && CONFETTI.flatMap((c, ci) => [...Array(8)].map((_, i) => (
            <motion.span key={`${ci}-${i}`} className="absolute top-[38%] h-2.5 w-2.5 rounded-[3px]" style={{ background: c, left: "50%" }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: (i - 3.5) * 52 + (ci - 1.5) * 20, y: [0, -170 - (i % 4) * 22, 380], rotate: 420, opacity: [1, 1, 0] }}
              transition={{ duration: 1.6, ease: "easeOut", delay: 0.35 + ci * 0.04 }} />
          )))}
          <motion.div initial={{ scale: 0.9, y: 24 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 16 }} className="w-full max-w-[420px] rounded-[30px] border-2 border-charcoal bg-paper p-5 text-center shadow-[0_6px_0_0_#FF7A5C]">
            {/* Two isles drift together, a bridge builds plank by plank, fireworks over the water */}
            <div className="relative mx-auto h-[200px] w-full max-w-[340px] overflow-hidden rounded-[22px] border-2 border-charcoal bg-[linear-gradient(180deg,#24406A_0%,#FF9C84_70%,#FFB38A_100%)]">
              {!reduce && [0, 1, 2].map((f) => (
                <motion.div key={f} className="absolute" style={{ left: `${22 + f * 28}%`, top: `${14 + (f % 2) * 10}%` }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1, 1.15], opacity: [0, 1, 0] }} transition={{ delay: 1.15 + f * 0.25, duration: 1.1, repeat: 1, repeatDelay: 0.4 }} aria-hidden>
                  {[...Array(10)].map((_, i) => (
                    <span key={i} className="absolute h-[3px] w-4 rounded-full" style={{ background: CONFETTI[(i + f) % CONFETTI.length], transform: `rotate(${i * 36}deg) translateX(12px)` }} />
                  ))}
                </motion.div>
              ))}
              <Waves height={64} layers={["#5C9BD6", "#3F7FBF"]} />
              {/* bridge */}
              <div className="absolute bottom-[48px] left-1/2 z-10 flex -translate-x-1/2 gap-[3px]" aria-hidden>
                {[...Array(7)].map((_, i) => (
                  <motion.span key={i} className="h-3 w-[9px] rounded-[2px] border border-charcoal bg-[#C98D5B]" initial={reduce ? false : { y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.75 + i * 0.07, type: "spring", damping: 10 }} />
                ))}
              </div>
              {/* two isles */}
              {[me, other].map((who, k) => (
                <motion.div key={who.id} className="absolute bottom-[26px] z-20 w-[118px]" style={{ [k ? "right" : "left"]: 6 } as React.CSSProperties}
                  initial={reduce ? false : { x: k ? 120 : -120 }} animate={{ x: 0 }} transition={{ type: "spring", damping: 14, delay: 0.1 + k * 0.08 }}>
                  <div className={`mx-auto w-[66px] ${k ? "rotate-[6deg]" : "-rotate-[6deg]"}`}>
                    {who.moments[0] && <Moment m={who.moments[0]} i={k} size="sm" tape={who.theme?.tape} />}
                  </div>
                  <svg viewBox="0 0 120 30" className="-mt-2 w-full" aria-hidden><ellipse cx="60" cy="14" rx="56" ry="12" fill="#F3DDB8" stroke="#1b2d45" strokeWidth="2.5" /></svg>
                </motion.div>
              ))}
              <motion.span className="absolute left-1/2 top-[22%] z-30 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full border-2 border-charcoal bg-coral text-[22px] shadow-[0_3px_0_0_#1b2d45]"
                initial={reduce ? false : { scale: 0 }} animate={{ scale: [0, 1.35, 1] }} transition={{ delay: 1.2, duration: 0.45 }} aria-hidden>♥</motion.span>
            </div>
            <h2 id="match-title" className="mt-2 text-[30px] leading-tight">You found each other!</h2>
            <p className="mt-1 text-[15px] text-muted">You and {other.name} both reacted. Your little isle is open for chatting.</p>
            {(mine || theirs) && (
              <ul className="mt-3 space-y-1 rounded-[18px] bg-vanilla p-3 text-left text-[13.5px]">
                {mine && <li><b>You</b> liked {mine.target.label.replace("your ", "their ")}</li>}
                {theirs && <li><b>{other.name}</b> liked {theirs.target.label}</li>}
              </ul>
            )}
            {idea && <p className="mt-3 text-[13.5px] text-muted">{idea.emoji} A first date idea is waiting whenever you&apos;re both ready: <b className="text-charcoal">{idea.title}</b></p>}
            <div className="mt-5 grid gap-2">
              <button autoFocus className="min-h-12 rounded-[16px] border-2 border-charcoal bg-coral font-display font-extrabold text-charcoal shadow-[0_4px_0_0_#1b2d45] active:translate-y-[3px] active:shadow-[0_1px_0_0_#1b2d45]" onClick={() => { const mid = id; clear(); router.push(`/chats/${mid}`); }}>Say hi to {other.name}</button>
              <button className="min-h-12 rounded-[16px] font-semibold text-charcoal hover:bg-charcoal/5" onClick={clear}>Keep exploring</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function useReducedMotionSafe() {
  return useReducedMotion() ?? false;
}

/** Sends people to the welcome screen until they've finished onboarding. */
export function useRequireMe() {
  const hydrated = useYaar((s) => s.hydrated);
  const me = useYaar((s) => s.me);
  const authed = useYaar((s) => s.authed);
  const router = useRouter();
  useEffect(() => { if (hydrated && (!me || !authed)) router.replace("/"); }, [hydrated, me, authed, router]);
  return hydrated && me && authed ? me : null;
}

export function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-2 text-muted"><Coco mood="thinking" size={80} /><span className="text-[14px]">Loading…</span></div>
    </div>
  );
}

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** "Install Isle" banner: native prompt on Android/desktop Chrome, instructions on iPhone. */
export function InstallPrompt({ inline = false }: { inline?: boolean }) {
  const me = useYaar((s) => s.me);
  const [evt, setEvt] = useStateSafe<BIPEvent | null>(null);
  const [ios, setIos] = useStateSafe(false);
  const [hidden, setHidden] = useStateSafe(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    const dismissed = localStorage.getItem("yaar-install-dismissed");
    if (standalone || dismissed) return;
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); setHidden(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) { setIos(true); setHidden(false); }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [setEvt, setIos, setHidden]);
  if (!me || hidden) return null;
  const dismiss = () => { try { localStorage.setItem("yaar-install-dismissed", "1"); } catch { /* ignore */ } setHidden(true); };
  const install = !ios && evt ? <button className="min-h-8 rounded-full bg-coral px-3 text-[12.5px] font-bold text-charcoal" onClick={async () => { await evt.prompt(); dismiss(); }}>Install</button> : null;
  if (inline) return (
    <div className="mt-5 flex items-center gap-2 rounded-[18px] border-2 border-charcoal bg-paper p-2.5 text-[13px]">
      <Coco mood="calm" size={30} bob={false} />
      <span className="flex-1 font-semibold leading-tight">{ios ? "Share → Add to Home Screen" : "Install the Isle app"}</span>
      {install}
      <button className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-charcoal/5" onClick={dismiss} aria-label="Dismiss install suggestion"><X size={15} /></button>
    </div>
  );
  return (
    <div role="status" className="fixed bottom-[76px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-full border-2 border-charcoal bg-paper py-1 pl-1.5 pr-1 text-[13px] shadow-[0_3px_0_0_#1b2d45] lg:hidden">
      <Coco mood="calm" size={26} bob={false} />
      <span className="font-semibold">{ios ? "Share → Add to Home Screen" : "Get the Isle app"}</span>
      {install}
      <button className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-charcoal/5" onClick={dismiss} aria-label="Dismiss install suggestion"><X size={15} /></button>
    </div>
  );
}

/** Shown when a moderator has suspended this account after a report. */
function Suspended() {
  const suspended = useYaar((s) => s.suspended);
  const signOut = useYaar((s) => s.signOut);
  if (!suspended) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-charcoal/70 px-6" role="alertdialog" aria-modal="true" aria-labelledby="susp-title">
      <div className="max-w-[420px] rounded-[28px] border-2 border-charcoal bg-paper p-6 text-center">
        <Coco mood="thinking" size={96} className="mx-auto" />
        <h2 id="susp-title" className="mt-2 text-[24px]">Your account is paused</h2>
        <p className="mt-2 text-[14.5px] text-muted">Someone reported a problem, and our team is reviewing it. While that happens you can&apos;t be introduced to anyone or send messages. If you think this is a mistake, contact us through the link in our <Link href="/guidelines" className="font-semibold underline">community guidelines</Link>.</p>
        <button className="mt-5 min-h-12 w-full rounded-[16px] border-2 border-charcoal bg-coral font-display font-extrabold" onClick={() => { signOut(); location.href = "/"; }}>Sign out</button>
      </div>
    </div>
  );
}
