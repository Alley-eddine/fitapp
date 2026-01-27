# Projet École : AI Fitness & Nutrition Coach

## Concept

Application de coaching fitness et nutrition avec IA. L'utilisateur peut :
- Suivre son poids, ses steps, ses séances de sport
- Obtenir des recettes personnalisées générées par IA
- Utiliser le "Frigo Mode" : dire ce qu'il a chez lui → l'IA génère une recette adaptée

---

## Features

### Dashboard Personnel
- 📊 Graphe évolution poids (jour/semaine/mois)
- 👣 Steps du jour
- 🏋️ Séances de sport logguées
- 📈 Stats et progression

### Tracking Séances Sport
- Type de séance (muscu, cardio, HIIT, course, etc.)
- Durée, exercices effectués
- Notes personnelles
- Historique complet
- Stats (nb séances/semaine, streak, progression)

### Nutrition IA
- Profil : poids actuel, objectif, allergies, préférences alimentaires
- Recettes générées selon objectif (perte poids = faible calories, riche protéines)
- **"Frigo Mode"** : l'utilisateur liste ses ingrédients → l'IA propose une recette
- Plan repas à la semaine

### Notifications
- Rappel pesée hebdomadaire
- Motivation ("T'as fait 3 séances cette semaine 💪")
- Rappels repas

---

## Modèle Freemium

| Feature | Free | Premium |
|---------|------|---------|
| Profil & objectifs | ✅ | ✅ |
| Tracking poids/steps | ✅ | ✅ |
| Graphiques basiques | ✅ | ✅ |
| Log séances sport | 3/semaine | Illimité |
| Recettes IA | 2/jour | Illimité |
| Frigo Mode | ❌ | ✅ |
| Plan repas semaine | ❌ | ✅ |
| Stats avancées | ❌ | ✅ |

---

## Exigences École (Microservices)

### 1. Service Authentification (OAuth + OpenID)
- 3 providers OAuth : Google, Facebook, Apple
- JWT pour sécuriser l'API
- Flux OAuth 2.0 et OpenID Connect

### 2. Service Base de Données
- Gestion users, profils, séances, poids, recettes favorites
- Abstraction des requêtes
- Sécurité et optimisation

### 3. Service Métriques (Prometheus + Grafana)
- Collecte métriques temps réel de tous les services
- Dashboard Grafana pour visualisation
- Monitoring santé des microservices

### 4. Service Notifications (Mail + SMS + Push)
- Email : confirmation compte, rappels
- SMS : code mot de passe oublié
- Push : notifications motivation, rappels

### 5. Service IA (Cœur de l'app)
- Génération de recettes personnalisées
- Analyse des ingrédients (Frigo Mode)
- Conseils nutrition basés sur le profil
- API : OpenAI GPT-4 ou Claude API

### 6. Service Paiement (Stripe)
- Gestion abonnements (Free/Premium)
- Paiements récurrents
- Factures par email
- Webhooks pour changement de statut

### 7. Frontend React
- App React moderne
- Pages : Auth, Dashboard, Séances, Nutrition, Profil, Abonnement
- Responsive (mobile-first)

---

## Architecture Microservices

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                     (React + Vite)                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY                             │
│                   (Kong / Nginx / Node)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  AUTH SERVICE │ │   DB SERVICE  │ │   IA SERVICE  │
│   (Node.js)   │ │   (Node.js)   │ │   (Python?)   │
│               │ │               │ │               │
│ - OAuth       │ │ - Users       │ │ - Recettes    │
│ - JWT         │ │ - Séances     │ │ - Frigo Mode  │
│ - Sessions    │ │ - Poids       │ │ - Conseils    │
└───────────────┘ └───────────────┘ └───────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ NOTIF SERVICE │ │PAYMENT SERVICE│ │METRICS SERVICE│
│   (Node.js)   │ │   (Node.js)   │ │  (Prometheus) │
│               │ │               │ │               │
│ - Email       │ │ - Stripe      │ │ - Collecte    │
│ - SMS         │ │ - Webhooks    │ │ - Grafana     │
│ - Push        │ │ - Factures    │ │ - Alertes     │
└───────────────┘ └───────────────┘ └───────────────┘
```

---

## Tech Stack Suggéré

### Frontend
- React 18+ avec Vite
- TailwindCSS pour le style
- React Query pour les appels API
- Recharts ou Chart.js pour les graphiques
- React Router

### Backend (Microservices)
- Node.js + Express ou Fastify
- Python pour le service IA (optionnel)
- PostgreSQL pour la DB
- Redis pour le cache/sessions

### Auth
- Passport.js pour OAuth
- JWT (jsonwebtoken)
- Providers : Google, Facebook, Apple

### IA
- OpenAI API (GPT-4) ou Claude API
- Prompts structurés pour recettes

### Paiement
- Stripe API
- Webhooks pour events

### Notifications
- Nodemailer (email)
- Twilio (SMS)
- Firebase Cloud Messaging (Push)

### Metrics
- Prometheus pour collecte
- Grafana pour dashboards

### Infra
- Docker + Docker Compose
- Chaque service dans son container

---

## Noms possibles

- FitCoach AI
- NutriMate
- FitMind
- MealFit
- HealthBuddy
- FitGenix

---

## Priorité pour la démo Lundi

1. **Auth** : Login Google fonctionnel
2. **Dashboard** : Affichage poids + graphique simple
3. **Séances** : Ajouter/voir ses séances
4. **IA** : Une feature de génération recette (même basique)
5. **UI** : Propre et fonctionnelle

Les autres features (Stripe, notifications, metrics) peuvent être montrées en "preview" ou architecture.

---

## Commandes pour démarrer

```bash
# Créer le dossier projet
mkdir fitness-ai-coach
cd fitness-ai-coach

# Initialiser le monorepo (optionnel)
# Ou créer les dossiers pour chaque service
mkdir frontend
mkdir services
mkdir services/auth
mkdir services/database
mkdir services/ai
mkdir services/notifications
mkdir services/payments
mkdir services/metrics

# Frontend React
cd frontend
npm create vite@latest . -- --template react-ts
npm install
```

---

## Base de données (Tables principales)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  avatar_url VARCHAR,
  provider VARCHAR, -- google, facebook, apple
  provider_id VARCHAR,
  subscription_type VARCHAR DEFAULT 'free', -- free, premium
  subscription_end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Profiles (infos fitness)
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  current_weight DECIMAL,
  target_weight DECIMAL,
  height INTEGER,
  activity_level VARCHAR, -- sedentary, moderate, active
  goal VARCHAR, -- lose_weight, gain_muscle, maintain
  allergies TEXT[],
  diet_preferences TEXT[], -- vegetarian, vegan, etc
  created_at TIMESTAMP DEFAULT NOW()
);

-- Weight tracking
CREATE TABLE weight_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  weight DECIMAL NOT NULL,
  logged_at TIMESTAMP DEFAULT NOW()
);

-- Workout sessions
CREATE TABLE workouts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR NOT NULL, -- muscu, cardio, hiit, run, etc
  duration_minutes INTEGER,
  exercises JSONB, -- [{name, sets, reps, weight}]
  notes TEXT,
  logged_at TIMESTAMP DEFAULT NOW()
);

-- Steps tracking
CREATE TABLE steps_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  steps INTEGER NOT NULL,
  logged_at DATE DEFAULT CURRENT_DATE
);

-- Saved recipes
CREATE TABLE saved_recipes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR NOT NULL,
  ingredients JSONB,
  instructions TEXT,
  calories INTEGER,
  protein INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

Bonne chance pour le projet ! 🚀
