# Instructions pour Claude Code — Oui Psycho!

## Toujours synchroniser avant un audit de l'état actuel du site

Ce dépôt reçoit des commits qui ne passent jamais par le clone local de la session :

- Le workflow `.github/workflows/auto-publish.yml` (cron quotidien à 04h Paris) bascule
  automatiquement les articles `scheduled` → `published` dès que leur date est atteinte.
- L'éditeur web `poulet.html`, utilisé directement par l'utilisateur dans son navigateur,
  pousse ses commits directement sur `origin/main`.

**Avant toute vérification, audit ou diagnostic de « l'état actuel » du site** (articles
publiés, présence d'images, statut scheduled/published, liens, sitemap, etc.) — pas
pour du développement sur du code local non encore poussé — commence par :

```bash
git pull
```

Ne te fie jamais au `git status` affiché en préambule de session pour juger de l'état
« actuel » : il ne reflète que l'état au tout début de la session, pas l'instant présent
de la vérification. Un audit basé sur un clone en retard produit de faux diagnostics
(ex. : signaler un article sans image alors qu'elle a été ajoutée entre-temps via
poulet.html — incident du 2026-08-30).
