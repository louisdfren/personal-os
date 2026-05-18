import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth/allowed-emails";
import { getMealsForDay } from "@/lib/meals/dayQueries";
import { sumMeals } from "@/lib/meals/types";
import { getWhoopForDay } from "@/lib/whoop/day";
import { KJ_TO_KCAL } from "@/lib/aggregates";
import { APP_TIMEZONE, formatLocalTime, shiftDayLabel } from "@/lib/time/today";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAllowed(user.email)) {
    await supabase.auth.signOut();
    redirect("/login?error=not_allowed");
  }

  const [meals, whoop] = await Promise.all([getMealsForDay(date), getWhoopForDay(date)]);
  const totals = sumMeals(meals);
  const kcalBurnt = whoop.cycle?.kilojoule != null ? Math.round(whoop.cycle.kilojoule * KJ_TO_KCAL) : null;
  const net = kcalBurnt != null ? Math.round(totals.calories) - kcalBurnt : null;

  const prev = shiftDayLabel(date, -1);
  const next = shiftDayLabel(date, +1);
  const longDate = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-xs uppercase tracking-wide text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              ← Dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {longDate}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/day/${prev}`}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              ← Prev
            </Link>
            <Link
              href={`/dashboard/day/${next}`}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Next →
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Recovery"
            value={whoop.recovery?.score != null ? `${Math.round(whoop.recovery.score)}%` : "—"}
          />
          <Stat
            label="Strain"
            value={whoop.cycle?.strain != null ? whoop.cycle.strain.toFixed(1) : "—"}
          />
          <Stat
            label="HRV"
            value={whoop.recovery?.hrv != null ? `${Math.round(whoop.recovery.hrv)} ms` : "—"}
          />
          <Stat
            label="Net kcal"
            value={net != null ? `${net >= 0 ? "+" : "−"}${Math.abs(net)}` : "—"}
            sub={
              kcalBurnt != null
                ? `${Math.round(totals.calories)} in / ${kcalBurnt} out`
                : `${Math.round(totals.calories)} in`
            }
          />
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Meals</h2>
          {meals.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No meals logged.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {meals.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{m.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatLocalTime(m.eaten_at)} ·
                      {" "}P {m.protein_g ?? 0}g · C {m.carbs_g ?? 0}g · F {m.fat_g ?? 0}g
                    </p>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300">{m.calories} kcal</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Workouts</h2>
          {whoop.workouts.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No workouts.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {whoop.workouts.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{w.sportName}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatLocalTime(w.startAt)} · {w.durationMin}m · avg HR {w.avgHr ?? "—"}
                    </p>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    {w.strain != null ? `${w.strain.toFixed(1)} strain` : "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {whoop.sleep && (
          <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Sleep</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat
                label="Asleep"
                value={formatMs((whoop.sleep.totalInBedMs ?? 0) - (whoop.sleep.totalAwakeMs ?? 0))}
              />
              <Stat
                label="Performance"
                value={
                  whoop.sleep.performancePct != null
                    ? `${Math.round(whoop.sleep.performancePct)}%`
                    : "—"
                }
              />
              <Stat label="REM" value={formatMs(whoop.sleep.totalRemMs ?? 0)} />
              <Stat label="SWS" value={formatMs(whoop.sleep.totalSwsMs ?? 0)} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function formatMs(ms: number): string {
  if (!ms) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>}
    </div>
  );
}
