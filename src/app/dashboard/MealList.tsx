import { deleteMeal } from "@/lib/meals/actions";
import { formatLocalTime } from "@/lib/time/today";
import type { Meal } from "@/lib/meals/types";

export function MealList({ meals }: { meals: Meal[] }) {
  if (meals.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-500">
        Nothing logged yet today.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {meals.map((meal) => (
        <li
          key={meal.id}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {meal.name}
              </p>
              <span className="text-xs text-zinc-500 dark:text-zinc-500">
                {formatLocalTime(meal.eaten_at)}
              </span>
            </div>
            {meal.notes && (
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-500">
                {meal.notes}
              </p>
            )}
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {meal.calories} kcal
              {meal.protein_g != null && ` · ${meal.protein_g}g P`}
              {meal.carbs_g != null && ` · ${meal.carbs_g}g C`}
              {meal.fat_g != null && ` · ${meal.fat_g}g F`}
            </p>
          </div>
          <form action={deleteMeal}>
            <input type="hidden" name="id" value={meal.id} />
            <button
              type="submit"
              aria-label="Delete meal"
              className="rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800"
            >
              Delete
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
