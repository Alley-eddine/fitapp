# Règles métier — FitCoach AI

> **Lecture obligatoire avant tout code touchant aux rôles, abonnements, programmes ou nutrition.** Ces règles font foi ; toute déviation se valide avec Alley.

## Vision produit

Plateforme de **coaching sportif** : un **coach** prépare entraînement + nutrition + compléments ; l'**élève** exécute **sans rien régler** (tout pré-réglé) ; les données remontent au coach. But : **réduire le temps de saisie** et **fluidifier la transmission** coach ↔ élève. Commanditaire réel : un coach privé (« Markus »).

## Les 3 rôles

| Rôle | Description | Vue |
|---|---|---|
| **`coach`** | Crée programmes/nutrition/compléments, suit ses élèves, communique | Tableau de bord coach (desktop) |
| **`student`** (élève) | Lié à un coach, reçoit des plans pré-réglés, exécute, suivi par le coach | App élève (mobile) |
| **`user`** (lambda) | Autonome, self-tracking, **pas de coach, pas de vue coach** | App standard |

- Le rôle est porté par `users.role` et inclus dans le JWT → garde d'accès front + back.
- Lien coach↔élève : table `coach_students` (un coach a N élèves ; un élève a 0 ou 1 coach).
- Un `user` lambda peut **devenir** élève s'il rejoint un coach (invitation).

## Tarification (2 modèles distincts)

### B2C — utilisateur lambda (self-serve, Stripe)
- **Freemium** : tracking de base, IA recettes limitée.
- **Pro** : plus de fonctions IA, stats avancées.
- **Premium** : tout illimité, meal plans, coach IA.
- (Tiers existants `free`/`pro`/`premium` ; prix en €, mensuel récurrent.)

### B2B — coach (abonnement plateforme)
- Le **coach paie** pour gérer ses élèves (modèle par **places/élèves** ou forfait).
- L'**élève n'achète pas** les tiers B2C : son accès vient **via son coach** (siège inclus). L'élève bénéficie d'un accès "premium élève" tant qu'il est rattaché à un coach actif.
- ➡️ Donc : ne **jamais** afficher le paywall B2C à un élève rattaché. Le paywall B2C ne concerne que les `user` lambda.

## Entraînement (planifié vs réalisé)

- **Programme (planifié)** : créé par le coach, **versionné par PHASE** (PHASE 1, 2…). Structure **hebdomadaire** : par jour → bloc (échauffement, corps de séance avec exercices séries×reps, circuit, cardio). Référence réelle : doc coach « PROGRAMME PHASE 1 » (Lundi Dos+Circuit, Mardi Bas du corps, Mercredi Pec…).
- **Assignation** : un programme est assigné à un élève (date de début, phase active).
- **Séance réalisée** : quand l'élève lance la séance du jour (déjà pré-réglée) → crée un enregistrement daté avec calories estimées. **Ne pas confondre** dans l'UI un programme/planifié et une séance faite (bug actuel à corriger).
- **Lambda** : crée ses propres séances (manuel ou via le catalogue d'exercices), pas de programme de coach.
- Les **phases** matérialisent l'évolution dans le temps = preuve du suivi du coach.

## Nutrition

- **Plan nutrition du coach** : repas structurés par **calories** (Repas 1/2/3, collation — ex. 600 / 500 / 300 kcal) avec macros et aliments imposés/autorisés, + **plan de compléments**. Versionné par phase.
- **Élève** : voit les **repas imposés par le coach**. L'**IA (Groq) propose des recettes VARIÉES qui respectent le cadre** (mêmes kcal/macros, aliments compatibles) — le coach pose les règles, l'IA apporte la variété **sans dévier du plan**.
- **Lambda** : IA recettes **libre** (comportement actuel).
- Le besoin calorique est calculé (Mifflin-St Jeor) pour le lambda ; pour l'élève, **le plan du coach prime**.

## Suivi & mensurations

- L'élève renseigne poids + **mensurations** (tour de taille/hanches/poitrine/cuisses/bras/cou, abdominale, FC repos) → IMC auto. Affichage en **graphiques d'évolution**.
- Le coach voit l'évolution de chaque élève (adhérence aux séances, poids, mensurations).

## Notifications (push contextuels)

- Programmées/contextuelles : objectif pas du jour ; rappel "séance du jour ?" (~16h) ; jour de repos ("ne te fatigue pas" / proposition d'activité) ; **dimanche = pesée + mensurations** ; messages motivants **à la voix du coach** (perçus comme venant de Markus).
- Pilotées serveur (cron + service notifications + web-push). Le ton "coach" est un template paramétré par le coach.

## Communauté (PHASE 2 — pas pour juillet)

- Channel type **Strava** entre les élèves d'un même coach : partage des perfs, encouragements, réactions. À documenter comme **axe d'amélioration** (Bloc 4), implémenté après la certification.

## Conformité

- Données personnelles (email, téléphone, mensurations) : minimisation, pas de log en clair, finalité claire. RGPD by design.
