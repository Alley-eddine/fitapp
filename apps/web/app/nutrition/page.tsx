"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Send, Sparkles, Clock, Users, ChefHat } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { nutritionApi, type ChatMessage, type GeneratedRecipe } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Bubble {
  role: "user" | "assistant";
  content: string;
  recipe?: GeneratedRecipe;
  suggestions?: string[];
}

const INTRO: Bubble = {
  role: "assistant",
  content:
    "Salut 👨‍🍳 Je suis ton coach Frigo Mode. Dis-moi ce que tu as sous la main (ou ton envie) et je te concocte une recette adaptée à tes objectifs.",
};

function RecipeCard({ recipe }: { recipe: GeneratedRecipe }) {
  return (
    <Card className="mt-2 bg-background">
      <CardContent className="flex flex-col gap-4 py-4">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <ChefHat className="size-4 text-primary" />
            {recipe.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{recipe.description}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {recipe.servings} pers.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { l: "kcal", v: recipe.calories },
            { l: "Prot.", v: `${String(recipe.protein)}g` },
            { l: "Gluc.", v: `${String(recipe.carbs)}g` },
            { l: "Lip.", v: `${String(recipe.fat)}g` },
          ].map((m) => (
            <div key={m.l} className="rounded-lg border py-1.5">
              <p className="text-sm font-bold text-primary">{m.v}</p>
              <p className="text-[10px] text-muted-foreground">{m.l}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold">Ingrédients</p>
          <ul className="flex flex-col gap-0.5 text-sm">
            {recipe.ingredients.map((ing, i) => (
              <li key={`${ing.name}-${String(i)}`} className="flex justify-between border-b py-1">
                <span>{ing.name}</span>
                <span className="text-muted-foreground">
                  {ing.quantity} {ing.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold">Préparation</p>
          <ol className="flex flex-col gap-1.5 text-sm">
            {recipe.instructions.map((step, i) => (
              <li key={`s-${String(i)}`} className="flex gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NutritionPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Bubble[]>([INTRO]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/login");
      return;
    }
    nutritionApi
      .rateLimit()
      .then((r) => setRemaining(r.frigo.remaining))
      .catch(() => setRemaining(null));
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    const history: ChatMessage[] = messages
      .filter((m) => m !== INTRO)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setDraft("");
    setSending(true);
    try {
      const res = await nutritionApi.frigoChat(text, history);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.message,
          recipe: res.recipe,
          suggestions: res.suggestedIngredients,
        },
      ]);
      nutritionApi
        .rateLimit()
        .then((r) => setRemaining(r.frigo.remaining))
        .catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'assistant n'a pas pu répondre");
      setMessages((prev) => prev.slice(0, -1));
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-6">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Tableau de bord
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="size-5 text-primary" />
            Frigo Mode
          </h1>
        </div>
        {remaining !== null && (
          <Badge variant="secondary" className="bg-primary/15 text-primary">
            {remaining} restante{remaining > 1 ? "s" : ""}
          </Badge>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-3 pb-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                  : "max-w-[90%] rounded-2xl rounded-bl-sm bg-card border px-4 py-2.5 text-sm"
              }
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.recipe && <RecipeCard recipe={m.recipe} />}
              {m.suggestions && m.suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDraft((d) => (d ? `${d}, ${s}` : s))}
                      className="rounded-full border px-2.5 py-1 text-xs transition hover:border-primary/60 hover:bg-muted"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border bg-card px-4 py-3">
              <span className="flex gap-1">
                <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="size-2 animate-bounce rounded-full bg-muted-foreground" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="sticky bottom-0 flex gap-2 bg-background/90 py-2 backdrop-blur"
      >
        <Input
          placeholder="ex: j'ai du poulet, du riz et des courgettes…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !draft.trim()} aria-label="Envoyer">
          <Send className="size-4" />
        </Button>
      </form>
    </main>
  );
}
