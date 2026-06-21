"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dumbbell,
  Scale,
  UtensilsCrossed,
  Flame,
  ChevronRight,
  ChevronLeft,
  Check,
  Crown,
  Sparkles,
} from "lucide-react";
import { getAuth } from "@/lib/auth";
import {
  profileApi,
  paymentApi,
  type Plan,
  type ProfileUpdate,
  type Gender,
  type ActivityLevel,
  type FitnessGoal,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FEATURES = [
  { icon: Dumbbell, title: "Séances guidées", text: "Crée tes séances et laisse-toi guider série par série, avec timers de repos." },
  { icon: Scale, title: "Suivi complet", text: "Poids, pas et calories suivis automatiquement, avec courbes et stats." },
  { icon: UtensilsCrossed, title: "Coach nutrition IA", text: "Dis ce que tu as dans le frigo, l'IA te propose des recettes adaptées." },
  { icon: Flame, title: "Objectifs sur-mesure", text: "Tes besoins caloriques calculés selon ton profil et ton objectif." },
];

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

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [finishing, setFinishing] = useState(false);

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
    paymentApi
      .plans()
      .then((r) => setPlans(r.plans))
      .catch(() => undefined);
  }, [router]);

  async function finish(tier: "free" | "pro" | "premium") {
    setFinishing(true);
    const update: ProfileUpdate = {
      activityLevel,
      goal,
      onboardingCompleted: true,
      ...(gender ? { gender } : {}),
      ...(birthDate ? { birthDate } : {}),
      ...(num(height) ? { height: Math.round(num(height)!) } : {}),
      ...(num(currentWeight) ? { currentWeight: num(currentWeight) } : {}),
      ...(num(targetWeight) ? { targetWeight: num(targetWeight) } : {}),
    };
    try {
      await profileApi.update(update);
      if (tier === "free") {
        toast.success("Bienvenue sur FitCoach AI 💪");
        router.replace("/dashboard");
        return;
      }
      const { url } = await paymentApi.checkout(tier);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
      setFinishing(false);
    }
  }

  const priceOf = (t: string) => plans.find((p) => p.tier === t)?.price;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8">
      {/* Progress */}
      <div className="mb-8 flex items-center gap-2">
        {[0, 1, 2].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="flex flex-1 flex-col">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-3xl">
              💪
            </div>
            <h1 className="text-2xl font-bold">
              Bienvenue sur FitCoach <span className="text-primary">AI</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ton coach sportif et nutrition, tout-en-un. Voici ce que tu vas pouvoir faire :
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title}>
                <CardContent className="flex items-start gap-3 py-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <Icon className="size-5 text-primary" />
                  </span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button className="mt-6" onClick={() => setStep(1)}>
            C&apos;est parti
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-1 flex-col">
          <h1 className="text-2xl font-bold">Parle-nous de toi</h1>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">
            Pour calculer tes besoins caloriques et personnaliser ton suivi.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Sexe</Label>
              <Select value={gender} onValueChange={(v) => setGender((v ?? "") as Gender)}>
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
              <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="height">Taille (cm)</Label>
              <Input id="height" type="number" inputMode="numeric" placeholder="178" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cw">Poids actuel (kg)</Label>
              <Input id="cw" type="number" inputMode="decimal" placeholder="78" value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tw">Poids cible (kg)</Label>
              <Input id="tw" type="number" inputMode="decimal" placeholder="74" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Niveau d&apos;activité</Label>
              <Select value={activityLevel} onValueChange={(v) => setActivityLevel((v ?? "moderate") as ActivityLevel)}>
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
              <Select value={goal} onValueChange={(v) => setGoal((v ?? "maintain") as FitnessGoal)}>
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
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ChevronLeft className="size-4" />
              Retour
            </Button>
            <Button className="flex-1" onClick={() => setStep(2)}>
              Continuer
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-1 flex-col">
          <h1 className="text-2xl font-bold">Choisis ton offre</h1>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">
            Commence gratuitement, change d&apos;avis quand tu veux.
          </p>
          <div className="flex flex-col gap-3">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Free</p>
                  <span className="font-bold">Gratuit</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Suivi séances, poids, pas et recettes IA (quota limité).
                </p>
                <Button className="mt-3 w-full" disabled={finishing} onClick={() => void finish("free")}>
                  {finishing ? "…" : "Commencer gratuitement"}
                </Button>
              </CardContent>
            </Card>

            {(["pro", "premium"] as const).map((t) => (
              <Card key={t} className="border-primary/30">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 font-semibold">
                      {t === "premium" ? <Crown className="size-4 text-primary" /> : <Sparkles className="size-4 text-primary" />}
                      {t === "premium" ? "Premium" : "Pro"}
                    </p>
                    <span className="font-bold">
                      {priceOf(t) ?? "—"}
                      <span className="text-xs font-normal text-muted-foreground"> /mois</span>
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Check className="size-3.5 text-primary" />
                    {t === "premium" ? "Tout Pro + programmes personnalisés" : "Recettes IA illimitées + séances avancées"}
                  </p>
                  <Button variant="outline" className="mt-3 w-full" disabled={finishing} onClick={() => void finish(t)}>
                    Choisir {t === "premium" ? "Premium" : "Pro"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button variant="ghost" className="mt-4" onClick={() => setStep(1)}>
            <ChevronLeft className="size-4" />
            Retour
          </Button>
        </div>
      )}
    </main>
  );
}
