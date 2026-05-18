export const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_API_BASE = "https://www.googleapis.com";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

export const GOOGLE_SCOPE_STRING = GOOGLE_SCOPES.join(" ");

export const GOOGLE_STATE_COOKIE = "google_oauth_state";

export function googleRedirectUri(origin: string) {
  return `${origin}/api/auth/google/callback`;
}
