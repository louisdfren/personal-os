"use client";

import { useRef, useState, useTransition } from "react";
import { logFromDescription } from "@/lib/meals/actions";

type LastResult = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "high" | "medium" | "low";
  assumptions: string;
};

export function SmartMealForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<LastResult | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await logFromDescription(formData);
      if (result?.error) {
        setError(result.error);
        setLast(null);
      } else if (result?.ok && result.parsed) {
        setLast(result.parsed);
        formRef.current?.reset();
      }
    });
  }

  return (
    <div className="space-y-3">
      <form ref={formRef} action={onSubmit} className="space-y-3">
        <textarea
          name="description"
          required
          rows={3}
          placeholder={
            "Describe what you ate — e.g. 'rump steak from Co-op, 4 large eggs, olive oil drizzle, honey drizzle on top'"
          }
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />

        <div className="flex items-center justify-between gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {pending ? "Estimating…" : "Estimate & log"}
          </button>
          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}
        </div>
      </form>

      {last && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          <p className="font-medium">
            Logged: {last.name} — {last.calories} kcal · {last.protein_g}g P ·{" "}
            {last.carbs_g}g C · {last.fat_g}g F
          </p>
          {last.assumptions && (
            <p className="mt-1 text-xs opacity-80">
              <span className="font-semibold">
                {last.confidence} confidence.
              </span>{" "}
              {last.assumptions}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
