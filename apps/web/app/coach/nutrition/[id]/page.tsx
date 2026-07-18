"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Pill, UtensilsCrossed } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { nutritionPlanApi, type NutritionPlanInput } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MealForm {
  label: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  foods: string;
  notes: string;
}

interface SupplementForm {
  name: string;
  dosage: string;
  timing: string;
}

const emptyMeal = (label: string): MealForm => ({
  label,
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  foods: "",
  notes: "",
});

/** Parses a form field into an integer ≥ min, or undefined when empty/invalid. */
const toOptionalInt = (value: string, min = 1): number | undefined => {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= min ? Math.round(n) : undefined;
};

export default function NutritionPlanBuilderPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id ?? "new";
  const isNew = id === "new";

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phase, setPhase] = useState("1");
  const [dailyCalories, setDailyCalories] = useState("");
  const [meals, setMeals] = useState<MealForm[]>([]);
  const [supplements, setSupplements] = useState<SupplementForm[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    if (auth.user.role !== "coach") {
      router.replace("/dashboard");
      return;
    }
    setReady(true);
    if (isNew) return;

    nutritionPlanApi
      .get(id)
      .then((p) => {
        setName(p.name);
        setPhase(String(p.phase));
        setDailyCalories(p.dailyCalories != null ? String(p.dailyCalories) : "");
        setMeals(
          p.meals.map((m) => ({
            label: m.label,
            calories: m.targetCalories != null ? String(m.targetCalories) : "",
            protein: m.proteinG != null ? String(m.proteinG) : "",
            carbs: m.carbsG != null ? String(m.carbsG) : "",
            fat: m.fatG != null ? String(m.fatG) : "",
            foods: m.foods.join(", "),
            notes: m.notes ?? "",
          }))
        );
        setSupplements(
          p.supplements.map((s) => ({
            name: s.name,
            dosage: s.dosage ?? "",
            timing: s.timing ?? "",
          }))
        );
      })
      .catch(() => toast.error("Plan introuvable"))
      .finally(() => setLoading(false));
  }, [router, id, isNew]);

  if (!ready) return null;

  function updateMeal(i: number, patch: Partial<MealForm>) {
    setMeals((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  function updateSupplement(i: number, patch: Partial<SupplementForm>) {
    setSupplements((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Donne un nom au plan.");
      return;
    }
    const payload: NutritionPlanInput = {
      name: name.trim(),
      phase: Number(phase) || 1,
      dailyCalories: toOptionalInt(dailyCalories),
      meals: meals
        .filter((m) => m.label.trim())
        .map((m) => ({
          label: m.label.trim(),
          targetCalories: toOptionalInt(m.calories),
          proteinG: toOptionalInt(m.protein, 0),
          carbsG: toOptionalInt(m.carbs, 0),
          fatG: toOptionalInt(m.fat, 0),
          foods: m.foods
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean),
          notes: m.notes.trim() || undefined,
        })),
      supplements: supplements
        .filter((s) => s.name.trim())
        .map((s) => ({
          name: s.name.trim(),
          dosage: s.dosage.trim() || undefined,
          timing: s.timing.trim() || undefined,
        })),
    };

    setSaving(true);
    try {
      if (isNew) {
        await nutritionPlanApi.create(payload);
        toast.success("Plan créé");
      } else {
        await nutritionPlanApi.update(id, payload);
        toast.success("Plan mis à jour");
      }
      router.push("/coach");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement");
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await nutritionPlanApi.remove(id);
      toast.success("Plan supprimé");
      router.push("/coach");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la suppression");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6">
        <Link
          href="/coach"
          className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Espace coach
        </Link>
        <h1 className="mt-1 text-2xl font-bold">
          {isNew ? "Nouveau plan nutrition" : "Modifier le plan nutrition"}
        </h1>
      </header>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="flex flex-wrap gap-3 py-4">
              <div className="flex min-w-48 flex-1 flex-col gap-1.5">
                <Label htmlFor="name">Nom du plan</Label>
                <Input
                  id="name"
                  placeholder="NUTRITION PHASE 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex w-24 flex-col gap-1.5">
                <Label htmlFor="phase">Phase</Label>
                <Input
                  id="phase"
                  type="number"
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                />
              </div>
              <div className="flex w-32 flex-col gap-1.5">
                <Label htmlFor="dailyCalories">Kcal / jour</Label>
                <Input
                  id="dailyCalories"
                  type="number"
                  placeholder="2200"
                  value={dailyCalories}
                  onChange={(e) => setDailyCalories(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            {meals.map((meal, mi) => (
              <Card key={mi}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="size-4 text-primary" />
                    <Input
                      className="w-48"
                      placeholder="Repas 1"
                      value={meal.label}
                      onChange={(e) => updateMeal(mi, { label: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Retirer le repas"
                    className="text-destructive"
                    onClick={() => setMeals((prev) => prev.filter((_, idx) => idx !== mi))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">Kcal</Label>
                      <Input
                        type="number"
                        placeholder="600"
                        value={meal.calories}
                        onChange={(e) => updateMeal(mi, { calories: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">Prot (g)</Label>
                      <Input
                        type="number"
                        placeholder="45"
                        value={meal.protein}
                        onChange={(e) => updateMeal(mi, { protein: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">Gluc (g)</Label>
                      <Input
                        type="number"
                        placeholder="50"
                        value={meal.carbs}
                        onChange={(e) => updateMeal(mi, { carbs: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">Lip (g)</Label>
                      <Input
                        type="number"
                        placeholder="20"
                        value={meal.fat}
                        onChange={(e) => updateMeal(mi, { fat: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                      Aliments imposés / autorisés (séparés par des virgules)
                    </Label>
                    <Input
                      placeholder="poulet, riz basmati, brocoli"
                      value={meal.foods}
                      onChange={(e) => updateMeal(mi, { foods: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Notes (optionnel)</Label>
                    <Input
                      placeholder="Pas de sauce industrielle"
                      value={meal.notes}
                      onChange={(e) => updateMeal(mi, { notes: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            variant="outline"
            className="mt-3"
            onClick={() =>
              setMeals((prev) => [...prev, emptyMeal(`Repas ${String(prev.length + 1)}`)])
            }
          >
            <Plus className="size-4" />
            Ajouter un repas
          </Button>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Pill className="size-4 text-primary" />
                Compléments
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {supplements.length > 0 && (
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xs text-muted-foreground">
                  <span>Nom</span>
                  <span className="w-24">Dosage</span>
                  <span className="w-32">Moment</span>
                  <span className="w-9" />
                </div>
              )}
              {supplements.map((supp, si) => (
                <div key={si} className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
                  <Input
                    placeholder="Créatine"
                    value={supp.name}
                    onChange={(e) => updateSupplement(si, { name: e.target.value })}
                  />
                  <Input
                    className="w-24"
                    placeholder="5 g"
                    value={supp.dosage}
                    onChange={(e) => updateSupplement(si, { dosage: e.target.value })}
                  />
                  <Input
                    className="w-32"
                    placeholder="post-training"
                    value={supp.timing}
                    onChange={(e) => updateSupplement(si, { timing: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Retirer le complément"
                    className="text-destructive"
                    onClick={() => setSupplements((prev) => prev.filter((_, idx) => idx !== si))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="self-start text-primary"
                onClick={() =>
                  setSupplements((prev) => [...prev, { name: "", dosage: "", timing: "" }])
                }
              >
                <Plus className="size-4" />
                Ajouter un complément
              </Button>
            </CardContent>
          </Card>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Enregistrement…" : isNew ? "Créer le plan" : "Enregistrer"}
            </Button>
            {!isNew && (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="size-4" />
                Supprimer
              </Button>
            )}
          </div>

          <Dialog open={confirmingDelete} onOpenChange={(open) => !open && setConfirmingDelete(false)}>
            <DialogTrigger className="hidden" aria-hidden />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Supprimer ce plan nutrition ?</DialogTitle>
                <DialogDescription>
                  Les élèves qui le suivent perdront leurs repas imposés. Cette action est
                  définitive.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmingDelete(false)}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                >
                  {deleting ? "Suppression…" : "Supprimer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </main>
  );
}
