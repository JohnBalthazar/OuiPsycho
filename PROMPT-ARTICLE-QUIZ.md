# Template — Article avec quiz interactif

> **Utiliser ce template** quand tu demandes à Claude de créer un article qui contient un quiz ou test de personnalité à la fin.
>
> ⚠️ **Ne jamais demander à Claude d'embarquer le HTML du quiz dans le JSON** — ça cause des erreurs d'encodage JSON systématiques. Toujours 3 blocs séparés.

---

## Prompt à envoyer à Claude

```
Crée un article Oui Psycho! sur le thème : [SUJET]

Inclus un quiz interactif à la fin de l'article (test de personnalité / auto-évaluation).

Génère TROIS blocs de code séparés et distincts — pas de JSON combiné :

---

### BLOC 1 — Article JSON

Un fichier JSON respectant exactement ce format :
- Le champ "quiz" doit contenir UNIQUEMENT { "filename": "slug-du-quiz.html" } — pas de champ "html".
- Le champ "content" se termine par l'iframe du quiz :

  <h2>[Titre du quiz]</h2>
  <p>[Introduction courte]</p>
  <iframe src="tests/FILENAME" style="width:100%;border:none;min-height:580px;border-radius:12px" loading="lazy" title="[Titre]" id="quiz-frame-QUIZ_ID"></iframe>
  <script>window.addEventListener('message',function(e){if(e.data&&e.data.type==='quiz-resize'){var f=document.getElementById('quiz-frame-QUIZ_ID');if(f)f.style.minHeight=(e.data.height+32)+'px';}});</script>

  Remplace FILENAME par le nom du fichier quiz, et QUIZ_ID par un identifiant court (ex: slug sans extension).
  Le </script> dans la string JSON ne nécessite PAS d'échappement supplémentaire.

---

### BLOC 2 — Quiz HTML autonome

Un fichier HTML complet et autonome (<!DOCTYPE html>...</html>) avec :
- Tous les styles inline (pas de dépendances externes)
- La fonction notifyResize() appelée après chaque rendu :
  function notifyResize() {
    setTimeout(function() {
      window.parent.postMessage({ type: 'quiz-resize', height: document.body.scrollHeight }, '*');
    }, 50);
  }
- Appel de notifyResize() à chaque changement d'état (question suivante, affichage du résultat, recommencer)
- Boutons de partage sur les réseaux sociaux dans l'écran de résultat (Facebook, X/Twitter, WhatsApp)

---

### BLOC 3 — Entrée data/tests.json

Un objet JSON à ajouter dans le tableau data/tests.json pour faire apparaître ce test dans la rubrique Tests du site :

{
  "id": "slug-du-quiz",
  "title": "Titre affiché sur la card de test",
  "desc": "Description courte (1-2 phrases).",
  "emoji": "🧠",
  "color": "#1F4E6B",
  "catLabel": "Catégorie affichée",
  "duration": "5 min",
  "testUrl": "tests/slug-du-quiz.html",
  "articleUrl": "articles/slug-de-larticle/",
  "image": "",
  "isNew": true,
  "status": "published"
}

---

Nomme le fichier quiz : slug-de-larticle-quiz.html
```

---

## Comment importer dans l'admin

1. Va dans **Admin → Import / Export**
2. **Zone ①** : dépose le fichier `.json` généré (Bloc 1)
3. **Zone ②** : dépose le fichier `.html` du quiz généré (Bloc 2)
4. Clique **🚀 Publier sur GitHub**

L'admin publie automatiquement :
- `articles/{id}.json` (article, sans le HTML du quiz)
- `articles/{id}/index.html` (page statique)
- `tests/{quiz.filename}` (quiz HTML)

**Étape supplémentaire — ajouter le test à la rubrique Tests :**
5. Ouvrir `data/tests.json` dans l'admin ou dans VS Code
6. Ajouter l'objet du Bloc 3 en **tête du tableau** (pour qu'il apparaisse en premier)
7. Committer (`git add data/tests.json && git commit -m "feat: nouveau test — [titre]"`)

