# Publier ce code sans diffuser les données du portfolio privé

## Séparation impérative

**Ne pas rendre public** le dépôt `carlxwj/moussa-toure-portfolio` existant : il contient des images, un CV et des métadonnées dans les **anciens commits**. Supprimer seulement les fichiers de la branche `main` ne retirerait pas l'historique.

Cette archive de code public est distincte et ne contient pas de répertoire `.git`. Créer un nouveau dépôt public **vide** nommé `moussa-toure-portfolio-code` sans initialiser de README, de .gitignore ni de licence. Extraire cette archive dans un nouveau dossier. Ne jamais y copier le dossier `.git` original.

Sur PowerShell dans ce nouveau dossier :

```powershell
git init -b main
python scripts/scan-secrets.py
git add .
git diff --cached --check
git status
# Vérifier la liste des fichiers et leur contenu avant le commit.
git commit -m "chore: publish sanitized portfolio CMS source"
git remote add origin https://github.com/carlxwj/moussa-toure-portfolio-code.git
git push -u origin main
```

À vérifier avant le push :

- Aucun `.env.local`, fichier clé, jeton Cloudinary, token Firebase Admin, ou fichier d'authentification.
- Pas d'images de personnes, ni de CV PDF, ni de témoignages ou d'informations de contact réelles.
- Le jeu de données initial est une **démonstration fictive** et n'est pas le jeu de données production.
- Les règles Firestore de production et la configuration des services tiers doivent rester protégées par les réglages serveur ; un code source public ne doit jamais être considéré comme une barrière d'accès.
- Vérifier les licences de dépendances et les droits d'auteur sur le code et les ressources fournies par d'autres personnes.

Cette copie sert de portfolio technique et ne doit pas remplacer le déploiement Firebase existant. En particulier, ne pas exécuter `firebase deploy` vers le projet de production à partir de ce dossier.

Si la permission de republier certains médias est obtenue ultérieurement, ajouter uniquement les fichiers autorisés au nouveau dépôt, dans un commit distinct, après vérification de leurs métadonnées. Ne pas transférer l'historique privé.
