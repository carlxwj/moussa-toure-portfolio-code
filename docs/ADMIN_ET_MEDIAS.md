# Administration et médias — principes

## Contenus gérés

Le portail d'administration permet de gérer les informations artistiques : projets, expériences et rôles, training, shootings, galeries, showreel, liens sociaux, présentation, éléments de navigation, contact et CV. Les champs réellement disponibles dépendent du composant `src/pages/Admin.tsx` et des règles publiées dans votre environnement.

## Photos et droits

- Les fichiers sous `public/media/` sont **livrés aux visiteurs** quand le site est en ligne ; ils ne sont pas privés.
- L'archive de sources nettoyée les conserve pour permettre une reproduction fidèle du rendu et le bon fonctionnement des tests.
- Des métadonnées EXIF/XMP de plusieurs fichiers ont été supprimées. Cela ne retire ni les visages, ni les inscriptions visibles, ni les obligations de droit à l'image et de copyright.
- Avant de rendre le dépôt public, vérifier les autorisations de l'acteur, des photographes, des producteurs et des personnes présentes sur les images. En cas de doute : laisser le dépôt privé ou publier un dépôt public **sans médias et sans CV**, avec démonstration accessible séparément.

## CV

Le fichier `public/docs/moussa-toure-cv-public.pdf` est actuellement utilisé comme **CV public de secours** par des liens de l'interface. Le supprimer sans adapter les liens provoque des erreurs. Sa présence sur GitHub doit être validée par la personne concernée, particulièrement si le CV contient téléphone, email ou autre donnée personnelle.

## Mise à jour du contenu en production

- Privilégier `/admin` pour la majorité des modifications plutôt que changer directement le code.
- Les scripts d'import comme `scripts/add-photos-to-firestore.mjs` et `scripts/seed-firestore.mjs` peuvent écrire dans une base : leurs options `--write` exigent une vérification attentive de l'environnement ; effectuer un export/sauvegarde avant.
- `scripts/grant-admin.mjs` exige une identité existante, un email vérifié, une configuration d'identité administrateur **hors repo** et un argument explicite de confirmation. Le lancer uniquement depuis un poste sûr.
- Pour les changements des fichiers du site, utiliser `npm run build` et déployer Hosting après validation.
