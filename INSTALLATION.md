# Portfolio Moussa Toure — « Mes photos » et « Mon CV » séparés

Base : la dernière archive de référence `moussa-toure-portfolio(1).zip` fournie par Carlos.

## Nouveaux emplacements dans `/admin`

Présentation → Mes réseaux sociaux → Mes photos → Mon CV.

- **Mes photos** : importe uniquement JPG, PNG, WebP et AVIF, présente uniquement les images enregistrées et permet leur gestion habituelle. Les PDF déjà enregistrés restent en base ; ils ne sont simplement plus affichés dans cette rubrique.
- **Mon CV** : importe un PDF jusqu'à 10 Mo sur Cloudinary et met à jour automatiquement le CV du site public. Permet aussi de choisir un ancien PDF, d'enregistrer un lien HTTPS et de récupérer un CV Cloudinary après un échec d'enregistrement précédent. La gestion/suppression des PDF historiques a été déplacée ici avec les contrôles de références existants.
- **Réglages avancés** : conserve les paramètres légaux et SEO, sans importer le CV.
- Les raccourcis de l'accueil d'administration sont également mis à jour.

## Installation Windows / VS Code

1. **Sauvegarder** le dossier actuel `moussa-toure-portfolio`.
2. Extraire le ZIP *correctif* dans la **racine** de ce dossier ; Windows doit conserver les chemins `src/pages/…` et `tests/…`. Remplacer les fichiers signalés.
3. Ne pas effacer/modifier `.env.local`, `.env.development.local`, `firebase.json`, `firestore.rules`, `cloudinary-worker`, `dist` ni les photos.
4. Ouvrir un terminal dans la racine et exécuter :

   ```powershell
   npm test
   npm run typecheck
   npm run build
   npm run dev
   ```

5. Tester sur `http://localhost:5173/admin` (ou l'adresse affichée par Vite), sur PC et sur mobile. Vérifier les nouveaux intitulés, l'ajout d'image dans Mes photos et l'affichage du CV **sans le remplacer inutilement**.
6. **Seulement si le build et les vérifications réussissent**, publier :

   ```powershell
   npx firebase deploy --only hosting --project moussatoure-actor
   ```

Le correctif ne nécessite **ni** déploiement des règles Firestore **ni** du Worker Cloudflare. Il ne modifie pas les documents Firestore existants.

## Contrôles effectués

- `npm test` : 81 tests réussis / 81.
- `npm run typecheck` : OK.
- Compilation Vite complète non certifiée ici : les dépendances natives du ZIP sont fournies pour Windows, pas pour Linux. Relancer `npm run build` sur le PC Windows avant le déploiement.
- Tests en production (Firebase/Cloudinary) à réaliser depuis la session administrateur de Moussa.
