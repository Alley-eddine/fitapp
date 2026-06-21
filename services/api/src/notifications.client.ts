import { env } from './config/env.js';

/**
 * Best-effort client to the internal notifications service. Never throws:
 * a notification failure must not break the business action that triggered it.
 */
const post = async (path: string, body: unknown): Promise<boolean> => {
  if (!env.INTERNAL_API_KEY) return false;
  try {
    const res = await fetch(`${env.NOTIFICATIONS_SERVICE_URL}/api/notifications/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': env.INTERNAL_API_KEY,
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const sendEmail = (params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> => post('email', params);

export const sendSms = (params: { to: string; body: string }): Promise<boolean> => post('sms', params);

/** Minimal dark-themed HTML wrapper for transactional emails. */
export const emailHtml = (title: string, message: string): string =>
  `<!DOCTYPE html><html lang="fr"><body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:12px;padding:24px">
    <h1 style="color:#22d3ee;font-size:20px;margin:0 0 12px">${title}</h1>
    <p style="color:#cbd5e1;font-size:15px;line-height:1.5;margin:0">${message}</p>
    <p style="color:#64748b;font-size:13px;margin-top:24px">FitCoach AI</p>
  </div></body></html>`;
