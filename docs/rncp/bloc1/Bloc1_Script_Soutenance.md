# Script de soutenance — FitCoach AI · Bloc 1 (RNCP 39583)

> Pour chaque slide : **🎯 Ce que tu dis** · **🧠 Pourquoi** · **⚠️ Question piège + réponse**.
> Cible : ~20 min de présentation. Parle lentement, regarde le jury, montre le *pourquoi* avant le *comment*.

---

## Slide 1 — Titre / Intro
**🎯 Ce que tu dis :** « Bonjour, je vous présente le cadrage de FitCoach AI : une plateforme de coaching sportif qui relie un coach et ses élèves. Mon commanditaire est réel — c'est Markus, le coach qui me suit personnellement depuis un mois et demi. Aujourd'hui il envoie ses programmes par email en PDF et fait le suivi sur WhatsApp. Je vais vous présenter le cadrage complet en une dizaine de points. »
**🧠 Pourquoi :** poser le problème métier réel et le commanditaire réel en 30 s. Le jury adore un vrai client.
**⚠️ Question :** « C'est un vrai commanditaire ? » → Oui, c'est mon coach ; le besoin vient de son quotidien. Projet réalisé en autonomie, mais le besoin et les contraintes sont réels.

---

## Slide 2 — Sommaire
**🎯 Ce que tu dis :** « Mon cadrage suit le référentiel : les acteurs, la demande, le SWOT et la concurrence, la faisabilité, les risques, la veille, l'architecture, la charge, le coût, la modélisation, et mes décisions. »
**🧠 Pourquoi :** montrer une présentation structurée qui couvre toutes les compétences.

---

## Slide 3 — C1.1.1 · Parties prenantes
**🎯 Ce que tu dis :** « Mon commanditaire Markus est aussi mon futur client et l'expert métier. Côté application, trois rôles : le **coach** supervise ses élèves sur desktop, l'**élève** a sa séance du jour sur mobile, et un **utilisateur autonome** peut s'en servir en solo. S'ajoutent le DPO pour le RGPD — on manipule des données de santé — et l'hébergeur. »
**🧠 Pourquoi :** distinguer commanditaire ≠ utilisateurs ≠ régulateur prouve que tu as cadré le périmètre. La distinction des supports (coach desktop / élève mobile) justifie le RBAC et l'UX.
**⚠️ Question :** « Pourquoi le coach sur desktop et l'élève sur mobile ? » → Le coach pilote plusieurs élèves (vue d'ensemble, édition de programmes) : grand écran. L'élève consulte sa séance sur le terrain : le mobile suffit.

---

## Slide 4 — C1.1.2 · Analyse de la demande
**🎯 Ce que tu dis :** « Par mon expérience directe d'élève et des échanges avec Markus, quatre besoins ressortent : centraliser la transmission, structurer et tracer le suivi, que l'élève n'ait rien à régler, et faire remonter ses données automatiquement. La problématique : supprimer l'éparpillement email/WhatsApp pour un suivi fiable avec un minimum de saisie. »
**🧠 Pourquoi :** la demande vient d'un vécu réel → crédible. La "traçabilité du suivi" justifie les données structurées et la remontée automatique.
**⚠️ Question :** « Comment as-tu recueilli le besoin ? » → Je suis son élève : observation directe de sa méthode (programmes PDF, suivi WhatsApp) + échanges sur ses irritants. C'est un entretien d'explicitation en continu.

---

## Slide 5 — C1.2.1 · SWOT
**🎯 Ce que tu dis :** « Ma principale force : un besoin validé par mon propre coach. Ma faiblesse assumée : je suis seul sur un périmètre large. La menace la plus critique : la sensibilité des données de santé. Et un impact environnemental maîtrisé via des conteneurs scalés à la demande. »
**🧠 Pourquoi :** assumer la faiblesse "solo" = lucidité. L'impact environnemental est une exigence explicite du référentiel.
**⚠️ Question :** « Données de santé, lesquelles ? » → Poids, mensurations, objectifs : données de catégorie particulière au sens RGPD → minimisation, durée limitée, finalité claire, pas de log en clair.

---

