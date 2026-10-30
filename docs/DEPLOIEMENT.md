# Déploiement — avertissement pour le dépôt public

**Cette édition ne doit pas être déployée sur le site Moussa Toure existant.** Ses photos, CV, contacts, témoignages et contenus réels ont été délibérément remplacés par des exemples ou retirés.

Pour créer un environnement de démonstration indépendant : créer un nouveau projet Firebase, configurer les variables publiques et secrets serveur sur cet environnement uniquement, vérifier les règles Firestore et les permissions administrateur, installer les dépendances, exécuter tests/typecheck/build, puis déployer vers le nouveau projet de test. Ne pas associer ce dépôt public au projet Firebase de production.
