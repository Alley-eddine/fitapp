"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Footprints, UtensilsCrossed, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/workouts", label: "Séances", icon: Dumbbell },
  { href: "/steps", label: "Pas", icon: Footprints },
  { href: "/nutrition", label: "Recettes", icon: UtensilsCrossed },
  { href: "/profile", label: "Profil", icon: User },
];

// Routes that should NOT show the app navigation (unauthenticated surfaces).
const HIDDEN_PREFIXES = ["/login", "/auth", "/onboarding"];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/" || HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
    <>
      {/* Spacer so fixed bar never covers page content */}
      <div className="h-20" aria-hidden />
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 py-1.5">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] transition",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("size-5", active && "fill-primary/15")} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
