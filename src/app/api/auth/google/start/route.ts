import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  GOOGLE_AUTHORIZE_URL,
  GOOGLE_SCOPE_STRING,
  GOOGLE_STATE_COOKIE,
  googleRedirectUri,
} from "@/lib/google/config";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { origin } = new URL(request.url);

  if (!user) return NextResponse.redirect(`${origin}/login`);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${origin}/dashboard?google=missing_config`);
  }

  const state = randomBytes(24).toString("hex");
  const authorize = new URL(GOOGLE_AUTHORIZE_URL);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", googleRedirectUri(origin));
  authorize.searchParams.set("scope", GOOGLE_SCOPE_STRING);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("access_type", "offline");
  authorize.searchParams.set("prompt", "consent");
  authorize.searchParams.set("include_granted_scopes", "true");

  const response = NextResponse.redirect(authorize.toString());
  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
