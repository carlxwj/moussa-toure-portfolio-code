# Moussa Toure — Activer Cloudflare R2 sans casser Cloudinary

Ce correctif est **préparé, pas déployé**. Il ne modifie pas les données en ligne et n'importe pas les anciennes images. **Cloudinary doit rester actif** : les photos et le CV existants continuent d'utiliser leurs URL Cloudinary.

## Ce qui change

- De nouveaux fichiers pourront être envoyés vers **Cloudflare R2**, depuis **Mes photos**, les couvertures/galeries de projets, shootings, expériences et formations, et **Mon CV**.
- Les photos JPG/PNG/WebP/AVIF et les PDF sont pris en charge, avec un **plafond de sécurité de 500 Mo par fichier** dans cette version du code. Ce n'est **pas** du stockage illimité.
- Les fichiers de plus de 6 Mo sont envoyés en morceaux, ce qui évite une requête géante via le Worker ; si un transfert échoue, les parties déjà envoyées peuvent être abandonnées automatiquement. L'interface affiche une progression.
- Les métadonnées légères seulement (nom, taille, type, URL et identifiant) sont stockées dans Firestore. Aucun PDF/photo original n'y est stocké.
- Les anciennes URL Cloudinary et les anciens fichiers Firestore restent utilisables.
- R2 est **désactivé par défaut**. Tant que `VITE_R2_ENABLED` n'est pas `true`, le site continue de se servir de Cloudinary pour les nouveaux fichiers.

## 0. Sauvegarder

Fais **une copie de ton dossier complet** sur le PC. Conserve notamment `.env.local`, `firebase.json`, `.firebaserc` et les réglages Cloudinary/Cloudflare, mais ne les envoie pas publiquement. Sauvegarde aussi dans Firebase Console → Firestore → Règles la version **actuellement publiée** et compare-la à la nouvelle `firestore.rules`. Le correctif vise le ZIP `moussa-toure-portfolio(2).zip` : si tu as modifié les règles depuis, **ne remplace pas tes changements sans comparaison**.

## 1. Appliquer les fichiers

Décompresse le ZIP correctif **à la racine du projet** `moussa-toure-portfolio`. Fusionne les dossiers `src/`, `cloudinary-worker/` et `tests/`, et remplace **uniquement les fichiers du correctif**. N'efface surtout pas `.env.local`, `node_modules`, `dist`, ni tes photos locales.

## 2. Créer le bucket Cloudflare R2

