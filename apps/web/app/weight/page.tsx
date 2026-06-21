"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { ArrowLeft, Plus, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { weightApi, type WeightEntry } from "@/lib/api";
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
  weight: { label: "Poids", color: "var(--chart-1)" },
} satisfies ChartConfig;

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function WeightPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/login");
      return;
    }
    weightApi
      .history()
      .then(setEntries)
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    const weight = Number(value.replace(",", "."));
    if (!Number.isFinite(weight) || weight <= 0 || weight > 500) {
      toast.error("Entre un poids valide (kg).");
      return;
    }
    setSaving(true);
    try {
      const saved = await weightApi.log(weight);
      setEntries((prev) => {
        const sameDay = (d: string) => new Date(d).toDateString();
        const filtered = prev.filter((p) => sameDay(p.loggedAt) !== sameDay(saved.loggedAt));
        return [saved, ...filtered];
      });
      setValue("");
      setOpen(false);
      toast.success(`Poids enregistré : ${weight.toFixed(1)} kg`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  );
  const chartData = sorted.map((p) => ({ day: formatDay(p.loggedAt), weight: p.weight }));
  const latest = sorted[sorted.length - 1];
  const delta = sorted.length >= 2 ? sorted[sorted.length - 1]!.weight - sorted[0]!.weight : 0;
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

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
          <h1 className="mt-1 text-2xl font-bold">Mon poids</h1>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={buttonVariants()}>
            <Plus className="size-4" />
            Ajouter
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau poids</DialogTitle>
              <DialogDescription>
                Un seul relevé par jour : une nouvelle saisie remplace celle d&apos;aujourd&apos;hui.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLog} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="weight">Poids (kg)</Label>
                <Input
                  id="weight"
                  type="text"
                  inputMode="decimal"
                  placeholder="ex: 78.5"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  autoFocus
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

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Dernier relevé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {latest ? `${latest.weight.toFixed(1)} kg` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Sur la période</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-2 text-3xl font-bold">
              <DeltaIcon className="size-6 text-primary" />
              {delta === 0 ? "Stable" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Évolution</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : chartData.length < 2 ? (
            <div className="flex h-56 items-center justify-center text-center text-sm text-muted-foreground">
              Logge au moins deux poids (sur des jours différents) pour voir ta courbe.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <AreaChart data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="fillWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-weight)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-weight)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tickFormatter={(v: number) => v.toFixed(0)}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="weight"
                  type="monotone"
                  stroke="var(--color-weight)"
                  strokeWidth={2}
                  fill="url(#fillWeight)"
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
