export const ALLOWED_EMAILS = [
  "louis.frendo@matterhorncapital.co.uk",
  "louisdfrendo@icloud.com",
] as const;

export function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase() as (typeof ALLOWED_EMAILS)[number]);
}
