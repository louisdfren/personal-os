import { anthropic, MODELS } from "@/lib/anthropic/client";

export type ParsedMeal = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "high" | "medium" | "low";
  assumptions: string;
};

const SYSTEM_PROMPT = `You are a nutrition analyst for a personal dietary tracker used by a UK adult.

Your job: given a freeform description of a meal, estimate the macronutrients as accurately as you can and return them via the log_meal tool.

Guidelines:
- Use standard UK food composition databases (NHS, McCance & Widdowson) as your reference.
- If portion sizes are ambiguous, assume an average UK adult serving for that food.
- If a brand is named (e.g. "Co-op rump steak"), estimate based on the standard product unless you have specific knowledge of that brand.
- The "name" should be a short, human-readable label (max 60 chars).
- Round calories to the nearest integer; round macros to 1 decimal place.
- "confidence" reflects how sure you are given the description's specificity:
  - "high": specific weights/sizes given (e.g. "200g rump steak, 4 large eggs")
  - "medium": typical foods with implied portions (e.g. "rump steak, eggs, olive oil")
  - "low": vague descriptions (e.g. "a bit of steak and some eggs")
- "assumptions" lists any portion sizes or interpretations you had to guess at, so the user can correct them. Keep under 200 chars. Use British spelling.
- Always call the log_meal tool — never refuse to estimate.`;

const TOOL_DEFINITION = {
  name: "log_meal",
  description: "Record the estimated macros for the meal the user described.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Short, human-readable meal name (max 60 characters).",
      },
      calories: {
        type: "integer",
        description: "Total kcal for the whole meal (rounded to integer).",
      },
      protein_g: {
        type: "number",
        description: "Grams of protein in the whole meal (1 decimal place).",
      },
      carbs_g: {
        type: "number",
        description: "Grams of carbohydrate in the whole meal (1 decimal place).",
      },
      fat_g: {
        type: "number",
        description: "Grams of fat in the whole meal (1 decimal place).",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "How confident you are in the estimate.",
      },
      assumptions: {
        type: "string",
        description:
          "Any portion sizes or interpretations you guessed at, so the user can correct. Max 200 chars. British spelling.",
      },
    },
    required: [
      "name",
      "calories",
      "protein_g",
      "carbs_g",
      "fat_g",
      "confidence",
      "assumptions",
    ],
  },
};

export async function parseMealDescription(text: string): Promise<ParsedMeal> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Empty meal description");

  const response = await anthropic().messages.create({
    model: MODELS.haiku,
    max_tokens: 600,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [TOOL_DEFINITION],
    tool_choice: { type: "tool", name: "log_meal" },
    messages: [{ role: "user", content: trimmed }],
  });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "log_meal",
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a structured meal estimate.");
  }

  return toolUse.input as ParsedMeal;
}
