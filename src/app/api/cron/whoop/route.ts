import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncCalendarEvents } from "@/lib/google/sync";
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

  const [{ data: whoopTokens }, { data: calendarTokens }] = await Promise.all([
    admin.from("whoop_tokens").select("user_id"),
    admin.from("calendar_tokens").select("user_id"),
  ]);

  const end = new Date().toISOString();
  const start = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

  const whoopResults: Array<{ user_id: string; ok: boolean; counts?: unknown; error?: string }> = [];
  for (const row of whoopTokens ?? []) {
    try {
      const counts = await syncWhoopWindow(admin, row.user_id, start, end);
      whoopResults.push({ user_id: row.user_id, ok: true, counts });
    } catch (e) {
      whoopResults.push({
        user_id: row.user_id,
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  const calendarResults: Array<{ user_id: string; ok: boolean; counts?: unknown; error?: string }> = [];
  for (const row of calendarTokens ?? []) {
    try {
      const counts = await syncCalendarEvents(admin, row.user_id, 30, 30);
      calendarResults.push({ user_id: row.user_id, ok: true, counts });
    } catch (e) {
      calendarResults.push({
        user_id: row.user_id,
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    window: { start, end },
    whoop: whoopResults,
    calendar: calendarResults,
  });
}
