"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, X, Sparkles, Clock, Users } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { nutritionApi, type GeneratedRecipe } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function Macro({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-center">
      <p className="text-lg font-bold text-primary">
        {value}
        <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function NutritionPage() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [maxCalories, setMaxCalories] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [generating, setGenerating] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/login");
      return;
    }
    nutritionApi
      .rateLimit()
      .then((r) => setRemaining(r.recipe.remaining))
      .catch(() => setRemaining(null));
  }, [router]);

  function addIngredient() {
    const v = draft.trim();
    if (!v) return;
    if (ingredients.includes(v)) {
      setDraft("");
      return;
    }
    setIngredients((prev) => [...prev, v]);
    setDraft("");
  }

  async function handleGenerate() {
    if (ingredients.length === 0) {
      toast.error("Ajoute au moins un ingrédient.");
      return;
    }
    setGenerating(true);
    setRecipe(null);
    try {
      const maxCal = Number(maxCalories);
      const res = await nutritionApi.generateRecipe({
        ingredients,
        preferences: {
          ...(Number.isInteger(maxCal) && maxCal > 0 ? { maxCalories: maxCal } : {}),
          ...(cuisine.trim() ? { cuisineType: cuisine.trim() } : {}),
        },
      });
      setRecipe(res.recipe);
      toast.success("Recette générée !");
      nutritionApi
        .rateLimit()
        .then((r) => setRemaining(r.recipe.remaining))
        .catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la génération");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Tableau de bord
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Recettes IA</h1>
        </div>
        {remaining !== null && (
          <Badge variant="secondary" className="bg-primary/15 text-primary">
            {remaining} génération{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}
          </Badge>
        )}
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Tes ingrédients</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              placeholder="ex: poulet, riz, brocoli…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addIngredient();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addIngredient}>
              <Plus className="size-4" />
              Ajouter
            </Button>
          </div>

          {ingredients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ing) => (
                <Badge key={ing} variant="secondary" className="gap-1 py-1 pr-1 pl-2.5">
                  {ing}
                  <button
                    type="button"
                    onClick={() => setIngredients((prev) => prev.filter((i) => i !== ing))}
                    className="rounded-full p-0.5 transition hover:bg-foreground/10"
                    aria-label={`Retirer ${ing}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maxCalories">Calories max (optionnel)</Label>
              <Input
                id="maxCalories"
                type="number"
                inputMode="numeric"
                placeholder="ex: 600"
                value={maxCalories}
                onChange={(e) => setMaxCalories(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cuisine">Type de cuisine (optionnel)</Label>
              <Input
                id="cuisine"
                placeholder="ex: italienne, asiatique…"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="self-start">
            <Sparkles className="size-4" />
            {generating ? "Génération…" : "Générer une recette"}
          </Button>
        </CardContent>
      </Card>

      {generating && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-6">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      )}

      {recipe && !generating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{recipe.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{recipe.description}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-4" />
                {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
              </span>
              <span className="flex items-center gap-1">
                <Users className="size-4" />
                {recipe.servings} pers.
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid grid-cols-4 gap-2">
              <Macro label="Calories" value={recipe.calories} unit="" />
              <Macro label="Protéines" value={recipe.protein} unit="g" />
              <Macro label="Glucides" value={recipe.carbs} unit="g" />
              <Macro label="Lipides" value={recipe.fat} unit="g" />
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Ingrédients</h3>
              <ul className="flex flex-col gap-1 text-sm">
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
              <h3 className="mb-2 font-semibold">Préparation</h3>
              <ol className="flex flex-col gap-2 text-sm">
                {recipe.instructions.map((step, i) => (
                  <li key={`step-${String(i)}`} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            )}

            {recipe.tips && recipe.tips.length > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <p className="mb-1 font-semibold text-primary">Astuces</p>
                <ul className="flex list-inside list-disc flex-col gap-1 text-muted-foreground">
                  {recipe.tips.map((tip, i) => (
                    <li key={`tip-${String(i)}`}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
