import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useWorkoutStore } from '../store/workout';
import { useTheme } from '../hooks/useTheme';
import { spacing, borderRadius, fontSize } from '../constants/theme';

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${String(hrs)}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${String(mins)}:${secs.toString().padStart(2, '0')}`;
};

export function WorkoutMiniPlayer() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const {
    isActive,
    workoutType,
    elapsedSeconds,
    isPaused,
    isResting,
    restSeconds,
    exercises,
    currentExerciseIndex,
    pauseWorkout,
    resumeWorkout,
    tick,
    restTick,
  } = useWorkoutStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Ne pas afficher le mini player sur l'ecran active (deja en plein ecran)
  const isOnActiveScreen = pathname === '/workout/active';

  // Timer principal
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      if (isResting) {
        restTick();
      } else {
        tick();
      }
    }, 1000);

    return () => { clearInterval(interval); };
  }, [isActive, isResting, tick, restTick]);

  // Animation pulse pendant le repos
  useEffect(() => {
    if (isResting) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => { pulse.stop(); };
    } else {
      pulseAnim.setValue(1);
    }
  }, [isResting, pulseAnim]);

  // Ne pas afficher si pas de workout actif
  if (!isActive) return null;

  // Cacher visuellement sur l'ecran active (mais garder le timer qui tourne)
  if (isOnActiveScreen) {
    return null; // Le timer est maintenant géré par ce composant qui reste monté dans le layout
  }

  const completedSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.completed).length,
    0
  );
  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const currentExercise = exercises[currentExerciseIndex];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isResting ? colors.warning : colors.primary,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <Pressable
        style={styles.content}
        onPress={() => { router.push('/workout/active' as never); }}
      >
        <View style={styles.left}>
          <View style={styles.timerRow}>
            <Ionicons
              name={isResting ? 'timer-outline' : 'fitness'}
              size={20}
              color="#fff"
            />
            <Text style={styles.timer}>
              {isResting ? formatTime(restSeconds) : formatTime(elapsedSeconds)}
            </Text>
          </View>
          <Text style={styles.info} numberOfLines={1}>
            {isResting
              ? 'Rest Time'
              : `${workoutType} • ${currentExercise.name || 'Workout'}`}
          </Text>
          <Text style={styles.progress}>
            {completedSets}/{totalSets} sets
          </Text>
        </View>

        <View style={styles.controls}>
          {isResting ? (
            <Pressable
              style={styles.controlButton}
              onPress={() => { useWorkoutStore.getState().skipRest(); }}
            >
              <Ionicons name="play-skip-forward" size={24} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              style={styles.controlButton}
              onPress={isPaused ? resumeWorkout : pauseWorkout}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={24}
                color="#fff"
              />
            </Pressable>
          )}
          <Pressable
            style={styles.controlButton}
            onPress={() => { router.push('/workout/active' as never); }}
          >
            <Ionicons name="chevron-up" size={24} color="#fff" />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80, // Au-dessus de la tab bar
    left: spacing.md,
    right: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  left: {
    flex: 1,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timer: {
    color: '#fff',
    fontSize: fontSize.xl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  info: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: fontSize.sm,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  progress: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
