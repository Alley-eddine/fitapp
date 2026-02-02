import Groq from 'groq-sdk';
import type {
  IAIProvider,
  RecipeGenerationInput,
  GeneratedRecipe,
  FrigoModeInput,
  FrigoModeResponse,
  UserProfile,
} from '../domain/interfaces/index.js';
import { env } from '../config/env.js';

const CHEF_SYSTEM_PROMPT = `Tu es Chef Marco, un chef étoilé de renommée internationale avec 25 ans d'expérience dans les plus grands restaurants du monde (Paris, Tokyo, New York, Bangkok). Tu as travaillé avec des légendes comme Alain Ducasse et Joël Robuchon.

🎯 TA MISSION:
Tu aides les gens à cuisiner des plats délicieux et adaptés à leurs objectifs fitness avec les ingrédients qu'ils ont.

💪 TON STYLE:
- Tu es passionné, chaleureux et encourageant
- Tu tutoies les gens comme un ami
- Tu donnes des astuces de pro

🚨 RÈGLE CRITIQUE - CONVERSATION AVANT RECETTE:
Tu dois avoir une VRAIE CONVERSATION avant de proposer une recette. Tu ne proposes JAMAIS de recette dès le premier ou deuxième message.

ÉTAPES OBLIGATOIRES:
1. PREMIER MESSAGE: Accueille et demande les ingrédients disponibles
2. DEUXIÈME MESSAGE: Demande les épices/condiments ET l'équipement (four, poêle, wok, etc.)
3. TROISIÈME MESSAGE: Demande le type de cuisine souhaité (asiatique, méditerranéen, mexicain, français...) et si c'est un plat rapide ou élaboré
4. SEULEMENT APRÈS ces 3 étapes: Propose UNE SEULE recette finale

⚠️ RÈGLES DE CUISINE RÉALISTES:
- Propose UNIQUEMENT des recettes qui existent vraiment ou des variantes de plats classiques
- Respecte les associations traditionnelles des cuisines du monde:
  * Ras el hanout = cuisine marocaine (couscous, tagines, PAS avec de la crème)
  * Crème = cuisine française (sauces, gratins)
  * Soja/gingembre = cuisine asiatique
  * Cumin/coriandre = cuisine mexicaine ou indienne
- Ne mélange PAS les cuisines de façon incohérente
- Si tu n'es pas sûr d'une association, demande à l'utilisateur ce qu'il préfère

📋 FORMAT JSON OBLIGATOIRE:
Tu réponds TOUJOURS en JSON valide (sans markdown, sans backticks)`;

const RECIPE_JSON_SCHEMA = `{
  "title": "Nom créatif et appétissant de la recette",
  "description": "Description qui donne envie en 2-3 phrases",
  "ingredients": [{"name": "ingrédient", "quantity": "100", "unit": "g"}],
  "instructions": ["Étape détaillée 1...", "Étape détaillée 2..."],
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 25,
  "servings": 2,
  "calories": 450,
  "protein": 35,
  "carbs": 40,
  "fat": 15,
  "tags": ["cuisine-italienne", "rapide", "high-protein"],
  "tips": ["Mon secret de chef: ...", "Astuce pour les débutants: ..."]
}`;

export class GroqProvider implements IAIProvider {
  private client: Groq;
  private model = 'llama-3.3-70b-versatile';

  constructor() {
    this.client = new Groq({ apiKey: env.GROQ_API_KEY });
  }

