# Prompt — Article standard · Oui Psycho!

> Copie tout le bloc ci-dessous, remplis les paramètres en haut, puis envoie à l'IA.

---

```
╔══════════════════════════════════════════════════════╗
║         PARAMÈTRES — remplir avant tout              ║
╚══════════════════════════════════════════════════════╝

Sujet          : 
Titre          : 
Catégorie      :    ← voir liste en bas
Type           : article        ← ou : dossier
Ton            : 
Angle          : 
Longueur       : 1500 mots      ← minimum recommandé
Statut         : published      ← ou : scheduled  /  draft

══════════════════════════════════════════════════════

## Contexte

Site : ouipsycho.fr — blog de vulgarisation en santé mentale
Stack : HTML statique généré depuis des fichiers JSON (node _gen_static.js)
Articles servis à : ouipsycho.fr/{id}/

## Ce que tu dois produire

Un seul bloc JSON valide, respectant exactement ce format :

{
  "id": "slug-en-minuscules-sans-accents-avec-tirets",
  "title": "Titre exact",
  "type": "article",
  "excerpt": "Accroche courte et percutante (2-3 phrases, visible dans les cartes).",
  "metaDescription": "Description SEO entre 140 et 160 caractères.",
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
  "tags": ["tag-1", "tag-2", "tag-3", "tag-4", "tag-5"],
  "keypoints": [
    "Point clé 1 — phrase complète d'environ 12 mots.",
    "Point clé 2.",
    "Point clé 3.",
    "Point clé 4.",
    "Point clé 5."
  ],
  "content": "<p>Contenu HTML complet…</p>",
  "sources": [
    {
      "authors": "Nom A. & Nom B.",
      "year": "2024",
      "title": "Titre de l'étude ou ouvrage",
      "journal": "Nom de la revue",
      "url": "https://doi.org/10.XXXX/XXXXX"
    },
    {
      "authors": "Nom C.",
      "year": "2020",
      "title": "Titre du livre",
      "publisher": "Éditeur",
      "amazon_asin": "XXXXXXXXXX"
    }
  ],
  "articles_lies": [],
  "status": "published"
}

## Catégories valides (casse et accents obligatoires)

Bien-être | Sommeil | Troubles Psy | Thérapies | Relations
Développement personnel | Travail | Émotions & identité | Neurosciences & genre
Société & psychologie politique | Sexo
Nos héros sur le divan | Les monstres sur le divan

## Règles pour le champ "content"

Balises autorisées : <p> <h2> <h3> <ul><li> <ol><li> <strong> <em> <blockquote> <a> <br>
PAS de <div>, <style>, <script>
Les " dans le HTML s'écrivent \" en JSON. Les sauts de ligne s'écrivent \n.

Liens vers des sources externes :
<a href="https://URL-EXACTE" target="_blank" rel="noopener noreferrer" class="ref-link" title="Auteur (Année) — Description">Texte affiché</a>
→ Le href contient UNIQUEMENT l'URL, jamais de texte supplémentaire après.

Liens internes (vers d'autres articles du site) :
<a href="slug-de-larticle/">Texte du lien</a>
→ Pas de préfixe, juste le slug avec un slash final.

## Règles pour les sources

- authors : "Dupont J. & Martin A." ou "Nom de l'organisation"
- year : "2023" (chaîne de caractères)
- title : titre exact de l'étude ou de l'ouvrage
- journal : pour les articles scientifiques
- publisher : pour les livres (à la place de journal)
- url : DOI (https://doi.org/…) ou PubMed (https://pubmed.ncbi.nlm.nih.gov/ID/)
  → Omettre si l'URL n'est pas certaine — mieux vaut pas de lien qu'un lien cassé.
- Privilégier les sources françaises quand elles existent.

## Encodage

Caractères français directs (fichier UTF-8) : é è ê ë à â ä ù û ü î ï ô ö ç œ æ — « » …
Jamais d'entités HTML (&eacute; etc.) ni de séquences &#XXXX;
Em-dash : — (jamais --)
```
