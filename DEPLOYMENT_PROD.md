# Déploiement production — FitCoach AI

Cible : **front sur Vercel**, **back (5 microservices + PostgreSQL + Redis) sur le VPS Hetzner via Coolify**.

```
                 Internet
                    │
        ┌───────────┴───────────┐
        │                       │
   Vercel (front)         Coolify / Hetzner (Traefik + TLS)
   https://<DOMAIN>        ├─ auth     → https://auth.<DOMAIN>   (public)
        │                  ├─ api      → https://api.<DOMAIN>    (public)
        │                  ├─ payment  → https://pay.<DOMAIN>    (public)
        └── appels HTTPS ──┤─ ai            (réseau privé)
                           ├─ notifications (réseau privé)
                           ├─ postgres      (réseau privé, volume)
                           └─ redis         (réseau privé, volume)
```

Les services `ai` et `notifications` ne sont **jamais exposés** : ils ne sont appelés qu'en interne (api → ai, auth/payment → notifications) sur le réseau privé Coolify. Seuls `auth`, `api`, `payment` reçoivent un domaine public.

---

## 1. Prérequis (côté Alley, une fois)

- Un **domaine** pointant vers le VPS. Créer 3 enregistrements DNS `A` vers l'IP du VPS :
  `auth.<DOMAIN>`, `api.<DOMAIN>`, `pay.<DOMAIN>` (Coolify génère les certificats Let's Encrypt).
- Coolify déjà installé sur le VPS (fait ✅).
- Comptes **Vercel** (Pro ✅), **Resend** (Pro ✅), **Groq**, **Stripe**, **Google Cloud** (OAuth).

## 2. Back — Coolify

1. **New Resource → Docker Compose**, source = ce dépôt GitHub, branche `main`, fichier `docker-compose.prod.yml`.
2. **Environment Variables** : coller le contenu rempli de `.env.production.example` (voir la liste des clés). Générer les secrets :
   ```bash
   openssl rand -hex 32   # JWT_SECRET
   openssl rand -hex 16   # INTERNAL_API_KEY
   openssl rand -hex 24   # POSTGRES_PASSWORD
   ```
3. **Domaines** : dans l'UI Coolify, assigner un domaine aux 3 services publics
   (`auth.<DOMAIN>` → service `auth` port 3001, `api.<DOMAIN>` → `api` 3002, `pay.<DOMAIN>` → `payment` 3005).
   Laisser `ai`, `notifications`, `postgres`, `redis` **sans domaine**.
4. **Deploy**. Au premier boot, `postgres` exécute `scripts/init-db.sql` (schéma complet). Pour une base déjà peuplée, appliquer les migrations idempotentes de `scripts/migrations/`.
5. Vérifier : `https://api.<DOMAIN>/health` → `{"status":"healthy","service":"api"}`.

> Auto-deploy : activer le **webhook GitHub** de Coolify (Settings → Webhooks) pour redéployer à chaque push sur `main`.

## 3. Front — Vercel

1. **New Project** → importer le dépôt. **Root Directory** = `apps/web`. Framework = Next.js (auto).
2. **Environment Variables** :
   ```
   NEXT_PUBLIC_AUTH_URL=https://auth.<DOMAIN>
   NEXT_PUBLIC_API_URL=https://api.<DOMAIN>
   NEXT_PUBLIC_PAYMENT_URL=https://pay.<DOMAIN>
   ```
3. **Deploy**. Vercel redéploie automatiquement à chaque push sur `main` (prod) et crée une preview par PR.
4. (Option) Domaine custom `<DOMAIN>` sur le projet Vercel, et mettre `FRONTEND_URL=https://<DOMAIN>` côté Coolify.

## 4. Callbacks externes à mettre à jour

- **Google OAuth** (console) : URI de redirection autorisée = `https://auth.<DOMAIN>/auth/google/callback`.
- **Stripe** (dashboard) : endpoint webhook = `https://pay.<DOMAIN>/api/payment/webhook`, puis copier le `whsec_…` dans `STRIPE_WEBHOOK_SECRET`.
- **Resend** : vérifier le domaine d'envoi pour `EMAIL_FROM` (livraison à n'importe quel destinataire avec Resend Pro).

## 5. Vérification post-déploiement

```bash
curl https://auth.<DOMAIN>/health
curl https://api.<DOMAIN>/health
curl https://pay.<DOMAIN>/health
```
Puis le parcours réel : inscription → (rôle coach en base) → invitation → un 2e compte rejoint → programme + plan nutrition assignés → séance du jour + recette IA cadrée → progression côté coach → pas de paywall pour l'élève.

## 6. CORS (durcissement recommandé)

Les services autorisent aujourd'hui toutes les origines (`origin: true`, pratique en dev). En prod, restreindre à `FRONTEND_URL`. À traiter en tâche de durcissement (voir issue de suivi).

## Build local des images (debug)

```bash
docker build -f services/api/Dockerfile -t fitapp-api .
docker run --rm -p 3002:3002 --env-file <(...) fitapp-api   # node dist/index.js
```
