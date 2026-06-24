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
Type               : article        ← ou : dossier
Ton                : 
Angle              : 
Longueur article   : 1000 mots      ← 800-1400 recommandé (le quiz complète)
Statut             : published      ← ou : scheduled  /  draft

Sujet du quiz      : 
Nb de questions    : 10             ← 8 à 12 recommandé
Nb de profils      : 4              ← 3 à 4 recommandé

══════════════════════════════════════════════════════

## Contexte

Site : ouipsycho.fr — blog de vulgarisation en santé mentale
Stack : HTML statique généré depuis des fichiers JSON (node _gen_static.js)
Articles servis à : ouipsycho.fr/{id}/
Quiz servis à : ouipsycho.fr/tests/{filename}.html

## Ce que tu dois produire

⚠️ DEUX blocs de code séparés et distincts — jamais de JSON combiné.
Ne jamais embarquer le HTML du quiz dans le JSON (risque d'invalider tout le fichier).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### BLOC 1 — Article JSON

{
  "id": "slug-de-larticle",
  "title": "Titre exact",
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
  "content": "<p>Contenu HTML de l'article…</p>\n\n<h2>Titre de la section quiz</h2>\n<p>Courte intro invitant le lecteur à faire le quiz.</p>\n<iframe src=\"tests/SLUG-quiz.html\" style=\"width:100%;border:none;min-height:580px;border-radius:12px\" loading=\"lazy\" title=\"Titre du quiz\" id=\"quiz-frame-SLUG-quiz\"></iframe>\n<script>window.addEventListener('message',function(e){if(e.data&&e.data.type==='quiz-resize'){var f=document.getElementById('quiz-frame-SLUG-quiz');if(f)f.style.minHeight=(e.data.height+32)+'px';}});</script>",
  "quiz": { "filename": "SLUG-quiz.html" },
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

→ Remplace SLUG par le slug de l'article (ex: si id = "mon-article", SLUG = "mon-article")
→ Le </script> dans la string JSON ne nécessite PAS d'échappement supplémentaire.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### BLOC 2 — Quiz HTML autonome

Un fichier HTML complet (<!DOCTYPE html>…</html>) avec :
- Tous les styles en inline dans <style> (aucune dépendance externe, aucun CDN)
- La fonction notifyResize() appelée après CHAQUE changement d'état :

  function notifyResize() {
    setTimeout(function() {
      window.parent.postMessage({ type: 'quiz-resize', height: document.body.scrollHeight }, '*');
    }, 50);
  }

- notifyResize() appelée à : chaque affichage de question, affichage du résultat, recommencer
- Design soigné, adapté au thème de l'article

Structure recommandée du script :

  const questions = [ /* 8–12 questions avec 3-4 choix chacune */ ];
  const results   = { /* 3–4 profils de résultats distincts */ };
  let current = 0;
  let scores  = {};

  function render() {
    // générer le HTML dans #root
    notifyResize(); // ← TOUJOURS à la fin de chaque render
  }

Nom du fichier : SLUG-quiz.html (identique à ce qui est déclaré dans "quiz.filename" du JSON)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Catégories valides (casse et accents obligatoires)

Bien-être | Sommeil | Troubles Psy | Thérapies | Relations
Développement personnel | Travail | Émotions & identité | Neurosciences & genre
Société & psychologie politique | Sexo
Nos héros sur le divan | Les monstres sur le divan

## Règles pour le champ "content"

Balises autorisées : <p> <h2> <h3> <ul><li> <ol><li> <strong> <em> <blockquote> <a> <br>
Exception : le bloc <iframe>…<script> du quiz est autorisé à la fin de content.
PAS d'autre <div>, <style>, <script> dans le reste de l'article.
Les " dans le HTML s'écrivent \" en JSON. Les sauts de ligne s'écrivent \n.

Liens vers des sources externes :
<a href="https://URL-EXACTE" target="_blank" rel="noopener noreferrer" class="ref-link" title="Auteur (Année) — Description">Texte affiché</a>

Liens internes (vers d'autres articles du site) :
<a href="slug-de-larticle/">Texte du lien</a>
→ Pas de préfixe, juste le slug avec un slash final.

## Règles pour les sources

- authors, year, title obligatoires
- journal : pour les revues scientifiques
- publisher : pour les livres (à la place de journal)
- url : DOI ou PubMed — omettre si incertaine
- Privilégier les sources françaises.

## Encodage

Caractères français directs (UTF-8) : é è ê ë à â ä ù û ü î ï ô ö ç œ æ — « » …
Jamais d'entités HTML (&eacute; etc.)
Em-dash : — (jamais --)
```
