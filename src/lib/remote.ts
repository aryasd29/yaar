"use client";
/**
 * Supabase backend.
 *
 * - If NEXT_PUBLIC_SUPABASE_URL and a key are set, Isle runs "live": real accounts, real
 *   reactions, matches, chat and shared date plans, with live updates.
 * - If they aren't set, everything runs on this device only (demo mode), exactly as before.
 *
 * Sample people (ids starting "u_") always stay on this device. They fill each drop so the app
 * never feels empty, and they are clearly labelled. Anything involving a real person goes to
 * the database.
 */
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { DatePlan, Match, Message, PlusState, Prefs, Profile, Reaction, ReactTarget, Settings } from "./types";
import { useYaar } from "./store";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supa: SupabaseClient | null = URL_ && KEY ? createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
export const LIVE = !!supa;
export const isSample = (id: string | undefined) => !id || id.startsWith("u_") || id === "me";
export const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

/* ---------------- shapes ---------------- */
type ProfileRow = { id: string; data: Omit<Profile, "id">; updated_at: string };
type ReactionRow = { id: string; from_id: string; to_id: string; target: ReactTarget; note: string; status: Reaction["status"]; created_at: string };
type MatchRow = { id: string; user_a: string; user_b: string; created_at: string; last_activity_at: string; status: Match["status"]; ended_by: string | null; end_reason: string | null };
type MessageRow = { id: string; match_id: string; from_id: string | null; body: string; kind: Message["kind"]; meta: Record<string, unknown> | null; created_at: string };
type PlanRow = { id: string; match_id: string; data: Omit<DatePlan, "id" | "matchId">; updated_at: string };

const ts = (s: string) => new Date(s).getTime();
const iso = (n: number) => new Date(n).toISOString();

function publicData(p: Profile): Omit<Profile, "id"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, work, college, demo, ...rest } = p;
  return rest;
}
const toProfile = (r: ProfileRow): Profile => ({ ...r.data, id: r.id });
const toReaction = (r: ReactionRow): Reaction => ({ id: r.id, from: r.from_id, to: r.to_id, target: r.target, note: r.note, status: r.status, createdAt: ts(r.created_at) });
const toMatch = (r: MatchRow, me: string): Match => ({
  id: r.id, users: [me, r.user_a === me ? r.user_b : r.user_a], createdAt: ts(r.created_at), lastActivityAt: ts(r.last_activity_at),
  status: r.status, endedBy: r.ended_by ?? undefined, endReason: r.end_reason ?? undefined,
});
const toMessage = (r: MessageRow): Message => ({ id: r.id, matchId: r.match_id, from: r.from_id ?? "yaar", body: r.body, kind: r.kind, createdAt: ts(r.created_at), meta: r.meta ?? undefined });
const toPlan = (r: PlanRow): DatePlan => ({ ...r.data, id: r.id, matchId: r.match_id });

/* ---------------- merging into the local store ---------------- */
const byId = <T extends { id: string }>(list: T[], items: T[]) => {
  const map = new Map(list.map((x) => [x.id, x]));
  for (const i of items) map.set(i.id, { ...map.get(i.id), ...i });
  return [...map.values()];
};

/** Both people edit the same plan; keep each person's own answers when merging. */
function mergePlan(a: DatePlan | undefined, b: DatePlan): DatePlan {
  if (!a) return b;
  return {
    ...a, ...b,
    picks: { ...a.picks, ...b.picks },
    deposit: { ...a.deposit, ...b.deposit },
    depositPayment: { ...(a.depositPayment ?? {}), ...(b.depositPayment ?? {}) },
    checkins: { ...a.checkins, ...b.checkins },
    feedback: { ...a.feedback, ...b.feedback },
    comfort: { ...a.comfort, ...b.comfort },
  };
}

const myId = () => useYaar.getState().me?.id;

function upsertPeople(ps: Profile[]) {
  const me = myId();
  const real = ps.filter((p) => p.id !== me);
  if (!real.length) return;
  useYaar.setState((s) => ({ people: byId(s.people, real) }));
  injectRealIntoDrop();
}

/** Real people who joined after today's drop was made still get introduced today, ahead of sample people. */
function injectRealIntoDrop() {
  const s = useYaar.getState();
  if (!s.me || !s.drop.day || s.me.battery === "low") return;
  const engaged = new Set([...s.passes, ...s.blocks, ...s.matches.flatMap((m) => m.users), ...s.reactions.filter((r) => r.from === s.me!.id).map((r) => r.to), ...s.drop.ids]);
  const fresh = s.people.filter((p) => !isSample(p.id) && p.id !== s.me!.id && !engaged.has(p.id) && s.eligibleFor(p));
  if (!fresh.length) return;
  useYaar.setState({ drop: { ...s.drop, ids: [...fresh.slice(0, 3).map((p) => p.id), ...s.drop.ids] } });
}

