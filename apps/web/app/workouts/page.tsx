"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { workoutApi, type Workout } from "@/lib/api";
import { Button, Input, Card } from "@/components/ui";

interface ExerciseRow {
  name: string;
  sets: string;
  reps: string;
  weightKg: string;
}

const emptyExercise = (): ExerciseRow => ({ name: "", sets: "3", reps: "10", weightKg: "" });

export default function WorkoutsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("45");
  const [exercises, setExercises] = useState<ExerciseRow[]>([emptyExercise()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function refresh() {
    workoutApi
      .list()
      .then((r) => setWorkouts(r.items))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erreur"));
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cleaned = exercises
      .filter((ex) => ex.name.trim())
      .map((ex) => ({
        name: ex.name.trim(),
        exerciseType: "muscu" as const,
        sets: Number(ex.sets) || undefined,
        reps: Number(ex.reps) || undefined,
        weightKg: ex.weightKg ? Number(ex.weightKg) : undefined,
      }));
    if (!name.trim() || cleaned.length === 0) {
      setError("Donne un nom de séance et au moins un exercice.");
      return;
    }
    setSaving(true);
    try {
      await workoutApi.create({ type: name.trim(), durationMinutes: Number(duration) || 45, exercises: cleaned });
      setName("");
      setDuration("45");
      setExercises([emptyExercise()]);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mes séances</h1>
        <Link href="/dashboard" className="text-sm text-slate-400 transition hover:text-cyan-300">
          ← Dashboard
        </Link>
      </div>

      {/* Création */}
      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Nouvelle séance</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Input placeholder="Nom (ex: Dos / Biceps)" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              type="number"
              placeholder="Durée (min)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-32"
            />
          </div>

          {exercises.map((ex, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="Exercice"
                value={ex.name}
                onChange={(e) => updateExercise(i, "name", e.target.value)}
              />
              <Input
                type="number"
                placeholder="Séries"
                value={ex.sets}
                onChange={(e) => updateExercise(i, "sets", e.target.value)}
                className="w-24"
              />
              <Input
                type="number"
                placeholder="Reps"
                value={ex.reps}
                onChange={(e) => updateExercise(i, "reps", e.target.value)}
                className="w-24"
              />
              <Input
                type="number"
                placeholder="Kg"
                value={ex.weightKg}
                onChange={(e) => updateExercise(i, "weightKg", e.target.value)}
                className="w-24"
              />
            </div>
          ))}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setExercises((p) => [...p, emptyExercise()])}
              className="text-sm text-cyan-300 transition hover:text-cyan-200"
            >
              + Ajouter un exercice
            </button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={saving} className="self-start">
            {saving ? "Enregistrement..." : "Enregistrer la séance"}
          </Button>
        </form>
      </Card>

      {/* Historique */}
      {workouts.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune séance pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {workouts.map((w) => (
            <Card key={w.id}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{w.type}</h3>
                <span className="text-sm text-slate-400">
                  {new Date(w.loggedAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <p className="mt-1 text-sm text-cyan-300">
                {w.durationMinutes} min · {w.caloriesBurned ?? 0} kcal
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {w.exercises.map((e) => e.name).join(", ") || "—"}
              </p>
            </Card>
          ))}
        </ul>
      )}
    </main>
  );
}
