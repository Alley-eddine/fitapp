"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { weightApi, type WeightEntry } from "@/lib/api";
import { Button, Card, Input } from "@/components/ui";
import { WeightChart } from "@/components/weight-chart";

export default function WeightPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/login");
      return;
    }
    weightApi
      .history()
      .then(setEntries)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const weight = Number(value.replace(",", "."));
    if (!Number.isFinite(weight) || weight <= 0 || weight > 500) {
      setError("Entre un poids valide (kg).");
      return;
    }
    setSaving(true);
    try {
      const saved = await weightApi.log(weight);
      // Upsert per day: replace today's entry if present, else prepend.
      setEntries((prev) => {
        const sameDay = (d: string) => new Date(d).toDateString();
        const filtered = prev.filter((p) => sameDay(p.loggedAt) !== sameDay(saved.loggedAt));
        return [saved, ...filtered];
      });
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  const latest = [...entries].sort(
    (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
  )[0];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-slate-400 transition hover:text-cyan-300">
            ← Tableau de bord
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Mon poids</h1>
        </div>
        {latest && (
          <div className="text-right">
            <p className="text-sm text-slate-400">Dernier relevé</p>
            <p className="text-xl font-semibold text-cyan-400">{latest.weight.toFixed(1)} kg</p>
          </div>
        )}
      </header>

      <Card className="mb-4">
        <form onSubmit={handleLog} className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm text-slate-400">Nouveau poids (kg)</label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="ex: 78.5"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "..." : "Enregistrer"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Évolution</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Chargement…</p>
        ) : (
          <WeightChart data={entries} />
        )}
      </Card>
    </main>
  );
}
