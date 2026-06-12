# PROMPT — Créer un article pour Oui Psycho!

## Contexte du site
- Site : ouipsycho.fr — blog de vulgarisation en santé mentale, rédigé par un infirmier en psychiatrie
- Stack : HTML statique généré par `node _gen_static.js` depuis des fichiers JSON
- Les articles sont dans `articles/<slug>.json`
- Après livraison du JSON → lancer `node _gen_static.js` pour générer le HTML

## Ce que tu dois produire
Sauf demande explicite de design personnalisé, génère toujours un fichier JSON (pas un HTML).

## Champs JSON obligatoires
```json
{
  "id": "slug-en-minuscules-sans-accents",
  "title": "Titre exact avec majuscule initiale",
  "excerpt": "Une phrase d'accroche (2-3 lignes, visible dans les cards).",
  "metaDescription": "Description SEO 140-160 caractères.",
  "author": "La rédaction Oui Psycho!",
  "date": "YYYY-MM-DD",
  "date_modified": "YYYY-MM-DD",
  "category": "<une des catégories valides — voir liste ci-dessous>",
  "image": "",
  "readTime": 5,
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "keypoints": [
    "Point clé 1 (phrase complète, ~15 mots)",
    "Point clé 2",
    "Point clé 3",
    "Point clé 4",
    "Point clé 5"
  ],
  "sources": [
    {
      "authors": "Nom A. & Nom B.",
      "year": "2023",
      "title": "Titre exact de l'article",
      "journal": "Nom de la revue",
      "url": "https://doi.org/10.XXXX/XXXXX"
    },
    {
      "authors": "Nom C.",
      "year": "2020",
      "title": "Titre du livre",
      "publisher": "Éditeur"
    }
  ],
  "content": "<p>Contenu HTML ici…</p>",
  "status": "published"
}
```

## Catégories valides — en choisir UNE

### Catégories thématiques (filtrables depuis la homepage)
`Anxiété` | `Dépression` | `Bien-être` | `Relations` | `Stress` | `Sommeil` | `Thérapies` | `Développement personnel`

### Rubriques spéciales (chaque rubrique a sa propre page dédiée)

| Valeur exacte dans le JSON | Page du site | À utiliser pour… |
|---|---|---|
| `Société` | /societe.html | Phénomènes collectifs, culturels et psychosociaux : Dunning-Kruger, IA & travail, johatsu, horoscope, féminisme, nouvelles sexualités, biais cognitifs sociaux… |
| `Nos héros sur le divan` | /nos-heros-sur-le-divan.html | Analyse psychologique de personnages de **fiction** (BD, films, séries, romans) : Harry Potter, Astérix, Gaston Lagaffe, super-héros… |
| `Les monstres sur le divan` | /les-monstres-sur-le-divan.html | Psychopathologie de figures liées au mal — réelles ou fictives : dictateurs (Hitler, Staline, Mussolini), serial killers, anti-héros sombres (Dexter, Hannibal…) |

> **Règle de priorité :** si le sujet correspond clairement à une rubrique spéciale, préférer la rubrique à une catégorie thématique.

## Statuts valides
- `"published"` — visible immédiatement
- `"scheduled"` — publication différée (associer à une `date` dans le futur)
- `"draft"` — brouillon, jamais visible sur le site

## Ton et voix narrative
- Vulgarisation accessible, bienveillante, sans jargon inutile
- Première personne possible pour les anecdotes cliniques : **le narrateur est toujours un infirmier** (jamais un médecin, jamais un psychologue)
- Exemples du quotidien, humour discret, rigueur scientifique

## Règles d'encodage — CRITIQUE
- Em-dash : toujours `—` (jamais `â`, jamais `--`)
- `à` : jamais `Ã` suivi d'espace
- `Ça` : jamais `Ãa`
- `Êtes` : jamais `Ãtes`
- Caractères français directs : `é è ê ë à â ä ù û ü î ï ô ö ç œ æ — « » …`
- Jamais de séquences HTML `&#8212;` etc. — le site est déjà en UTF-8

## Règles pour les liens dans `content`

**Liens externes :**
```html
<a href="https://URL-EXACTE" target="_blank" rel="noopener noreferrer" class="ref-link" title="Auteur (Année) — Description">Texte affiché</a>
```
- Le `href` ne contient QUE l'URL, jamais de texte ou parenthèses après
- DOI : `https://doi.org/10.XXXX/XXXXX` (complet, jamais tronqué)
- PubMed : `https://pubmed.ncbi.nlm.nih.gov/XXXXXXXX/`
- Si l'URL n'est pas certaine → ne pas mettre de lien, citer en texte simple

**Liens internes — vers un autre article :**
```html
<a href="articles/slug-de-larticle/">Texte ancré</a>
```

**Liens internes — vers les rubriques :**
```html
<a href="societe.html">Société</a>
<a href="nos-heros-sur-le-divan.html">Nos héros sur le divan</a>
<a href="les-monstres-sur-le-divan.html">Les monstres sur le divan</a>
<a href="tests.html">Tests</a>
<a href="dossiers.html">Dossiers</a>
```

## Balises autorisées dans `content`
`<p>` `<h2>` `<h3>` `<ul><li>` `<ol><li>` `<strong>` `<em>` `<blockquote>` `<a>` `<br>`

> PAS de `<div>`, `<style>`, `<script>` — le template gère tout le reste.

## Champ `sources` — règles
- `authors` : `"Nom P. & Nom Q."` ou `"Organisation"`
- `year` : `"2023"`
- `title` : titre exact
- `journal` : pour les revues scientifiques
- `publisher` : pour les livres (à la place de `journal`)
- `url` : recommandé — DOI ou PubMed de préférence
- Si DOI incertain → omettre `url` (mieux vaut pas de lien qu'un lien cassé)
- JAMAIS de texte dans `url` après l'URL
- Privilégier les sources françaises quand elles existent

## Longueur recommandée
| Champ | Cible |
|---|---|
| `content` | 1 100–1 400 mots |
| `metaDescription` | 140–160 caractères |
| `excerpt` | 2–3 phrases |
| `keypoints` | 4–6 points (~12 mots chacun) |
| `tags` | 4–7 tags courts |
| `readTime` | `nb_mots ÷ 200` (arrondi) |

---

## Template de commande

```
Sujet de l'article :
Titre :
Catégorie :
Angle : psychologique et sociologique (et un peu scientifique)
Ton :
```
