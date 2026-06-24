# Prompts de création d'articles — Oui Psycho!

Trois fichiers séparés selon le type d'article. Ouvrir le bon fichier, copier le bloc, remplir les paramètres en haut, envoyer à l'IA.

---

## Quel prompt utiliser ?

| Fichier | Usage |
|---------|-------|
| [`_PROMPT_article-standard.md`](_PROMPT_article-standard.md) | Article classique ou dossier de fond |
| [`_PROMPT_article-quiz.md`](_PROMPT_article-quiz.md) | Article + quiz interactif (2 fichiers : JSON + HTML) |
| [`_PROMPT_article-interview.md`](_PROMPT_article-interview.md) | Article sous forme d'interview (format Q&R) |

---

## Catégories disponibles

| Catégorie | Description |
|-----------|-------------|
| `Bien-être` | Bonheur, pleine conscience, hygiène mentale |
| `Sommeil` | Insomnie, cycles, santé du sommeil |
| `Troubles Psy` | Anxiété, dépression, stress, phobies, burn-out, troubles psychologiques |
| `Thérapies` | TCC, psychanalyse, EMDR, choisir son psy… |
| `Relations` | Couple, amour, attachement, famille |
| `Développement personnel` | Estime de soi, confiance, motivation |
| `Travail` | Travail, management, vie pro |
| `Émotions & identité` | Honte, colère, deuil, identité |
| `Neurosciences & genre` | Cerveau, genre, biais cognitifs |
| `Société & psychologie politique` | Société, politique, comportements collectifs |
| `Sexo` | Désir, couple, intimité, sexualité sans tabous |
| `Nos héros sur le divan` | Analyse psychologique de personnages de fiction (héros) |
| `Les monstres sur le divan` | Analyse psychologique de personnages de fiction (antagonistes) |

> Casse et accents **obligatoires** dans le JSON.

---

## Référence des champs JSON

| Champ | Valeurs | Notes |
|-------|---------|-------|
| `type` | `"article"` · `"dossier"` | dossier = apparaît aussi dans 📚 Dossiers |
| `status` | `"published"` · `"scheduled"` · `"draft"` | scheduled = planifié à la date du champ `date` |
| `imageLayout` | `"top"` · `"side"` · `"none"` | position de l'image dans la page |
| `imageGravity` | `"none"` · `"top"` · `"bottom"` | recadrage de l'image si nécessaire |
| `articles_lies` | `["slug-1", "slug-2"]` | max 3 — section "À lire aussi" |
| `quiz` | `{ "filename": "nom-quiz.html" }` | uniquement pour articles avec quiz |

---

## Comment importer dans l'admin

1. **Admin → Import / Export**
2. Zone ① : déposer le `.json` de l'article
3. Zone ② : déposer le `.html` du quiz *(uniquement pour articles avec quiz)*
4. Vérifier date et statut → **🚀 Publier sur GitHub**

| Fichier | Chemin GitHub |
|---------|--------------|
| Article JSON | `articles/{id}.json` |
| Page statique | `{id}/index.html` |
| Quiz HTML | `tests/{quiz.filename}` |
