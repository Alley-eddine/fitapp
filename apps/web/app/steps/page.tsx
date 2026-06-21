"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { ArrowLeft, Plus, Footprints } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { stepsApi, type StepEntry, type StepsToday } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  steps: { label: "Pas", color: "var(--chart-2)" },
} satisfies ChartConfig;

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function StepsPage() {
  const router = useRouter();
  const [history, setHistory] = useState<StepEntry[]>([]);
  const [today, setToday] = useState<StepsToday | null>(null);
  const [steps, setSteps] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  function load() {
    return Promise.all([stepsApi.history(), stepsApi.today()])
      .then(([h, t]) => {
        setHistory(h);
        setToday(t);
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur de chargement"));
  }

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/login");
      return;
    }
    load().finally(() => setLoading(false));
  }, [router]);

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    const s = Number(steps);
    if (!Number.isInteger(s) || s < 0 || s > 200000) {
      toast.error("Entre un nombre de pas valide.");
      return;
    }
    const g = Number(goal);
    setSaving(true);
    try {
      await stepsApi.log(s, Number.isInteger(g) && g > 0 ? g : undefined);
      await load();
      setSteps("");
      setGoal("");
      setOpen(false);
      toast.success(`${s.toLocaleString("fr-FR")} pas enregistrés`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  const sorted = [...history].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  );
  const chartData = sorted.map((p) => ({ day: formatDay(p.loggedAt), steps: p.steps }));
  const pct = today ? Math.min(today.percentage, 100) : 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Tableau de bord
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Mes pas</h1>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={buttonVariants()}>
            <Plus className="size-4" />
            Ajouter
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pas du jour</DialogTitle>
              <DialogDescription>Un relevé par jour ; une nouvelle saisie remplace celle d&apos;aujourd&apos;hui.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLog} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="steps">Nombre de pas</Label>
                <Input
                  id="steps"
                  type="number"
                  inputMode="numeric"
                  placeholder="ex: 8500"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goal">Objectif (optionnel)</Label>
                <Input
                  id="goal"
                  type="number"
                  inputMode="numeric"
                  placeholder="10000"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
            <Footprints className="size-4 text-primary" />
            Aujourd&apos;hui
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading || !today ? (
            <Skeleton className="h-10 w-40" />
          ) : (
            <>
              <p className="text-3xl font-bold">
                {today.steps.toLocaleString("fr-FR")}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  / {today.goal.toLocaleString("fr-FR")} pas
                </span>
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${String(pct)}%` }} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : chartData.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
              Aucun relevé pour l&apos;instant.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <BarChart data={chartData} margin={{ left: 4, right: 4, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(v: number) => (v >= 1000 ? `${String(Math.round(v / 1000))}k` : String(v))}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="steps" fill="var(--color-steps)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
