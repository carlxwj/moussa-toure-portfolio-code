# Portfolio Moussa Toure — Administration sans code (version CMS Spark)

## Ce que Moussa peut modifier depuis `/admin`

- **Accueil et profil** : nom affiché, portrait principal, portrait About, photo détourée optionnelle, présentation, parcours, langues, compétences et e-mail professionnel.
- **Textes FR et EN** : les libellés, titres, boutons, messages et principaux textes génériques (`Tous les textes`), en plus de tous les contenus particuliers des rubriques.
- **Projets / filmographie** : ajouter, modifier, masquer, publier, réordonner, supprimer ; choisir photo principale, galerie, auteur vérifié, année, rôle, description, vidéo associée, lien officiel.
- **Galerie** : ajouter, classer, réordonner, remplacer et retirer des photographies.
- **Parcours / articles** : textes et galeries indépendants.
- **YouTube** : coller une URL `youtube.com` ou `youtu.be`, modifier titre/description, définir la vidéo principale, associer à un projet, retirer / masquer / réordonner.
- **Profils professionnels** : ajout / modification / suppression de liens HTTPS Spotlight, Mandy, Instagram, Backstage ou d'autres profils.
- **CV** : importer un petit PDF dans la médiathèque (600 Ko maximum), sélectionner la version publique et la remplacer plus tard ; ou utiliser une URL HTTPS d'un hébergeur externe.
- **Sections** : déplacer les grandes sections de la page, les masquer, créer / modifier / supprimer des sections éditoriales libres avec titre, description, photo et lien.
- **Pages légales et paramètres** : coordonnées publiques, contact Formspree, catégories de demandes, langue par défaut, descriptions SEO, texte des politiques en FR/EN.

Les demandes reçues via le formulaire se lisent dans **Formspree**, pas dans `/admin`.

L'éditeur est un outil de gestion de **contenu et de sections**, pas un éditeur de CSS ou un constructeur libre permettant de changer toutes les compositions de la maquette. Pour modifier la charte graphique, il reste nécessaire d'adapter le thème en code.

## À connaître : limites du forfait Spark

Cette version n'emploie ni Cloud Functions ni Cloud Storage. Pour éviter un faux bouton d'upload, un mécanisme d'import léger dans **Cloud Firestore** a été ajouté :

1. Dans `Photos et CV`, sélectionner un fichier JPG, PNG, WebP, AVIF ou PDF.
2. Les images sont **converties dans le navigateur en WebP**, sans agrandir le fichier source, avec une taille finale maximale de **600 Ko**. Les PDF doivent déjà être inférieurs à 600 Ko.
3. Le fichier encodé est écrit dans une collection Firestore `mediaAssets`, et sa petite fiche administrative dans `mediaIndex`.
4. L'image ou le PDF est choisi à partir du sélecteur de média et utilisé dans le portfolio via une référence `asset:media-...`.
5. Une suppression est bloquée dans l'interface si l'image est encore référencée par un contenu publié ou brouillon chargé dans le tableau de bord.

**C'est une concession pour rester gratuitement sur Spark, et non un stockage média idéal**. Les documents Firestore ont une limite de 1 Mio et chaque image lue consomme des lectures de base de données ; la qualité peut baisser sur les images complexes. Les visiteurs verront seulement les versions compressées. Conserver les fichiers originaux en sauvegarde. Pour les grandes photos haute résolution, utiliser un hébergeur d'images HTTPS/CDN externe avec droits de publication et renseigner son URL, ou adopter ultérieurement un stockage spécialisé. Sur un site à fort trafic, déplacer les médias hors de Firestore.

**Attention** : les images d'origine incluses dans `/public/media` continuent à se charger via Firebase Hosting. Elles n'ont pas été migrées dans Firestore. Le bouton d'import initial écrit les **références** à ces fichiers, pas les fichiers eux-mêmes ; les fichiers sont publiés avec Hosting lors du premier déploiement.

## Installation et première connexion

