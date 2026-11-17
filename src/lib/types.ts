import type { SceneKey } from "@/components/Scene";

export type Gender = "woman" | "man" | "nonbinary";
export type Interest = "women" | "men" | "everyone";
export type Intent = "serious" | "open" | "casual" | "companionship" | "figuring";
export type Battery = "full" | "some" | "low";

export const INTENT_LABEL: Record<Intent, string> = {
  serious: "Looking for a serious relationship",
  open: "Open to seeing where things go",
  casual: "Dating casually",
  companionship: "Looking for companionship",
  figuring: "Still figuring it out",
};
export const INTENT_SHORT: Record<Intent, string> = {
  serious: "Serious", open: "Open to see", casual: "Casual", companionship: "Companionship", figuring: "Figuring it out",
};

export const BATTERY: Record<Battery, { label: string; desc: string; emoji: string }> = {
  full: { label: "Full battery", desc: "Open to meeting people", emoji: "🔋" },
  some: { label: "Some energy", desc: "Happy to chat, taking it slow", emoji: "🪫" },
  low: { label: "Low battery", desc: "Taking a little break", emoji: "🌙" },
};

export type PaperTone = "vanilla" | "butter" | "sage" | "peri" | "coral";
export interface ScrapTheme { paper: PaperTone; tape: Exclude<PaperTone, "vanilla"> }
export const PAPER_BG: Record<PaperTone, string> = { vanilla: "#F4E7D3", butter: "#FFF0C9", sage: "#D8F3EE", peri: "#DCEEFB", coral: "#FFE0D6" };
export const TAPE_BG: Record<ScrapTheme["tape"], string> = { butter: "rgb(255 201 77 / 0.8)", coral: "rgb(255 122 92 / 0.7)", sage: "rgb(111 209 191 / 0.8)", peri: "rgb(125 185 236 / 0.8)" };

export interface Moment { id: string; scene?: SceneKey; photoUrl?: string; caption: string }

export interface Profile {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  pronouns?: string;
  area: string;
  verified: boolean;
  intent: Intent;
  moments: Moment[];
  starterPack: string[];
  /** The answer only. The prompt it answers, if any, lives in hotTakePrompt. */
  hotTake: string;
  hotTakePrompt?: string;
  voice?: { prompt: string; seconds: number; transcript: string; audioUrl?: string };
  thisOrThat: Record<string, "a" | "b">;
  interests: string[];
  reliable?: boolean;
  /** Private: used only for exclusions. Never shown before a match. */
  work?: string;
  college?: string;
  battery: Battery;
  /** Personal touches for the scrapbook page. */
  theme?: ScrapTheme;
  /** demo-only behaviour for simulated users */
  demo?: { reactsBack?: boolean; replies?: string[] };
}

export type ReactTargetKind = "moment" | "hottake" | "voice" | "starter" | "answer";
export interface ReactTarget { kind: ReactTargetKind; refId?: string; label: string }

export interface Reaction {
  id: string;
  from: string;
  to: string;
  target: ReactTarget;
  note: string;
  createdAt: number;
  status: "pending" | "matched" | "passed";
}

export interface Match {
  id: string;
  users: [string, string];
  createdAt: number;
  lastActivityAt: number;
  status: "active" | "ended";
  endedBy?: string;
  endReason?: string;
  seenCelebration?: boolean;
}

export type MessageKind = "text" | "system" | "game" | "date";
export interface Message {
  id: string;
  matchId: string;
  from: string; // user id or "yaar"
  body: string;
  kind: MessageKind;
  createdAt: number;
  meta?: Record<string, unknown>;
}

export interface DateIdea { id: string; activity: string; title: string; blurb: string; tags: string[]; emoji: string }
export interface Venue { id: string; activity: string; name: string; area: string; price: string; perk?: string; partner: boolean; scene: SceneKey; address: string }

export type PlanStage = "pick" | "venue" | "time" | "review" | "confirmed" | "checkedin" | "done" | "cancelled";
export interface DatePlan {
  id: string;
  matchId: string;
  ideas: DateIdea[];
  picks: Record<string, string[]>; // userId -> idea ids
  chosenIdea?: string;
  venueId?: string;
  slot?: string; // ISO
  stage: PlanStage;
  deposit: Record<string, boolean>;
  /** Razorpay payment ids for deposits (test mode). */
  depositPayment?: Record<string, string>;
  checkins: Record<string, boolean>;
  trustedContact?: string;
  checkInReminder?: boolean;
  feedback: Record<string, "yes" | "maybe" | "no">;
  comfort: Record<string, "comfortable" | "unsure" | "uncomfortable">;
  createdAt: number;
}

export interface Prefs {
  interestedIn: Interest;
  ageMin: number;
  ageMax: number;
  distanceKm: number;
  intents: Intent[];
}

export type LocationVisibility = "area" | "city" | "hidden";
export const LOCATION_LABEL: Record<LocationVisibility, string> = { area: "Neighbourhood", city: "City only", hidden: "Hidden" };

export interface Settings {
  /** How much of your location others see. Never your exact location. */
  locationVisibility?: LocationVisibility;
  aiHelp: boolean;
  redFlagRadar: boolean;
  conversationPulse: boolean;
  notifications: { yaarHour: boolean; reactions: boolean; messages: boolean; dateReminders: boolean };
  hideFromWork: boolean;
  hideFromCollege: boolean;
  showWorkAfterMatch: boolean;
  trustedContact?: { name: string; phone: string };
}

export interface Report { id: string; about: string; reason: string; details?: string; createdAt: number }

/** A Table (small meetup). In this prototype every Table is sample data. */
export interface TableEvent {
  id: string; title: string; circle: string; area: string;
  /** days from today; used to build a real date relative to now */
  dayOffset: number; time: string;
  seats: number; left: number; price: number; scene: string; photoQuery: string; blurb: string;
}
