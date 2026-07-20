"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Area, AreaChart } from "recharts";
import { ArrowLeft, Dumbbell, Flame, Scale, TrendingUp } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { coachApi, type StudentProgress } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const weightChartConfig = {
  weight: { label: "Poids", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function StudentProgressPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<StudentProgress | null>(null);

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
    if (!id) return;

    coachApi
      .studentProgress(id)
      .then(setProgress)
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Élève introuvable"))
      .finally(() => setLoading(false));
  }, [router, id]);

  if (!ready) return null;

  const weightData = (progress?.weights ?? []).map((w) => ({
    weight: w.weight,
    date: w.loggedAt,
  }));
  const firstWeight = progress?.weights[0]?.weight;
  const lastWeight = progress?.weights[progress.weights.length - 1]?.weight;
  const delta =
    firstWeight != null && lastWeight != null
      ? Math.round((lastWeight - firstWeight) * 10) / 10
      : null;
  const adherence = progress?.adherence;

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <header className="mb-6">
        <Link
          href="/coach"
          className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Espace coach
        </Link>
        <h1 className="mt-1 text-2xl font-bold">
          {progress?.student.name ?? progress?.student.email ?? "Élève"}
        </h1>
        {progress && (
          <p className="text-sm text-muted-foreground">
            {progress.student.email} · élève depuis le{" "}
            {new Date(progress.student.since).toLocaleDateString("fr-FR")}
          </p>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !progress ? null : (
        <>
          {/* Adherence + program */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
              <CardContent className="py-4">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="size-3.5" />
                  Séances sur 7 jours
                </p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {adherence?.completedLast7Days ?? 0}
                  {adherence?.plannedPerWeek != null && (
                    <span className="text-base font-normal text-muted-foreground">
                      {" "}
                      / {adherence.plannedPerWeek} prévues
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Dumbbell className="size-3.5" />
                  Programme actif
                </p>
                {progress.program ? (
                  <>
                    <p className="mt-1 truncate font-semibold">{progress.program.name}</p>
                    <Badge variant="secondary" className="mt-1 bg-primary/15 text-primary">
                      Phase {progress.program.phase}
                    </Badge>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Aucun</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Weight trend */}
          <Card className="mb-4">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="size-4 text-primary" />
                Poids (90 jours)
              </CardTitle>
              {delta != null && (
                <Badge
                  variant="secondary"
                  className={delta <= 0 ? "bg-primary/15 text-primary" : ""}
                >
                  {delta > 0 ? "+" : ""}
                  {delta} kg
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {weightData.length < 2 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Pas encore assez de pesées pour tracer une courbe.
                </p>
              ) : (
                <ChartContainer config={weightChartConfig} className="h-32 w-full">
                  <AreaChart data={weightData} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
                    <defs>
                      <linearGradient id="studentWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-weight)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-weight)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area
                      dataKey="weight"
                      type="monotone"
                      stroke="var(--color-weight)"
                      strokeWidth={2}
                      fill="url(#studentWeight)"
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent workouts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="size-4 text-primary" />
                Séances réalisées
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {progress.workouts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune séance enregistrée pour l&apos;instant.
                </p>
              ) : (
                progress.workouts.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{w.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(w.loggedAt).toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-muted-foreground">
                      {w.durationMinutes} min
                      {w.caloriesBurned ? ` · ${String(w.caloriesBurned)} kcal` : ""}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
