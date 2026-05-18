import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth/allowed-emails";
import { getDailySeries } from "@/lib/aggregates";
import { getMealsToday } from "@/lib/meals/queries";
import { sumMeals } from "@/lib/meals/types";
import { getWhoopStatus } from "@/lib/whoop/queries";
import { getWorkouts, joinRecovery } from "@/lib/whoop/workoutsQuery";
import { getCalendarStatus, getEventsForToday } from "@/lib/google/queries";
import { getTargets } from "@/lib/targets/queries";
import { getTodayBriefing } from "@/lib/briefing/queries";
import { signOut } from "./actions";
import { AddMealForm } from "./AddMealForm";
import { AdherenceStrip } from "./AdherenceStrip";
import { BriefingSection } from "./BriefingSection";
import { CalendarSection } from "./CalendarSection";
import { HistoryCalendar } from "./HistoryCalendar";
import { MacrosProgress } from "./MacrosProgress";
import { MealList } from "./MealList";
import { RecipeIdeas } from "./RecipeIdeas";
import { SmartMealForm } from "./SmartMealForm";
import { TargetsForm } from "./TargetsForm";
import { TodayStrip } from "./TodayStrip";
import { TrendsSection } from "./TrendsSection";
import { WhoopSection } from "./WhoopSection";

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

  const [meals, whoop, series, workouts, calendar, todaysEvents, targets, briefing] =
    await Promise.all([
      getMealsToday(),
      getWhoopStatus(),
      getDailySeries(365),
      getWorkouts(365),
      getCalendarStatus(),
      getEventsForToday(),
      getTargets(),
      getTodayBriefing(),
    ]);
  const totals = sumMeals(meals);

  const recoveryByDate = new Map(series.map((p) => [p.date, p.recovery]));
  const workoutsJoined = joinRecovery(workouts, recoveryByDate);

  const name = user.email?.split("@")[0] ?? "you";

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Personal OS
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Hello, {name}.
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>
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

        <BriefingSection briefing={briefing} />

        <TodayStrip series={series.slice(-30)} />

        <WhoopSection
          connected={whoop.connected}
          lastSyncAt={whoop.connected ? whoop.lastSyncAt : null}
        />

        <CalendarSection
          connected={calendar.connected}
          email={calendar.connected ? calendar.email : null}
          lastSyncAt={calendar.connected ? calendar.lastSyncAt : null}
          events={todaysEvents}
        />

        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Today's meals
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {meals.length} {meals.length === 1 ? "meal" : "meals"}
            </p>
          </div>

          {targets ? (
            <>
              <MacrosProgress totals={totals} targets={targets} />
              <AdherenceStrip series={series} targets={targets} />
            </>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              <Stat label="Calories" value={Math.round(totals.calories)} />
              <Stat label="Protein" value={`${totals.protein_g.toFixed(0)}g`} />
              <Stat label="Carbs" value={`${totals.carbs_g.toFixed(0)}g`} />
              <Stat label="Fat" value={`${totals.fat_g.toFixed(0)}g`} />
            </div>
          )}

          <MealList meals={meals} />
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Meal ideas
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Claude suggests three meals that close today's macro gap.
            </p>
          </div>
          <RecipeIdeas />
        </section>

        <details className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Daily macros targets
          </summary>
          <div className="mt-4">
            <TargetsForm current={targets} />
          </div>
        </details>

        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Log a meal
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Describe what you ate and Claude estimates the macros.
            </p>
          </div>
          <SmartMealForm />
        </section>

        <details className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Log manually with exact macros
          </summary>
          <div className="mt-4">
            <AddMealForm />
          </div>
        </details>

        <HistoryCalendar series={series} />

        <TrendsSection series={series} workouts={workoutsJoined} targets={targets} />
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
