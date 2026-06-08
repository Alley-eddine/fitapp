# RNCP 39583 — Expert en Développement Logiciel · mapping projet

Projet présenté : **FitCoach AI**. Commanditaire réel : coach privé (Markus).

## Calendrier & épreuves

| Bloc | Épreuve | Échéance |
|---|---|---|
| **Bloc 1 — Cadrer** | Oral 30' (20' prez + 10' échange) | **8-19 juin** |
| **Bloc 2 — Concevoir & développer** | Rendu écrit : **code source + dossier 30 p.** | **20-24 juillet** |
| **Bloc 4 — Maintien en condition op.** | Rendu écrit : dossier 20 p. | **17-21 août** |
| **Bloc 3 — Coordonner & piloter** | Oral 45' (30'+15') | **1-29 septembre** |

Tous les blocs portent sur **le même projet** (FitCoach AI).

## Bloc 1 — Cadrer (livrables documentaires, deck oral)
- C1.1.1 Cartographie parties prenantes (coach=commanditaire, élève, lambda, DPO, hébergeur)
- C1.1.2 Analyse de la demande (entretien réel avec le coach)
- C1.2.1 SWOT (+ impact environnemental, sécurité)
- C1.2.2 Faisabilité + audit de l'existant (concurrents : MyFitnessPal, Freeletics, Trainerize, suivi WhatsApp/PDF du coach)
- C1.2.3 Cartographie des risques + indicateurs de contrôle
- C1.3.1 Veille technique & réglementaire (Next, Fastify, Stripe, OWASP, RGPD)
- **C1.3.2 Étude comparative d'architecture (ÉLIMINATOIRE)** → justifier **microservices + Next.js PWA**
- C1.4.1 Cahier des charges fonctionnel + charge (jours-homme)
- C1.4.2 Coûts + budget prévisionnel
- C1.5 Modélisation de l'architecture (schémas UML + ERD)

→ **Aucun code manquant.** Livrable : deck + script (agent `rncp-dossier`).

## Bloc 2 — Concevoir & développer (code + dossier 30 p.)
| Comp. | État FitApp | Action |
|---|---|---|
| C2.1.1 Envs déploiement/test + suivi perf | 🟡 Docker + Prometheus | env de test |
| C2.1.2 **Intégration continue (CI)** | ❌ | **GitHub Actions** |
| C2.2.1 Prototype (web/mobile, sécurité) | ✅ | — |
| C2.2.2 **Tests unitaires** | ❌ | **Vitest** (agent `test-writer`) |
| C2.2.3 Développer (évolutif, sécurisé, accessible) | 🟡 | passe **a11y** |
| C2.2.4 **Déploiement continu (CD)** | ❌ | **CD** (Vercel front + hébergeur services) |
| C2.3.1 Cahier de recettes | ❌ | document |
| C2.3.2 Plan de correction de bugs | ❌ | document (bugs déjà corrigés → issues) |
| C2.4.1 Doc technique (déploiement + utilisateur) | ❌ | documents |

## Bloc 3 — Coordonner & piloter (oral 45')
- C3.1 Planification (Kanban/board GitHub) · C3.2.1 Suivi + indicateurs · C3.2.2 Arbitrages (logigramme — on en a : port 3001, webhook→sync, monolithe vs microservices…)
- C3.3.1/C3.3.2 Pilotage d'équipe / compétences → **projet solo : présenter en mode "comment je piloterais une équipe"**
- C3.4.1 Comptes rendus client (le coach) · C3.4.2 Démo
→ Pas de code. Surtout de la formalisation.

## Bloc 4 — Maintien en condition opérationnelle (dossier 20 p.)
| Comp. | État | Action |
|---|---|---|
| C4.1.1 MàJ dépendances sécurisées | 🟡 | **Dependabot** + doc |
| C4.1.2 **Supervision + alertes** | 🟡 Prometheus/Grafana | **règles d'alerte** |
| C4.2.1 Consigner anomalies | 🟡 | **issues GitHub** (process) |
| C4.2.2 Correctif via CI/CD | ❌ | dépend du CI/CD (Bloc 2) |
| C4.3.1 Axes d'amélioration | ✅ | déjà identifiés (graphes, mensurations, channel Strava) |
| C4.3.2 Journal des versions | 🟡 | **CHANGELOG.md** + tags |
| C4.3.3 Collaboration support | 🟡 | simuler (problème complexe résolu) |

## Synthèse — ajouts nécessaires (peu de code)
**Code** : CI/CD · tests unitaires · règles d'alerte · Dependabot · passe a11y · déploiement.
**Docs** (agent `rncp-dossier`) : tous les livrables des 4 blocs.

> Mettre à jour ce fichier au fur et à mesure (✅/🟡/❌) — c'est le tableau de bord de la certification.
