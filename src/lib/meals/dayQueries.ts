import { createClient } from "@/lib/supabase/server";
import { getDayRange } from "@/lib/time/today";
import type { Meal } from "./types";

export async function getMealsForDay(dateLabel: string): Promise<Meal[]> {
  const supabase = await createClient();
  const { startIso, endIso } = getDayRange(dateLabel);
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .gte("eaten_at", startIso)
    .lt("eaten_at", endIso)
    .order("eaten_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Meal[];
}
