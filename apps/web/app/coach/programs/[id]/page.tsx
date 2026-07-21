"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, CalendarPlus } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { programApi, type ProgramInput } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { ExerciseLibraryDialog } from "@/components/exercise-library-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DAY_LABELS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

interface ExerciseRow {
  name: string;
  sets: string;
  reps: string;
  weightKg: string;
  rest: string;
}

interface DayRow {
  dayOfWeek: number;
  title: string;
  exercises: ExerciseRow[];
}

const emptyExercise = (name = ""): ExerciseRow => ({
  name,
  sets: "4",
  reps: "10",
  weightKg: "",
  rest: "90",
});

export default function ProgramBuilderPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id ?? "new";
  const isNew = id === "new";

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phase, setPhase] = useState("1");
  const [days, setDays] = useState<DayRow[]>([]);
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

    programApi
      .get(id)
      .then((p) => {
        setName(p.name);
        setPhase(String(p.phase));
        setDays(
          p.days.map((d) => ({
            dayOfWeek: d.dayOfWeek,
            title: d.title,
            exercises: d.exercises.map((e) => ({
              name: e.name,
              sets: e.sets != null ? String(e.sets) : "4",
              reps: e.reps != null ? String(e.reps) : "10",
              weightKg: e.weightKg != null ? String(e.weightKg) : "",
              rest: e.restSeconds != null ? String(e.restSeconds) : "90",
            })),
          }))
        );
      })
      .catch(() => toast.error("Programme introuvable"))
      .finally(() => setLoading(false));
  }, [router, id, isNew]);

  if (!ready) return null;

  const usedDays = new Set(days.map((d) => d.dayOfWeek));
  const freeDay = [1, 2, 3, 4, 5, 6, 7].find((d) => !usedDays.has(d));

  function addDay() {
    if (!freeDay) {
      toast.error("Les 7 jours sont déjà utilisés.");
      return;
    }
    setDays((prev) => [
      ...prev,
      { dayOfWeek: freeDay, title: DAY_LABELS[freeDay] ?? "Séance", exercises: [emptyExercise()] },
    ]);
  }

  function updateDay(i: number, patch: Partial<DayRow>) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  function updateExercise(di: number, ei: number, field: keyof ExerciseRow, value: string) {
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === di
          ? {
              ...d,
              exercises: d.exercises.map((ex, exIdx) =>
                exIdx === ei ? { ...ex, [field]: value } : ex
              ),
            }
          : d
      )
    );
  }

  function addExercise(di: number, exerciseName = "") {
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === di ? { ...d, exercises: [...d.exercises, emptyExercise(exerciseName)] } : d
      )
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Donne un nom au programme.");
      return;
    }
    const payload: ProgramInput = {
      name: name.trim(),
      phase: Number(phase) || 1,
      days: days.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        title: d.title.trim() || (DAY_LABELS[d.dayOfWeek] ?? "Séance"),
        exercises: d.exercises
          .filter((ex) => ex.name.trim())
          .map((ex) => ({
            name: ex.name.trim(),
            exerciseType: "muscu",
            sets: Number(ex.sets) || undefined,
            reps: Number(ex.reps) || undefined,
            weightKg: ex.weightKg ? Number(ex.weightKg) : undefined,
            restSeconds: Number(ex.rest) || undefined,
          })),
      })),
    };

    setSaving(true);
    try {
      if (isNew) {
        await programApi.create(payload);
        toast.success("Programme créé");
      } else {
        await programApi.update(id, payload);
        toast.success("Programme mis à jour");
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
      await programApi.remove(id);
      toast.success("Programme supprimé");
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
          {isNew ? "Nouveau programme" : "Modifier le programme"}
        </h1>
      </header>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="flex flex-wrap gap-3 py-4">
              <div className="flex min-w-48 flex-1 flex-col gap-1.5">
                <Label htmlFor="name">Nom du programme</Label>
                <Input
                  id="name"
                  placeholder="PHASE 1"
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
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            {days.map((day, di) => (
              <Card key={di}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={String(day.dayOfWeek)}
                      onValueChange={(v) => updateDay(di, { dayOfWeek: Number(v ?? "1") })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                          <SelectItem key={d} value={String(d)} disabled={usedDays.has(d) && d !== day.dayOfWeek}>
                            {DAY_LABELS[d]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-48"
                      placeholder="Titre (ex: Dos + Circuit)"
                      value={day.title}
                      onChange={(e) => updateDay(di, { title: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Retirer le jour"
                    className="text-destructive"
                    onClick={() => setDays((prev) => prev.filter((_, idx) => idx !== di))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 text-xs text-muted-foreground">
                    <span>Exercice</span>
                    <span className="w-14 text-center">Séries</span>
                    <span className="w-14 text-center">Reps</span>
                    <span className="w-14 text-center">Kg</span>
                    <span className="w-14 text-center">Repos</span>
                  </div>
                  {day.exercises.map((ex, ei) => (
                    <div key={ei} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2">
                      <Input
                        placeholder="Exercice"
                        value={ex.name}
                        onChange={(e) => updateExercise(di, ei, "name", e.target.value)}
                      />
                      <Input className="w-14" type="number" value={ex.sets} onChange={(e) => updateExercise(di, ei, "sets", e.target.value)} />
                      <Input className="w-14" type="number" value={ex.reps} onChange={(e) => updateExercise(di, ei, "reps", e.target.value)} />
                      <Input className="w-14" type="number" placeholder="—" value={ex.weightKg} onChange={(e) => updateExercise(di, ei, "weightKg", e.target.value)} />
                      <Input className="w-14" type="number" value={ex.rest} onChange={(e) => updateExercise(di, ei, "rest", e.target.value)} />
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => addExercise(di)}>
                      <Plus className="size-4" />
                      Ajouter un exercice
                    </Button>
                    <ExerciseLibraryDialog onPick={(n) => addExercise(di, n)} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={addDay} disabled={!freeDay}>
              <CalendarPlus className="size-4" />
              Ajouter un jour
            </Button>
            <Button disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Enregistrement…" : isNew ? "Créer le programme" : "Enregistrer"}
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
                <DialogTitle>Supprimer ce programme ?</DialogTitle>
                <DialogDescription>
                  Les élèves qui le suivent perdront leurs séances prévues. Cette action est
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
