"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, logout, type AuthUser } from "@/lib/auth";
import { coachApi, type CoachStudent } from "@/lib/api";
import { Button, Card, RoleBadge } from "@/components/ui";

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
          <p className="text-sm text-slate-400">Bonjour</p>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            {user.name ?? user.email}
            <RoleBadge role={user.role} />
          </h1>
        </div>
        <Button onClick={handleLogout} className="bg-slate-800 text-slate-200 hover:bg-slate-700">
          Déconnexion
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-slate-400">Abonnement</p>
          <p className="mt-1 text-xl font-semibold capitalize text-cyan-400">{user.subscriptionTier}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Email</p>
          <p className="mt-1 text-xl font-semibold">{user.email}</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link href="/workouts" className="block">
          <Card className="flex items-center justify-between transition hover:border-cyan-400/60">
            <span className="font-semibold">🏋️ Mes séances</span>
            <span className="text-cyan-300">→</span>
          </Card>
        </Link>
        <Link href="/weight" className="block">
          <Card className="flex items-center justify-between transition hover:border-cyan-400/60">
            <span className="font-semibold">⚖️ Mon poids</span>
            <span className="text-cyan-300">→</span>
          </Card>
        </Link>
      </div>

      {user.role === "coach" && (
        <Card className="mt-4">
          <h2 className="mb-3 text-lg font-semibold">Mes élèves</h2>
          {studentsError && <p className="text-sm text-red-400">{studentsError}</p>}
          {!studentsError && students.length === 0 && (
            <p className="text-sm text-slate-400">Aucun élève pour l&apos;instant.</p>
          )}
          <ul className="flex flex-col gap-2">
            {students.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 px-4 py-2"
              >
                <span>{s.name ?? s.email}</span>
                <span className="text-sm text-slate-400">{s.status}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {user.role === "student" && (
        <Card className="mt-4">
          <h2 className="text-lg font-semibold">Ta séance du jour</h2>
          <p className="mt-1 text-sm text-slate-400">
            Bientôt : le programme préparé par ton coach apparaîtra ici, déjà réglé.
          </p>
        </Card>
      )}

      {user.role === "user" && (
        <Card className="mt-4">
          <h2 className="text-lg font-semibold">Mode autonome</h2>
          <p className="mt-1 text-sm text-slate-400">
            Suis tes séances, ton poids et tes mensurations en toute autonomie.
          </p>
        </Card>
      )}
    </main>
  );
}
