# Stack technique — FitCoach AI

## Monorepo

- **pnpm workspaces** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`).
- `.npmrc` : `node-linker=hoisted` + `shamefully-hoist=true` (compatibilité React Native / outils).
- TypeScript en mode **solution** (`tsc -b`) avec project references (`tsconfig.json` racine → packages + services).
- Node **20+** (dev sur 22).

```
fitapp/
├── apps/
│   ├── mobile/        # Expo 51 (legacy — référence, en cours de remplacement par le front web)
│   └── web/           # Next.js 15 PWA (CIBLE — à créer)
├── services/
│   ├── auth/          # 3001 — Fastify
│   ├── api/           # 3002 — Fastify
│   ├── ai/            # 3003 — Fastify + Groq
│   ├── notifications/ # 3004 — Fastify + Resend/Twilio/web-push
│   └── payment/       # 3005 — Fastify + Stripe
├── packages/
│   └── shared/        # schémas Zod + types partagés (@fitapp/shared)
├── config/            # prometheus.yml, grafana/
├── scripts/           # init-db.sql, migrations/
└── docker-compose.yml # postgres, redis, prometheus, grafana
```

## Backend (microservices)

| Lib | Version | Rôle |
|---|---|---|
| Fastify | ^5.2.1 | serveur HTTP de chaque service |
| @fastify/cors | ^10 | CORS |
| pg | ^8.13 | client PostgreSQL (pas d'ORM — SQL direct) |
| zod | ^3.24 | validation (schémas partagés via `@fitapp/shared`) |
| jose | ^5.9 | JWT (sign/verify) |
| prom-client | ^15 | métriques Prometheus (`/metrics`) |
| stripe | ^17 | paiement (service payment) |
| resend | ^4 | email (service notifications) |
| twilio | ^5 | SMS (service notifications) |
| groq-sdk | ^0.37 | IA (service ai) |
| dotenv | ^16 | chargement `.env` par service |

- **Module system : ESM** (`"type": "module"`, imports suffixés `.js`).
- Dev : `tsx watch src/index.ts`. Build : `tsc`. Start : `node dist/index.js`.
- Chaque service : `createServer()` dans `server.ts`, démarré par `index.ts`, config validée par zod dans `config/env.ts` (lit `services/<name>/.env`).

## Frontend cible — Next.js PWA

| Lib | Version | Rôle |
|---|---|---|
| next | ^15 | App Router, RSC, PWA |
| react / react-dom | ^19 | UI |
| tailwindcss | ^4 | styles |
| shadcn/ui | — | composants (cf. skill `vercel:shadcn`) |
| zod + react-hook-form | — | formulaires (validation partagée avec le back via `@fitapp/shared`) |
| recharts ou visx | — | graphiques (poids, mensurations, pas) |
| web-push (côté service) + service worker | — | notifications push PWA (VAPID) |

- **PWA** : `manifest.webmanifest` + service worker (push + installable). Push iOS : seulement si PWA installée (iOS 16.4+).
- Le front consomme les APIs des microservices via `fetch` (clients typés dans `lib/`).

## Données & infra

- **PostgreSQL 16** (Docker, port 5432). Accès SQL direct via `pg` (pas d'ORM).
- **Redis 7** (Docker, port 6379) — cache / rate-limit (selon besoin).
- **Prometheus** (9090) scrape les 5 services sur `/metrics` ; **Grafana** (3030) dashboards provisionnés (`config/grafana/`). Profil docker `monitoring`.
- Schéma : `scripts/init-db.sql` (fresh) + `scripts/migrations/*.sql` (idempotentes, sur base existante).

## Ports (référence)

| Service | Port |
|---|---|
| auth | 3001 |
| api | 3002 |
| ai | 3003 |
| notifications | 3004 |
| payment | 3005 |
| web (Next.js) | 3000 |
| postgres | 5432 · redis 6379 · prometheus 9090 · grafana 3030 |

## Justifications clés (pour le RNCP — C1.3.2)

- **Microservices** : séparation des responsabilités, déploiement/scaling indépendants (ex. service IA isolé), démonstration de maîtrise du distribué (niveau Expert). Couplage faible via clé interne + JWT.
- **SQL direct (pg) sans ORM** : maîtrise des requêtes, transparence, perf — démontre la compétence BDD.
- **Next.js PWA** : un seul codebase web installable (coach desktop + élève mobile), web-push natif, pas de double app native à maintenir.
- **Zod partagé** : une seule source de vérité de validation entre front et back.
