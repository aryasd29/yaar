"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { lastYaarHour } from "./config";
import { DEMO_PEOPLE, RADAR_DEMO, VENUES } from "./seed";
import { compatibilityScore, DAY, eligible, suggestIdeas, uid } from "./logic";
import * as remote from "./remote";
import type { Battery, DatePlan, Match, Message, PlusPlan, PlusState, Prefs, Profile, ReactTarget, Reaction, Report, Settings, TableEvent } from "./types";
import { FREEZE_DAYS, SECOND_TIDE_HOUR, SECOND_TIDE_SIZE, fitsLifestyle, isPlus, monthKey, sampleLifestyle, startPlus } from "./plus";

/** Sample people carry stable lifestyle details so Plus filters have something to work with. */
const withLifestyle = (ps: Profile[]) => ps.map((p) => (p.lifestyle ? p : { ...p, lifestyle: sampleLifestyle(p.id) }));

export interface Toast { id: string; text: string; tone?: "good" | "info" | "warn" }

interface State {
  hydrated: boolean;
  authed: boolean;
  /** Set when a moderator has suspended this account. */
  suspended?: boolean;
  authMethod?: "phone" | "google" | "email";
  phone?: string;
  me: Profile | null;
  prefs: Prefs;
  settings: Settings;
  people: Profile[];
  reactions: Reaction[];
  matches: Match[];
  messages: Message[];
  plans: DatePlan[];
  passes: string[];
  blocks: string[];
  reports: Report[];
  drop: { day: string; ids: string[]; opened: string[] };
  clockOffset: number;
  dismissedNudges: Record<string, number>;
  joinedTables: string[];
  joinedCircles: string[];
  dismissedFlags: string[];
  notifRead: Record<string, number>;
  starterPlan: { situation?: string; interests: string[]; area?: string; done: string[] };
  /** Isle Plus membership (null = not a member). */
  plus: PlusState | null;
  /** Isle credit in rupees (from no-show payouts), live app only. */
  credit: number;
  /** Real Tables from the database (live app). */
  liveTables: TableEvent[];
  tablesLoaded: boolean;
  toasts: Toast[];
  celebrate: string | null; // matchId to celebrate
}

interface Actions {
  now: () => number;
  signIn: (method: "phone" | "google" | "email", phone?: string) => void;
  completeOnboarding: (me: Profile, prefs: Prefs, opts?: { fromServer?: boolean }) => void;
  eligibleFor: (p: Profile) => boolean;
  updateMe: (patch: Partial<Profile>) => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setBattery: (b: Battery) => void;
  ensureDrop: () => void;
  openIntro: (id: string) => void;
  react: (to: string, target: ReactTarget, note: string) => void;
  reactBack: (reactionId: string, note?: string) => void;
  pass: (id: string) => void;
  sendMessage: (matchId: string, body: string, kind?: Message["kind"], meta?: Record<string, unknown>) => void;
  softExit: (matchId: string, reason: string) => void;
  block: (userId: string) => void;
  report: (userId: string, reason: string, details?: string) => void;
  startPlan: (matchId: string) => string;
  pickIdeas: (planId: string, ideaIds: string[]) => void;
  updatePlan: (planId: string, patch: Partial<DatePlan>) => void;
  confirmPlan: (planId: string) => void;
  cancelPlan: (planId: string) => void;
  checkIn: (planId: string) => void;
  giveFeedback: (planId: string, answer: "yes" | "maybe" | "no", comfort: "comfortable" | "unsure" | "uncomfortable") => void;
  dismissNudge: (matchId: string) => void;
  fastForward: (days: number) => void;
  toggleTable: (id: string) => void;
  toggleCircle: (id: string) => void;
  dismissFlag: (messageId: string) => void;
  markNotifs: (ids: string[]) => void;
  setStarter: (patch: Partial<State["starterPlan"]>) => void;
  /* Isle Plus */
  isPlus: () => boolean;
  activatePlus: (plan: PlusPlan, paymentId?: string) => void;
  cancelPlus: () => void;
  resumePlus: () => void;
  useFreeSeat: () => void;
  freezeMatches: () => void;
  unfreezeMatches: () => void;
  sparkAgain: (matchId: string) => boolean;
  rewind: () => string | null;
  toast: (text: string, tone?: Toast["tone"]) => void;
  dropToast: (id: string) => void;
  clearCelebrate: () => void;
  signOut: () => void;
  resetDemo: () => void;
}

