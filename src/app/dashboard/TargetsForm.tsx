"use client";

import { useState, useTransition } from "react";
import { saveTargets } from "@/lib/targets/actions";
import type { MacrosTargets } from "@/lib/targets/queries";

export function TargetsForm({ current }: { current: MacrosTargets | null }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setMessage(null);
          const result = await saveTargets(fd);
          setMessage("error" in result ? `Failed: ${result.error}` : "Saved.");
        })
      }
      className="grid grid-cols-2 gap-3 md:grid-cols-4"
    >
      <Field name="daily_calories" label="Calories" suffix="kcal" defaultValue={current?.daily_calories} />
      <Field name="protein_g" label="Protein" suffix="g" defaultValue={current?.protein_g} />
      <Field name="carbs_g" label="Carbs" suffix="g" defaultValue={current?.carbs_g} />
      <Field name="fat_g" label="Fat" suffix="g" defaultValue={current?.fat_g} />
      <div className="col-span-2 flex items-center gap-3 md:col-span-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Saving…" : "Save targets"}
        </button>
        {message && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{message}</p>
        )}
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  suffix,
  defaultValue,
}: {
  name: string;
  label: string;
  suffix: string;
  defaultValue?: number;
}) {
  return (
    <label className="block text-xs">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <div className="mt-1 flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950">
        <input
          type="number"
          name={name}
          required
          min={0}
          step="any"
          defaultValue={defaultValue ?? ""}
          className="w-full bg-transparent text-sm text-zinc-900 outline-none dark:text-zinc-100"
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{suffix}</span>
      </div>
    </label>
  );
}
