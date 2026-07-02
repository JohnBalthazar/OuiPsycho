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
Description quiz   : (1-2 phrases, affichée sur la page Tests)
Emoji quiz         : 🧠             ← 1 emoji représentatif
Couleur quiz       : #1F4E6B        ← couleur hex de la card
Nb de questions    : 7              ← 6 à 10 recommandé
Type de quiz       : profils        ← ou : score
  - profils : chaque réponse vote pour un profil (A/B/C/D) → profil dominant
  - score   : chaque réponse vaut 0–3 points → score total → profil par seuil
Nb de profils      : 4              ← 3 à 4

══════════════════════════════════════════════════════

## Contexte

Site : ouipsycho.fr — blog de vulgarisation en santé mentale
Stack : HTML statique généré depuis des fichiers JSON (node _gen_static.js)
Articles servis à : ouipsycho.fr/articles/{id}/
Quiz servis à      : ouipsycho.fr/tests/{filename}.html

## Ce que tu dois produire

⚠️ DEUX blocs de code séparés et distincts.
Ne JAMAIS embarquer le HTML du quiz dans le JSON (risque d'invalider tout le fichier).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### BLOC 1 — Article JSON

Fichier : articles/{id}.json

{
  "id": "slug-en-minuscules-sans-accents-avec-tirets",
  "title": "Titre exact de l'article",
  "type": "article",
  "excerpt": "Accroche courte et percutante (2-3 phrases).",
  "metaDescription": "Description SEO 140-160 caractères.",
  "author": "La rédaction Oui Psycho!",
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
  "content": "<p>Contenu HTML de l'article…</p>\n\n<h2>Titre du quiz</h2>\n<p>Courte intro invitant le lecteur à faire le quiz.</p>\n<iframe src=\"tests/{id}-quiz.html\" style=\"width:100%;border:none;min-height:580px;border-radius:12px\" loading=\"lazy\" title=\"Titre du quiz\" id=\"quiz-frame-{id}\"></iframe>\n<script>window.addEventListener('message',function(e){if(e.data&&e.data.type==='quiz-resize'){var f=document.getElementById('quiz-frame-{id}');if(f)f.style.minHeight=(e.data.height+32)+'px';}});<\/script>",
  "quiz": {
    "filename": "{id}-quiz.html",
    "card": {
      "title": "Titre affiché sur la page Tests (ex: Quel personnage êtes-vous ?)",
      "desc": "Description courte pour la card de test (1-2 phrases).",
      "emoji": "🧠",
      "color": "#1F4E6B",
      "catLabel": "Pop culture",
      "duration": "4 min"
    }
  },
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
→ RÈGLE ABSOLUE src : toujours src="tests/{id}-quiz.html" — jamais de slash initial (/tests/...).
   Raison : la page article a <base href="../../"> → le slash initial crée un double slash en local.
→ Le `<\/script>` dans le contenu JSON s'écrit avec le backslash pour éviter toute ambiguïté de parsing.
→ quiz.card est lu automatiquement à l'import pour mettre à jour data/tests.json — ne pas l'omettre.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### BLOC 2 — Quiz HTML autonome

Fichier : tests/{id}-quiz.html

Un fichier HTML complet (<!DOCTYPE html>…</html>) avec :

OBLIGATOIRE :
- Tous les styles dans <style> (aucune dépendance externe, aucun CDN)
- Le bloc Google Consent Mode v2 en tête de <head> (voir ci-dessous)
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

BLOC GOOGLE CONSENT (copier exactement en tête de <head>) :
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

DISCLAIMER (copier dans l'écran de résultat) :
  ⚕️ <strong>Rappel important :</strong> Ce questionnaire est un outil de réflexion, pas un diagnostic.
  Seul un professionnel de santé peut évaluer votre situation.
  En cas de détresse, appelez le <strong>3114</strong> (gratuit, 24h/24).

PARTAGE (boutons dans l'écran de résultat) :
  <a href="https://www.facebook.com/sharer/sharer.php?u=ENCODED_URL" target="_blank" rel="noopener">📘 Facebook</a>
  <a href="https://twitter.com/intent/tweet?text=ENCODED_TEXT&url=ENCODED_URL" target="_blank" rel="noopener">𝕏 Twitter</a>
  <a href="https://wa.me/?text=ENCODED_TEXT_URL" target="_blank" rel="noopener">💬 WhatsApp</a>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Catégories valides (casse et accents obligatoires)

Bien-être | Sommeil | Troubles Psy | Thérapies | Relations
Développement personnel | Travail | Émotions & identité | Neurosciences & genre
Société | Société & psychologie politique | Sexo
Nos héros sur le divan | Les monstres sur le divan

## Règles pour le champ "content"

Balises autorisées : <p> <h2> <h3> <ul><li> <ol><li> <strong> <em> <blockquote> <a> <br>
Exception : le bloc <iframe>…<script> du quiz est autorisé à la fin de content.
PAS d'autre <div>, <style>, <script> dans le reste de l'article.
Les " dans le HTML s'écrivent \" en JSON. Les sauts de ligne s'écrivent \n.

Liens sources externes :
<a href="https://URL-EXACTE" target="_blank" rel="noopener noreferrer" class="ref-link" title="Auteur (Année) — Description">Texte affiché</a>

Liens internes :
<a href="slug-de-larticle/">Texte du lien</a>   ← juste le slug + slash final, pas de préfixe

## Encodage

Caractères français directs (UTF-8) : é è ê ë à â ä ù û ü î ï ô ö ç œ æ — « » …
Jamais d'entités HTML (&eacute; etc.) ni de séquences &#XXXX;
Em-dash : — (jamais --)
```

---

## ✅ Intégration via l'admin (ouipsycho.fr/poulet)

**C'est tout ce qu'il y a à faire :**

1. Aller sur **Import / Export**
2. Déposer le **Bloc 1** (fichier `.json`) dans la zone ① Article
3. Déposer le **Bloc 2** (fichier `.html`) dans la zone ② Quiz
4. Choisir date et statut, puis **Publier sur GitHub**

→ L'admin gère automatiquement : page HTML statique, `data/articles.json`, `data/articles-all.json`, `data/tests.json` (depuis `quiz.card`), `sitemap.xml`.

---

## ✅ Intégration en ligne de commande (alternative)

```bash
# 1. Placer les fichiers
cp {id}.json        articles/{id}.json
cp {id}-quiz.html   tests/{id}-quiz.html

# 2. Générer les statiques + mettre à jour tous les index
node _gen_static.js

# 3. Vérifier le quiz
node _check_quizzes.js   # → doit apparaître dans OK

# 4. Ajouter manuellement dans data/tests.json (depuis quiz.card)
# Puis committer
git add articles/{id}.json tests/{id}-quiz.html articles/{id}/ {id}/ data/ sitemap.xml
git commit -m "feat: article + quiz — {titre}"
git push
```

---

## ⚠️ Les 3 bugs classiques à éviter

| Bug | Cause | Correction |
|---|---|---|
| **404 sur ouipsycho.fr/{id}/** | Le JSON `articles/{id}.json` n'a jamais été importé/créé | Importer via l'admin ou lancer `node _gen_static.js` |
| **Iframe vide / blanche** | Le fichier `tests/{id}-quiz.html` n'a pas été déposé | Déposer le Bloc 2 dans la zone ② de l'admin |
| **Test absent de tests.html** | `quiz.card` absent du JSON **ou** import sans PAT configuré | Vérifier que `quiz.card` est bien rempli dans le Bloc 1 |

---

## Pourquoi 2 blocs séparés et pas 1 ?

L'IA génère souvent un JSON invalide si le HTML du quiz est embarqué dedans car :
- 200 à 400 lignes de HTML doivent tenir en une seule chaîne JSON
- Chaque `"` → `\"`, chaque `\` → `\\`, chaque saut de ligne → `\n`
- Une seule erreur d'échappement = JSON illisible par `JSON.parse()`

→ Deux blocs séparés = zéro risque d'encodage + lisibilité + import en 2 clics.