const defaultPrefs: Prefs = { interestedIn: "everyone", ageMin: 21, ageMax: 32, distanceKm: 15, intents: ["serious", "open", "companionship", "casual", "figuring"] };
const defaultSettings: Settings = {
  aiHelp: true, redFlagRadar: true, conversationPulse: true,
  notifications: { yaarHour: true, reactions: true, messages: true, dateReminders: true },
  hideFromWork: true, hideFromCollege: true, showWorkAfterMatch: true, locationVisibility: "area",
};

const L = () => import("./live");
let secondTideAsked = false;

/** Sample people exist only in the offline demo. The live app shows real members only. */
// Read straight from the environment: remote.ts and this file import each other, so remote.LIVE
// may not be ready yet while this module is first evaluated.
const LIVE_ENV = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
const SAMPLES = LIVE_ENV ? [] : DEMO_PEOPLE;

const initial: State = {
  hydrated: false, authed: false, me: null, prefs: defaultPrefs, settings: defaultSettings,
  people: withLifestyle(SAMPLES), reactions: [], matches: [], messages: [], plans: [], passes: [], blocks: [], reports: [],
  drop: { day: "", ids: [], opened: [] }, clockOffset: 0, dismissedNudges: {}, joinedTables: [], joinedCircles: [],
  dismissedFlags: [], notifRead: {}, starterPlan: { interests: [], done: [] }, plus: null, credit: 0, liveTables: [], tablesLoaded: false, toasts: [], celebrate: null,
};


