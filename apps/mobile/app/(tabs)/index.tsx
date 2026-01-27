import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/store/auth';
import { spacing, borderRadius, fontSize } from '../../src/constants/theme';
import { stepsApi, weightApi, workoutApi } from '../../src/lib/api';
import type { StepsLog, WeightLog } from '../../src/lib/api';

export default function HomeScreen() {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);
  const [steps, setSteps] = useState<(StepsLog & { percentage: number }) | null>(null);
  const [weight, setWeight] = useState<WeightLog | null>(null);
  const [weeklyStats, setWeeklyStats] = useState({ totalWorkouts: 0, totalDuration: 0, totalCalories: 0 });

  const loadData = useCallback(async () => {
    try {
      const [stepsData, weightData, statsData] = await Promise.all([
        stepsApi.today().catch(() => null),
        weightApi.latest().catch(() => null),
        workoutApi.weeklyStats().catch(() => ({ totalWorkouts: 0, totalDuration: 0, totalCalories: 0 })),
      ]);
      setSteps(stepsData);
      setWeight(weightData);
      setWeeklyStats(statsData);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{user?.name ? user.name.charAt(0) : 'U'}</Text>
            </View>
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting()}</Text>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'User'} 💪</Text>
            </View>
          </View>
          <Pressable style={[styles.notifButton, { backgroundColor: colors.surface }]}>
            <Ionicons name="notifications" size={22} color={colors.primary} />
          </Pressable>
        </View>

        {/* Daily Progress Title */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Progress</Text>
          <Text style={[styles.dateText, { color: colors.primary }]}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}, TODAY
          </Text>
        </View>

        {/* Steps Card */}
        <View style={[styles.stepsCard, { backgroundColor: colors.primary }]}>
          <View style={styles.stepsHeader}>
            <View style={[styles.stepsIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="footsteps" size={24} color="#fff" />
            </View>
            <View style={styles.stepsGoal}>
              <Text style={styles.goalText}>Goal: {steps?.goal ? steps.goal.toLocaleString() : '10,000'}</Text>
              <View style={styles.percentBadge}>
                <Text style={styles.percentText}>{steps?.percentage || 0}% Reach</Text>
              </View>
            </View>
          </View>
          <Text style={styles.stepsCount}>{steps?.steps ? steps.steps.toLocaleString() : '0'}</Text>
          <Text style={styles.stepsLabel}>STEPS</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statHeader}>
              <Ionicons name="fitness" size={20} color={colors.primary} />
              <Text style={[styles.streakBadge, { color: colors.success }]}>+{weeklyStats.totalWorkouts} streak</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{weeklyStats.totalWorkouts}/5</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>WORKOUTS DONE</Text>
            <View style={styles.dotsRow}>
              {[...Array<unknown>(5)].map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, { backgroundColor: i < weeklyStats.totalWorkouts ? colors.primary : colors.border }]}
                />
              ))}
            </View>
          </View>

          <View style={[styles.statCard, styles.darkCard]}>
            <Ionicons name="flame" size={20} color="#22d3ee" />
            <Text style={styles.kcalValue}>{weeklyStats.totalCalories || 1420}</Text>
            <Text style={styles.kcalLabel}>KCAL LEFT</Text>
            <View style={styles.kcalProgress}>
              <View style={[styles.kcalBar, { width: '65%' }]} />
            </View>
            <Text style={styles.kcalPercent}>65%</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>Quick Actions</Text>

        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => { router.push('/workout/new'); }}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>Log Today's Workout</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => { router.push('/(tabs)/nutrition'); }}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="sparkles" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>Get AI Meal Plan</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>

        {/* Weight Evolution */}
        <View style={[styles.weightCard, { backgroundColor: colors.surface }]}>
          <View style={styles.weightHeader}>
            <View style={styles.weightLeft}>
              <Ionicons name="trending-down" size={20} color={colors.success} />
              <Text style={[styles.weightTitle, { color: colors.textSecondary }]}>WEIGHT EVOLUTION</Text>
            </View>
            <Pressable>
              <Text style={[styles.detailsLink, { color: colors.primary }]}>DETAILS</Text>
            </Pressable>
          </View>
          <Text style={[styles.weightValue, { color: colors.text }]}>{weight?.weight || '--'} kg</Text>
          <Text style={[styles.weightChange, { color: colors.success }]}>-2.5% this month</Text>
        </View>
      </ScrollView>
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
    paddingTop: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '600' },
  greeting: { fontSize: fontSize.sm },
  userName: { fontSize: fontSize.lg, fontWeight: '700' },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: '700' },
  dateText: { fontSize: fontSize.sm, fontWeight: '600' },
  stepsCard: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepsIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepsGoal: { alignItems: 'flex-end' },
  goalText: { color: '#fff', fontSize: fontSize.sm },
  percentBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginTop: 4,
  },
  percentText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '600' },
  stepsCount: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  stepsLabel: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.lg, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  darkCard: { backgroundColor: '#1e293b' },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakBadge: { fontSize: fontSize.xs, fontWeight: '600' },
  statValue: { fontSize: fontSize['2xl'], fontWeight: '700', marginTop: spacing.sm },
  statLabel: { fontSize: fontSize.xs, fontWeight: '600', marginTop: 2 },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  kcalValue: { color: '#fff', fontSize: fontSize['2xl'], fontWeight: '700', marginTop: spacing.sm },
  kcalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.xs, fontWeight: '600' },
  kcalProgress: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginTop: spacing.sm,
  },
  kcalBar: { height: 4, backgroundColor: '#22d3ee', borderRadius: 2 },
  kcalPercent: {
    color: '#22d3ee',
    fontSize: fontSize.sm,
    fontWeight: '600',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: { flex: 1, marginLeft: spacing.md, fontSize: fontSize.md, fontWeight: '500' },
  weightCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weightTitle: { fontSize: fontSize.xs, fontWeight: '600', letterSpacing: 1 },
  detailsLink: { fontSize: fontSize.xs, fontWeight: '600' },
  weightValue: { fontSize: fontSize['2xl'], fontWeight: '700', marginTop: spacing.sm },
  weightChange: { fontSize: fontSize.sm, marginTop: 2 },
});
