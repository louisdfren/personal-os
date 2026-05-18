"use server";

import { createClient } from "@/lib/supabase/server";
import { getMealsToday } from "@/lib/meals/queries";
import { sumMeals } from "@/lib/meals/types";
import { getTargets } from "@/lib/targets/queries";
import { suggestRecipes, type RecipeSuggestion } from "./suggest";

export async function getRecipeIdeas(): Promise<
  { ok: true; suggestions: RecipeSuggestion[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const [targets, meals] = await Promise.all([getTargets(), getMealsToday()]);
  if (!targets) {
    return { ok: false, error: "Set your daily targets first." };
  }
  const totals = sumMeals(meals);
  const remaining = {
    calories: Math.max(0, targets.daily_calories - totals.calories),
    protein_g: Math.max(0, targets.protein_g - totals.protein_g),
    carbs_g: Math.max(0, targets.carbs_g - totals.carbs_g),
    fat_g: Math.max(0, targets.fat_g - totals.fat_g),
  };
  const londonTimeHHmm = new Date().toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  });

  try {
    const suggestions = await suggestRecipes({
      remaining,
      consumedSoFar: meals.map((m) => ({ name: m.name, calories: m.calories })),
      londonTimeHHmm,
    });
    return { ok: true, suggestions };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
