# FitCoach AI — Contexte projet pour Claude Code

Tu travailles sur **FitCoach AI**, une **plateforme de coaching sportif** qui relie un **coach** et ses **élèves**, et propose aussi un mode autonome pour un utilisateur lambda. Le coach prépare les programmes d'entraînement, la nutrition et les compléments ; l'élève les exécute **sans rien configurer** (tout est pré-réglé) ; les données remontent automatiquement au coach. L'objectif produit : **minimiser le temps passé** à saisir/régler, et **fluidifier la transmission** coach ↔ élève.

Projet présenté pour le titre **RNCP 39583 — Expert en Développement Logiciel**. Commanditaire réel : un coach sportif privé (« Markus »). Voir `RNCP.md`.

## Fichiers de contexte à lire en priorité

Avant **toute** action de code, lis dans cet ordre :

1. `.claude/STACK.md` — versions exactes, libs et justifications
2. `.claude/ARCHITECTURE.md` — monorepo, microservices, front Next.js, flux de données
3. `.claude/CODING_RULES.md` — TS strict, conventions backend (Fastify/ESM) et frontend (Next.js)
4. `.claude/BUSINESS_RULES.md` — **lecture obligatoire** : rôles (coach/élève/lambda), tarification, nutrition, programmes — toute logique métier en dépend
5. `.claude/INTEGRATIONS.md` — Stripe, Twilio, Resend, Groq, Cloudinary, web-push, clé interne
6. `.claude/GIT_WORKFLOW.md` — branches, commits, PR
7. `.claude/DEPLOYMENT.md` — Docker, env par service, CI/CD
8. `.claude/RNCP.md` — mapping compétences ↔ blocs ↔ livrables

## Règles absolues (à ne jamais violer)

- **Aucune attribution AI** dans les commits, le code, les commentaires, les PR, les noms de branches. Pas de "Generated with Claude", pas de `Co-Authored-By` Anthropic. **Jamais.**
- **Commits en anglais**, format **Conventional Commits** (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `perf:`, `style:`, `ci:`). Sujet court (≤72 c.), impératif, sans point final.
- **UI / textes en français**, **code (variables, fonctions, types, commentaires) en anglais**.
- **TypeScript strict** partout. Pas de `any`. Pas de `@ts-ignore` / `@ts-expect-error` sans commentaire de justification au-dessus.
- **Jamais de commit direct sur `main` ou `dev`** : toujours une branche `feature/*` puis PR (voir `GIT_WORKFLOW.md`).
- **Avant chaque PR** : `pnpm typecheck && pnpm lint && pnpm build` doivent passer.
- **Aucun secret dans le repo**. Tout en variables d'environnement, `.env` gitignored, `.env.example` à jour.
- **Aucune donnée personnelle d'utilisateur en clair dans les logs** (email, téléphone, mensurations, géoloc).
- **Les règles métier de `BUSINESS_RULES.md` font foi** — toute déviation doit être validée par Alley avant implémentation.

## Workflow attendu

1. Lis les fichiers de contexte pertinents pour la tâche.
2. Si la tâche est ambiguë, **pose une question avant de coder**, ne devine pas.
3. Pour un changement > 3 fichiers, propose un plan court (3-5 points) avant.
4. Suis strictement les patterns existants. Si le pattern n'existe pas, propose-le et attends validation.
5. Vérifie `typecheck`/`lint`/`build` avant de proposer le commit.
6. Travaille sur une branche `feature/*`, ouvre une PR vers `dev`.

## Agents disponibles (`.claude/agents/`)

- **`rncp-dossier`** — rédige les livrables RNCP (dossiers FR) selon la grille d'évaluation.
- **`test-writer`** — écrit les tests Vitest en suivant `CODING_RULES.md`.
- **`code-reviewer`** — relit un diff contre les règles avant PR.
- **`architecte`** — schémas d'architecture et décisions techniques justifiées.

## Stack en une ligne

Front **Next.js 15 (App Router) en PWA** + shadcn/ui + Tailwind · Back **5 microservices Fastify 5 (TypeScript ESM)** · **PostgreSQL 16** + Redis · monorepo **pnpm** · **Stripe / Twilio / Resend / Groq / Cloudinary / web-push** · observabilité **Prometheus + Grafana**.

## Contacts projet

- **Développeur / candidat RNCP** : Alley Eddine (Alleycom)
- **Commanditaire** : Markus — coach sportif privé (client pilote réel)
- **Titre visé** : RNCP 39583 — Expert en Développement Logiciel
