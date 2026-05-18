import { createClient } from "@/lib/supabase/server";

export type WhoopStatus =
  | { connected: false }
  | {
      connected: true;
      lastSyncAt: string | null;
    };

export async function getWhoopStatus(): Promise<WhoopStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { connected: false };

  const { data: token } = await supabase
    .from("whoop_tokens")
    .select("user_id, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!token) return { connected: false };

  const { data: latest } = await supabase
    .from("whoop_recovery")
    .select("whoop_updated_at")
    .eq("user_id", user.id)
    .order("whoop_updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { connected: true, lastSyncAt: latest?.whoop_updated_at ?? null };
}
