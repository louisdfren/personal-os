import type { WhoopToday } from "@/lib/whoop/today";
import { formatSleepDuration } from "@/lib/whoop/today";

export function WhoopTile({ today }: { today: WhoopToday }) {
  const recovery = today.recovery?.score;
  const sleepDuration = formatSleepDuration(
    today.sleep?.totalInBedMs ?? null,
    today.sleep?.totalAwakeMs ?? null,
  );
  const strain = today.strain?.strain;

  return (
    <div className="grid grid-cols-3 gap-3">
      <Metric
        label="Recovery"
        value={recovery != null ? `${Math.round(recovery)}%` : "—"}
        sub={
          today.recovery?.hrv != null
            ? `HRV ${Math.round(today.recovery.hrv)}ms`
            : null
        }
        accent={recoveryAccent(recovery)}
      />
      <Metric
        label="Sleep"
        value={sleepDuration ?? "—"}
        sub={
          today.sleep?.performancePct != null
            ? `${Math.round(today.sleep.performancePct)}% of need`
            : null
        }
      />
      <Metric
        label="Strain"
        value={strain != null ? strain.toFixed(1) : "—"}
        sub={today.strain?.cycleEnd ? "Yesterday" : "Today"}
      />
    </div>
  );
}

function recoveryAccent(score: number | null | undefined) {
  if (score == null) return undefined;
  if (score >= 67) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 34) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string | null;
  accent?: string;
}) {
  return (
    <div className="rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p
        className={`mt-0.5 text-lg font-semibold ${
          accent ?? "text-zinc-900 dark:text-zinc-100"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>
      )}
    </div>
  );
}
