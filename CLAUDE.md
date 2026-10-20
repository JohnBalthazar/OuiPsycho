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

## Conventions de build

`node _gen_static.js` doit passer avant toute fin de tâche.
JSON compact une ligne, UTF-8, pas d'entités HTML.
Consent Mode v2 et notifyResize() vivent dans le layout, jamais
dupliqués dans un fichier de données.

## Robots et images (Google Discover)

- Valeurs robots indexables : liste FERMÉE `ROBOTS_INDEXABLE_VALUES`, définie
  une seule fois dans `js/article-template.js` : `"index, follow"` et
  `"index, follow, max-image-preview:large"` (= `ROBOTS_INDEXABLE`, la valeur
  écrite par les gabarits). Réutilisée par `_gen_static.js` (détection
  sitemap, `isIndexableHtml`) et `.github/scripts/verify-robots-consistency.js`
  (garde-fou de déploiement). Toute autre valeur n'est pas indexable et
  bloque le déploiement pour un article publié. Ajouter une valeur = l'ajouter
  à cette liste, nulle part ailleurs.
- Toute variante d'image Cloudinary passe par `cloudinaryVariant(url, transform)`
  (`js/article-template.js`) — jamais de segment de transformation concaténé
  à la main. Les URL non Cloudinary sont renvoyées intactes.
- Formats retenus (sources ≈ 1376×768, jamais d'agrandissement) :
  image principale 1200×675 (`w_1200,h_675,c_fill,g_auto`, eager +
  fetchpriority high) ; og:image/twitter:image 1200×630
  (`w_1200,h_630,c_fill,g_auto`) ; JSON-LD `image` = 16:9 1200×675 (même URL
  que l'image principale), 4:3 1024×768, 1:1 768×768.

## Auteur

Tout nouvel article affiche la signature auteur ; data/authors.json est la seule source des infos auteur.

## Outils — invariants non négociables

Le référentiel des outils est `tools.json`, dont l'en-tête documente
le format. Les pages sont générées sous `/outils/<slug>/`.

- Échelles reproductibles : PHQ-8, PHQ-9, GAD-7, AUDIT, CAGE,
  WHO-5, Epworth, ISI.
- Interdites, y compris paraphrasées ou « inspirées de » :
  BDI-II, HADS, STAI, Y-BOCS, MADRS. Une reformulation d'items
  reste une œuvre dérivée. Si l'échelle pertinente est dans cette
  liste, arrête-toi et signale-le — ne cherche pas d'équivalent.
- `famille` vaut « echelle-validee » (items à l'identique, référence
  bibliographique, seuils publiés) ou « reperes-maison » (items
  rédigés pour le site, aucun score chiffré, paliers qualitatifs, et
  mention explicite de l'absence de validité psychométrique).
- Aucun barème chiffré sans seuils publiés.
- Aucun lien affilié dans un bloc de résultat.
- Lexique interdit : diagnostic, dépistage, symptômes, vous souffrez
  de, vous présentez, pathologique, sévère.
  Remplacements : repères, auto-observation, vos réponses évoquent,
  ce questionnaire ne permet pas de conclure.
- Calcul 100 % client, aucun envoi réseau, aucun stockage.
- Disclaimer visible AVANT l'outil, pas seulement dans les résultats.
- Événement GA4 `tool_complete` avec le slug de l'outil. Jamais le
  score, jamais les réponses.
- Tout outil déclare : famille, sources, version, dateRevision,
  revoirAvant.
- Lors d'une migration, les items existants sont repris tels quels :
  ni reformulés, ni complétés, ni réordonnés.
- Les textes d'interprétation ne sont jamais réécrits sans validation
  explicite : propose, n'applique pas.

## Maillage articles ↔ outils

Deux tokens résolus au build : `{{outil:SLUG|ancre}}` pour un lien
inline, `{"type":"toolCard","slug":"SLUG"}` pour une carte. Un slug
absent de `tools.json` fait échouer le build.

Le bloc « pour aller plus loin » des pages outil est calculé au build
à partir des articles qui les référencent. Il ne s'écrit jamais à la
main.

Une passe de maillage modifie des articles : `git pull` d'abord, pour
la raison décrite en tête de ce fichier, et jamais pendant que
poulet.html est ouvert. Travailler sur une branche dédiée, pas sur
`main` — un clone en retard n'y produit plus un faux diagnostic mais
écrase des corrections faites via l'éditeur web.

Un lien ne s'insère que si le paragraphe le justifie. Ne rien insérer
est une issue normale et fréquente : dix articles liés à propos
valent mieux que trente liés d'office.

## Périmètre

Ne modifie que les fichiers listés dans la tâche. Si une correction
te paraît nécessaire ailleurs, signale-la sans la faire.

## Méthode

Propose d'abord un plan et la liste des fichiers à créer ou modifier.
Attends validation avant d'écrire. Ensuite une modification à la
fois, avec `node _gen_static.js` après chaque étape.
