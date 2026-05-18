"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveTargets(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const daily_calories = Number(formData.get("daily_calories") ?? 0);
  const protein_g = Number(formData.get("protein_g") ?? 0);
  const carbs_g = Number(formData.get("carbs_g") ?? 0);
  const fat_g = Number(formData.get("fat_g") ?? 0);

  if (![daily_calories, protein_g, carbs_g, fat_g].every((n) => Number.isFinite(n) && n >= 0)) {
    return { error: "Targets must be non-negative numbers." };
  }

  const { error } = await supabase.from("macros_targets").upsert({
    user_id: user.id,
    daily_calories,
    protein_g,
    carbs_g,
    fat_g,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}
