"use client";
/**
 * The live app's server features: Isle Plus and credit, real Tables, date check-in and settlement,
 * live location sharing, web push and the selfie check. Everything here talks to Supabase or Isle's
 * own server routes; nothing is simulated. In the offline demo (no Supabase) these are never called.
 */
import { supa, api, isSample } from "./remote";
import { useYaar } from "./store";
import type { PlusState, Profile, TableEvent } from "./types";

const me = () => useYaar.getState().me?.id;
const live = () => !!supa && !!me() && !isSample(me());

/* ---------------- Isle Plus and credit ---------------- */
type MembershipRow = { plan: PlusState["plan"]; since: string; until: string; auto_renew: boolean; free_seat_months: string[]; freeze_until: string | null; sparked: string[]; second_tide_day: string | null; last_payment: string | null };

export async function loadCommerce() {
  if (!live()) return;
  const [m, c] = await Promise.all([
    supa!.from("memberships").select("*").eq("user_id", me()!).maybeSingle(),
    supa!.rpc("credit_balance"),
  ]);
  const r = m.data as MembershipRow | null;
  const plus: PlusState | null = r ? {
    plan: r.plan, since: Date.parse(r.since), until: Date.parse(r.until), autoRenew: r.auto_renew, paymentId: r.last_payment ?? undefined,
    freeSeatsUsed: r.free_seat_months ?? [], freezeUntil: r.freeze_until ? Date.parse(r.freeze_until) : undefined,
    sparked: r.sparked ?? [], secondTideDay: r.second_tide_day ?? undefined,
  } : null;
  useYaar.setState({ plus, credit: typeof c.data === "number" ? c.data : 0 });
}

export async function setAutoRenew(on: boolean) {
  const { error } = await supa!.rpc("plus_set_auto_renew", { on_: on });
  await loadCommerce();
  return !error;
}

export async function freeze(days: number) {
  const { error } = await supa!.rpc("plus_freeze", { days });
  await Promise.all([loadCommerce(), reloadMatches()]);
  return error ? error.message : null;
}

export async function sparkAgain(matchId: string) {
  const { data, error } = await supa!.rpc("spark_again", { m: matchId });
  await Promise.all([loadCommerce(), reloadMatches()]);
  return !error && data === true;
}

async function reloadMatches() {
  const { data } = await supa!.from("matches").select("id, frozen_until, last_activity_at");
  if (!data) return;
  const rows = data as { id: string; frozen_until: string | null; last_activity_at: string }[];
  useYaar.setState((s) => ({ matches: s.matches.map((m) => { const r = rows.find((x) => x.id === m.id); return r ? { ...m, frozenUntil: r.frozen_until ? Date.parse(r.frozen_until) : undefined, lastActivityAt: Date.parse(r.last_activity_at) } : m; }) }));
}

/** Isle Plus: a few more introductions after 10 PM, once a day. Returns how many arrived. */
export async function secondTide(already: string[]) {
  const { data, error } = await supa!.rpc("second_tide", { already });
  if (error || !data) return 0;
  const people = (data as { id: string; data: Omit<Profile, "id"> }[]).map((r) => ({ ...r.data, id: r.id }) as Profile);
  if (!people.length) { await loadCommerce(); return 0; }
  useYaar.setState((s) => ({
    people: [...s.people.filter((p) => !people.some((n) => n.id === p.id)), ...people],
    drop: { ...s.drop, ids: [...s.drop.ids, ...people.map((p) => p.id).filter((id) => !s.drop.ids.includes(id))] },
  }));
  await loadCommerce();
  return people.length;
}

/* ---------------- Tables ---------------- */
type TableRow = { id: string; host: string; host_name: string | null; title: string; blurb: string; circle: string; area: string; scene: string; starts_at: string; seats: number; price: number; status: string; taken: number; going: boolean; hosting: boolean };

const toTable = (r: TableRow): TableEvent => ({
  id: r.id, title: r.title, circle: r.circle, area: r.area, dayOffset: 0, time: "", seats: r.seats, left: Math.max(0, r.seats - r.taken),
  price: r.price, scene: r.scene, photoQuery: `${r.scene} ${r.circle}`, blurb: r.blurb, startsAt: Date.parse(r.starts_at), live: true,
  host: r.host, hostName: r.host_name ?? "A member", hosting: r.hosting, going: r.going, cancelled: r.status === "cancelled",
});

export async function loadTables() {
  if (!live()) return;
  const { data } = await supa!.rpc("tables_list");
  if (data) useYaar.setState({ liveTables: (data as TableRow[]).map(toTable), tablesLoaded: true });
}

export type TablePerson = { user_id: string; name: string; photo: string | null; scene: string | null; is_host: boolean };
export async function tableDetails(id: string) {
  const [people, place] = await Promise.all([
    supa!.rpc("table_people", { t: id }),
    supa!.from("table_places").select("place").eq("table_id", id).maybeSingle(),
  ]);
  return { people: (people.data ?? []) as TablePerson[], place: (place.data as { place: string } | null)?.place ?? null };
}

export type NewTable = { title: string; blurb: string; circle: string; area: string; place: string; scene: string; startsAt: Date; seats: number; price: number };
export async function createTable(t: NewTable): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supa!.from("tables").insert({
    host: me(), title: t.title.trim(), blurb: t.blurb.trim(), circle: t.circle, area: t.area.trim(), scene: t.scene,
    starts_at: t.startsAt.toISOString(), seats: t.seats, price: t.price,
  }).select("id").single();
  if (error) return { error: /row-level security/.test(error.message) ? "Only members who've passed the selfie check can host a Table." : error.message };
  const id = (data as { id: string }).id;
  const p = await supa!.from("table_places").insert({ table_id: id, place: t.place.trim() });
  if (p.error) return { id, error: p.error.message };
  await loadTables();
  return { id };
}

