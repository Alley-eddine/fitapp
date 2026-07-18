/**
 * Pure workout calorie logic — no infrastructure imports, so it stays unit
 * testable without a database or environment configuration.
 */

export const MET_BY_TYPE: Record<string, number> = { muscu: 5, cardio: 8, hiit: 10 };

export interface ExerciseLike {
  exerciseType?: string;
}

/**
 * Estimates calories burned: MET x weight(kg) x duration(h). MET is the average
 * across the workout's exercise types (defaults to a moderate 6).
 */
export const estimateCalories = (
  durationMinutes: number,
  weightKg: number,
  exercises: ExerciseLike[] | undefined
): number => {
  let met = 6;
  if (exercises && exercises.length > 0) {
    const mets = exercises.map((e) => MET_BY_TYPE[e.exerciseType ?? 'muscu'] ?? 6);
    met = mets.reduce((a, b) => a + b, 0) / mets.length;
  }
  return Math.round(met * weightKg * (durationMinutes / 60));
};
