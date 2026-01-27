import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing, borderRadius, fontSize } from '../../src/constants/theme';
import { workoutApi } from '../../src/lib/api';
import type { Workout } from '../../src/lib/api';

export default function PlansScreen() {
  const { colors } = useTheme();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const data = await workoutApi.list(30);
      setWorkouts(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const getWorkoutIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'weights':
        return 'barbell';
      case 'cardio':
        return 'bicycle';
      case 'hiit':
        return 'flash';
      default:
        return 'fitness';
    }
  };

  const renderWorkout = ({ item }: { item: Workout }) => (
    <Pressable style={[styles.workoutCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.workoutIcon, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name={getWorkoutIcon(item.type)} size={24} color={colors.primary} />
      </View>
      <View style={styles.workoutInfo}>
        <Text style={[styles.workoutType, { color: colors.text }]}>{item.type}</Text>
        <Text style={[styles.workoutMeta, { color: colors.textSecondary }]}>
          {item.duration} min • {item.caloriesBurned || 0} kcal
        </Text>
      </View>
      <Text style={[styles.workoutDate, { color: colors.textSecondary }]}>
        {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Workout Plans</Text>
        <Pressable
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => { router.push('/workout/new'); }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, styles.tabActive, { borderBottomColor: colors.primary }]}>
          <Text style={[styles.tabText, { color: colors.primary }]}>History</Text>
        </Pressable>
        <Pressable style={styles.tab}>
          <Text style={[styles.tabText, { color: colors.textSecondary }]}>Templates</Text>
        </Pressable>
        <Pressable style={styles.tab}>
          <Text style={[styles.tabText, { color: colors.textSecondary }]}>AI Plans</Text>
        </Pressable>
      </View>

      {workouts.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Ionicons name="barbell-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No workouts yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Start logging your workouts to track progress
          </Text>
          <Pressable
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => { router.push('/workout/new'); }}
          >
            <Text style={styles.emptyButtonText}>Log First Workout</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item: Workout) => item.id}
          renderItem={renderWorkout}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
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
    paddingTop: spacing.md,
  },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    paddingVertical: spacing.md,
    marginRight: spacing.lg,
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: { fontSize: fontSize.md, fontWeight: '600' },
  list: { padding: spacing.lg },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutInfo: { flex: 1, marginLeft: spacing.md },
  workoutType: { fontSize: fontSize.md, fontWeight: '600', textTransform: 'capitalize' },
  workoutMeta: { fontSize: fontSize.sm, marginTop: 2 },
  workoutDate: { fontSize: fontSize.sm },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.sm },
  emptyButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.lg,
  },
  emptyButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
});
