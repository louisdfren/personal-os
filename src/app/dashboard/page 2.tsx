import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth/allowed-emails";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAllowed(user.email)) {
    await supabase.auth.signOut();
    redirect("/login?error=not_allowed");
  }

  const name = user.email?.split("@")[0] ?? "you";

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Personal OS
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Hello, {name}.
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {user.email}
            </p>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Phase 1 complete
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            You're signed in, the database is connected, and this page is
            protected. Coming next: Phase 2 (food logging), Phase 3 (Whoop), Phase
            4 (calendar), Phase 5 (the unified dashboard).
          </p>
        </section>
      </div>
    </main>
  );
}