  async generateRecipe(input: RecipeGenerationInput): Promise<GeneratedRecipe> {
    const userPrompt = this.buildRecipePrompt(input);

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: CHEF_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });

    const text = completion.choices[0]?.message?.content ?? '';
    return this.parseRecipeResponse(text);
  }

  async frigoModeChat(input: FrigoModeInput): Promise<FrigoModeResponse> {
    // Build system prompt with user profile context
    let systemPrompt = CHEF_SYSTEM_PROMPT;

    if (input.userProfile) {
      systemPrompt += this.buildUserProfileContext(input.userProfile);
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    if (input.conversationHistory && input.conversationHistory.length > 0) {
      for (const msg of input.conversationHistory) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    // Add current user message with instructions
    const userMessage = this.buildFrigoModeUserMessage(input);
    messages.push({ role: 'user', content: userMessage });

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.8,
      max_tokens: 2500,
    });

    const text = completion.choices[0]?.message?.content ?? '';
    return this.parseFrigoModeResponse(text);
  }

  private buildUserProfileContext(profile: UserProfile): string {
    const goalMap: Record<string, string> = {
      lose_weight: 'perdre du poids (déficit calorique, moins de glucides)',
      gain_muscle: 'prendre du muscle (surplus calorique, beaucoup de protéines)',
      maintain: 'maintenir son poids (équilibre calorique)',
      improve_health: 'améliorer sa santé générale (équilibré, varié)',
    };

    const activityMap: Record<string, string> = {
      sedentary: 'sédentaire',
      light: 'légèrement actif',
      moderate: 'modérément actif',
      active: 'actif',
      very_active: 'très actif (sport intense)',
    };

    let context = '\n\n👤 PROFIL DE L\'UTILISATEUR:';

    if (profile.goal) {
      context += `\n- Objectif: ${goalMap[profile.goal] || profile.goal}`;
    }
    if (profile.currentWeight) {
      context += `\n- Poids actuel: ${profile.currentWeight} kg`;
    }
    if (profile.targetWeight) {
      context += `\n- Poids cible: ${profile.targetWeight} kg`;
    }
    if (profile.activityLevel) {
      context += `\n- Niveau d'activité: ${activityMap[profile.activityLevel] || profile.activityLevel}`;
    }
    if (profile.allergies && profile.allergies.length > 0) {
      context += `\n- ⚠️ ALLERGIES (ÉVITER ABSOLUMENT): ${profile.allergies.join(', ')}`;
    }
    if (profile.dietaryRestrictions && profile.dietaryRestrictions.length > 0) {
      context += `\n- Restrictions alimentaires: ${profile.dietaryRestrictions.join(', ')}`;
    }

    context += '\n\n🎯 Adapte tes recettes à ce profil! Si l\'objectif est perte de poids, privilégie les recettes low-carb et riches en protéines. Si c\'est prise de muscle, augmente les portions et les protéines.';

    return context;
  }

  private buildRecipePrompt(input: RecipeGenerationInput): string {
    let prompt = `Génère une recette utilisant ces ingrédients: ${input.ingredients.join(', ')}.\n\n`;

    if (input.preferences) {
      if (input.preferences.maxCalories) {
        prompt += `Calories maximum par portion: ${String(input.preferences.maxCalories)}\n`;
      }
      if (input.preferences.minProtein) {
        prompt += `Protéines minimum par portion: ${String(input.preferences.minProtein)}g\n`;
      }
      if (input.preferences.dietaryRestrictions?.length) {
        prompt += `Restrictions alimentaires: ${input.preferences.dietaryRestrictions.join(', ')}\n`;
      }
      if (input.preferences.cuisineType) {
        prompt += `Type de cuisine préféré: ${input.preferences.cuisineType}\n`;
      }
    }

    if (input.userContext) {
      if (input.userContext.goal) {
        prompt += `Objectif fitness de l'utilisateur: ${input.userContext.goal}\n`;
      }
      if (input.userContext.allergies?.length) {
        prompt += `Allergies à éviter: ${input.userContext.allergies.join(', ')}\n`;
      }
    }

    prompt += `\nRéponds UNIQUEMENT avec du JSON valide (sans markdown, sans backticks):
${RECIPE_JSON_SCHEMA}`;

    return prompt;
  }

  private buildFrigoModeUserMessage(input: FrigoModeInput): string {
    const conversationLength = input.conversationHistory?.length ?? 0;
    let userMessage = input.message;

    userMessage += `

RAPPEL: Réponds UNIQUEMENT en JSON valide (pas de markdown, pas de backticks).

🚨 RÈGLE ABSOLUE - CONVERSATION AVANT RECETTE:
Nombre de messages échangés jusqu'ici: ${String(conversationLength)}

${conversationLength < 4 ? `⛔ Tu n'as PAS ENCORE le droit de proposer une recette!
Tu dois d'abord:
- Demander les ÉPICES disponibles (si pas encore fait)
- Demander l'ÉQUIPEMENT de cuisine (poêle, four, wok...)
- Demander le TYPE de cuisine souhaité (asiatique, français, mexicain...)
- Demander si c'est pour un plat RAPIDE ou ÉLABORÉ

Réponds avec "recipe": null et pose des questions!` : `✅ Tu peux maintenant proposer UNE SEULE recette finale.
La recette doit être RÉALISTE et basée sur des vraies traditions culinaires.
PAS de mélanges bizarres (ex: ras el hanout + crème = NON)`}

FORMAT DE RÉPONSE:
{
  "message": "Ta réponse de Chef Marco",
  "recipe": ${conversationLength < 4 ? 'null' : RECIPE_JSON_SCHEMA},
  "suggestedIngredients": []
}

${conversationLength >= 4 ? `IMPORTANT pour la recette:
- Propose une recette qui EXISTE vraiment (ou une variante de plat classique)
- Respecte les traditions culinaires (ras el hanout = marocain, crème = français, soja = asiatique)
- NE mélange PAS des cuisines incompatibles
- Calcule les macros de façon réaliste` : ''}`;

    return userMessage;
  }

  private parseRecipeResponse(text: string): GeneratedRecipe {
    console.log('Groq raw response:', text.substring(0, 500));
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return this.normalizeRecipe(parsed);
  }

  private parseFrigoModeResponse(text: string): FrigoModeResponse {
    console.log('Groq frigo mode raw response:', text.substring(0, 500));
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { message: text };
    }
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.recipe) {
        parsed.recipe = this.normalizeRecipe(parsed.recipe);
      }
      return parsed as FrigoModeResponse;
    } catch {
      return { message: text };
    }
  }

  private normalizeRecipe(recipe: Record<string, unknown>): GeneratedRecipe {
    return {
      title: String(recipe.title || 'Création du Chef'),
      description: String(recipe.description || ''),
      ingredients: Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map((ing: Record<string, unknown>) => ({
            name: String(ing.name || ''),
            quantity: String(ing.quantity || ''),
            unit: String(ing.unit || ''),
          }))
        : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions.map(String) : [],
      prepTimeMinutes: Math.round(Number(recipe.prepTimeMinutes) || 10),
      cookTimeMinutes: Math.round(Number(recipe.cookTimeMinutes) || 20),
      servings: Math.round(Number(recipe.servings) || 2),
      calories: Math.round(Number(recipe.calories) || 400),
      protein: Math.round(Number(recipe.protein) || 25),
      carbs: Math.round(Number(recipe.carbs) || 35),
      fat: Math.round(Number(recipe.fat) || 15),
      tags: Array.isArray(recipe.tags) ? recipe.tags.map(String) : [],
      tips: Array.isArray(recipe.tips) ? recipe.tips.map(String) : [],
    };
  }
}
