import type { SupabaseClient } from "@supabase/supabase-js";
import { WHOOP_API_BASE } from "./config";
import { refreshTokens } from "./oauth";

export type WhoopTokenRow = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
  whoop_user_id: number | null;
};

const REFRESH_LEEWAY_MS = 60_000;

async function ensureFreshTokens(
  supabase: SupabaseClient,
  userId: string,
): Promise<WhoopTokenRow> {
  const { data, error } = await supabase
    .from("whoop_tokens")
    .select("user_id, access_token, refresh_token, expires_at, scope, whoop_user_id")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Whoop not connected for this user");
  }

  const expiresAt = new Date(data.expires_at).getTime();
  if (expiresAt - Date.now() > REFRESH_LEEWAY_MS) {
    return data as WhoopTokenRow;
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Whoop client credentials missing");
  }

  const refreshed = await refreshTokens({
    refreshToken: data.refresh_token,
    clientId,
    clientSecret,
  });

  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  const { data: updated, error: updateErr } = await supabase
    .from("whoop_tokens")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: newExpiresAt,
      scope: refreshed.scope,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("user_id, access_token, refresh_token, expires_at, scope, whoop_user_id")
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to persist refreshed Whoop tokens: ${updateErr?.message}`);
  }

  return updated as WhoopTokenRow;
}

export async function whoopFetch(
  supabase: SupabaseClient,
  userId: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  let tokens = await ensureFreshTokens(supabase, userId);

  const doFetch = (accessToken: string) =>
    fetch(`${WHOOP_API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

  let res = await doFetch(tokens.access_token);

  if (res.status === 401) {
    // Force a refresh by marking the token as expired in our local copy, then retry once.
    const clientId = process.env.WHOOP_CLIENT_ID!;
    const clientSecret = process.env.WHOOP_CLIENT_SECRET!;
    const refreshed = await refreshTokens({
      refreshToken: tokens.refresh_token,
      clientId,
      clientSecret,
    });
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from("whoop_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: newExpiresAt,
        scope: refreshed.scope,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select("user_id, access_token, refresh_token, expires_at, scope, whoop_user_id")
      .single();
    if (updateErr || !updated) {
      throw new Error(`Failed to persist refreshed Whoop tokens after 401: ${updateErr?.message}`);
    }
    tokens = updated as WhoopTokenRow;
    res = await doFetch(tokens.access_token);
  }

  return res;
}

export type PaginatedCollection<T> = {
  records: T[];
  next_token?: string | null;
};

export async function whoopGetPaginated<T>(
  supabase: SupabaseClient,
  userId: string,
  path: string,
  query: { start?: string; end?: string; limit?: number },
): Promise<T[]> {
  const records: T[] = [];
  let nextToken: string | undefined;

  for (let page = 0; page < 200; page++) {
    const params = new URLSearchParams();
    if (query.start) params.set("start", query.start);
    if (query.end) params.set("end", query.end);
    params.set("limit", String(query.limit ?? 25));
    if (nextToken) params.set("nextToken", nextToken);

    const res = await whoopFetch(supabase, userId, `${path}?${params.toString()}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Whoop GET ${path} failed: ${res.status} ${text}`);
    }
    const body = (await res.json()) as PaginatedCollection<T>;
    records.push(...(body.records ?? []));
    if (!body.next_token) break;
    nextToken = body.next_token;
  }

  return records;
}
