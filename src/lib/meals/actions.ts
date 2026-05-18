"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth/allowed-emails";
import { parseMealDescription } from "./parse";

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function addMeal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowed(user.email)) {
    return { error: "Not authorised." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const caloriesRaw = formData.get("calories");
  const calories = Number(caloriesRaw);

  if (!name) return { error: "Name is required." };
  if (!Number.isFinite(calories) || calories < 0) {
    return { error: "Calories must be a non-negative number." };
  }

  const { error } = await supabase.from("meals").insert({
    user_id: user.id,
    name,
    calories,
    protein_g: parseOptionalNumber(formData.get("protein_g")),
    carbs_g: parseOptionalNumber(formData.get("carbs_g")),
    fat_g: parseOptionalNumber(formData.get("fat_g")),
    notes: (String(formData.get("notes") ?? "").trim() || null),
  });

  if (error) {
    console.error("addMeal failed:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function logFromDescription(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowed(user.email)) {
    return { error: "Not authorised." };
  }

  const description = String(formData.get("description") ?? "").trim();
  if (!description) {
    return { error: "Tell me what you ate." };
  }

  let parsed;
  try {
    parsed = await parseMealDescription(description);
  } catch (err) {
    console.error("parseMealDescription failed:", err);
    return {
      error:
        err instanceof Error ? err.message : "Could not estimate macros.",
    };
  }

  const { error } = await supabase.from("meals").insert({
    user_id: user.id,
    name: parsed.name,
    calories: parsed.calories,
    protein_g: parsed.protein_g,
    carbs_g: parsed.carbs_g,
    fat_g: parsed.fat_g,
    notes: `[${parsed.confidence}] ${parsed.assumptions}`.slice(0, 500),
  });

  if (error) {
    console.error("logFromDescription insert failed:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true, parsed };
}

export async function deleteMeal(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowed(user.email)) return;

  const { error } = await supabase.from("meals").delete().eq("id", id);
  if (error) console.error("deleteMeal failed:", error);

  revalidatePath("/dashboard");
}
