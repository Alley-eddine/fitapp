# ADR-0001 — Accès à la base de données : direct par service vs service BDD centralisé

| Champ      | Valeur                                  |
|------------|-----------------------------------------|
| **Statut** | Accepté                                 |
| **Date**   | 2026-06-21                              |
| **Auteur** | Alley Eddine (Alleycom)                 |
| **Projet** | FitCoach AI — RNCP 39583                |

---

## Contexte

Le cahier des charges du cours « Création d'une App complète » mentionne un **service dédié aux opérations BDD** comme composant attendu de l'architecture. FitCoach AI est structuré en **5 microservices Fastify 5 (TypeScript ESM)** : `auth` (3001), `api` (3002), `ai` (3003), `notifications` (3004) et `payment` (3005). Ces services partagent une unique instance **PostgreSQL 16** (Docker) et s'y connectent chacun via le client `pg` (Node.js), sans ORM.

### État réel du code

Chaque service possède son propre module d'accès aux données :

- `services/auth/src/infrastructure/config/database.ts` — pool `pg` avec `max: 20`, helpers `query()` et `getClient()`.
- `services/api/src/config/database.ts` — idem, pool dédié au service métier central.
- `services/ai/src/config/database.ts` — pool dédié au service IA (rate-limiting Redis + lecture plans nutrition).
- `services/notifications/src/db/pool.ts` — pool dédié à la journalisation des envois (`notification_logs`).
- `services/payment/src/db/pool.ts` — pool dédié aux opérations d'abonnement Stripe.

Le schéma de base est défini dans `scripts/init-db.sql` ; les évolutions sont appliquées par des migrations idempotentes dans `scripts/migrations/*.sql` (8 migrations à date, ex. `004_roles_coach_students.sql`). Les requêtes sont rédigées en SQL direct, sans couche ORM interposée.

La question posée est donc : faut-il refactoriser l'architecture pour introduire un sixième service centralisé gérant l'intégralité des opérations BDD, ou maintenir et assumer le pattern actuel ?

---

## Options envisagées

### Option 1 — Service BDD centralisé (pattern « data service »)

Un sixième microservice (ex. `data`, port 3006) expose une API REST ou RPC interne. Tous les autres services délèguent leurs opérations SQL à ce service via `x-internal-key`. Le service `data` est le seul titulaire du pool `pg`.

**Avantages**

- Un seul point de configuration de la connexion PostgreSQL.
- Possibilité de centraliser le cache de requêtes préparées.
- Répond littéralement à l'énoncé du cahier des charges.

**Inconvénients**

