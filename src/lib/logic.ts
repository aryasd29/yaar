import { DATE_CATALOG, THIS_OR_THAT } from "./seed";
import type { DateIdea, Intent, Message, Prefs, Profile, Settings } from "./types";
import { INTENT_SHORT } from "./types";

export const DAY = 24 * 60 * 60 * 1000;
export const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

const COMPATIBLE: Record<Intent, Intent[]> = {
  serious: ["serious", "open"],
  open: ["serious", "open", "casual", "companionship", "figuring"],
  casual: ["casual", "open", "figuring"],
  companionship: ["companionship", "open", "serious"],
  figuring: ["figuring", "open", "casual"],
};

export function eligible(me: Profile, prefs: Prefs, p: Profile) {
  if (p.id === me.id) return false;
  if (prefs.interestedIn === "women" && p.gender !== "woman") return false;
  if (prefs.interestedIn === "men" && p.gender !== "man") return false;
  if (p.age < prefs.ageMin || p.age > prefs.ageMax) return false;
  if (p.battery === "low") return false;
  return true;
}

/** The "Your shared ground" card: real overlaps only, never a predicted percentage. */
export function sharedGround(me: Profile, p: Profile) {
  const intentAligned = me.intent === p.intent ? "Aligned" : COMPATIBLE[me.intent].includes(p.intent) ? "Compatible" : "Different";
  const agreeIds = THIS_OR_THAT.filter((q) => me.thisOrThat[q.id] && me.thisOrThat[q.id] === p.thisOrThat[q.id]).map((q) => q.id);
  const answered = THIS_OR_THAT.filter((q) => me.thisOrThat[q.id]).length;
  const sharedInterests = me.interests.filter((i) => p.interests.includes(i));
  const textMe = me.thisOrThat.text, textThem = p.thisOrThat.text;
  const pace = !textMe ? "Worth exploring" : textMe === textThem ? "Similar" : "Worth exploring";
  return { intentAligned, agree: agreeIds.length, answered, agreeIds, sharedInterests, pace };
}

export function compatibilityScore(me: Profile, p: Profile) {
  const g = sharedGround(me, p);
  return (g.intentAligned === "Aligned" ? 3 : g.intentAligned === "Compatible" ? 1.5 : -3) + g.agree * 0.4 + g.sharedInterests.length * 1.2;
}

/** Pick 3 date ideas from shared interests, filling with gentle defaults. */
export function suggestIdeas(a: Profile, b: Profile): DateIdea[] {
  const tags = new Set([...a.interests, ...b.interests]);
  const shared = new Set(a.interests.filter((i) => b.interests.includes(i)));
  const scored = DATE_CATALOG.map((d) => ({
    d, s: d.tags.reduce((acc, t) => acc + (shared.has(t) ? 3 : tags.has(t) ? 1 : 0), 0) + (d.id === "coffee" ? 0.5 : 0) + (d.id === "walk" ? 0.3 : 0),
  })).sort((x, y) => y.s - x.s);
  return scored.slice(0, 3).map((x) => x.d);
}

export function ideaReason(idea: DateIdea, a: Profile, b: Profile) {
  const shared = idea.tags.filter((t) => a.interests.includes(t) && b.interests.includes(t));
  if (shared.length) return `You both like ${shared.slice(0, 2).join(" and ")}`;
  const either = idea.tags.find((t) => a.interests.includes(t) || b.interests.includes(t));
  return either ? `One of you loves ${either}` : "An easy, low-pressure first meet";
}

/* ---------- Red Flag Radar ----------
 * Two levels, never a verdict about a person:
 *  - "pause": patterns strongly linked to scams or coercion (money, credentials, threats, suspicious links).
 *  - "tip":   ordinary things that are worth a gentle, neutral reminder (moving to another app, any link).
 */
