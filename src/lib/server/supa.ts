import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side helpers. The service-role key lives only in the server environment (Vercel),
 * never in the browser. Every route checks who is calling with their own sign-in token first.
 */
let admin: SupabaseClient | null = null;
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  admin ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

/** The signed-in member making this request, from their Supabase access token. */
export async function caller(req: Request) {
  const a = adminClient();
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!a || !token) return null;
  const { data } = await a.auth.getUser(token);
  return data.user ?? null;
}

/** Postgres error text without the noise, for showing to people. */
export const dbError = (e: { message?: string } | null | undefined, fallback = "Something went wrong. Please try again.") =>
  (e?.message ?? "").replace(/^.*?ERROR:\s*/, "").split("\n")[0] || fallback;