1. Dans Firebase Console : Authentication > Méthode de connexion > activer E-mail/Mot de passe ; créer le compte de Moussa puis vérifier son e-mail. Il n'existe pas de création de compte public.
2. Dans Firebase Console : créer Firestore en **mode production**. Ne jamais mettre des règles `allow read, write: if true`.
3. Activer App Check pour l'application web avec reCAPTCHA Enterprise. **Ne pas activer `Enforce` avant les tests réels et avant d'avoir vérifié les jetons du domaine déployé.**
4. Configurer `.env.local` pour le projet Firebase `moussatoure-actor` et Formspree (l'ID du formulaire initial est déjà intégré aux données de démarrage).
5. Installer Node.js LTS, puis dans le dossier de projet : `npm install`, `npm run dev`.
6. **Attribuer une seule fois les droits `admin: true`** via `scripts/grant-admin.mjs`. Le compte doit avoir un e-mail vérifié. Le script utilise les identifiants administrateur Google locaux (ADC) et ne révèle jamais de clé privée au navigateur.
7. Déployer **d'abord les règles** et ensuite Hosting, après les tests : `npx firebase-tools deploy --only firestore:rules` puis `npm run build` et `npx firebase-tools deploy --only hosting`.
8. Sur le site déployé, ouvrir `/admin`, se connecter. Cliquer sur **Initialiser le contenu du site** si Firestore est vide. Ce bouton refuse l'import si des projets sont déjà présents, pour ne pas écraser les modifications.
9. Aller dans chaque rubrique, enregistrer quelques changements et vérifier leur effet sur le site public.

### Script d'autorisation admin sous Windows

Le projet inclut `npm run admin:grant -- <UID> CONFIRM:moussatoure-actor`.

Ce script utilise `FIREBASE_PROJECT_ID=moussatoure-actor` et des identifiants d'application Google (par exemple `gcloud auth application-default login`, si le SDK Google Cloud est installé). Dans **CMD** :

```bat
set FIREBASE_PROJECT_ID=moussatoure-actor
npm run admin:grant -- UID_DU_COMPTE CONFIRM:moussatoure-actor
```

Ne pas transmettre un mot de passe ni une clé JSON de compte de service. Déconnecter / reconnecter l'administrateur après l'attribution du claim. En cas de défaut de permissions, vérifier la configuration des credentials et du projet, ne pas contourner les règles.

## Mode local et aperçu des modifications

Le ZIP conserve `.env.development.local` avec `VITE_CONTENT_PREVIEW=local` pour voir les photos initiales **sans connexion Firestore**, pendant le développement. Dans ce mode, le portfolio public en local ne reflète pas les modifications CMS de Firestore. Pour une prévisualisation connectée, régler une fois `VITE_CONTENT_PREVIEW=firebase` dans ce fichier, relancer Vite et préparer un **jeton App Check de débogage autorisé** ou tester directement sur le domaine Hosting. Ne jamais enregistrer un jeton de débogage public dans un dépôt ou un ZIP.

## Contrôles préalables au lancement

- `npm test` : tests statiques de contenu et de sécurité du schéma.
- `npm run typecheck` et `npm run build` : requièrent d'abord l'installation npm complète.
- `npm run test:rules` : nécessite l'émulateur Firestore, à exécuter avant déploiement des règles.
- Tester avec un navigateur : visiteur non connecté, utilisateur sans rôle admin, admin autorisé, fichiers image/PDF, lecture YouTube, mobile, formulaire Formspree, téléchargement du CV.
- Le SEO pré-rendu du build **n'est pas régénéré automatiquement** après une modification Firestore : pour des métadonnées de partage et SEO actualisées, il faut recalculer/déployer le pré-rendu ou ajouter un rendu serveur, impossible à garantir avec ce simple projet SPA Spark.
- Vérifier avec Moussa les autorisations de diffusion des photos, le contenu du CV et les textes légaux avant publication.

**État actuel de la livraison** : code CMS créé, tests statiques automatisés exécutés. Pas de compilation complète, de connexion à un compte Firebase réel ni de déploiement effectué dans cet environnement (accès npm externe indisponible). Ne pas déclarer l'administration « validée en production » avant tous ces tests.
