"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import type { DailyPoint } from "@/lib/aggregates-shared";

export function HistoryCalendar({ series }: { series: DailyPoint[] }) {
  const router = useRouter();
  const [pickerDate, setPickerDate] = useState("");

  // Show the last 35 days as a 5-row grid, most recent at the bottom right.
  const last35 = series.slice(-35);

  function onPickerChange(value: string) {
    setPickerDate(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      router.push(`/dashboard/day/${value}`);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            History
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Tap any day to see meals, briefing, Whoop and meetings for that date.
          </p>
        </div>
        <input
          type="date"
          value={pickerDate}
          onChange={(e) => onPickerChange(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
        />
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {last35.map((p) => (
          <Link
            key={p.date}
            href={`/dashboard/day/${p.date}`}
            className="group block rounded-lg border border-zinc-200 bg-zinc-50 p-1.5 text-left transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
            title={`${p.date} · recovery ${p.recovery != null ? Math.round(p.recovery) + "%" : "—"} · ${p.kcalIntake ?? 0} kcal in`}
          >
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {p.date.slice(5)}
            </p>
            <p
              className={`mt-0.5 text-sm font-medium ${recoveryClass(p.recovery)}`}
            >
              {p.recovery != null ? `${Math.round(p.recovery)}%` : "—"}
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {p.kcalIntake != null ? `${p.kcalIntake} kcal` : "—"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function recoveryClass(score: number | null) {
  if (score == null) return "text-zinc-400 dark:text-zinc-600";
  if (score >= 67) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 34) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}
