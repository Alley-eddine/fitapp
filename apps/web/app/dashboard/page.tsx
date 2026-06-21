"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Area, AreaChart } from "recharts";
import {
  Dumbbell,
  Scale,
  Flame,
  Footprints,
  UtensilsCrossed,
  LogOut,
  ChevronRight,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
} from "lucide-react";
import { getAuth, logout, type AuthUser } from "@/lib/auth";
import {
  coachApi,
  profileApi,
  stepsApi,
  weightApi,
  workoutApi,
  type CoachStudent,
  type Profile,
  type StepsToday,
  type WeightEntry,
  type Workout,
  type WeeklyStats,
} from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleBadge } from "@/components/role-badge";
import { ProgressRing } from "@/components/progress-ring";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const QUICK_LINKS = [
  { href: "/workouts", label: "Séances", icon: Dumbbell },
  { href: "/weight", label: "Poids", icon: Scale },
  { href: "/steps", label: "Pas", icon: Footprints },
  { href: "/nutrition", label: "Recettes", icon: UtensilsCrossed },
  { href: "/profile", label: "Profil", icon: Flame },
];

const weightChartConfig = {
  weight: { label: "Poids", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [today, setToday] = useState<StepsToday | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weekly, setWeekly] = useState<WeeklyStats | null>(null);
  const [students, setStudents] = useState<CoachStudent[]>([]);

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    setUser(auth.user);

    Promise.allSettled([
      profileApi.get(),
      stepsApi.today(),
      weightApi.history(30),
      workoutApi.list(),
      workoutApi.weeklyStats(),
    ])
      .then(([p, t, w, wk, st]) => {
        if (p.status === "fulfilled" && !p.value.onboardingCompleted) {
          router.replace("/onboarding");
          return;
        }
        if (p.status === "fulfilled") setProfile(p.value);
        if (t.status === "fulfilled") setToday(t.value);
        if (w.status === "fulfilled") setWeights(w.value);
        if (wk.status === "fulfilled") setWorkouts(wk.value.items);
        if (st.status === "fulfilled") setWeekly(st.value);
      })
      .finally(() => setLoading(false));

    if (auth.user.role === "coach") {
      coachApi
        .students()
        .then((r) => setStudents(r.students))
        .catch(() => undefined);
    }
  }, [router]);

  if (!user) return null;

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const sortedWeights = [...weights].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  );
  const latestWeight = sortedWeights[sortedWeights.length - 1];
  const weightDelta =
    sortedWeights.length >= 2
      ? sortedWeights[sortedWeights.length - 1]!.weight - sortedWeights[0]!.weight
      : 0;
  const WeightTrend = weightDelta > 0 ? TrendingUp : weightDelta < 0 ? TrendingDown : Minus;
  const weightChartData = sortedWeights.map((w) => ({ weight: w.weight }));
  const recentWorkouts = workouts.slice(0, 3);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Bonjour 👋</p>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            {user.name ?? user.email}
            <RoleBadge role={user.role} />
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/notifications"
            aria-label="Notifications"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <Bell className="size-4" />
          </Link>
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Déconnexion">
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      {/* Today hero */}
      <Card className="mb-4 border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
        <CardContent className="flex items-center gap-5 py-5">
          {loading || !today ? (
            <Skeleton className="size-[130px] rounded-full" />
          ) : (
            <ProgressRing value={today.percentage} size={130}>
              <span className="text-2xl font-bold">{today.steps.toLocaleString("fr-FR")}</span>
              <span className="text-xs text-muted-foreground">
                / {today.goal.toLocaleString("fr-FR")} pas
              </span>
            </ProgressRing>
          )}
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
                <Flame className="size-4 text-primary" />
              </span>
              <div>
                <p className="text-lg font-bold leading-none">
                  {profile?.dailyCalorieTarget ?? "—"}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">kcal/j</span>
                </p>
                <p className="text-xs text-muted-foreground">Objectif calorique</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
                <Scale className="size-4 text-primary" />
              </span>
              <div>
                <p className="text-lg font-bold leading-none">
                  {latestWeight ? `${latestWeight.weight.toFixed(1)}` : profile?.currentWeight ?? "—"}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">kg</span>
                </p>
                <p className="text-xs text-muted-foreground">Poids actuel</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This week */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "Séances", value: weekly?.totalWorkouts ?? 0, icon: Dumbbell },
          { label: "Minutes", value: weekly?.totalDuration ?? 0, icon: Clock },
          { label: "kcal brûlées", value: weekly?.totalCalories ?? 0, icon: Flame },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
              <Icon className="size-4 text-primary" />
              {loading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold">{value}</p>
              )}
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weight trend */}
      <Link href="/weight" className="mb-4 block">
        <Card className="transition hover:border-primary/60">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Évolution du poids</CardTitle>
            {sortedWeights.length >= 2 && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <WeightTrend className="size-4 text-primary" />
                {weightDelta > 0 ? "+" : ""}
                {weightDelta.toFixed(1)} kg
              </span>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : weightChartData.length < 2 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Ajoute tes poids pour voir ta courbe ici.
              </p>
            ) : (
              <ChartContainer config={weightChartConfig} className="h-24 w-full">
                <AreaChart data={weightChartData} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
                  <defs>
                    <linearGradient id="dashWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-weight)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-weight)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="weight"
                    type="monotone"
                    stroke="var(--color-weight)"
                    strokeWidth={2}
                    fill="url(#dashWeight)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Recent workouts */}
      <Card className="mb-4">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Dernières séances</CardTitle>
          <Link href="/workouts" className="text-sm text-primary transition hover:underline">
            Tout voir
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {loading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : recentWorkouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune séance enregistrée.</p>
          ) : (
            recentWorkouts.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <p className="font-medium">{w.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.durationMinutes} min · {w.caloriesBurned ?? 0} kcal
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(w.loggedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-5 gap-2">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1.5 rounded-xl border bg-card py-3 text-center transition hover:border-primary/60 hover:bg-muted"
          >
            <Icon className="size-5 text-primary" />
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </Link>
        ))}
      </div>

      {/* Coach: students */}
      {user.role === "coach" && (
        <Card className="mt-4">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Mes élèves</CardTitle>
            <ChevronRight className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun élève pour l&apos;instant.</p>
            ) : (
              students.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span>{s.name ?? s.email}</span>
                  <span className="text-sm text-muted-foreground">{s.status}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
