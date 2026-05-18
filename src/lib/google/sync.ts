import type { SupabaseClient } from "@supabase/supabase-js";
import { googleFetch } from "./client";

type CalendarListEntry = {
  id: string;
  summary: string;
  primary?: boolean;
  selected?: boolean;
  accessRole?: string;
};

type GoogleEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  organizer?: { email?: string };
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email?: string; responseStatus?: string; displayName?: string; self?: boolean }>;
  updated?: string;
};

export type CalendarSyncResult = {
  calendars: number;
  events: number;
};

export async function syncCalendarEvents(
  supabase: SupabaseClient,
  userId: string,
  daysBack: number,
  daysForward: number,
): Promise<CalendarSyncResult> {
  const timeMin = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + daysForward * 24 * 60 * 60 * 1000).toISOString();

  const listRes = await googleFetch(
    supabase,
    userId,
    "/calendar/v3/users/me/calendarList?minAccessRole=reader",
  );
  if (!listRes.ok) {
    throw new Error(`calendarList failed: ${listRes.status} ${await listRes.text()}`);
  }
  const list = (await listRes.json()) as { items?: CalendarListEntry[] };
  const calendars = list.items ?? [];

  const rows: Array<Record<string, unknown>> = [];
  for (const cal of calendars) {
    let pageToken: string | undefined;
    for (let page = 0; page < 100; page++) {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const eventsRes = await googleFetch(
        supabase,
        userId,
        `/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params.toString()}`,
      );
      if (!eventsRes.ok) {
        throw new Error(`events failed for ${cal.id}: ${eventsRes.status} ${await eventsRes.text()}`);
      }
      const body = (await eventsRes.json()) as {
        items?: GoogleEvent[];
        nextPageToken?: string;
      };
      for (const ev of body.items ?? []) {
        const startIso = ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00Z` : null);
        const endIso = ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T00:00:00Z` : null);
        if (!startIso || !endIso) continue;
        rows.push({
          user_id: userId,
          google_calendar_id: cal.id,
          google_calendar_name: cal.summary,
          google_event_id: ev.id,
          summary: ev.summary ?? null,
          description: ev.description ?? null,
          location: ev.location ?? null,
          start_at: startIso,
          end_at: endIso,
          all_day: Boolean(ev.start?.date && !ev.start?.dateTime),
          status: ev.status ?? null,
          html_link: ev.htmlLink ?? null,
          organizer_email: ev.organizer?.email ?? null,
          attendees: ev.attendees ?? null,
          event_updated_at: ev.updated ?? null,
          raw: ev,
        });
      }
      if (!body.nextPageToken) break;
      pageToken = body.nextPageToken;
    }
  }

  if (rows.length) {
    const { error } = await supabase
      .from("calendar_events")
      .upsert(rows, { onConflict: "user_id,google_calendar_id,google_event_id" });
    if (error) throw new Error(`calendar_events upsert: ${error.message}`);
  }

  return { calendars: calendars.length, events: rows.length };
}
