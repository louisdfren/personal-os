"use client";

import { useState, useTransition, type ReactNode } from "react";
import { refreshWhoop } from "./actions";

type Props = {
  connected: boolean;
  lastSyncAt: string | null;
  children?: ReactNode;
};

export function WhoopSection({ connected, lastSyncAt, children }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!connected) {
    return (
      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Whoop
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Connect your Whoop to pull recovery, sleep, workouts and strain.
          </p>
        </div>
        <a
          href="/api/auth/whoop/start"
          className="inline-flex items-center rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Connect Whoop
        </a>
      </section>
    );
  }

  const lastSync = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString("en-GB", { timeZone: "Europe/London" })
    : "never";

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Whoop
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Last sync: {lastSync}
        </p>
      </div>
      {children}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const result = await refreshWhoop();
            if (result.ok) {
              const { recovery, sleep, workouts, cycles } = result.counts;
              setMessage(
                `Synced ${recovery} recovery, ${sleep} sleep, ${workouts} workouts, ${cycles} cycles.`,
              );
            } else {
              setMessage(`Failed: ${result.error}`);
            }
          })
        }
        className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {pending ? "Syncing…" : lastSyncAt ? "Refresh now" : "Pull last 30 days"}
      </button>
      {message && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{message}</p>
      )}
    </section>
  );
}