function addMatch(row: MatchRow, celebrate: boolean) {
  const me = myId();
  if (!me) return;
  const m = toMatch(row, me);
  const s = useYaar.getState();
  const isNew = !s.matches.some((x) => x.id === m.id);
  useYaar.setState((st) => ({
    matches: byId(st.matches, [m]),
    reactions: st.reactions.map((r) => ((r.from === m.users[1] && r.to === me) || (r.from === me && r.to === m.users[1]) ? { ...r, status: "matched" } : r)),
    ...(celebrate && isNew && m.status === "active" && Date.now() - m.createdAt < 60_000 ? { celebrate: m.id } : {}),
  }));
  if (isNew) { void loadMessages([m.id]); track("match_created"); }
}

/* ---------------- loading ---------------- */
/** Loads profiles you're allowed to see (connected people), skipping ones already on this device. */
async function fetchProfiles(ids: string[]) {
  if (!supa) return;
  const have = new Set(useYaar.getState().people.map((p) => p.id));
  const need = ids.filter((id) => !isSample(id) && !have.has(id));
  if (!need.length) return;
  const { data } = await supa.from("profiles").select("*").in("id", need);
  if (data) upsertPeople((data as ProfileRow[]).map(toProfile));
}

async function loadMessages(matchIds: string[]) {
  if (!supa || !matchIds.length) return;
  const { data } = await supa.from("messages").select("*").in("match_id", matchIds).order("created_at").limit(2000);
  if (data) useYaar.setState((s) => ({ messages: byId(s.messages, (data as MessageRow[]).map(toMessage)) }));
}

export async function loadEverything() {
  if (!supa) return;
  const me = myId();
  if (!me || isSample(me)) return;
  const [intros, reactions, matches, passes, susp] = await Promise.all([
    supa.rpc("discover", { max_count: 12 }),
    supa.from("reactions").select("*").or(`from_id.eq.${me},to_id.eq.${me}`),
    supa.from("matches").select("*"),
    supa.from("passes").select("passed"),
    supa.from("suspensions").select("user_id").eq("user_id", me).maybeSingle(),
  ]);
  if (susp.data) useYaar.setState({ suspended: true });
  if (passes.data) useYaar.setState((s) => ({ passes: [...new Set([...s.passes, ...(passes.data as { passed: string }[]).map((x) => x.passed)])] }));
  // Profiles of people you're connected with (reacted or matched) are readable; everyone else only via discover().
  const connected = new Set<string>([
    ...((reactions.data ?? []) as ReactionRow[]).flatMap((r) => [r.from_id, r.to_id]),
    ...((matches.data ?? []) as MatchRow[]).flatMap((m) => [m.user_a, m.user_b]),
  ]);
  connected.delete(me);
  await fetchProfiles([...connected]);
  if (intros.data) upsertPeople((intros.data as ProfileRow[]).map(toProfile));
  if (reactions.data) useYaar.setState((s) => ({ reactions: byId(s.reactions, (reactions.data as ReactionRow[]).map(toReaction)) }));
  if (matches.data) {
    const ms = (matches.data as MatchRow[]).map((r) => toMatch(r, me));
    useYaar.setState((s) => ({ matches: byId(s.matches, ms) }));
    await loadMessages(ms.map((m) => m.id));
    if (ms.length) {
      const { data } = await supa.from("plans").select("*").in("match_id", ms.map((m) => m.id));
      if (data) receivePlans((data as PlanRow[]).map(toPlan));
    }
  }
  injectRealIntoDrop();
}

