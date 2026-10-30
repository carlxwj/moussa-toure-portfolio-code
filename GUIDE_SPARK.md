> **Document d’historique :** pour la nouvelle administration complète, voir `GUIDE_ADMIN_SANS_CODE.md`. Les procédures de gestion de médias antérieures sont remplacées par la médiathèque Spark actuelle.

# Moussa Toure — Guide Spark (sans carte bancaire)

## Architecture
- Firebase Hosting: site Vite / React, fichiers statiques et images publiques (`public/media/`).
- Cloud Firestore: données publiques et brouillons, écriture admin via custom claim.
- Firebase Authentication: connexion admin unique (aucune inscription publique).
- Firebase App Check: reCAPTCHA Enterprise sur Web, vérification des jetons avant enforcement.
- Formspree (offre gratuite avec limites): formulaire de contact sans Functions. Les messages ne sont pas stockés dans Firestore et ne sont pas visibles depuis /admin.
- Aucun Firebase Storage ni Cloud Functions: ils nécessitent Blaze pour ce projet.

## Procédure
1. Ouvrir le ZIP, installer Node.js LTS et utiliser un terminal dans ce dossier.
2. `npm install`, puis `npm test`, `npm run typecheck`, `npm run build`.
3. Firebase Console > Authentication > Sign-in method: email/password activé; seul l'administrateur est créé dans la console. Il doit vérifier son email avant attribution des droits.
4. Firestore en mode production. **Sauvegarder et comparer les règles existantes avant tout déploiement**. `firebase deploy --only firestore:rules --project moussatoure-actor` (après revue).
5. Donner le claim `admin:true` sur le compte administrateur avec le script `scripts/grant-admin.mjs` et des identifiants administrateur locaux; ne jamais publier la clé JSON du compte de service. `npm run admin:grant -- <UID> CONFIRM:moussatoure-actor` avec `FIREBASE_PROJECT_ID=moussatoure-actor` et Application Default Credentials configurées. En cas d'adresse e-mail non vérifiée, le script refuse.

   Sous **Windows PowerShell**, après installation des outils Google Cloud (`gcloud`) et connexion avec les droits du propriétaire de ce projet :

   ```powershell
   gcloud auth application-default login
   $env:FIREBASE_PROJECT_ID = "moussatoure-actor"
   node scripts/grant-admin.mjs "COLLER_UID_DU_COMPTE" "CONFIRM:moussatoure-actor"
   ```

   Les identifiants Firebase CLI (`firebase login`) ne suffisent **pas** à eux seuls au SDK Admin : il faut aussi des *Application Default Credentials* valides. Le script exige une adresse e-mail déjà vérifiée. Le tableau `/admin` propose un bouton pour envoyer l'e-mail de vérification et actualiser l'état. Ne partagez aucune clé de compte de service.

6. `npm run seed:preview`, puis sous PowerShell :
   ```powershell
   $env:FIREBASE_PROJECT_ID = "moussatoure-actor"
   $env:CONFIRM_SEED_PROJECT = "moussatoure-actor"
   npm run seed:write
   ```
   Nécessite les mêmes identifiants Admin SDK ; ne crée que les documents manquants.
7. **Formspree déjà relié au portfolio :** identifiant public `xwlvyjab` dans `.env.local` et URL `https://formspree.io/f/xwlvyjab`. Vérifier dans Formspree que l’adresse e-mail de destination est bien confirmée, que les notifications sont actives et que les protections anti-spam sont configurées. Envoyer un message réel depuis le formulaire local, puis vérifier sa présence dans Formspree **et** la réception e-mail. Le message de succès du site confirme uniquement l’acceptation de la demande par Formspree. Voir `TEST_FORMULAIRE.md`.
8. Mettre les photos réelles approuvées dans `public/media/portraits`, `public/media/gallery`, etc. Avec un manifeste validé : `node scripts/import-media.mjs /chemin/approved-media.json --write`. Des URL du type `/media/portraits/NOM.webp` seront publiques après déploiement Hosting. Optimiser le poids et ne jamais y mettre des médias privés.
9. `/admin` permet de coller les URLs des photos et de modifier profils, projets, films, vidéos, liens et sections depuis Firestore. Pour ajouter des fichiers, il faut mettre à jour le dossier local puis **redéployer Hosting**. Les modifications Firestore ne rafraîchissent pas le SEO HTML pré-rendu : exporter et reconstruire si nécessaire.
10. Dans `.env.local`, fixer `VITE_PUBLIC_SITE_URL=https://moussatoure-actor.web.app` pour la version de production. Mettre à jour mentions légales et RGPD (Formspree, reCAPTCHA, Firebase, YouTube).
11. Tester App Check d'abord sans enforcement sur domaine de production. Ne jamais exposer le debug token; `VITE_FIREBASE_APPCHECK_DEBUG=false` dans les paramètres de production.
12. `firebase login`, `firebase use moussatoure-actor`, `npm run build`, puis `firebase deploy --only hosting --project moussatoure-actor`. Tester sur téléphone, formulaire, admin et vidéos.

## Limites à respecter
- Le site est **préparé**, pas déployé. Les photos fournies sont intégrées ; il reste à confirmer les droits, les légendes et les choix éditoriaux avant publication.
- Formspree traite les messages hors Firebase; vérifier son accord de traitement des données, conservation et politique RGPD/UK.
- Le plan Spark dispose de quotas, mais ne facture pas automatiquement les dépassements; ses services peuvent cesser de répondre aux quotas.
- App Check limite les abus mais ne remplace pas les Firestore Rules; ne pas activer « Enforce » avant d'avoir des jetons valides.
- Les rôles admin doivent être attribués avec un SDK privilégié (jamais depuis la page /admin).
- Le projet n'a pas été validé contre un compte Firebase réel, ni testé dans un navigateur de production.


## Mise à jour — galeries de projets (17/10/2026)

Une refonte des photographies et des fiches projets a été intégrée : **4 projets de cinéma documentés**, **17 visuels** rangés par projet, une sélection générale de **14 photographies** et une présentation sans étirement. Pour les instructions et la provenance des images, consultez `GALERIES_PROJETS.md` et `public/media/projects/PHOTO_SOURCES.json`.

Le nombre de 32 photographies mentionné plus haut décrit l’ancienne galerie et non les 14 images désormais sélectionnées pour l’affichage public. L’archive d’images précédente reste disponible localement pour révision, mais n’est pas automatiquement publiée dans la nouvelle galerie.

**Tests sur cette version :** 20 tests Node réussis, 17 fichiers TypeScript/TSX contrôlés pour leur syntaxe, 17 images vérifiées. Installation des dépendances, vérification complète des types et build Vite non exécutés dans cet environnement (expiration de l’installation npm).
