"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookmarkX,
  ChevronDown,
  ChevronUp,
  Refrigerator,
  Sparkles,
  Trash2,
} from "lucide-react";
import { getAuth } from "@/lib/auth";
import { recipeApi, savedToGenerated, type SavedRecipe } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecipeCard } from "@/components/recipe-card";

export default function RecipesPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [generateHref, setGenerateHref] = useState("/nutrition");

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    // Linked students generate recipes from their coach plan, not from Frigo Mode.
    setGenerateHref(auth.user.role === "student" ? "/student/nutrition" : "/nutrition");
    recipeApi
      .list()
      .then((r) => {
        setRecipes(r.items);
        setTotal(r.total);
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [router]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const r = await recipeApi.list(recipes.length);
      setRecipes((prev) => [...prev, ...r.items]);
      setTotal(r.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleDelete() {
    if (!confirmingId) return;
    setDeleting(true);
    try {
      await recipeApi.remove(confirmingId);
      setRecipes((prev) => prev.filter((r) => r.id !== confirmingId));
      setTotal((prev) => Math.max(0, prev - 1));
      setConfirmingId(null);
      toast.success("Recette supprimée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de supprimer la recette");
    } finally {
      setDeleting(false);
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
        <h1 className="mt-1 text-2xl font-bold">Mes recettes</h1>
        <p className="text-sm text-muted-foreground">
          Les recettes générées par l&apos;IA que tu as mises de côté.
        </p>
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : recipes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <BookmarkX className="mx-auto mb-3 size-10 text-muted-foreground" />
            <p className="font-medium">Aucune recette enregistrée</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Génère une recette puis touche « Enregistrer la recette » pour la retrouver ici.
            </p>
            <Link href={generateHref} className={buttonVariants({ className: "mt-4" })}>
              <Sparkles className="size-4" />
              Générer une recette
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {recipes.map((recipe) => {
            const expanded = expandedId === recipe.id;
            return (
              <Card key={recipe.id}>
                <CardContent className="py-4">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 text-left"
                    onClick={() => setExpandedId(expanded ? null : recipe.id)}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{recipe.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(recipe.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {recipe.calories != null && (
                        <Badge variant="secondary" className="bg-primary/15 text-primary">
                          {recipe.calories} kcal
                        </Badge>
                      )}
                      {recipe.isFromFrigoMode && (
                        <Badge variant="outline" className="gap-1">
                          <Refrigerator className="size-3" />
                          Frigo
                        </Badge>
                      )}
                      {expanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <>
                      <RecipeCard recipe={savedToGenerated(recipe)} />
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setConfirmingId(recipe.id)}
                        >
                          <Trash2 className="size-4" />
                          Supprimer
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {recipes.length < total && (
            <Button variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>
              {loadingMore ? "Chargement…" : "Charger plus"}
            </Button>
          )}
        </div>
      )}

      <Dialog open={confirmingId !== null} onOpenChange={(open) => !open && setConfirmingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette recette ?</DialogTitle>
            <DialogDescription>
              Elle disparaîtra de « Mes recettes ». Cette action est définitive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingId(null)}>
              Annuler
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
