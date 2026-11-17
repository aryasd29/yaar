import { NextResponse } from "next/server";

/**
 * Real photos for sample events, from Unsplash, when UNSPLASH_ACCESS_KEY is set.
 * Without a key it returns { url: null } and the app shows its own illustrations.
 * Photographer credit is returned and displayed, as Unsplash's guidelines require.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 80);
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!q || !key) return NextResponse.json({ url: null });
  try {
    const r = await fetch(`https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&content_filter=high&query=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!r.ok) return NextResponse.json({ url: null });
    const j = await r.json();
    const p = j.results?.[0];
    if (!p) return NextResponse.json({ url: null });
    return NextResponse.json(
      { url: `${p.urls.raw}&w=800&h=600&fit=crop&auto=format&q=70`, alt: p.alt_description ?? q, credit: p.user?.name, link: `${p.links?.html}?utm_source=yaar&utm_medium=referral` },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  } catch {
    return NextResponse.json({ url: null });
  }
}
