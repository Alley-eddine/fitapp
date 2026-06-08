import { env } from '../config/env.js';

const post = async (path: string, body: unknown): Promise<void> => {
  const res = await fetch(`${env.NOTIFICATIONS_SERVICE_URL}/api/notifications/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-key': env.INTERNAL_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notifications service error (${String(res.status)}): ${text}`);
  }
};

export const sendVerificationEmail = async (params: {
  to: string;
  name?: string | null;
  verifyUrl: string;
}): Promise<void> => {
  await post('email', {
    to: params.to,
    template: 'verify-account',
    data: { name: params.name ?? undefined, verifyUrl: params.verifyUrl },
  });
};

export const sendPasswordResetSms = async (params: {
  to: string;
  code: string;
}): Promise<void> => {
  await post('sms', {
    to: params.to,
    body: `FitCoach AI : votre code de réinitialisation est ${params.code}. Il expire dans 10 minutes.`,
  });
};
