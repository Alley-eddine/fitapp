"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { UserPlus, CheckCircle2, XCircle } from "lucide-react";
import { getAuth, updateUser } from "@/lib/auth";
import { invitationApi, authApi, type InvitationInfo } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function JoinPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getAuth()));
    invitationApi
      .lookup(code)
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [code]);

  async function handleJoin() {
    setJoining(true);
    try {
      const res = await invitationApi.accept(code);
      // Accepting turns a lambda into a student in the database, but the cached
      // user (and access token) still says "user". Refresh the cached role from
      // /auth/me so the client-side guards (no B2C paywall, student views) apply
      // right away, without waiting for a re-login.
      try {
        const me = await authApi.me();
        updateUser({ role: me.role, subscriptionTier: me.subscription });
      } catch {
        updateUser({ role: "student" });
      }
      toast.success(`Tu as rejoint ${res.coach.name ?? "ton coach"} 🎉`);
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de rejoindre");
      setJoining(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          {loading ? (
            <>
              <Skeleton className="size-12 rounded-xl" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : !info ? (
            <>
              <XCircle className="size-12 text-destructive" />
              <div>
                <h1 className="text-xl font-bold">Invitation introuvable</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ce lien n&apos;est pas valide. Demande un nouveau lien à ton coach.
                </p>
              </div>
              <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
                Retour à l&apos;app
              </Link>
            </>
          ) : !info.usable ? (
            <>
              <XCircle className="size-12 text-destructive" />
              <div>
                <h1 className="text-xl font-bold">Invitation expirée</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {info.status === "accepted"
                    ? "Cette invitation a déjà été utilisée."
                    : info.status === "revoked"
                      ? "Cette invitation a été annulée par le coach."
                      : "Cette invitation n'est plus valable."}
                </p>
              </div>
              <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
                Retour à l&apos;app
              </Link>
            </>
          ) : (
            <>
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary/15">
                <UserPlus className="size-6 text-primary" />
              </span>
              <div>
                <h1 className="text-xl font-bold">
                  {info.coachName ?? "Un coach"} t&apos;invite
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rejoins son espace : tu recevras tes programmes et ton plan nutrition,
                  déjà réglés. Rien à configurer.
                </p>
              </div>

              {signedIn ? (
                <Button className="w-full" disabled={joining} onClick={() => void handleJoin()}>
                  <CheckCircle2 className="size-4" />
                  {joining ? "En cours…" : "Rejoindre ce coach"}
                </Button>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Connecte-toi ou crée ton compte pour accepter l&apos;invitation.
                  </p>
                  <Link href="/login" className={buttonVariants({ className: "w-full" })}>
                    Se connecter / s&apos;inscrire
                  </Link>
                </>
              )}
              <p className="font-mono text-xs tracking-widest text-muted-foreground">{info.code}</p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
