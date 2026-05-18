export const KJ_TO_KCAL = 1 / 4.184;

export type DailyPoint = {
  date: string;
  recovery: number | null;
  hrv: number | null;
  restingHr: number | null;
  strain: number | null;
  kcalBurnt: number | null;
  kcalIntake: number | null;
  sleepAsleepMs: number | null;
  workoutCount: number;
};

export type Baseline = { mean: number; std: number; n: number };

export function baseline(values: Array<number | null>): Baseline | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length < 3) return null;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return { mean, std: Math.sqrt(variance), n: nums.length };
}

export function rollingMean(values: Array<number | null>, window: number): Array<number | null> {
  const out: Array<number | null> = [];
  for (let i = 0; i < values.length; i++) {
    const slice = values
      .slice(Math.max(0, i - window + 1), i + 1)
      .filter((v): v is number => v != null);
    out.push(slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null);
  }
  return out;
}
