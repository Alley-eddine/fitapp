# Tracka - AI Fitness & Nutrition Coach

## Concept

Application de coaching fitness et nutrition avec IA. L'utilisateur peut :
- Suivre son poids, ses steps, ses seances de sport
- Obtenir des recettes personnalisees generees par IA
- Utiliser le "Frigo Mode" : dire ce qu'il a chez lui -> l'IA genere une recette adaptee (respecte le profil utilisateur)

---

## Statut Implementation

### FAIT
- [x] Structure monorepo (npm workspaces)
- [x] Service Auth (port 3001) - Email/Password + OAuth Google
- [x] Service API (port 3002) - Routes profile, workouts, weight, steps
- [x] App Mobile React Native Expo (SDK 51) + Expo Router
- [x] Base PostgreSQL avec Docker
- [x] Authentification email/mot de passe fonctionnelle
- [x] Edition profil connectee a l'API (poids, taille, objectif, niveau activite)
- [x] Calcul automatique des calories (Mifflin-St Jeor + TDEE)
- [x] Persistance gender et birthDate dans le profil
- [x] Dashboard connecte aux vraies donnees (poids, steps, workouts)
- [x] Creation workout connectee a l'API
- [x] Stockage des exercices dans workout_exercises
- [x] Calcul auto duree workout (sets x 40sec + repos entre series + repos entre exos)
- [x] Refresh liste workouts apres creation
- [x] Theme dark/light avec Zustand

### A FAIRE
- [ ] Nouveau flow onboarding (Welcome -> Auth+Profile -> Paywall)
- [ ] 3 tiers de prix (Free, Pro, Premium)
- [ ] Style Hevy/Strong pour workouts (timer live, mini-player)
- [ ] i18n FR/EN
- [ ] Service IA (recettes, Frigo Mode)
- [ ] Service Notifications
- [ ] Service Paiement (Stripe)
- [ ] Service Metrics (Prometheus + Grafana)

---

## Nouveau Flow Onboarding

### Ecran 1 : Welcome Carousel
- 3-4 slides presentant l'app
- Bouton "Get Started" en bas

### Ecran 2 : Auth + Profile (meme ecran)
- Login/Register (email ou OAuth)
- Enchainement direct sur le setup profil
- Infos collectees : poids, taille, age, genre, objectif, niveau activite

### Ecran 3 : Paywall
- Presentation des 3 plans
- Bouton "Start Free Trial" ou "Continue Free"

---

## Modele 3 Tiers

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| Profil & objectifs | OK | OK | OK |
| Tracking poids/steps | OK | OK | OK |
| Graphiques basiques | OK | OK | OK |
| Log seances sport | 3/semaine | Illimite | Illimite |
| Recettes IA | 2/jour | 10/jour | Illimite |
| Frigo Mode | Non | OK | OK |
| Plan repas semaine | Non | Non | OK |
| Stats avancees | Non | OK | OK |
| Workouts guides IA | Non | Non | OK |
| Support prioritaire | Non | Non | OK |

---

## Features

### Dashboard Personnel
- Graphe evolution poids (jour/semaine/mois)
- Steps du jour avec objectif
- Seances de sport logguees
- Stats et progression

### Tracking Seances Sport (Style Hevy/Strong)
- Timer live pendant la seance (mini-player en bas)
- Type de seance (muscu, cardio, HIIT, course, yoga)
- Ajout exercices avec sets, reps, poids
- Temps de repos configurable (entre series et entre exos)
- Calcul automatique de la duree totale
- Historique complet
- Stats (nb seances/semaine, streak, progression)

### Nutrition IA
- Profil : poids actuel, objectif, allergies, preferences alimentaires
- Recettes generees selon objectif (perte poids = faible calories, riche proteines)
- **"Frigo Mode"** : liste ingredients -> IA propose recette adaptee au profil
- Plan repas a la semaine (Premium)

### Notifications
- Rappel pesee hebdomadaire
- Motivation ("T'as fait 3 seances cette semaine")
- Rappels repas

---

## Architecture Actuelle

