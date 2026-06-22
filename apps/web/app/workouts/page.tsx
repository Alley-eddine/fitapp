"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Play, Pencil, Trash2, X } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { workoutApi, type Workout, type CreateWorkoutInput } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseLibraryDialog } from "@/components/exercise-library-dialog";
import { SessionPlayer, type SessionExercise } from "@/components/session-player";

interface ExerciseRow {
  name: string;
  sets: string;
  reps: string;
  weightKg: string;
  rest: string;
}

const emptyExercise = (): ExerciseRow => ({ name: "", sets: "3", reps: "10", weightKg: "", rest: "90" });

export default function WorkoutsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("45");
  const [exercises, setExercises] = useState<ExerciseRow[]>([emptyExercise()]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [session, setSession] = useState<{ name: string; exercises: SessionExercise[] } | null>(null);

  function refresh() {
    workoutApi
      .list()
      .then((r) => setWorkouts(r.items))
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/login");
      return;
    }
    setReady(true);
    refresh();
  }, [router]);

  if (!ready) return null;

  function updateExercise(i: number, field: keyof ExerciseRow, value: string) {
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, [field]: value } : ex)));
  }

  function addFromLibrary(name: string) {
    setExercises((prev) => {
      const emptyIdx = prev.findIndex((ex) => !ex.name.trim());
      if (emptyIdx >= 0) {
        return prev.map((ex, idx) => (idx === emptyIdx ? { ...ex, name } : ex));
      }
      return [...prev, { ...emptyExercise(), name }];
    });
  }

  function resetForm() {
    setName("");
    setDuration("45");
    setExercises([emptyExercise()]);
    setEditingId(null);
  }

  function toExerciseRows(w: Workout): ExerciseRow[] {
    const rows = w.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets != null ? String(ex.sets) : "3",
      reps: ex.reps != null ? String(ex.reps) : "10",
      weightKg: ex.weightKg != null ? String(ex.weightKg) : "",
      rest: ex.restSeconds != null ? String(ex.restSeconds) : "90",
    }));
    return rows.length > 0 ? rows : [emptyExercise()];
  }

  function cleanedExercises() {
    return exercises
      .filter((ex) => ex.name.trim())
      .map((ex) => ({
        name: ex.name.trim(),
        exerciseType: "muscu" as const,
        sets: Number(ex.sets) || undefined,
        reps: Number(ex.reps) || undefined,
        weightKg: ex.weightKg ? Number(ex.weightKg) : undefined,
        restSeconds: Number(ex.rest) || undefined,
      }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = cleanedExercises();
    if (!name.trim() || cleaned.length === 0) {
      toast.error("Donne un nom de séance et au moins un exercice.");
      return;
    }
    const payload: CreateWorkoutInput = {
      type: name.trim(),
      durationMinutes: Number(duration) || 45,
      exercises: cleaned,
    };
    setSaving(true);
    try {
      if (editingId) {
        await workoutApi.update(editingId, payload);
        toast.success("Séance modifiée");
      } else {
        await workoutApi.create(payload);
        toast.success("Séance enregistrée");
      }
      resetForm();
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(w: Workout) {
    setEditingId(w.id);
    setName(w.type);
    setDuration(String(w.durationMinutes));
    setExercises(toExerciseRows(w));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(w: Workout) {
    if (!window.confirm(`Supprimer la séance « ${w.type} » ?`)) return;
    try {
      await workoutApi.remove(w.id);
      if (editingId === w.id) resetForm();
      toast.success("Séance supprimée");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la suppression");
    }
  }

  function startSession() {
    const list: SessionExercise[] = exercises
      .filter((ex) => ex.name.trim())
      .map((ex) => ({
        name: ex.name.trim(),
        sets: Number(ex.sets) || 3,
        reps: Number(ex.reps) || undefined,
        weightKg: ex.weightKg ? Number(ex.weightKg) : undefined,
        restSeconds: Number(ex.rest) || undefined,
      }));
    if (list.length === 0) {
      toast.error("Ajoute au moins un exercice pour démarrer.");
      return;
    }
    setSession({ name: name.trim() || "Séance", exercises: list });
  }

  function startSavedWorkout(w: Workout) {
    const list: SessionExercise[] = w.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets ?? 3,
      reps: ex.reps ?? undefined,
      weightKg: ex.weightKg,
      restSeconds: ex.restSeconds ?? undefined,
    }));
    if (list.length === 0) {
      toast.error("Cette séance n'a aucun exercice.");
      return;
    }
    setSession({ name: w.type, exercises: list });
  }

  async function handleFinishSession(elapsedSeconds: number) {
    if (!session) return;
    const cleaned = session.exercises.map((ex) => ({
      name: ex.name,
      exerciseType: "muscu" as const,
      sets: ex.sets,
      reps: ex.reps,
      weightKg: typeof ex.weightKg === "string" ? Number(ex.weightKg) || undefined : ex.weightKg ?? undefined,
      restSeconds: ex.restSeconds ?? undefined,
    }));
    const sessionName = session.name;
    setSession(null);
    try {
      await workoutApi.create({
        type: sessionName,
        durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
        exercises: cleaned,
      });
      toast.success("Séance terminée et enregistrée 💪");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement");
    }
  }

  if (session) {
    return (
      <SessionPlayer
        exercises={session.exercises}
        onFinish={handleFinishSession}
        onQuit={() => setSession(null)}
      />
    );
  }

  const isEditing = editingId !== null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Tableau de bord
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Mes séances</h1>
      </header>

      <Card className="mb-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{isEditing ? "Modifier la séance" : "Nouvelle séance"}</CardTitle>
          {isEditing && (
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              <X className="size-4" />
              Annuler
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <Input placeholder="Nom (ex: Dos / Biceps)" value={name} onChange={(e) => setName(e.target.value)} />
              <Input
                type="number"
                placeholder="Durée (min)"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-28"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 text-xs text-muted-foreground">
              <span>Exercice</span>
              <span className="w-16 text-center">Séries</span>
              <span className="w-16 text-center">Reps</span>
              <span className="w-16 text-center">Kg</span>
              <span className="w-16 text-center">Repos s</span>
            </div>
            {exercises.map((ex, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2">
                <Input placeholder="Exercice" value={ex.name} onChange={(e) => updateExercise(i, "name", e.target.value)} />
                <Input type="number" value={ex.sets} onChange={(e) => updateExercise(i, "sets", e.target.value)} className="w-16" />
                <Input type="number" value={ex.reps} onChange={(e) => updateExercise(i, "reps", e.target.value)} className="w-16" />
                <Input type="number" placeholder="—" value={ex.weightKg} onChange={(e) => updateExercise(i, "weightKg", e.target.value)} className="w-16" />
                <Input type="number" value={ex.rest} onChange={(e) => updateExercise(i, "rest", e.target.value)} className="w-16" />
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => setExercises((p) => [...p, emptyExercise()])}
              >
                <Plus className="size-4" />
                Ajouter un exercice
              </Button>
              <ExerciseLibraryDialog onPick={addFromLibrary} />
            </div>

            <div className="flex flex-wrap gap-2">
              {!isEditing && (
                <Button type="button" onClick={startSession} className="grow sm:grow-0">
                  <Play className="size-4" />
                  Démarrer la séance
                </Button>
              )}
              <Button type="submit" variant={isEditing ? "default" : "outline"} disabled={saving}>
                {saving ? "Enregistrement…" : isEditing ? "Enregistrer les modifications" : "Enregistrer sans démarrer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : workouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune séance pour l&apos;instant.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {workouts.map((w) => (
            <Card key={w.id} className={editingId === w.id ? "border-primary/60" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{w.type}</h3>
                    <p className="mt-1 text-sm text-primary">
                      {w.durationMinutes} min · {w.caloriesBurned ?? 0} kcal
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {w.exercises.map((e) => e.name).join(", ") || "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(w.loggedAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {w.exercises.length > 0 && (
                    <Button size="sm" onClick={() => startSavedWorkout(w)}>
                      <Play className="size-4" />
                      Démarrer
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => startEdit(w)}>
                    <Pencil className="size-4" />
                    Modifier
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void handleDelete(w)}>
                    <Trash2 className="size-4" />
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
