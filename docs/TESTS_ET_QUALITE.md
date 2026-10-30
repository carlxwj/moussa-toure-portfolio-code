# Tests de la version publique (échantillon anonymisé)

Ce dépôt est une **édition de démonstration**. Les tests dépendant d'images, du CV, de crédits réels, des témoignages et du contenu de production ont été volontairement exclus.

Exécuter `npm test` pour la suite publique. Celle-ci valide des modules techniques et des contrôles de sécurité indépendants des médias privés. Le nombre de tests n'est pas celui du site de production.

GitHub Actions exécute désormais `npm ci`, `npm test`, `npm run typecheck`, puis `npm run build` (Vite et pré-rendu SEO avec les seules données fictives). Ces commandes peuvent aussi être relancées localement. Les connexions réelles à Firebase, Cloudflare et Cloudinary, les règles de sécurité de production et le déploiement ne sont **pas** vérifiés par ces tests statiques. Ne pas exécuter les scripts de migration/administration sur les services réels.