```
fitapp/
├── apps/
│   └── mobile/                 # React Native Expo (SDK 51)
│       ├── app/               # Expo Router pages
│       │   ├── (auth)/        # Login screens
│       │   ├── (tabs)/        # Main tabs (dashboard, plans, nutrition, settings)
│       │   ├── profile/       # Profile edit
│       │   └── workout/       # New workout
│       └── src/
│           ├── constants/     # Theme
│           ├── hooks/         # useTheme
│           ├── lib/           # API client
│           └── store/         # Zustand (auth, theme)
│
├── packages/
│   └── shared/                # Schemas Zod partages
│       └── src/schemas/
│           ├── user.schema.ts
│           └── workout.schema.ts
│
├── services/
│   ├── auth/                  # Service Auth (port 3001)
│   │   └── src/
│   │       ├── routes/        # auth.routes.ts, oauth.routes.ts
│   │       └── middleware/    # auth.ts
│   │
│   └── api/                   # Service API (port 3002)
│       └── src/
│           ├── routes/        # profile, workout, weight, steps
│           └── config/        # database.ts
│
├── scripts/
│   └── init-db.sql           # Schema PostgreSQL
│
└── docker-compose.yml        # PostgreSQL container
```

---

## Tech Stack

### Frontend Mobile
- React Native + Expo SDK 51
- Expo Router (file-based routing)
- Zustand (state management)
- React Native Safe Area Context

### Backend (Microservices)
- Node.js + Fastify
- PostgreSQL (Docker)
- JWT pour auth
- Zod pour validation

### Auth
- Email/Password avec bcrypt
- OAuth Google (en cours)
- JWT tokens

### A venir
- Service IA : Claude API pour recettes
- Stripe pour paiements
- Prometheus + Grafana pour metrics

---

## Commandes pour demarrer

```bash
# 1. Lancer PostgreSQL
docker-compose up -d

# 2. Initialiser la DB (si pas fait)
docker exec -i fitapp-postgres psql -U fitapp -d fitapp < scripts/init-db.sql

# 3. Lancer le service Auth (terminal 1)
cd services/auth && npm run dev

# 4. Lancer le service API (terminal 2)
cd services/api && npm run dev

# 5. Lancer l'app mobile (terminal 3)
cd apps/mobile && npx expo start
```

---

## Base de donnees (Tables actuelles)

```sql
-- Types enum
CREATE TYPE activity_level AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');
CREATE TYPE user_goal AS ENUM ('lose_weight', 'gain_muscle', 'maintain', 'improve_endurance');
CREATE TYPE gender AS ENUM ('male', 'female');

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  provider VARCHAR(50),
  provider_id VARCHAR(255),
  subscription_type VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_weight DECIMAL(5,2),
  target_weight DECIMAL(5,2),
  height INTEGER,
  birth_date DATE,
  gender gender,
  activity_level activity_level DEFAULT 'moderate',
  goal user_goal DEFAULT 'maintain',
  daily_calorie_target INTEGER,
  allergies TEXT[] DEFAULT '{}',
  diet_preferences TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workouts
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  duration_minutes INTEGER,
  calories_burned INTEGER,
  notes TEXT,
  ai_guided BOOLEAN DEFAULT false,
  logged_at TIMESTAMP DEFAULT NOW()
);

-- Workout Exercises
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sets INTEGER,
  reps INTEGER,
  weight_kg DECIMAL(5,2),
  duration_seconds INTEGER,
  order_index INTEGER DEFAULT 0
);

-- Weight logs
CREATE TABLE weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  weight DECIMAL(5,2) NOT NULL,
  logged_at TIMESTAMP DEFAULT NOW()
);

-- Steps logs
CREATE TABLE steps_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  steps INTEGER NOT NULL,
  goal INTEGER DEFAULT 10000,
  logged_at DATE DEFAULT CURRENT_DATE,
  UNIQUE(user_id, logged_at)
);
```

---

## Prochaines etapes (dans l'ordre)

1. **Onboarding Flow** - Welcome carousel + Auth/Profile combine + Paywall
2. **Workout Timer** - Style Hevy/Strong avec mini-player live
3. **i18n** - Support FR/EN
4. **Service IA** - Integration Claude API pour recettes
5. **Frigo Mode** - Scanner/lister ingredients -> recette personnalisee
6. **Stripe** - Integration paiement pour les 3 tiers
7. **Notifications** - Push notifications (Expo)
8. **Metrics** - Prometheus + Grafana

---

## Ports des services

| Service | Port |
|---------|------|
| Auth | 3001 |
| API | 3002 |
| PostgreSQL | 5432 |
| Mobile (Expo) | 8081 |

---
