"use client";

import { useRef, useState, useTransition } from "react";
import { addMeal } from "@/lib/meals/actions";

export function AddMealForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addMeal(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        formRef.current?.reset();
      }
    });
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";
  const labelClass =
    "text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label className={labelClass} htmlFor="meal-name">
          What did you eat?
        </label>
        <input
          id="meal-name"
          type="text"
          name="name"
          required
          placeholder="e.g. Chicken salad"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="meal-calories">
            Calories
          </label>
          <input
            id="meal-calories"
            type="number"
            name="calories"
            min={0}
            step={1}
            required
            placeholder="450"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="meal-protein">
            Protein (g)
          </label>
          <input
            id="meal-protein"
            type="number"
            name="protein_g"
            min={0}
            step={0.1}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="meal-carbs">
            Carbs (g)
          </label>
          <input
            id="meal-carbs"
            type="number"
            name="carbs_g"
            min={0}
            step={0.1}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass} htmlFor="meal-fat">
            Fat (g)
          </label>
          <input
            id="meal-fat"
            type="number"
            name="fat_g"
            min={0}
            step={0.1}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass} htmlFor="meal-notes">
          Notes (optional)
        </label>
        <input
          id="meal-notes"
          type="text"
          name="notes"
          placeholder="anything worth remembering"
          className={inputClass}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Logging…" : "Log meal"}
        </button>
        {error && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        )}
      </div>
    </form>
  );
}
