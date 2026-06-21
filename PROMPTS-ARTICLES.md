# Prompts de création d'articles — Oui Psycho!

> Trois variantes selon le type d'article. Lire d'abord la section **Rubriques & catégories** pour bien orienter la demande.

---

## 📌 Rubriques & catégories disponibles

### Catégories standard

| Catégorie | Description |
|-----------|-------------|
| `Anxiété` | Troubles anxieux, phobies, crises de panique |
| `Dépression` | Dépression, burn-out, épisodes dépressifs |
| `Bien-être` | Bonheur, pleine conscience, hygiène mentale |
| `Stress` | Gestion du stress, cortisol, surcharge |
| `Sommeil` | Insomnie, cycles, santé du sommeil |
| `Thérapies` | TCC, psychanalyse, EMDR, choisir son psy… |
| `Relations` | Couple, amour, attachement, famille |
| `Développement personnel` | Estime de soi, confiance, motivation |
| `Travail` | Travail, management, vie pro |
| `Émotions & identité` | Honte, colère, deuil, identité |
| `Neurosciences & genre` | Cerveau, genre, biais cognitifs |
| `Société & psychologie politique` | Société, politique, comportements collectifs |
| `Sexo` | Désir, couple, intimité, sexualité sans tabous |

### Rubriques spéciales (pages dédiées sur le site)

| Type | Catégorie JSON | Page dédiée |
|------|---------------|-------------|
| 🦸 **Nos héros sur le divan** | `"Nos héros sur le divan"` | nos-heros-sur-le-divan.html |
| 💀 **Les monstres sur le divan** | `"Les monstres sur le divan"` | les-monstres-sur-le-divan.html |

> Ces rubriques analysent des personnages de fiction (héros ou antagonistes) sous l'angle de la psychologie. Utiliser ces catégories **exactes** (casse et accents compris) dans le JSON.

### Type d'article

| Valeur | Usage |
|--------|-------|
| `"article"` | Article classique (défaut) |
| `"dossier"` | Dossier de fond — apparaît aussi dans la section 📚 Dossiers |

---

## Prompt — Article standard (sans quiz)

```
Crée un article Oui Psycho! sur le thème : [SUJET]

Génère un bloc de code JSON respectant exactement ce format :

{
  "id": "slug-de-larticle",
  "title": "Titre accrocheur",
  "type": "article",
  "excerpt": "Description courte et accrocheuse (2 phrases max).",
  "metaDescription": "Description SEO (155 caractères max).",
  "author": "La rédaction Oui Psycho!",
  "date": "YYYY-MM-DD",
  "date_modified": "YYYY-MM-DD",
  "category": "[CATÉGORIE — voir liste]",
  "image": "",
  "imagePosition": "50% 50%",
  "imageZoom": 1,
  "imageGravity": "none",
  "imageLayout": "top",
  "readTime": 8,
  "tags": ["tag-1", "tag-2", "tag-3"],
  "keypoints": [
    "Point clé 1 (phrase complète)",
    "Point clé 2",
    "Point clé 3",
    "Point clé 4",
    "Point clé 5"
  ],
  "content": "<!-- contenu HTML complet de l'article -->",
  "sources": [
    {
      "authors": "Nom A. & Nom B.",
      "year": "2024",
      "title": "Titre de l'étude ou ouvrage",
      "journal": "Nom de la revue",
      "url": "https://..."
    }
  ],
  "articles_lies": [],
  "status": "published"
}

Catégories disponibles :
Anxiété | Dépression | Bien-être | Stress | Sommeil | Thérapies | Relations
Développement personnel | Travail | Émotions & identité | Neurosciences & genre
Société & psychologie politique | Sexo | Nos héros sur le divan | Les monstres sur le divan

Pour un dossier de fond : "type": "dossier" au lieu de "article".
Pour un article planifié : "status": "scheduled".

Le champ "content" contient le HTML complet de l'article :
- Balises <h2>, <h3>, <p>, <ul>/<ol>/<li>, <strong>, <em>
- Liens sources dans le texte : <a href="URL" class="ref-link" title="Auteur (année)">ancre</a>
- Liens internes vers d'autres articles : <a href="articles/slug-article/">Texte</a>
  (avec préfixe articles/ — les articles sont à ouipsycho.fr/articles/slug-article/)
- Les " dans le HTML s'écrivent \" en JSON, les sauts de ligne \n
- Minimum 1500 mots, approche psychologique rigoureuse, ton accessible mais sérieux
```

