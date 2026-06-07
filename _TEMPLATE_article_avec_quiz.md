# Template — Article avec quiz interactif

> **Utiliser ce template de prompt** quand tu demandes à Claude de créer un article qui contient un quiz ou test de personnalité à la fin.

---

## Prompt à envoyer à Claude

```
Crée un article Oui Psycho! sur le thème : [SUJET]

Inclus un quiz interactif à la fin de l'article (test de personnalité / auto-évaluation).

Génère un SEUL fichier JSON respectant exactement le format ci-dessous.

Le champ "quiz" doit contenir :
- "filename" : nom du fichier html du quiz (ex: "slug-article-quiz.html")
- "html" : le code HTML COMPLET et AUTONOME du quiz (<!DOCTYPE html>...</html>), prêt à être utilisé dans une iframe.
  Le quiz doit envoyer sa hauteur à la page parente via : window.parent.postMessage({ type: 'quiz-resize', height: document.body.scrollHeight }, '*')

Le champ "content" doit se terminer par l'iframe du quiz :
  <h2>[Titre du quiz]</h2>
  <p>[Introduction courte]</p>
  <iframe src="tests/FILENAME" style="width:100%;border:none;min-height:580px;border-radius:12px" loading="lazy" title="[Titre]" id="quiz-frame-QUIZ_ID"></iframe>
  <script>window.addEventListener('message',function(e){if(e.data&&e.data.type==='quiz-resize'){var f=document.getElementById('quiz-frame-QUIZ_ID');if(f)f.style.minHeight=(e.data.height+32)+'px';}});<\/script>

Remplace FILENAME par la valeur de quiz.filename, et QUIZ_ID par un identifiant court unique (ex: slug du quiz sans extension).
```

---

## Format JSON attendu (avec quiz)

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
  "content": "...<h2>Test : [titre du quiz]</h2>\n<p>Introduction.</p>\n<iframe src=\"tests/mon-quiz.html\" style=\"width:100%;border:none;min-height:580px;border-radius:12px\" loading=\"lazy\" title=\"Mon quiz\" id=\"quiz-frame-mon-quiz\"></iframe>\n<script>window.addEventListener('message',function(e){if(e.data&&e.data.type==='quiz-resize'){var f=document.getElementById('quiz-frame-mon-quiz');if(f)f.style.minHeight=(e.data.height+32)+'px';}});<\\/script>",
  "quiz": {
    "filename": "mon-quiz.html",
    "html": "<!DOCTYPE html>\n<html lang=\"fr\">\n<head>...</head>\n<body>...<script>/* envoyer la hauteur : */ function notifyResize(){setTimeout(function(){window.parent.postMessage({type:'quiz-resize',height:document.body.scrollHeight},'*');},50);}<\/script></body>\n</html>"
  },
  "sources": [],
  "status": "published"
}
```

---

## Comment importer dans l'admin

1. Va dans **Admin → Import / Export**
2. Zone ① : dépose le fichier `.json` généré par Claude
3. Zone ② : **laisse vide** — le quiz est embarqué dans le JSON, il sera publié automatiquement
4. L'admin pousse sur GitHub :
   - `articles/{id}.json` (article)
   - `articles/{id}/index.html` (page statique)
   - `tests/{quiz.filename}` (quiz HTML)

> **Si Claude génère le quiz comme fichier HTML séparé** (rare) :
> 1. Dépose le JSON en zone ①
> 2. Dépose le fichier HTML du quiz en zone ②
> 3. Le JSON doit avoir `"quiz": { "filename": "nom-du-quiz.html" }` (sans le champ `html`)

---

## Structure du quiz HTML autonome

Le quiz HTML doit être **complet et autonome** (styles inclus, pas de dépendances externes).
Il doit obligatoirement appeler `notifyResize()` après chaque rendu pour adapter la hauteur de l'iframe :

```javascript
function notifyResize() {
  setTimeout(function() {
    window.parent.postMessage({ type: 'quiz-resize', height: document.body.scrollHeight }, '*');
  }, 50);
}
```

---

## Où atterrissent les fichiers

| Fichier | Chemin sur GitHub |
|---------|------------------|
| Article JSON | `articles/{id}.json` |
| Page article | `articles/{id}/index.html` |
| Quiz HTML | `tests/{quiz.filename}` |

Le quiz est chargé via `<base href="../../">` → `src="tests/..."` résout depuis la racine du site.