- **Anti-pattern microservices établi** : introduit un couplage fort entre tous les services et un composant unique. Toute panne ou saturation du service `data` rend l'ensemble de la plateforme non opérationnel (Single Point of Failure).
- **Goulot d'étranglement garanti** : toutes les requêtes de cinq services transitent par un seul processus Node.js, avec la latence réseau supplémentaire de chaque saut HTTP inter-service.
- **Perte de l'autonomie de déploiement** : un service `auth` ne peut plus être déployé ou redémarré indépendamment si le service `data` est en maintenance.
- **Complexité accrue sans valeur ajoutée** : le service `data` deviendrait une façade générique qui réexpose PostgreSQL, sans logique métier propre — un proxy inutile.
- **Sérialisation des transactions** : les transactions multi-tables (ex. création d'utilisateur + envoi de vérification) nécessiteraient des appels réseau entre services, rendant la gestion des erreurs et des rollbacks extrêmement complexe.

---

### Option 2 — Accès direct par service, chaque service propriétaire de ses données (RETENU)

Chaque service gère son propre pool `pg` et ses propres requêtes SQL. Le découpage respecte le principe de **data ownership par bounded context** : `auth` possède `users`, `api` possède les entités métier (profils, programmes, séances, nutrition), `notifications` possède `notification_logs`, `payment` possède les données d'abonnement Stripe.

**Avantages**

- **Alignement avec les principes microservices** : chaque service est autonome, déployable et scalable indépendamment. Le scaling du service `ai` (intensif en requêtes LLM) n'impacte pas le pool du service `auth`.
- **Pas de SPOF au niveau de la couche données** : la panne d'un service n'affecte pas la capacité des autres à accéder à PostgreSQL.
- **Latence minimale** : les requêtes SQL sont émises directement depuis le processus qui en a besoin, sans saut réseau supplémentaire.
- **Transactions locales simples** : `getClient()` + `BEGIN`/`COMMIT`/`ROLLBACK` restent des opérations locales au service concerné.
- **Maîtrise SQL complète** : les requêtes sont lisibles, optimisables (index, EXPLAIN ANALYZE), et la compétence base de données est directement démontrable — ce que le RNCP exige (C1.5).
- **Sobriété architecturale** : pas de service supplémentaire à conteneuriser, monitorer et maintenir.

**Inconvénients**

- Duplication de la configuration du pool (`connectionString`, `max`, `idleTimeoutMillis`) dans chaque service — mitigée par la cohérence des valeurs et la faible complexité du fichier.
- Duplication potentielle de helpers SQL génériques (ex. pagination, gestion d'erreurs `pg`) entre services — mitigée par le package `@fitapp/shared` si le besoin émerge.
- Les migrations doivent être coordonnées avant tout déploiement multi-service touchant le schéma partagé : convention documentée (`scripts/migrations/`).
- Absence d'isolation stricte des schémas par service (tous accèdent au même schéma PostgreSQL `public`) — acceptable à cette échelle, et évolutif vers des schémas séparés si le projet grandit.

---

### Option 3 — ORM ou couche d'accès partagée (package interne)

Un package `@fitapp/db` (dans `packages/`) expose des fonctions typées générées par un ORM (Prisma, Drizzle) ou des helpers SQL manuels. Chaque service l'importe comme dépendance pnpm.

**Avantages**

- Centralisation des types de retour et de la configuration du pool en un seul endroit.
- Migrations gérées par l'ORM (Prisma Migrate, Drizzle Kit) avec historique versionné.
- Réduction de la duplication du code d'accès aux données.

**Inconvénients**

- **Couplage de build** : toute modification du schéma partagé force un rebuild de tous les services qui importent le package, même ceux non concernés.
- **Surcoût d'un ORM** : Prisma génère des types à partir du schéma, ajoute un binaire natif par plateforme, et introduit une abstraction qui masque les requêtes réelles — contraire à l'objectif de maîtrise SQL du RNCP.
- **Poids de dépendance injustifié** : le service `notifications` n'a besoin que d'insérer dans `notification_logs` ; lui imposer la surface entière d'un ORM est disproportionné.
- **Rigidité** : les optimisations SQL spécifiques (requêtes analytiques pour les graphiques de progression, agrégations calories) sont plus difficiles à exprimer de manière idiomatique via un ORM généraliste.
- L'approche reste pertinente comme **évolution future** si le projet dépasse 10 services et que la duplication devient un problème de maintenance réel.

---

## Décision

**L'option 2 est retenue** : accès direct à PostgreSQL par service, avec pool `pg` indépendant, SQL direct sans ORM, et ownership des données par bounded context.

Cette décision est cohérente avec :

1. Les **principes microservices** tels que définis par Martin Fowler et Sam Newman (*Building Microservices*) : chaque service doit être déployable indépendamment et posséder ses données.
2. La **justification de la stack** documentée dans `.claude/STACK.md` : « SQL direct (pg) sans ORM — maîtrise des requêtes, transparence, perf ».
3. Les **contraintes RNCP** (C1.5) : la compétence en conception et requêtage de bases de données relationnelles doit être directement démontrée dans le code.
4. La **taille réelle du projet** : 5 services, 1 base de données, équipe d'un développeur — l'over-engineering d'un service BDD dédié n'est pas justifiable par les besoins actuels.

---

## Conséquences

### Conséquences positives

- Déploiement et scaling indépendants de chaque service sans coordination avec une couche données centrale.
- Pannes isolées : la saturation du service `payment` (pics Stripe) ne dégrade pas le pool de connexions de `auth`.
- Code SQL directement auditable, optimisable et testable — les requêtes complexes (ex. calcul IMC, agrégation calories par semaine) sont lisibles sans abstraction ORM.
- Observabilité fine par service : Prometheus expose les métriques de chaque service, y compris les erreurs de pool `pg`, sans agrégation trompeuse.
- Pas de dépendance inter-services pour les opérations de base — `notifications` peut toujours journaliser même si `api` est en maintenance.

### Conséquences négatives et mesures de mitigation

| Risque | Mitigation |
|---|---|
| Duplication de la config `pg` (host, max, timeouts) | Valeurs identiques dans tous les services ; centralisation possible dans `@fitapp/shared` si dérive constatée |
| Cohérence transverse (ex. suppression d'un utilisateur dans plusieurs tables) | Transactions SQL locales dans `auth` pour les opérations multi-tables ; events asynchrones pour la propagation inter-services si nécessaire |
| Coordination des migrations sur schéma partagé | Convention : les migrations `scripts/migrations/*.sql` sont idempotentes et appliquées avant tout déploiement ; documenté dans `DEPLOYMENT.md` |
| Absence d'isolation de schéma par service | Acceptable à l'échelle actuelle ; évolution vers des schémas PostgreSQL séparés par service si le projet scale au-delà de 10 services |
| Multiplication des connexions PostgreSQL (5 pools × max 20) | PostgreSQL 16 supporte jusqu'à 100 connexions par défaut, configurable ; PgBouncer peut être ajouté en proxy de pool si le nombre de services croît |

---

## Arguments pour l'oral

Si le jury demande « où est le service BDD prévu dans le cahier des charges ? », voici les points à développer :

**1. Le service BDD centralisé est un anti-pattern microservices documenté.**
Créer un service dont le seul rôle est de proxyer des requêtes SQL vers PostgreSQL introduit un couplage fort (tous les services en dépendent), un goulot d'étranglement (un seul processus pour toutes les opérations BDD) et un Single Point of Failure. Sam Newman dans *Building Microservices* (2e éd., O'Reilly) identifie explicitement le « shared database » et le « database service » centralisé parmi les patterns à éviter dans une architecture distribuée.

**2. Le vrai pattern microservices, c'est le data ownership par bounded context.**
Chaque service est responsable de ses propres données et de son propre schéma logique. `auth` possède `users`, `api` possède les entités métier, `notifications` possède `notification_logs`. Cette séparation est la condition sine qua non de l'autonomie de déploiement — l'un des objectifs fondamentaux des microservices.

**3. Le service `api` joue de fait le rôle de service de données métier.**
Il centralise l'accès aux entités fonctionnelles clés (profils, programmes d'entraînement, séances, nutrition, recettes, mensurations). Il est consulté par le front pour toutes les opérations CRUD métier. Il remplit donc fonctionnellement le rôle d'un « service de données » au sens métier du terme, tout en évitant les écueils du couplage technique.

**4. SQL direct démontre la compétence BDD attendue par le RNCP (C1.5).**
L'objectif pédagogique de la compétence C1.5 est de démontrer la maîtrise de la conception et du requêtage d'une base de données relationnelle. SQL direct avec `pg` — requêtes paramétrées, transactions explicites, migrations versionnées — répond à cet objectif plus directement qu'une abstraction ORM qui masque le SQL généré. Chaque requête du projet est lisible, justifiable et optimisable.

**5. L'architecture retenue est scalable et évolutive sans refactorisation majeure.**
Si le volume de connexions devient un problème (5 pools × 20 connexions = 100 connexions max), l'ajout de **PgBouncer** en proxy de pool résout le problème sans toucher au code applicatif. Si un service a besoin d'une isolation totale, migrer vers un schéma PostgreSQL dédié est une évolution incrémentale. Ces deux chemins sont fermés si toutes les requêtes passent par un service BDD centralisé.

**6. La décision a été documentée, assumée et arbitrée consciemment.**
Ce n'est pas un oubli ou un manque de connaissance du cahier des charges : c'est un choix d'architecture argumenté, tracé dans un ADR (Architecture Decision Record), aligné sur les pratiques de l'industrie et sur les contraintes réelles du projet (équipe solo, 5 services, un seul PostgreSQL). La capacité à dévier d'un énoncé en le justifiant est précisément ce qu'on attend d'un expert en développement logiciel (niveau 7).

---

## Références

- Sam Newman, *Building Microservices*, 2e éd., O'Reilly Media, 2021 — ch. 4 « Decomposing the Database ».
- Martin Fowler, *Microservices* (martinfowler.com, 2014) — principe « Decentralized Data Management ».
- `.claude/STACK.md` — justification « SQL direct (pg) sans ORM : maîtrise des requêtes, transparence, perf ».
- `.claude/ARCHITECTURE.md` — structure des services et convention `db/pool.ts`.
- `scripts/migrations/` — migrations idempotentes versionnées.
- RNCP 39583, bloc C1, compétence C1.5 — conception et requêtage de bases de données.
