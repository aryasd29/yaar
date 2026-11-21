/**
 * App configuration. Values come from environment variables so they can change
 * per deployment without touching code.
 *
 * NEXT_PUBLIC_YAAR_HOUR          e.g. "20:00" (24-hour, local time). Default 20:00.
 * NEXT_PUBLIC_SHOW_DEMO_TOOLS    "true" to show evaluator demo tools to everyone.
 *                                Otherwise they appear only after visiting any page with ?demo=1.
 */
function parseHour(v: string | undefined) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v ?? "");
  const hour = m ? Math.min(23, Math.max(0, Number(m[1]))) : 20;
  const minute = m ? Math.min(59, Math.max(0, Number(m[2]))) : 0;
  return { hour, minute };
}

export const YAAR_HOUR = parseHour(process.env.NEXT_PUBLIC_YAAR_HOUR);

/** "8 PM" or "8:30 PM" */
export function yaarHourLabel() {
  const d = new Date(2000, 0, 1, YAAR_HOUR.hour, YAAR_HOUR.minute);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: YAAR_HOUR.minute ? "2-digit" : undefined }).toUpperCase();
}

/** The next time the Tide comes in, after `now`. */
export function nextYaarHour(now: number) {
  const next = new Date(now);
  next.setHours(YAAR_HOUR.hour, YAAR_HOUR.minute, 0, 0);
  if (next.getTime() <= now) next.setDate(next.getDate() + 1);
  return next;
}

/** The most recent Tide at or before `now`. A drop belongs to the Tide that brought it. */
export function lastYaarHour(now: number) {
  const d = new Date(now);
  d.setHours(YAAR_HOUR.hour, YAAR_HOUR.minute, 0, 0);
  if (d.getTime() > now) d.setDate(d.getDate() - 1);
  return d;
}

const DEMO_KEY = "yaar-demo-tools";
/** Demo tools are for evaluators only: env flag, or opt-in per device with ?demo=1 (?demo=0 turns them off). */
export function demoToolsEnabled() {
  // The live app is a real product: no clock-moving or demo tools.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  if (process.env.NEXT_PUBLIC_SHOW_DEMO_TOOLS === "true") return true;
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search).get("demo");
    if (q === "1") localStorage.setItem(DEMO_KEY, "1");
    if (q === "0") localStorage.removeItem(DEMO_KEY);
    return localStorage.getItem(DEMO_KEY) === "1";
  } catch {
    return false;
  }
}