## Slide 6 — C1.2.1 · Concurrence & positionnement
**🎯 Ce que tu dis :** « Le marché existe : Trainerize et TrueCoach font du coach-élève, mais c'est anglophone, cher, et la nutrition reste générique. MyFitnessPal ou Freeletics sont grand public, sans relation coach. Et la réalité de Markus, c'est email + WhatsApp + PDF : zéro structure. Mes différenciateurs : la séance zéro-config, la nutrition imposée par le coach mais variée par l'IA, la remontée automatique des données, et les notifications à la voix du coach. »
**🧠 Pourquoi :** connaître ses concurrents nommément + articuler un positionnement = niveau expert.
**⚠️ Question :** « Qu'est-ce qui empêche Trainerize de te copier ? » → Mon angle est l'usage réel du coach FR indépendant (zéro-config + nutrition cadrée par IA + français/RGPD), pas une énième feature. Et : « Pourquoi pas juste utiliser Trainerize ? » → Lourd, cher, anglophone, nutrition non cadrée par le coach.

---

## Slide 7 — C1.2.2 · Faisabilité & audit
**🎯 Ce que tu dis :** « J'ai audité la méthode actuelle : email/PDF = info dispersée, pas de remontée ; WhatsApp = pas d'historique exploitable. Les outils du marché ne couvrent pas "transmission tracée + zéro-config + nutrition cadrée par IA" pour un coach FR. Conclusion : développement justifié. La stack est maîtrisée, le verdict est faisable. »
**🧠 Pourquoi :** l'audit de l'existant est attendu explicitement.
**⚠️ Question :** « Un PDF par mail, ça marche déjà, non ? » → Oui, mais aucune traçabilité, aucune remontée de données, beaucoup de saisie. La valeur, c'est le suivi structuré et le zéro-config.

---

## Slide 8 — C1.2.3 · Risques
**🎯 Ce que tu dis :** « J'ai priorisé six risques par criticité. Les deux critiques : la fuite de données de santé et l'indisponibilité d'un service. Chaque risque a un plan d'action et des indicateurs de contrôle : uptime, taux d'erreur, couverture de tests, latence — remontés par Prometheus et Grafana. »
**🧠 Pourquoi :** le référentiel demande un référentiel de risques **avec indicateurs** — beaucoup l'oublient.
**⚠️ Question :** « Comment suis-tu ces risques ? » → Monitoring temps réel (Prometheus/Grafana) + seuils d'alerte ; revues régulières.

---

## Slide 9 — C1.3.1 · Veille
**🎯 Ce que tu dis :** « Veille technique : Next.js, Fastify, OWASP, advisories npm via GitHub Watch et Dependabot. Veille réglementaire : la CNIL pour le RGPD et les données de santé, l'ANSSI pour la sécurité. »
**🧠 Pourquoi :** citer le cadre RGPD données de santé montre que tu connais ton contexte légal.
**⚠️ Question :** « Un exemple où ta veille a changé un choix ? » → Une advisory sur une dépendance m'a conforté à valider/mettre à jour via Dependabot et à gérer l'auth moi-même avec des libs éprouvées (jose) plutôt qu'une boîte noire.

---

## Slide 10 — C1.3.2 · Étude comparative (ÉLIMINATOIRE)
**🎯 Ce que tu dis :** « J'ai comparé trois architectures sur six critères dont la sécurité. Le BaaS type Supabase est rapide mais c'est une boîte noire : je ne maîtrise pas la sécurité. Le monolithe couple des domaines très différents. J'ai retenu les **microservices** : auth, paiement, IA et notifications ont des profils de sécurité et de scaling distincts ; les séparer permet de scaler indépendamment, d'isoler les pannes, et de démontrer la maîtrise d'une architecture distribuée — attendu au niveau Expert. La complexité opérationnelle est compensée par l'observabilité. »
**🧠 Pourquoi :** LA slide éliminatoire. Mot-clé : **maîtrise**. Tu assumes la complexité ET tu la justifies par le niveau visé et la nature hétérogène des domaines.
**⚠️ Question :** « Les microservices, c'est de l'over-engineering pour un solo, non ? » → C'est un choix assumé : le titre vise le niveau Expert, et les domaines (paiement vs IA vs auth) ont vraiment des besoins différents. Le couplage est maîtrisé (JWT + clé interne) et l'observabilité compense la complexité. J'ai un chemin d'évolution : je peux regrouper des services si le besoin de simplicité l'emporte. Et : « Pourquoi pas Supabase ? » → Pour un titre de développeur, je dois démontrer la maîtrise de l'auth et de la sécurité, pas configurer un SaaS.

---

