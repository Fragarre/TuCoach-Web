import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGET =
  "https://sede.gva.es/detall-ocupacio-publica?id_emp=114380";

export async function GET() {
  const started = Date.now();

  try {
    const response = await fetch(TARGET, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "TuCoach-GVA-connectivity-check/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    const body = await response.arrayBuffer();

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      bytes: body.byteLength,
      elapsed_ms: Date.now() - started,
      final_url: response.url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        elapsed_ms: Date.now() - started,
        error: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
