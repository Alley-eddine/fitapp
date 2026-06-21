"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { setAuth } from "@/lib/auth";
import { Card } from "@/components/ui";

/**
 * OAuth landing page. The auth service redirects here with the freshly issued
 * tokens in the query string; we fetch the profile, persist the session and
 * forward to the dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");

    if (!accessToken) {
      router.replace("/auth/error?error=missing_token");
      return;
    }

    authApi
      .me(accessToken)
      .then((me) => {
        setAuth({
          token: accessToken,
          user: {
            id: me.id,
            email: me.email,
            name: me.name,
            role: me.role,
            subscriptionTier: me.subscription,
          },
        });
        router.replace("/dashboard");
      })
      .catch(() => {
        router.replace("/auth/error?error=profile_fetch_failed");
      });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-md text-center">
        <p className="text-slate-300">Connexion en cours…</p>
      </Card>
    </main>
  );
}
