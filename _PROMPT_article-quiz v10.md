# Prompt — Article avec quiz interactif · Oui Psycho!

> Copie tout le bloc ci-dessous, remplis les paramètres en haut, puis envoie à l'IA.

---

```
╔══════════════════════════════════════════════════════╗
║         PARAMÈTRES — remplir avant tout              ║
╚══════════════════════════════════════════════════════╝

Sujet de l'article : 
Titre              : 
Catégorie          :    ← voir liste en bas
Ton                : 
Angle              : 
Longueur article   : 1000 mots      ← 800-1400 recommandé (le quiz complète)
Statut             : published      ← ou : scheduled  /  draft
Date publication   : YYYY-MM-DD

Titre du quiz      : 
Nb de questions    : 7              ← 6 à 10 recommandé
Type de quiz       : profils        ← ou : score
  - profils : chaque réponse vote pour un profil (A/B/C/D) → profil dominant
  - score   : chaque réponse vaut 0–3 points → score total → profil par seuil
Nb de profils      : 4              ← 3 à 4

Tableaux comparatifs : non         ← ou : oui — si oui, décrire les colonnes/lignes souhaitées
                                      (ex: "un tableau comparant 4 thérapies sur 3 critères")

══════════════════════════════════════════════════════

## Contexte

Site : ouipsycho.fr — blog de vulgarisation en santé mentale
Stack : HTML statique généré depuis des fichiers JSON (node _gen_static.js)
Articles servis à : ouipsycho.fr/articles/{id}/
Quiz servis à     : ouipsycho.fr/tests/{filename}.html

## Ce que tu dois produire

⚠️ TROIS blocs de code séparés et distincts.
Ne JAMAIS embarquer le HTML du quiz dans le JSON (risque d'invalider tout le fichier).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### BLOC 1 — Article JSON

Fichier : articles/{id}.json

{
  "id": "slug-en-minuscules-sans-accents-avec-tirets",
  "title": "Titre exact",
  "type": "article",
  "excerpt": "Accroche courte et percutante (2-3 phrases).",
  "metaDescription": "Description SEO 140-160 caractères.",
  "author": "John Balthazar",
  "date": "YYYY-MM-DD",
  "date_modified": "YYYY-MM-DD",
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
    "Point clé 3.",
    "Point clé 4.",
    "Point clé 5."
  ],
  "content": "<p>Contenu HTML de l'article…</p>\n\n<h2>Titre du quiz</h2>\n<p>Courte intro invitant le lecteur à faire le quiz.</p>\n<iframe src=\"tests/{id}-quiz.html\" style=\"width:100%;border:none;min-height:580px;border-radius:12px\" loading=\"lazy\" title=\"Titre du quiz\" id=\"quiz-frame-{id}\"></iframe>\n<script>window.addEventListener('message',function(e){if(e.data&&e.data.type==='quiz-resize'){var f=document.getElementById('quiz-frame-{id}');if(f)f.style.minHeight=(e.data.height+32)+'px';}});</script>",
  "sources": [
    {
      "authors": "Nom A. & Nom B.",
      "year": "2024",
      "title": "Titre de l'étude",
      "journal": "Nom de la revue",
      "url": "https://doi.org/10.XXXX/XXXXX"
    }
  ],
  "articles_lies": [],
  "status": "published"
}

→ Remplace {id} partout par le même slug (ex: "mon-article").
→ RÈGLE ABSOLUE src : toujours src="tests/{id}-quiz.html" — JAMAIS de slash initial.
   ❌ INTERDIT : src="/tests/..."   ✅ CORRECT : src="tests/..."
   Raison : la page article a <base href="../../"> — le slash crée un double slash en local.
→ Le </script> dans la string JSON ne nécessite pas d'échappement supplémentaire.
→ PAS de champ "quiz" dans le JSON — il n'existe pas dans le schéma.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### BLOC 2 — Quiz HTML autonome

Fichier : tests/{id}-quiz.html

Un fichier HTML complet (<!DOCTYPE html>…</html>) avec la structure <head> suivante
(ordre obligatoire) :

<!DOCTYPE html>
<html lang="fr">
<head>
  <!-- Google Consent Mode v2 (RGPD/Europe) -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    var _pc = (function(){ try { return localStorage.getItem('pc_consent'); } catch(e){ return null; } })();
    if (_pc === '1') {
      gtag('consent', 'default', {'analytics_storage':'granted','ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied'});
    } else {
      gtag('consent', 'default', {'analytics_storage':'denied','ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied','wait_for_update':2000});
    }
    gtag('set', 'url_passthrough', true);
    gtag('set', 'ads_data_redaction', true);
  </script>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-NR52DCZ6ZJ"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-NR52DCZ6ZJ');</script>

  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Titre du quiz</title>
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="https://ouipsycho.fr/articles/{id}/">
  <meta name="description" content="Description courte du quiz (1-2 phrases).">
  <style>
    /* tous les styles ici — aucune dépendance externe, aucun CDN */
  </style>
</head>

OBLIGATOIRE dans le script :
- La fonction notifyResize() appelée après CHAQUE changement d'état :

  function notifyResize() {
    setTimeout(function() {
      window.parent.postMessage({ type: 'quiz-resize', height: document.body.scrollHeight }, '*');
    }, 50);
  }

  → notifyResize() DOIT être appelée : après chaque question, au résultat, après "Recommencer"
  → window.addEventListener('load', notifyResize) en fin de script

- Boutons de partage dans l'écran de résultat (Facebook, X/Twitter, WhatsApp)
- Disclaimer ⚕️ dans l'écran de résultat (voir modèle ci-dessous)

PARTAGE (boutons dans l'écran de résultat) :
  <a href="https://www.facebook.com/sharer/sharer.php?u=ENCODED_URL" target="_blank" rel="noopener">👍 Facebook</a>
  <a href="https://twitter.com/intent/tweet?text=ENCODED_TEXT&url=ENCODED_URL" target="_blank" rel="noopener">🐦 Twitter</a>
  <a href="https://wa.me/?text=ENCODED_TEXT_URL" target="_blank" rel="noopener">💬 WhatsApp</a>

DISCLAIMER (copier dans l'écran de résultat) :
  ⚕️ <strong>Rappel important :</strong> Ce questionnaire est un outil de réflexion, pas un diagnostic.
  Seul un professionnel de santé peut évaluer votre situation.
  En cas de détresse, appelez le <strong>3114</strong> (gratuit, 24h/24).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### BLOC 3 — Entrée data/tests.json

Un objet JSON à ajouter en tête du tableau data/tests.json UNIQUEMENT si l'article est publié
(status = published, ou scheduled avec une date ≤ aujourd'hui) :

{
  "id": "{id}-quiz",
  "title": "Titre affiché sur la card de test",
  "desc": "Description courte (1-2 phrases max).",
  "emoji": "🧠",
  "color": "#1F4E6B",
  "catLabel": "Catégorie affichée",
  "duration": "5 min",
  "testUrl": "tests/{id}-quiz.html",
  "articleUrl": "articles/{id}/",
  "image": "",
  "isNew": true,
  "status": "published"
}

⚠️ Si l'article est scheduled avec une date future → NE PAS ajouter dans data/tests.json maintenant.
   Ajouter l'entrée le jour de la publication.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Catégories valides (casse et accents obligatoires)

Bien-être | Sommeil | Troubles Psy | Thérapies | Relations
Développement personnel | Travail | Émotions & identité | Neurosciences & genre
Société | Société & psychologie politique | Sexo
Nos héros sur le divan | Les monstres sur le divan

## Règles pour le champ "content"

Balises autorisées (texte courant) :
  <p> <h2> <h3> <ul><li> <ol><li> <strong> <em> <blockquote> <a> <br>

Balises autorisées (tableaux — uniquement si "Tableaux comparatifs : oui") :
  <table>  <caption>  <thead>  <tbody>  <tr>
  <th scope="col">  <th scope="row">  <td>
  Attribut class autorisé sur <table> ; scope autorisé sur <th>.

Exception quiz : le bloc <iframe>…<script> est autorisé à la fin de content.
PAS d'autre <div>, <style>, <script> dans le reste de l'article.
Les " dans le HTML s'écrivent \" en JSON. Les sauts de ligne s'écrivent \n.

### Tableaux comparatifs — syntaxe et règles

⚠️ NE PAS écrire <div class="table-wrap"> : le générateur l'ajoute automatiquement.
   Sur mobile, un scroll horizontal s'active dès que le tableau dépasse la largeur d'écran.

Modèle JSON (entre guillemets, sur une seule ligne logique, \n pour chaque saut) :

"<table>\n<caption>Titre descriptif du tableau</caption>\n<thead>\n<tr><th scope=\"col\">Critère</th><th scope=\"col\">Option A</th><th scope=\"col\">Option B</th></tr>\n</thead>\n<tbody>\n<tr><th scope=\"row\">Durée</th><td>10 séances</td><td>20 séances</td></tr>\n<tr><th scope=\"row\">Coût</th><td>50 €</td><td>80 €</td></tr>\n</tbody>\n</table>"

Bonnes pratiques :
- Toujours un <caption> : il décrit le tableau (affiché au-dessus, style discret).
- <th scope="col"> sur chaque en-tête de colonne (1re ligne de <thead>).
- <th scope="row"> sur la cellule qui identifie chaque ligne (1re colonne de <tbody>) → affichée en gras automatiquement.
- 3 à 5 colonnes max pour conserver la lisibilité mobile.
- Si tu compares moins de 3 éléments sur 1 seul critère, préfère une liste <ul>.
- Le tableau peut être placé n'importe où dans le content, pas uniquement en fin d'article.

Liens sources externes :
<a href="https://URL-EXACTE" target="_blank" rel="noopener noreferrer" class="ref-link" title="Auteur (Année) — Description">Texte affiché</a>

Liens internes :
<a href="slug-de-larticle/">Texte du lien</a>   — juste le slug + slash final, pas de préfixe

## Règles pour les sources

- authors, year, title obligatoires
- journal : pour les revues scientifiques
- publisher : pour les livres (à la place de journal)
- url : DOI ou PubMed — omettre si incertaine
- amazon_asin : ASIN du livre sur Amazon.fr (10 caractères après /dp/ dans l'URL)
  Ex : amazon.fr/dp/2081211475 → "amazon_asin": "2081211475"
  → Ne jamais inventer un ASIN — omettre le champ si inconnu

## Encodage

Caractères français directs (UTF-8) : é è ê ë à â ä ù û ü î ï ô ö ç œ æ — « » …
Jamais d'entités HTML (&eacute; etc.) ni de séquences &#XXXX;
Em-dash : — (jamais --)
```

