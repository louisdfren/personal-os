export const WHOOP_AUTHORIZE_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
export const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
export const WHOOP_API_BASE = "https://api.prod.whoop.com/developer";

export const WHOOP_SCOPES = [
  "offline",
  "read:recovery",
  "read:sleep",
  "read:workout",
  "read:cycles",
  "read:profile",
  "read:body_measurement",
] as const;

export const WHOOP_SCOPE_STRING = WHOOP_SCOPES.join(" ");

export const WHOOP_STATE_COOKIE = "whoop_oauth_state";

export function whoopRedirectUri(origin: string) {
  return `${origin}/api/auth/whoop/callback`;
}
