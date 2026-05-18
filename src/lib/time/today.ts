import { format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

export const APP_TIMEZONE = "Europe/London";

export function getTodayRange(now: Date = new Date()): {
  startIso: string;
  endIso: string;
  dateLabel: string;
} {
  const dateLabel = format(
    new Date(now.toLocaleString("en-US", { timeZone: APP_TIMEZONE })),
    "yyyy-MM-dd",
  );

  const start = fromZonedTime(`${dateLabel}T00:00:00`, APP_TIMEZONE);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    dateLabel,
  };
}

export function formatLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}
