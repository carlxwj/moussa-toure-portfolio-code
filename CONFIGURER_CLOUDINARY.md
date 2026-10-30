# Portfolio Moussa Toure — galerie, shootings et Cloudinary

**Statut de cette livraison :** le code de la médiathèque et des galeries est prêt. **Aucun Cloudinary n'est encore lié** et aucune photo n'a été migrée automatiquement. La configuration et les tests réels doivent précéder tout déploiement.

## Ce que Moussa peut faire dès maintenant

Depuis `/admin` :

- **Projets, Expériences & rôles, Training, Shootings / Séances photo** : créer des fiches, sélectionner une couverture, ajouter plusieurs photos, les réordonner, les remplacer par d'autres ou les retirer.
- Utiliser les **photos déjà présentes** et les imports historiques Firestore (limite 600 Ko par fichier), sans perdre les liens existants.
- Créer des shootings indépendants, avec une couverture visible sur la page publique et une galerie sur la fiche.
- Ajouter des photos à une expérience sans créer de fiche projet.

**Important :** les photos haute qualité importées directement avec le bouton « Importer plusieurs photos » ne fonctionnent **qu'après la configuration de la passerelle Cloudinary**. Avant cela, l'application l'indique explicitement. Les URL HTTPS directes restent possibles.

## Pourquoi il faut deux comptes pour les imports sécurisés

Firebase Spark n'héberge pas les Cloud Functions avec service de signature sans activer la facturation. Un Cloudinary `API Secret` ne doit **jamais** être dans un site React public. Nous utilisons donc :

1. **Cloudinary** : héberge les images, les transforme et les distribue.
2. **Cloudflare Workers** : une petite passerelle de signature/d'effacement. Elle vérifie le jeton Firebase Auth (`admin: true`, e-mail vérifié, signature Google valide) avant toute opération.
3. **Firestore** : conserve uniquement les URL et métadonnées (quelques centaines d'octets) et les fiches éditables. Firebase Hosting reste sur Spark.

La disponibilité des offres gratuites et leurs limites dépendent de leurs fournisseurs. Vérifier les tableaux de bord et les conditions avant activation. Un compte Cloudflare peut être nécessaire en plus de Cloudinary.

## Étape A : sauvegarder la version publiée

1. Sauvegarder les règles Firestore **actuellement publiées**, sans les remplacer à l'aveugle.
2. Conserver une copie ZIP du projet en ligne, **avec ton `.env.local` privé**.
3. Sauvegarder/exporter les données Firestore avant le déploiement. Le nouveau code ne lance aucun script destructeur ni migration automatique.

## Étape B : créer les comptes (quand tu seras prêt)

1. Créer le compte Cloudinary au nom du propriétaire légitime du portfolio.
2. Récupérer dans le tableau de bord **Cloud name**, **API Key** et **API Secret**. Ne transmettre **jamais** l'API Secret dans ce chat, dans un ZIP ni dans le code frontend.
3. Créer un compte Cloudflare et activer Workers.
4. Installer l'outil de déploiement si nécessaire (`npx wrangler`).

Dans un terminal situé dans le dossier `cloudinary-worker` :

```powershell
npx wrangler login
npx wrangler secret put CLOUDINARY_CLOUD_NAME
npx wrangler secret put CLOUDINARY_API_KEY
npx wrangler secret put CLOUDINARY_API_SECRET
npx wrangler deploy
```

`FIREBASE_PROJECT_ID` est déjà défini dans `cloudinary-worker/wrangler.toml` à `moussatoure-actor`.

**Attention :** Cloudflare crée/stocke ces secrets côté serveur, pas dans le navigateur. Tu les saisis quand l'outil te le demande : ne les écris pas dans le fichier `.env.local` de Vite.

La passerelle accepte par défaut `https://moussatoure-actor.web.app`, `https://moussatoure-actor.firebaseapp.com` et `http://localhost:5173`. Si un domaine personnalisé est utilisé, ajouter son origine HTTPS exacte dans `ALLOWED_ORIGINS` du fichier `wrangler.toml`, puis redéployer Workers.

## Étape C : relier React à la passerelle

1. Conserver le `.env.local` Firebase **du ZIP de référence**. Ne jamais le remplacer par `.env.example`.
2. Ajouter une seule ligne dans `.env.local` :

```dotenv
VITE_CLOUDINARY_GATEWAY_URL=https://<nom-worker>.<compte>.workers.dev
```

Le lien exact est fourni par Cloudflare après `wrangler deploy`. C'est une URL de service public, **pas** un secret. Les clés privées doivent rester dans Cloudflare.

3. Relancer VS Code / Vite pour que les variables `VITE_` soient prises en compte.

## Étape D : publier prudemment

Depuis la racine du projet :

```powershell
npm install
npm test
npm run build
```

**N'effectue pas le déploiement si l'une de ces commandes échoue.** Comparer les règles locales à celles de production, et vérifier qu'elles conservent les droits des anciennes collections. Le changement prévu concerne `shootings` et `mediaIndex`, pas les droits des autres documents.

Puis :

```powershell
npx firebase deploy --only firestore:rules --project moussatoure-actor
npx firebase deploy --only hosting --project moussatoure-actor
```

Publier les nouvelles règles avant Hosting. Ne pas lancer `seed:write`, `training:publish`, ni aucun script de réinitialisation de données pour cette mise à jour.

## Étape E : tests réels avec Moussa

- Connexion à `/admin` avec le compte de Moussa, e-mail vérifié, rôle admin.
- Créer un nouveau projet brouillon et sélectionner une photographie historique.
- Importer trois nouvelles images JPG/PNG via Cloudinary (moins de 25 Mo chacune) et vérifier leurs miniatures.
- Choisir la 3e comme couverture, déplacer les autres puis sauvegarder et vérifier sur PC et mobile.
- Faire de même pour une expérience indépendante, un shooting et une formation.
- Vérifier que les portraits/projets anciens, le CV, les témoignages et le formulaire de contact restent inchangés.
- Sur un navigateur déconnecté, vérifier que les tentatives d'obtenir une signature échouent. Le serveur ne doit accepter que le compte admin autorisé.
- Vérifier l'absence de doublons de photos et les temps de chargement en réseau mobile.

### Limites et précautions

- Taille max choisie par l'application : **25 Mo par image source** ; les limites réelles de Cloudinary peuvent différer.
- Les images Cloudinary sont publiques par URL. Ne pas y envoyer de documents confidentiels ni de photos sans autorisation de publication.
- La suppression d'une photo dans une galerie **retire seulement le lien**. Sa suppression définitive passe par **Photos et CV → Supprimer**, uniquement lorsqu'aucune fiche ne la référence. Les photos historiques `/media/...` sont conservées dans le ZIP.
- **CV PDF** : reste sur Firestore avec la limite de 600 Ko, ou peut être remplacé par un lien HTTPS externe ; l'upload Cloudinary de PDF n'est pas activé.
- Cloudflare Worker ne stocke pas les fichiers images, et les certificats/signatures Google servent à vérifier le rôle admin.
- Sauvegarder régulièrement les images originales et les exports de données : Cloudinary n'est pas une sauvegarde illimitée.
- Les tests automatisés ne remplacent pas un audit de sécurité réel sur les services déployés.

## Instructions de publication avec ce ZIP

Le dossier `dist` livré depuis le projet initial correspond au **dernier build ancien**, pas à cette nouvelle version. **Tu dois relancer `npm run build` sur Windows avant de publier Hosting**, ce qui actualisera `dist`. Ne pas déployer un `dist` non recompilé.