---

## Prompt — Article avec quiz interactif

> ⚠️ **Ne jamais embarquer le HTML du quiz dans le JSON** — erreurs d'encodage systématiques. Toujours 2 fichiers séparés.

```
Crée un article Oui Psycho! sur le thème : [SUJET]
Sujet de l'article :
Titre : [TITRE]
Catégorie : [CATÉGORIE]
Dossier : [OUI/NON]
Angle : psychologique et scientifique
Ton : Sérieux, complice et humoristique, bref décontracté

Inclus un quiz interactif à la fin (test de personnalité / auto-évaluation).

Génère DEUX blocs de code séparés et distincts — pas de JSON combiné :

---

### BLOC 1 — Article JSON

{
  "id": "slug-de-larticle",
  "title": "...",
  "type": "article",
  "excerpt": "...",
  "metaDescription": "...",
  "author": "La rédaction Oui Psycho!",
  "date": "YYYY-MM-DD",
  "date_modified": "YYYY-MM-DD",
  "category": "[CATÉGORIE]",
  "image": "",
  "imagePosition": "50% 50%",
  "imageZoom": 1,
  "imageGravity": "none",
  "imageLayout": "top",
  "readTime": 10,
  "tags": ["tag-1", "tag-2"],
  "keypoints": ["Point 1", "Point 2", "Point 3"],
  "content": "<!-- contenu HTML -->\n\n<h2>[Titre du quiz]</h2>\n<p>[Intro courte]</p>\n<iframe src=\"tests/FILENAME\" style=\"width:100%;border:none;min-height:580px;border-radius:12px\" loading=\"lazy\" title=\"[Titre]\" id=\"quiz-frame-QUIZ_ID\"></iframe>\n<script>window.addEventListener('message',function(e){if(e.data&&e.data.type==='quiz-resize'){var f=document.getElementById('quiz-frame-QUIZ_ID');if(f)f.style.minHeight=(e.data.height+32)+'px';}});</script>",
  "quiz": { "filename": "slug-de-larticle-quiz.html" },
  "sources": [
    { "authors": "Auteur A.", "year": "2024", "title": "Titre", "journal": "Revue", "url": "https://..." }
  ],
  "articles_lies": [],
  "status": "published"
}

Remplace FILENAME par le nom du fichier quiz (ex: slug-de-larticle-quiz.html)
et QUIZ_ID par le slug sans extension (ex: slug-de-larticle-quiz).
Le </script> dans la string JSON ne nécessite PAS d'échappement supplémentaire.

---

### BLOC 2 — Quiz HTML autonome

Un fichier HTML complet et autonome (<!DOCTYPE html>…</html>) avec :
- Tous les styles inline (aucune dépendance externe)
- La fonction notifyResize() appelée après CHAQUE rendu :
  function notifyResize() {
    setTimeout(function() {
      window.parent.postMessage({ type: 'quiz-resize', height: document.body.scrollHeight }, '*');
    }, 50);
  }
- notifyResize() appelé à chaque changement d'état (question suivante, résultat, recommencer)
- 8 à 12 questions, 3 à 4 profils de résultats distincts, styles soignés

Nomme le fichier : slug-de-larticle-quiz.html
```

---

## Format JSON complet — référence

```json
{
  "id": "slug-de-larticle",
  "title": "Titre de l'article",
  "type": "article",
  "excerpt": "Résumé accrocheur en 1–2 phrases.",
  "metaDescription": "Description SEO 155 caractères max.",
  "author": "La rédaction Oui Psycho!",
  "date": "2026-06-17",
  "date_modified": "2026-06-17",
  "category": "Bien-être",
  "image": "",
  "imagePosition": "50% 50%",
  "imageZoom": 1,
  "imageGravity": "none",
  "imageLayout": "top",
  "readTime": 8,
  "tags": ["tag-1", "tag-2", "tag-3"],
  "keypoints": [
    "Point clé 1 — phrase complète.",
    "Point clé 2.",
    "Point clé 3."
  ],
  "content": "<p>Contenu HTML…</p>",
  "quiz": { "filename": "mon-quiz.html" },
  "sources": [
    {
      "authors": "Dupont J. & Martin A.",
      "year": "2023",
      "title": "Titre de l'étude",
      "journal": "Revue de psychologie",
      "url": "https://doi.org/..."
    },
    {
      "authors": "Smith B.",
      "year": "2022",
      "title": "Titre d'un ouvrage",
      "publisher": "Éditions XYZ"
    }
  ],
  "articles_lies": ["slug-article-1", "slug-article-2"],
  "status": "published"
}
```

