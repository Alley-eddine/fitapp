"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Bell, BellRing, Mail, MessageSquare, Smartphone, Check } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { notificationsApi, type NotificationLog } from "@/lib/api";
import {
  enableNotifications,
  notificationPermission,
  showTestNotification,
  type NotificationStatus,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const CHANNEL = {
  email: { label: "Email", icon: Mail },
  sms: { label: "SMS", icon: MessageSquare },
  push: { label: "Push", icon: Smartphone },
} as const;

function channelOf(channel: string) {
  return CHANNEL[channel as keyof typeof CHANNEL] ?? { label: channel, icon: Bell };
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [perm, setPerm] = useState<NotificationStatus>("denied");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/login");
      return;
    }
    setPerm(notificationPermission());
    notificationsApi
      .history()
      .then((r) => setItems(r.items))
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleEnable() {
    setBusy(true);
    try {
      const status = await enableNotifications();
      setPerm(status);
      if (status === "granted") {
        await showTestNotification();
        toast.success("Notifications activées");
      } else if (status === "unsupported") {
        toast.error("Ton navigateur ne supporte pas les notifications");
      } else {
        toast.error("Permission refusée");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation impossible");
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    try {
      await showTestNotification();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <header className="mb-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Tableau de bord
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
          <Bell className="size-5 text-primary" />
          Notifications
        </h1>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Notifications de l&apos;appareil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {perm === "granted" ? (
            <>
              <Badge variant="secondary" className="bg-primary/15 text-primary">
                <Check className="size-3.5" />
                Activées
              </Badge>
              <Button variant="outline" size="sm" onClick={() => void handleTest()}>
                <BellRing className="size-4" />
                Tester
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Reçois un rappel directement sur ton appareil.
              </p>
              <Button size="sm" disabled={busy} onClick={() => void handleEnable()}>
                <BellRing className="size-4" />
                {busy ? "…" : "Activer les notifications"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {loading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune notification envoyée pour l&apos;instant.</p>
          ) : (
            items.map((n) => {
              const c = channelOf(n.channel);
              const Icon = c.icon;
              return (
                <div key={n.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <Icon className="size-4 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.subject ?? c.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{n.recipient}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge
                      variant="outline"
                      className={n.status === "sent" || n.status === "simulated" ? "text-primary" : "text-muted-foreground"}
                    >
                      {n.status}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </main>
  );
}
