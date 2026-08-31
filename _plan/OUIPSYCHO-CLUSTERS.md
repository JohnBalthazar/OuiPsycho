# OUIPSYCHO — Production de clusters SEO
### Fichier de référence unique · à déposer dans `_plan/OUIPSYCHO-CLUSTERS.md`

> Ce fichier contient **tout** : le plan éditorial, la procédure, les specs techniques et le journal d'avancement.
> Aucune information extérieure n'est nécessaire. Il se met à jour lui-même à chaque run (§8).

---

## 0. MODE D'EMPLOI

**Premier run — commencer par là, impérativement :**

```
Lis _plan/OUIPSYCHO-CLUSTERS.md et exécute la Phase 0 (inventaire et réconciliation).
N'écris aucun article. Rends-moi le rapport et attends ma validation.
```

Runs suivants, une seule ligne à chaque session :

```
Lis _plan/OUIPSYCHO-CLUSTERS.md et exécute le prochain lot non produit.
```

Variantes utiles :

```
Lis _plan/OUIPSYCHO-CLUSTERS.md et exécute le LOT 3.
Lis _plan/OUIPSYCHO-CLUSTERS.md et reprends le LOT 1 là où il s'est arrêté.
Lis _plan/OUIPSYCHO-CLUSTERS.md et produis uniquement le pilier du LOT 2.
Lis _plan/OUIPSYCHO-CLUSTERS.md, section 8 : où en est-on ?
```

**Règle absolue pour Claude Code** : à la fin de chaque run, mettre à jour la section 8 (Journal) **avant** de rendre la main. Un run non journalisé est un run perdu.

**Un run = un lot = un cluster.** Ne jamais enchaîner deux lots dans la même session : la qualité des sources et du maillage se dégrade au-delà d'une dizaine d'articles.

---

## 1. CONTEXTE PROJET

- Site : **ouipsycho.fr** — blog de vulgarisation en santé mentale
- Auteur : **John Balthazar**
- Projet local : `K:\Site\Oui Psycho` (Windows / PowerShell / VS Code)
- Interface d'admin : **Poulet**
- Stack : HTML statique généré depuis des JSON via `node _gen_static.js`
- Articles servis à : `ouipsycho.fr/articles/{id}/`
- Quiz servis à : `ouipsycho.fr/tests/{filename}.html`

Fichiers structurants :

| Fichier | Rôle |
|---|---|
| `articles/{id}.json` | 1 article |
| `tests/{id}-quiz.html` | 1 quiz autonome |
| `data/tests.json` | cards de la page Tests |
| `data/dossiers.json` | cards de la page Dossiers *(à confirmer — voir §4, Phase 0)* |
| `_gen_static.js` | générateur des pages statiques + sitemap |
| `_check_quizzes.js` | contrôle de cohérence article → quiz |

**Anomalies connues à traiter** :
- `dossiers.html` est en ligne mais vide.
- `sitemap.xml` est figé à 16 URLs alors que le site en publie 25+ (dernier `lastmod` : juin 2026).

---

## 2. PRINCIPE ÉDITORIAL

**1 cluster = 1 dossier.**

- **Pilier** (2000–2500 mots) : page d'entrée du dossier. Répond seul à la requête large. Un `<h2>` par satellite, avec résumé de 3–5 phrases + lien.
- **Satellites** (1300–1400 mots) : longue traîne, un mot-clé cible chacun.
- Le **dossier** est une couche de regroupement **au-dessus** des catégories. La `category` des articles reste celle du domaine (Travail, Troubles Psy…). « Dossier » n'est **jamais** une valeur de `category`.

**Priorité à l'existant.** Un cluster déjà commencé s'étend, il ne se double pas. Si un pilier existe déjà sur un sujet, on l'enrichit plutôt que d'en créer un second ; si un article couvre déjà un mot-clé cible du plan, on le met à jour (`date_modified`, maillage, sources) au lieu d'écrire un doublon qui cannibaliserait le premier. Créer une page concurrente sur un mot-clé qu'on occupe déjà est la faute la plus coûteuse de tout ce processus.

