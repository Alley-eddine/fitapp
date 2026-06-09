# Architecture — FitCoach AI

## Vue d'ensemble

```
                         ┌─────────────────────────┐
                         │  Front Next.js 15 (PWA)  │  coach (desktop) · élève (mobile) · lambda
                         └───────────┬─────────────┘
                                     │ HTTPS (JWT Bearer)
        ┌──────────────┬────────────┼────────────┬───────────────┐
        ▼              ▼            ▼            ▼               ▼
   ┌─────────┐   ┌─────────┐  ┌─────────┐  ┌───────────────┐ ┌──────────┐
   │  auth   │   │   api   │  │   ai    │  │ notifications │ │ payment  │
   │  3001   │   │  3002   │  │  3003   │  │     3004      │ │   3005   │
   └────┬────┘   └────┬────┘  └────┬────┘  └──────┬────────┘ └────┬─────┘
        │             │            │              │ x-internal-key │
        └─────────────┴────────────┴──────────────┴────────────────┘
                                     │
                              ┌──────▼──────┐      ┌────────────┐
                              │ PostgreSQL  │      │   Redis    │
                              └─────────────┘      └────────────┘
        Observabilité : chaque service expose /metrics → Prometheus(9090) → Grafana(3030)
```

## Responsabilité de chaque service

- **auth (3001)** — inscription/connexion email+mdp, OAuth Google, JWT (access + refresh), vérification email (token), reset mot de passe par SMS, **rôles** (coach/élève/lambda). Émet le JWT consommé par tous les autres services (issuer `fitapp:auth`, audience `fitapp:api`).
- **api (3002)** — cœur métier : profils, **programmes d'entraînement** (coach → élève), séances (planifiées/réalisées), poids, pas, **mensurations**, recettes, exercices (catalogue), historique de notifications. Calcul du besoin calorique (Mifflin-St Jeor) et estimation des calories brûlées.
- **ai (3003)** — génération de recettes via Groq. Pour un élève : **contraint par le plan nutrition du coach** (kcal/macros/aliments). Pour un lambda : libre. Rate-limiting par tier.
- **notifications (3004)** — email (Resend), SMS (Twilio), **push web (VAPID)**. Templates serveur. Appelé par les autres services via `x-internal-key`. Journalise dans `notification_logs`.
- **payment (3005)** — Stripe : abonnements récurrents (tiers B2C) + abonnement coach (B2B). Webhooks + endpoint `/sync` de réconciliation. Factures/mails via notifications.

## Communication

- **Front → services** : HTTP REST, `Authorization: Bearer <JWT>`.
- **Service → service** (interne, non public) : header **`x-internal-key`** (secret partagé `INTERNAL_API_KEY`). Ex. payment/auth → notifications.
- **JWT** : `JWT_SECRET` partagé entre tous les services. Le front ne parle jamais directement à un service "interne" (notifications).

## Modèle de données (cœur, simplifié)

- `users` — id, email, email_verified, phone, name, **role** (`coach` | `student` | `user`), password_hash, provider, subscription, subscription_ends_at, stripe_customer_id, …
- `coach_students` — lien coach ↔ élève (coach_id, student_id, status).
- `profiles` — mensurations de base, objectif, niveau d'activité, daily_calorie_target.
- `measurements` — relevés datés (poids, tours, IMC calculé) → graphiques d'évolution.
- `training_programs` — créés par un coach, versionnés par **phase** (PHASE 1, 2…), structure hebdo (jour → exercices).
- `program_assignments` — programme assigné à un élève (date début, phase active).
- `workouts` — séances **réalisées** (datées, calories estimées) ⟂ `training_programs` = séances **planifiées**. Voir BUSINESS_RULES (planifié vs fait).
- `workout_exercises` — exercices d'une séance (type muscu/cardio/hiit + champs associés).
- `nutrition_plans` — plan repas du coach (repas par kcal/macros, aliments, compléments), versionné par phase.
- `recipes` — recettes (générées IA ou imposées).
- `notification_logs` — traçabilité des envois (email/sms/push).

> ⚠️ Le modèle évolue avec le pivot coach-élève. Toute nouvelle table passe par une migration idempotente (`scripts/migrations/`) **et** une mise à jour de `init-db.sql`.

## Conventions de dossiers (service Fastify type)

```
services/<name>/
├── .env                    # gitignored
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts            # démarre createServer()
    ├── server.ts           # createServer() : cors, parsers, routes, /metrics
    ├── config/env.ts       # validation zod de l'env
    ├── middleware/         # auth JWT / internal-key
    ├── routes/             # <domaine>.routes.ts
    ├── services/           # logique métier
    ├── providers/          # clients tiers (stripe, groq, resend…)
    └── db/pool.ts          # pool pg
```

## Front Next.js (conventions cibles)

```
apps/web/
├── app/                    # App Router (routes par rôle : (coach)/, (student)/, (auth)/)
├── components/             # UI (shadcn dans components/ui)
├── lib/                    # clients API typés, utils, auth
├── public/                 # manifest.webmanifest, icons, sw
└── ...
```

- Routes segmentées par rôle. Garde d'accès (middleware) selon le `role` du JWT.
- Server Components par défaut ; `"use client"` seulement si nécessaire.
- Validation Zod **partagée** avec le back (`@fitapp/shared`).
