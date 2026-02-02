import { useState, useCallback } from 'react';
import {
  nutritionApi,
  recipeApi,
  type GeneratedRecipe,
  type SaveRecipeInput,
  type UserProfile,
} from '../lib/api';

export interface NutritionMessage {
  id: string;
  type: 'bot' | 'user' | 'recipe';
  content: string;
  recipe?: GeneratedRecipe;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

const INITIAL_MESSAGE: NutritionMessage = {
  id: '1',
  type: 'bot',
  content: "Salut ! Je suis Chef Marco 👨‍🍳 Dis-moi ce que tu as dans ton frigo, ton équipement de cuisine, et je te prépare une recette sur mesure pour ton objectif fitness !",
};

export function useNutrition(userProfile?: UserProfile) {
  const [messages, setMessages] = useState<NutritionMessage[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

  const sendMessage = useCallback(
    async (message: string) => {
      setIsLoading(true);
      setError(null);

      // Add user message
      const userMsg: NutritionMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: message,
      };
      setMessages((prev) => [...prev, userMsg]);

      // Update conversation history
      const newHistory = [...conversationHistory, { role: 'user' as const, content: message }];

      try {
        const response = await nutritionApi.frigoModeChat({
          message,
          conversationHistory: newHistory,
          userProfile,
        });

        // Add bot response
        if (response.recipe) {
          const recipeMsg: NutritionMessage = {
            id: (Date.now() + 1).toString(),
            type: 'recipe',
            content: '',
            recipe: response.recipe,
          };
          setMessages((prev) => [...prev, recipeMsg]);
        } else {
          const botMsg: NutritionMessage = {
            id: (Date.now() + 1).toString(),
            type: 'bot',
            content: response.message,
          };
          setMessages((prev) => [...prev, botMsg]);
        }

        // Update conversation history
        setConversationHistory([...newHistory, { role: 'assistant', content: response.message }]);

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
        setError(errorMessage);

        const errorMsg: NutritionMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `Désolé, j'ai rencontré une erreur: ${errorMessage}. Réessaie !`,
        };
        setMessages((prev) => [...prev, errorMsg]);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [conversationHistory]
  );

  const generateRecipe = useCallback(
    async (
      ingredients: string[],
      preferences?: {
        maxCalories?: number;
        minProtein?: number;
        dietaryRestrictions?: string[];
        cuisineType?: string;
      }
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const { recipe } = await nutritionApi.generateRecipe({ ingredients, preferences });

        const recipeMsg: NutritionMessage = {
          id: Date.now().toString(),
          type: 'recipe',
          content: '',
          recipe,
        };
        setMessages((prev) => [...prev, recipeMsg]);

        return recipe;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur de génération';
        setError(errorMessage);

        const errorMsg: NutritionMessage = {
          id: Date.now().toString(),
          type: 'bot',
          content: `Impossible de générer la recette: ${errorMessage}`,
        };
        setMessages((prev) => [...prev, errorMsg]);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const saveRecipe = useCallback(async (recipe: GeneratedRecipe, isFromFrigoMode: boolean) => {
    try {
      const recipeData: SaveRecipeInput = {
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTimeMinutes: recipe.prepTimeMinutes,
        cookTimeMinutes: recipe.cookTimeMinutes,
        servings: recipe.servings,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        tags: recipe.tags,
        isFromFrigoMode,
      };

      const saved = await recipeApi.save(recipeData);
      return saved;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de sauvegarde';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getSavedRecipes = useCallback(async (limit = 20, offset = 0, tag?: string) => {
    try {
      const result = await recipeApi.list(limit, offset, tag);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteRecipe = useCallback(async (id: string) => {
    try {
      await recipeApi.delete(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de suppression';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const resetConversation = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    setConversationHistory([]);
    setError(null);
  }, []);

  const checkRateLimit = useCallback(async () => {
    try {
      return await nutritionApi.getRateLimit();
    } catch {
      return null;
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    generateRecipe,
    saveRecipe,
    getSavedRecipes,
    deleteRecipe,
    resetConversation,
    checkRateLimit,
  };
}
