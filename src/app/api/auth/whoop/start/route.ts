import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  WHOOP_AUTHORIZE_URL,
  WHOOP_SCOPE_STRING,
  WHOOP_STATE_COOKIE,
  whoopRedirectUri,
} from "@/lib/whoop/config";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { origin } = new URL(request.url);

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${origin}/dashboard?whoop=missing_config`);
  }

  const state = randomBytes(24).toString("hex");

  const authorize = new URL(WHOOP_AUTHORIZE_URL);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", whoopRedirectUri(origin));
  authorize.searchParams.set("scope", WHOOP_SCOPE_STRING);
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize.toString());
  response.cookies.set(WHOOP_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
