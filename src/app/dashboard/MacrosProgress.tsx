import type { MacrosTargets } from "@/lib/targets/queries";
import type { MealTotals } from "@/lib/meals/types";

export function MacrosProgress({
  totals,
  targets,
}: {
  totals: MealTotals;
  targets: MacrosTargets;
}) {
  return (
    <div className="space-y-2">
      <Bar label="Calories" current={totals.calories} target={targets.daily_calories} suffix=" kcal" />
      <Bar label="Protein" current={totals.protein_g} target={targets.protein_g} suffix="g" />
      <Bar label="Carbs" current={totals.carbs_g} target={targets.carbs_g} suffix="g" />
      <Bar label="Fat" current={totals.fat_g} target={targets.fat_g} suffix="g" />
    </div>
  );
}

function Bar({
  label,
  current,
  target,
  suffix,
}: {
  label: string;
  current: number;
  target: number;
  suffix: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const over = current > target && target > 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span
          className={
            over
              ? "text-rose-600 dark:text-rose-400"
              : "text-zinc-700 dark:text-zinc-300"
          }
        >
          {Math.round(current)}
          {suffix} / {Math.round(target)}
          {suffix}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${
            over ? "bg-rose-500" : "bg-emerald-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
