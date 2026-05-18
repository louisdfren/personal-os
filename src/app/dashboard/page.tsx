import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth/allowed-emails";
import { getMealsToday } from "@/lib/meals/queries";
import { sumMeals } from "@/lib/meals/types";
import { signOut } from "./actions";
import { AddMealForm } from "./AddMealForm";
import { MealList } from "./MealList";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAllowed(user.email)) {
    await supabase.auth.signOut();
    redirect("/login?error=not_allowed");
  }

  const meals = await getMealsToday();
  const totals = sumMeals(meals);
  const name = user.email?.split("@")[0] ?? "you";

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Personal OS
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Hello, {name}.
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {user.email}
            </p>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Today
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {meals.length} {meals.length === 1 ? "meal" : "meals"}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <Stat label="Calories" value={Math.round(totals.calories)} />
            <Stat label="Protein" value={`${totals.protein_g.toFixed(0)}g`} />
            <Stat label="Carbs" value={`${totals.carbs_g.toFixed(0)}g`} />
            <Stat label="Fat" value={`${totals.fat_g.toFixed(0)}g`} />
          </div>

          <MealList meals={meals} />
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Log a meal
          </h2>
          <AddMealForm />
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-zinc-100 px-3 py-2 text-center dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
    </div>
  );
}
