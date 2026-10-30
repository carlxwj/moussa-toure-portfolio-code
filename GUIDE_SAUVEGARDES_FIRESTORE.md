# Moussa Toure — Résoudre les sauvegardes bloquées dans /admin

Cette version corrige un défaut certain : en développement, `.env.development.local` utilisait `VITE_CONTENT_PREVIEW=local`. Cela forçait l'affichage des données embarquées dans le ZIP, sans écouter Firestore sur le site public. Il utilise maintenant `VITE_CONTENT_PREVIEW=firestore`.

**Attention : ce changement ne répare pas à lui seul une requête Firestore bloquée**. L'administration avertit désormais lorsqu'aucune confirmation du serveur n'arrive dans les 12 secondes ; il ne faut pas confondre mise à jour en cache et écriture confirmée.

## 1. Tester sur l'ordinateur

- Décompresser cette version dans un NOUVEAU dossier et ouvrir le terminal de ce dossier.
- Vérifier que `.env.local` contient les paramètres Firebase Web publics, sans remplacer ou publier de fichiers JSON privés. Le fichier `.env.development.local` est livré avec le mode Firestore.
- `npm install`, puis `npm run dev` ; ouvrir `http://localhost:5173/admin`.
- Avec le compte administrateur, attendre le message « Connexion à Firestore confirmée par le serveur ». S'il est absent, **ne pas tenter des suppressions ou changements en série**.

## 2. Si la connexion ne se confirme pas

- Ouvrir F12 > Console et relever le **texte des erreurs seulement** (ne pas envoyer de jeton App Check ni de clé JSON privée).
- Ouvrir la console Firebase > `moussatoure-actor` > App Check > Applications. En localhost, le code utilise le mode App Check debug. Le premier lancement peut afficher dans F12 une ligne `AppCheck debug token: ...`. **Ne pas partager le jeton** ; l'enregistrer soi-même dans App Check > Gérer les jetons de débogage. Ne pas ajouter `localhost` aux domaines autorisés reCAPTCHA Enterprise.
- Ouvrir Firebase > Firestore > Règles. Comparer les règles actives à `firestore.rules` du ZIP. Si les règles actives sont les règles initiales de production qui interdisent toutes les écritures, la sauvegarde sera refusée. Faire une copie de sauvegarde des règles actuelles, tester les règles du projet, puis seulement les publier. Pour les publier via CLI : `firebase deploy --only firestore:rules --project moussatoure-actor`. **Cela remplace les règles actives de Firestore.** N'utiliser cette commande que si le projet cible et la comparaison des règles sont confirmés.
- Vérifier le compte Auth et son jeton `admin: true` ainsi que `email_verified: true`. Le fait de voir `/admin` indique que ces deux exigences étaient remplies dans le navigateur, mais les règles actives peuvent encore être différentes.

## 3. Tester UNE sauvegarde après connexion confirmée

Dans `/admin > Projets`, modifier temporairement un titre non critique, enregistrer et attendre la confirmation. Sur Firebase Console > Firestore > Données > `projects`, vérifier directement le document modifié. Rafraîchir ensuite la page du site public. Revenir au titre initial si c'était un essai.

- **Enregistrement… pendant plus de 12 secondes** : écriture en attente ou connexion serveur perdue ; ne pas relancer la même opération plusieurs fois. Une opération mise en file peut être envoyée plus tard.
- **permission-denied** : comparer les règles déployées et les claims du compte.
- **App Check 403 / attestation invalide** : enregistrer le jeton de débogage du navigateur dans Firebase App Check ; garder l'application en mode test jusqu'à vérification.
- **Écriture confirmée mais contenu inchangé** : vérifier le mode preview (désormais Firestore), la visibilité `published` et le document dans la collection.

## 4. Déploiement

Pas besoin de déployer Hosting pour tester des écritures Firestore depuis localhost. Avant de déployer le site, vérifier que les règles fonctionnent dans l'émulateur et sur les vrais comptes admin/public. Ne pas activer App Check Enforcement avant d'avoir des requêtes valides.
