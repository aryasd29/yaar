import { NextResponse } from "next/server";

/** Retired: every payment, including the ₹99 show-up promise, now goes through /api/pay. */
export async function POST() {
  return NextResponse.json({ error: "This endpoint moved to /api/pay." }, { status: 410 });
}
