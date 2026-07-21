"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  UserPlus,
  Copy,
  X,
  Plus,
  Dumbbell,
  Users,
  Send,
  Salad,
  ChevronRight,
} from "lucide-react";
import { getAuth } from "@/lib/auth";
import {
  coachApi,
  programApi,
  nutritionPlanApi,
  type CoachStudent,
  type CoachInvitation,
  type ProgramSummary,
  type NutritionPlanSummary,
} from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CoachPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<CoachStudent[]>([]);
  const [invitations, setInvitations] = useState<CoachInvitation[]>([]);
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlanSummary[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [assignTarget, setAssignTarget] = useState<ProgramSummary | null>(null);
  const [assignStudent, setAssignStudent] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignPlanTarget, setAssignPlanTarget] = useState<NutritionPlanSummary | null>(null);
  const [assignPlanStudent, setAssignPlanStudent] = useState("");
  const [assigningPlan, setAssigningPlan] = useState(false);

  function refresh() {
    return Promise.allSettled([
      coachApi.students(),
      coachApi.invitations(),
      programApi.list(),
      nutritionPlanApi.list(),
    ])
      .then(([s, i, p, n]) => {
        if (s.status === "fulfilled") setStudents(s.value.students);
        if (i.status === "fulfilled") setInvitations(i.value.items);
        if (p.status === "fulfilled") setPrograms(p.value.items);
        if (n.status === "fulfilled") setNutritionPlans(n.value.items);
      })
      .finally(() => setLoading(false));
  }

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
    void refresh();
  }, [router]);

  if (!ready) return null;

  async function handleInvite() {
    setInviting(true);
    try {
      const inv = await coachApi.createInvitation(inviteEmail.trim() || undefined);
      setInviteEmail("");
      toast.success(`Invitation créée : ${inv.code}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la création");
    } finally {
      setInviting(false);
    }
  }

  async function copyLink(code: string) {
    const url = `${window.location.origin}/join/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié");
    } catch {
      toast.message(url);
    }
  }

  async function revoke(id: string) {
    try {
      await coachApi.revokeInvitation(id);
      toast.success("Invitation révoquée");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec");
    }
  }

  async function handleAssign() {
    if (!assignTarget || !assignStudent) return;
    setAssigning(true);
    try {
      await programApi.assign(assignTarget.id, assignStudent);
      toast.success("Programme assigné 💪");
      setAssignTarget(null);
      setAssignStudent("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'assignation");
    } finally {
      setAssigning(false);
    }
  }

  async function handleAssignPlan() {
    if (!assignPlanTarget || !assignPlanStudent) return;
    setAssigningPlan(true);
    try {
      await nutritionPlanApi.assign(assignPlanTarget.id, assignPlanStudent);
      toast.success("Plan nutrition assigné 🥗");
      setAssignPlanTarget(null);
      setAssignPlanStudent("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'assignation");
    } finally {
      setAssigningPlan(false);
    }
  }

  const pending = invitations.filter((i) => i.status === "pending");

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Tableau de bord
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Espace coach</h1>
      </header>

      {/* Invitations */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="size-4 text-primary" />
            Inviter un élève
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inviteEmail">Email (optionnel)</Label>
            <div className="flex gap-2">
              <Input
                id="inviteEmail"
                type="email"
                placeholder="eleve@exemple.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button disabled={inviting} onClick={() => void handleInvite()}>
                <Send className="size-4" />
                {inviting ? "…" : "Créer"}
              </Button>
            </div>
          </div>

          {pending.length > 0 && (
            <div className="flex flex-col gap-2">
              {pending.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold tracking-widest">{inv.code}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {inv.email ?? "lien partageable"} · expire le{" "}
                      {new Date(inv.expiresAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => void copyLink(inv.code)}>
                      <Copy className="size-4" />
                      Lien
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Révoquer" onClick={() => void revoke(inv.id)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" />
            Mes élèves
            <Badge variant="secondary">{students.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {loading ? (
            <Skeleton className="h-12 w-full" />
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun élève. Crée une invitation et partage le lien.
            </p>
          ) : (
            students.map((s) => (
              <Link
                key={s.id}
                href={`/coach/students/${s.id}`}
                className="flex items-center justify-between rounded-lg border px-3 py-2 transition hover:border-primary/60 hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.name ?? s.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  depuis le {new Date(s.since).toLocaleDateString("fr-FR")}
                  <ChevronRight className="size-4 text-primary" />
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* Programs */}
      <Card className="mb-4">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="size-4 text-primary" />
            Mes programmes
          </CardTitle>
          <Link href="/coach/programs/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" />
            Nouveau
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {loading ? (
            <Skeleton className="h-12 w-full" />
          ) : programs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun programme. Crée-en un et assigne-le à un élève.
            </p>
          ) : (
            programs.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Phase {p.phase} · {p.dayCount} jour{p.dayCount > 1 ? "s" : ""} ·{" "}
                    {p.assignedCount} élève{p.assignedCount > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link
                    href={`/coach/programs/${p.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Modifier
                  </Link>
                  <Button
                    size="sm"
                    disabled={students.length === 0}
                    onClick={() => {
                      setAssignTarget(p);
                      setAssignStudent(students[0]?.id ?? "");
                    }}
                  >
                    Assigner
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Nutrition plans */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Salad className="size-4 text-primary" />
            Mes plans nutrition
          </CardTitle>
          <Link href="/coach/nutrition/new" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" />
            Nouveau
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {loading ? (
            <Skeleton className="h-12 w-full" />
          ) : nutritionPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun plan nutrition. Crée les repas imposés, l&apos;IA proposera des recettes dans le
              cadre.
            </p>
          ) : (
            nutritionPlans.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Phase {p.phase} · {p.mealCount} repas
                    {p.dailyCalories ? ` · ${String(p.dailyCalories)} kcal/j` : ""} ·{" "}
                    {p.assignedCount} élève{p.assignedCount > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link
                    href={`/coach/nutrition/${p.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Modifier
                  </Link>
                  <Button
                    size="sm"
                    disabled={students.length === 0}
                    onClick={() => {
                      setAssignPlanTarget(p);
                      setAssignPlanStudent(students[0]?.id ?? "");
                    }}
                  >
                    Assigner
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Assign dialog */}
      <Dialog open={assignTarget !== null} onOpenChange={(open) => !open && setAssignTarget(null)}>
        <DialogTrigger className="hidden" aria-hidden />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner « {assignTarget?.name} »</DialogTitle>
            <DialogDescription>
              L&apos;élève verra sa séance du jour, déjà réglée. Son programme actif précédent est archivé.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label>Élève</Label>
            <Select value={assignStudent} onValueChange={(v) => setAssignStudent(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un élève" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name ?? s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button disabled={assigning || !assignStudent} onClick={() => void handleAssign()}>
              {assigning ? "Assignation…" : "Assigner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign nutrition plan dialog */}
      <Dialog
        open={assignPlanTarget !== null}
        onOpenChange={(open) => !open && setAssignPlanTarget(null)}
      >
        <DialogTrigger className="hidden" aria-hidden />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner « {assignPlanTarget?.name} »</DialogTitle>
            <DialogDescription>
              L&apos;élève verra ses repas imposés et pourra générer des recettes dans le cadre. Son
              plan nutrition actif précédent est archivé.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label>Élève</Label>
            <Select value={assignPlanStudent} onValueChange={(v) => setAssignPlanStudent(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un élève" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name ?? s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              disabled={assigningPlan || !assignPlanStudent}
              onClick={() => void handleAssignPlan()}
            >
              {assigningPlan ? "Assignation…" : "Assigner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
