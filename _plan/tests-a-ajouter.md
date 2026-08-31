# Quiz différés — LOT 1 (souffrance au travail)

**Découverte du run du 2026-08-31** : `data/tests.json` n'est **pas** à éditer à la main. `node _gen_static.js` le régénère intégralement à chaque run à partir des articles `published` dont la date est passée et qui contiennent un iframe `tests/...` dans leur `content` (log constaté : `🧪 data/tests.json mis à jour (23 tests — 22 auto + 1 manuel(s))`). La Phase 3 du plan (§4) est donc automatique — cette page ne sert qu'à noter *pourquoi* un quiz n'apparaît pas encore sur `tests.html`, pas à préparer une entrée JSON à coller.

## Quiz du lot 1 en attente d'activation automatique

| Quiz | Article rattaché | Date de publication prévue | Apparaîtra sur tests.html |
|---|---|---|---|
| `tests/syndrome-imposteur-quiz.html` | `syndrome-imposteur` | 2026-09-12 | automatiquement, dès que l'article passe en `published` (cron `auto-publish.yml` + régénération) |
| `tests/charge-mentale-quiz.html` | `charge-mentale` | 2026-09-18 | idem |

Aucune action manuelle requise. Si l'un des deux n'apparaît pas sur `tests.html` après sa date de publication, vérifier que `auto-publish.yml` a bien exécuté `node _gen_static.js` après le basculement de statut — voir [Déploiement Pages Actions + IndexNow] dans la mémoire du projet pour le mécanisme complet.