export type FlagLevel = "pause" | "tip";
const PAUSE: { re: RegExp; title: string; why: string }[] = [
  { re: /(₹\s?\d|rs\.?\s?\d|\bupi\b|gpay|paytm|phonepe|send (me )?money|lend me|borrow|transfer (some|the)? ?money|bank account|crypto|invest(ment)? (plan|opportunity)|gift card)/i, title: "A request for money", why: "People you haven't met shouldn't ask for money or payments. This is the most common pattern in dating scams." },
  { re: /(\botp\b|aadhaar|aadhar|\bpan\b ?(card|number)|bank details|card number|password|cvv)/i, title: "A request for private details", why: "Nobody needs your OTP, ID numbers, card or bank details. Isle will never ask for these either." },
  { re: /(you better|or else|i know where you|you owe me|send (me )?(pics|photos|nudes)|don'?t tell anyone|i'?ll (find|come to) you)/i, title: "Pressure or threatening language", why: "You never owe anyone a reply, a photo or a meeting. It's okay to step away." },
  { re: /(bit\.ly|tinyurl|t\.co\/|\.xyz\b|\.top\b|\.click\b|grabify)/i, title: "A shortened or unusual link", why: "Shortened links can hide where they lead. Only open it if you're sure." },
];
const TIP: { re: RegExp; title: string; why: string }[] = [
  { re: /(whatsapp|telegram|insta(gram)?|snap(chat)?|move (this |the )?(chat|conversation)|text me on|number\?)/i, title: "Moving to another app", why: "Totally normal, and your call. Just so you know, block, report and date check-ins only work inside Isle." },
  { re: /(https?:\/\/|www\.)/i, title: "A link", why: "Links are usually fine. Open ones from new matches with the usual care." },
];
export function redFlags(text: string): { level: FlagLevel; items: { title: string; why: string }[] } | null {
  const pause = PAUSE.filter((f) => f.re.test(text)).map(({ title, why }) => ({ title, why }));
  if (pause.length) return { level: "pause", items: pause };
  const tip = TIP.filter((f) => f.re.test(text)).map(({ title, why }) => ({ title, why }));
  return tip.length ? { level: "tip", items: tip.slice(0, 1) } : null;
}

/* ---------- Conversation Pulse: broad patterns only, never claims about feelings ---------- */
export function conversationPulse(msgs: Message[], meId: string, now: number) {
  const texts = msgs.filter((m) => m.kind === "text");
  if (texts.length < 4) return null;
  const last10 = texts.slice(-10);
  const mine = last10.filter((m) => m.from === meId).length;
  const last = texts[texts.length - 1];
  if (now - last.createdAt > 2 * DAY) return { kind: "stalled", tip: "This chat has gone quiet. A Chemistry Room game is an easy way back in." } as const;
  if (mine / last10.length > 0.75) return { kind: "onesided", tip: "You've been carrying the chat. Try asking about something in their scrapbook and give them room to reply." } as const;
  const avg = last10.reduce((a, m) => a + m.body.length, 0) / last10.length;
  if (avg < 18 && texts.length > 8) return { kind: "smalltalk", tip: "Lots of short replies. A voice note or a 'Finish my sentence' game could help you go deeper." } as const;
  if (texts.length >= 10) return { kind: "flowing", tip: "You two have plenty to talk about. If you both feel ready, a date idea is waiting." } as const;
  return null;
}

/* ---------- Help Me Reply fallback (used when no AI key is configured) ---------- */
export function styleOf(msgs: Message[], meId: string) {
  const mine = msgs.filter((m) => m.from === meId && m.kind === "text").slice(-8);
  const lower = mine.length > 0 && mine.filter((m) => m.body === m.body.toLowerCase()).length / mine.length > 0.6;
  const emoji = mine.some((m) => /\p{Extended_Pictographic}/u.test(m.body));
  const short = mine.length > 0 && mine.reduce((a, m) => a + m.body.length, 0) / mine.length < 40;
  return { lower, emoji, short };
}

export function fallbackReplies(lastFromThem: string, them: Profile, style: ReturnType<typeof styleOf>) {
  const topic = them.starterPack.find((s) => lastFromThem.toLowerCase().includes(s.split(" ")[0].toLowerCase())) ?? them.starterPack[0];
  const q = lastFromThem.trim().endsWith("?");
  let out = [
    { tone: "Playful", text: q ? `okay honest answer: yes, but only if you explain your ${topic} obsession first` : `wait, this is the most ${them.area} thing i've heard all week` },
    { tone: "Casual", text: q ? `haha yes, pretty much. what about you?` : `haha fair. so how did you get into ${topic}?` },
    { tone: "Thoughtful", text: `I like that you said that. What's something about ${topic} most people don't get?` },
  ];
  out = out.map((r) => {
    let t = r.text;
    if (style.lower) t = t.toLowerCase();
    if (style.emoji && r.tone === "Playful") t += " 😄";
    return { ...r, text: t };
  });
  return out;
}