Le test apparaît alors automatiquement sur [ouipsycho.fr/tests.html](https://ouipsycho.fr/tests.html).

---

## Format JSON attendu (Bloc 1)

```json
{
  "id": "slug-de-larticle",
  "title": "...",
  "excerpt": "...",
  "metaDescription": "...",
  "author": "La rédaction Oui Psycho!",
  "date": "YYYY-MM-DD",
  "date_modified": "YYYY-MM-DD",
  "category": "...",
  "image": "",
  "imagePosition": "50% 50%",
  "imageZoom": 1,
  "imageGravity": "none",
  "imageLayout": "top",
  "readTime": 15,
  "tags": ["tag-1", "tag-2"],
  "keypoints": ["Point 1", "Point 2"],
  "content": "...<h2>Test : [titre du quiz]</h2>\n<p>Introduction.</p>\n<iframe src=\"tests/mon-quiz.html\" style=\"width:100%;border:none;min-height:580px;border-radius:12px\" loading=\"lazy\" title=\"Mon quiz\" id=\"quiz-frame-mon-quiz\"></iframe>\n<script>window.addEventListener('message',function(e){if(e.data&&e.data.type==='quiz-resize'){var f=document.getElementById('quiz-frame-mon-quiz');if(f)f.style.minHeight=(e.data.height+32)+'px';}});</script>",
  "quiz": {
    "filename": "mon-quiz.html"
  },
  "sources": [],
  "status": "published"
}
```

> **Points critiques du champ `content`** :
> - Les `"` dans le HTML s'écrivent `\"` (échappement JSON normal)
> - Les sauts de ligne s'écrivent `\n`
> - Le `</script>` ne nécessite PAS d'échappement supplémentaire — `</script>` suffit
> - Le champ `quiz` ne contient QUE `{ "filename": "..." }` — jamais de champ `html`

---

## Format data/tests.json (Bloc 3)

```json
{
  "id": "slug-du-quiz",
  "title": "Titre de la card affiché sur /tests.html",
  "desc": "Description courte visible sous le titre (1-2 phrases max).",
  "emoji": "🧠",
  "color": "#1F4E6B",
  "catLabel": "Développement personnel",
  "duration": "5 min",
  "testUrl": "tests/slug-du-quiz.html",
  "articleUrl": "articles/slug-de-larticle/",
  "image": "https://res.cloudinary.com/... (URL Cloudinary si dispo, sinon vide)",
  "isNew": true,
  "status": "published"
}
```

**Champs :**
| Champ | Description |
|---|---|
| `id` | Slug unique (même convention que l'article) |
| `title` | Titre affiché sur la card — peut différer du titre de l'article |
| `desc` | 1-2 phrases d'accroche pour la card |
| `emoji` | Emoji affiché sur la card (visible sans image) |
| `color` | Couleur d'accent de la card (hex) — choisir en cohérence avec la catégorie |
| `catLabel` | Label de catégorie affiché (libre, pas contraint par les catégories articles) |
| `duration` | Durée estimée du test (ex. `"5 min"`) |
| `testUrl` | Chemin vers le fichier quiz (ex. `"tests/mon-quiz.html"`) |
| `articleUrl` | Chemin vers l'article lié (ex. `"articles/slug/"`) — peut être vide `""` |
| `image` | URL Cloudinary optionnelle — si vide, l'emoji est affiché à la place |
| `isNew` | `true` affiche le badge "Nouveau" |
| `status` | `"published"` ou `"draft"` |

---

## Structure du quiz HTML (Bloc 2)

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Titre du quiz]</title>
  <style>
    /* Tous les styles ici — pas de fichiers externes */
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
// Données du quiz
const questions = [ /* ... */ ];
const results   = { /* ... */ };

// État
let current = 0;
let answers  = Array(questions.length).fill(null);

// ⚠️ Appeler notifyResize() après CHAQUE rendu
function render() {
  // ... générer le HTML dans #root ...
  notifyResize();
}

function notifyResize() {
  setTimeout(function() {
    window.parent.postMessage({ type: 'quiz-resize', height: document.body.scrollHeight }, '*');
  }, 50);
}

// Partage réseaux sociaux (à inclure dans l'écran de résultat)
function shareUrl(network, score, profileTitle) {
  const url  = 'https://ouipsycho.fr/tests/FILENAME.html';
  const text = `J'ai obtenu ${score} au test « [TITRE DU TEST] » sur Oui Psycho! 🧠 Mon profil : ${profileTitle}. Et toi ?`;
  const encodedText = encodeURIComponent(text);
  const encodedUrl  = encodeURIComponent(url);
  if (network === 'facebook')  return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
  if (network === 'x')         return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  if (network === 'whatsapp')  return `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
  return url;
}

render();
</script>
</body>
</html>
```

---

## Où atterrissent les fichiers

| Fichier | Étape | Chemin sur GitHub |
|---|---|---|
| Article JSON | Admin Zone ① | `articles/{id}.json` |
| Page article (auto) | Généré par `_gen_static.js` | `articles/{id}/index.html` |
| Quiz HTML | Admin Zone ② | `tests/{quiz.filename}` |
| Entrée tests.json | **Manuel** — ajouter Bloc 3 en tête de `data/tests.json` | `data/tests.json` |

Le quiz est chargé via `<base href="../../">` dans la page article → `src="tests/..."` résout depuis la racine du site.

---

## Pourquoi pas d'HTML embarqué dans le JSON ?

L'admin **supporte** le mode embarqué (`"quiz": { "filename": "...", "html": "..." }`) mais **Claude génère souvent un JSON invalide** dans ce cas parce que :
- Le HTML complet du quiz (200–400 lignes) doit être encodé en une seule string JSON
- Chaque `"` doit être `\"`, chaque `\` doit être `\\`, chaque saut de ligne doit être `\n`
- Une seule erreur d'échappement casse tout le JSON

→ **Toujours préférer les 3 blocs séparés** : c'est plus fiable, plus lisible, et l'admin gère parfaitement les deux zones.
