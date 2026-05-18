"use client";

import { useState, useTransition } from "react";
import { getRecipeIdeas } from "@/lib/recipes/actions";
import type { RecipeSuggestion } from "@/lib/recipes/suggest";

export function RecipeIdeas() {
  const [pending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await getRecipeIdeas();
            if (r.ok) {
              setSuggestions(r.suggestions);
            } else {
              setError(r.error);
              setSuggestions(null);
            }
          })
        }
        className="inline-flex items-center rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Thinking…" : suggestions ? "New ideas" : "Suggest meals to hit my targets"}
      </button>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {suggestions && (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <article
              key={i}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <header className="flex items-baseline justify-between gap-3">
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{s.name}</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.prep_minutes}m prep</p>
              </header>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {s.calories} kcal · {s.protein_g}g P · {s.carbs_g}g C · {s.fat_g}g F
              </p>
              <p className="mt-2 text-xs italic text-zinc-500 dark:text-zinc-400">
                {s.why_it_fits}
              </p>
              <ul className="mt-2 list-disc pl-5 text-xs text-zinc-700 dark:text-zinc-300">
                {s.ingredients.map((ing, j) => (
                  <li key={j}>{ing}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
