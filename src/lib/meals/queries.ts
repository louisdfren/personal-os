import { createClient } from "@/lib/supabase/server";
import { getTodayRange } from "@/lib/time/today";
import type { Meal } from "./types";

export async function getMealsToday(): Promise<Meal[]> {
  const supabase = await createClient();
  const { startIso, endIso } = getTodayRange();

  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .gte("eaten_at", startIso)
    .lt("eaten_at", endIso)
    .order("eaten_at", { ascending: false });

  if (error) {
    console.error("getMealsToday failed:", error);
    return [];
  }

  return (data ?? []) as Meal[];
}