## Slide 11 — C1.3.2 · Arbitrages
**🎯 Ce que tu dis :** « Chaque brique est tranchée : Next.js en PWA pour un seul codebase installable (coach desktop, élève mobile) avec web-push, plutôt que deux apps natives ; PostgreSQL en SQL direct pour maîtriser les requêtes ; JWT plus clé interne pour sécuriser les appels entre services ; et des schémas Zod partagés entre le front et le back pour une seule source de validation. »
**🧠 Pourquoi :** montre que chaque choix est raisonné, pas suivi par mode.
**⚠️ Question :** « Pourquoi une PWA et pas du natif ? » → Solo + besoin offline/push + un produit à vendre : la PWA couvre le besoin sans maintenir deux apps ni passer par les stores. (iOS : le push web marche si la PWA est installée.)

---

## Slide 12 — C1.4.1 · Charge de travail
**🎯 Ce que tu dis :** « J'ai estimé la charge en jours-homme par phase : environ 73 jours, soit 14 à 15 semaines. Les fonctions sont hiérarchisées : principales — auth/rôles, programmes, séance zéro-config, suivi ; secondaires — nutrition IA, paiement, notifications ; complémentaires — graphiques avancés, communauté. J'organise le travail en Kanban. »
**🧠 Pourquoi :** l'unité "jour-homme" et la hiérarchisation des fonctions sont explicitement demandées.
**⚠️ Question :** « Comment as-tu estimé ? » → Découpage par service/module, estimation par complexité avec marge. Ajustable au fil des sprints.

---

## Slide 13 — C1.4.2 · Coût & budget
**🎯 Ce que tu dis :** « Deux colonnes : mes coûts directs réels, environ 280 € — hébergement, domaine, APIs en paliers gratuits ou essai — et la valeur marché, environ 37 000 € pour un dev senior à 500 €/jour sur 73 jours. Cet écart illustre le ROI pour un coach qui s'abonnerait plutôt que de faire développer sur mesure. »
**🧠 Pourquoi :** distinguer coût réel et valeur marché montre la maturité budgétaire et fait le lien avec le modèle économique.
**⚠️ Question :** « D'où sort le 500 €/jour ? » → Taux journalier moyen d'un dev senior freelance en France.

---

## Slide 14 — C1.5 · Modélisation de l'architecture
**🎯 Ce que tu dis :** « Voici l'architecture : un front Next.js en PWA qui consomme cinq microservices Fastify via REST et JWT, avec des appels internes sécurisés par clé partagée. Côté données, une base PostgreSQL avec les entités clés : utilisateurs et rôles, lien coach-élève, programmes versionnés par phase, séances, mensurations, plans nutrition. J'utilise UML pour les composants et un modèle entité-relation pour les données. »
**🧠 Pourquoi :** justifier le formalisme (UML + ERD) est demandé. Les "phases" et le lien coach-élève montrent que le modèle colle au métier.
**⚠️ Question :** « Pourquoi versionner les programmes par phase ? » → Le coach fait évoluer le programme dans le temps (PHASE 1, 2…) ; le versionnage trace ce suivi et permet de comparer les périodes.

---

## Slide 15 — C1.6 · Décisions & axes de solutions
**🎯 Ce que tu dis :** « En synthèse : une plateforme coach-élève centralisée et tracée, des séances zéro-config, une nutrition imposée par le coach mais variée par l'IA, un suivi automatique en graphiques, des notifications à la voix du coach, le tout sécurisé et RGPD by design, en microservices avec observabilité. Le modèle économique : un abonnement coach, plus une offre self-service. Pour Markus : il remplace ses PDF par mail et son suivi WhatsApp par une plateforme unique où tout est prêt et où il voit la progression en temps réel. Prochaine étape : le Bloc 2, le développement. »
**🧠 Pourquoi :** C1.6 évalue ta capacité à convaincre le client : discours structuré, pro mais clair, traitement des objections.
**⚠️ Question :** « Convaincs-moi en une phrase. » → « Tes élèves ouvrent l'app, tout est déjà réglé, et toi tu vois leur progression en temps réel — sans une minute de saisie en plus. »

---

## Conseils transverses
- **Rythme :** une slide ≈ 1 à 1,5 min. Ne lis pas — commente.
- **Mots-clés à placer :** *traçabilité, données de santé, RGPD, OWASP, maîtrise, sobriété, observabilité, chemin d'évolution, zéro-config.*
- **Si tu ne sais pas :** « Bonne question, je le traite au Bloc 2/3 » est acceptable.
- **Posture :** assume tes choix. Un choix justifié vaut mieux qu'un choix subi. Sur les microservices, ne t'excuse pas — assume le niveau Expert.
