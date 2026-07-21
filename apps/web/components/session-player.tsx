"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, SkipForward, Plus, Minus, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/progress-ring";

export interface SessionExercise {
  name: string;
  sets: number;
  reps?: number;
  weightKg?: number | string | null;
  restSeconds?: number | null;
}

const DEFAULT_REST = 90;
const REST_BETWEEN_EXERCISES = 120;

export function SessionPlayer({
  exercises,
  onFinish,
  onQuit,
}: {
  exercises: SessionExercise[];
  onFinish: (elapsedSeconds: number) => void;
  onQuit: () => void;
}) {
  const [exIdx, setExIdx] = useState(0);
  const [setNo, setSetNo] = useState(1);
  const [resting, setResting] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const restDuration = useRef(DEFAULT_REST);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Rest countdown
  useEffect(() => {
    if (!resting) return;
    if (restLeft <= 0) {
      navigator.vibrate?.(200);
      advance();
      return;
    }
    const t = setTimeout(() => setRestLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resting, restLeft]);

  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  const doneSets = exercises.slice(0, exIdx).reduce((sum, e) => sum + e.sets, 0) + (setNo - 1);
  const overall = Math.round((doneSets / totalSets) * 100);
  const current = exercises[exIdx]!;

  function advance() {
    setResting(false);
    if (setNo >= current.sets) {
      setExIdx((i) => i + 1);
      setSetNo(1);
    } else {
      setSetNo((n) => n + 1);
    }
  }

  function completeSet() {
    const isLastSet = setNo >= current.sets;
    const isLastExercise = exIdx >= exercises.length - 1;
    if (isLastSet && isLastExercise) {
      onFinish(Math.round((Date.now() - startedAt.current) / 1000));
      return;
    }
    // Longer rest before moving to the next exercise; per-exercise rest between sets.
    const rest = isLastSet ? REST_BETWEEN_EXERCISES : current.restSeconds ?? DEFAULT_REST;
    restDuration.current = rest;
    setRestLeft(rest);
    setResting(true);
  }

  function adjustRest(delta: number) {
    restDuration.current = Math.max(15, restDuration.current + delta);
    setRestLeft((s) => Math.max(1, s + delta));
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 pt-5">
        <Button variant="ghost" size="icon" onClick={onQuit} aria-label="Quitter la séance">
          <X className="size-5" />
        </Button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${String(overall)}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {doneSets}/{totalSets}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        {resting ? (
          <>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {setNo >= current.sets ? "Repos · exercice suivant" : "Repos · série suivante"}
            </p>
            <ProgressRing value={(restLeft / restDuration.current) * 100} size={220} strokeWidth={16}>
              <span className="text-5xl font-bold tabular-nums">{restLeft}</span>
              <span className="text-sm text-muted-foreground">secondes</span>
            </ProgressRing>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => adjustRest(-15)} aria-label="-15s">
                <Minus className="size-4" />
              </Button>
              <Button onClick={advance} className="px-6">
                <SkipForward className="size-4" />
                Passer
              </Button>
              <Button variant="outline" size="icon" onClick={() => adjustRest(15)} aria-label="+15s">
                <Plus className="size-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Ensuite : <span className="font-medium text-foreground">{current.name}</span> · série{" "}
              {setNo >= current.sets ? 1 : setNo + 1}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              Exercice {exIdx + 1}/{exercises.length}
            </p>
            <h2 className="text-3xl font-bold">{current.name}</h2>
            <div className="flex flex-col items-center gap-1">
              <p className="text-6xl font-bold tabular-nums">
                {setNo}
                <span className="text-2xl font-normal text-muted-foreground">/{current.sets}</span>
              </p>
              <p className="text-sm text-muted-foreground">série en cours</p>
            </div>
            <p className="text-lg text-muted-foreground">
              {current.reps ? `${String(current.reps)} reps` : "—"}
              {current.weightKg ? ` · ${String(current.weightKg)} kg` : ""}
            </p>
            <Button size="lg" className="h-14 w-full max-w-xs text-base" onClick={completeSet}>
              {exIdx >= exercises.length - 1 && setNo >= current.sets ? (
                <>
                  <PartyPopper className="size-5" />
                  Terminer la séance
                </>
              ) : (
                <>
                  <Check className="size-5" />
                  Série terminée
                </>
              )}
            </Button>
          </>
        )}
      </div>

      {/* Upcoming list */}
      <div className="border-t px-6 py-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">À suivre</p>
        <div className="flex flex-col gap-1">
          {exercises.map((ex, i) => (
            <div
              key={`${ex.name}-${String(i)}`}
              className={`flex items-center justify-between text-sm ${
                i === exIdx ? "font-semibold text-primary" : i < exIdx ? "text-muted-foreground line-through" : "text-muted-foreground"
              }`}
            >
              <span>{ex.name}</span>
              <span>{ex.sets} séries</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
