import { describe, it, expect } from 'vitest';
import { createProgramSchema, assignProgramSchema } from '@fitapp/shared';

const day = (dayOfWeek: number, title = 'Dos / Biceps') => ({
  dayOfWeek,
  title,
  exercises: [{ name: 'Tractions', sets: 4, reps: 8, restSeconds: 90 }],
});

describe('createProgramSchema', () => {
  it('accepts a weekly program', () => {
    const parsed = createProgramSchema.safeParse({
      name: 'PHASE 1',
      phase: 1,
      days: [day(1), day(3, 'Pectoraux'), day(5, 'Jambes')],
    });
    expect(parsed.success).toBe(true);
  });

  it('defaults exercises to an empty array', () => {
    const parsed = createProgramSchema.parse({
      name: 'Repos actif',
      days: [{ dayOfWeek: 7, title: 'Marche' }],
    });
    expect(parsed.days[0]?.exercises).toEqual([]);
  });

  it('rejects the same weekday twice', () => {
    const parsed = createProgramSchema.safeParse({
      name: 'Doublon',
      days: [day(2), day(2, 'Autre')],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a weekday outside 1..7', () => {
    expect(createProgramSchema.safeParse({ name: 'X', days: [day(0)] }).success).toBe(false);
    expect(createProgramSchema.safeParse({ name: 'X', days: [day(8)] }).success).toBe(false);
  });

  it('rejects more than 7 days', () => {
    const days = [1, 2, 3, 4, 5, 6, 7].map((d) => day(d));
    expect(createProgramSchema.safeParse({ name: 'OK', days }).success).toBe(true);
    expect(
      createProgramSchema.safeParse({ name: 'Trop', days: [...days, day(1)] }).success
    ).toBe(false);
  });

  it('requires a name', () => {
    expect(createProgramSchema.safeParse({ name: '', days: [] }).success).toBe(false);
  });

  it('coerces numeric strings inside exercises', () => {
    const parsed = createProgramSchema.parse({
      name: 'Coercition',
      days: [{ dayOfWeek: 1, title: 'Dos', exercises: [{ name: 'Rowing', sets: '4', weightKg: '60.00' }] }],
    });
    expect(parsed.days[0]?.exercises[0]?.sets).toBe(4);
    expect(parsed.days[0]?.exercises[0]?.weightKg).toBe(60);
  });
});

describe('assignProgramSchema', () => {
  it('accepts a student id', () => {
    const parsed = assignProgramSchema.safeParse({
      studentId: '3f6d1c9e-0b2a-4c8d-9e1f-5a7b3c2d1e0f',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a non-uuid student id', () => {
    expect(assignProgramSchema.safeParse({ studentId: 'abc' }).success).toBe(false);
  });

  it('accepts an optional start date', () => {
    const parsed = assignProgramSchema.safeParse({
      studentId: '3f6d1c9e-0b2a-4c8d-9e1f-5a7b3c2d1e0f',
      startDate: '2026-07-01',
    });
    expect(parsed.success).toBe(true);
  });
});