export type Situation = "keep" | "stuck" | "askout" | "weird";
export const SITUATIONS: { id: Situation; label: string }[] = [
  { id: "keep", label: "Keep it going" },
  { id: "stuck", label: "I'm stuck" },
  { id: "askout", label: "Ask them out" },
  { id: "weird", label: "Did I say something weird?" },
];

/** Rule-based suggestions used when no AI key is configured. Matches the user's texting style. */
export function suggestReplies(situation: Situation, lastFromThem: string, them: Profile, style: ReturnType<typeof styleOf>) {
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const topic = them.starterPack.find((s) => lastFromThem.toLowerCase().includes(s.split(" ")[0].toLowerCase())) ?? pick(them.starterPack);
  const moment = pick(them.moments)?.caption ?? topic;
  let out: { tone: string; text: string; why: string }[];
  switch (situation) {
    case "stuck":
      out = [
        { tone: "Playful", text: `okay important question: "${moment}". i need the full story`, why: `It's from their scrapbook, so they already want to talk about it.` },
        { tone: "Casual", text: `random but what's your go-to weekend plan lately?`, why: "Easy to answer and opens up plans you could share." },
        { tone: "Thoughtful", text: `your hot take has been living in my head. what made you so sure about it?`, why: "Asking 'why' invites a real answer, not a one-word reply." },
      ];
      break;
    case "askout":
      out = [
        { tone: "Playful", text: `okay we clearly need to settle this ${topic} debate in person`, why: "Turns something you already joke about into a plan." },
        { tone: "Casual", text: `want to grab a coffee this weekend? no pressure at all`, why: "Simple, specific and easy to say no to, which makes yes easier." },
        { tone: "Thoughtful", text: `I've really liked talking to you. would you be up for meeting sometime soon?`, why: "Honest and warm. You can also send a date idea from the planner." },
      ];
      break;
    case "weird":
      out = [
        { tone: "Playful", text: `okay that came out weirder than it sounded in my head 😅`, why: "A light acknowledgement usually clears the air." },
        { tone: "Casual", text: `hope that didn't come across wrong, I just meant it as a joke`, why: "Clarifies without over-apologising." },
        { tone: "Thoughtful", text: `just checking, did my last message land okay? happy to explain what I meant`, why: "Shows you care how they felt." },
      ];
      break;
    default: {
      const q = lastFromThem.trim().endsWith("?");
      out = [
        { tone: "Playful", text: q ? `honest answer: yes. but only if you explain the ${topic} thing first` : `wait, that's the most ${them.area} thing i've heard all week`, why: "Light teasing keeps the energy up." },
        { tone: "Casual", text: q ? `haha pretty much yeah. what about you?` : `haha fair. how did you get into ${topic}?`, why: "Answers and hands the conversation back to them." },
        { tone: "Thoughtful", text: `I like that. what's something about ${topic} most people don't get?`, why: "Invites a longer, more personal answer." },
      ];
    }
  }
  return out.map((r) => {
    let t = r.text;
    if (style.lower) t = t.charAt(0).toLowerCase() + t.slice(1);
    else t = t.charAt(0).toUpperCase() + t.slice(1);
    if (style.emoji && r.tone === "Playful" && !/\p{Extended_Pictographic}/u.test(t)) t += " 😄";
    return { ...r, text: t };
  });
}

export const SOFT_EXIT_REASONS = [
  "Not feeling a connection",
  "Looking for something different",
  "Not ready to date right now",
  "Prefer not to say",
];

export const fmtTime = (t: number) => new Date(t).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
export const fmtDay = (t: number) => new Date(t).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
export function relTime(t: number, now: number) {
  const d = now - t;
  if (d < 60_000) return "now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < DAY) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / DAY)}d`;
}

/* ---------- Profile helpers ---------- */

/** Split a hot take into its prompt and answer, removing any repeated prompt text. */
export function splitHotTake(p: Pick<Profile, "hotTake" | "hotTakePrompt">) {
  let prompt = p.hotTakePrompt?.trim();
  let answer = p.hotTake.trim();
  if (!prompt) {
    const i = answer.indexOf("…");
    if (i > 0 && i < answer.length - 1) { prompt = answer.slice(0, i + 1).trim(); answer = answer.slice(i + 1).trim(); }
  }
  if (prompt) {
    const bare = prompt.replace(/…$/, "").trim().toLowerCase();
    if (answer.toLowerCase().startsWith(bare)) answer = answer.slice(bare.length).trim();
  }
  answer = answer.replace(/^[.…\s]+/, "").trim();
  return { prompt, answer };
}

