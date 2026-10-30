# Audit de préparation à la publication — 30 octobre 2026

## Périmètre
- Copie distincte de l’archive précédemment nettoyée ; **le dépôt GitHub privé n’a pas été modifié**.
- Le dépôt GitHub privé avait plusieurs commits, dont des fichiers de médias/CV dans son historique. **Ne pas le convertir directement en dépôt public**.
- **143 images et 1 PDF CV** retirés du nouvel export. Tous les manifests de sources médias et jeux de données de production remplacés ou supprimés.
- Les références au CV ont été rendues conditionnelles dans l’interface ; les données initiales contiennent un projet fictif explicitement marqué.
- Suppression des identifiants de service / de formulaire réels dans les exemples de configuration et les données locales.
- Les scripts de commande npm permettant de modifier directement les données de production ont été retirés (sources pédagogiques de certains scripts conservées).

## Contrôles exécutés
- Suite publique de tests Node : **38 réussis sur 38**.
- `tsc --noEmit` : **réussi** avec les dépendances de l’archive source temporairement montées (celles-ci ne sont pas incluses dans le ZIP).
- Scanner local de secrets : **aucune alerte** (résultat indicatif et non exhaustif).
- Build Vite **non validé dans cet environnement** : l’archive originale contenait les dépendances natives Windows, mais pas le paquet natif Rollup requis sur Linux. Il faut exécuter `npm ci` puis `npm run build` sur un poste adéquat.
- Tests Firebase / Cloudinary / Cloudflare en production : **non effectués**.

## Risques résiduels
- Le code public peut exposer la structure des règles, les choix techniques et des noms de services ; les autorisations réelles doivent être correctement configurées côté serveur.
- Les fichiers documentaires et le code ont fait l’objet d’une revue statique et du scanner fourni, mais cela ne garantit pas une absence absolue de secrets ou de données privées.
- Les droits d’auteur sur du code ou des éléments fournis par des tiers sont à valider avant publication.
- **La protection repose aussi sur la création d’un nouveau dépôt avec un nouvel historique** : ne pas pousser une branche ou un dépôt issu de l’ancien `.git`.
