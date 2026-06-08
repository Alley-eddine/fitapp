# Règles de code — FitCoach AI

## TypeScript (partout)

- **`strict: true`** non négociable. **Pas de `any`** → `unknown` + type guard si besoin.
- Pas de `@ts-ignore` / `@ts-expect-error` sans commentaire de justification au-dessus.
- Types & schémas métier partagés via **`@fitapp/shared`** — ne jamais redéclarer un type/schéma qui y existe déjà.
- **Une seule source de validation** : les schémas **Zod** vivent dans `packages/shared` et servent au front ET au back.
- Préférer `type` à `interface` (sauf extension de lib externe).
- Code, noms, commentaires **en anglais**. UI/textes utilisateur **en français**.

## Backend — services Fastify (ESM)

- **ESM strict** : imports relatifs suffixés `.js` (`./routes/foo.routes.js`), `"type": "module"`.
- Structure imposée : `index.ts` → `server.ts` (`createServer()`) → `routes/` + `services/` + `providers/` + `config/env.ts`.
- **Validation à l'entrée** : tout body est `safeParse` via un schéma `@fitapp/shared` ; sur échec → `400` + `{ error: <flatten> }`.
- **Auth** : routes protégées via le middleware `authMiddleware` (JWT `jose`, issuer `fitapp:auth`, audience `fitapp:api`). Routes internes (notifications) via `internalAuth` (`x-internal-key`).
- **Gestion d'erreurs** : chaque handler dans try/catch → status HTTP adapté + `{ error: string }`. Jamais throw vers le client.
- **`/metrics`** : `const m = await register.metrics(); reply.header('Content-Type', register.contentType).send(m);` (⚠️ ne PAS `return register.metrics()` — ça bloque sous Fastify v5).
- **SQL** : requêtes paramétrées (`$1, $2…`) **toujours** (anti-injection). Jamais de concaténation de valeurs utilisateur.
- **Dev-safe providers** : un provider tiers sans clé configurée doit dégrader proprement (ex. notifications → mode "simulated" loggé), pas crasher.
- Pas de `console.log` de données personnelles (email/téléphone/mensurations). `console.error` pour les erreurs serveur.

## Frontend — Next.js 15

- **Server Components par défaut** ; `"use client"` uniquement si state/effects/handlers/`window`.
- **Pas de `useEffect` pour fetch** dans un Server Component → fetch direct (async) côté serveur.
- **Server Actions** (`"use server"`) ou route handlers pour les mutations ; **re-valider en Zod côté serveur**, jamais faire confiance au client.
- **`next/image`** pour les images, **`next/link`** pour la nav interne, **`next/font`** pour les polices.
- **Garde d'accès par rôle** (coach/student/user) via middleware + vérif du `role` dans le JWT.
- **shadcn/ui** pour les composants (cf. skill `vercel:shadcn`). Helper `cn()` pour les classes conditionnelles.
- **Tailwind** : mobile-first, tokens du design system, pas de hex hardcodé (sauf marques tierces). Styles inline uniquement pour valeurs dynamiques (`style={{ width: \`\${pct}%\` }}`).
- **Pas de `alert()`/`confirm()`** → composants `Dialog`/`AlertDialog` ou toast.
- **PWA** : pas de logique critique qui suppose le réseau ; gérer l'état offline basique.

## Formulaires

- **react-hook-form + zod** (schéma partagé `@fitapp/shared`).
- Erreurs affichées **par champ**. Bouton submit désactivé + spinner pendant l'envoi.

## Données & formats

- **Email** : lowercase au stockage, validation Zod.
- **Téléphone** : format international E.164 (`+33…`).
- **Dates** : UTC en base (ISO 8601), formatées à l'affichage via `Intl.DateTimeFormat('fr-FR')`.
- **Montants** : centimes en base, formatés via `Intl.NumberFormat('fr-FR', { style: 'currency' })`.
- **Calories** : besoin = Mifflin-St Jeor (cf. api/profile) ; brûlées = MET × poids × durée (cf. api/workout).

## Commentaires & TODO

- En anglais, expliquent le **pourquoi** (pas le quoi). Pas de commentaire évident.
- TODO format `// TODO(alley): description`. Pas de TODO orphelin → créer une **issue GitHub**.

## Tests

- **Vitest** sur la **logique métier pure** : calcul calories, mapping tier↔price Stripe, validation Zod, estimation calories brûlées, mapping rôles. (Voir agent `test-writer`.)
- Pas de couverture exhaustive exigée, mais les fonctions critiques **doivent** être testées (exigence RNCP C2.2.2).
- `pnpm test` doit passer en CI.

## Accessibilité (exigence RNCP C2.2.3)

- `alt` sur les images, `aria-label` sur les boutons icon-only, focus visible, contraste WCAG AA, `prefers-reduced-motion` respecté.

## Avant tout commit

```bash
pnpm typecheck   # tsc -b
pnpm lint
pnpm build
pnpm test
```
