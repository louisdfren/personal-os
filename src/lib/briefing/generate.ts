import type { SupabaseClient } from "@supabase/supabase-js";
import { anthropic, MODELS } from "@/lib/anthropic/client";

export type Briefing = {
  headline: string;
  body: string;
  recovery_call: string;
  nutrition_call: string;
  schedule_call: string;
  watch_for: string;
};

const SYSTEM_PROMPT = `You are Louis's personal-OS morning analyst. Louis is a UK commercial property developer and commodity broker in his 30s who lifts and runs.

Each morning you write him a short briefing reading recent Whoop, calendar and nutrition data. Style rules:

- Plain English, British spelling, warm but direct. No corporate filler.
- AVOID AI-tells: never use "key", "leverage", "delve", "navigate", "robust", "comprehensive", "holistic", "ensure", "utilise", "in today's fast-paced…", or negative parallelisms ("not just X, it's Y").
- Lead with the verdict, then justify briefly.
- Talk like a smart coach who actually read the data, not a productivity guru.
- Use specific numbers from the data, not generic advice.
- Each field is one short paragraph (1-3 sentences), no headers, no lists.

Always call the write_briefing tool. Always write all six fields.`;

const TOOL_DEFINITION = {
  name: "write_briefing",
  description: "Compose Louis's morning briefing.",
  input_schema: {
    type: "object" as const,
    properties: {
      headline: {
        type: "string",
        description: "One sentence verdict on the day ahead. ≤ 100 chars.",
      },
      body: {
        type: "string",
        description:
          "2-3 sentence summary tying recovery, schedule and nutrition together. ≤ 400 chars.",
      },
      recovery_call: {
        type: "string",
        description:
          "How to use today's recovery — push hard, moderate, or rest. Reference HRV/recovery numbers if useful. ≤ 300 chars.",
      },
      nutrition_call: {
        type: "string",
        description:
          "Macro plan for the day. Reference remaining/target if known. ≤ 300 chars.",
      },
      schedule_call: {
        type: "string",
        description:
          "One observation about today's calendar — density, back-to-backs, anything notable. ≤ 300 chars.",
      },
      watch_for: {
        type: "string",
        description:
          "1-2 things to monitor based on trends (e.g. HRV trending down, sleep debt, calorie surplus run). ≤ 300 chars.",
      },
    },
    required: [
      "headline",
      "body",
      "recovery_call",
      "nutrition_call",
      "schedule_call",
      "watch_for",
    ],
  },
};

export type BriefingInput = {
  todayDateLabel: string;
  today: {
    recovery: number | null;
    hrv: number | null;
    restingHr: number | null;
    strain: number | null;
    sleepHours: number | null;
    sleepPerformancePct: number | null;
  };
  recent7Days: Array<{
    date: string;
    recovery: number | null;
    hrv: number | null;
    strain: number | null;
    kcalIn: number | null;
    kcalOut: number | null;
    sleepHours: number | null;
  }>;
  todaysEvents: Array<{ summary: string; start: string; end: string; allDay: boolean }>;
  todaysMealsSoFar: Array<{ name: string; calories: number }>;
  targets: {
    daily_calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null;
  totalsSoFar: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
};

function summarisePrompt(input: BriefingInput): string {
  const t = input.today;
  const todayLines = [
    `Recovery: ${t.recovery != null ? `${Math.round(t.recovery)}%` : "—"}`,
    `HRV: ${t.hrv != null ? `${Math.round(t.hrv)} ms` : "—"}`,
    `Resting HR: ${t.restingHr != null ? `${Math.round(t.restingHr)} bpm` : "—"}`,
    `Cycle strain so far: ${t.strain != null ? t.strain.toFixed(1) : "—"}`,
    `Last night's sleep: ${t.sleepHours != null ? `${t.sleepHours.toFixed(1)}h` : "—"}${
      t.sleepPerformancePct != null ? ` (${Math.round(t.sleepPerformancePct)}% of need)` : ""
    }`,
  ].join("\n  ");

  const trendLines = input.recent7Days
    .map(
      (d) =>
        `  ${d.date}: rec ${d.recovery != null ? Math.round(d.recovery) + "%" : "—"} · HRV ${
          d.hrv != null ? Math.round(d.hrv) + "ms" : "—"
        } · strain ${d.strain != null ? d.strain.toFixed(1) : "—"} · sleep ${
          d.sleepHours != null ? d.sleepHours.toFixed(1) + "h" : "—"
        } · ${d.kcalIn ?? "?"} kcal in / ${d.kcalOut ?? "?"} kcal out`,
    )
    .join("\n");

  const eventLines =
    input.todaysEvents.length === 0
      ? "  (nothing scheduled)"
      : input.todaysEvents
          .map(
            (e) =>
              `  ${e.allDay ? "all-day" : `${e.start.slice(11, 16)}–${e.end.slice(11, 16)}`} · ${e.summary}`,
          )
          .join("\n");

  const mealsLines =
    input.todaysMealsSoFar.length === 0
      ? "  (nothing logged yet)"
      : input.todaysMealsSoFar.map((m) => `  ${m.name} (${m.calories} kcal)`).join("\n");

  const targetsBlock = input.targets
    ? `Targets: ${input.targets.daily_calories} kcal · ${input.targets.protein_g}g P · ${input.targets.carbs_g}g C · ${input.targets.fat_g}g F
So far: ${Math.round(input.totalsSoFar.calories)} kcal · ${Math.round(input.totalsSoFar.protein_g)}g P · ${Math.round(input.totalsSoFar.carbs_g)}g C · ${Math.round(input.totalsSoFar.fat_g)}g F
Remaining: ${Math.max(0, input.targets.daily_calories - input.totalsSoFar.calories)} kcal · ${Math.max(0, input.targets.protein_g - input.totalsSoFar.protein_g)}g P · ${Math.max(0, input.targets.carbs_g - input.totalsSoFar.carbs_g)}g C · ${Math.max(0, input.targets.fat_g - input.totalsSoFar.fat_g)}g F`
    : "Targets: not set";

  return `Date: ${input.todayDateLabel} (Europe/London).

Today's metrics:
  ${todayLines}

Last 7 days:
${trendLines}

Today's calendar:
${eventLines}

Meals logged today:
${mealsLines}

${targetsBlock}

Write the briefing now.`;
}

export async function generateBriefing(
  supabase: SupabaseClient,
  userId: string,
  input: BriefingInput,
): Promise<Briefing> {
  const userPrompt = summarisePrompt(input);
  const response = await anthropic().messages.create({
    model: MODELS.sonnet,
    max_tokens: 1200,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: [TOOL_DEFINITION],
    tool_choice: { type: "tool", name: "write_briefing" },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUse = response.content.find(
    (b) => b.type === "tool_use" && b.name === "write_briefing",
  );
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a briefing.");
  }
  const briefing = toolUse.input as Briefing;

  const { error } = await supabase
    .from("daily_briefings")
    .upsert(
      {
        user_id: userId,
        briefing_date: input.todayDateLabel,
        headline: briefing.headline,
        body: briefing.body,
        recovery_call: briefing.recovery_call,
        nutrition_call: briefing.nutrition_call,
        schedule_call: briefing.schedule_call,
        watch_for: briefing.watch_for,
        model: MODELS.sonnet,
        raw: briefing,
      },
      { onConflict: "user_id,briefing_date" },
    );
  if (error) throw new Error(`Briefing persist failed: ${error.message}`);

  return briefing;
}