### Référence des champs

| Champ | Valeurs possibles | Notes |
|-------|------------------|-------|
| `type` | `"article"` · `"dossier"` | dossier = apparaît aussi dans 📚 Dossiers |
| `status` | `"published"` · `"scheduled"` · `"draft"` | scheduled = planifié à la date du champ `date` |
| `category` | voir tableau des catégories | casse et accents **exacts** obligatoires |
| `articles_lies` | `["slug-1", "slug-2"]` | max 3 — section "À lire aussi" |
| `sources` | tableau d'objets | `journal` OU `publisher` + `url` optionnel |
| `quiz` | `{ "filename": "..." }` | uniquement si article avec quiz — jamais de champ `html` |
| `imageLayout` | `"top"` · `"side"` · `"none"` | position de l'image dans la page |
| `imageGravity` | `"none"` · `"top"` · `"bottom"` | recadrage de l'image si nécessaire |

---

## Comment importer dans l'admin

1. Aller dans **Admin → Import / Export**
2. **Zone ①** : déposer le fichier `.json` (article)
3. **Zone ②** : déposer le `.html` du quiz *(uniquement si article avec quiz)*
4. Vérifier la date et le statut dans le panneau de confirmation
5. Cliquer **🚀 Publier sur GitHub**

L'admin publie automatiquement :

| Fichier | Chemin GitHub |
|---------|--------------|
| Article JSON | `articles/{id}.json` |
| Page statique | `articles/{id}/index.html` |
| Quiz HTML | `tests/{quiz.filename}` |

> ℹ️ Les articles sont servis à **ouipsycho.fr/articles/{id}/**.  
> Une page de redirection est automatiquement générée à `{id}/index.html` (racine) pour la compatibilité des anciens liens.

---

## Liens internes dans le contenu

Pour créer un lien vers un autre article du site dans le champ `content` :

```html
<a href="articles/slug-de-larticle/">Texte du lien</a>
```

> ℹ️ Les articles sont à **ouipsycho.fr/articles/{id}/** — toujours utiliser le préfixe `articles/`.  
> La balise `<base href="../../">` injectée automatiquement résout le chemin depuis la racine.

---

## Structure du quiz HTML — référence

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Titre du quiz]</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 2rem 1.5rem 3rem;
      max-width: 640px;
      margin: 0 auto;
    }
    /* ... styles du quiz ... */
  </style>
</head>
<body>
<div id="root"></div>
<script>
const questions = [ /* 8–12 questions */ ];
const results   = { /* 3–4 profils */ };

let current = 0;
let answers  = Array(questions.length).fill(null);

function render() {
  // ... générer le HTML dans #root ...
  notifyResize(); // ⚠️ TOUJOURS appeler après chaque rendu
}

function notifyResize() {
  setTimeout(function() {
    window.parent.postMessage({ type: 'quiz-resize', height: document.body.scrollHeight }, '*');
  }, 50);
}

render();
</script>
</body>
</html>
```

---

## Pourquoi 2 fichiers séparés pour le quiz ?

L'admin supporte le mode embarqué (`"quiz": { "filename": "...", "html": "..." }`) mais Claude génère souvent du **JSON invalide** dans ce cas — le HTML complet (200–400 lignes) doit être encodé en une seule string avec chaque `"` en `\"`, chaque `\` en `\\`, chaque saut de ligne en `\n`. Une seule erreur casse tout le JSON.

→ **Toujours préférer les 2 fichiers séparés** : plus fiable, plus lisible, l'admin gère les deux zones parfaitement.
