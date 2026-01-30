import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing, borderRadius, fontSize } from '../../src/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TourSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
}

const TOUR_SLIDES: TourSlide[] = [
  {
    id: '1',
    icon: 'barbell',
    title: 'Track Your Workouts',
    description: 'Log your exercises, track sets, reps, and weights. See your progress over time with detailed statistics.',
    color: '#f97316',
  },
  {
    id: '2',
    icon: 'restaurant',
    title: 'Smart Recipes',
    description: 'Get AI-powered recipe suggestions based on your goals and preferences. Scan your fridge for instant meal ideas!',
    color: '#22c55e',
  },
  {
    id: '3',
    icon: 'stats-chart',
    title: 'Your Dashboard',
    description: 'Monitor your daily progress, track calories, steps, and weight. Stay motivated with visual insights.',
    color: '#3b82f6',
  },
];

export default function AppTourScreen() {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < TOUR_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  const renderSlide = ({ item }: { item: TourSlide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={80} color={item.color} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {item.description}
      </Text>
    </View>
  );

  const isLastSlide = currentIndex === TOUR_SLIDES.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={TOUR_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item: TourSlide) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        getItemLayout={(_: ArrayLike<TourSlide> | null | undefined, index: number) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {TOUR_SLIDES.map((slide, index) => (
            <View
              key={slide.id}
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentIndex
                    ? TOUR_SLIDES[currentIndex].color
                    : colors.border,
                  width: index === currentIndex ? 24 : 10,
                },
              ]}
            />
          ))}
        </View>

        <Pressable
          style={[styles.button, { backgroundColor: TOUR_SLIDES[currentIndex].color }]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {isLastSlide ? "Let's Go!" : 'Next'}
          </Text>
          <Ionicons
            name={isLastSlide ? 'checkmark' : 'arrow-forward'}
            size={20}
            color="#fff"
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    alignItems: 'flex-end',
  },
  skipText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: 10,
    borderRadius: 5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  buttonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});
