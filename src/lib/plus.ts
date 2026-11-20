/**
 * Isle Plus: the optional membership. Rules live here so the app and the docs agree.
 * Plus never makes anyone more visible or ranks them higher; it changes only what the member sees and saves.
 */
import type { Diet, Habit, Lifestyle, Pets, PlusPlan, PlusState, Prefs, Profile, TableEvent } from "./types";
import { DAY, sharedGround } from "./logic";
import { THIS_OR_THAT } from "./seed";

export const PLANS: Record<PlusPlan, { label: string; price: number; days: number; note: string }> = {
  intro: { label: "First month", price: 99, days: 30, note: "₹99 for your first month, then ₹199 a month" },
  monthly: { label: "Monthly", price: 199, days: 30, note: "₹199 a month, cancel anytime" },
  quarterly: { label: "3 months", price: 499, days: 90, note: "₹499 every 3 months (about ₹166 a month)" },
};

/** Free monthly Tables seat covers any Table up to this price. */
export const FREE_SEAT_MAX = 299;
export const PARTNER_DISCOUNT = 0.15;
export const BUNDLE_PRICE = 299;
export const SECOND_TIDE_HOUR = 22;
export const SECOND_TIDE_SIZE = 3;
export const FREEZE_DAYS = 30;

export const isPlus = (p: PlusState | null | undefined, now: number) => !!p && p.until > now;
export const monthKey = (t: number) => new Date(t).toISOString().slice(0, 7);
export const freeSeatAvailable = (p: PlusState | null | undefined, now: number) => isPlus(p, now) && !p!.freeSeatsUsed.includes(monthKey(now));
export const bundlePrice = (plus: boolean) => Math.round(BUNDLE_PRICE * (plus ? 1 - PARTNER_DISCOUNT : 1));

/** What a Table seat costs this member right now. */
export function seatPrice(t: TableEvent, p: PlusState | null | undefined, now: number) {
  if (t.price === 0) return { price: 0, free: false };
  if (t.price <= FREE_SEAT_MAX && freeSeatAvailable(p, now)) return { price: 0, free: true };
  return { price: t.price, free: false };
}

export function startPlus(plan: PlusPlan, now: number, paymentId?: string, prev?: PlusState | null): PlusState {
  const base = prev && prev.until > now ? prev.until : now;
  return { plan, since: prev?.since ?? now, until: base + PLANS[plan].days * DAY, autoRenew: true, paymentId, freeSeatsUsed: prev?.freeSeatsUsed ?? [], sparked: prev?.sparked ?? [], freezeUntil: prev?.freezeUntil, secondTideDay: prev?.secondTideDay };
}

/* ---------- lifestyle ---------- */
export const DIET: Record<Diet, string> = { veg: "Vegetarian", nonveg: "Non-veg", eggetarian: "Eggetarian", jain: "Jain", vegan: "Vegan" };
export const HABIT: Record<Habit, string> = { no: "Never", sometimes: "Sometimes", yes: "Often" };
export const PETS: Record<Pets, string> = { have: "Has pets", love: "Loves pets", no: "Not a pet person" };
export const LANGUAGES = ["English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi"];

/** Sample people get stable lifestyle details so filters have something to work on. */
export function sampleLifestyle(id: string): Lifestyle {
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pick = <T,>(xs: T[], k: number) => xs[(h >>> k) % xs.length];
  const langs = ["English", pick(["Hindi", "Kannada", "Tamil", "Telugu", "Malayalam", "Marathi", "Bengali"], 3)];
  return { diet: pick<Diet>(["veg", "nonveg", "nonveg", "eggetarian", "jain", "vegan", "veg"], 1), drinks: pick<Habit>(["no", "sometimes", "sometimes", "yes"], 5), smokes: pick<Habit>(["no", "no", "no", "sometimes"], 7), languages: langs, pets: pick<Pets>(["have", "love", "love", "no"], 9) };
}

