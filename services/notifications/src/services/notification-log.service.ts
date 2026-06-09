import { pool } from '../db/pool.js';

export type NotificationChannel = 'email' | 'sms' | 'push';
export type NotificationStatus = 'sent' | 'failed' | 'simulated';

export interface NotificationLogEntry {
  channel: NotificationChannel;
  recipient: string;
  template?: string | null;
  subject?: string | null;
  status: NotificationStatus;
  providerId?: string | null;
  error?: string | null;
}

/**
 * Persists a delivery record for every notification attempt so the metrics /
 * reporting service can track delivery state (sent / failed / simulated).
 * Logging must never break the actual send, so failures here are swallowed.
 */
export const logNotification = async (entry: NotificationLogEntry): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO notification_logs
         (channel, recipient, template, subject, status, provider_id, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.channel,
        entry.recipient,
        entry.template ?? null,
        entry.subject ?? null,
        entry.status,
        entry.providerId ?? null,
        entry.error ?? null,
      ]
    );
  } catch (err) {
    console.error('Failed to write notification log:', err);
  }
};
