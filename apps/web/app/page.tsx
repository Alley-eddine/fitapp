"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getAuth } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Already signed in? Stay in the app instead of showing the landing.
    if (getAuth()) {
      router.replace("/dashboard");
      return;
    }
    setChecked(true);
  }, [router]);

  // Avoid flashing the landing while we redirect a logged-in user.
  if (!checked) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-3xl">
        💪
      </div>
      <h1 className="text-5xl font-bold tracking-tight">
        FitCoach <span className="text-primary">AI</span>
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        La plateforme de coaching sportif : le coach prépare, l&apos;élève exécute sans rien
        régler, les données remontent automatiquement.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Commencer
        </Link>
        <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Se connecter
        </Link>
      </div>
      <p className="mt-16 text-sm text-muted-foreground">
        Coach · Élève · Autonome — un seul outil, zéro friction.
      </p>
    </main>
  );
}
