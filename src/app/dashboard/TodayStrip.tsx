import type { DailyPoint } from "@/lib/aggregates-shared";
import { baseline } from "@/lib/aggregates-shared";

type Props = {
  series: DailyPoint[]; // last 30 days, most recent last
};

export function TodayStrip({ series }: Props) {
  const today = series[series.length - 1] ?? null;
  const prior = series.slice(0, -1);

  const hrvBaseline = baseline(prior.map((p) => p.hrv));
  const recoveryBaseline = baseline(prior.map((p) => p.recovery));
  const strainBaseline = baseline(prior.map((p) => p.strain));
  const netBaseline = baseline(
    prior.map((p) => (p.kcalIntake != null && p.kcalBurnt != null ? p.kcalIntake - p.kcalBurnt : null)),
  );

  const netToday =
    today?.kcalIntake != null && today?.kcalBurnt != null
      ? today.kcalIntake - today.kcalBurnt
      : null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Tile
        label="Recovery"
        value={today?.recovery != null ? `${Math.round(today.recovery)}%` : "—"}
        delta={delta(today?.recovery, recoveryBaseline?.mean, "pct")}
        accent={recoveryAccent(today?.recovery)}
      />
      <Tile
        label="Strain"
        value={today?.strain != null ? today.strain.toFixed(1) : "—"}
        delta={delta(today?.strain, strainBaseline?.mean, "raw")}
      />
      <Tile
        label="HRV"
        value={today?.hrv != null ? `${Math.round(today.hrv)} ms` : "—"}
        delta={delta(today?.hrv, hrvBaseline?.mean, "ms")}
      />
      <Tile
        label="Net kcal"
        value={netToday != null ? formatSigned(netToday) : "—"}
        delta={delta(netToday, netBaseline?.mean, "kcal")}
        sub={today?.kcalIntake != null || today?.kcalBurnt != null
          ? `${today?.kcalIntake ?? 0} in / ${today?.kcalBurnt ?? 0} out`
          : null}
      />
    </div>
  );
}

function delta(
  today: number | null | undefined,
  baselineMean: number | null | undefined,
  unit: "pct" | "ms" | "raw" | "kcal",
): string | null {
  if (today == null || baselineMean == null) return null;
  const diff = today - baselineMean;
  const sign = diff >= 0 ? "+" : "−";
  const abs = Math.abs(diff);
  const formatted =
    unit === "pct"
      ? `${Math.round(abs)} pp`
      : unit === "ms"
        ? `${Math.round(abs)} ms`
        : unit === "kcal"
          ? `${Math.round(abs)} kcal`
          : abs.toFixed(1);
  return `${sign}${formatted} vs 30d`;
}

function formatSigned(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${Math.abs(Math.round(n))}`;
}

function recoveryAccent(score: number | null | undefined) {
  if (score == null) return undefined;
  if (score >= 67) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 34) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function Tile({
  label,
  value,
  delta,
  sub,
  accent,
}: {
  label: string;
  value: string;
  delta: string | null;
  sub?: string | null;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          accent ?? "text-zinc-900 dark:text-zinc-100"
        }`}
      >
        {value}
      </p>
      {delta && (
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{delta}</p>
      )}
      {sub && (
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>
      )}
    </div>
  );
}