---

## ✅ Checklist d'intégration (après génération)

### 🔀 Deux façons d'intégrer — choisir l'une ou l'autre

**Via la page admin (`/poulet`)** :
1. Onglet "Import / Export"
2. Déposer le fichier JSON (Bloc 1) dans la zone ①
3. **⚠️ Obligatoire** : déposer le fichier quiz HTML (Bloc 2) dans la zone ② qui apparaît automatiquement
4. Vérifier la date et le statut, puis cliquer "Publier sur GitHub"
5. Ajouter le Bloc 3 dans `data/tests.json` manuellement si l'article est publié

**Via Claude Code (terminal)** — effectuer dans cet ordre :

### 1. Créer les fichiers

```
articles/{id}.json          ← Bloc 1
tests/{id}-quiz.html        ← Bloc 2
```

Vérifier que les noms correspondent :
- `src="tests/{id}-quiz.html"` dans le content (SANS slash initial)
- Le fichier HTML s'appelle exactement `tests/{id}-quiz.html`

### 2. Valider le JSON ← ÉTAPE CRITIQUE

```bash
node -e "JSON.parse(require('fs').readFileSync('./articles/{id}.json','utf8')); console.log('JSON valide ✓')"
```

Si cette commande retourne une erreur → corriger le JSON avant de continuer.
Un JSON invalide = aucune page générée = 404 garanti.