1. Connecte-toi à https://dash.cloudflare.com/ → **R2 Object Storage**.
2. Si nécessaire, active la facturation R2 (Cloudflare peut demander un moyen de paiement même pour utiliser l'allocation gratuite).
3. Crée un bucket appelé **`moussa-toure-media`**, classe **Standard**. Ne rends **pas** le bucket publiquement accessible ; les médias seront servis par le Worker.
4. Alternative via terminal, si tu préfères, depuis `cloudinary-worker` :

   ```powershell
   npx wrangler login
   npx wrangler r2 bucket create moussa-toure-media
   ```

   Ne relance pas la création si le bucket existe déjà.

**Important :** l'offre R2 n'est pas illimitée : elle comporte une allocation gratuite de stockage et d'opérations, puis une facturation. Un gros album peut finir par coûter de l'argent. Surveille l'usage dans Cloudflare.

## 3. Déployer le Worker existant (sans le remplacer par un Worker vierge)

Dans VS Code, à la racine du portfolio :

```powershell
cd cloudinary-worker
npx wrangler deploy
cd ..
```

Le fichier `cloudinary-worker/wrangler.toml` conserve **le nom de ton Worker existant** `moussa-toure-media-gateway`, tes origines autorisées, et ajoute simplement le binding R2 `R2_MEDIA`. Il ne nécessite **aucune nouvelle API Key ni API Secret R2** dans le site, car il utilise un binding Cloudflare. Ne supprime pas tes secrets Cloudinary du Worker : ils servent encore aux fichiers existants.

Si Wrangler indique que le bucket n'existe pas, **arrête-toi** : crée d'abord le bucket. Si Wrangler propose de créer un **nouveau Worker**, vérifie le compte Cloudflare sélectionné et le `name` dans `wrangler.toml`.

## 4. Sauvegarder, contrôler puis déployer les règles Firestore

Le bloc `mediaIndex` contient désormais une branche `provider == 'r2'` limitée aux URL du Worker `moussa-toure-media-gateway.moussatour2007.workers.dev`. Les anciennes règles Cloudinary et Firestore ont été conservées à partir du ZIP de référence. Vérifie les différences avec les règles **publiées** avant d'appliquer.

```powershell
npx firebase deploy --only firestore:rules --project moussatoure-actor --dry-run
```

Si les règles compilent et que la comparaison n'a révélé aucun autre changement à préserver :

```powershell
npx firebase deploy --only firestore:rules --project moussatoure-actor
```

N'exécute pas cette dernière commande si tu n'as pas sauvegardé/comparé les règles publiées.

## 5. Activer R2 dans `.env.local`

Garde **toutes** les variables Firebase, App Check, Cloudinary et contact déjà présentes. Ajoute seulement :

```dotenv
VITE_R2_ENABLED=true
```

L'URL `VITE_CLOUDINARY_GATEWAY_URL` existante doit toujours pointer sur **ton Worker actuel** `https://moussa-toure-media-gateway.moussatour2007.workers.dev` ; elle est réutilisée pour les nouveaux endpoints R2. Si elle est absente ou incorrecte, ne déploie pas avant de la corriger. Aucun secret R2 n'est nécessaire dans `.env.local`.

## 6. Tester localement avant publication

```powershell
npm test
npm run typecheck
npm run build
npm run dev
```

Ouvre `/admin` en local avec un compte Firebase ayant le rôle admin et un e-mail vérifié. Essaye :

- **Mes photos :** une image JPG d'environ 13,5 Mo (R2 doit l'accepter, sauf quota ou connexion insuffisante) ; vérifier la miniature et la réutilisation depuis Galerie.
- **Un shooting :** ajouter l'image comme couverture, enregistrer, puis vérifier sa lecture sur mobile.
- **Mon CV :** importer un petit PDF de test, vérifier le lien public, puis remettre le CV de Moussa si besoin. Ne remplace pas son vrai CV en production juste pour tester.
- **Cloudinary historique :** ouvrir une photo et l'ancien CV Cloudinary pour confirmer leur compatibilité.
- **Suppression :** une photo de test R2 *non utilisée* peut être supprimée depuis Mes photos. Une photo utilisée dans une fiche ne peut pas être supprimée tant qu'elle est référencée.

Sur des mobiles anciens ou avec des photos extrêmement lourdes, le téléchargement ou l'affichage d'originaux peut être lent : la version actuelle **ne génère pas de miniatures R2 optimisées**. Une optimisation d'images sera une amélioration utile ultérieurement.

Si un import R2 termine l'envoi mais échoue sur Firestore, **ne renvoie pas le fichier**. Note la clé `moussa_toure/portfolio/...` affichée dans l'erreur ; récupère le PDF dans **Mon CV**, ou une image dans **Mes photos → Récupérer une photo déjà envoyée sur R2**.

## 7. Publier Firebase Hosting uniquement après validation

```powershell
npx firebase deploy --only hosting --project moussatoure-actor
```

Tester en navigation privée et sur téléphone après publication. **Le `dist` fourni par l'ancien ZIP ne contient pas ces nouveautés** : `npm run build` doit réussir pour les publier.

## 8. Retour arrière en cas de problème

Dans `.env.local`, change simplement `VITE_R2_ENABLED=false`, relance `npm run build` et publie Hosting. **Ne supprime pas le Worker modifié ou le bucket R2** si des photos/PDF R2 ont déjà été utilisés sur le site : leurs URL publiques dépendent du Worker.

Les anciennes URL Cloudinary doivent rester actives. Ne supprime ni les anciennes ressources Cloudinary ni leurs index Firestore avant une migration de contenus et une vérification manuelle des références.

## Fichiers du correctif

- `cloudinary-worker/index.js` — ajout d'API R2 protégées et de la diffusion publique des médias
- `cloudinary-worker/wrangler.toml` — binding R2, Worker Cloudinary conservé
- `src/lib/r2.ts` — import multipart, récupération et suppression R2
- `src/pages/Admin.tsx` — priorité à R2 quand activé, Cloudinary sinon
- `src/types/models.ts` — métadonnées R2
- `firestore.rules` — écriture admin seule pour les métadonnées R2
- `tests/r2-storage.test.mjs` — tests d'accès admin, upload et lecture R2 simulés
- `tests/cloudinary-media.test.mjs` — adaptation d'un test de compatibilité

**Cette archive n'inclut pas** `.env.local`, `.env.development.local`, `.wrangler`, `node_modules`, les clés privées, `dist`, ni les caches Firebase.
