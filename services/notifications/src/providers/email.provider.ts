import { Resend } from 'resend';
import { env } from '../config/env.js';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendResult {
  status: 'sent' | 'simulated';
  providerId: string | null;
}

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/**
 * Sends a transactional email via Resend. When no API key is configured the
 * email is "simulated" (logged to the console) so the full flow can be demoed
 * without a Resend account. Throws on real provider errors.
 */
export const sendEmail = async (input: SendEmailInput): Promise<SendResult> => {
  if (!resend) {
    console.log(`[EMAIL:SIMULATED] to=${input.to} subject="${input.subject}"`);
    return { status: 'simulated', providerId: null };
  }

  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return { status: 'sent', providerId: data?.id ?? null };
};
