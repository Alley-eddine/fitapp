import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { env } from '../config/env.js';
import type { SendResult } from './email.provider.js';

export interface SendPushInput {
  to: string | string[]; // Expo push token(s)
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const expo = new Expo(env.EXPO_ACCESS_TOKEN ? { accessToken: env.EXPO_ACCESS_TOKEN } : {});

/**
 * Sends a push notification to one or more Expo push tokens. Invalid tokens are
 * skipped; if none are valid the call is reported as simulated rather than
 * failing the caller.
 */
export const sendPush = async (input: SendPushInput): Promise<SendResult> => {
  const tokens = (Array.isArray(input.to) ? input.to : [input.to]).filter((t) =>
    Expo.isExpoPushToken(t)
  );

  if (tokens.length === 0) {
    console.log(`[PUSH:SIMULATED] no valid Expo token, title="${input.title}"`);
    return { status: 'simulated', providerId: null };
  }

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: input.title,
    body: input.body,
    data: input.data ?? {},
  }));

  const tickets = [];
  for (const chunk of expo.chunkPushNotifications(messages)) {
    const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
    tickets.push(...chunkTickets);
  }

  const firstId = tickets.find((t) => t.status === 'ok' && 'id' in t);
  return {
    status: 'sent',
    providerId: firstId && 'id' in firstId ? firstId.id : null,
  };
};
