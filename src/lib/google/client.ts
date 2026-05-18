import type { SupabaseClient } from "@supabase/supabase-js";
import { GOOGLE_API_BASE } from "./config";
import { refreshTokens } from "./oauth";

type CalendarTokenRow = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
  google_email: string | null;
};

const REFRESH_LEEWAY_MS = 60_000;

async function ensureFreshTokens(
  supabase: SupabaseClient,
  userId: string,
): Promise<CalendarTokenRow> {
  const { data, error } = await supabase
    .from("calendar_tokens")
    .select("user_id, access_token, refresh_token, expires_at, scope, google_email")
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("Google not connected for this user");

  const expiresAt = new Date(data.expires_at).getTime();
  if (expiresAt - Date.now() > REFRESH_LEEWAY_MS) return data as CalendarTokenRow;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google client credentials missing");

  const refreshed = await refreshTokens({
    refreshToken: data.refresh_token,
    clientId,
    clientSecret,
  });

  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  const update: Record<string, string> = {
    access_token: refreshed.access_token,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  };
  if (refreshed.scope) update.scope = refreshed.scope;
  if (refreshed.refresh_token) update.refresh_token = refreshed.refresh_token;

  const { data: updated, error: updateErr } = await supabase
    .from("calendar_tokens")
    .update(update)
    .eq("user_id", userId)
    .select("user_id, access_token, refresh_token, expires_at, scope, google_email")
    .single();
  if (updateErr || !updated) {
    throw new Error(`Failed to persist refreshed Google tokens: ${updateErr?.message}`);
  }
  return updated as CalendarTokenRow;
}

export async function googleFetch(
  supabase: SupabaseClient,
  userId: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  let tokens = await ensureFreshTokens(supabase, userId);
  const doFetch = (token: string) =>
    fetch(`${GOOGLE_API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

  let res = await doFetch(tokens.access_token);
  if (res.status === 401) {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const refreshed = await refreshTokens({
      refreshToken: tokens.refresh_token,
      clientId,
      clientSecret,
    });
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    const update: Record<string, string> = {
      access_token: refreshed.access_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    };
    if (refreshed.scope) update.scope = refreshed.scope;
    if (refreshed.refresh_token) update.refresh_token = refreshed.refresh_token;
    const { data: updated, error: updateErr } = await supabase
      .from("calendar_tokens")
      .update(update)
      .eq("user_id", userId)
      .select("user_id, access_token, refresh_token, expires_at, scope, google_email")
      .single();
    if (updateErr || !updated) {
      throw new Error(`Failed to persist refreshed Google tokens after 401: ${updateErr?.message}`);
    }
    tokens = updated as CalendarTokenRow;
    res = await doFetch(tokens.access_token);
  }
  return res;
}
