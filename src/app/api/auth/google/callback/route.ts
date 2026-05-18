import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GOOGLE_STATE_COOKIE, googleRedirectUri } from "@/lib/google/config";
import { exchangeCodeForTokens, parseEmailFromIdToken } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const cookieState = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;

  const fail = (reason: string) => {
    const url = new URL(`${origin}/dashboard`);
    url.searchParams.set("google", `error_${reason}`);
    const res = NextResponse.redirect(url.toString());
    res.cookies.delete(GOOGLE_STATE_COOKIE);
    return res;
  };

  if (error) return fail(error);
  if (!code || !state) return fail("missing_code");
  if (!cookieState || cookieState !== state) return fail("state_mismatch");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("not_signed_in");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("missing_config");

  let tokens;
  try {
    tokens = await exchangeCodeForTokens({
      code,
      redirectUri: googleRedirectUri(origin),
      clientId,
      clientSecret,
    });
  } catch (e) {
    console.error("Google token exchange failed", e);
    return fail("exchange_failed");
  }

  if (!tokens.refresh_token) {
    // Google only returns a refresh token on first consent. Make the user revoke
    // and retry rather than silently storing a non-refreshable connection.
    return fail("no_refresh_token");
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const googleEmail = parseEmailFromIdToken(tokens.id_token);

  const { error: upsertErr } = await supabase
    .from("calendar_tokens")
    .upsert({
      user_id: user.id,
      google_email: googleEmail,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope,
      updated_at: new Date().toISOString(),
    });

  if (upsertErr) {
    console.error("Google token persist failed", upsertErr);
    return fail("persist_failed");
  }

  const url = new URL(`${origin}/dashboard`);
  url.searchParams.set("google", "connected");
  const res = NextResponse.redirect(url.toString());
  res.cookies.delete(GOOGLE_STATE_COOKIE);
  return res;
}
