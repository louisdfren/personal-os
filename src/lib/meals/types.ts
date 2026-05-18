export type Meal = {
  id: string;
  user_id: string;
  eaten_at: string;
  name: string;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  notes: string | null;
  created_at: string;
};

export type MealTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function sumMeals(meals: Meal[]): MealTotals {
  return meals.reduce<MealTotals>(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein_g: acc.protein_g + (m.protein_g ?? 0),
      carbs_g: acc.carbs_g + (m.carbs_g ?? 0),
      fat_g: acc.fat_g + (m.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}
