"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { setAuth } from "@/lib/auth";
import { Button, Input, Card } from "@/components/ui";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res =
        mode === "login"
          ? await authApi.login(email, password)
          : await authApi.register({ email, password, name, phone: phone || undefined });
      setAuth({ token: res.accessToken, user: res.user });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/15 text-2xl">
            💪
          </div>
          <h1 className="text-2xl font-bold">
            FitCoach <span className="text-cyan-400">AI</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {mode === "login" ? "Connexion à ton espace" : "Crée ton compte"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "register" && (
            <>
              <Input placeholder="Nom complet" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input
                placeholder="Téléphone (ex: +33612345678)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </>
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? "Chargement..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          className="mt-4 w-full text-center text-sm text-slate-400 transition hover:text-cyan-300"
        >
          {mode === "login" ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </button>
      </Card>
    </main>
  );
}
