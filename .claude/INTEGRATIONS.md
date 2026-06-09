# Intégrations tierces — FitCoach AI

Toutes les clés vivent dans les `.env` **par service** (gitignored). `.env.example` (racine) liste les variables sans valeurs. Jamais de secret dans le repo.

## Authentification interne (service ↔ service)

- Header **`x-internal-key: <INTERNAL_API_KEY>`** pour appeler un service interne (notifications). Même valeur dans tous les services concernés.
- **`JWT_SECRET`** partagé entre tous les services (≥32 c.). JWT signés par `auth` (issuer `fitapp:auth`, audience `fitapp:api`).

## Stripe — service `payment` (3005)

- Clés **test** : `STRIPE_SECRET_KEY=sk_test_…`, `STRIPE_WEBHOOK_SECRET=whsec_…`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM`.
- Provisionnement des produits/prix : `pnpm --filter @fitapp/payment setup:plans` (idempotent via lookup keys).
- **Checkout** : `mode: 'subscription'`, `client_reference_id = userId`. Retour sur `/api/payment/return` (page servie par le service, indépendante du port front).
- **Webhook** (`/api/payment/webhook`) : vérif signature sur **raw body** ; gère `customer.subscription.*` + `invoice.payment_*` → met à jour `users.subscription` + envoie facture/mails.
- **Sync** (`/api/payment/sync`) : réconcilie l'abonnement directement depuis Stripe au retour du checkout (ne dépend pas du webhook). ⚠️ API Stripe 2025+ : `current_period_end` est sur `subscription.items[]`, pas sur l'abonnement.
- **Dev webhook** : `stripe listen --api-key <sk_test> --forward-to localhost:3005/api/payment/webhook`.
- **Deux modèles tarifaires** (cf. BUSINESS_RULES) : tiers B2C (lambda) **et** abonnement coach (B2B, places élèves).

## Resend — emails (service `notifications`, 3004)

- `RESEND_API_KEY`, `EMAIL_FROM`. Sans clé → mode **simulated** (loggé).
- ⚠️ En test, Resend ne délivre **qu'à l'adresse du compte** tant qu'un domaine n'est pas vérifié (resend.com/domains) + `EMAIL_FROM` sur ce domaine.
- Templates serveur dans `notifications/src/templates/` (verify-account, invoice, subscription-*, payment-failed, + à venir coach/élève).

## Twilio — SMS (service `notifications`)

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`. Sans clés → mode **simulated** (code visible dans les logs).
- Compte d'essai : n'envoie qu'aux **numéros vérifiés** ; un numéro US peut envoyer en international (FR) sans 10DLC.
- Usage : code de réinitialisation de mot de passe.

## Web Push (PWA) — service `notifications` + front

- **VAPID** : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (générer via `web-push generateVAPIDKeys`). Public key exposée au front.
- Flux : le front s'abonne (service worker) → envoie la subscription au back → stockée (table `push_subscriptions`) → le back envoie via `web-push`.
- **Notifications programmées/contextuelles** (objectif pas, "séance oubliée" 16h, "dimanche pesée", messages "voix du coach") : un **planificateur (cron)** dans `notifications` génère les push. ⚠️ iOS : push web uniquement si PWA installée (iOS 16.4+).

## Groq — IA (service `ai`, 3003)

- `GROQ_API_KEY`. Génération de recettes / chat nutrition.
- **Élève** : prompt **contraint** par le plan nutrition du coach (kcal/macros/aliments imposés) → l'IA propose des variantes conformes.
- **Lambda** : génération libre. Rate-limiting par tier d'abonnement.

## Cloudinary — médias (front + api)

- `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` / preset unsigned (legacy mobile) → côté web : upload unsigned ou signé via le service api. Avatars, photos de progression.

## OAuth Google — service `auth`

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (doit matcher l'URI autorisé dans Google Cloud Console — **port 3001**). `FRONTEND_URL` = origine du front pour le redirect post-login.
- Providers à venir (cible RNCP : 3 fournisseurs) : Facebook, GitHub.

## Observabilité — Prometheus / Grafana

- Chaque service expose `/metrics` (prom-client). `config/prometheus.yml` scrape les 5 services. Grafana provisionné (`config/grafana/`), dashboard "FitApp — Microservices Overview".
- À ajouter (Bloc 4) : **règles d'alerte** (uptime, taux d'erreur) + Dependabot pour la veille dépendances.