/* ---------------- shared date plans ---------------- */
const synced = new Map<string, string>();
const realPlan = (p: DatePlan) => {
  const m = useYaar.getState().matches.find((x) => x.id === p.matchId);
  return !!m && !isSample(m.users[1]);
};
let unsubPlans: (() => void) | null = null;
/** Whenever a plan with a real person changes on this device, save it (but don't echo back what we just received). */
function watchPlans() {
  if (unsubPlans) return;
  unsubPlans = useYaar.subscribe((s, prev) => {
    if (s.plans === prev.plans) return;
    for (const p of s.plans) {
      if (!realPlan(p)) continue;
      const json = JSON.stringify(p);
      if (synced.get(p.id) === json) continue;
      synced.set(p.id, json);
      void pushPlan(p);
    }
  });
}
function receivePlans(ps: DatePlan[]) {
  useYaar.setState((s) => {
    let plans = s.plans;
    for (const p of ps) {
      const merged = mergePlan(plans.find((x) => x.id === p.id), p);
      synced.set(p.id, JSON.stringify(merged));
      plans = plans.some((x) => x.id === p.id) ? plans.map((x) => (x.id === p.id ? merged : x)) : [...plans, merged];
    }
    return { plans };
  });
}

/* ---------------- live updates ---------------- */
let channel: RealtimeChannel | null = null;
export function startLive() {
  if (!supa || channel) return;
  const me = myId();
  if (!me || isSample(me)) return;
  watchPlans();
  channel = supa
    .channel(`yaar-${me}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (e) => { if (e.new && "id" in e.new) upsertPeople([toProfile(e.new as ProfileRow)]); })
    .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, (e) => {
      const r = e.new as ReactionRow;
      if (!r?.id || (r.to_id !== me && r.from_id !== me)) return;
      void fetchProfiles([r.from_id === me ? r.to_id : r.from_id]).then(() => useYaar.setState((s) => ({ reactions: byId(s.reactions, [toReaction(r)]) })));
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, (e) => {
      const r = e.new as MatchRow;
      if (r?.id && (r.user_a === me || r.user_b === me)) void fetchProfiles([r.user_a === me ? r.user_b : r.user_a]).then(() => addMatch(r, e.eventType === "INSERT"));
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (e) => {
      const r = e.new as MessageRow;
      if (!r?.id || !useYaar.getState().matches.some((m) => m.id === r.match_id)) return;
      const msg = toMessage(r);
      useYaar.setState((s) => ({ messages: byId(s.messages, [msg]), matches: s.matches.map((m) => (m.id === msg.matchId ? { ...m, lastActivityAt: Math.max(m.lastActivityAt, msg.createdAt) } : m)) }));
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "plans" }, (e) => {
      const r = e.new as PlanRow;
      if (r?.id) receivePlans([toPlan(r)]);
    })
    .subscribe();
}
export function stopLive() { if (channel && supa) void supa.removeChannel(channel); channel = null; unsubPlans?.(); unsubPlans = null; synced.clear(); }

/* ---------------- writes ---------------- */
const warn = (what: string, error: { message: string } | null) => {
  if (!error) return;
  console.error(what, error);
  const f = friendly(error.message);
  useYaar.getState().toast(f !== error.message ? f : `Couldn't ${what}. Check your connection and try again.`, "warn");
};

/** Moves photos and voice notes out of the profile record into Supabase Storage, keeping only links. */
async function uploadMedia() {
  const s = useYaar.getState();
  const me = s.me;
  if (!supa || !me || isSample(me.id)) return;
  const toBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob();
  const put = async (path: string, dataUrl: string) => {
    const blob = await toBlob(dataUrl);
    const { error } = await supa!.storage.from("media").upload(path, blob, { upsert: true, contentType: blob.type || undefined, cacheControl: "31536000" });
    if (error) { console.error("upload", error); return null; }
    return supa!.storage.from("media").getPublicUrl(path).data.publicUrl;
  };
  let changed = false;
  const moments = await Promise.all(me.moments.map(async (m) => {
    if (!m.photoUrl?.startsWith("data:")) return m;
    const url = await put(`${me.id}/${m.id}-${Date.now()}.jpg`, m.photoUrl);
    if (!url) return m;
    changed = true;
    return { ...m, photoUrl: url };
  }));
  let voice = me.voice;
  if (voice?.audioUrl?.startsWith("data:")) {
    const ext = voice.audioUrl.slice(5, voice.audioUrl.indexOf(";")).split("/")[1]?.split(";")[0] || "webm";
    const url = await put(`${me.id}/voice-${Date.now()}.${ext}`, voice.audioUrl);
    if (url) { voice = { ...voice, audioUrl: url }; changed = true; }
  }
  if (changed) useYaar.setState((st) => (st.me ? { me: { ...st.me, moments, voice } } : {}));
}

/* ---------------- funnel events (north-star: verified first dates) ---------------- */
export type FunnelEvent = "signup_completed" | "reaction_sent" | "match_created" | "first_message" | "date_confirmed" | "date_attended" | "feedback_given" | "plus_started" | "seat_booked" | "bundle_bought";
export function track(name: FunnelEvent, props?: Record<string, unknown>) {
  const me = myId();
  if (!supa || !me || isSample(me)) return;
  void supa.from("events").insert({ user_id: me, name, props: props ?? null }).then(({ error }) => { if (error) console.warn("track", error.message); });
}

let profileTimer: ReturnType<typeof setTimeout> | undefined;
/** Saves your scrapbook. Work and college go to a separate, owner-only table. */
export function pushProfile(immediate = false) {
  if (!supa) return;
  clearTimeout(profileTimer);
  const run = async () => {
    await uploadMedia();
    const s = useYaar.getState();
    if (!s.me || isSample(s.me.id)) return;
    const { error } = await supa!.from("profiles").upsert({ id: s.me.id, data: publicData(s.me), updated_at: new Date().toISOString() });
    warn("save your profile", error);
    const { error: e2 } = await supa!.from("private_details").upsert({ id: s.me.id, data: { work: s.me.work ?? null, college: s.me.college ?? null, prefs: s.prefs, settings: s.settings, plus: s.plus } });
    warn("save your private details", e2);
  };
  if (immediate) return run();
  profileTimer = setTimeout(run, 700);
}

export async function sendReaction(r: Reaction) {
  if (!supa) return;
  const { error } = await supa.from("reactions").insert({ id: r.id, from_id: r.from, to_id: r.to, target: r.target, note: r.note });
  if (error) { useYaar.setState((s) => ({ reactions: s.reactions.filter((x) => x.id !== r.id) })); return warn("send your reaction", error); }
  track("reaction_sent", { kind: r.target.kind });
  // If they had already reacted to you, the database just opened a match.
  const [a, b] = [r.from, r.to].sort();
  const { data } = await supa.from("matches").select("*").eq("user_a", a).eq("user_b", b).maybeSingle();
  if (data) { addMatch(data as MatchRow, true); void notify("match", (data as MatchRow).id); }
  else useYaar.getState().toast("Reaction sent. If they react back, you'll match.", "good");
}

export async function passReaction(fromId: string) {
  const me = myId();
  if (!supa || !me) return;
  await Promise.all([
    supa.from("reactions").update({ status: "passed" }).eq("from_id", fromId).eq("to_id", me),
    supa.from("passes").upsert({ user_id: me, passed: fromId }),
  ]);
}

export async function sendMessage(m: Message) {
  if (!supa) return;
  const mine = useYaar.getState().messages.filter((x) => x.matchId === m.matchId && x.from === m.from && x.kind === "text" && !x.meta?.reaction);
  if (m.kind === "text" && mine.length === 0) track("first_message");
  const { error } = await supa.from("messages").insert({ id: m.id, match_id: m.matchId, from_id: m.from === "yaar" ? null : m.from, body: m.body, kind: m.kind, meta: m.meta ?? null, created_at: iso(m.createdAt) });
  if (error) { useYaar.setState((s) => ({ messages: s.messages.filter((x) => x.id !== m.id) })); warn("send that message", error); }
}

/** Resets a match's quiet-days clock (Spark again, Freeze my matches). */
export async function touchMatch(matchId: string) {
  if (!supa) return;
  await supa.from("matches").update({ last_activity_at: new Date().toISOString(), status: "active" }).eq("id", matchId);
}

/** Undo "Not for me" (Rewind). */
export async function unpass(id: string) {
  const me = myId();
  if (!supa || !me) return;
  await Promise.all([
    supa.from("passes").delete().eq("user_id", me).eq("passed", id),
    supa.from("reactions").update({ status: "pending" }).eq("from_id", id).eq("to_id", me).eq("status", "passed"),
  ]);
}

export async function endMatch(matchId: string, reason: string) {
  const me = myId();
  if (!supa || !me) return;
  warn("close the match", (await supa.from("matches").update({ status: "ended", ended_by: me, end_reason: reason }).eq("id", matchId)).error);
}

export async function blockUser(id: string) {
  const me = myId();
  if (!supa || !me) return;
  warn("block them", (await supa.from("blocks").upsert({ blocker: me, blocked: id })).error);
}

export async function reportUser(id: string, reason: string, details?: string) {
  const me = myId();
  if (!supa || !me) return;
  warn("send your report", (await supa.from("reports").insert({ reporter: me, reported: id, reason, details: details ?? null })).error);
}

export async function pushPlan(p: DatePlan) {
  if (!supa) return;
  // Read-merge-write so the other person's answers aren't overwritten.
  const { data } = await supa.from("plans").select("*").eq("id", p.id).maybeSingle();
  const merged = data ? mergePlan(toPlan(data as PlanRow), p) : p;
  const { id, matchId, ...rest } = merged;
  warn("save the date plan", (await supa.from("plans").upsert({ id, match_id: matchId, data: rest, updated_at: new Date().toISOString() })).error);
}

/* ---------------- accounts ---------------- */
export type AuthResult = { ok: true; userId: string } | { ok: false; error: string; needsConfirm?: boolean };

function friendly(m: string): string {
  return friendlyInner(m);
}
const friendlyInner = (m: string) =>
  /limit: reactions/i.test(m) ? "You've sent a lot of reactions today. Take a breather and try again tomorrow." :
  /limit: messages/i.test(m) ? "That's a lot of messages very quickly. Give it a minute and try again." :
  /suspended/i.test(m) ? "Your account is suspended while we review a report. You can't send messages or reactions right now." :
  /fetch|network|load failed/i.test(m) ? "Couldn't reach Isle right now. Check your internet connection and try again." :
  /invalid login/i.test(m) ? "That email and password don't match. Check them, or create an account." :
  /already registered|already exists/i.test(m) ? "There's already an account with this email. Sign in instead." :
  /password/i.test(m) && /6|short|weak/i.test(m) ? "Use a password with at least 6 characters." :
  /phone.*(provider|disabled)|sms/i.test(m) ? "Phone sign-in isn't switched on yet. Please use email for now." :
  /rate|too many/i.test(m) ? "Too many tries. Wait a minute and try again." :
  /token.*(expired|invalid)|otp/i.test(m) ? "That code didn't work. Check it, or send a new one." : m;

export async function emailAuth(mode: "signup" | "signin", email: string, password: string): Promise<AuthResult> {
  if (!supa) return { ok: false, error: "Accounts aren't connected yet." };
  const res = mode === "signup" ? await supa.auth.signUp({ email, password }) : await supa.auth.signInWithPassword({ email, password });
  if (res.error) return { ok: false, error: friendly(res.error.message) };
  if (!res.data.session) return { ok: false, needsConfirm: true, error: "We've sent you a confirmation email. Open the link in it, then sign in here." };
  return { ok: true, userId: res.data.session.user.id };
}

export async function sendPasswordReset(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supa) return { ok: false, error: "Accounts aren't connected yet." };
  const { error } = await supa.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset` });
  return error ? { ok: false, error: friendly(error.message) } : { ok: true };
}

export async function setNewPassword(password: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  if (!supa) return { ok: false, error: "Accounts aren't connected yet." };
  const { data, error } = await supa.auth.updateUser({ password });
  if (error || !data.user) return { ok: false, error: friendly(error?.message ?? "That didn't work. Open the link from your email again.") };
  return { ok: true, userId: data.user.id };
}

export async function phoneSendCode(phone: string): Promise<AuthResult | { ok: true; userId: "" }> {
  if (!supa) return { ok: false, error: "Accounts aren't connected yet." };
  const { error } = await supa.auth.signInWithOtp({ phone });
  return error ? { ok: false, error: friendly(error.message) } : { ok: true, userId: "" };
}

export async function phoneVerify(phone: string, token: string): Promise<AuthResult> {
  if (!supa) return { ok: false, error: "Accounts aren't connected yet." };
  const { data, error } = await supa.auth.verifyOtp({ phone, token, type: "sms" });
  if (error || !data.session) return { ok: false, error: friendly(error?.message ?? "That code didn't work.") };
  return { ok: true, userId: data.session.user.id };
}

/** After signing in: if this account already has a scrapbook, load it (and its world) onto this device. */
export async function loadAccount(userId: string): Promise<"loaded" | "new"> {
  if (!supa) return "new";
  const [{ data: prof }, { data: priv }] = await Promise.all([
    supa.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supa.from("private_details").select("*").eq("id", userId).maybeSingle(),
  ]);
  if (!prof) return "new";
  const pd = (priv?.data ?? {}) as { work?: string | null; college?: string | null; prefs?: Prefs; settings?: Settings; plus?: PlusState | null };
  const me: Profile = { ...toProfile(prof as ProfileRow), work: pd.work ?? undefined, college: pd.college ?? undefined };
  const st = useYaar.getState();
  st.completeOnboarding(me, pd.prefs ?? st.prefs, { fromServer: true });
  if (pd.settings) st.setSettings(pd.settings);
  if (pd.plus) useYaar.setState({ plus: pd.plus });
  await loadEverything();
  startLive();
  return "loaded";
}

export async function signOutEverywhere() {
  stopLive();
  if (supa) await supa.auth.signOut();
}

/** Keeps this device in step with the signed-in account (runs once per page load). */
let booted = false;
export async function bootAuth() {
  if (!supa || booted) return;
  booted = true;
  const { data } = await supa.auth.getSession();
  const session = data.session;
  const s = useYaar.getState();
  if (!session) {
    if (s.me && !isSample(s.me.id)) s.resetDemo();
    else if (s.authed) useYaar.setState({ authed: false });
    return;
  }
  const uid = session.user.id;
  if (s.me && s.me.id !== uid) s.resetDemo();
  if (useYaar.getState().me?.id === uid) {
    useYaar.setState({ authed: true });
    await pushProfile(true); // self-healing: makes sure the server always has your latest scrapbook
    await loadEverything();
    startLive();
  } else {
    useYaar.setState({ authed: true });
    await loadAccount(uid);
  }
  supa.auth.onAuthStateChange((event) => { if (event === "SIGNED_OUT") { stopLive(); useYaar.getState().resetDemo(); } });
}

/** Permanently deletes your account: login, scrapbook, private details, reactions, matches and messages. */
export async function deleteMyData(): Promise<{ ok: boolean; error?: string }> {
  const me = myId();
  if (!supa || !me || isSample(me)) return { ok: true };
  const { error } = await supa.rpc("delete_my_account");
  if (error) {
    // Older databases without the function: remove what we can directly.
    const results = await Promise.all([
      supa.from("reactions").delete().eq("from_id", me),
      supa.from("blocks").delete().eq("blocker", me),
      supa.from("private_details").delete().eq("id", me),
      supa.from("profiles").delete().eq("id", me),
    ]);
    const failed = results.find((r) => r.error);
    if (failed) return { ok: false, error: "We couldn't delete your account. Check your connection and try again." };
  }
  stopLive();
  await supa.auth.signOut();
  return { ok: true };
}

/* ---------------- admin ---------------- */
export async function amAdmin() {
  const me = myId();
  if (!supa || !me || isSample(me)) return false;
  const { data } = await supa.from("admins").select("user_id").eq("user_id", me).maybeSingle();
  return !!data;
}

/* ---------------- email notifications (only if the server has email keys) ---------------- */
export async function notify(type: "match" | "date", matchId: string) {
  if (!supa) return;
  const { data } = await supa.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  void fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ type, matchId }) }).catch(() => {});
}

/* ---------------- the ₹99 show-up promise ---------------- */
type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global { interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void } } }

/**
 * Takes the ₹99 deposit. With Razorpay keys on the server it opens Razorpay Checkout (use test keys:
 * no real money moves). Without keys it returns "demo" and the app records a test-mode deposit.
 */
export async function payDeposit(planId: string, who: { name: string; email?: string }): Promise<{ status: "paid"; paymentId: string } | { status: "demo" } | { status: "cancelled" } | { status: "error"; error: string }> {
  try {
    const r = await fetch("/api/deposit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "order", planId }) });
    const j = await r.json();
    if (j.mode === "demo") return { status: "demo" };
    if (!r.ok) return { status: "error", error: j.error ?? "Couldn't start the payment." };
    if (!window.Razorpay) {
      await new Promise<void>((res, rej) => { const sc = document.createElement("script"); sc.src = "https://checkout.razorpay.com/v1/checkout.js"; sc.onload = () => res(); sc.onerror = () => rej(new Error("load")); document.body.appendChild(sc); });
    }
    return await new Promise((resolve) => {
      const rz = new window.Razorpay!({
        key: j.keyId, order_id: j.orderId, amount: j.amount, currency: "INR", name: "Isle", description: "Show-up promise (refunded when you both turn up)",
        prefill: { name: who.name, email: who.email }, theme: { color: "#FF7A5C" },
        handler: async (resp: RazorpayResponse) => {
          const v = await fetch("/api/deposit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature }) }).then((x) => x.json());
          resolve(v.ok ? { status: "paid", paymentId: resp.razorpay_payment_id } : { status: "error", error: "We couldn't confirm that payment." });
        },
        modal: { ondismiss: () => resolve({ status: "cancelled" }) },
      });
      rz.open();
    });
  } catch {
    return { status: "error", error: "Couldn't reach the payment service. Check your connection." };
  }
}
