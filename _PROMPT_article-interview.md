# Prompt — Article interview · Oui Psycho!

> Copie tout le bloc ci-dessous, remplis les paramètres en haut, puis envoie à l'IA.

---

```
╔══════════════════════════════════════════════════════╗
║         PARAMÈTRES — remplir avant tout              ║
╚══════════════════════════════════════════════════════╝

Sujet / thème      : 
Titre de l'article : 
Catégorie          :    ← voir liste en bas
Type               : article        ← ou : dossier
Ton                : 
Statut             : published      ← ou : scheduled  /  draft

Interviewé(e)      : 
Titre / fonction   : 
Contexte           :    ← ex: sortie d'un livre, actualité, expertise spécifique
Nb de questions    : 8              ← 6 à 10 recommandé

══════════════════════════════════════════════════════

## Contexte

Site : ouipsycho.fr — blog de vulgarisation en santé mentale
Stack : HTML statique généré depuis des fichiers JSON (node _gen_static.js)
Articles servis à : ouipsycho.fr/{id}/

## Ce que tu dois produire

Un seul bloc JSON valide. Le champ "content" contient l'intégralité de l'interview en HTML.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Structure de l'interview dans "content"

L'article se compose de 3 parties dans cet ordre :

1. CHAPEAU (2-3 paragraphes <p>)
   → Présentation de l'interviewé(e), contexte du sujet, pourquoi cet entretien

2. INTERVIEW (questions-réponses, format strict ci-dessous)
   → Utiliser exclusivement ce format pour chaque échange :

   <p><strong>Oui Psycho! : La question posée ?</strong></p>
   <p><em>Prénom Nom :</em> La réponse développée, minimum 3-5 phrases par réponse.</p>

   → Varier les angles : ne pas enchaîner 2 questions sur le même registre.
   → Les questions sont directes, parfois un peu décalées, jamais condescendantes.
   → Les réponses sont développées, nuancées, avec des exemples concrets quand possible.

3. CONCLUSION (1-2 paragraphes <p>)
   → Note de la rédaction, ressources mentionnées, invitation à prolonger la réflexion.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Format JSON

{
  "id": "slug-en-minuscules-sans-accents-avec-tirets",
  "title": "Titre avec le nom de l'interviewé(e)",
  "type": "article",
  "excerpt": "Accroche courte (2-3 phrases) présentant l'interview et son intérêt.",
  "metaDescription": "Description SEO entre 140 et 160 caractères.",
  "author": "La rédaction Oui Psycho!",
  "date": "YYYY-MM-DD",
  "date_modified": "YYYY-MM-DD",
  "category": "Thérapies",
  "image": "",
  "imagePosition": "50% 50%",
  "imageZoom": 1,
  "imageGravity": "none",
  "imageLayout": "top",
  "readTime": 8,
  "tags": ["interview", "tag-2", "tag-3", "tag-4"],
  "keypoints": [
    "Point clé 1 tiré de l'interview — phrase complète.",
    "Point clé 2.",
    "Point clé 3.",
    "Point clé 4.",
    "Point clé 5."
  ],
  "content": "<p>Chapeau…</p>\n\n<p><strong>Oui Psycho! : Première question ?</strong></p>\n<p><em>Prénom Nom :</em> Réponse…</p>\n\n[…]\n\n<p>Conclusion…</p>",
  "sources": [
    {
      "authors": "Prénom Nom (interviewé·e)",
      "year": "2025",
      "title": "Titre de l'ouvrage ou étude mentionné(e)",
      "publisher": "Éditeur"
    }
  ],
  "articles_lies": [],
  "status": "published"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Catégories valides (casse et accents obligatoires)

Bien-être | Sommeil | Troubles Psy | Thérapies | Relations
Développement personnel | Travail | Émotions & identité | Neurosciences & genre
Société & psychologie politique | Sexo
Nos héros sur le divan | Les monstres sur le divan

## Règles pour le champ "content"

Balises autorisées : <p> <h2> <h3> <ul><li> <ol><li> <strong> <em> <blockquote> <a> <br>
PAS de <div>, <style>, <script>
Les " dans le HTML s'écrivent \" en JSON. Les sauts de ligne s'écrivent \n.
Longueur totale : minimum 1500 mots (chapeau + interview + conclusion).

Liens vers des sources externes :
<a href="https://URL-EXACTE" target="_blank" rel="noopener noreferrer" class="ref-link" title="Auteur (Année) — Description">Texte affiché</a>

Liens internes (vers d'autres articles du site) :
<a href="slug-de-larticle/">Texte du lien</a>
→ Pas de préfixe, juste le slug avec un slash final.

## Règles pour les sources

- Citer dans "sources" les ouvrages, études ou ressources mentionnés pendant l'interview.
- authors, year, title obligatoires
- journal : pour les revues | publisher : pour les livres
- url : optionnel, DOI ou PubMed de préférence — omettre si incertaine
- Privilégier les sources françaises.

## Encodage

Caractères français directs (UTF-8) : é è ê ë à â ä ù û ü î ï ô ö ç œ æ — « » …
Jamais d'entités HTML (&eacute; etc.)
Em-dash : — (jamais --)
```
