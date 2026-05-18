"use client";

import { useState, useTransition } from "react";
import { refreshCalendar } from "./actions";
import type { CalendarEventRow } from "@/lib/google/queries";
import { formatLocalTime } from "@/lib/time/today";

type Props = {
  connected: boolean;
  email: string | null;
  lastSyncAt: string | null;
  events: CalendarEventRow[];
};

export function CalendarSection({ connected, email, lastSyncAt, events }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!connected) {
    return (
      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Google Calendar
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Connect to pull today's meetings and 30 days of history.
          </p>
        </div>
        <a
          href="/api/auth/google/start"
          className="inline-flex items-center rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Connect Google
        </a>
      </section>
    );
  }

  const lastSync = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString("en-GB", { timeZone: "Europe/London" })
    : "never";

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Today's calendar
          </h2>
          {email && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{email}</p>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Last sync: {lastSync}</p>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing on the calendar.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {events.map((e) => (
            <li key={e.id} className="py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {e.summary ?? "(no title)"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {e.all_day
                      ? "All day"
                      : `${formatLocalTime(e.start_at)} – ${formatLocalTime(e.end_at)}`}
                    {e.location ? ` · ${e.location}` : ""}
                    {e.calendar_name ? ` · ${e.calendar_name}` : ""}
                  </p>
                </div>
                {e.html_link && (
                  <a
                    href={e.html_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Open ↗
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const result = await refreshCalendar();
            if (result.ok) {
              setMessage(
                `Synced ${result.counts.events} events across ${result.counts.calendars} calendars.`,
              );
            } else {
              setMessage(`Failed: ${result.error}`);
            }
          })
        }
        className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {pending ? "Syncing…" : "Refresh calendar"}
      </button>
      {message && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{message}</p>
      )}
    </section>
  );
}
