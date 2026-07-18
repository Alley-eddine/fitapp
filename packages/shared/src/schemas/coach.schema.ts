import { z } from 'zod';
import { exerciseInputSchema } from './workout.schema.js';

/** A coach invites someone; the email is optional (a shareable link is enough). */
export const createInvitationSchema = z.object({
  email: z.string().email().max(255).optional(),
});

export const invitationStatusSchema = z.enum(['pending', 'accepted', 'revoked']);

/** One training day of the week: 1 = Monday … 7 = Sunday. */
export const programDaySchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  title: z.string().min(1).max(150),
  exercises: z.array(exerciseInputSchema).max(50).default([]),
});

export const createProgramSchema = z.object({
  name: z.string().min(1).max(150),
  phase: z.number().int().positive().max(50).optional(),
  description: z.string().max(2000).optional(),
  days: z
    .array(programDaySchema)
    .max(7)
    .refine(
      (days) => new Set(days.map((d) => d.dayOfWeek)).size === days.length,
      'Un jour de la semaine ne peut apparaître qu\'une fois'
    ),
});

export const assignProgramSchema = z.object({
  studentId: z.string().uuid(),
  startDate: z.string().optional(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
export type ProgramDayInput = z.infer<typeof programDaySchema>;
export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type AssignProgramInput = z.infer<typeof assignProgramSchema>;
