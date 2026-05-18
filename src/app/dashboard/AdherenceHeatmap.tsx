"use client";

import type { DailyPoint, MacrosTargets } from "@/lib/aggregates-shared";
import { statusFor } from "@/lib/aggregates-shared";

const COLOURS: Record<"under" | "on" | "over" | "none", string> = {
  under: "bg-rose-400/70 dark:bg-rose-500/70",
  on: "bg-emerald-500 dark:bg-emerald-400",
  over: "bg-amber-400 dark:bg-amber-300",
  none: "bg-zinc-200 dark:bg-zinc-800",
};

export function AdherenceHeatmap({
  series,
  targets,
}: {
  series: DailyPoint[];
  targets: MacrosTargets | null;
}) {
  if (!targets) {
    return (
      <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Set your daily macros targets to see adherence.
      </p>
    );
  }

  const rows: Array<{ label: string; pick: (p: DailyPoint) => number | null; target: number }> = [
    { label: "Calories", pick: (p) => p.kcalIntake, target: targets.daily_calories },
    { label: "Protein", pick: (p) => p.proteinG, target: targets.protein_g },
    { label: "Carbs", pick: (p) => p.carbsG, target: targets.carbs_g },
    { label: "Fat", pick: (p) => p.fatG, target: targets.fat_g },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-3 text-[10px] text-zinc-500 dark:text-zinc-400">
        <LegendDot colour={COLOURS.under} label="Under" />
        <LegendDot colour={COLOURS.on} label="On target" />
        <LegendDot colour={COLOURS.over} label="Over" />
        <LegendDot colour={COLOURS.none} label="No data" />
      </div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs text-zinc-600 dark:text-zinc-400">
            {row.label}
          </span>
          <div className="flex w-full gap-px overflow-hidden">
            {series.map((p) => {
              const status = statusFor(row.pick(p), row.target);
              return (
                <span
                  key={p.date}
                  title={`${p.date} · ${row.label} ${Math.round(row.pick(p) ?? 0)} / ${row.target}`}
                  className={`h-5 flex-1 rounded-[2px] ${COLOURS[status]}`}
                />
              );
            })}
          </div>
        </div>
      ))}
      <p className="pt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
        On target = within ±10% of your daily target. Hover a cell for the date and value.
      </p>
    </div>
  );
}

function LegendDot({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-sm ${colour}`} />
      {label}
    </span>
  );
}
