"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dumbbell, Scale, LogOut, ChevronRight } from "lucide-react";
import { getAuth, logout, type AuthUser } from "@/lib/auth";
import { coachApi, type CoachStudent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/role-badge";

const TILES = [
  { href: "/workouts", label: "Mes séances", icon: Dumbbell },
  { href: "/weight", label: "Mon poids", icon: Scale },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [students, setStudents] = useState<CoachStudent[]>([]);
  const [studentsError, setStudentsError] = useState("");

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    setUser(auth.user);
    if (auth.user.role === "coach") {
      coachApi
        .students()
        .then((r) => setStudents(r.students))
        .catch((e: unknown) => setStudentsError(e instanceof Error ? e.message : "Erreur"));
    }
  }, [router]);

  if (!user) return null;

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Bonjour</p>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            {user.name ?? user.email}
            <RoleBadge role={user.role} />
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="size-4" />
          Déconnexion
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Abonnement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold capitalize text-primary">{user.subscriptionTier}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate text-xl font-semibold">{user.email}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {TILES.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="transition hover:border-primary/60">
              <CardContent className="flex items-center justify-between py-5">
                <span className="flex items-center gap-3 font-semibold">
                  <Icon className="size-5 text-primary" />
                  {label}
                </span>
                <ChevronRight className="size-4 text-primary" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {user.role === "coach" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Mes élèves</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {studentsError && <p className="text-sm text-destructive">{studentsError}</p>}
            {!studentsError && students.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun élève pour l&apos;instant.</p>
            )}
            {students.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border px-4 py-2"
              >
                <span>{s.name ?? s.email}</span>
                <span className="text-sm text-muted-foreground">{s.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {user.role === "student" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Ta séance du jour</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Bientôt : le programme préparé par ton coach apparaîtra ici, déjà réglé.
            </p>
          </CardContent>
        </Card>
      )}

      {user.role === "user" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Mode autonome</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Suis tes séances, ton poids et tes mensurations en toute autonomie.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
