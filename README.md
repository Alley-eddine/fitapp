# FitCoach AI

Plateforme de coaching sportif qui relie un **coach** et ses **élèves**, avec un mode **autonome** pour l'utilisateur seul. Le coach prépare les programmes d'entraînement et les plans nutrition ; l'élève les exécute sans rien configurer ; les données remontent automatiquement au coach. Projet mené pour un commanditaire réel (coach sportif privé), présenté au titre **RNCP 39583 — Expert en Développement Logiciel**.

**Application en production** : https://fitapp-ai-ten.vercel.app — trois parcours (autonome, élève, coach), comptes de démonstration fournis dans le dossier de certification.

## Stack

| Couche | Choix |
|---|---|
| Front | Next.js 15 (App Router) en **PWA**, shadcn/ui, Tailwind |
| Back | 5 microservices **Fastify 5** (TypeScript strict, ESM) |
| Données | PostgreSQL 16, Redis |
| IA | Génération de recettes contrainte par le plan du coach (Groq) |
| Intégrations | Stripe (abonnements), Twilio (SMS), Resend (emails), web-push |
| Observabilité | Prometheus + Grafana |
| Outillage | Monorepo pnpm, Vitest, ESLint, Knip, GitHub Actions |

## Architecture

```
apps/web              PWA Next.js (parcours autonome, élève, coach)
services/auth   :3001 Authentification (JWT, OAuth Google, vérif. email, reset SMS)
services/api    :3002 Métier (profils, séances, poids, programmes, nutrition, recettes)
services/ai     :3003 Génération IA (recettes, Frigo Mode, rate limiting par palier)
services/notifications :3004 Emails / SMS / push (journalisés en base)
services/payment:3005 Stripe (checkout, webhook, portail)
packages/shared       Schémas Zod partagés front/back
```

Chaque service possède son pool PostgreSQL et sa logique métier pure dans `src/domain/` (testée avec Vitest, sans imports d'infrastructure). La décision « accès BDD direct par service, sans service BDD centralisé » est argumentée dans [docs/adr/0001](docs/adr/0001-acces-bdd-direct-par-service.md).

## Démarrer en local

Prérequis : Node 20+, pnpm (`corepack enable`), Docker.

```bash
docker compose up -d          # PostgreSQL + Redis (schéma chargé au premier démarrage)
pnpm install
pnpm dev                      # tous les services + le front en parallèle
```

Chaque service lit son `.env` (voir les `.env.example`). Sans clés externes (Stripe, Twilio, Resend, Groq), les services concernés démarrent en mode dégradé explicite — le reste de l'application fonctionne.

Monitoring local : `docker compose --profile monitoring up -d` puis Grafana sur http://localhost:3030.

## Qualité

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

La même chaîne tourne en CI sur chaque pull request (**Lint · Typecheck · Test · Knip · Build**) et bloque la fusion. Workflow : branches `feature/*` / `fix/*` / `hotfix/*` → PR → squash merge, releases taguées.

## Déploiement

Front sur **Vercel** ; services construits en images Docker par GitHub Actions, publiées sur **GHCR**, tirées par **Coolify** sur un VPS (Traefik + Let's Encrypt). Le runbook complet — ordre de déploiement, variables, vérifications — est dans [DEPLOYMENT_PROD.md](DEPLOYMENT_PROD.md), et `.env.production.example` documente chaque variable attendue.
