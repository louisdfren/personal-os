import { createClient } from "@/lib/supabase/server";

export type MacrosTargets = {
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export async function getTargets(): Promise<MacrosTargets | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("macros_targets")
    .select("daily_calories, protein_g, carbs_g, fat_g")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as MacrosTargets) ?? null;
}