/** localStorage that never crashes the app: if the browser is out of space (large photos), we tell the person instead. */
const safeStorage = {
  getItem: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => {
    try { localStorage.setItem(k, v); }
    catch { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("yaar-storage-full")); }
  },
  removeItem: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export const useYaar = create<State & Actions>()(
  persist(
    (set, get) => {
      const now = () => Date.now() + get().clockOffset;
      const meId = () => get().me?.id ?? "me";
      const person = (id: string) => get().people.find((p) => p.id === id);
      const otherIn = (matchId: string) => get().matches.find((m) => m.id === matchId)?.users[1];

      const makeMatch = (other: string, at = now()): Match => ({ id: uid("match"), users: [meId(), other], createdAt: at, lastActivityAt: at, status: "active" });

      const simulateReply = (matchId: string) => {
        if (remote.LIVE) return;
        const m = get().matches.find((x) => x.id === matchId);
        if (!m) return;
        const other = person(m.users[1]);
        const replies = other?.demo?.replies;
        if (!other || !replies?.length || m.status !== "active") return;
        const count = get().messages.filter((x) => x.matchId === matchId && x.from === other.id).length;
        setTimeout(() => {
          const mm = get().matches.find((x) => x.id === matchId);
          if (!mm || mm.status !== "active") return;
          const msg: Message = { id: uid("msg"), matchId, from: other.id, body: replies[count % replies.length], kind: "text", createdAt: now() };
          set((s) => ({ messages: [...s.messages, msg], matches: s.matches.map((x) => (x.id === matchId ? { ...x, lastActivityAt: msg.createdAt } : x)) }));
        }, 1400 + Math.random() * 1400);
      };

      /** Creates a small, believable world around a new user so every feature can be tried right away. */
      const seedWorld = (me: Profile, prefs: Prefs) => {
        const pool = DEMO_PEOPLE.filter((p) => eligible(me, prefs, p)).sort((a, b) => compatibilityScore(me, b) - compatibilityScore(me, a));
        const t = now();
        const reactions: Reaction[] = [];
        const matches: Match[] = [];
        const messages: Message[] = [];
        const plans: DatePlan[] = [];

        // 1) An ongoing chat that is ready for a date.
        const a = pool[0];
        if (a) {
          const m: Match = { id: uid("match"), users: [me.id, a.id], createdAt: t - 3 * DAY, lastActivityAt: t - 2 * 3_600_000, status: "active", seenCelebration: true };
          matches.push(m);
          const lines: [string, string, number][] = [
            [me.id, `ok bold claim about ${a.starterPack[0]}. i need proof`, 3 * DAY - 600_000],
            [a.id, "haha proof will be provided in person, if you earn it", 3 * DAY - 300_000],
            [me.id, "fair. what's your ideal sunday?", 2 * DAY],
            [a.id, `honestly? ${a.starterPack[1]} and then a very long nap`, 2 * DAY - 900_000],
            [me.id, "the nap is the most relatable part", 2 * DAY - 600_000],
            [a.id, a.moments[0]?.caption ? `did you see my "${a.moments[0].caption}" photo? that was a good day` : "what about you?", 1 * DAY],
            [me.id, "i did. that looks unreal", 1 * DAY - 600_000],
            [a.id, "you should come next time 😄", 3 * 3_600_000],
          ];
          lines.forEach(([from, body, ago]) => messages.push({ id: uid("msg"), matchId: m.id, from, body, kind: "text", createdAt: t - ago }));
        }
        // 2) A fresh match, nothing said yet.
        const b = pool[1];
        if (b) matches.push({ id: uid("match"), users: [me.id, b.id], createdAt: t - 5 * 3_600_000, lastActivityAt: t - 5 * 3_600_000, status: "active", seenCelebration: true });
        // 3) A past date, ready for the post-date check-in.
        const c = pool[2];
        if (c) {
          const m: Match = { id: uid("match"), users: [me.id, c.id], createdAt: t - 9 * DAY, lastActivityAt: t - 1 * DAY, status: "active", seenCelebration: true };
          matches.push(m);
          messages.push(
            { id: uid("msg"), matchId: m.id, from: c.id, body: "that was such a fun idea", kind: "text", createdAt: t - 6 * DAY },
            { id: uid("msg"), matchId: m.id, from: me.id, body: "see you saturday then!", kind: "text", createdAt: t - 5 * DAY },
          );
          const ideas = suggestIdeas(me, c);
          const venue = VENUES.find((v) => v.activity === ideas[0].activity) ?? VENUES[0];
          const slot = new Date(t - 3 * 3_600_000).toISOString();
          const plan: DatePlan = {
            id: uid("plan"), matchId: m.id, ideas, picks: { [me.id]: [ideas[0].id], [c.id]: [ideas[0].id] }, chosenIdea: ideas[0].id,
            venueId: venue.id, slot, stage: "checkedin", deposit: {}, checkins: { [me.id]: true, [c.id]: true }, feedback: {}, comfort: {}, createdAt: t - 5 * DAY,
          };
          plans.push(plan);
          messages.push({ id: uid("msg"), matchId: m.id, from: "yaar", body: "date", kind: "date", createdAt: t - 5 * DAY + 60_000, meta: { planId: plan.id } });
        }
        // 4) Two people who already reacted to you.
        pool.slice(3, 5).forEach((p, i) => {
          const target: ReactTarget = i === 0 ? { kind: "hottake", label: "your hot take" } : { kind: "moment", refId: me.moments[0]?.id, label: "your first moment" };
          reactions.push({ id: uid("rx"), from: p.id, to: me.id, target, note: i === 0 ? "okay this hot take is correct, finally someone said it" : "this photo is such a vibe", createdAt: t - (i + 1) * 3_600_000, status: "pending" });
        });
        // 5) A chat that shows the Red Flag Radar at work.
        const r = RADAR_DEMO[prefs.interestedIn === "women" ? "woman" : "man"];
        const rm: Match = { id: uid("match"), users: [me.id, r.id], createdAt: t - 2 * DAY, lastActivityAt: t - 40 * 60_000, status: "active", seenCelebration: true };
        matches.push(rm);
        ([
          [r.id, "hey! loved your photos", 2 * DAY],
          [me.id, "haha thanks!", 2 * DAY - 600_000],
          [r.id, "small emergency, can you send ₹2000 on UPI? will return tomorrow pakka", 60 * 60_000],
          [r.id, "also let's move to whatsapp, i'm rarely on this app", 40 * 60_000],
        ] as [string, string, number][]).forEach(([from, body, ago]) => messages.push({ id: uid("msg"), matchId: rm.id, from, body, kind: "text", createdAt: t - ago }));
        return { reactions, matches, messages, plans, extraPeople: [r] };
      };

      return {
        ...initial,
        now,
        signIn: (method, phone) => set({ authed: true, authMethod: method, phone }),
        completeOnboarding: (me, prefs, opts) => {
          if (remote.LIVE) {
            // Real members only: start with an empty world and load real people from the database.
            set((st) => ({ me, prefs, people: st.people.filter((p) => !remote.isSample(p.id)), reactions: [], matches: [], messages: [], plans: [], drop: { day: "", ids: [], opened: [] }, celebrate: null }));
          } else {
            const { extraPeople, ...world } = seedWorld(me, prefs);
            set({ me, prefs, ...world, people: withLifestyle([...DEMO_PEOPLE, ...extraPeople]), drop: { day: "", ids: [], opened: [] }, celebrate: null });
          }
          get().ensureDrop();
          if (remote.LIVE && !remote.isSample(me.id) && !opts?.fromServer) { void remote.pushProfile(true)?.then(() => remote.loadEverything()); remote.startLive(); remote.track("signup_completed"); }
        },
        eligibleFor: (p) => { const s = get(); return !!s.me && eligible(s.me, s.prefs, p) && s.prefs.intents.includes(p.intent); },
        updateMe: (patch) => { set((s) => (s.me ? { me: { ...s.me, ...patch } } : {})); if (remote.LIVE) remote.pushProfile(); },
        setPrefs: (patch) => { set((s) => ({ prefs: { ...s.prefs, ...patch }, drop: { day: "", ids: [], opened: [] } })); if (remote.LIVE) remote.pushProfile(); },
        setSettings: (patch) => { set((s) => ({ settings: { ...s.settings, ...patch } })); if (remote.LIVE) remote.pushProfile(); },
        setBattery: (b) => {
          set((s) => (s.me ? { me: { ...s.me, battery: b } } : {}));
          if (remote.LIVE) remote.pushProfile();
          get().toast(b === "low" ? "Taking a break. New drops and nudges are paused." : b === "some" ? "Taking it slow. Fewer nudges for now." : "You're back! Fresh bottles at the next Tide.", "info");
          if (b !== "low") get().ensureDrop();
        },
        ensureDrop: () => {
          const s = get();
          if (!s.me || s.me.battery === "low") return;
          const today = lastYaarHour(now()).toISOString();
          const plusOn = isPlus(s.plus, now());
          if (s.drop.day === today) {
            // Second Tide (Isle Plus): a few more people at 10 PM, once a day.
            const hour = new Date(now()).getHours();
            if (remote.LIVE) {
              if (plusOn && hour >= SECOND_TIDE_HOUR && !secondTideAsked) {
                secondTideAsked = true;
                void L().then(async (l) => { const n = await l.secondTide(s.drop.ids); if (n) get().toast(`The Second Tide brought ${n} more bottle${n === 1 ? "" : "s"}.`, "good"); });
              }
              return;
            }
            if (plusOn && hour >= SECOND_TIDE_HOUR && s.plus!.secondTideDay !== today) {
              const seen = new Set([...s.drop.ids, ...s.passes, ...s.blocks, ...s.matches.flatMap((m) => m.users), ...s.reactions.filter((r) => r.from === s.me!.id).map((r) => r.to)]);
              const more = s.people.filter((p) => p.id !== s.me!.id && !seen.has(p.id) && eligible(s.me!, s.prefs, p) && s.prefs.intents.includes(p.intent) && fitsLifestyle(s.prefs, p))
                .sort((a, b) => compatibilityScore(s.me!, b) - compatibilityScore(s.me!, a)).slice(0, SECOND_TIDE_SIZE);
              set({ plus: { ...s.plus!, secondTideDay: today }, drop: { ...s.drop, ids: [...s.drop.ids, ...more.map((p) => p.id)] } });
              if (more.length) get().toast(`The Second Tide brought ${more.length} more bottle${more.length === 1 ? "" : "s"}.`, "good");
            }
            return;
          }
          const engaged = new Set([
            ...s.passes, ...s.blocks,
            ...s.matches.flatMap((m) => m.users),
            ...s.reactions.filter((r) => r.from === s.me!.id).map((r) => r.to),
          ]);
          const pool = s.people.filter((p) => eligible(s.me!, s.prefs, p) && !engaged.has(p.id) && s.prefs.intents.includes(p.intent) && (!plusOn || fitsLifestyle(s.prefs, p)));
          // Fair ordering: compatibility first, light shuffle so the same people don't always lead.
          const ranked = pool.map((p) => ({ p, s: compatibilityScore(s.me!, p) + Math.random() * 1.5 + (remote.isSample(p.id) ? 0 : 4) })).sort((x, y) => y.s - x.s).map((x) => x.p);
          const size = s.me.battery === "some" ? 4 : 6;
          set({ drop: { day: today, ids: ranked.slice(0, size).map((p) => p.id), opened: [] } });
        },
        openIntro: (id) => set((s) => (s.drop.opened.includes(id) ? {} : { drop: { ...s.drop, opened: [...s.drop.opened, id] } })),
        react: (to, target, note) => {
          const s = get();
          if (remote.LIVE && !remote.isSample(to)) {
            const r: Reaction = { id: remote.newId(), from: meId(), to, target, note, createdAt: now(), status: "pending" };
            set({ reactions: [...s.reactions.filter((x) => !(x.from === r.from && x.to === to)), r] });
            void remote.sendReaction(r);
            return;
          }
          const r: Reaction = { id: uid("rx"), from: meId(), to, target, note, createdAt: now(), status: "pending" };
          remote.track("reaction_sent", { kind: target.kind, sample: true });
          const incoming = s.reactions.find((x) => x.from === to && x.to === meId() && x.status === "pending");
          set({ reactions: [...s.reactions, r] });
          const other = person(to);
          if (incoming) {
            get().reactBack(incoming.id, note);
            return;
          }
          get().toast(`Reaction sent to ${other?.name ?? "them"}. If they react back, you'll match.`, "good");
          if (other?.demo?.reactsBack) {
            setTimeout(() => {
              const m = makeMatch(to);
              const opener: Message = { id: uid("msg"), matchId: m.id, from: meId(), body: note || `Reacted to ${target.label}`, kind: "text", createdAt: r.createdAt, meta: { reaction: target } };
              set((st) => ({
                reactions: st.reactions.map((x) => (x.id === r.id ? { ...x, status: "matched" } : x)),
                matches: [...st.matches, m], messages: [...st.messages, opener], celebrate: m.id,
              }));
              simulateReply(m.id);
            }, 2200);
          }
        },
        reactBack: (reactionId, note) => {
          const s = get();
          const rx = s.reactions.find((x) => x.id === reactionId);
          if (!rx) return;
          if (remote.LIVE && !remote.isSample(rx.from)) {
            const them = person(rx.from);
            get().react(rx.from, { kind: "moment", refId: them?.moments[0]?.id, label: "your scrapbook" }, note ?? "");
            return;
          }
          const m = makeMatch(rx.from);
          const msgs: Message[] = [{ id: uid("msg"), matchId: m.id, from: rx.from, body: rx.note || `Reacted to ${rx.target.label}`, kind: "text", createdAt: rx.createdAt, meta: { reaction: rx.target } }];
          if (note) msgs.push({ id: uid("msg"), matchId: m.id, from: meId(), body: note, kind: "text", createdAt: now() });
          set({ reactions: s.reactions.map((x) => (x.id === reactionId ? { ...x, status: "matched" } : x)), matches: [...s.matches, m], messages: [...s.messages, ...msgs], celebrate: m.id });
          if (note) simulateReply(m.id);
        },
        pass: (id) => { if (remote.LIVE && !remote.isSample(id)) void remote.passReaction(id); set((s) => ({
          passes: [...s.passes, id],
          reactions: s.reactions.map((x) => (x.from === id && x.to === meId() && x.status === "pending" ? { ...x, status: "passed" } : x)),
        })); },
        sendMessage: (matchId, body, kind = "text", meta) => {
          const live = remote.LIVE && !remote.isSample(otherIn(matchId));
          const msg: Message = { id: live ? remote.newId() : uid("msg"), matchId, from: meId(), body, kind, createdAt: now(), meta };
          if (live) void remote.sendMessage(msg);
          set((s) => ({ messages: [...s.messages, msg], matches: s.matches.map((x) => (x.id === matchId ? { ...x, lastActivityAt: msg.createdAt } : x)) }));
          if (kind === "text") simulateReply(matchId);
        },
        softExit: (matchId, reason) => {
          set((s) => ({ matches: s.matches.map((x) => (x.id === matchId ? { ...x, status: "ended", endedBy: meId(), endReason: reason } : x)) }));
          if (remote.LIVE && !remote.isSample(otherIn(matchId))) void remote.endMatch(matchId, reason);
          get().toast("Match closed kindly. They'll get a gentle note, not your reason.", "info");
        },
        block: (userId) => {
          if (remote.LIVE && !remote.isSample(userId)) { void remote.blockUser(userId); get().matches.filter((m) => m.users.includes(userId)).forEach((m) => void remote.endMatch(m.id, "blocked")); }
          set((s) => ({ blocks: [...s.blocks, userId], matches: s.matches.map((x) => (x.users.includes(userId) ? { ...x, status: "ended", endedBy: meId(), endReason: "blocked" } : x)) }));
          get().toast("Blocked. They can't see or contact you anymore.", "info");
        },
        report: (userId, reason, details) => {
          if (remote.LIVE && !remote.isSample(userId)) void remote.reportUser(userId, reason, details);
          set((s) => ({ reports: [...s.reports, { id: uid("rep"), about: userId, reason, details, createdAt: now() }] }));
          get().toast("Report received. Our safety team reviews every report.", "good");
        },
        startPlan: (matchId) => {
          const s = get();
          const existing = s.plans.find((p) => p.matchId === matchId && !["done", "cancelled"].includes(p.stage));
          if (existing) return existing.id;
          const m = s.matches.find((x) => x.id === matchId)!;
          const other = person(m.users[1])!;
          const ideas = suggestIdeas(s.me!, other);
          // The other (simulated) person privately picks ideas too. Their picks stay hidden unless they overlap.
          const real = !remote.isSample(other.id);
          const theirs = other.demo?.reactsBack ? [ideas[0].id, ideas[Math.random() > 0.5 ? 1 : 2].id] : [ideas[2].id];
          const plan: DatePlan = { id: real && remote.LIVE ? remote.newId() : uid("plan"), matchId, ideas, picks: real ? {} : { [other.id]: theirs }, stage: "pick", deposit: {}, checkins: {}, feedback: {}, comfort: {}, createdAt: now() };
          set({ plans: [...s.plans, plan] });
          return plan.id;
        },
        pickIdeas: (planId, ideaIds) => {
          const s = get();
          const plan = s.plans.find((p) => p.id === planId)!;
          const m = s.matches.find((x) => x.id === plan.matchId)!;
          const theirs = plan.picks[m.users[1]] ?? [];
          const overlap = ideaIds.filter((i) => theirs.includes(i));
          set({
            plans: s.plans.map((p) => (p.id === planId ? { ...p, picks: { ...p.picks, [meId()]: ideaIds }, chosenIdea: overlap[0], stage: overlap.length ? "venue" : "pick" } : p)),
          });
        },
        updatePlan: (planId, patch) => set((s) => ({ plans: s.plans.map((p) => (p.id === planId ? { ...p, ...patch } : p)) })),
        confirmPlan: (planId) => {
          const s = get();
          const plan = s.plans.find((p) => p.id === planId)!;
          const m = s.matches.find((x) => x.id === plan.matchId)!;
          const deposit = { ...plan.deposit };
          if (deposit[meId()] && remote.isSample(m.users[1])) deposit[m.users[1]] = true; // a sample person agrees to lock it in
          const liveMatch = remote.LIVE && !remote.isSample(m.users[1]);
          const dateMsg: Message = { id: liveMatch ? remote.newId() : uid("msg"), matchId: plan.matchId, from: "yaar", body: "date", kind: "date", createdAt: now(), meta: { planId } };
          if (liveMatch) { void remote.sendMessage(dateMsg); void remote.notify("date", plan.matchId); }
          remote.track("date_confirmed", { sample: !liveMatch, deposit: !!deposit[meId()] });
          set({
            plans: s.plans.map((p) => (p.id === planId ? { ...p, stage: "confirmed", deposit } : p)),
            messages: [...s.messages, dateMsg],
            matches: s.matches.map((x) => (x.id === plan.matchId ? { ...x, lastActivityAt: now() } : x)),
          });
          get().toast("It's a date! Your date card is in the chat.", "good");
        },
        cancelPlan: (planId) => {
          set((s) => ({ plans: s.plans.map((p) => (p.id === planId ? { ...p, stage: "cancelled" } : p)) }));
          get().toast("Date cancelled. Refund rules were applied.", "info");
        },
        checkIn: (planId) => {
          const s = get();
          const plan = s.plans.find((p) => p.id === planId)!;
          const m = s.matches.find((x) => x.id === plan.matchId)!;
          const theirs = remote.isSample(m.users[1]) ? { [m.users[1]]: true } : {};
          remote.track("date_attended", { sample: remote.isSample(m.users[1]) });
          set({ plans: s.plans.map((p) => (p.id === planId ? { ...p, checkins: { ...p.checkins, [meId()]: true, ...theirs }, stage: "checkedin" } : p)) });
        },
        giveFeedback: (planId, answer, comfort) => {
          const s = get();
          const plan = s.plans.find((p) => p.id === planId)!;
          const m = s.matches.find((x) => x.id === plan.matchId)!;
          const other = person(m.users[1]);
          const theirs: "yes" | "maybe" | "no" = other?.demo?.reactsBack ? "yes" : "maybe";
          const fake = remote.isSample(m.users[1]) ? { [m.users[1]]: theirs } : {};
          remote.track("feedback_given", { answer, sample: remote.isSample(m.users[1]) });
          set({ plans: s.plans.map((p) => (p.id === planId ? { ...p, stage: "done", feedback: { ...p.feedback, [meId()]: answer, ...fake }, comfort: { ...p.comfort, [meId()]: comfort } } : p)) });
          if (s.me && !s.me.reliable) {
            const attended = s.plans.filter((p) => ["checkedin", "done"].includes(p.stage)).length;
            if (attended >= 2) get().updateMe({ reliable: true });
          }
        },
        dismissNudge: (matchId) => set((s) => ({ dismissedNudges: { ...s.dismissedNudges, [matchId]: now() } })),
        fastForward: (days) => {
          set((s) => ({ clockOffset: s.clockOffset + days * DAY }));
          get().ensureDrop();
          get().toast(`Demo clock moved ${days} day${days > 1 ? "s" : ""} forward.`, "info");
        },
        toggleTable: (id) => set((s) => ({ joinedTables: s.joinedTables.includes(id) ? s.joinedTables.filter((x) => x !== id) : [...s.joinedTables, id] })),
        toggleCircle: (id) => set((s) => ({ joinedCircles: s.joinedCircles.includes(id) ? s.joinedCircles.filter((x) => x !== id) : [...s.joinedCircles, id] })),
        dismissFlag: (id) => set((s) => ({ dismissedFlags: [...s.dismissedFlags, id] })),
        markNotifs: (ids) => set((s) => ({ notifRead: { ...s.notifRead, ...Object.fromEntries(ids.map((i) => [i, now()])) } })),
        setStarter: (patch) => set((s) => ({ starterPlan: { ...s.starterPlan, ...patch } })),
        isPlus: () => isPlus(get().plus, now()),
        activatePlus: (plan, paymentId) => {
          // Live app: the server already recorded the membership; just reload it.
          if (remote.LIVE) void L().then((l) => l.loadCommerce());
          else set((s) => ({ plus: startPlus(plan, now(), paymentId, s.plus) }));
          remote.track("plus_started", { plan });
        },
        cancelPlus: () => { set((s) => (s.plus ? { plus: { ...s.plus, autoRenew: false } } : {})); if (remote.LIVE) void L().then((l) => l.setAutoRenew(false)); },
        resumePlus: () => { set((s) => (s.plus ? { plus: { ...s.plus, autoRenew: true } } : {})); if (remote.LIVE) void L().then((l) => l.setAutoRenew(true)); },
        useFreeSeat: () => { if (!remote.LIVE) set((s) => (s.plus ? { plus: { ...s.plus, freeSeatsUsed: [...s.plus.freeSeatsUsed, monthKey(now())] } } : {})); },
        freezeMatches: () => {
          const t = now();
          if (remote.LIVE) {
            set((s) => ({ plus: s.plus ? { ...s.plus, freezeUntil: t + FREEZE_DAYS * DAY } : s.plus }));
            void L().then((l) => l.freeze(FREEZE_DAYS));
            return;
          }
          set((s) => ({
            plus: s.plus ? { ...s.plus, freezeUntil: t + FREEZE_DAYS * DAY } : s.plus,
            matches: s.matches.map((m) => (m.status === "active" ? { ...m, lastActivityAt: Math.max(m.lastActivityAt, t) } : m)),
          }));
          if (remote.LIVE) { remote.pushProfile(); get().matches.filter((m) => m.status === "active" && !remote.isSample(m.users[1])).forEach((m) => void remote.touchMatch(m.id)); }
        },
        unfreezeMatches: () => { set((s) => (s.plus ? { plus: { ...s.plus, freezeUntil: undefined } } : {})); if (remote.LIVE) void L().then((l) => l.freeze(0)); },
        sparkAgain: (matchId) => {
          const s = get();
          if (!isPlus(s.plus, now()) || s.plus!.sparked.includes(matchId)) return false;
          const m = s.matches.find((x) => x.id === matchId);
          if (!m || m.status === "ended") return false;
          set({ plus: { ...s.plus!, sparked: [...s.plus!.sparked, matchId] }, matches: s.matches.map((x) => (x.id === matchId ? { ...x, lastActivityAt: now() } : x)) });
          if (remote.LIVE) {
            void L().then(async (l) => { if (await l.sparkAgain(matchId)) get().sendMessage(matchId, "✨ sparked our chat again. Still up for that coffee?"); else get().toast("Couldn't spark this chat again.", "warn"); });
          } else get().sendMessage(matchId, "✨ sparked our chat again. Still up for that coffee?");
          return true;
        },
        rewind: () => {
          const s = get();
          if (!isPlus(s.plus, now()) || !s.passes.length) return null;
          const id = s.passes[s.passes.length - 1];
          set({
            passes: s.passes.slice(0, -1),
            reactions: s.reactions.map((r) => (r.from === id && r.to === meId() && r.status === "passed" ? { ...r, status: "pending" } : r)),
            drop: s.drop.ids.includes(id) ? s.drop : { ...s.drop, ids: [id, ...s.drop.ids] },
          });
          if (remote.LIVE && !remote.isSample(id)) void remote.unpass(id);
          return id;
        },
        toast: (text, tone = "info") => {
          const t = { id: uid("t"), text, tone };
          set((s) => ({ toasts: [...s.toasts.slice(-2), t] }));
          setTimeout(() => get().dropToast(t.id), 3600);
        },
        dropToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        clearCelebrate: () => set((s) => ({ celebrate: null, matches: s.matches.map((m) => (m.id === s.celebrate ? { ...m, seenCelebration: true } : m)) })),
        signOut: () => { if (remote.LIVE) { void remote.signOutEverywhere(); set({ ...initial, hydrated: true }); } else set({ authed: false }); },
        resetDemo: () => set({ ...initial, hydrated: true }),
      };
    },
    {
      name: "yaar-demo-v1",
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { toasts, hydrated, celebrate, ...rest } = s;
        return rest;
      },
      onRehydrateStorage: () => () => {
        setTimeout(() => {
          // Older versions of the live app kept sample people on this device; clear them out.
          if (remote.LIVE) {
            const st = useYaar.getState();
            const keepMatch = st.matches.filter((m) => !m.users.some((u) => remote.isSample(u)));
            const ids = new Set(keepMatch.map((m) => m.id));
            useYaar.setState({
              people: st.people.filter((p) => !remote.isSample(p.id)),
              matches: keepMatch,
              messages: st.messages.filter((m) => ids.has(m.matchId)),
              plans: st.plans.filter((pl) => ids.has(pl.matchId)),
              reactions: st.reactions.filter((r) => !remote.isSample(r.from) && !remote.isSample(r.to)),
              drop: { ...st.drop, ids: st.drop.ids.filter((id) => !remote.isSample(id)) },
              clockOffset: 0,
            });
          }
          useYaar.setState({ hydrated: true });
        }, 0);
      },
    },
  ),
);

/* ---------- selectors ---------- */
export const EXPIRE_DAYS = 15;
export function matchState(m: Match, now: number) {
  if (m.status === "ended") return { ended: true, expiring: false, daysQuiet: 0 } as const;
  // Isle Plus "Freeze my matches": nothing closes while frozen.
  const freeze = Math.max(useYaar.getState().plus?.freezeUntil ?? 0, m.frozenUntil ?? 0);
  if (freeze > now) return { ended: false, expiring: false, daysQuiet: 0 } as const;
  const daysQuiet = Math.floor((now - m.lastActivityAt) / DAY);
  return { ended: daysQuiet >= EXPIRE_DAYS, expiring: daysQuiet === EXPIRE_DAYS - 1, daysQuiet } as const;
}

// Handy for automated screenshots and debugging; the store holds only this device's demo data.
if (typeof window !== "undefined") (window as unknown as { __yaar: typeof useYaar }).__yaar = useYaar;


