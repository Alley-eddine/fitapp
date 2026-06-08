import { env } from '../config/env.js';

const post = async (body: unknown): Promise<void> => {
  const res = await fetch(`${env.NOTIFICATIONS_SERVICE_URL}/api/notifications/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-key': env.INTERNAL_API_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Notifications service error (${String(res.status)}): ${await res.text()}`);
  }
};

export const sendInvoiceEmail = async (params: {
  to: string;
  name?: string | null;
  planName: string;
  amount: string;
  invoiceNumber: string;
  periodEnd?: string;
  invoiceUrl?: string;
}): Promise<void> => {
  await post({ to: params.to, template: 'invoice', data: { ...params, name: params.name ?? undefined } });
};

export const sendSubscriptionEmail = async (
  event: 'subscription-started' | 'subscription-ending' | 'payment-failed',
  params: { to: string; name?: string | null; planName: string; periodEnd?: string }
): Promise<void> => {
  await post({ to: params.to, template: event, data: { ...params, name: params.name ?? undefined } });
};
