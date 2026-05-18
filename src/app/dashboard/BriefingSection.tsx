"use client";

import { useState, useTransition } from "react";
import { regenerateBriefing } from "@/lib/briefing/actions";
import type { BriefingRow } from "@/lib/briefing/queries";

export function BriefingSection({ briefing }: { briefing: BriefingRow | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onRegenerate = () =>
    startTransition(async () => {
      setError(null);
      const r = await regenerateBriefing();
      if (!r.ok) setError(r.error);
    });

  if (!briefing) {
    return (
      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-6 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Morning briefing
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Claude reads your sleep, recovery, calendar and macros and writes you a one-paragraph plan.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={onRegenerate}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Writing…" : "Generate briefing"}
        </button>
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-6 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Morning briefing
        </h2>
        <button
          type="button"
          disabled={pending}
          onClick={onRegenerate}
          className="text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {pending ? "Rewriting…" : "Regenerate"}
        </button>
      </div>

      <p className="text-lg font-medium leading-snug text-zinc-900 dark:text-zinc-100">
        {briefing.headline}
      </p>
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {briefing.body}
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Pane label="Recovery" body={briefing.recovery_call} />
        <Pane label="Nutrition" body={briefing.nutrition_call} />
        <Pane label="Today's schedule" body={briefing.schedule_call} />
        <Pane label="Watch for" body={briefing.watch_for} />
      </div>

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </section>
  );
}

function Pane({ label, body }: { label: string; body: string | null }) {
  if (!body) return null;
  return (
    <div className="rounded-xl bg-zinc-100 px-4 py-3 dark:bg-zinc-900/60">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        {body}
      </p>
    </div>
  );
}
