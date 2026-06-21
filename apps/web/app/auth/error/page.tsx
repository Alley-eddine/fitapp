"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";

const MESSAGES: Record<string, string> = {
  authentication_failed: "La connexion avec Google a échoué.",
  missing_token: "Aucun jeton reçu. Réessaie de te connecter.",
  profile_fetch_failed: "Connexion établie mais le profil n'a pas pu être chargé.",
};

export default function AuthErrorPage() {
  const [message, setMessage] = useState("Une erreur est survenue lors de la connexion.");

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error && MESSAGES[error]) setMessage(MESSAGES[error]);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-md text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-400/15 text-2xl">
          ⚠️
        </div>
        <h1 className="text-xl font-bold">Connexion impossible</h1>
        <p className="mt-2 text-sm text-slate-400">{message}</p>
        <Link href="/login" className="mt-6 block">
          <Button className="w-full">Retour à la connexion</Button>
        </Link>
      </Card>
    </main>
  );
}
