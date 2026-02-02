import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useNutrition, type NutritionMessage } from '../../src/hooks/useNutrition';
import { spacing, borderRadius, fontSize } from '../../src/constants/theme';
import { profileApi, type GeneratedRecipe, type Recipe, type Profile, type UserProfile } from '../../src/lib/api';

export default function NutritionScreen() {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [mode, setMode] = useState<'plan' | 'frigo'>('frigo');
  const [input, setInput] = useState('');
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await profileApi.get();
        setProfile(data);
      } catch {
        // Profile not found is fine, we'll work without it
      }
    };
    void loadProfile();
  }, []);

  // Convert Profile to UserProfile format for AI
  const userProfile = useMemo<UserProfile | undefined>(() => {
    if (!profile) return undefined;

    // Map goal values (improve_endurance -> improve_health)
    const goalMap: Record<string, UserProfile['goal']> = {
      lose_weight: 'lose_weight',
      gain_muscle: 'gain_muscle',
      maintain: 'maintain',
      improve_endurance: 'improve_health',
    };

    return {
      goal: goalMap[profile.goal] ?? undefined,
      currentWeight: profile.currentWeight ?? undefined,
      targetWeight: profile.targetWeight ?? undefined,
      activityLevel: profile.activityLevel ?? undefined,
      allergies: profile.allergies?.length ? profile.allergies : undefined,
      dietaryRestrictions: profile.dietPreferences?.length ? profile.dietPreferences : undefined,
    };
  }, [profile]);

  const {
    messages,
    isLoading,
    sendMessage,
    saveRecipe,
    getSavedRecipes,
    deleteRecipe,
    resetConversation,
  } = useNutrition(userProfile);

  // Load saved recipes when switching to "Mes Recettes" mode
  useEffect(() => {
    if (mode === 'plan') {
      void loadRecipes();
    }
  }, [mode]);

  const loadRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const result = await getSavedRecipes();
      setSavedRecipes(result.items);
    } catch {
      console.error('Failed to load recipes');
    } finally {
      setLoadingRecipes(false);
    }
  };

  const handleDeleteRecipe = async (id: string, title: string) => {
    Alert.alert(
      'Supprimer la recette',
      `Voulez-vous vraiment supprimer "${title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecipe(id);
              setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer la recette.');
            }
          },
        },
      ]
    );
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleSaveRecipe = async (recipe: GeneratedRecipe, messageId: string) => {
    setSavingRecipeId(messageId);
    try {
      await saveRecipe(recipe, mode === 'frigo');
      Alert.alert('Sauvegardé !', `"${recipe.title}" a été ajouté à tes recettes.`);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder la recette.');
    } finally {
      setSavingRecipeId(null);
    }
  };

  const handleReset = () => {
    setInput('');
    resetConversation();
  };

  const renderMessage = (msg: NutritionMessage) => {
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
      const totalTime = (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0);
      const isSaving = savingRecipeId === msg.id;

      return (
        <View key={msg.id} style={[styles.recipeCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.recipeHeader, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.recipeLabel, { color: colors.primary }]}>RECETTE GÉNÉRÉE PAR AI</Text>
          </View>
          <View style={styles.recipeImagePlaceholder}>
            <Ionicons name="restaurant" size={48} color={colors.textSecondary} />
          </View>
          <View style={styles.recipeContent}>
            <Text style={[styles.recipeName, { color: colors.text }]}>{r.title}</Text>
            {r.description && (
              <Text style={[styles.recipeDescription, { color: colors.textSecondary }]}>
                {r.description}
              </Text>
            )}
            <View style={styles.recipeMeta}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.recipeMetaText, { color: colors.textSecondary }]}>
                {totalTime} min
              </Text>
              <Ionicons name="flame-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.recipeMetaText, { color: colors.textSecondary }]}>
                {r.calories} Cal
              </Text>
              <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.recipeMetaText, { color: colors.textSecondary }]}>
                {r.servings} pers.
              </Text>
            </View>

            <View style={styles.macrosRow}>
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>PROTÉINES</Text>
                <Text style={[styles.macroValue, { color: colors.primary }]}>{r.protein}g</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>GLUCIDES</Text>
                <Text style={[styles.macroValue, { color: colors.text }]}>{r.carbs}g</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>LIPIDES</Text>
                <Text style={[styles.macroValue, { color: colors.text }]}>{r.fat}g</Text>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.text }]}>Ingrédients</Text>
            {r.ingredients.map((ing, i) => (
              <Text key={i} style={[styles.ingredientText, { color: colors.textSecondary }]}>
                • {ing.quantity} {ing.unit} {ing.name}
              </Text>
            ))}

            <Text style={[styles.sectionLabel, { color: colors.text }]}>Instructions</Text>
            {r.instructions.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
              </View>
            ))}

            {r.tips && r.tips.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Conseils</Text>
                {r.tips.map((tip, i) => (
                  <Text key={i} style={[styles.tipText, { color: colors.textSecondary }]}>
                    💡 {tip}
                  </Text>
                ))}
              </>
            )}

            <Pressable
              style={[styles.saveButton, { backgroundColor: colors.success }]}
              onPress={() => { void handleSaveRecipe(r, msg.id); }}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="bookmark-outline" size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>Sauvegarder la recette</Text>
                </>
              )}
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
          <Pressable onPress={handleReset}>
            <Ionicons name="refresh" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Chef AI</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Mode Tabs */}
        <View style={styles.modeTabs}>
          <Pressable
            style={[styles.modeTab, mode === 'plan' && { backgroundColor: colors.primary }]}
            onPress={() => { setMode('plan'); }}
          >
            <Text style={[styles.modeTabText, { color: mode === 'plan' ? '#fff' : colors.textSecondary }]}>
              Mes Recettes
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

        {/* Saved Recipes View */}
        {mode === 'plan' && (
          <ScrollView
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {loadingRecipes ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Chargement des recettes...
                </Text>
              </View>
            ) : savedRecipes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Aucune recette sauvegardée
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Utilise le Frigo Mode pour générer et sauvegarder des recettes
                </Text>
              </View>
            ) : selectedRecipe ? (
              // Recipe Detail View
              <View>
                <Pressable style={styles.backButton} onPress={() => setSelectedRecipe(null)}>
                  <Ionicons name="arrow-back" size={20} color={colors.primary} />
                  <Text style={[styles.backButtonText, { color: colors.primary }]}>Retour</Text>
                </Pressable>
                <View style={[styles.recipeCard, { backgroundColor: colors.surface }]}>
                  <View style={[styles.recipeHeader, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.recipeLabel, { color: colors.primary }]}>
                      {selectedRecipe.isFromFrigoMode ? 'RECETTE FRIGO MODE' : 'RECETTE SAUVEGARDÉE'}
                    </Text>
                  </View>
                  <View style={styles.recipeContent}>
                    <Text style={[styles.recipeName, { color: colors.text }]}>{selectedRecipe.title}</Text>
                    {selectedRecipe.description && (
                      <Text style={[styles.recipeDescription, { color: colors.textSecondary }]}>
                        {selectedRecipe.description}
                      </Text>
                    )}
                    <View style={styles.recipeMeta}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.recipeMetaText, { color: colors.textSecondary }]}>
                        {(selectedRecipe.prepTimeMinutes ?? 0) + (selectedRecipe.cookTimeMinutes ?? 0)} min
                      </Text>
                      <Ionicons name="flame-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.recipeMetaText, { color: colors.textSecondary }]}>
                        {selectedRecipe.calories ?? 0} Cal
                      </Text>
                      <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.recipeMetaText, { color: colors.textSecondary }]}>
                        {selectedRecipe.servings ?? 4} pers.
                      </Text>
                    </View>

                    <View style={styles.macrosRow}>
                      <View style={styles.macroItem}>
                        <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>PROTÉINES</Text>
                        <Text style={[styles.macroValue, { color: colors.primary }]}>{selectedRecipe.protein ?? 0}g</Text>
                      </View>
                      <View style={styles.macroItem}>
                        <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>GLUCIDES</Text>
                        <Text style={[styles.macroValue, { color: colors.text }]}>{selectedRecipe.carbs ?? 0}g</Text>
                      </View>
                      <View style={styles.macroItem}>
                        <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>LIPIDES</Text>
                        <Text style={[styles.macroValue, { color: colors.text }]}>{selectedRecipe.fat ?? 0}g</Text>
                      </View>
                    </View>

                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Ingrédients</Text>
                    {Array.isArray(selectedRecipe.ingredients) && selectedRecipe.ingredients.map((ing: { name: string; quantity: string; unit: string }, i: number) => (
                      <Text key={i} style={[styles.ingredientText, { color: colors.textSecondary }]}>
                        • {ing.quantity} {ing.unit} {ing.name}
                      </Text>
                    ))}

                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Instructions</Text>
                    {Array.isArray(selectedRecipe.instructions) && selectedRecipe.instructions.map((step: string, i: number) => (
                      <View key={i} style={styles.stepRow}>
                        <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                          <Text style={styles.stepNumberText}>{i + 1}</Text>
                        </View>
                        <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
                      </View>
                    ))}

                    <Pressable
                      style={[styles.deleteButton, { borderColor: colors.error }]}
                      onPress={() => { void handleDeleteRecipe(selectedRecipe.id, selectedRecipe.title); setSelectedRecipe(null); }}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                      <Text style={[styles.deleteButtonText, { color: colors.error }]}>Supprimer cette recette</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              // Recipe List
              savedRecipes.map((recipe) => (
                <Pressable
                  key={recipe.id}
                  style={[styles.savedRecipeCard, { backgroundColor: colors.surface }]}
                  onPress={() => setSelectedRecipe(recipe)}
                >
                  <View style={styles.savedRecipeHeader}>
                    <Text style={[styles.savedRecipeTitle, { color: colors.text }]} numberOfLines={2}>
                      {recipe.title}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </View>
                  {recipe.description && (
                    <Text style={[styles.savedRecipeDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {recipe.description}
                    </Text>
                  )}
                  <View style={styles.savedRecipeMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {(recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)} min
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="flame-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {recipe.calories ?? 0} Cal
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="barbell-outline" size={14} color={colors.primary} />
                      <Text style={[styles.metaText, { color: colors.primary }]}>
                        {recipe.protein ?? 0}g prot
                      </Text>
                    </View>
                  </View>
                  {recipe.isFromFrigoMode && (
                    <View style={[styles.frigoModeBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="sparkles" size={12} color={colors.primary} />
                      <Text style={[styles.frigoModeBadgeText, { color: colors.primary }]}>Frigo Mode</Text>
                    </View>
                  )}
                </Pressable>
              ))
            )}
          </ScrollView>
        )}

        {/* Frigo Mode Chat */}
        {mode === 'frigo' && (
          <>
            <ScrollView
              ref={scrollRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
            >
              {messages.map(renderMessage)}
              {isLoading && (
                <View style={[styles.botMessage, { backgroundColor: colors.surfaceVariant }]}>
                  <View style={[styles.botAvatar, { backgroundColor: colors.primary }]}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                  <Text style={[styles.messageText, { color: colors.textSecondary }]}>
                    Je réfléchis...
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Dis-moi tes ingrédients, équipements..."
                placeholderTextColor={colors.textSecondary}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => { void handleSendMessage(); }}
                editable={!isLoading}
              />
              <Pressable
                style={[styles.sendButton, { backgroundColor: colors.primary, opacity: isLoading ? 0.5 : 1 }]}
                onPress={() => { void handleSendMessage(); }}
                disabled={isLoading}
              >
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </Pressable>
            </View>
          </>
        )}
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
  recipeDescription: { fontSize: fontSize.sm, marginTop: spacing.xs, lineHeight: 20 },
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
  tipText: { fontSize: fontSize.sm, marginBottom: spacing.sm, lineHeight: 20 },
  saveButton: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  saveButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
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
  // Saved recipes styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  savedRecipeCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  savedRecipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  savedRecipeTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  savedRecipeDesc: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  savedRecipeMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSize.xs,
  },
  frigoModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  frigoModeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  backButtonText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginTop: spacing.lg,
  },
  deleteButtonText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
});
