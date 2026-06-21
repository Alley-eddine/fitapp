"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Flame } from "lucide-react";
import { getAuth } from "@/lib/auth";
import {
  profileApi,
  type Profile,
  type ProfileUpdate,
  type Gender,
  type ActivityLevel,
  type FitnessGoal,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Homme" },
  { value: "female", label: "Femme" },
];

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sédentaire" },
  { value: "light", label: "Légèrement actif" },
  { value: "moderate", label: "Modérément actif" },
  { value: "active", label: "Actif" },
  { value: "very_active", label: "Très actif" },
];

const GOALS: { value: FitnessGoal; label: string }[] = [
  { value: "lose_weight", label: "Perdre du poids" },
  { value: "gain_muscle", label: "Prendre du muscle" },
  { value: "maintain", label: "Maintenir" },
  { value: "improve_endurance", label: "Améliorer l'endurance" },
];

function num(value: string): number | undefined {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [gender, setGender] = useState<Gender | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [height, setHeight] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<FitnessGoal>("maintain");

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/login");
      return;
    }
    profileApi
      .get()
      .then((p) => {
        setProfile(p);
        if (p.gender) setGender(p.gender);
        if (p.birthDate) setBirthDate(p.birthDate.slice(0, 10));
        if (p.height) setHeight(String(p.height));
        if (p.currentWeight) setCurrentWeight(String(p.currentWeight));
        if (p.targetWeight) setTargetWeight(String(p.targetWeight));
        setActivityLevel(p.activityLevel);
        setGoal(p.goal);
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const update: ProfileUpdate = {
      activityLevel,
      goal,
      ...(gender ? { gender } : {}),
      ...(birthDate ? { birthDate } : {}),
      ...(num(height) ? { height: Math.round(num(height)!) } : {}),
      ...(num(currentWeight) ? { currentWeight: num(currentWeight) } : {}),
      ...(num(targetWeight) ? { targetWeight: num(targetWeight) } : {}),
    };
    setSaving(true);
    try {
      const updated = await profileApi.update(update);
      setProfile(updated);
      toast.success(
        updated.dailyCalorieTarget
          ? `Profil enregistré · ${String(updated.dailyCalorieTarget)} kcal/jour`
          : "Profil enregistré"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Tableau de bord
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Profil &amp; calories</h1>
      </header>

      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
              <Flame className="size-4 text-primary" />
              Objectif calorique journalier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.dailyCalorieTarget ? (
              <p className="text-4xl font-bold text-primary">
                {profile.dailyCalorieTarget}
                <span className="ml-1 text-base font-normal text-muted-foreground">kcal / jour</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Renseigne ton sexe, ta date de naissance, ta taille et ton poids pour calculer tes
                besoins (Mifflin-St Jeor).
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Mes informations</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Sexe</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="birthDate">Date de naissance</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="height">Taille (cm)</Label>
              <Input
                id="height"
                type="number"
                inputMode="numeric"
                placeholder="ex: 178"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentWeight">Poids actuel (kg)</Label>
              <Input
                id="currentWeight"
                type="number"
                inputMode="decimal"
                placeholder="ex: 78"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetWeight">Poids cible (kg)</Label>
              <Input
                id="targetWeight"
                type="number"
                inputMode="decimal"
                placeholder="ex: 74"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Niveau d&apos;activité</Label>
              <Select value={activityLevel} onValueChange={(v) => setActivityLevel(v as ActivityLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVELS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Objectif</Label>
              <Select value={goal} onValueChange={(v) => setGoal(v as FitnessGoal)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOALS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={saving} className="sm:col-span-2">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
