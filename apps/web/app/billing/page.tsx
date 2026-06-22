"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Check, Crown, Sparkles, RefreshCw } from "lucide-react";
import { getAuth, updateUser, type AuthUser } from "@/lib/auth";
import { paymentApi, authApi, type Plan } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Tier = AuthUser["subscriptionTier"];

const FEATURES: Record<Tier, string[]> = {
  free: ["Suivi séances, poids et pas", "Recettes IA (quota limité)", "Tableau de bord"],
  pro: ["Tout le plan Free", "Recettes IA en illimité", "Séances guidées avancées", "Support prioritaire"],
  premium: ["Tout le plan Pro", "Programmes personnalisés", "Accès anticipé aux nouveautés"],
};

const TIER_LABEL: Record<Tier, string> = { free: "Free", pro: "Pro", premium: "Premium" };

export default function BillingPage() {
  const router = useRouter();
  const [tier, setTier] = useState<Tier>("free");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>("");

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    setTier(auth.user.subscriptionTier);
    paymentApi
      .plans()
      .then((r) => setPlans(r.plans))
      .catch(() => toast.error("Impossible de charger les offres"))
      .finally(() => setLoading(false));
    // Reconcile in case the user just came back from Stripe Checkout.
    const status = new URLSearchParams(window.location.search).get("status");
    if (status === "cancel") {
      toast.message("Paiement annulé");
      void refresh(true);
    } else {
      // status === "success" → show the new tier; otherwise reconcile silently.
      void refresh(status === "success");
    }
  }, [router]);

  async function refresh(silent = false) {
    try {
      await paymentApi.sync().catch(() => undefined);
      const me = await authApi.me();
      setTier(me.subscription);
      updateUser({ subscriptionTier: me.subscription });
      if (!silent) toast.success(`Abonnement : ${TIER_LABEL[me.subscription]}`);
    } catch {
      if (!silent) toast.error("Actualisation impossible");
    }
  }

  async function upgrade(target: "pro" | "premium") {
    setBusy(target);
    try {
      const { url } = await paymentApi.checkout(target);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Paiement indisponible");
      setBusy("");
    }
  }

  async function manage() {
    setBusy("portal");
    try {
      const { url } = await paymentApi.portal();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Portail indisponible");
      setBusy("");
    }
  }

  const order: Tier[] = ["free", "pro", "premium"];
  const priceOf = (t: Tier) => plans.find((p) => p.tier === t)?.price;

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <Link
            href="/profile"
            className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Profil
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Abonnement</h1>
        </div>
        <Badge variant="secondary" className="bg-primary/15 text-primary capitalize">
          Plan {TIER_LABEL[tier]}
        </Badge>
      </header>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {order.map((t) => {
            const current = t === tier;
            const isPaid = t !== "free";
            return (
              <Card key={t} className={current ? "border-primary/60" : ""}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2">
                    {t === "premium" ? (
                      <Crown className="size-4 text-primary" />
                    ) : t === "pro" ? (
                      <Sparkles className="size-4 text-primary" />
                    ) : null}
                    {TIER_LABEL[t]}
                  </CardTitle>
                  <span className="text-right">
                    {isPaid ? (
                      <span className="text-lg font-bold">
                        {priceOf(t) ?? "—"}
                        <span className="text-xs font-normal text-muted-foreground"> /mois</span>
                      </span>
                    ) : (
                      <span className="text-lg font-bold">Gratuit</span>
                    )}
                  </span>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {FEATURES[t].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {current ? (
                    <Button variant="outline" disabled className="w-full">
                      Plan actuel
                    </Button>
                  ) : isPaid ? (
                    <Button
                      className="w-full"
                      disabled={busy !== ""}
                      onClick={() => upgrade(t as "pro" | "premium")}
                    >
                      {busy === t ? "Redirection…" : `Passer ${TIER_LABEL[t]}`}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => void refresh(false)}>
              <RefreshCw className="size-4" />
              J&apos;ai payé · actualiser
            </Button>
            {tier !== "free" && (
              <Button variant="outline" size="sm" disabled={busy !== ""} onClick={() => void manage()}>
                Gérer mon abonnement
              </Button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
