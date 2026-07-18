import { z } from 'zod';

/** A coach invites someone; the email is optional (a shareable link is enough). */
export const createInvitationSchema = z.object({
  email: z.string().email().max(255).optional(),
});

export const invitationStatusSchema = z.enum(['pending', 'accepted', 'revoked']);

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
