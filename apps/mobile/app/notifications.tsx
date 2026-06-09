import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../src/hooks/useTheme';
import { spacing, borderRadius, fontSize } from '../src/constants/theme';
import { notificationApi } from '../src/lib/api';
import type { NotificationLog } from '../src/lib/api';

const CHANNEL_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  email: 'mail',
  sms: 'chatbubble-ellipses',
  push: 'notifications',
};

const TEMPLATE_LABEL: Record<string, string> = {
  'verify-account': 'Confirmation du compte',
  invoice: 'Facture',
  'subscription-started': 'Abonnement activé',
  'subscription-ending': 'Fin d’abonnement',
  'payment-failed': 'Échec de paiement',
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { items: data } = await notificationApi.history();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const statusColor = (status: string) =>
    status === 'sent' ? colors.success : status === 'failed' ? colors.error : colors.textSecondary;

  const statusLabel = (status: string) =>
    status === 'sent' ? 'Envoyé' : status === 'failed' ? 'Échec' : 'Simulé';

  const title = (n: NotificationLog) =>
    n.subject ?? (n.template ? TEMPLATE_LABEL[n.template] ?? n.template : n.channel.toUpperCase());

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => { router.back(); }}>
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {items.length === 0 && (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              Aucune notification pour l’instant.
            </Text>
          )}
          {items.map((n) => (
            <View key={n.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name={CHANNEL_ICON[n.channel] ?? 'notifications'} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{title(n)}</Text>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                  {n.channel.toUpperCase()} · {n.recipient}
                </Text>
                <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                  {new Date(n.createdAt).toLocaleString('fr-FR')}
                </Text>
              </View>
              <Text style={[styles.status, { color: statusColor(n.status) }]}>{statusLabel(n.status)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700' },
  content: { padding: spacing.lg, gap: spacing.sm },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: fontSize.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600' },
  cardMeta: { fontSize: fontSize.sm, marginTop: 2 },
  cardDate: { fontSize: fontSize.xs, marginTop: 2 },
  status: { fontSize: fontSize.sm, fontWeight: '600' },
});
