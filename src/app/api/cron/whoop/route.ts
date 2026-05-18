import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncWhoopWindow } from "@/lib/whoop/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: tokens, error } = await admin
    .from("whoop_tokens")
    .select("user_id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const end = new Date().toISOString();
  const start = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

  const results: Array<{ user_id: string; ok: boolean; counts?: unknown; error?: string }> = [];

  for (const row of tokens ?? []) {
    try {
      const counts = await syncWhoopWindow(admin, row.user_id, start, end);
      results.push({ user_id: row.user_id, ok: true, counts });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      results.push({ user_id: row.user_id, ok: false, error: message });
    }
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), window: { start, end }, results });
}