### 3. Vérifier le src de l'iframe

```bash
node -e "const j=require('./articles/{id}.json'); const m=j.content.match(/src=\"([^\"]+)\"/); console.log(m?.[1])"
```

Le résultat doit commencer par `tests/` et NON par `/tests/`.

### 4. Régénérer les pages statiques

```bash
node _gen_static.js
```

### 5. Vérifier les quiz

```bash
node _check_quizzes.js
```

→ La ligne `{id}.json` doit apparaître dans **OK**, pas dans **MANQUANT**.

### 6. Ajouter dans data/tests.json (si article publié)

Ajouter le Bloc 3 en tête du tableau `data/tests.json`.

```bash
# Vérifier que l'article est bien publié :
node -e "const j=require('./articles/{id}.json'); console.log(j.status, j.date)"
```

### 7. Committer et pusher

```bash
git add articles/{id}.json tests/{id}-quiz.html articles/{id}/ {id}/ data/ sitemap.xml
git commit -m "feat: article + quiz — {titre}"
git push
```

---

## ⚠️ Les bugs classiques à éviter

| Bug | Cause | Correction |
|---|---|---|
| **404 sur ouipsycho.fr/articles/{id}/** | JSON invalide ou `_gen_static.js` pas lancé | Valider le JSON (étape 2) puis relancer le générateur |
| **Iframe vide / blanche** | Le fichier `tests/{id}-quiz.html` n'existe pas | Créer le Bloc 2 et le déposer dans `tests/` |
| **Quiz introuvable en prod** | `src="/tests/..."` avec slash initial | Toujours `src="tests/..."` (sans slash) — la page a `<base href="../../">` |
| **Test absent de tests.html** | Entrée manquante dans `data/tests.json` | Ajouter le Bloc 3 dans `data/tests.json` |
| **Quiz trop petit / scroll inutile** | `notifyResize()` non appelée après chaque état | Appeler `notifyResize()` à chaque render, résultat, recommencer |

---

## Pourquoi 3 blocs séparés et pas 1 ?

L'IA génère souvent un JSON invalide si le HTML du quiz est embarqué dedans car :
- 200 à 400 lignes de HTML doivent tenir en une seule chaîne JSON
- Chaque `"` → `\"`, chaque `\` → `\\`, chaque saut de ligne → `\n`
- Une seule erreur d'échappement = JSON illisible par `JSON.parse()`

→ Trois blocs séparés = zéro risque d'encodage + lisibilité + facilité d'import.
