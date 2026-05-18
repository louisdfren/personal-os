import { anthropic, MODELS } from "@/lib/anthropic/client";

export type RecipeSuggestion = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: string[];
  prep_minutes: number;
  why_it_fits: string;
};

const SYSTEM_PROMPT = `You are a UK personal chef and nutrition coach helping the user hit their daily macros.

Given their remaining macros for the day (calories, protein, carbs, fat) and the time of day, suggest 3 meal options that:
- Together or individually help fill the gap (you don't have to perfectly hit every macro, but lean toward protein-heavy options if protein is the gap)
- Are realistic UK-supermarket / home-kitchen meals (no exotic ingredients)
- Match the time of day (don't suggest porridge for dinner)
- Take under 30 minutes to prep unless the user has clearly got a free evening

For each suggestion call the suggest_meal tool. Always call the tool 3 times — one per option.

British spelling. Be specific (g/ml/units). "why_it_fits" should be one short sentence about what gap this fills.`;

const TOOL_DEFINITION = {
  name: "suggest_meal",
  description: "Propose one meal option for the user.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "Short meal name (max 60 chars)." },
      calories: { type: "integer" },
      protein_g: { type: "number" },
      carbs_g: { type: "number" },
      fat_g: { type: "number" },
      ingredients: {
        type: "array",
        items: { type: "string" },
        description: "Shopping-list ingredients with quantities, e.g. '200g chicken breast'.",
      },
      prep_minutes: { type: "integer" },
      why_it_fits: { type: "string", description: "One sentence on why this hits the macro gap." },
    },
    required: ["name", "calories", "protein_g", "carbs_g", "fat_g", "ingredients", "prep_minutes", "why_it_fits"],
  },
};

export async function suggestRecipes(input: {
  remaining: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  consumedSoFar: Array<{ name: string; calories: number }>;
  londonTimeHHmm: string;
}): Promise<RecipeSuggestion[]> {
  const prompt = `Time now: ${input.londonTimeHHmm} (Europe/London).

Already eaten today: ${
    input.consumedSoFar.length === 0
      ? "nothing yet."
      : input.consumedSoFar.map((m) => `${m.name} (${m.calories} kcal)`).join("; ")
  }.

Remaining macros for the day:
- Calories: ${Math.round(input.remaining.calories)} kcal
- Protein: ${Math.round(input.remaining.protein_g)}g
- Carbs: ${Math.round(input.remaining.carbs_g)}g
- Fat: ${Math.round(input.remaining.fat_g)}g

Suggest 3 meal options now.`;

  const response = await anthropic().messages.create({
    model: MODELS.haiku,
    max_tokens: 1400,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: [TOOL_DEFINITION],
    tool_choice: { type: "any" },
    messages: [{ role: "user", content: prompt }],
  });

  const suggestions: RecipeSuggestion[] = [];
  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "suggest_meal") {
      suggestions.push(block.input as RecipeSuggestion);
    }
  }
  return suggestions;
}