Maillage obligatoire :
- satellite → 1 lien vers le pilier + 2 liens latéraux vers d'autres satellites du lot + 1 lien vers un article existant hors cluster ;
- pilier → un lien vers **chaque** satellite + vers les articles existants rattachés ;
- `articles_lies` : 3 slugs du même cluster.

Les liens vers des satellites non encore générés s'écrivent quand même : tout le lot arrive dans le même commit.

---

## 3. ÉTAT RÉEL DU SITE (réécrit en Phase 0 du 2026-08-31 — fait autorité sur toute proposition antérieure)

**Découverte majeure de la Phase 0 : le mécanisme de clustering existe déjà en production, et il est plus riche que celui que ce document proposait au §5.4.** Il ne s'agit pas d'un simple champ `dossierId` à créer : c'est un système complet, déjà câblé dans `_gen_static.js`.

### 3.0 Les deux mécanismes réels (à ne pas confondre)

**A. Cluster thématique (`theme/{slug}/`)** — c'est le vrai équivalent de « pilier + satellites » de ce plan.
- Source de vérité : `data/clusters.json` (liste des clusters avec `id`, `title`, `excerpt`, et `etapes` = un dictionnaire ordonné d'étapes du parcours, ex. `comprendre → reconnaitre → pourquoi → agir → consulter`).
- Chaque article s'y rattache via deux champs additifs à son JSON : `"cluster": "{id du cluster}"` et `"etape": "{une des clés de etapes}"`.
- `_gen_static.js` génère automatiquement une page hub `theme/{id}/index.html` qui regroupe les articles par étape, et injecte sur chaque article rattaché : un fil d'Ariane « cluster-trail », un widget « pour continuer », et un bloc « étape suivante ». Tout est automatique dès que les deux champs sont posés sur l'article — **il n'y a pas d'entrée séparée à créer à la main pour qu'un article rejoigne un cluster**, seulement l'entrée du cluster lui-même dans `data/clusters.json` s'il est nouveau.
- Le schéma proposé au §5.4 de ce document (fichier `data/dossiers.json` avec `pillarUrl`, `articles: []`) **ne correspond à aucun mécanisme réel et ne doit pas être utilisé pour les clusters**. Il faut utiliser `cluster` + `etape` sur les articles + une entrée dans `data/clusters.json`.
- **Un seul cluster existe aujourd'hui : `emprise-et-relations-toxiques`** (créé le 2026-08-28, il y a 3 jours). Il correspond très largement au LOT 3 de ce plan et le rend en grande partie obsolète tel quel (détail en 3.3).

**B. « Dossier » (`dossiers/{id}/`)** — un mécanisme différent, sans rapport avec les clusters d'articles.
- C'est un **guide unique et long, à chapitres**, pas un regroupement de plusieurs articles. Fichier source `dossiers/{id}.json` (schéma propre : `chapters: [{id, number, title, content}]`), généré en page par `_gen_dossier.ps1` → `dossiers/{id}/index.html`.
- Listé comme card sur `dossiers.html` via `data/dossiers.json` (chargé côté client par `js/main.js`).
- **Un seul dossier existe : `anxiete-guide-complet`** (5 chapitres, publié le 2026-06-10). Il couvre une bonne partie du terrain visé par le pilier du LOT 2, mais dans un format différent (un seul gros article vs pilier + 9 satellites).
- L'anomalie « `dossiers.html` en ligne mais vide » notée en §1 est **caduque** : la page a bien 1 dossier à afficher aujourd'hui. Elle a pu être vide au moment où ce document a été rédigé (avant la création de ce dossier).

**C. `cartes.html`** n'a aucun rapport avec le clustering éditorial : ce sont des cartes interactives de France (ex. carte « où dort-on le mieux »), un format de contenu à part. Rien à réconcilier ici.

**D. `sitemap.xml` : anomalie également caduque.** `_gen_static.js` le régénère intégralement à chaque run (pages statiques, pages de navigation, dossiers, hubs de clusters, articles). État actuel : **92 URLs**, dont 79 articles publiés, 1 dossier, 1 hub de cluster. Le chiffre « 16 URLs » du §1 date d'avant la mise en place de cette génération automatique. **Aucune action nécessaire.**

### 3.1 Ampleur réelle du corpus (bien plus grande que ce que ce plan supposait)
- **199 articles** au total (le plan d'origine, écrit « depuis l'extérieur », n'en connaissait que ~25).
- **78 `published`**, **120 `scheduled`** (calendrier éditorial déjà rempli jusqu'à **mi-2027**), **1 sans champ `status`** (`a-partir-de-quel-age-est-on-vieux` — anomalie de données à corriger séparément, hors périmètre de ce plan).
- Maillage : 168 articles sur 199 n'ont **aucun lien entrant** (orphelins au sens strict du plan). 13 liens internes cassés relevés (détail en fin de §3, à corriger indépendamment des lots).
- 95 fichiers quiz existent dans `tests/`, mais `data/tests.json` (la page Tests) n'en liste que 23 : la majorité des quiz (souvent liés aux articles « sur le divan ») ne sont pas visibles depuis la page Tests. Point à trancher séparément (hors périmètre de ce plan).

### 3.2 Détail du cluster réel `emprise-et-relations-toxiques`
17 articles déjà rattachés, répartis sur les 5 étapes définies dans `data/clusters.json` :

| Étape | Articles rattachés | Statut |
|---|---|---|
| comprendre | `du-crush-au-crash-anatomie-histoires-amour`, `estime-de-soi`, `lamour-est-il-une-arnaque`, `dans-la-tete-d-un-pervers-narcissique` | 2 publiés, 2 scheduled |
| reconnaitre | `relation-toxique-signes`, `notre-radar-interieur`, `7-signes-personne-narcissique` | 2 publiés, 1 scheduled |
| pourquoi | `meres-toxiques-comprendre-pour-se-reconstruire`, `couple-quand-faut-il-se-quitter`, `parents-emotionnellement-immatures-faire-plaisir`, `pourquoi-accepte-t-on-l-inacceptable`, `pourquoi-tomber-amoureux-du-meme-type-de-personne`, `traumatismes-invisibles-enfance` | 1 publié, 5 scheduled |
| agir | `survivre-relation-toxique`, `cinq-reflexes-se-proteger-pervers-narcissique` | 1 publié, 1 scheduled |
| consulter | `se-reconstruire-apres-emprise`, `refaire-confiance-apres-pervers-narcissique` | 1 publié, 1 scheduled |

Ce cluster est déjà **substantiel et actif** (nouvel article encore ajouté le 2026-08-28). Il n'a pas de pilier unique désigné comme tel — chaque étape agrège plusieurs articles — ce qui diffère du modèle « 1 pilier + satellites » de ce document mais fonctionne par la page hub `theme/emprise-et-relations-toxiques/`.

### 3.3 Réconciliation des 6 lots proposés

> ⚠️ Les collisions identifiées ci-dessous ne sont **pas tranchées** : conformément au §4.B.7, la décision (fusion / mise à jour de l'existant / abandon de la ligne) revient à l'utilisateur, lot par lot, au moment de sa production.

**LOT 1 — Souffrance au travail : à produire, aucune collision bloquante.**
Existants confirmés : `burnout-epuisement-professionnel`, `techniques-anti-stress`. **`blues-du-dimanche-soir` existe déjà** (non signalé par le plan d'origine) — à vérifier avant de le recréer : soit c'est déjà la ligne #1 du lot et il faut l'enrichir/rattacher plutôt que le réécrire, soit c'est un doublon à fusionner. Les 8 autres lignes semblent réellement à écrire. Aucun cluster `data/clusters.json` n'existe encore pour ce lot — à créer si le lot est lancé (mécanisme réel, pas le schéma §5.4).

**LOT 2 — Anxiété : chevauchement fort avec le dossier `anxiete-guide-complet`, à trancher avant production.**
Existants confirmés : `crise-angoisse`, `trouble-anxieux-generalise`. Le pilier prévu (`anxiete-guide-complet`) est déjà pris — **c'est l'id du dossier à chapitres existant**, pas un article classique : collision de slug certaine, à renommer si le lot est lancé. Découvertes supplémentaires non listées par le plan : `se-debarrasser-anxiete-pour-toujours`, `cerveau-imagine-toujours-le-pire-trouble-anxieux-generalise` (angle « catastrophisme », proche de la ligne #4 anxiété anticipatoire), `refus-scolaire-anxieux-enfant-refuse-ecole` (angle enfant, distinct). À arbitrer : produire ce lot comme un vrai cluster `theme/anxiete/` en complément du dossier existant, ou enrichir le dossier à chapitres plutôt que dupliquer le sujet sous deux formats.

**LOT 3 — Emprise et relations toxiques : très largement déjà produit sous forme de cluster réel (voir §3.2). Ne pas relancer tel quel.**
Sur les 8 lignes proposées : `sortir-relation-toxique` (#7) entre en collision directe avec `survivre-relation-toxique` (déjà publié, étape agir) ; `pervers-narcissique-signes` (#1) chevauche fortement `7-signes-personne-narcissique` + `dans-la-tete-d-un-pervers-narcissique` déjà existants. En revanche, `gaslighting-manipulation`, `love-bombing`, `dependance-affective`, `styles-attachement`, `punition-par-le-silence`, `violences-psychologiques-couple` ne semblent pas couverts — ce sont de vrais trous dans le cluster existant, à écrire **en les rattachant au cluster réel** (`cluster: "emprise-et-relations-toxiques"` + `etape` appropriée) plutôt qu'en créant un nouveau pilier `emprise-relation-toxique-guide` qui ferait doublon avec la page hub déjà générée.

**LOT 4 — Sommeil : à produire, aucune collision bloquante.**
Existants confirmés : `vaincre-insomnie`, `sommeil-sante-mentale`. Les 9 lignes semblent réellement à écrire. Aucun cluster réel n'existe encore — à créer.

**LOT 5 — Comprendre ses émotions : plusieurs lignes déjà couvertes, et complication de rattachement multiple.**
Existants confirmés : `resilience-emotionnelle` (top article du site par liens entrants), `estime-de-soi`, `freins-au-bonheur`. Découvertes non listées par le plan : **`a-quoi-sert-la-honte` existe déjà** — collision directe avec la ligne #5 (« La honte : l'émotion dont personne ne parle ») ; `pleurer-de-colere` chevauche la ligne #6 (« Pleurer pour un rien ») ; `parents-emotionnellement-immatures-faire-plaisir` existe aussi. Point de vigilance supplémentaire : `estime-de-soi` est **déjà rattaché au cluster `emprise-et-relations-toxiques`** — un même article peut difficilement afficher deux fils d'Ariane de cluster différents, donc le récupérer comme pilier informel du LOT 5 demande de clarifier son rattachement.

**LOT 6 — Neuroatypie adulte : le plan d'origine ignorait un pan entier de contenu déjà publié. Pilier proposé en collision directe.**
Le plan ne listait aucun « existant », mais le site a déjà : `tdah-adulte-la-revelation` (**3e article du site par liens entrants — pilier de fait**), `tdah-adulte-commencer-sans-jamais-finir`, `hpi-invisible-identification-tardive-adulte`, `et-si-vous-etiez-hpi`, `meilleurs-livres-tdah-comparatif`. Le pilier prévu `tdah-adulte-guide` ferait doublon avec `tdah-adulte-la-revelation`, qui joue déjà ce rôle dans le maillage réel. Ce lot demande la réconciliation la plus profonde des six avant toute production.

### 3.4 Liens internes cassés relevés (indépendant des lots, à corriger séparément)
`a-quoi-sert-la-honte`, `et-si-vous-etiez-hpi`, `le-diable-sur-le-divan`, `leonard-de-vinci-sur-le-divan`, `meres-toxiques-comprendre-pour-se-reconstruire`, `monde-dirige-par-femmes`, `pourquoi-accepte-t-on-l-inacceptable`, `pourquoi-certaines-personnes-s-eloignent-quand-la-relation-devient-serieuse`, `shrek-sur-le-divan` contiennent des liens vers des slugs inexistants (essentiellement d'anciens liens en `.html` datant d'avant la migration d'URL, et deux références à un article `pourquoi-attires-par-ceux-qui-nous-donnent-peu-d-attention` qui n'a jamais été créé).

---

## 4. PROCÉDURE D'UN RUN

### Phase 0 — Inventaire et réconciliation *(obligatoire, avant toute écriture)*

**Le présupposé de départ est qu'un travail de clusterisation existe déjà et qu'il fait autorité sur le plan du §3.** Objectif de cette phase : le retrouver, le cartographier, et n'écrire ensuite que ce qui manque réellement.

**A. Inventaire de l'existant**

1. Lister `articles/*.json` : pour chaque article, relever `id`, `title`, `category`, `tags`, `status`, `date`, `articles_lies`, et tout champ de regroupement non prévu ici (`dossier`, `cluster`, `serie`, `pilier`…). Sortir le résultat en tableau.
2. Construire le **graphe de maillage réel** : qui lie qui, via `content` et `articles_lies`. Les articles qui concentrent les liens entrants sont des piliers de fait, même s'ils ne sont pas étiquetés comme tels.
3. Repérer les clusters déjà constitués : groupes d'articles liés entre eux et/ou partageant des tags. Nommer chacun, identifier son pilier, lister ses satellites, et dire s'il est complet ou en cours.
4. Ouvrir `dossiers.html`, `cartes.html`, `tests.html` **et leur code de génération** dans `_gen_static.js`. Chercher tout fichier de données associé (`data/*.json`). La page « Cartes » en particulier : déterminer ce qu'elle contient et si elle porte déjà une structure de clusters.
5. Relever les articles orphelins (aucun lien entrant) et les slugs référencés en lien mais inexistants.

**B. Réconciliation avec le §3**

6. Produire un tableau croisé : pour chaque lot et chaque ligne du plan §3 →
   `déjà publié` / `déjà planifié` / `couvert par un article existant sous un autre angle` / `réellement à écrire` / `à supprimer du plan car hors stratégie`.
7. Signaler toute **collision de mot-clé** entre le plan et un article existant. Proposer, pour chacune : fusion, mise à jour de l'existant, ou abandon de la ligne du plan. Ne jamais trancher seul.
8. Signaler les clusters existants **absents du §3** : ils doivent y entrer, avec leurs lignes manquantes, plutôt que d'être ignorés.
9. **Réécrire la section 3 de ce fichier** pour qu'elle décrive l'état réel : clusters existants d'abord, avec ce qui reste à produire pour chacun ; les 6 lots proposés ensuite, expurgés des doublons. Retirer l'avertissement en tête du §3 une fois l'opération faite.

**C. Points techniques**

10. Ouvrir les 3 articles les plus récents — référence de style, structure HTML, format JSON. Ne pas se fier à la mémoire du schéma : lire les fichiers.
11. Ouvrir un quiz existant dans `tests/` — reprendre sa structure à l'identique. Lire `data/tests.json`.
12. Lire `_check_quizzes.js`.
13. **Les dossiers** : déterminer comment `dossiers.html` se remplit (`data/dossiers.json` ? champ dans les JSON d'articles ? boucle du générateur ? template en dur ?). Si un mécanisme existe déjà, l'utiliser — le schéma du §5.4 n'est qu'un repli à proposer si rien n'existe.
14. `sitemap.xml` : 16 URLs pour 25+ articles publiés. Identifier la cause.

→ **Rendre le rapport (A + B + C) et attendre validation explicite avant d'écrire le moindre article.** Aucun fichier créé pendant la Phase 0, hormis la réécriture du §3 de ce document.

### Phase 1 — Génération
Voir specs §5 et règles §6–7. Produire pilier + satellites, et les quiz marqués —.

### Phase 2 — Validation *(après CHAQUE article, pas à la fin)*

```bash
node -e "JSON.parse(require('fs').readFileSync('./articles/{id}.json','utf8'));console.log('JSON valide ✓')"
node -e "const j=require('./articles/{id}.json');const m=j.content.match(/src=\"([^\"]+)\"/);console.log(m?.[1])"
```

Le second doit afficher `tests/...`, **jamais** `/tests/...`. Un JSON invalide = 404 garantie : corriger avant l'article suivant.

Puis, lot complet :

```bash
node _gen_static.js
node _check_quizzes.js
```

Tous les `{id}.json` du lot doivent apparaître en **OK**, aucun en **MANQUANT**. Vérifier que les nouvelles URLs entrent bien dans `sitemap.xml`.

### Phase 3 — `data/tests.json`
Ajouter une entrée **uniquement** pour les articles dont la date est ≤ aujourd'hui. Les quiz différés vont dans `_plan/tests-a-ajouter.md` (entrée JSON prête à coller + date d'activation).

### Phase 3 bis — Enregistrement du dossier
Après validation du mécanisme en Phase 0. Articles planifiés en date future → `_plan/dossiers-a-completer.md`. Un dossier dont le pilier n'est pas publié reste en `status: "draft"`.

### Phase 4 — Commit
Un seul commit par lot, après validation complète :

```bash
git add articles/ tests/ data/ sitemap.xml _plan/
git commit -m "feat(cluster): lot N — {dossier} (X articles + Y quiz)"
```

**Ne pas pousser sans demander.**

### Phase 5 — Journal
Mettre à jour le §8 : tableau récapitulatif (slug · titre · catégorie · date planifiée · quiz · nb de liens internes · nb de sources), puis, séparément :
- l'état du dossier (créé / en attente / différé) et les articles restant à y rattacher ;
- les affirmations non sourçables qui ont été retirées ;
- les liens internes pointant vers des slugs inexistants ;
- tout écart au plan et sa raison.

---

## 5. SPÉCIFICATIONS TECHNIQUES

### 5.1 — Article : `articles/{id}.json`

```json
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
  "content": "<p>Contenu HTML…</p>\n\n<h2>Titre du quiz</h2>\n<p>Courte intro invitant au quiz.</p>\n<iframe src=\"tests/{id}-quiz.html\" style=\"width:100%;border:none;min-height:580px;border-radius:12px\" loading=\"lazy\" title=\"Titre du quiz\" id=\"quiz-frame-{id}\"></iframe>\n<script>window.addEventListener('message',function(e){if(e.data&&e.data.type==='quiz-resize'){var f=document.getElementById('quiz-frame-{id}');if(f)f.style.minHeight=(e.data.height+32)+'px';}});</script>",
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
  "status": "scheduled"
}
```

Règles :
- `{id}` remplacé partout par le même slug.
- **RÈGLE ABSOLUE `src`** : toujours `src="tests/{id}-quiz.html"`, **jamais** de slash initial. La page article a `<base href="../../">` : un slash crée un double slash en local.
- Le `</script>` dans la string JSON ne nécessite pas d'échappement supplémentaire.
- **Pas de champ `"quiz"`** : il n'existe pas dans le schéma.
- Le bloc iframe + script n'est présent que sur les articles marqués — dans le plan.

Balises autorisées dans `content` : `<p> <h2> <h3> <ul><li> <ol><li> <strong> <em> <blockquote> <a> <br>`. Seule exception : le bloc iframe/script en fin de `content`. Aucun autre `<div>`, `<style>`, `<script>`.

Liens externes :
```html
<a href="https://URL-EXACTE" target="_blank" rel="noopener noreferrer" class="ref-link" title="Auteur (Année) — Description">Texte affiché</a>
```

Liens internes : `<a href="slug-de-larticle/">Texte</a>` — slug + slash final, aucun préfixe.

**Catégories valides** (casse et accents obligatoires) :
`Bien-être` | `Sommeil` | `Troubles Psy` | `Thérapies` | `Relations` | `Développement personnel` | `Travail` | `Émotions & identité` | `Neurosciences & genre` | `Société` | `Société & psychologie politique` | `Sexo` | `Nos héros sur le divan` | `Les monstres sur le divan`

**Encodage** : caractères français directs en UTF-8 (`é è ê ë à â ä ù û ü î ï ô ö ç œ æ — « » …`). Jamais d'entités HTML (`&eacute;`) ni de `&#XXXX;`. Em-dash `—`, jamais `--`. Les `"` du HTML s'écrivent `\"` en JSON, les sauts de ligne `\n`.

**Sources** : `authors`, `year`, `title` obligatoires ; `journal` pour les revues, `publisher` pour les livres ; `url` = DOI ou PubMed, omis si incertain ; `amazon_asin` = 10 caractères après `/dp/` sur amazon.fr, **jamais inventé**, champ omis si inconnu.

### 5.2 — Quiz : `tests/{id}-quiz.html`

Fichier HTML complet et autonome. `<head>` dans cet ordre exact :

```html
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
```

Obligatoire dans le script :

```js
function notifyResize() {
  setTimeout(function() {
    window.parent.postMessage({ type: 'quiz-resize', height: document.body.scrollHeight }, '*');
  }, 50);
}
```

`notifyResize()` appelée après **chaque** changement d'état : chaque question, l'écran de résultat, « Recommencer ». Plus `window.addEventListener('load', notifyResize)` en fin de script.

Boutons de partage dans l'écran de résultat :

```html
<a href="https://www.facebook.com/sharer/sharer.php?u=ENCODED_URL" target="_blank" rel="noopener">📘 Facebook</a>
<a href="https://twitter.com/intent/tweet?text=ENCODED_TEXT&url=ENCODED_URL" target="_blank" rel="noopener">🐦 Twitter</a>
<a href="https://wa.me/?text=ENCODED_TEXT_URL" target="_blank" rel="noopener">💬 WhatsApp</a>
```

Disclaimer dans l'écran de résultat :

```
⚠️ Rappel important : Ce questionnaire est un outil de réflexion, pas un diagnostic.
Seul un professionnel de santé peut évaluer votre situation.
En cas de détresse, appelez le 3114 (gratuit, 24h/24).
```

Deux types de quiz :
- **profils** : chaque réponse vote pour un profil (A/B/C/D…) → profil dominant.
- **score** : chaque réponse vaut 0–3 points → total → profil par seuil.

Dans les deux cas : conseils personnalisés de 5–6 lignes, **réellement différents** d'un profil à l'autre. Jamais de texte générique recyclé.

### 5.3 — Entrée `data/tests.json`

À ajouter **en tête** du tableau, uniquement si l'article est publié (`published`, ou `scheduled` avec date ≤ aujourd'hui) :

```json
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
```

### 5.4 — Entrée dossier *(schéma proposé, à valider en Phase 0)*

```json
{
  "id": "souffrance-au-travail",
  "title": "Souffrance au travail",
  "desc": "Burn-out, bore-out, harcèlement, charge mentale : comprendre ce qui use au travail et savoir quoi faire.",
  "emoji": "💼",
  "color": "#1F4E6B",
  "pillarUrl": "articles/souffrance-au-travail-guide/",
  "image": "",
  "articles": ["souffrance-au-travail-guide", "blues-du-dimanche-soir"],
  "status": "published"
}
```

`articles` : ordre de lecture conseillé, pilier en premier, uniquement les slugs déjà publiés.

---

## 6. RÈGLES SEO

1. Mot-clé cible dans les **40 premiers caractères** du `title`. `<title>` ≤ 60 caractères.
2. `metaDescription` : 140–160 caractères, mot-clé + promesse + verbe d'action.
3. Premier paragraphe = **réponse directe** à la requête, avant tout contexte.
4. `<h2>` formulés en questions type People Also Ask (« C'est quoi… ? », « Combien de temps… ? », « Est-ce que… ? »), avec réponse de 2–3 phrases immédiatement dessous — pêche au featured snippet.
5. Minimum 4 liens internes sortants par article (voir §2).
6. `tags` : 3 à 5, minuscules à tirets, cohérents dans tout le cluster.
7. Sources **francophones** en priorité : HAS, Inserm, Santé publique France, ANSM, INRS, revues FR. 1 à 2 sources internationales maximum, DOI vérifiable.
8. Disclaimer 3114 dans chaque quiz. 3919 en plus sur le lot 3.

---

## 7. STYLE ET INTERDITS

Ton : sérieux et humoristique, registre Psychologies Magazine. Vulgarisation rigoureuse, jamais condescendante.

À proscrire :
- le remplissage — 1300 mots denses valent mieux que 1400 dilués ;
- les transitions creuses (« Dans cet article, nous allons voir… ») ;
- l'humour plaqué en fin de paragraphe : l'humour est dans la formulation, pas dans les blagues rapportées ;
- les listes à puces partout — le corps reste rédigé, les listes servent aux énumérations réelles ;
- les promesses thérapeutiques : on informe, on oriente, on ne soigne pas ;
- **les chiffres sans source, les DOI, URL et ASIN inventés.** Une source inventée est une faute grave, pas un détail. En cas de doute : retirer l'affirmation.

---

## 8. JOURNAL D'AVANCEMENT
*(section maintenue par Claude Code — à mettre à jour à la fin de chaque run, avant de rendre la main)*

| Lot | Dossier | Statut | Date du run | Articles | Quiz | Commit |
|---|---|---|---|---|---|---|
| 1 | souffrance-au-travail | à produire | — | 0/10 | 0/3 | — |
| 2 | anxiete | à produire | — | 0/10 | 0/2 | — |
| 3 | emprise-relations-toxiques | à produire | — | 0/9 | 0/3 | — |
| 4 | sommeil | à produire | — | 0/10 | 0/2 | — |
| 5 | emotions | à produire | — | 0/9 | 0/2 | — |
| 6 | neuroatypie-adulte | à produire | — | 0/9 | 0/2 | — |

### Clusters existants relevés dans le repo
*(table qui fait autorité, pas le §3 d'origine — voir détail §3.0–3.2)*

| Cluster | Mécanisme | Pilier / hub | Articles rattachés | Dossier créé ? |
|---|---|---|---|---|
| `emprise-et-relations-toxiques` | cluster réel (`theme/`) | pas de pilier unique — hub `theme/emprise-et-relations-toxiques/` agrégeant 5 étapes | 17 (10 publiés, 7 scheduled) | `data/clusters.json` : oui |
| `anxiete-guide-complet` | dossier à chapitres (`dossiers/`) | guide unique en 5 chapitres, pas un cluster d'articles | — (contenu interne au dossier) | `data/dossiers.json` : oui |

### Décisions techniques actées
*(à compléter au fil des runs)*

- [x] **Inventaire des clusters existants : réalisé (2026-08-31).** Deux mécanismes distincts identifiés : cluster réel `cluster`+`etape`+`data/clusters.json`→`theme/{id}/` (voir §3.0.A) et dossier à chapitres `dossiers/{id}.json`→`dossiers/{id}/` (voir §3.0.B). Le schéma proposé au §5.4 de ce document est obsolète et ne doit pas être utilisé pour les clusters.
- [x] Mécanisme `dossiers.html` : **déterminé** — cards rendues côté client par `js/main.js` depuis `data/dossiers.json`. La page n'est plus vide (1 dossier publié).
- [x] Contenu et rôle de `cartes.html` : **déterminé** — cartes interactives de France, sans rapport avec le clustering éditorial.
- [x] `sitemap.xml` : **caduc, déjà résolu** — généré automatiquement par `_gen_static.js` à chaque run (92 URLs actuellement : pages statiques, nav, 1 dossier, 1 hub cluster, 79 articles publiés).
- [ ] Anomalie de données hors périmètre : l'article `a-partir-de-quel-age-est-on-vieux` n'a pas de champ `status`.
- [ ] 72 des 95 fichiers quiz existants (`tests/*.html`) ne sont pas référencés dans `data/tests.json` — à investiguer séparément (hors périmètre de ce plan).
- [ ] 13 liens internes cassés relevés (détail §3.4) — à corriger indépendamment des lots.

### Notes de run

**Run du 2026-08-31 — Phase 0 (inventaire et réconciliation), aucun article écrit.**
- Écart majeur au plan d'origine : celui-ci a été rédigé sans connaître les 199 articles réels du site (il en supposait ~25) ni le mécanisme de cluster déjà en production. Section 3 entièrement réécrite en conséquence (voir §3).
- Collisions de mot-clé signalées mais **non tranchées**, en attente de décision utilisateur lot par lot : `blues-du-dimanche-soir` (Lot 1), pilier `anxiete-guide-complet` déjà pris par un dossier (Lot 2), `sortir-relation-toxique`/`survivre-relation-toxique` et `pervers-narcissique-signes`/`7-signes-personne-narcissique` (Lot 3), `a-quoi-sert-la-honte` et `pleurer-de-colere` (Lot 5), pilier `tdah-adulte-guide` déjà tenu de fait par `tdah-adulte-la-revelation` (Lot 6).
- Aucun lot n'a été produit. En attente de validation de ce rapport avant de lancer la Phase 1 sur un lot.
