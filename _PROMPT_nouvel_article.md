# PROMPT — Créer un article pour Oui Psycho!

> **Instructions à coller en début de conversation avec Claude.**
> Elles garantissent la compatibilité avec le site et évitent les bugs d'encodage, de liens cassés et de structure.

---

## Contexte du site

- Site : **ouipsycho.fr** — blog de vulgarisation en santé mentale
- Stack : HTML statique généré par `node _gen_static.js` depuis des fichiers JSON
- Les articles sont dans `articles/<slug>.json`
- Après livraison du JSON → lancer `node _gen_static.js` pour générer le HTML

---

## Ce que tu dois produire

**Sauf demande explicite de design personnalisé**, génère toujours un **fichier JSON** (pas un HTML).  
Format : `articles/<slug>.json`

---

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
  "category": "<une des 8 catégories — voir liste ci-dessous>",
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
  "content": "<p>Contenu HTML ici…</p>",
  "status": "published"
}
```

---

## Catégories valides (exactement comme écrit)

```
Anxiété
Dépression
Bien-être
Relations
Stress
Sommeil
Thérapies
Développement personnel
```

> ⚠️ Toute autre valeur provoque une couleur/badge gris générique.

---

## Règles d'encodage — CRITIQUE

Ces erreurs ont été trouvées dans les anciens articles. Ne jamais les reproduire.

| ❌ Interdit | ✅ Correct | Caractère |
|---|---|---|
| `â` seul comme tiret | `—` | Em-dash (tiret long) |
| `Ã ` (Ã + espace) | `à` | a-grave |
| `Ãa` | `Ça` | C cédille + a |
| `Ãtes` | `Êtes` | E accent circonflexe |
| `--` ou `-` long | `—` | Em-dash |
| `"` `"` (guillemets typographiques) | `« ... »` ou `"..."` | Guillemets |

**Caractères français autorisés directement** : `é è ê ë à â ä ù û ü î ï ô ö ç œ æ — « » …`  
**Ne jamais** écrire un caractère spécial en séquence d'échappement HTML (`&#8212;` etc.) — le générateur insère déjà `charset="UTF-8"`.

---

## Règles pour les liens dans `content`

### Liens externes (sources, études, références)
```html
<a href="https://URL-EXACTE-ICI" target="_blank" rel="noopener noreferrer" class="ref-link" title="Auteur (Année) — Description">Texte affiché</a>
```
- Le `href` ne contient **que l'URL**, jamais de texte, parenthèses ou virgules après
- URL DOI : `https://doi.org/10.XXXX/XXXXX` — vérifier que le DOI est complet
- PubMed : `https://pubmed.ncbi.nlm.nih.gov/XXXXXXXX/`
- Si l'URL n'est pas certaine → **ne pas mettre de lien**, citer en texte simple

### Liens internes (vers d'autres articles du site)
```html
<a href="articles/slug-article.html">Texte</a>
```
- Chemin relatif depuis la racine (le `<base href="../">` est injecté automatiquement)
- Slugs disponibles : voir liste dans `articles/*.json`

---

## Structure HTML du champ `content`

Balises autorisées dans `content` (pas de `<div>`, pas de `<style>`, pas de `<script>`) :

```html
<p>Paragraphe</p>
<h2>Titre de section</h2>
<h3>Sous-titre</h3>
<ul><li>Item</li></ul>
<ol><li>Item numéroté</li></ol>
<strong>Gras</strong>
<em>Italique</em>
<blockquote>Citation</blockquote>
<a href="...">Lien</a>
<br>
```

> Le template HTML du site gère tout le reste (header, footer, sidebar, TOC, newsletter, cookie banner, GA).

---

## Longueur recommandée

| Élément | Cible |
|---|---|
| `content` | 800–1 500 mots (balises incluses) |
| `metaDescription` | 140–160 caractères |
| `excerpt` | 2–3 phrases |
| `keypoints` | 4–6 points, ~12 mots chacun |
| `tags` | 4–7 tags courts |
| `readTime` | calculer : nb_mots ÷ 200 (arrondi) |

---

## Workflow après livraison du JSON

1. Sauvegarder le fichier : `articles/<id>.json`
2. Lancer : `node _gen_static.js`
3. Vérifier : `articles/<id>.html` est créé
4. Pousser : `git add -A && git commit -m "feat: nouvel article <titre>" && git push`

---

## Si un design personnalisé est demandé (cas rare)

Préciser dans la demande : **"article à design personnalisé"**.  
Claude utilisera alors `_TEMPLATE_article_custom.html` comme base.  
Les mêmes règles d'encodage et de liens s'appliquent.

---

## Exemple de demande type

```
[COLLER CE PROMPT EN ENTIER]

Voici le sujet de l'article :
- Titre : "Comment gérer la jalousie en couple"
- Catégorie : Relations
- Angle : psychologie des émotions, conseils pratiques, 2-3 sources scientifiques
- Longueur : ~1 000 mots
- Ton : bienveillant, accessible, sans jargon
```
