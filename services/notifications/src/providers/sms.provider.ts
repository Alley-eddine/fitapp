import twilio from 'twilio';
import { env } from '../config/env.js';
import type { SendResult } from './email.provider.js';

export interface SendSmsInput {
  to: string;
  body: string;
}

const client =
  env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER
    ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
    : null;

/**
 * Sends an SMS via Twilio. When Twilio credentials are missing the SMS is
 * "simulated" (logged to the console, including the body so a reset code is
 * visible during a demo). Throws on real provider errors.
 */
export const sendSms = async (input: SendSmsInput): Promise<SendResult> => {
  if (!client) {
    console.log(`[SMS:SIMULATED] to=${input.to} body="${input.body}"`);
    return { status: 'simulated', providerId: null };
  }

  const message = await client.messages.create({
    from: env.TWILIO_FROM_NUMBER,
    to: input.to,
    body: input.body,
  });

  return { status: 'sent', providerId: message.sid };
};