/** What others see for your location, based on your setting. Never exact. */
export function displayArea(p: Pick<Profile, "area">, settings?: Pick<Settings, "locationVisibility">) {
  const v = settings?.locationVisibility ?? "area";
  if (v === "hidden") return null;
  if (v === "city") return "Bengaluru";
  return `${p.area}, Bengaluru`;
}

export function preferenceSummary(prefs: Prefs) {
  const who = prefs.interestedIn === "everyone" ? "Everyone" : prefs.interestedIn === "women" ? "Women" : "Men";
  const intents = prefs.intents.length === 5 ? "any intent" : prefs.intents.map((i) => INTENT_SHORT[i].toLowerCase()).join(", ");
  return { who, ages: `${prefs.ageMin}–${prefs.ageMax}`, distance: `${prefs.distanceKm} km`, intents };
}

export interface CompletionItem { id: string; label: string; done: boolean; detail: string; hint: string }
/** Scrapbook completeness. Encouraging, never required. */
export function profileCompletion(me: Profile): { items: CompletionItem[]; done: number; total: number; pct: number } {
  const answered = Object.keys(me.thisOrThat).length;
  const captioned = me.moments.filter((m) => m.caption.trim()).length;
  const items: CompletionItem[] = [
    { id: "moments", label: "Moments", done: me.moments.length >= 3 && captioned === me.moments.length, detail: `${me.moments.length}/6 photos`, hint: "add 3 or more captioned photos. Little stories beat perfect selfies." },
    { id: "hottake", label: "Hot take", done: splitHotTake(me).answer.length >= 8, detail: splitHotTake(me).answer ? "Added" : "Missing", hint: "add a hot take. It gives people something easy to react to." },
    { id: "interests", label: "Interests", done: me.interests.length >= 3, detail: `${me.interests.length} picked`, hint: "pick 3 or more interests. They shape your date ideas." },
    { id: "starter", label: "Starter pack", done: me.starterPack.length >= 3, detail: `${me.starterPack.length}/5`, hint: "add 3 to 5 things that sum you up to your starter pack." },
    { id: "voice", label: "Voice note", done: !!me.voice, detail: me.voice ? `0:${String(me.voice.seconds).padStart(2, "0")}` : "Missing", hint: "a 15-second voice note. Hearing someone laugh says a lot." },
    { id: "tot", label: "This or That", done: answered >= 5, detail: `${answered}/10 answered`, hint: "answer 5 quick This or That picks, so matches see where you agree." },
  ];
  const done = items.filter((i) => i.done).length;
  return { items, done, total: items.length, pct: Math.round((done / items.length) * 100) };
}

/* ---------- Starter pack art: small illustrations chosen from the words ---------- */
const ART: [RegExp, SceneKeyLike][] = [
  [/coffee|chai|tea|café|cafe/i, "coffee"], [/book|read|librar|zine/i, "books"], [/trek|hike|sunrise|mountain|morning/i, "sunrise"],
  [/game|quiz|catan|chess/i, "boardgame"], [/gig|music|song|bollywood|concert|mic|kumar|band/i, "concert"], [/guitar/i, "guitar"],
  [/dog|bruno|puppy/i, "dog"], [/cat|mochi|kitten/i, "cat"], [/dosa|food|biryani|momo|maggi|brunch|eat/i, "dosa"],
  [/plant|garden|balcony/i, "plant"], [/cycl|ride|bike/i, "cycle"], [/bak|cook|kitchen|egg/i, "kitchen"], [/pottery|clay|mug/i, "pottery"],
  [/beach|travel|trip|goa|gokarna/i, "beach"], [/rain|monsoon/i, "rain"], [/walk|city|photo|sketch|thrift|street/i, "city"],
];
type SceneKeyLike = "coffee" | "books" | "sunrise" | "boardgame" | "concert" | "guitar" | "dog" | "cat" | "dosa" | "plant" | "cycle" | "kitchen" | "pottery" | "beach" | "rain" | "city";
export function starterArt(text: string): SceneKeyLike {
  return ART.find(([re]) => re.test(text))?.[1] ?? "city";
}
