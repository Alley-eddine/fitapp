# Changelog

Toutes les évolutions notables de FitCoach AI sont consignées ici. Le format suit
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le versionnage
[SemVer](https://semver.org/lang/fr/). Chaque entrée renvoie vers l'issue et/ou la
pull request GitHub correspondante.

## [1.1.0] — 2026-08-09

Premier cycle de maintien en condition opérationnelle après la mise en production.

### Added

- Enregistrement des recettes générées par l'IA et page « Mes recettes » — liste,
  suppression confirmée, pagination (#103, PR #105).
- Toute séance du programme est démarrable quel que soit le jour de la semaine,
  pour rattraper une séance manquée (#101, PR #102).
- Règles d'alerte Prometheus : service injoignable, dérive mémoire (seuil hérité
  de l'incident OOM du VPS), saturation de l'event loop (#14, PR #114).
- Veille de dépendances automatisée : Dependabot sur le lockfile pnpm (mises à
  jour mineures/patch groupées) et sur les actions de la CI (#13, PR #113).
- README du projet : pitch, stack, architecture, démarrage local, déploiement
  (PR #109).

### Fixed

- Un compte coach n'est plus envoyé vers l'assistant d'accueil et l'offre B2C :
  redirection directe vers son espace (#98, PR #110).
- Le lien d'invitation d'un coach survit désormais à la connexion ou à
  l'inscription : plus besoin de rouvrir le lien une seconde fois (#99, PR #111).
- Chaîne de déploiement : ports exposés pour le routage Traefik/Coolify (PR #96),
  schéma PostgreSQL embarqué dans l'image (PR #94), images construites en CI et
  tirées par le VPS après l'incident mémoire (PR #90), résolution du paquet
  partagé depuis les sources pour le build Vercel (PR #92).

### Security

- Le CORS de production n'accepte plus que l'origine du front sur l'ensemble des
  services ; les services privés refusent tout navigateur (#87, PR #112).
- Next.js 15.1.6 → 15.5.21 : correction de la CVE-2025-29927 (contournement du
  middleware), montée de version imposée avant déploiement (PR #92).

### Removed

- Notes de projet obsolètes, dump de crash et outillage documentaire retirés du
  dépôt (PR #107, #108).

## [1.0.0] — 2026-07-22

Première mise en production complète.

- Trois parcours opérationnels : autonome (suivi + Frigo Mode IA), élève
  (exécution sans configuration), coach (programmes par phases, plans nutrition,
  invitations, suivi d'adhérence).
- Cinq microservices Fastify (auth, api, ai, notifications, payment),
  PostgreSQL 16, Redis ; front Next.js 15 en PWA.
- Déploiement : front sur Vercel, services conteneurisés construits par GitHub
  Actions, publiés sur GHCR et orchestrés par Coolify sur VPS (Traefik +
  Let's Encrypt).
- Paiements Stripe (Pro/Premium), notifications email/SMS journalisées,
  supervision Prometheus/Grafana.
