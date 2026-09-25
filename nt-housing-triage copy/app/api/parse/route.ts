import { NextResponse } from "next/server";
import { parseReport } from "@/lib/parser";

export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const payload = (body ?? {}) as { text?: unknown; prefer?: unknown };
  const text = typeof payload.text === "string" ? payload.text : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  const prefer = payload.prefer === "fallback" ? "fallback" : "model";

  const result = await parseReport(text, { prefer });
  return NextResponse.json(result);
}
