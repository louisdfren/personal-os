"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth/allowed-emails";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { error: "Email required." };
  }

  if (!isAllowed(email)) {
    return { error: "This email isn't on the allow-list." };
  }

  const supabase = await createClient();
  const headerList = await headers();
  const origin = headerList.get("origin") ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { sent: true };
}
