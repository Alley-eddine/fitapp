# Déploiement production — FitCoach AI

Cible : **front sur Vercel**, **back (5 microservices + PostgreSQL + Redis) sur le VPS Hetzner via Coolify**.

```
                 Internet
                    │
        ┌───────────┴───────────┐
        │                       │
   Vercel (front)         Coolify / Hetzner (Traefik + TLS)
   https://<app>.vercel.app     ├─ auth     → https://auth.<IP>.sslip.io  (public)
        │                       ├─ api      → https://api.<IP>.sslip.io   (public)
        │                       ├─ payment  → https://pay.<IP>.sslip.io   (public)
        └── appels HTTPS ───────┤─ ai            (réseau privé)
                                ├─ notifications (réseau privé)
                                ├─ postgres      (réseau privé, volume)
                                └─ redis         (réseau privé, volume)
```

Les services `ai` et `notifications` ne sont **jamais exposés** : ils ne sont appelés qu'en interne (api → ai, auth/payment → notifications) sur le réseau privé Coolify. Seuls `auth`, `api`, `payment` reçoivent une URL publique.

> **Sans domaine perso.** Le front tourne sur l'URL fournie par Vercel (`<app>.vercel.app`). Pour le back, Coolify génère des URLs **`sslip.io`** à partir de l'IP du VPS (`<service>.<IP>.sslip.io`) avec TLS Let's Encrypt automatique — aucun domaine à acheter ni DNS à gérer. Un domaine perso reste ajoutable plus tard sans changer le code (juste les variables d'env).

---

## 1. Prérequis (côté Alley, une fois)

- **Aucun domaine requis** : Coolify génère des URLs `sslip.io` (bouton *Generate Domain*) pour les 3 services publics. Un domaine perso reste optionnel.
- Coolify déjà installé sur le VPS (fait ✅).
- Comptes **Vercel** (Pro ✅), **Resend** (Pro ✅), **Groq**, **Stripe**, **Google Cloud** (OAuth).

## Ordre de déploiement (les URLs se croisent)

Le front a besoin des URLs du back, et le back a besoin de l'URL du front. On casse la dépendance en 3 temps :
1. **Back d'abord** (§2) → récupérer les 3 URLs `sslip.io` (auth, api, pay).
2. **Front** (§3) avec ces 3 URLs → récupérer l'URL `*.vercel.app`.
3. **Back, mise à jour** : renseigner `FRONTEND_URL`, `AUTH_PUBLIC_URL`, `PAYMENT_PUBLIC_URL`, `GOOGLE_CALLBACK_URL` avec les vraies URLs → redéployer, puis §4 (callbacks Google/Stripe).

## 2. Back — Coolify

1. **New Resource → Docker Compose**, source = ce dépôt GitHub, branche `main`, fichier `docker-compose.prod.yml`.
2. **Environment Variables** : coller le contenu rempli de `.env.production.example` (voir la liste des clés). Générer les secrets :
   ```bash
   openssl rand -hex 32   # JWT_SECRET
   openssl rand -hex 16   # INTERNAL_API_KEY
   openssl rand -hex 24   # POSTGRES_PASSWORD
   ```
3. **URLs publiques** : dans l'UI Coolify, pour `auth` (port 3001), `api` (3002) et `payment` (3005), cliquer *Generate Domain* → Coolify crée une URL `https://<service>.<IP>.sslip.io` avec TLS. Laisser `ai`, `notifications`, `postgres`, `redis` **sans URL** (privés). Noter les 3 URLs générées.
4. **Deploy**. Au premier boot, `postgres` exécute `scripts/init-db.sql` (schéma complet). Pour une base déjà peuplée, appliquer les migrations idempotentes de `scripts/migrations/`.
5. Vérifier : `https://api.<IP>.sslip.io/health` → `{"status":"healthy","service":"api"}`.

> Auto-deploy : activer le **webhook GitHub** de Coolify (Settings → Webhooks) pour redéployer à chaque push sur `main`.

## 3. Front — Vercel

1. **New Project** → importer le dépôt. **Root Directory** = `apps/web`. Framework = Next.js (auto).
2. **Environment Variables** (les 3 URLs `sslip.io` notées au §2) :
   ```
   NEXT_PUBLIC_AUTH_URL=https://auth.<IP>.sslip.io
   NEXT_PUBLIC_API_URL=https://api.<IP>.sslip.io
   NEXT_PUBLIC_PAYMENT_URL=https://pay.<IP>.sslip.io
   ```
3. **Deploy** → noter l'URL de prod `https://<app>.vercel.app`. Vercel redéploie à chaque push sur `main` (prod) et crée une preview par PR.
4. **Retour Coolify** : renseigner côté back `FRONTEND_URL=https://<app>.vercel.app`, `AUTH_PUBLIC_URL=https://auth.<IP>.sslip.io`, `PAYMENT_PUBLIC_URL=https://pay.<IP>.sslip.io`, `GOOGLE_CALLBACK_URL=https://auth.<IP>.sslip.io/auth/google/callback` → redéployer.

## 4. Callbacks externes à mettre à jour

- **Google OAuth** (console) : URI de redirection autorisée = `https://auth.<IP>.sslip.io/auth/google/callback`.
- **Stripe** (dashboard) : endpoint webhook = `https://pay.<IP>.sslip.io/api/payment/webhook`, puis copier le `whsec_…` dans `STRIPE_WEBHOOK_SECRET`.
- **Resend** : vérifier un domaine d'envoi pour `EMAIL_FROM` (livraison à n'importe quel destinataire avec Resend Pro). Sans domaine vérifié, garder l'adresse `onboarding@resend.dev` de test.

## 5. Vérification post-déploiement

```bash
curl https://auth.<IP>.sslip.io/health
curl https://api.<IP>.sslip.io/health
curl https://pay.<IP>.sslip.io/health
```
Puis le parcours réel : inscription → (rôle coach en base) → invitation → un 2e compte rejoint → programme + plan nutrition assignés → séance du jour + recette IA cadrée → progression côté coach → pas de paywall pour l'élève.

## 6. CORS (durcissement recommandé)

Les services autorisent aujourd'hui toutes les origines (`origin: true`, pratique en dev). En prod, restreindre à `FRONTEND_URL`. À traiter en tâche de durcissement (voir issue de suivi).

## Build local des images (debug)

```bash
docker build -f services/api/Dockerfile -t fitapp-api .
docker run --rm -p 3002:3002 --env-file <(...) fitapp-api   # node dist/index.js
```
