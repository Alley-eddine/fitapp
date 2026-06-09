# FitCoach AI — Soutenance Bloc 1

## Cadrer un projet de développement d'applications logicielles

RNCP 39583 — Expert en Développement Logiciel
Plateforme de coaching sportif : transmission coach ↔ élève, temps réel et tracée
Commanditaire réel : Markus, coach sportif privé

---

# Sommaire

1. Cartographie des parties prenantes — C1.1.1
2. Analyse de la demande — C1.1.2
3. Opportunités & menaces (SWOT) — C1.2.1
4. Concurrence & positionnement — C1.2.1
5. Faisabilité technique & audit de l'existant — C1.2.2
6. Cartographie des risques — C1.2.3
7. Veille technique & réglementaire — C1.3.1
8. Choix de l'architecture technique — C1.3.2
9. Arbitrages techniques — C1.3.2
10. Évaluation de la charge de travail — C1.4.1
11. Estimation du coût & budget — C1.4.2
12. Modélisation de l'architecture — C1.5
13. Décisions & axes de solutions — C1.6

---

# Les acteurs du projet
### C1.1.1 — Cartographie des parties prenantes

| Acteur | Rôle | Implication | Canal | Livrables attendus |
|---|---|---|---|---|
| Commanditaire (Markus, coach) | Décideur · expert métier · futur client | Élevée | Entretiens, validations | Cadrage, méthode de coaching |
| Développeur (moi, candidat RNCP) | Conception & développement complet | Permanente | — | Solution complète |
| Coach (rôle applicatif) | Crée programmes/nutrition, suit ses élèves | Quotidienne | App desktop | Programmes, plans, suivi |
| Élève (rôle applicatif) | Exécute les séances pré-réglées, renseigne son suivi | Quotidienne | PWA mobile | Données de progression |
| Utilisateur autonome (lambda) | Self-tracking sans coach | Variable | PWA | — |
| DPO / conformité | RGPD (données santé : poids, mensurations) | Ponctuelle | Audits | Validation RGPD |
| Hébergeur | Disponibilité de la plateforme | Continue | Infra | SLA, supervision |

