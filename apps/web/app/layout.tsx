import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/bottom-nav";

export const metadata: Metadata = {
  title: "FitCoach AI",
  description:
    "Plateforme de coaching sportif — transmission coach ↔ élève, tracée et sans saisie.",
  appleWebApp: { capable: true, title: "FitCoach AI", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="antialiased">
        {children}
        <BottomNav />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