export async function joinFreeTable(id: string) {
  const { error } = await supa!.rpc("join_free_table", { t: id });
  await loadTables();
  return error ? error.message : null;
}

/** Leave a Table. Goes through the server so paid seats are refunded and Plus seats come back. */
export async function leaveTable(id: string) {
  const r = await api<{ refund?: number }>("/api/pay", { action: "cancelSeat", tableId: id });
  await Promise.all([loadTables(), loadCommerce()]);
  return r;
}

export async function cancelTable(id: string) {
  const r = await api<{ refunded?: number }>("/api/pay", { action: "cancelTable", tableId: id });
  await loadTables();
  return r;
}

/* ---------------- dates: promise, bundles, check-in ---------------- */
export type DateExtras = {
  deposits: { user_id: string; status: string }[];
  bundles: { user_id: string; code: string; price: number; status: string }[];
  checkins: string[];
};
export async function dateExtras(planId: string): Promise<DateExtras> {
  const [d, b, c] = await Promise.all([
    supa!.from("deposits").select("user_id, status").eq("plan_id", planId),
    supa!.from("bundles").select("user_id, code, price, status").eq("plan_id", planId),
    supa!.from("checkins").select("user_id").eq("plan_id", planId),
  ]);
  return { deposits: (d.data ?? []) as DateExtras["deposits"], bundles: (b.data ?? []) as DateExtras["bundles"], checkins: ((c.data ?? []) as { user_id: string }[]).map((x) => x.user_id) };
}

export async function myCheckinCode(planId: string) {
  const { data } = await supa!.rpc("my_checkin_code", { p: planId });
  return (data as string | null) ?? null;
}

export async function checkIn(planId: string, code: string) {
  const { data, error } = await supa!.rpc("check_in", { p: planId, their_code: code });
  if (error) return "error";
  return data as "ok" | "wrong_code" | "too_early" | "too_late" | "no_time";
}

/** Settle the show-up promise once the date is over (safe to call many times). */
export async function settleDate(planId: string) {
  const r = await api<{ settled?: number }>("/api/pay", { action: "settle", planId });
  if (!r.error && r.settled) await loadCommerce();
  return r;
}

/* ---------------- live location for a trusted contact ---------------- */
let watch: number | null = null;
export async function startLocationShare(planId: string): Promise<{ url?: string; error?: string }> {
  if (!("geolocation" in navigator)) return { error: "This browser can't share location." };
  const { data, error } = await supa!.from("location_shares").insert({ user_id: me(), plan_id: planId }).select("token").single();
  if (error) return { error: error.message };
  const token = (data as { token: string }).token;
  const push = (pos: GeolocationPosition) => void supa!.from("location_shares").update({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, updated_at: new Date().toISOString() }).eq("token", token);
  return await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition((pos) => {
      push(pos);
      if (watch !== null) navigator.geolocation.clearWatch(watch);
      watch = navigator.geolocation.watchPosition(push, () => {}, { enableHighAccuracy: true, maximumAge: 30_000 });
      try { localStorage.setItem(`isle-share-${planId}`, token); } catch { /* ignore */ }
      resolve({ url: `${location.origin}/s/${token}` });
    }, () => resolve({ error: "Location permission is off. Allow it in your browser settings to share." }), { enableHighAccuracy: true, timeout: 15_000 });
  });
}

export function sharingNow(planId: string) {
  try { return !!localStorage.getItem(`isle-share-${planId}`); } catch { return false; }
}

export async function stopLocationShare(planId: string) {
  if (watch !== null) navigator.geolocation.clearWatch(watch);
  watch = null;
  let token: string | null = null;
  try { token = localStorage.getItem(`isle-share-${planId}`); localStorage.removeItem(`isle-share-${planId}`); } catch { /* ignore */ }
  if (token) await supa!.from("location_shares").update({ stopped: true }).eq("token", token);
}

/* ---------------- web push ---------------- */
const b64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(raw, (c) => c.charCodeAt(0)); };
export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export async function enablePush(): Promise<string | null> {
  if (!pushSupported()) return "Push notifications aren't available in this browser. On iPhone, add Isle to your Home Screen first.";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "Notifications are blocked. You can allow them in your browser settings.";
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) }));
  const j = sub.toJSON();
  const { error } = await supa!.from("push_subscriptions").upsert({ endpoint: j.endpoint, user_id: me(), keys: j.keys });
  return error ? error.message : null;
}

export async function pushEnabled() {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) { await supa!.from("push_subscriptions").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); }
}

/* ---------------- selfie check ---------------- */
export async function submitSelfie(jpeg: Blob, liveness: { turned: boolean; smiled: boolean; frames: number }, score: number) {
  const path = `${me()}/selfie-${Date.now()}.jpg`;
  const up = await supa!.storage.from("selfies").upload(path, jpeg, { contentType: "image/jpeg", upsert: true });
  if (up.error) return { ok: false, error: up.error.message };
  const { data, error } = await supa!.rpc("submit_verification", { selfie_path: path, liveness, match_score: score });
  if (error) return { ok: false, error: error.message };
  if (data === true) {
    const { data: p } = await supa!.from("profiles").select("data").eq("id", me()!).maybeSingle();
    const verified = !!(p as { data?: { verified?: boolean } } | null)?.data?.verified;
    useYaar.setState((s) => (s.me ? { me: { ...s.me, verified } } : {}));
  }
  return { ok: data === true };
}
