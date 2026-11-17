import { NextResponse } from "next/server";

/**
 * Help Me Reply. Uses an LLM only when GROQ_API_KEY or GEMINI_API_KEY is set on the server.
 * Otherwise returns { source: "fallback" } and the client uses its rule-based suggestions.
 * Only the last few messages and public scrapbook fields are sent, and nothing is stored.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { situation, history, them, style } = body as {
    situation: string; history: { me: boolean; text: string }[]; them: { name: string; starterPack: string[]; hotTake: string; captions: string[] };
    style: { lower: boolean; emoji: boolean; short: boolean };
  };

  const system = `You help someone reply in a dating-app chat. Write exactly 3 short replies (tones: Playful, Casual, Thoughtful) that sound like a real 20-something Indian texting a match, not like an AI.
Rules: no "I'd love to", no "That sounds amazing", no em dashes, no flowery language, max 20 words each. ${style.lower ? "Write in lowercase like the user does." : ""} ${style.emoji ? "One emoji is fine in the Playful reply." : "No emoji."}
Never pressure, guilt or manipulate. Never invent facts about the user. If asked to ask them out, keep it easy to say no to.
Return JSON only: {"suggestions":[{"tone":"Playful","text":"...","why":"one short reason"},...]}`;
  const user = `Situation: ${situation}. Their scrapbook: starter pack ${them.starterPack.join(", ")}; hot take "${them.hotTake}"; photo captions ${them.captions.map((c) => `"${c}"`).join(", ")}.
Recent chat (oldest first):\n${history.slice(-8).map((m) => `${m.me ? "Me" : them.name}: ${m.text}`).join("\n")}`;

  try {
    if (process.env.GROQ_API_KEY) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({ model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant", temperature: 0.9, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      });
      const j = await r.json();
      const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
      if (Array.isArray(parsed.suggestions)) return NextResponse.json({ source: "ai", suggestions: parsed.suggestions.slice(0, 3) });
    } else if (process.env.GEMINI_API_KEY) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { temperature: 0.9, responseMimeType: "application/json" } }),
      });
      const j = await r.json();
      const parsed = JSON.parse(j.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
      if (Array.isArray(parsed.suggestions)) return NextResponse.json({ source: "ai", suggestions: parsed.suggestions.slice(0, 3) });
    }
  } catch {
    // fall through to the rule-based fallback
  }
  return NextResponse.json({ source: "fallback" });
}
