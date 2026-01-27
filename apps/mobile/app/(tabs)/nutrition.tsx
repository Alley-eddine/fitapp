import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing, borderRadius, fontSize } from '../../src/constants/theme';

interface Message {
  id: string;
  type: 'bot' | 'user' | 'recipe';
  content: string;
  recipe?: Recipe;
}

interface Recipe {
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  steps: string[];
}

export default function NutritionScreen() {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [mode, setMode] = useState<'plan' | 'frigo'>('frigo');
  const [input, setInput] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hi there! I'm your AI Chef. What main ingredient are we cooking with today?",
    },
  ]);

  const addIngredient = () => {
    if (!input.trim()) return;
    setIngredients([...ingredients, input.trim()]);
    setMessages([...messages, { id: Date.now().toString(), type: 'user', content: input.trim() }]);
    setInput('');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), type: 'bot', content: 'Great choice! Do you have any vegetables to add?' },
      ]);
    }, 500);
  };

  const generateRecipe = () => {
    const recipe: Recipe = {
      name: 'Zesty Lemon Chicken & Veggie Bowl',
      time: '25 min',
      calories: 450,
      protein: 35,
      carbs: 28,
      fat: 12,
      ingredients: [
        '200g Chicken Breast, sliced',
        '1 cup Broccoli florets',
        '1/2 Lemon, juiced',
        '1/2 cup Cooked Brown Rice',
      ],
      steps: [
        'Season chicken with salt, pepper, and lemon zest. Novice tip: Don\'t over-salt, you can always add more later!',
        'Heat a pan over medium-high heat with a drizzle of oil. Cook chicken for 6-8 mins until golden brown.',
        'Add broccoli to the pan during the last 3 mins of cooking. Pour in the lemon juice to deglaze.',
      ],
    };

    setMessages([
      ...messages,
      { id: Date.now().toString(), type: 'recipe', content: '', recipe },
    ]);
  };

  const renderMessage = (msg: Message) => {
    if (msg.type === 'bot') {
      return (
        <View key={msg.id} style={[styles.botMessage, { backgroundColor: colors.surfaceVariant }]}>
          <View style={[styles.botAvatar, { backgroundColor: colors.primary }]}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </View>
          <Text style={[styles.messageText, { color: colors.text }]}>{msg.content}</Text>
        </View>
      );
    }

    if (msg.type === 'user') {
      return (
        <View key={msg.id} style={styles.userMessageRow}>
          <View style={[styles.userMessage, { backgroundColor: colors.primary }]}>
            <Text style={styles.userMessageText}>{msg.content}</Text>
          </View>
        </View>
      );
    }

    if (msg.recipe) {
      const r = msg.recipe;
      return (
        <View key={msg.id} style={[styles.recipeCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.recipeHeader, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.recipeLabel, { color: colors.primary }]}>RECOMMENDED FOR NOVICE</Text>
          </View>
          <View style={styles.recipeImagePlaceholder}>
            <Ionicons name="restaurant" size={48} color={colors.textSecondary} />
          </View>
          <View style={styles.recipeContent}>
            <Text style={[styles.recipeName, { color: colors.text }]}>{r.name}</Text>
            <View style={styles.recipeMeta}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.recipeMetaText, { color: colors.textSecondary }]}>{r.time}</Text>
              <Ionicons name="flame-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.recipeMetaText, { color: colors.textSecondary }]}>{r.calories} Cal</Text>
            </View>

            <View style={styles.macrosRow}>
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>PROTEIN</Text>
                <Text style={[styles.macroValue, { color: colors.primary }]}>{r.protein}g</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>CARBS</Text>
                <Text style={[styles.macroValue, { color: colors.text }]}>{r.carbs}g</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>FAT</Text>
                <Text style={[styles.macroValue, { color: colors.text }]}>{r.fat}g</Text>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.text }]}>Ingredients</Text>
            {r.ingredients.map((ing, i) => (
              <Text key={i} style={[styles.ingredientText, { color: colors.textSecondary }]}>
                • {ing}
              </Text>
            ))}

            <Text style={[styles.sectionLabel, { color: colors.text }]}>Step-by-Step Flow</Text>
            {r.steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
              </View>
            ))}

            <Pressable style={[styles.cookButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.cookButtonText}>Let's Start Cooking!</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>AI Kitchen Assistant</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Mode Tabs */}
        <View style={styles.modeTabs}>
          <Pressable
            style={[styles.modeTab, mode === 'plan' && { backgroundColor: colors.primary }]}
            onPress={() => { setMode('plan'); }}
          >
            <Text style={[styles.modeTabText, { color: mode === 'plan' ? '#fff' : colors.textSecondary }]}>
              My Plan
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeTab, mode === 'frigo' && { backgroundColor: colors.primary }]}
            onPress={() => { setMode('frigo'); }}
          >
            <Text style={[styles.modeTabText, { color: mode === 'frigo' ? '#fff' : colors.textSecondary }]}>
              Frigo Mode
            </Text>
          </Pressable>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
        >
          {messages.map(renderMessage)}
        </ScrollView>

        {/* Ingredients Pills */}
        {ingredients.length > 0 && (
          <View style={styles.ingredientsPills}>
            {ingredients.map((ing, i) => (
              <View key={i} style={[styles.pill, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.pillText, { color: colors.text }]}>{ing}</Text>
              </View>
            ))}
            <Pressable style={[styles.generateBtn, { backgroundColor: colors.primary }]} onPress={generateRecipe}>
              <Ionicons name="sparkles" size={18} color="#fff" />
            </Pressable>
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Type an ingredient..."
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={addIngredient}
          />
          <Pressable style={[styles.sendButton, { backgroundColor: colors.primary }]} onPress={addIngredient}>
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: fontSize.lg, fontWeight: '600' },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  modeTabText: { fontSize: fontSize.sm, fontWeight: '500' },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: spacing.lg },
  botMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: { flex: 1, fontSize: fontSize.md, lineHeight: 22 },
  userMessageRow: { alignItems: 'flex-end', marginBottom: spacing.md },
  userMessage: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    maxWidth: '80%',
  },
  userMessageText: { color: '#fff', fontSize: fontSize.md },
  recipeCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  recipeHeader: { padding: spacing.sm },
  recipeLabel: { fontSize: fontSize.xs, fontWeight: '600', textAlign: 'center' },
  recipeImagePlaceholder: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  recipeContent: { padding: spacing.lg },
  recipeName: { fontSize: fontSize.xl, fontWeight: '700' },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  recipeMetaText: { fontSize: fontSize.sm, marginRight: spacing.sm },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  macroItem: { alignItems: 'center' },
  macroLabel: { fontSize: fontSize.xs, fontWeight: '600' },
  macroValue: { fontSize: fontSize.xl, fontWeight: '700' },
  sectionLabel: { fontSize: fontSize.md, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  ingredientText: { fontSize: fontSize.sm, marginBottom: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md, gap: spacing.sm },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600' },
  stepText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },
  cookButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  cookButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  ingredientsPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  pillText: { fontSize: fontSize.sm },
  generateBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: fontSize.md, paddingVertical: spacing.sm },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