**Supports & profils :** Coach → desktop (vue d'ensemble de ses élèves) · Élève → mobile (sa séance du jour) · Lambda → PWA standard.

---

# Analyse de la demande
### C1.1.2 — Entretien d'explicitation avec le commanditaire

**Contexte réel :** Markus me coache depuis ~1,5 mois. Aujourd'hui il envoie **programmes, repas et compléments par email** (PDF) et assure le **suivi par WhatsApp**.

**Besoins identifiés**
- Centraliser la transmission (fini les PDF éparpillés dans les mails)
- Structurer et tracer le suivi (WhatsApp = pas d'historique exploitable, pas de preuve d'adhérence)
- Que l'élève **n'ait rien à régler** : séance + repas du jour déjà prêts
- Faire remonter **automatiquement** les données de l'élève au coach

**Objectifs clés**
- Réduire le temps de saisie / d'organisation (coach ET élève)
- Donner au coach une **vue de suivi** par élève (séances faites, poids, mensurations)
- Garder la **variété** côté nutrition sans sortir du cadre du coach

**Pistes de solutions**
- Programmes versionnés par **phase** assignés à l'élève · séances **pré-réglées** · repas **imposés par le coach** + variété générée par IA · **notifications push** contextuelles « voix du coach » · suivi (poids/mensurations) en graphiques.

**Problématique :** « Comment centraliser et tracer la transmission coach ↔ élève, en supprimant l'éparpillement email/WhatsApp, pour un suivi fiable et un minimum de saisie ? »

---

# Opportunités & menaces
### C1.2.1 — Analyse SWOT

**FORCES**
- Besoin réel validé par un commanditaire qui est mon propre coach
- Stack moderne maîtrisée, full-stack + DevOps (microservices, observabilité)
- Différenciation : nutrition imposée + IA dans le cadre, séances zéro-config

**FAIBLESSES**
- Ressource unique (dev solo — bus factor)
- Périmètre fonctionnel large (entraînement + nutrition + suivi + paiement)
- Adoption à prouver côté élèves

**OPPORTUNITÉS**
- Beaucoup de coachs indépendants bricolent avec email/WhatsApp/PDF
- Modèle B2B2C : vendre l'abonnement au coach (revenu récurrent)
- Extension multi-coachs / communauté d'élèves (type Strava)

**MENACES**
- Données de santé sensibles → RGPD, cybersécurité
- Concurrents établis (Trainerize, TrueCoach)
- Délais (contexte solo + certification)

**Impact environnemental :** services conteneurisés, scaling à la demande, hébergeur éco-responsable visé → empreinte maîtrisée.

---

# Concurrence & positionnement
### C1.2.1 — Un marché servi… mais pas pour ce coach

**La concurrence**
- **Trainerize / TrueCoach** — plateformes coach-élève complètes, mais anglophones, orientées marché US, abonnement élevé, et la nutrition reste générique
- **MyFitnessPal / Freeletics / Nike Training Club** — grand public, self-service, **pas de relation coach-élève**
- **La réalité de Markus** — email (PDF) + WhatsApp : zéro structure, zéro traçabilité, beaucoup de saisie

**Mes différenciateurs**
- **Séance zéro-config** : l'élève ouvre l'app, tout est déjà réglé
- **Nutrition imposée par le coach + variété par IA** (mêmes kcal/macros, recettes variées) — inédit
- **Remontée automatique** des données au coach (adhérence, poids, mensurations)
- **Notifications « voix du coach »** contextuelles (pesée du dimanche, séance oubliée…)
- **Phases** qui matérialisent le suivi dans le temps

**Positionnement :** non pas un tracker fitness de plus, mais **l'outil de transmission et de suivi du coach indépendant**, pensé pour la France et un minimum de friction.

---

# Faisabilité du projet
### C1.2.2 — Audit de l'existant & verdict

**Audit de l'existant (la méthode actuelle de Markus)**
- Email + PDF : information dispersée, pas de mise à jour live, aucune remontée de données
- WhatsApp : suivi non structuré, pas d'historique exploitable ni de preuve d'adhérence
- Outils du marché : soit self-service sans coach, soit plateformes US lourdes/chères avec nutrition générique
- → **Conclusion :** aucun outil ne couvre « transmission tracée + zéro-config + nutrition cadrée par IA » pour un coach FR indépendant → développement justifié

**Stack technique cible**
- Front : **Next.js 15 en PWA** (installable, web-push, offline léger)
- Back : **5 microservices Fastify (TypeScript)** — auth, api, ai, notifications, payment
- Données : **PostgreSQL** (SQL direct, pg) · Auth : **JWT** (jose)
- IA : **Groq** · Paiement : **Stripe** · Email/SMS/Push : **Resend / Twilio / web-push**
- Conteneurisation **Docker**, observabilité **Prometheus + Grafana**

**Contraintes :** solo (délai), données de santé (RGPD renforcé), multi-rôles, fluidité (peu de saisie).

**✅ Verdict :** faisable — stack maîtrisée, MVP cadré, socle déjà amorcé.

---

# Cartographie des risques
### C1.2.3 — Matrice probabilité × impact & plan d'action

| Risque | Prob. | Impact | Criticité | Plan d'action |
|---|---|---|---|---|
| Fuite de données de santé | Moyenne | Élevé | **Critique** | JWT, clé interne service-à-service, validation Zod, TLS, minimisation |
| Indisponibilité d'un service | Moyenne | Élevé | **Critique** | Découplage microservices, health checks, monitoring + alertes |
| Retard de livraison (solo) | Élevée | Moyen | Majeur | MVP priorisé, board Kanban, jalons RNCP |
| Perte de données | Faible | Élevé | Majeur | Backups PostgreSQL, migrations idempotentes |
| Non-conformité RGPD (santé) | Faible | Élevé | Majeur | RGPD by design, minimisation, durée limitée, info utilisateur |
| Adoption faible des élèves | Moyenne | Moyen | Modéré | UX zéro-config, notifications « voix du coach » |

**Indicateurs de contrôle :** uptime par service, taux d'erreur applicatif, couverture de tests, latence — remontés par Prometheus/Grafana.

---

# Veille technique & réglementaire
### C1.3.1 — Sources, outils & fréquences

**Veille technique**
- Next.js / Fastify : releases & changelogs (GitHub Watch)
- Node / npm : security advisories · **Dependabot**
- OWASP : Top 10, bonnes pratiques sécurité
- Stripe / Groq : changelogs API

**Veille réglementaire**
- CNIL : RGPD, **données de santé** (catégorie particulière)
- ANSSI : sécurité des systèmes

**Outils :** Feedly · GitHub Watch · Dependabot · Google Alerts.
**Fréquences :** GitHub/deps → hebdo · CNIL/ANSSI → mensuel.

**Bénéfices :** anticiper les failles, rester conforme, choisir des technos durables et soutenues.

---

# Le choix de l'architecture technique
### C1.3.2 — Étude comparative (compétence éliminatoire)

| Critère | BaaS (Supabase) | Monolithe modulaire | **Microservices ✅** |
|---|---|---|---|
| Maîtrise & sécurité (OWASP) | Moyen (boîte noire) | Élevé | **Élevé (isolation par domaine)** |
| Séparation des responsabilités | Faible | Moyen | **Excellente (auth/paiement/IA/notif)** |
| Scalabilité indépendante | Limitée | Faible | **Excellente (ex : service IA)** |
| Résilience (panne isolée) | Moyenne | Faible | **Bonne** |
| Démonstration niveau Expert | Faible | Moyen | **Forte (distribué maîtrisé)** |
| Complexité opérationnelle | Faible | Faible | Élevée → compensée par observabilité |

**Choix retenu — Microservices (Fastify) :** les domaines (auth, paiement, IA, notifications) ont des **profils de sécurité et de scaling distincts** ; les séparer permet déploiement/scaling indépendants, isolation des pannes, et démontre la **maîtrise d'une architecture distribuée** attendue au niveau Expert. Le **couplage est maîtrisé** (JWT partagé + clé interne service-à-service) et la **complexité opérationnelle est compensée** par Prometheus/Grafana. BaaS écarté (manque de maîtrise sécurité) ; monolithe écarté (ne démontre pas le distribué et couple des domaines hétérogènes).

---

# Arbitrages techniques
### C1.3.2 — Retenu vs écarté

| Option | Décision | Justification |
|---|---|---|
| Microservices Fastify | ✅ RETENU | Domaines hétérogènes, scaling/sécurité indépendants, niveau Expert |
| Next.js 15 en **PWA** | ✅ RETENU | 1 codebase installable (coach desktop + élève mobile), web-push, pas de store |
| PostgreSQL + SQL direct (pg) | ✅ RETENU | Maîtrise des requêtes, perf, transparence (démontre la compétence BDD) |
| JWT (jose) + clé interne | ✅ RETENU | Auth maîtrisée + isolation des appels internes |
| Zod partagé (front/back) | ✅ RETENU | Une seule source de validation |
| BaaS (Supabase) | ❌ ÉCARTÉ | Sécurité en boîte noire, faible démonstration de compétence |
| App native (2 apps) | ❌ ÉCARTÉ | PWA couvre le besoin (offline/push) sans double maintenance |
| ORM lourd | ❌ ÉCARTÉ | SQL direct suffisant et plus formateur ; maîtrise des requêtes |

**Logique constante :** retenir ce que les besoins réels et le niveau visé justifient.

---

# Évaluation de la charge de travail
### C1.4.1 — Estimation en jours-homme (1 développeur)

| Phase | Charge (j/h) | Tâches principales |
|---|---|---|
| Cadrage & architecture | 5 | Specs, modélisation, setup monorepo |
| Auth & rôles (JWT, coach/élève/lambda) | 8 | Auth, OAuth, vérif email, reset SMS, RBAC |
| Service API métier | 12 | Profils, programmes, séances, poids, pas, mensurations |
| Service IA (nutrition cadrée) | 6 | Groq, recettes contraintes par le plan coach |
| Service Paiement (Stripe) | 6 | Abonnements B2C + coach, webhooks, factures |
| Service Notifications (mail/SMS/push) | 6 | Resend, Twilio, web-push, planificateur |
| Front Next.js PWA (3 rôles) | 14 | Coach desktop, élève mobile, lambda, a11y |
| Tests & CI/CD | 6 | Tests unitaires, GitHub Actions, déploiement |
| Monitoring & déploiement | 5 | Prometheus/Grafana, alertes, mise en prod |
| Documentation & recette | 5 | Manuels, cahier de recettes |

**Total ≈ 73 jours-homme ≈ 14-15 semaines.**
**Hiérarchie fonctionnelle :** principales (auth/rôles, programmes, séance zéro-config, suivi) · secondaires (nutrition IA, paiement, notifs) · complémentaires (graphiques avancés, communauté).

---

# Estimation du coût
### C1.4.2 — Coûts réels vs valeur marché

**Coûts directs (projet solo)**
- Hébergement (services + front, ~5 mois) : ~150 €
- Domaine + SSL : ~20 €
- APIs (Stripe test, Twilio, Resend, Groq — paliers gratuits/essai) : ~80 €
- Outils & monitoring (tiers gratuits + GitHub) : ~30 €
- **Total coûts directs ≈ 280 €**

**Valeur marché (référence)**
- Développeur senior : ~500 €/j × 73 j ≈ **36 500 €**
- Infrastructure & services annuels : ~600 €
- **Valeur du projet ≈ 37 000 €**

**Note :** l'écart coût réel / valeur marché illustre le ROI pour un coach qui s'abonnerait plutôt que de faire développer sur mesure.

---

# Modélisation de l'architecture
### C1.5 — Schéma (UML composants + ERD)

**Front Next.js 15 (PWA)** → consomme 5 microservices via REST + JWT :
- `auth` (rôles, JWT) · `api` (métier) · `ai` (Groq) · `notifications` (mail/SMS/push) · `payment` (Stripe)
- Appels internes sécurisés par **clé interne** (ex. payment → notifications)

**Données — PostgreSQL** (extrait ERD) : `users` (role) · `coach_students` · `profiles` · `measurements` · `training_programs` (phases) · `program_assignments` · `workouts` / `workout_exercises` · `nutrition_plans` · `recipes` · `notification_logs`.

**Formalisme :** UML (diagramme de composants) + ERD (modèle de données).
**Propriétés :** sécurisé (JWT + clé interne + Zod) · maintenable (services isolés) · observable (Prometheus/Grafana) · évolutif (scaling par service).
**Impact environnemental :** conteneurs scalés à la demande, hébergeur éco-responsable.

---

# Décisions & axes de solutions
### C1.6 — Synthèse

**Axes retenus**
- Plateforme SaaS coach ↔ élève, multi-rôles, centralisée et tracée
- Séances **zéro-config** + nutrition **imposée par le coach, variée par IA**
- Suivi automatique (poids, mensurations, adhérence) en graphiques
- Notifications push contextuelles « voix du coach »
- Sécurité & RGPD by design (données de santé)
- Microservices + Next.js PWA, observabilité intégrée
- Modèle économique B2B2C (abonnement coach) + offre self-service (lambda)

**Argumentaire commanditaire :** « Tu remplaces tes PDF par mail et ton suivi WhatsApp par une plateforme unique : tes élèves ouvrent l'app, tout est prêt, et tu vois leur progression en temps réel — sans saisie supplémentaire. »

**➡️ Prochaine étape : Bloc 2 — Conception et développement.**
