# Installer et lancer le portfolio

## Prérequis

- Node.js 22+ et npm ; `npm ci` utilise le lockfile commité.
- Projet Firebase (Auth + Firestore + Hosting). Les émulateurs sont recommandés avant l'accès production.
- App Check et domaine de test configurés si vous testez les protections du vrai backend.
- Pour les médias distants : Cloudinary / Cloudflare Worker / R2 si utilisés dans votre environnement.

## Installation du frontend

```bash
cd moussa-toure-portfolio
npm ci
cp .env.example .env.local
npm test
npm run typecheck
npm run build
npm run dev
```

Sous PowerShell : `Copy-Item .env.example .env.local` au lieu de `cp`, si nécessaire.

Renseigner dans `.env.local` **uniquement les identifiants publics** du SDK Firebase, le site key reCAPTCHA, l'identifiant public Formspree et l'URL publique du Worker. Les secrets backend n'appartiennent **jamais** aux variables `VITE_*`.

**Ne pas mettre un jeton App Check réel dans l'archive.** Le mode de débogage est uniquement pour un navigateur de développement autorisé et doit rester désactivé par défaut.

## Projets et déploiements Firebase

La source `.firebaserc` de la machine du développeur a été retirée. Utilisez `firebase login`, puis `firebase use --add` (ou créer `.firebaserc` localement à partir de l'exemple) afin de cibler explicitement un projet autorisé. Vérifiez à chaque fois le projet sélectionné.

## Worker et médias

```bash
cp cloudinary-worker/wrangler.toml.example cloudinary-worker/wrangler.toml
```

Remplacez les placeholders. Configurez les secrets Cloudflare avec la CLI ou l'interface du fournisseur ; ne copiez jamais des valeurs d'API privées dans le `wrangler.toml` versionné, les commits ou les messages d'erreur. Les noms de buckets, domaines et l'ID du projet Firebase peuvent être publics, mais le fichier d'environnement réel est ignoré pour réduire la divulgation d'infrastructure.

## Troubleshooting

- **Page sans données distantes** : vérifier les valeurs publiques de Firebase, règles, App Check et réseau. Les données initiales peuvent masquer une absence de connexion au backend.
- **Administration bloquée** : vérifier authentification, custom claim `admin`, expiration du token et règles ; ne pas donner l'accès public.
- **Upload média refusé** : vérifier Worker, allowlist d'origine, vérification du token, secrets du fournisseur et limites de taille.
- **Build échoué** : relancer `npm ci` proprement ; tester le typecheck ; ne pas recopier les `node_modules` de l'archive originale.
- **SEO obsolète** : un export/rendu statique peut devoir être renouvelé après des modifications Firestore.
