"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Bookmark, Salad, Sparkles, UserRound, Pill } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { studentApi, type StudentNutritionPlan, type GeneratedRecipe } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecipeCard } from "@/components/recipe-card";

export default function StudentNutritionPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<StudentNutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Record<string, GeneratedRecipe>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/login");
      return;
    }
    studentApi
      .nutrition()
      .then((r) => setPlan(r.plan))
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [router]);

  async function generate(mealId: string) {
    const extras = (drafts[mealId] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setGeneratingId(mealId);
    try {
      const res = await studentApi.mealRecipe(mealId, extras);
      setRecipes((prev) => ({ ...prev, [mealId]: res.recipe }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la génération");
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Tableau de bord
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Mes repas</h1>
        </div>
        <Link
          href="/recipes"
          className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
        >
          <Bookmark className="size-4" />
          Mes recettes
        </Link>
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !plan ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Salad className="mx-auto mb-3 size-10 text-muted-foreground" />
            <p className="font-medium">Aucun plan nutrition pour l&apos;instant</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ton coach ne t&apos;a pas encore assigné de plan. En attendant, le Frigo Mode reste
              dispo pour improviser.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4 border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{plan.name}</p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <UserRound className="size-4" />
                    {plan.coach.name ?? "Ton coach"}
                    {plan.dailyCalories ? ` · ${String(plan.dailyCalories)} kcal/j` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-primary/15 text-primary">
                  Phase {plan.phase}
                </Badge>
              </div>
              {plan.notes && <p className="mt-2 text-sm text-muted-foreground">{plan.notes}</p>}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            {plan.meals.map((meal) => {
              const mealId = meal.id ?? meal.label;
              const recipe = meal.id ? recipes[meal.id] : undefined;
              const generating = generatingId === meal.id;
              return (
                <Card key={mealId}>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base">{meal.label}</CardTitle>
                    {meal.targetCalories != null && (
                      <Badge variant="secondary" className="bg-primary/15 text-primary">
                        {meal.targetCalories} kcal
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {(meal.proteinG != null || meal.carbsG != null || meal.fatG != null) && (
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {meal.proteinG != null && <span>Prot. {meal.proteinG} g</span>}
                        {meal.carbsG != null && <span>Gluc. {meal.carbsG} g</span>}
                        {meal.fatG != null && <span>Lip. {meal.fatG} g</span>}
                      </div>
                    )}
                    {meal.foods.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {meal.foods.map((food) => (
                          <Badge key={food} variant="outline">
                            {food}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {meal.notes && <p className="text-sm text-muted-foreground">{meal.notes}</p>}

                    {meal.id && (
                      <>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ajoute ce que tu as (optionnel)"
                            value={drafts[meal.id] ?? ""}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [String(meal.id)]: e.target.value }))
                            }
                            disabled={generating}
                          />
                          <Button
                            disabled={generatingId !== null}
                            onClick={() => void generate(String(meal.id))}
                          >
                            <Sparkles className="size-4" />
                            {generating ? "Chef Marco cuisine…" : "Recette"}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          L&apos;IA varie les plats mais reste dans le cadre fixé par ton coach.
                        </p>
                        {recipe && <RecipeCard recipe={recipe} saveSource="coach-plan" />}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {plan.supplements.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Pill className="size-4 text-primary" />
                  Compléments
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {plan.supplements.map((supp) => (
                  <div
                    key={supp.id ?? supp.name}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <p className="font-medium">{supp.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[supp.dosage, supp.timing].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </main>
  );
}
