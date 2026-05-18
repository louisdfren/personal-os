import { createClient } from "@/lib/supabase/server";
import { getDayRange, getTodayRange } from "@/lib/time/today";

export type CalendarStatus =
  | { connected: false }
  | { connected: true; email: string | null; lastSyncAt: string | null };

export async function getCalendarStatus(): Promise<CalendarStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { connected: false };
  const { data } = await supabase
    .from("calendar_tokens")
    .select("google_email, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { connected: false };
  return { connected: true, email: data.google_email, lastSyncAt: data.updated_at };
}

export type CalendarEventRow = {
  id: string;
  summary: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  calendar_name: string | null;
  html_link: string | null;
  status: string | null;
};

async function getEventsBetween(startIso: string, endIso: string): Promise<CalendarEventRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("calendar_events")
    .select(
      "id, summary, location, start_at, end_at, all_day, google_calendar_name, html_link, status",
    )
    .eq("user_id", user.id)
    .gte("end_at", startIso)
    .lt("start_at", endIso)
    .neq("status", "cancelled")
    .order("start_at", { ascending: true });
  if (error) return [];
  return (data ?? []).map((e) => ({
    id: e.id,
    summary: e.summary,
    location: e.location,
    start_at: e.start_at,
    end_at: e.end_at,
    all_day: e.all_day,
    calendar_name: e.google_calendar_name,
    html_link: e.html_link,
    status: e.status,
  }));
}

export async function getEventsForToday(): Promise<CalendarEventRow[]> {
  const { startIso, endIso } = getTodayRange();
  return getEventsBetween(startIso, endIso);
}

export async function getEventsForDay(dateLabel: string): Promise<CalendarEventRow[]> {
  const { startIso, endIso } = getDayRange(dateLabel);
  return getEventsBetween(startIso, endIso);
}
