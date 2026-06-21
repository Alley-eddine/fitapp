"use client";

import { useEffect, useState } from "react";
import { Library, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { exercisesApi, type CatalogExercise, type ExerciseGroup } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ExerciseLibraryDialog({ onPick }: { onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<ExerciseGroup[]>([]);
  const [group, setGroup] = useState("pectoraux");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<CatalogExercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || groups.length) return;
    exercisesApi
      .groups()
      .then((r) => setGroups(r.groups))
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur"));
  }, [open, groups.length]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(() => {
      exercisesApi
        .list({ group: search ? undefined : group, search: search || undefined, limit: 60 })
        .then((r) => setItems(r.items))
        .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur"))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [open, group, search]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        <Library className="size-4" />
        Bibliothèque
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] gap-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bibliothèque d&apos;exercices</DialogTitle>
          <DialogDescription>
            Filtre par groupe musculaire ou cherche, puis clique pour ajouter à ta séance.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Select value={group} onValueChange={(v) => setGroup(v ?? "")}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.key} value={g.key}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="-mr-2 flex max-h-[48vh] flex-col gap-1 overflow-y-auto pr-2">
          {loading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun exercice trouvé.</p>
          ) : (
            items.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  onPick(ex.name);
                  toast.success(`Ajouté : ${ex.name}`);
                }}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-left transition hover:border-primary/60 hover:bg-muted"
              >
                <span>
                  <span className="block text-sm font-medium">{ex.name}</span>
                  <span className="block text-xs text-muted-foreground capitalize">
                    {[ex.equipment, ex.level].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                <Plus className="size-4 shrink-0 text-primary" />
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