/** True when a person fits the member's lifestyle filters. Unknown answers are never filtered out. */
export function fitsLifestyle(prefs: Prefs, p: Profile) {
  const f = prefs.lifestyle; if (!f) return true;
  const l = p.lifestyle; if (!l) return true;
  if (f.diet?.length && l.diet && !f.diet.includes(l.diet)) return false;
  if (f.drinks?.length && l.drinks && !f.drinks.includes(l.drinks)) return false;
  if (f.smokes?.length && l.smokes && !f.smokes.includes(l.smokes)) return false;
  if (f.languages?.length && l.languages?.length && !l.languages.some((x) => f.languages!.includes(x))) return false;
  return true;
}
export const filterCount = (prefs: Prefs) => Object.values(prefs.lifestyle ?? {}).filter((v) => Array.isArray(v) && v.length).length;

/* ---------- "Why you two?" ---------- */
export function whyYouTwo(me: Profile, them: Profile): string[] {
  const g = sharedGround(me, them);
  const out: string[] = [];
  const sameSide = g.agreeIds.map((id) => THIS_OR_THAT.find((q) => q.id === id)).filter(Boolean).map((q) => (me.thisOrThat[q!.id] === "a" ? q!.a : q!.b).toLowerCase());
  if (g.agree) out.push(`You picked the same side on ${g.agree} This or That question${g.agree === 1 ? "" : "s"}${sameSide.length ? `, like ${sameSide.slice(0, 2).join(" and ")}` : ""}.`);
  const tags = g.sharedInterests;
  if (tags.length) out.push(`You're both into ${tags.slice(0, 3).join(", ")}.`);
  if (me.intent === them.intent) out.push("You're looking for the same kind of thing.");
  if (me.area === them.area) out.push(`You're both around ${me.area}.`);
  const l1 = me.lifestyle, l2 = them.lifestyle;
  if (l1?.diet && l1.diet === l2?.diet) out.push(`Same food habits (${DIET[l1.diet].toLowerCase()}), so ordering is easy.`);
  const lang = l1?.languages?.find((x) => x !== "English" && l2?.languages?.includes(x));
  if (lang) out.push(`You both speak ${lang}.`);
  if (!out.length) out.push("Different worlds, which can make for the best conversations. Isle introduced you because your preferences fit each other.");
  return out;
}

/* ---------- Coco's scrapbook review ---------- */
export interface ReviewTip { ok: boolean; text: string; href?: string }
export function scrapbookReview(me: Profile): { score: number; tips: ReviewTip[]; coverTip?: string } {
  const tips: ReviewTip[] = [];
  const photos = me.moments.filter((m) => m.photoUrl);
  const captioned = me.moments.filter((m) => (m.caption ?? "").trim().length >= 12);
  tips.push(photos.length >= 2 ? { ok: true, text: `${photos.length} real photos. People trust profiles with real photos far more.` } : { ok: false, text: "Add at least two real photos of you. Illustrations are cute, but people want to see who they'd meet.", href: "/profile/edit#moments" });
  tips.push(captioned.length >= Math.min(3, me.moments.length) ? { ok: true, text: "Your captions give people something to react to." } : { ok: false, text: "Give each photo a caption with a tiny story (\"3am trek, worth it\"). Captions get reactions; plain photos don't.", href: "/profile/edit#moments" });
  tips.push(me.hotTake.trim().length >= 15 ? { ok: true, text: "Your hot take has some personality." } : { ok: false, text: "Make your hot take a little bolder. Mild opinions get mild replies.", href: "/profile/edit#hottake" });
  tips.push(me.voice ? { ok: true, text: "Your voice note helps people feel they know you." } : { ok: false, text: "Record a 15-second voice note. It's the quickest way to seem real and warm.", href: "/profile/edit#voice" });
  tips.push(me.starterPack.length >= 3 ? { ok: true, text: "Your starter pack is a great conversation opener." } : { ok: false, text: "Add a few more things to your starter pack.", href: "/profile/edit#starter" });
  tips.push(Object.keys(me.thisOrThat).length >= 6 ? { ok: true, text: "Plenty of This or That answers for people to compare." } : { ok: false, text: "Answer a few more This or That questions. They power \"Why you two?\".", href: "/profile/edit#tot" });
  const score = Math.round((tips.filter((t) => t.ok).length / tips.length) * 100);
  // Cover pick: the first real photo with the best caption.
  const best = [...photos].sort((a, b) => (b.caption?.length ?? 0) - (a.caption?.length ?? 0))[0];
  const coverTip = best && me.moments[0]?.id !== best.id ? `Make "${best.caption || "your photo"}" your cover. A real photo with a story makes the best first impression.` : undefined;
  return { score, tips, coverTip };
}
