import { randomInt } from 'crypto';

/**
 * Pure invitation logic — no database or environment imports, so it stays
 * unit testable.
 */

/** How long a freshly created invitation stays valid. */
export const INVITATION_TTL_DAYS = 14;

/** Unambiguous alphabet: no 0/O/1/I so a code can be read out loud. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

/** Generates a shareable invitation code (e.g. "R7K2QM4P"). */
export const generateInvitationCode = (): string => {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
};

/** Expiry date for an invitation created at `from`. */
export const invitationExpiresAt = (from: Date): Date =>
  new Date(from.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

export interface InvitationLike {
  status: string;
  expires_at: Date;
}

/** An invitation can be accepted only while pending and not expired. */
export const isInvitationUsable = (invitation: InvitationLike, now: Date): boolean =>
  invitation.status === 'pending' && new Date(invitation.expires_at).getTime() > now.getTime();
