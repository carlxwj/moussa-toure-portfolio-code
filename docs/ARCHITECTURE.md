# Architecture du portfolio Moussa Toure

## Vue d'ensemble

```text
Public React/Vite (src/pages, components, styles)
       ├─ src/content/... → données initiales hors ligne
       ├─ Firebase Auth → authentification de l'admin
       ├─ Firestore → collections publiées, mises à jour temps réel
       │    └─ firestore.rules → lecture publique des contenus publiés, écriture autorisée
       ├─ Cloudflare Worker → authentification Firebase, signature, contrôle de médias
       │    ├─ Cloudinary (si activé)
       │    └─ R2 (si activé)
       └─ Formspree / Analytics opt-in (si configurés)
Firebase Hosting ← dist/ (généré localement, non versionné)
```

## Sources du site

| Zone | Rôle |
| --- | --- |
| `src/pages/Home.tsx`, autres pages | Présentation et navigation publique |
| `src/pages/Admin.tsx` | Gestion des contenus et des médias |
| `src/lib/firebase.ts` | SDK Firebase, Auth, Firestore et App Check |
| `src/lib/content.ts` | Données initiales, abonnements aux collections publiées et garde-fous URL |
| `src/content/initial-data.json` | Contenus de démonstration/référence, ne pas confondre avec la base en production |
| `src/content/training-data.json` | Formation/expériences initiales liées au parcours artistique |
| `cloudinary-worker/index.js` | Vérification des tokens Firebase et opérations média protégées |
| `firestore.rules` | Contrôles de visibilité et autorisations d'édition |
| `scripts/*.mjs` | Imports manuels, privilèges admin, export SEO et maintenance |

## Flux de consultation

1. Chargement de l'application depuis Firebase Hosting.
2. Rendu des données initiales puis, si Firebase est correctement configuré, souscriptions Firestore.
3. Seules les entrées au statut `published` sont recherchées dans les collections publiques concernées.
4. Les médias utilisent des URLs ou fichiers publics, avec règles de validation côté UI et, pour les modifications, contrôles côté passerelle.

## Flux d'édition

1. Un compte administrateur s'authentifie via Firebase Auth.
2. Les contrôles Firestore/Worker vérifient les droits effectifs. **Le simple affichage de `/admin` n'est pas une autorisation.**
3. Les modifications sont écrites dans les collections autorisées ; les visiteurs voient les changements Firestore sans redéployer les fichiers statiques.
4. Les pages SEO prérendues peuvent nécessiter un nouvel export/rebuild pour refléter les nouvelles données.

## Attention aux environnements

- `import.meta.env.VITE_*` est visible dans le bundle navigateur. Toutes ces variables doivent être **non secrètes**.
- Les clés privées Cloudinary et autres credentials Worker restent dans les secrets du compte Cloudflare.
- Les credentials de compte de service pour `scripts/grant-admin.mjs` sont stockés **hors du dépôt**, et l'opération peut changer les droits réels d'un compte.
- Les contenus publiés en tant que ressources publiques sont accessibles à quiconque reçoit leurs URLs.
