# Git workflow — FitCoach AI

> ⚠️ Le jury RNCP **regarde l'historique Git**. À partir de maintenant, on applique des pratiques pro : branches, PR, conventional commits, issues, tags. L'objectif : montrer un process d'ingénierie sérieux d'ici le rendu Bloc 2 (20 juillet).

## Modèle de branches

```
main          ← production (déployable, tags de release)
  ↑
dev           ← intégration / staging
  ↑
feature/*     ← une fonctionnalité / un ticket
fix/*         ← correctif non urgent
hotfix/*      ← correctif urgent sur prod
```

### Règles

- **`main`** : toujours déployable. Push interdit sauf merge de `dev` validé.
- **`dev`** : branche d'intégration. Toutes les `feature/*` y mergent.
- **`feature/*`** : nommage `feature/<slug-court>` (ex. `feature/coach-program-assignment`, `feature/web-push`, `feature/measurements-charts`).
- **Jamais** de commit direct sur `main` ou `dev`.

### Workflow PR

```
1. git checkout dev && git pull
2. git checkout -b feature/<slug>
3. ... work ...
4. pnpm typecheck && pnpm lint && pnpm build && pnpm test
5. git push -u origin feature/<slug>
6. gh pr create --base dev --title "feat(scope): subject"
7. CI verte + self-review documentée
8. Squash merge dans dev
9. Batch prêt → PR dev → main → tag
```

- **Squash merge** systématique (historique `dev`/`main` lisible).
- Lier la PR à une **issue** (`Closes #12`).

## Format des commits — Conventional Commits, en anglais

```
<type>(<scope>): <subject>

[body optionnel : le POURQUOI]
```

| Type | Usage |
|---|---|
| `feat` | nouvelle fonctionnalité |
| `fix` | correction de bug |
| `chore` | entretien (deps, config) |
| `refactor` | réorganisation sans changement de comportement |
| `docs` | documentation |
| `test` | tests |
| `perf` | performance |
| `style` | formatage |
| `ci` | CI/CD |

- **Scope** = zone touchée : `auth`, `api`, `payment`, `notifications`, `ai`, `web`, `shared`, `workout`, `nutrition`, `coach`, `monitoring`.
- **Subject** : impératif (`add`, `fix`, `remove`), ≤72 c., pas de point final.
- **Body** : explique le pourquoi, wrap à 72 c.
- **Règle absolue** : **aucune** mention/attribution AI (titre, body, footer). Pas de `Co-Authored-By: Claude`.

### Exemples

```
feat(coach): assign a weekly program to a student
fix(payment): read current_period_end from subscription item
feat(notifications): add web-push (VAPID) channel
test(api): cover daily calorie target computation
ci: add typecheck + test workflow on PR
```

## Issues & board (exigence RNCP — suivi / anomalies)

- **GitHub Issues** pour : features, bugs (anomalies), dette technique. Une issue = un périmètre.
- Labels : `feature`, `bug`, `chore`, `rncp`, `priority:high|med|low`.
- **Board (Projects)** type Kanban : `Backlog → Todo → In progress → Review → Done`.
- Les **anomalies** sont consignées en issues (description, repro, correctif, PR liée) → nourrit le **Bloc 4** (consignation + correctif).

## Pull requests

Template `.github/pull_request_template.md` :

```markdown
## Context
<!-- pourquoi, lien issue -->
Closes #

## Changes
<!-- bullet list -->

## Test plan
- [ ] pnpm typecheck
- [ ] pnpm lint
- [ ] pnpm build
- [ ] pnpm test
- [ ] vérif manuelle
```

Auto-merge **désactivé** (validation humaine).

## Tags & versions (Bloc 4 — journal de versions)

```bash
git tag v0.1.0   # MVP
git push --tags
```

Maintenir un **`CHANGELOG.md`** (format Keep a Changelog) : chaque version liste features/fixes. C'est le **journal des versions déployées** attendu au Bloc 4 (C4.3.2).

## .gitignore (doivent être ignorés)

```
node_modules/ · dist/ · .next/ · .expo/ · .turbo/
.env · .env.*  (sauf .env.example)
.DS_Store · Thumbs.db · *.log · *.tsbuildinfo
knip.config.js · knip.config.d.ts · knip.config.*.map
```

**À committer** : `.env.example`, `pnpm-lock.yaml`, migrations SQL, `CHANGELOG.md`, le template PR, les workflows `.github/`, **et le dossier `.claude/`** (règles + agents — gouvernance projet, comme sur les autres projets Alleycom).

> ⚠️ `.claude/` est versionné : **aucun secret ne doit y figurer** (uniquement des règles, conventions et prompts d'agents).
