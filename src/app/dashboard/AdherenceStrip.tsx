import type { DailyPoint, MacrosTargets } from "@/lib/aggregates-shared";
import { countAdherence } from "@/lib/aggregates-shared";

export function AdherenceStrip({
  series,
  targets,
}: {
  series: DailyPoint[];
  targets: MacrosTargets;
}) {
  const last30 = series.slice(-30);
  const cals = countAdherence(last30, targets.daily_calories, (p) => p.kcalIntake);
  const protein = countAdherence(last30, targets.protein_g, (p) => p.proteinG);
  const carbs = countAdherence(last30, targets.carbs_g, (p) => p.carbsG);
  const fat = countAdherence(last30, targets.fat_g, (p) => p.fatG);

  return (
    <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
      <Stat label="Calories on target" hit={cals.hit} total={cals.total} />
      <Stat label="Protein on target" hit={protein.hit} total={protein.total} />
      <Stat label="Carbs on target" hit={carbs.hit} total={carbs.total} />
      <Stat label="Fat on target" hit={fat.hit} total={fat.total} />
    </div>
  );
}

function Stat({ label, hit, total }: { label: string; hit: number; total: number }) {
  return (
    <div className="rounded-lg bg-zinc-100 px-3 py-1.5 dark:bg-zinc-950">
      <p className="text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">
        {hit}/{total} <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">days · 30d</span>
      </p>
    </div>
  );
}
