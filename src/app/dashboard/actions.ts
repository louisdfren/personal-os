"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncWhoopWindow } from "@/lib/whoop/sync";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function refreshWhoop(): Promise<{ ok: true; counts: { recovery: number; sleep: number; workouts: number; cycles: number } } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: latest } = await supabase
    .from("whoop_recovery")
    .select("whoop_updated_at")
    .eq("user_id", user.id)
    .order("whoop_updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date();
  const start = latest?.whoop_updated_at
    ? new Date(new Date(latest.whoop_updated_at).getTime() - 24 * 60 * 60 * 1000)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    const counts = await syncWhoopWindow(
      supabase,
      user.id,
      start.toISOString(),
      now.toISOString(),
    );
    revalidatePath("/dashboard");
    return { ok: true, counts };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message };
  }
}
