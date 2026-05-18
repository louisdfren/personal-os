import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WHOOP_STATE_COOKIE, whoopRedirectUri } from "@/lib/whoop/config";
import { exchangeCodeForTokens } from "@/lib/whoop/oauth";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieState = request.cookies.get(WHOOP_STATE_COOKIE)?.value;

  const fail = (reason: string) => {
    const url = new URL(`${origin}/dashboard`);
    url.searchParams.set("whoop", `error_${reason}`);
    const res = NextResponse.redirect(url.toString());
    res.cookies.delete(WHOOP_STATE_COOKIE);
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

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("missing_config");

  let tokens;
  try {
    tokens = await exchangeCodeForTokens({
      code,
      redirectUri: whoopRedirectUri(origin),
      clientId,
      clientSecret,
    });
  } catch (e) {
    console.error("Whoop token exchange failed", e);
    return fail("exchange_failed");
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error: upsertErr } = await supabase
    .from("whoop_tokens")
    .upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope,
      updated_at: new Date().toISOString(),
    });

  if (upsertErr) {
    console.error("Whoop token persist failed", upsertErr);
    return fail("persist_failed");
  }

  const url = new URL(`${origin}/dashboard`);
  url.searchParams.set("whoop", "connected");
  const res = NextResponse.redirect(url.toString());
  res.cookies.delete(WHOOP_STATE_COOKIE);
  return res;
}
