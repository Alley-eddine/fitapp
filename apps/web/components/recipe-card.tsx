"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, ChefHat, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { recipeApi, toSaveRecipePayload, type GeneratedRecipe } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RecipeCardProps {
  recipe: GeneratedRecipe;
  /** When set, shows the save button; the value flags where the recipe was generated. */
  saveSource?: "frigo" | "coach-plan";
}

/** Renders an AI-generated recipe (title, macros, ingredients, steps). */
export function RecipeCard({ recipe, saveSource }: RecipeCardProps) {
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // Regenerating swaps the recipe inside the same card instance — allow saving again.
  useEffect(() => {
    setSaveState("idle");
  }, [recipe]);

  async function save() {
    if (!saveSource || saveState !== "idle") return;
    setSaveState("saving");
    try {
      await recipeApi.save(toSaveRecipePayload(recipe, saveSource === "frigo"));
      setSaveState("saved");
      toast.success("Recette enregistrée dans « Mes recettes »");
    } catch (err) {
      setSaveState("idle");
      toast.error(err instanceof Error ? err.message : "Impossible d'enregistrer la recette");
    }
  }

  const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  return (
    <Card className="mt-2 bg-background">
      <CardContent className="flex flex-col gap-4 py-4">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <ChefHat className="size-4 text-primary" />
            {recipe.title}
          </h3>
          {recipe.description && (
            <p className="mt-1 text-sm text-muted-foreground">{recipe.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {totalMinutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {totalMinutes} min
              </span>
            )}
            {recipe.servings > 0 && (
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                {recipe.servings} pers.
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { l: "kcal", v: recipe.calories },
            { l: "Prot.", v: `${String(recipe.protein)}g` },
            { l: "Gluc.", v: `${String(recipe.carbs)}g` },
            { l: "Lip.", v: `${String(recipe.fat)}g` },
          ].map((m) => (
            <div key={m.l} className="rounded-lg border py-1.5">
              <p className="text-sm font-bold text-primary">{m.v}</p>
              <p className="text-[10px] text-muted-foreground">{m.l}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold">Ingrédients</p>
          <ul className="flex flex-col gap-0.5 text-sm">
            {recipe.ingredients.map((ing, i) => (
              <li key={`${ing.name}-${String(i)}`} className="flex justify-between border-b py-1">
                <span>{ing.name}</span>
                <span className="text-muted-foreground">
                  {ing.quantity} {ing.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold">Préparation</p>
          <ol className="flex flex-col gap-1.5 text-sm">
            {recipe.instructions.map((step, i) => (
              <li key={`s-${String(i)}`} className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {saveSource && (
          <Button
            variant="outline"
            size="sm"
            disabled={saveState !== "idle"}
            onClick={() => void save()}
          >
            {saveState === "saved" ? (
              <BookmarkCheck className="size-4 text-primary" />
            ) : (
              <Bookmark className="size-4" />
            )}
            {saveState === "saving"
              ? "Enregistrement…"
              : saveState === "saved"
                ? "Enregistrée"
                : "Enregistrer la recette"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
