# Sécurité, secrets et données personnelles — portfolio

## Séparation des rôles

L'utilisateur public lit les fiches publiées ; l'administrateur utilise une interface authentifiée. La vérification de l'interface seule ne suffit pas. `firestore.rules` et le Cloudflare Worker doivent appliquer leurs propres contrôles. Ne pas faire confiance aux IDs, URLs, types MIME, noms de fichiers et revendications envoyés depuis le navigateur.

## Secrets interdits dans le dépôt

- `.env.local`, `.env.development.local`, `.firebaserc` réel, `.wrangler/` (caches et comptes), données privées exportées.
- Jetons OAuth, clés de compte de service Firebase, clés API privées Cloudinary, secrets JWT, clés Worker, identifiants R2 ou captures de console.
- Échanges d'administration ou fichiers CSV comportant des contacts privés.

`cloudinary-worker/wrangler.toml.example` est un **gabarit** : le vrai fichier `wrangler.toml` reste local. `.env.example` contient volontairement des valeurs vides pour les identifiants publics. Les tests ne nécessitent plus les vrais fichiers de production.

## Protection réelle à vérifier

1. Définir des règles Firestore restrictives : lecture des contenus publiés, écriture réservée au custom claim administrateur réellement vérifié.
2. Tester le refus d'une opération admin avec un utilisateur normal, une session expirée et un token falsifié.
3. Contrôler la vérification RS256 des ID tokens et les limites de taille et type des médias dans le Worker.
4. Vérifier l'allowlist CORS des origines, les quotas, le coût des stockages et la révocation de comptes.
5. Vérifier le consentement des visiteurs pour Analytics et le fonctionnement du contact dans le pays ciblé.
6. Vérifier le droit à l'image, les données du CV et la durée de conservation des contenus.
7. Analyser l'historique des commits si le dépôt avait déjà été créé ; `.gitignore` n'en supprime aucun secret.

## EXIF et limitations de l'audit

Les JPEG/PNG sources porteurs de métadonnées EXIF/XMP ont été réencodés pour retirer ces métadonnées ; les photos ont été revérifiées. Les traces visibles sur la photo, ses propriétés de contenu, les URLs publiques et un éventuel CV restent potentiellement identifiants. Aucun processus automatisé ne garantit l'absence de données personnelles et aucun audit des configurations **effectivement en production** n'a été réalisé.
