# Template — Article avec quiz interactif

> **Utiliser ce template de prompt** quand tu demandes à Claude de créer un article qui contient un quiz ou test de personnalité à la fin.
>
> ⚠️ **Ne jamais demander à Claude d'embarquer le HTML du quiz dans le JSON** — ça cause des erreurs d'encodage JSON systématiques. Toujours 2 fichiers séparés.

---

## Prompt à envoyer à Claude

```
Crée un article Oui Psycho! sur le thème : [SUJET]

Inclus un quiz interactif à la fin de l'article (test de personnalité / auto-évaluation).

Génère DEUX blocs de code séparés et distincts — pas de JSON combiné :

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

---

## Format JSON attendu (Zone ①)

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

## Structure du quiz HTML (Zone ②)

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

render();
</script>
</body>
</html>
```

---

## Où atterrissent les fichiers

| Fichier | Zone d'import | Chemin sur GitHub |
|---------|--------------|------------------|
| Article JSON | Zone ① | `articles/{id}.json` |
| Page article | (généré auto) | `articles/{id}/index.html` |
| Quiz HTML | Zone ② | `tests/{quiz.filename}` |

Le quiz est chargé via `<base href="../../">` dans la page article → `src="tests/..."` résout depuis la racine du site.

---

## Pourquoi pas d'HTML embarqué dans le JSON ?

L'admin **supporte** le mode embarqué (`"quiz": { "filename": "...", "html": "..." }`) mais **Claude génère souvent un JSON invalide** dans ce cas parce que :
- Le HTML complet du quiz (200–400 lignes) doit être encodé en une seule string JSON
- Chaque `"` doit être `\"`, chaque `\` doit être `\\`, chaque saut de ligne doit être `\n`
- Une seule erreur d'échappement casse tout le JSON

→ **Toujours préférer les 2 fichiers séparés** : c'est plus fiable, plus lisible, et l'admin gère parfaitement les deux zones.
