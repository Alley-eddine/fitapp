# Déploiement & exploitation — FitCoach AI

## Local (dev)

Prérequis : Node 20+, pnpm, Docker Desktop.

```bash
pnpm install
docker compose up -d                         # postgres + redis
docker compose --profile monitoring up -d    # + prometheus + grafana
# migrations sur base existante :
docker compose exec -T postgres psql -U fitapp -d fitapp < scripts/migrations/00X_xxx.sql
pnpm dev                                       # tous les services (parallèle)
# ou individuellement : pnpm dev:auth | dev:api | dev:ai | dev:notifications | dev:payment
# front : cd apps/web && pnpm dev   (Next.js, port 3000)
```

- Chaque service lit `services/<name>/.env`. Le front lit `apps/web/.env.local`.
- Stripe webhooks en local : `stripe listen --api-key <sk_test> --forward-to localhost:3005/api/payment/webhook`.

## Variables d'environnement

- `.env.example` (racine) = source de vérité des variables (sans valeurs).
- Secrets partagés : `JWT_SECRET`, `INTERNAL_API_KEY` (mêmes valeurs entre services concernés).
- Par service : voir `INTEGRATIONS.md`.
- ⚠️ Aligner les ports : auth **3001** (mobile/web + Google callback + prometheus), api 3002, ai 3003, notifications 3004, payment 3005.

## Base de données

- Fresh : `scripts/init-db.sql` (monté par docker au 1er boot).
- Existante : **migrations idempotentes** dans `scripts/migrations/` (DO blocks, `IF NOT EXISTS`). Toute évolution de schéma = migration **+** mise à jour de `init-db.sql`.

## CI/CD (à mettre en place — Bloc 2)

**CI** — `.github/workflows/ci.yml` sur chaque PR vers `dev`/`main` :
```
- pnpm install
- pnpm typecheck
- pnpm lint
- pnpm test
- pnpm build
```

**CD** :
- **Front Next.js** → Vercel (preview par PR, prod sur `main`).
- **Services** → conteneurs Docker sur un hébergeur (Railway / Render / VPS), déploiement sur merge `main`.
- **Dependabot** (`.github/dependabot.yml`) pour la veille/MàJ des dépendances (Bloc 4).

## Observabilité (Bloc 4)

- `/metrics` exposé par chaque service → Prometheus (9090) → Grafana (3030, admin/admin en local).
- Dashboard provisionné : `config/grafana/`.
- À ajouter : **règles d'alerte** (uptime, taux d'erreur, latence) et leur consignation.

## Build & release

```bash
pnpm build            # build de tous les packages/services
git tag vX.Y.Z && git push --tags
# mettre à jour CHANGELOG.md (journal des versions — Bloc 4)
```

## Runbook incident (ébauche — Bloc 4)

1. Détection (alerte Grafana / log).
2. Consignation **issue GitHub** (repro, impact, criticité).
3. Branche `hotfix/*` → correctif → PR → CI verte → merge `main` → back-merge `dev`.
4. Note dans le CHANGELOG + post-mortem court si critique.
