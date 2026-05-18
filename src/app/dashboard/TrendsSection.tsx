"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint, MacrosTargets } from "@/lib/aggregates-shared";
import { baseline, rollingMean } from "@/lib/aggregates-shared";
import type { WorkoutRow } from "@/lib/whoop/workoutsQuery";
import { AdherenceHeatmap } from "./AdherenceHeatmap";

type Window = 7 | 30 | 90 | 365;
const WINDOWS: Array<{ label: string; days: Window }> = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
];

type Props = {
  series: DailyPoint[];
  workouts: Array<WorkoutRow & { nextDayRecovery: number | null }>;
  targets: MacrosTargets | null;
};

export function TrendsSection({ series, workouts, targets }: Props) {
  const [days, setDays] = useState<Window>(30);

  const sliced = useMemo(() => series.slice(-days), [series, days]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Window
        </span>
        <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
          {WINDOWS.map((w) => (
            <button
              key={w.days}
              type="button"
              onClick={() => setDays(w.days)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                days === w.days
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <HrvChart series={sliced} />
      <CaloriesChart series={sliced} />
      <RecoveryStrainChart series={sliced} />
      <ChartCard title="Macro adherence" subtitle="Each cell is one day; ±10% of target = on target">
        <AdherenceHeatmap series={sliced} targets={targets} />
      </ChartCard>
      <WorkoutsTable workouts={workouts.filter((w) => withinDays(w.startAt, days))} />
    </div>
  );
}

function withinDays(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000;
}

function HrvChart({ series }: { series: DailyPoint[] }) {
  const hrvBaseline = baseline(series.map((p) => p.hrv));
  const rolling = rollingMean(
    series.map((p) => p.hrv),
    7,
  );
  const data = series.map((p, i) => ({
    date: p.date.slice(5),
    hrv: p.hrv,
    rolling: rolling[i],
  }));

  return (
    <ChartCard title="HRV (RMSSD)" subtitle="Daily bars · 7-day rolling line · baseline band ±1 SD">
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.18)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit=" ms" width={56} />
          {hrvBaseline && (
            <ReferenceArea
              y1={hrvBaseline.mean - hrvBaseline.std}
              y2={hrvBaseline.mean + hrvBaseline.std}
              fill="#10b981"
              fillOpacity={0.08}
            />
          )}
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v) => (typeof v === "number" ? `${Math.round(v)} ms` : "—")}
          />
          <Bar dataKey="hrv" fill="#10b981" name="HRV" />
          <Line type="monotone" dataKey="rolling" stroke="#059669" strokeWidth={2} dot={false} name="7d avg" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function CaloriesChart({ series }: { series: DailyPoint[] }) {
  const data = series.map((p) => ({
    date: p.date.slice(5),
    intake: p.kcalIntake ?? 0,
    burn: p.kcalBurnt != null ? -p.kcalBurnt : 0,
    net: p.kcalIntake != null && p.kcalBurnt != null ? p.kcalIntake - p.kcalBurnt : null,
  }));
  const netVals = data.map((d) => d.net).filter((v): v is number => v != null);
  const totalNet = netVals.reduce((a, b) => a + b, 0);
  const rolling = rollingMean(data.map((d) => d.net), 7);

  return (
    <ChartCard
      title="Calories"
      subtitle="Intake (green, above) vs burn (red, below) · 7-day rolling net"
      headline={netVals.length ? `${totalNet >= 0 ? "+" : "−"}${Math.abs(Math.round(totalNet))} kcal net` : null}
    >
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data.map((d, i) => ({ ...d, rolling: rolling[i] }))} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.18)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={56} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="intake" fill="#10b981" name="Intake" stackId="a" />
          <Bar dataKey="burn" fill="#f43f5e" name="Burn" stackId="a" />
          <Line type="monotone" dataKey="rolling" stroke="#3b82f6" strokeWidth={2} dot={false} name="7d net" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function RecoveryStrainChart({ series }: { series: DailyPoint[] }) {
  const data = series.map((p) => ({
    date: p.date.slice(5),
    recovery: p.recovery,
    strain: p.strain,
  }));
  return (
    <ChartCard title="Recovery vs Strain" subtitle="Recovery % on left axis · Strain (0–21) on right axis">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.18)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} unit="%" width={48} domain={[0, 100]} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={36} domain={[0, 21]} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="left" type="monotone" dataKey="recovery" stroke="#10b981" strokeWidth={2} dot={false} name="Recovery %" />
          <Line yAxisId="right" type="monotone" dataKey="strain" stroke="#f59e0b" strokeWidth={2} dot={false} name="Strain" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function WorkoutsTable({
  workouts,
}: {
  workouts: Array<WorkoutRow & { nextDayRecovery: number | null }>;
}) {
  return (
    <ChartCard title="Workouts" subtitle={`${workouts.length} in window · next-day recovery joined in`}>
      {workouts.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No workouts in this window.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Sport</th>
                <th className="py-2 pr-3 text-right font-medium">Strain</th>
                <th className="py-2 pr-3 text-right font-medium">Duration</th>
                <th className="py-2 pr-3 text-right font-medium">Avg HR</th>
                <th className="py-2 pr-3 text-right font-medium">Next-day rec.</th>
              </tr>
            </thead>
            <tbody>
              {workouts.map((w) => (
                <tr
                  key={w.startAt}
                  className="border-t border-zinc-100 text-zinc-800 dark:border-zinc-800 dark:text-zinc-200"
                >
                  <td className="py-2 pr-3">
                    <a
                      href={`/dashboard/day/${w.date}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {w.date}
                    </a>
                  </td>
                  <td className="py-2 pr-3">{w.sportName}</td>
                  <td className="py-2 pr-3 text-right">
                    {w.strain != null ? w.strain.toFixed(1) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right">{w.durationMin}m</td>
                  <td className="py-2 pr-3 text-right">{w.avgHr ?? "—"}</td>
                  <td className="py-2 pr-3 text-right">
                    {w.nextDayRecovery != null ? `${Math.round(w.nextDayRecovery)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}

function ChartCard({
  title,
  subtitle,
  headline,
  children,
}: {
  title: string;
  subtitle?: string;
  headline?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          )}
        </div>
        {headline && (
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {headline}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
