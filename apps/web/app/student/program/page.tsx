"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Play, CalendarDays, UserRound, Coffee } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { studentApi, workoutApi, type StudentProgramResponse, type StudentProgramDay } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionPlayer, type SessionExercise } from "@/components/session-player";

const DAY_LABELS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function toSessionExercises(day: StudentProgramDay): SessionExercise[] {
  return day.exercises.map((ex) => ({
    name: ex.name,
    sets: ex.sets ?? 3,
    reps: ex.reps ?? undefined,
    weightKg: ex.weightKg ?? undefined,
    restSeconds: ex.restSeconds ?? undefined,
  }));
}

export default function StudentProgramPage() {
  const router = useRouter();
  const [data, setData] = useState<StudentProgramResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<{ title: string; exercises: SessionExercise[] } | null>(null);

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/login");
      return;
    }
    studentApi
      .program()
      .then(setData)
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleFinish(elapsedSeconds: number) {
    if (!session) return;
    const exercises = session.exercises.map((ex) => ({
      name: ex.name,
      exerciseType: "muscu" as const,
      sets: ex.sets,
      reps: ex.reps,
      weightKg: typeof ex.weightKg === "string" ? Number(ex.weightKg) || undefined : ex.weightKg ?? undefined,
      restSeconds: ex.restSeconds ?? undefined,
    }));
    const title = session.title;
    setSession(null);
    try {
      await workoutApi.create({
        type: title,
        durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
        exercises,
      });
      toast.success("Séance terminée — ton coach la voit 💪");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement");
    }
  }

  if (session) {
    return (
      <SessionPlayer
        exercises={session.exercises}
        onFinish={handleFinish}
        onQuit={() => setSession(null)}
      />
    );
  }

  const program = data?.program ?? null;
  const today = data?.today ?? null;
  const next = data?.next ?? null;

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <header className="mb-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Tableau de bord
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Mon programme</h1>
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !program ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CalendarDays className="mx-auto mb-3 size-10 text-muted-foreground" />
            <p className="font-medium">Aucun programme pour l&apos;instant</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ton coach ne t&apos;a pas encore assigné de programme. Tu peux quand même suivre
              ton poids, tes pas et créer tes séances.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4 border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{program.name}</p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <UserRound className="size-4" />
                    {program.coach.name ?? "Ton coach"}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-primary/15 text-primary">
                  Phase {program.phase}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Today */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Ta séance du jour</CardTitle>
            </CardHeader>
            <CardContent>
              {today ? (
                <>
                  <p className="font-semibold">{today.title}</p>
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                    {today.exercises.map((ex) => (
                      <li key={ex.id ?? ex.name} className="flex justify-between border-b py-1">
                        <span className="text-foreground">{ex.name}</span>
                        <span>
                          {ex.sets ?? 3} × {ex.reps ?? "—"}
                          {ex.weightKg ? ` · ${String(ex.weightKg)} kg` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-4 w-full"
                    disabled={today.exercises.length === 0}
                    onClick={() => setSession({ title: today.title, exercises: toSessionExercises(today) })}
                  >
                    <Play className="size-4" />
                    Démarrer la séance
                  </Button>
                </>
              ) : (
                <div className="py-4 text-center">
                  <Coffee className="mx-auto mb-2 size-8 text-primary" />
                  <p className="font-medium">Jour de repos</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {next
                      ? `Prochaine séance : ${DAY_LABELS[next.dayOfWeek] ?? ""} — ${next.title}`
                      : "Profite, rien de prévu aujourd'hui."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Week — every session is startable; the student spaces them freely */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mes séances</CardTitle>
              <p className="text-sm text-muted-foreground">
                Fais-les quand tu veux — l&apos;important, c&apos;est de bien les espacer.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {program.days.map((d) => {
                const isToday = d.dayOfWeek === data?.todayDayOfWeek;
                return (
                  <div
                    key={d.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                      isToday ? "border-primary/60" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {d.title}
                        {isToday && <span className="ml-2 text-xs text-primary">aujourd&apos;hui</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {DAY_LABELS[d.dayOfWeek]} · {d.exercises.length} exo
                        {d.exercises.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isToday ? "default" : "outline"}
                      disabled={d.exercises.length === 0}
                      onClick={() =>
                        setSession({ title: d.title, exercises: toSessionExercises(d) })
                      }
                    >
                      <Play className="size-4" />
                      Démarrer
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
