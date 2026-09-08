// Génération des pages HTML statiques SEO — Oui Psycho!
const fs   = require('fs');
const path = require('path');
// Gabarit article partagé avec poulet.html (voir js/article-template.js) —
// source unique, ne jamais réintroduire de copie locale de ce template ici.
const ArticleTemplate = require('./js/article-template.js');

const BASE  = 'https://ouipsycho.fr';
const DIR   = path.join(__dirname, 'articles');
const YEAR  = new Date().getFullYear();
const TODAY = new Date().toISOString().split('T')[0];  // YYYY-MM-DD, pour filtrer les articles planifiés

const MONTHS = ['','janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

// Date de dernière modification effective : ignore date_modified si antérieure
// (ou égale) à date — évite d'afficher/déclarer une "mise à jour" avant la
// publication (donnée éditoriale mal renseignée). Utilisé partout où date_modified
// est lu (JSON-LD, meta, affichage), pour garantir une seule source de vérité.
function effectiveModified(a) {
  return (a.date_modified && a.date_modified > a.date) ? a.date_modified : a.date;
}

// Couleurs des cards statiques (renderCardStatic/renderFeaturedStatic) — déclaré
// ici (plutôt que juste avant son usage plus bas) pour être disponible dès la
// génération de la page hub /theme/{slug}/, qui rend des cards avant la section
// "Injection des cards statiques" historique.
const CATS_CARD = {
  'Bien-être':                       { color: '#059669', bg: '#ECFDF5' },
  'Relations':                       { color: '#BE185D', bg: '#FDF2F8' },
  'Sommeil':                         { color: '#0369A1', bg: '#ECFEFF' },
  'Troubles Psy':                    { color: '#7C3AED', bg: '#F5F3FF' },
  'Thérapies':                       { color: '#6D28D9', bg: '#EDE9FE' },
  'Développement personnel':         { color: '#15803D', bg: '#F0FDF4' },
  'Nos héros sur le divan':          { color: '#EA580C', bg: '#FFF7ED' },
  'Les monstres sur le divan':       { color: '#9B1C1C', bg: '#FFF5F5' },
  'Sexo':                            { color: '#C2185B', bg: '#FCE4EC' },
  'Société':                         { color: '#1E40AF', bg: '#EFF6FF' },
  'Société & psychologie politique': { color: '#1E40AF', bg: '#EFF6FF' },
  'Travail':                         { color: '#1e293b', bg: '#e2e8f0' },
  'Émotions & identité':             { color: '#6a2a4a', bg: '#f5edf2' },
};

const jsonFiles = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));

// ── Clusters thématiques (maillage) ──────────────────────────────────────────
// Source de vérité : data/clusters.json. Un article s'y rattache via les champs
// additifs j.cluster (slug) + j.etape (une des clés de cluster.etapes) — absents
// par défaut, donc totalement neutres pour tout article qui ne les renseigne pas.
const CLUSTERS_FILE = path.join(__dirname, 'data', 'clusters.json');
let CLUSTERS = [];
try { CLUSTERS = JSON.parse(fs.readFileSync(CLUSTERS_FILE, 'utf8')); } catch (_) {}
const CLUSTERS_BY_ID = Object.fromEntries(CLUSTERS.map(c => [c.id, c]));

// Chargée ici (avant la boucle articles) car js/article-template.js en a besoin
// pour résoudre les tokens de maillage {{ressource:...}}/ressourceCard dans le
// contenu de CHAQUE article — la génération des pages /ressources/{slug}/
// elles-mêmes n'a lieu que plus bas dans ce fichier, mais la donnée doit être
// disponible dès maintenant.
const RESSOURCES_FILE = path.join(__dirname, 'ressources.json');
let RESSOURCES = [];
try { RESSOURCES = JSON.parse(fs.readFileSync(RESSOURCES_FILE, 'utf8')).ressources || []; } catch (_) {}

// Pré-passe : appartenance cluster/étape des articles "en ligne" au sens où le
// reste du site l'entend déjà (cf. bascule scheduled→published plus bas) :
// status !== 'draft' et date <= TODAY. Alimente le fil de parcours, le widget
// "Pour continuer" et le bloc de fin d'article. La page hub, elle, applique une
// règle strictement plus stricte (status === 'published' uniquement) — voir la
// section dédiée plus bas dans ce fichier.
const clusterMembers = {}; // { clusterId: { etapeSlug: [{ id, title }] } }
for (const file of jsonFiles) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  if (!j.cluster || !j.etape) continue;
  if ((j.status || 'published') === 'draft') continue;
  if (j.date > TODAY) continue;
  const cluster = CLUSTERS_BY_ID[j.cluster];
  if (!cluster || !cluster.etapes || !cluster.etapes[j.etape]) continue; // rattachement invalide, ignoré ici (voir verify-robots-consistency.js)
  if (!clusterMembers[j.cluster]) clusterMembers[j.cluster] = {};
  if (!clusterMembers[j.cluster][j.etape]) clusterMembers[j.cluster][j.etape] = [];
  clusterMembers[j.cluster][j.etape].push({ id: j.id, title: j.title, image: j.image || '' });
}

for (const file of jsonFiles) {
  const j   = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  // Article dont la date n'est pas encore arrivée → on ne génère rien du tout
  // (couvre status=scheduled ET status=published avec date future)
  if (j.date > TODAY) {
    console.log(`⏳ articles/${j.id}/ ignoré — date future (${j.date})`);
    continue;
  }

  // Un article "scheduled" dont la date est atteinte est en ligne (le filtrage
  // d'affichage ne dépend que de la date, cf. filtres plus bas) : on aligne le
  // statut source sur la réalité pour que l'éditeur n'affiche plus "Planifié"
  // indéfiniment sur un article déjà publié.
  if (j.status === 'scheduled') {
    j.status = 'published';
    fs.writeFileSync(path.join(DIR, file), JSON.stringify(j, null, 2), 'utf8');
    console.log(`✓ articles/${j.id} — status scheduled → published`);
  }

  // Cluster thématique résolu (maillage) — null si l'article n'a pas de cluster,
  // ou si le cluster/l'étape déclarés ne résolvent pas (donnée invalide, déjà
  // signalée par verify-robots-consistency.js). Dans tous ces cas, additif : les
  // variables *ClusterHtml/*WidgetHtml ci-dessous restent vides et l'article se
  // génère à l'identique de l'existant.
  const clusterResolved = (j.cluster && j.etape && CLUSTERS_BY_ID[j.cluster] &&
    CLUSTERS_BY_ID[j.cluster].etapes && CLUSTERS_BY_ID[j.cluster].etapes[j.etape])
    ? CLUSTERS_BY_ID[j.cluster]
    : null;

  // Fil de parcours (sous le h1) — n'affiche que les étapes ayant au moins un
  // article en ligne ; l'étape courante n'est pas cliquable ; rendu horizontal
  // qui s'enveloppe librement, sans plafond de lignes (voir .cluster-trail).
  let clusterTrailHtml = '';
  if (clusterResolved) {
    const stageSlugs = Object.keys(clusterResolved.etapes).filter(s =>
      clusterMembers[j.cluster] && clusterMembers[j.cluster][s] && clusterMembers[j.cluster][s].length
    );
    if (stageSlugs.length) {
      const stepsHtml = stageSlugs.map(s => {
        const label = escCard(clusterResolved.etapes[s]);
        if (s === j.etape) {
          return `<span class="cluster-trail__step cluster-trail__step--current" aria-current="step">${label}</span>`;
        }
        // Une seule étape publiée à cette étape : lien direct vers l'article
        // plutôt que vers l'ancre du hub (évite un détour pour rien). Dès 2
        // articles ou plus, on renvoie vers l'ancre comme avant — seul le fil
        // de parcours des pages article est concerné ; le sommaire de la page
        // hub garde ses ancres dans tous les cas (voir tocHtml plus bas).
        const stageMembers = clusterMembers[j.cluster][s];
        const stepHref = stageMembers.length === 1
          ? `articles/${escCard(stageMembers[0].id)}/`
          : `theme/${escCard(clusterResolved.id)}/#etape-${s}`;
        return `<a class="cluster-trail__step" href="${stepHref}">${label}</a>`;
      }).join('<span class="cluster-trail__sep" aria-hidden="true">→</span>');
      clusterTrailHtml = `\n          <nav class="cluster-trail" aria-label="Parcours : ${escCard(clusterResolved.title)}">` +
        `<a class="cluster-trail__hub" href="theme/${escCard(clusterResolved.id)}/">${escCard(clusterResolved.title)}</a>` +
        `<span class="cluster-trail__sep" aria-hidden="true">→</span>${stepsHtml}</nav>`;
    }
  }

  // Widget sidebar "Pour continuer" — remplace le shell vide "À lire aussi" pour
  // les articles en cluster. loadRelated() n'est alors plus appelée côté client
  // (js/main.js) pour ces articles, donc ce contenu statique n'est jamais écrasé.
  let relatedWidgetHtml = '<h2 class="widget__title">À lire aussi</h2>';
  if (clusterResolved) {
    const stageOrder = Object.keys(clusterResolved.etapes);
    const currentIdx = stageOrder.indexOf(j.etape);
    let nextStageSlug = null;
    for (let i = currentIdx + 1; i < stageOrder.length; i++) {
      const s = stageOrder[i];
      if (clusterMembers[j.cluster] && clusterMembers[j.cluster][s] && clusterMembers[j.cluster][s].length) {
        nextStageSlug = s;
        break;
      }
    }
    const widgetLinks = [];
    if (nextStageSlug) {
      widgetLinks.push(`<a href="theme/${escCard(clusterResolved.id)}/#etape-${nextStageSlug}">Étape suivante : ${escCard(clusterResolved.etapes[nextStageSlug])}</a>`);
    }
    widgetLinks.push(`<a href="theme/${escCard(clusterResolved.id)}/">Voir tout le parcours « ${escCard(clusterResolved.title)} »</a>`);
    relatedWidgetHtml = `<h2 class="widget__title">Pour continuer</h2>\n        <div class="widget-links">\n          ${widgetLinks.join('\n          ')}\n        </div>`;
  }

  // Bloc "Pour continuer" en fin d'article-body — jusqu'à 3 liens piochés dans
  // le cluster (hors article courant), répartis par étape pour varier les
  // angles plutôt que de prendre 3 articles de la même étape. Un <p> (pas un
  // <h2>/<h3>) pour le titre : évite que buildTOC() (js/main.js) ne le capture
  // comme une section du contenu.
  let continueBlockHtml = '';
  if (clusterResolved) {
    const stageOrder = Object.keys(clusterResolved.etapes);
    const picks = [];
    for (const s of stageOrder) {
      const members = (clusterMembers[j.cluster] && clusterMembers[j.cluster][s]) || [];
      for (const m of members) {
        if (m.id === j.id) continue;
        picks.push(m);
      }
    }
    const chosen = picks.slice(0, 3);
    if (chosen.length >= 2) {
      const items = chosen.map(m => {
        const thumbStyle = m.image ? ` style="background-image:url('${escCard(m.image)}')"` : '';
        const thumbFallback = m.image ? '' : '🧠';
        return `<li class="article-continue__item"><a href="articles/${escCard(m.id)}/" class="article-continue__link"><span class="article-continue__thumb"${thumbStyle} aria-hidden="true">${thumbFallback}</span><span class="article-continue__link-title">${escCard(m.title)}</span></a></li>`;
      }).join('\n              ');
      continueBlockHtml = `\n          <div class="article-continue">\n            <p class="article-continue__title">Pour continuer</p>\n            <ul class="article-continue__list">\n              ${items}\n            </ul>\n            <a class="article-continue__hub-link" href="theme/${escCard(clusterResolved.id)}/">Voir le parcours complet « ${escCard(clusterResolved.title)} » →</a>\n          </div>`;
    }
  }

  // Options cluster pour le gabarit partagé (js/article-template.js) — vide
  // pour tout article hors cluster, le gabarit applique alors ses propres
  // valeurs par défaut (catégorie en fil d'Ariane, "À lire aussi" vide).
  const templateOpts = { clusterTrailHtml, relatedWidgetHtml, continueBlockHtml, ressources: RESSOURCES };
  if (clusterResolved) {
    templateOpts.breadcrumbHref = `theme/${clusterResolved.id}/`;
    templateOpts.breadcrumbLabel = clusterResolved.title;
    templateOpts.breadcrumbLevel2 = { "@type": "ListItem", "position": 2, "name": clusterResolved.title, "item": `${BASE}/theme/${clusterResolved.id}/` };
  }

  const html = ArticleTemplate.buildArticleHTML(j, templateOpts);

  const outDir = path.join(__dirname, 'articles', j.id);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  console.log(`✓ articles/${j.id}/index.html`);

  // ── Redirection depuis la racine /slug/ → /articles/slug/ ──
  const rootDir = path.join(__dirname, j.id);
  if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir, { recursive: true });
  const redirectHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${BASE}/articles/${j.id}/">
  <meta http-equiv="refresh" content="0; url=/articles/${j.id}/">
  <title>Redirection…</title>
</head>
<body>
  <p><a href="/articles/${j.id}/">Cliquez ici</a> si vous n'êtes pas redirigé automatiquement.</p>
  <script>window.location.replace('/articles/${j.id}/');<\/script>
</body>
</html>`;
  fs.writeFileSync(path.join(rootDir, 'index.html'), redirectHtml, 'utf8');
  console.log(`  ↳ redirection ${j.id}/index.html → /articles/${j.id}/`);
}

// ── Mise à jour de data/articles.json (index page d'accueil) ─────────────────
const INDEX_FILE = path.join(__dirname, 'data', 'articles.json');
let existingIndex = [];
try { existingIndex = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')); } catch(_) {}

const newIndex = jsonFiles.map(file => {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  // Ne garde que les champs de l'index (pas content, keypoints, sources)
  return {
    id:              j.id,
    title:           j.title,
    excerpt:         j.excerpt          || '',
    date:            j.date,
    date_modified:   j.date_modified    || j.date,
    category:        j.category,
    image:           j.image            || '',
    imagePosition:   j.imagePosition    || '50% 50%',
    imageZoom:       j.imageZoom        || 1,
    imageGravity:    j.imageGravity     || 'none',
    imageLayout:     j.imageLayout      || 'top',
    readTime:        j.readTime,
    author:          j.author,
    tags:            j.tags             || [],
    metaDescription: j.metaDescription  || '',
    articles_lies:   j.articles_lies    || [],
    status:          j.status           || 'published',
  };
}).filter(a => {
  // Exclure les brouillons et tout article dont la date n'est pas encore arrivée
  if (a.status === 'draft') return false;
  if (a.date > TODAY) return false;
  return true;
}).sort((a, b) => b.date.localeCompare(a.date)); // tri par date décroissante

fs.writeFileSync(INDEX_FILE, JSON.stringify(newIndex, null, 2), 'utf8');
console.log(`📋 data/articles.json mis à jour (${newIndex.length} articles)`);

// ── Mise à jour de data/articles-all.json (index admin — tout inclus) ────────
// Contient tous les articles sans filtrage de date ni de statut.
// Utilisé par admin.html pour afficher planifiés, brouillons et publiés.
const ALL_INDEX_FILE = path.join(__dirname, 'data', 'articles-all.json');
const allIndex = jsonFiles.map(file => {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  // Masquer excerpt, image et metaDescription pour les articles non encore publiés
  // (évite la fuite de contenu éditorial avant publication via la route publique /data/articles-all.json)
  const isPublic = (j.status || 'published') === 'published' ||
                   (j.status === 'scheduled' && j.date <= TODAY);
  return {
    id:              j.id,
    title:           j.title,
    excerpt:         isPublic ? (j.excerpt         || '') : '',
    date:            j.date,
    date_modified:   j.date_modified    || j.date,
    category:        j.category,
    // image : toujours la vraie URL (pas masquée) — articles-all.json est admin-only,
    // masquer l'URL ici causait des corruptions dans data/articles.json public via l'outil d'import
    image:           j.image            || '',
    hasImage:        !!(j.image && j.image.trim()),
    imagePosition:   j.imagePosition    || '50% 50%',
    imageZoom:       j.imageZoom        || 1,
    imageGravity:    j.imageGravity     || 'none',
    imageLayout:     j.imageLayout      || 'top',
    readTime:        j.readTime,
    author:          j.author,
    tags:            j.tags             || [],
    metaDescription: isPublic ? (j.metaDescription || '') : '',
    articles_lies:   j.articles_lies    || [],
    status:          j.status           || 'published',
  };
}).sort((a, b) => b.date.localeCompare(a.date)); // tri par date décroissante

fs.writeFileSync(ALL_INDEX_FILE, JSON.stringify(allIndex, null, 2), 'utf8');
console.log(`📋 data/articles-all.json mis à jour (${allIndex.length} articles — admin)`);

// ── Pages hub /theme/{slug}/ (clusters thématiques) ──────────────────────────
// Page directe, sans stub racine ni redirection (contrairement aux articles).
// Règle de filtrage volontairement plus stricte que le reste du site :
// uniquement status === 'published', jamais un "scheduled" même à échéance —
// la page hub ne doit refléter que du contenu définitivement publié.
const THEME_DIR = path.join(__dirname, 'theme');
const hubSitemapEntries = []; // { slug, lastmod } — consommé par la section sitemap plus bas

for (const cluster of CLUSTERS) {
  const stageOrder = Object.keys(cluster.etapes || {});
  const byStage = {};
  let hubLastmod = cluster.date || TODAY;
  let hasAny = false;

  for (const file of jsonFiles) {
    const j = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
    if (j.cluster !== cluster.id) continue;
    if (!j.etape || !cluster.etapes || !cluster.etapes[j.etape]) continue;
    if ((j.status || 'published') !== 'published') continue; // jamais scheduled/draft
    if (j.date > TODAY) continue;

    if (!byStage[j.etape]) byStage[j.etape] = [];
    byStage[j.etape].push({
      id: j.id, title: j.title, excerpt: j.excerpt || '', category: j.category,
      date: j.date, date_modified: j.date_modified || j.date,
      image: j.image || '', imagePosition: j.imagePosition || '50% 50%',
      imageZoom: j.imageZoom || 1, imageGravity: j.imageGravity || 'none',
      readTime: j.readTime,
    });
    hasAny = true;
    const artLastmod = (j.date_modified && j.date_modified > j.date) ? j.date_modified : j.date;
    if (artLastmod > hubLastmod) hubLastmod = artLastmod;
  }

  if (!hasAny) {
    console.log(`  ⚠ theme/${cluster.id}/ : aucun article publié pour ce cluster — page hub non générée`);
    continue;
  }
  if (hubLastmod > TODAY) hubLastmod = TODAY;

  // Étapes réellement affichées (au moins un article publié).
  const nonEmptyStages = stageOrder.filter(s => byStage[s] && byStage[s].length);

  // Sommaire du parcours — même rendu que le fil de parcours des articles
  // (classes .cluster-trail partagées, déjà stylées) : une progression fléchée,
  // pas une liste numérotée. Pas d'étape "courante" ici (page hub elle-même).
  const tocHtml = nonEmptyStages
    .map(s => `<a class="cluster-trail__step" href="#etape-${s}">${escCard(cluster.etapes[s])}</a>`)
    .join('<span class="cluster-trail__sep" aria-hidden="true">→</span>');

  // Cartes de la page hub : grille dédiée (3/2/1 colonnes, images réduites) et
  // sans badge de catégorie — retrait fait ici par retrait du <span class="badge">
  // rendu par renderCardStatic, plutôt qu'en modifiant cette fonction partagée
  // (utilisée ailleurs pour l'accueil et les pages rubrique). Les href générés
  // par renderCardStatic supposent un contexte avec <base href="../../"> (comme
  // les pages article) ; la page hub n'a plus de <base> (voir plus bas, fix de
  // la casse fragment-only + <base>), d'où le re-préfixage vers articles/.
  const stripBadge  = html => html.replace(/<span class="badge"[^>]*>[^<]*<\/span>\s*/, '');
  const rebaseLinks = html => html.replace(/href="articles\//g, 'href="../../articles/');
  const hubifyCard  = a => rebaseLinks(stripBadge(renderCardStatic(a)));

  const sectionsHtml = nonEmptyStages
    .map(s => {
      const gridClass = byStage[s].length < 3 ? 'theme-cards-grid theme-cards-grid--few' : 'theme-cards-grid';
      return `
      <section class="theme-stage" id="etape-${s}" aria-labelledby="etape-${s}-title">
        <h2 class="theme-stage__title" id="etape-${s}-title">${escCard(cluster.etapes[s])}</h2>
        <div class="${gridClass}">${byStage[s].map(hubifyCard).join('')}
        </div>
      </section>`;
    })
    .join('\n');

  const hubHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escCard(cluster.title)} — Oui Psycho!</title>
  <meta name="description" content="${escCard(cluster.excerpt || cluster.title)}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#1F4E6B">
  <link rel="canonical" href="${BASE}/theme/${cluster.id}/">
  <meta property="og:type"        content="website">
  <meta property="og:title"       content="${escCard(cluster.title)} — Oui Psycho!">
  <meta property="og:description" content="${escCard(cluster.excerpt || cluster.title)}">
  <meta property="og:url"         content="${BASE}/theme/${cluster.id}/">
  <meta property="og:locale"      content="fr_FR">
  <meta property="og:site_name"   content="Oui Psycho!">
  <meta name="twitter:card"       content="summary_large_image">
  <link rel="icon" type="image/png" href="../../img/logo-brain.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@400;500;600;700;800&display=swap">
  <link rel="stylesheet" href="../../css/style.css">
  <!-- Pas de <base> sur cette page (contrairement aux pages article) : un
       <base href="../../"> casse toute ancre fragment-only (href="#etape-x")
       en la résolvant contre la racine du site plutôt que la page courante.
       Tous les liens ci-dessous sont donc explicitement préfixés ../../. -->
  <!-- Google Consent Mode v2 (RGPD/Europe) -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    var _pc = (function(){ try { return localStorage.getItem('pc_consent'); } catch(e){ return null; } })();
    if (_pc === '1') {
      gtag('consent', 'default', {
        'analytics_storage':    'granted',
        'ad_storage':           'denied',
        'ad_user_data':         'denied',
        'ad_personalization':   'denied',
      });
    } else {
      gtag('consent', 'default', {
        'analytics_storage':    'denied',
        'ad_storage':           'denied',
        'ad_user_data':         'denied',
        'ad_personalization':   'denied',
        'wait_for_update':      2000
      });
    }
    gtag('set', 'url_passthrough', true);
    gtag('set', 'ads_data_redaction', true);
  </script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-NR52DCZ6ZJ"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-NR52DCZ6ZJ');
  </script>
</head>
<body>

  <header class="site-header" id="site-header">
    <div class="header-top">
      <a href="../../index.html" class="logo" aria-label="Oui Psycho! — Accueil">
        <img src="../../img/logo-brain.png" alt="" class="logo__img" width="40" height="40">
        <span>Oui Psycho!</span>
      </a>
      <button class="hamburger" id="hamburger" aria-label="Menu" aria-expanded="false" aria-controls="nav-menu">
        <span></span><span></span><span></span>
      </button>
      <nav class="header-nav" id="nav-menu" aria-label="Navigation principale">
        <a class="nav__link" href="../../index.html">Accueil</a>
        <a class="nav__link" href="../../nos-heros-sur-le-divan.html">🛋️ Nos héros</a>
        <a class="nav__link" href="../../les-monstres-sur-le-divan.html">🖤 Les monstres</a>
        <a class="nav__link" href="../../tests.html">🧪 Tests</a>
        <a class="nav__link" href="../../boussole/">🧭 Outils</a>
        <a class="nav__link" href="../../cartes.html">🗺️ Cartes</a>
        <a class="nav__link" href="../../a-propos.html">Qui sommes-nous ?</a>
        <a class="nav__link nav__cta" href="../../index.html#newsletter-widget">Newsletter</a>
      </nav>
    </div>
  </header>

  <section class="theme-hero" aria-labelledby="theme-hero-title">
    <div class="theme-hero__content">
      <h1 id="theme-hero-title">${escCard(cluster.title)}</h1>${cluster.excerpt ? `\n      <p>${escCard(cluster.excerpt)}</p>` : ''}
    </div>
  </section>

  <div class="container theme-stages-wrap">
    <nav class="cluster-trail theme-toc" aria-label="Sommaire du parcours">${tocHtml}</nav>
${sectionsHtml}
  </div>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-disclaimer">
        ⚕️ <strong>Avertissement :</strong> Le contenu de ce site est fourni à titre informatif uniquement
        et ne remplace pas l'avis d'un professionnel de santé. En cas de détresse, appelez le
        <strong>3114</strong> (24h/24, gratuit).
      </div>
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="../../index.html" class="logo">
            <span class="logo__icon" aria-hidden="true">🧠</span>
            <span>Oui Psycho!</span>
          </a>
          <p>Blog de vulgarisation dédié à la santé mentale. Rendre la psychologie accessible à tous, avec bienveillance et rigueur.</p>
        </div>
        <div class="footer-col">
          <h4>Thématiques</h4>
          <ul class="footer-links">
            <li><a href="../../index.html?cat=Bien-%C3%AAtre">Bien-être</a></li>
            <li><a href="../../index.html?cat=Sommeil">Sommeil</a></li>
            <li><a href="../../index.html?cat=Troubles%20Psy">Troubles Psy</a></li>
            <li><a href="../../index.html?cat=Th%C3%A9rapies">Thérapies</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>À propos</h4>
          <ul class="footer-links">
            <li><a href="../../a-propos.html">Qui sommes-nous ?</a></li>
            <li><a href="../../politique-de-confidentialite.html">Confidentialité</a></li>
            <li><a href="../../mentions-legales.html">Mentions légales</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${YEAR} Oui Psycho!. Tous droits réservés.</span>
        <span>Fait avec ❤️ pour la santé mentale</span>
      </div>
    </div>
  </footer>

  <div id="cookie-banner" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
    <div class="cookie-modal">
      <span class="cookie-emoji">🍪</span>
      <h2 id="cookie-title">Votre vie privée, votre choix</h2>
      <p class="cookie-text">Nous utilisons des cookies analytiques pour mieux comprendre votre navigation et vous proposer du contenu adapté sur Oui Psycho!</p>
      <a class="cookie-privacy-link" href="../../politique-de-confidentialite.html">Politique de confidentialité</a>
      <button class="btn-cookie btn-cookie--accept" id="cookie-accept">✓&nbsp; Accepter et continuer</button>
      <button class="btn-cookie-decline" id="cookie-decline">Non merci, continuer sans accepter</button>
    </div>
  </div>

  <script src="../../js/main.js"></script>
</body>
</html>
`;

  const hubOutDir = path.join(THEME_DIR, cluster.id);
  if (!fs.existsSync(hubOutDir)) fs.mkdirSync(hubOutDir, { recursive: true });
  fs.writeFileSync(path.join(hubOutDir, 'index.html'), hubHtml, 'utf8');
  console.log(`🧩 theme/${cluster.id}/index.html généré (${stageOrder.filter(s => byStage[s] && byStage[s].length).length} étape(s) avec contenu)`);
  hubSitemapEntries.push({ slug: cluster.id, lastmod: hubLastmod });
}

// ── Pages outil /outils/{slug}/ (tools.json) ──────────────────────────────────
// Une entrée = une page. Pas de filtre date/status (tools.json n'en a pas) :
// tout ce qui est dans le fichier est généré. robots=noindex,follow tant que
// la section /outils/ n'est pas officiellement lancée (rien n'y lie encore
// depuis un article — voir README de la tâche : "ne touche à aucun article").
const TOOLS_FILE = path.join(__dirname, 'tools.json');
const OUTILS_DIR = path.join(__dirname, 'outils');
let TOOLS = [];
try { TOOLS = JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8')).outils || []; } catch (_) {}

for (const outil of TOOLS) {
  const { identite, contenu, restitution, tracabilite } = outil;
  const slug = identite.slug;

  // Garde-fou de famille : une entrée "echelle-validee" dont les items n'ont
  // pas été vérifiés contre une source ne doit jamais pouvoir être générée —
  // sans quoi c'est un questionnaire maison qui se réclame d'une échelle
  // validée, ce qui est pire qu'un simple manque de source (voir _format,
  // tracabilite.itemsVerifies, et l'incident du 2026-09-06 sur phq-8).
  if (identite.famille === 'echelle-validee' && tracabilite.itemsVerifies !== true) {
    console.log(`⛔ outils/${slug}/ ignoré — famille "echelle-validee" avec tracabilite.itemsVerifies ≠ true (items non vérifiés contre source)`);
    continue;
  }
  const escLdTool = s => s.replace(/<\/script>/gi, '<\\/script>');
  const toolDataJson = escLdTool(JSON.stringify(outil));
  const metaDesc = identite.metaDescription
    || `${identite.titre} — un outil de réflexion en ${contenu.items.length} questions, résultat immédiat, aucune donnée collectée.`;

  const toolHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${identite.titre} — Oui Psycho!</title>
  <meta name="description" content="${escCard(metaDesc)}">
  <meta name="robots" content="noindex, follow">
  <meta name="theme-color" content="#1F4E6B">
  <base href="../../">
  <link rel="canonical" href="${BASE}/outils/${slug}/">
  <meta property="og:type"        content="website">
  <meta property="og:title"       content="${escCard(identite.titre)} — Oui Psycho!">
  <meta property="og:description" content="${escCard(metaDesc)}">
  <meta property="og:url"         content="${BASE}/outils/${slug}/">
  <meta property="og:locale"      content="fr_FR">
  <meta property="og:site_name"   content="Oui Psycho!">
  <meta name="twitter:card"       content="summary_large_image">
  <link rel="icon" type="image/png" href="img/logo-brain.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@400;500;600;700;800&display=swap">
  <link rel="stylesheet" href="css/style.css">
  <!-- Google Consent Mode v2 (RGPD/Europe) -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    var _pc = (function(){ try { return localStorage.getItem('pc_consent'); } catch(e){ return null; } })();
    if (_pc === '1') {
      gtag('consent', 'default', {
        'analytics_storage':    'granted',
        'ad_storage':           'denied',
        'ad_user_data':         'denied',
        'ad_personalization':   'denied',
      });
    } else {
      gtag('consent', 'default', {
        'analytics_storage':    'denied',
        'ad_storage':           'denied',
        'ad_user_data':         'denied',
        'ad_personalization':   'denied',
        'wait_for_update':      2000
      });
    }
    gtag('set', 'url_passthrough', true);
    gtag('set', 'ads_data_redaction', true);
  </script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-NR52DCZ6ZJ"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-NR52DCZ6ZJ');
  </script>
</head>
<body>

  <div id="reading-progress" role="progressbar" aria-label="Progression de lecture" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>

  <header class="site-header" id="site-header">
    <div class="header-top">
      <a href="index.html" class="logo" aria-label="Oui Psycho! — Accueil">
        <img src="img/logo-brain.png" alt="" class="logo__img" width="40" height="40">
        <span>Oui Psycho!</span>
      </a>
      <button class="hamburger" id="hamburger" aria-label="Menu" aria-expanded="false" aria-controls="nav-menu">
        <span></span><span></span><span></span>
      </button>
      <nav class="header-nav" id="nav-menu" aria-label="Navigation principale">
        <a class="nav__link" href="index.html">Accueil</a>
        <a class="nav__link" href="nos-heros-sur-le-divan.html">🛋️ Nos héros</a>
        <a class="nav__link" href="les-monstres-sur-le-divan.html">🖤 Les monstres</a>
        <a class="nav__link" href="tests.html">🧪 Tests</a>
        <a class="nav__link" href="boussole/">🧭 Outils</a>
        <a class="nav__link" href="cartes.html">🗺️ Cartes</a>
        <a class="nav__link" href="a-propos.html">Qui sommes-nous ?</a>
        <a class="nav__link nav__cta" href="index.html#newsletter-widget">Newsletter</a>
      </nav>
    </div>
  </header>

  <div class="container tool-page">
    <main>
      <div class="tool-chapeau">
        <nav class="breadcrumb" aria-label="Fil d'Ariane">
          <a href="index.html">Accueil</a> <span>›</span>
          <a href="tests.html">Tests</a> <span>›</span> <span aria-current="page">${escCard(identite.titre)}</span>
        </nav>
        <h1>${escCard(identite.titre)}</h1>
        <p class="tool-preambule">Outil de réflexion, pas un diagnostic : vos réponses ne sont ni enregistrées, ni envoyées.</p>
      </div>

      <div class="tool-mount" id="tool-mount"></div>

      <div class="tool-outcome">
        <h2>Que faire de ce résultat ?</h2>
        <p>Ce résultat n'est ni un diagnostic ni une étiquette : c'est une photographie, à un instant donné, de ce que vos réponses évoquent. Il peut confirmer ce que vous pressentiez déjà, ou vous surprendre — dans les deux cas, ce qui compte, c'est ce que vous en faites. Si quelque chose ici vous parle, en parler à un proche ou à un professionnel reste le meilleur moyen d'y voir plus clair, bien plus que de refaire le test en espérant un résultat différent.</p>
      </div>
    </main>
  </div>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-disclaimer">
        ⚕️ <strong>Avertissement :</strong> Le contenu de ce site est fourni à titre informatif uniquement
        et ne remplace pas l'avis d'un professionnel de santé. En cas de détresse, appelez le
        <strong>3114</strong> (24h/24, gratuit).
      </div>
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="index.html" class="logo">
            <span class="logo__icon" aria-hidden="true">🧠</span>
            <span>Oui Psycho!</span>
          </a>
          <p>Blog de vulgarisation dédié à la santé mentale. Rendre la psychologie accessible à tous, avec bienveillance et rigueur.</p>
        </div>
        <div class="footer-col">
          <h4>Thématiques</h4>
          <ul class="footer-links">
            <li><a href="index.html?cat=Bien-%C3%AAtre">Bien-être</a></li>
            <li><a href="index.html?cat=Sommeil">Sommeil</a></li>
            <li><a href="index.html?cat=Troubles%20Psy">Troubles Psy</a></li>
            <li><a href="index.html?cat=Th%C3%A9rapies">Thérapies</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>À propos</h4>
          <ul class="footer-links">
            <li><a href="a-propos.html">Qui sommes-nous ?</a></li>
            <li><a href="politique-de-confidentialite.html">Confidentialité</a></li>
            <li><a href="mentions-legales.html">Mentions légales</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${YEAR} Oui Psycho!. Tous droits réservés.</span>
        <span>Fait avec ❤️ pour la santé mentale</span>
      </div>
    </div>
  </footer>

  <div id="cookie-banner" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
    <div class="cookie-modal">
      <span class="cookie-emoji">🍪</span>
      <h2 id="cookie-title">Votre vie privée, votre choix</h2>
      <p class="cookie-text">Nous utilisons des cookies analytiques pour mieux comprendre votre navigation et vous proposer du contenu adapté sur Oui Psycho!</p>
      <a class="cookie-privacy-link" href="politique-de-confidentialite.html">Politique de confidentialité</a>
      <button class="btn-cookie btn-cookie--accept" id="cookie-accept">✓&nbsp; Accepter et continuer</button>
      <button class="btn-cookie-decline" id="cookie-decline">Non merci, continuer sans accepter</button>
    </div>
  </div>

  <script type="application/json" id="tool-data">${toolDataJson}</script>
  <script>
    function notifyResize() {
      setTimeout(function () {
        window.parent.postMessage({ type: 'quiz-resize', height: document.body.scrollHeight }, '*');
      }, 50);
    }
    window.addEventListener('load', notifyResize);
  </script>
  <script src="assets/tool-engine.js"></script>
  <script>
    ToolEngine.render(document.getElementById('tool-mount'), JSON.parse(document.getElementById('tool-data').textContent));
  </script>
  <script src="js/main.js"></script>
</body>
</html>
`;

  const toolOutDir = path.join(OUTILS_DIR, slug);
  if (!fs.existsSync(toolOutDir)) fs.mkdirSync(toolOutDir, { recursive: true });
  fs.writeFileSync(path.join(toolOutDir, 'index.html'), toolHtml, 'utf8');
  console.log(`🛠  outils/${slug}/index.html généré (axe: ${identite.axe})`);
}

// ── Pages ressource /ressources/{slug}/ (ressources.json) ────────────────────
// Contenu pratique (coloriage, checklist, roue des émotions) : aucun score,
// aucun palier, aucune des règles de tools.json ne s'applique — voir
// ressources.json:_format. Une entrée = une page, sauf garde-fou de
// visibilité (visible: false) : mêmes effets que le garde-fou
// tracabilite.itemsVerifies de tools.json — page non générée.
const RESSOURCES_DIR = path.join(__dirname, 'ressources');

for (const ressource of RESSOURCES) {
  const { identite, contenu } = ressource;
  const slug = identite.slug;
  if (ressource.visible === false) {
    console.log(`  ⏸ ressources/${slug}/ ignoré — masqué (visible: false)`);
    continue;
  }
  const escLdRes = s => s.replace(/<\/script>/gi, '<\\/script>');
  const resDataJson = escLdRes(JSON.stringify(ressource));
  const metaDesc = identite.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

  const resHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${identite.titre} — Oui Psycho!</title>
  <meta name="description" content="${escCard(metaDesc)}">
  <meta name="robots" content="noindex, follow">
  <meta name="theme-color" content="#1F4E6B">
  <base href="../../">
  <link rel="canonical" href="${BASE}/ressources/${slug}/">
  <meta property="og:type"        content="website">
  <meta property="og:title"       content="${escCard(identite.titre)} — Oui Psycho!">
  <meta property="og:description" content="${escCard(metaDesc)}">
  <meta property="og:url"         content="${BASE}/ressources/${slug}/">
  <meta property="og:locale"      content="fr_FR">
  <meta property="og:site_name"   content="Oui Psycho!">
  <meta name="twitter:card"       content="summary_large_image">
  <link rel="icon" type="image/png" href="img/logo-brain.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@400;500;600;700;800&display=swap">
  <link rel="stylesheet" href="css/style.css">
  <!-- Google Consent Mode v2 (RGPD/Europe) -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    var _pc = (function(){ try { return localStorage.getItem('pc_consent'); } catch(e){ return null; } })();
    if (_pc === '1') {
      gtag('consent', 'default', {
        'analytics_storage':    'granted',
        'ad_storage':           'denied',
        'ad_user_data':         'denied',
        'ad_personalization':   'denied',
      });
    } else {
      gtag('consent', 'default', {
        'analytics_storage':    'denied',
        'ad_storage':           'denied',
        'ad_user_data':         'denied',
        'ad_personalization':   'denied',
        'wait_for_update':      2000
      });
    }
    gtag('set', 'url_passthrough', true);
    gtag('set', 'ads_data_redaction', true);
  </script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-NR52DCZ6ZJ"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-NR52DCZ6ZJ');
  </script>
</head>
<body class="ressource-page">

  <div id="reading-progress" role="progressbar" aria-label="Progression de lecture" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>

  <header class="site-header" id="site-header">
    <div class="header-top">
      <a href="index.html" class="logo" aria-label="Oui Psycho! — Accueil">
        <img src="img/logo-brain.png" alt="" class="logo__img" width="40" height="40">
        <span>Oui Psycho!</span>
      </a>
      <button class="hamburger" id="hamburger" aria-label="Menu" aria-expanded="false" aria-controls="nav-menu">
        <span></span><span></span><span></span>
      </button>
      <nav class="header-nav" id="nav-menu" aria-label="Navigation principale">
        <a class="nav__link" href="index.html">Accueil</a>
        <a class="nav__link" href="nos-heros-sur-le-divan.html">🛋️ Nos héros</a>
        <a class="nav__link" href="les-monstres-sur-le-divan.html">🖤 Les monstres</a>
        <a class="nav__link" href="tests.html">🧪 Tests</a>
        <a class="nav__link" href="boussole/">🧭 Outils</a>
        <a class="nav__link" href="cartes.html">🗺️ Cartes</a>
        <a class="nav__link" href="a-propos.html">Qui sommes-nous ?</a>
        <a class="nav__link nav__cta" href="index.html#newsletter-widget">Newsletter</a>
      </nav>
    </div>
  </header>

  <div class="container tool-page">
    <main>
      <div class="tool-chapeau print-hide">
        <nav class="breadcrumb" aria-label="Fil d'Ariane">
          <a href="index.html">Accueil</a> <span>›</span>
          ${ressource.type === 'coloriage' ? `<a href="ressources/coloriages/">Coloriages</a> <span>›</span> ` : ''}<span aria-current="page">${escCard(identite.titre)}</span>
        </nav>
        <h1>${escCard(identite.titre)}</h1>
      </div>

      <div class="ressource-intro print-hide">${identite.description}</div>

      <div class="tool-mount" id="ressource-mount"></div>
    </main>
  </div>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-disclaimer">
        ⚕️ <strong>Avertissement :</strong> Le contenu de ce site est fourni à titre informatif uniquement
        et ne remplace pas l'avis d'un professionnel de santé. En cas de détresse, appelez le
        <strong>3114</strong> (24h/24, gratuit).
      </div>
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="index.html" class="logo">
            <span class="logo__icon" aria-hidden="true">🧠</span>
            <span>Oui Psycho!</span>
          </a>
          <p>Blog de vulgarisation dédié à la santé mentale. Rendre la psychologie accessible à tous, avec bienveillance et rigueur.</p>
        </div>
        <div class="footer-col">
          <h4>Thématiques</h4>
          <ul class="footer-links">
            <li><a href="index.html?cat=Bien-%C3%AAtre">Bien-être</a></li>
            <li><a href="index.html?cat=Sommeil">Sommeil</a></li>
            <li><a href="index.html?cat=Troubles%20Psy">Troubles Psy</a></li>
            <li><a href="index.html?cat=Th%C3%A9rapies">Thérapies</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>À propos</h4>
          <ul class="footer-links">
            <li><a href="a-propos.html">Qui sommes-nous ?</a></li>
            <li><a href="politique-de-confidentialite.html">Confidentialité</a></li>
            <li><a href="mentions-legales.html">Mentions légales</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${YEAR} Oui Psycho!. Tous droits réservés.</span>
        <span>Fait avec ❤️ pour la santé mentale</span>
      </div>
    </div>
  </footer>

  <div id="cookie-banner" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
    <div class="cookie-modal">
      <span class="cookie-emoji">🍪</span>
      <h2 id="cookie-title">Votre vie privée, votre choix</h2>
      <p class="cookie-text">Nous utilisons des cookies analytiques pour mieux comprendre votre navigation et vous proposer du contenu adapté sur Oui Psycho!</p>
      <a class="cookie-privacy-link" href="politique-de-confidentialite.html">Politique de confidentialité</a>
      <button class="btn-cookie btn-cookie--accept" id="cookie-accept">✓&nbsp; Accepter et continuer</button>
      <button class="btn-cookie-decline" id="cookie-decline">Non merci, continuer sans accepter</button>
    </div>
  </div>

  <script type="application/json" id="ressource-data">${resDataJson}</script>
  <script>
    function notifyResize() {
      setTimeout(function () {
        window.parent.postMessage({ type: 'quiz-resize', height: document.body.scrollHeight }, '*');
      }, 50);
    }
    window.addEventListener('load', notifyResize);
  </script>
  <script src="assets/ressources-engine.js"></script>
  <script>
    RessourcesEngine.render(document.getElementById('ressource-mount'), JSON.parse(document.getElementById('ressource-data').textContent));
  </script>
  <script src="js/main.js"></script>
</body>
</html>
`;

  const resOutDir = path.join(RESSOURCES_DIR, slug);
  if (!fs.existsSync(resOutDir)) fs.mkdirSync(resOutDir, { recursive: true });
  fs.writeFileSync(path.join(resOutDir, 'index.html'), resHtml, 'utf8');
  console.log(`🎨 ressources/${slug}/index.html généré (type: ${ressource.type})`);
}

// Purge des dossiers générés lors d'un run précédent pour un slug qui n'est
// plus visible (ou plus dans ressources.json) : passer visible à false ne
// suffit pas à faire disparaître une page déjà écrite sur disque lors d'un
// run antérieur — sans cette purge, la page resterait accessible par URL
// directe malgré le masquage. "coloriages" est le seul sous-dossier réservé
// à ne jamais purger (galerie, pas une ressource individuelle).
if (fs.existsSync(RESSOURCES_DIR)) {
  const visibleSlugs = new Set(RESSOURCES.filter(r => r.visible !== false).map(r => r.identite.slug));
  for (const entry of fs.readdirSync(RESSOURCES_DIR)) {
    if (entry === 'coloriages' || visibleSlugs.has(entry)) continue;
    fs.rmSync(path.join(RESSOURCES_DIR, entry), { recursive: true, force: true });
    console.log(`  🧹 ressources/${entry}/ supprimé — masqué ou retiré de ressources.json`);
  }
}

// ── Galerie /ressources/coloriages/ ───────────────────────────────────────────
// "coloriages" est un slug réservé à ce niveau : un coloriage individuel ne
// doit jamais prendre ce slug (collision avec cette page).
const COLORIAGES = RESSOURCES.filter(r => r.type === 'coloriage' && r.visible !== false);
if (COLORIAGES.length) {
  const escLdGal = s => s.replace(/<\/script>/gi, '<\\/script>');
  const galerieDataJson = escLdGal(JSON.stringify(COLORIAGES));
  const galerieMeta = `${COLORIAGES.length} coloriage(s) à imprimer, classés par thème (anxiété, sommeil, se recentrer...), à colorier au calme ou avant un moment qui inquiète.`;

  const galerieHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coloriages à imprimer — Oui Psycho!</title>
  <meta name="description" content="${escCard(galerieMeta)}">
  <meta name="robots" content="noindex, follow">
  <meta name="theme-color" content="#1F4E6B">
  <base href="../../">
  <link rel="canonical" href="${BASE}/ressources/coloriages/">
  <link rel="icon" type="image/png" href="img/logo-brain.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@400;500;600;700;800&display=swap">
  <link rel="stylesheet" href="css/style.css">
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    var _pc = (function(){ try { return localStorage.getItem('pc_consent'); } catch(e){ return null; } })();
    if (_pc === '1') {
      gtag('consent', 'default', { 'analytics_storage': 'granted', 'ad_storage': 'denied', 'ad_user_data': 'denied', 'ad_personalization': 'denied' });
    } else {
      gtag('consent', 'default', { 'analytics_storage': 'denied', 'ad_storage': 'denied', 'ad_user_data': 'denied', 'ad_personalization': 'denied', 'wait_for_update': 2000 });
    }
    gtag('set', 'url_passthrough', true);
    gtag('set', 'ads_data_redaction', true);
  </script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-NR52DCZ6ZJ"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-NR52DCZ6ZJ');
  </script>
</head>
<body>

  <header class="site-header" id="site-header">
    <div class="header-top">
      <a href="index.html" class="logo" aria-label="Oui Psycho! — Accueil">
        <img src="img/logo-brain.png" alt="" class="logo__img" width="40" height="40">
        <span>Oui Psycho!</span>
      </a>
      <button class="hamburger" id="hamburger" aria-label="Menu" aria-expanded="false" aria-controls="nav-menu">
        <span></span><span></span><span></span>
      </button>
      <nav class="header-nav" id="nav-menu" aria-label="Navigation principale">
        <a class="nav__link" href="index.html">Accueil</a>
        <a class="nav__link" href="nos-heros-sur-le-divan.html">🛋️ Nos héros</a>
        <a class="nav__link" href="les-monstres-sur-le-divan.html">🖤 Les monstres</a>
        <a class="nav__link" href="tests.html">🧪 Tests</a>
        <a class="nav__link" href="boussole/">🧭 Outils</a>
        <a class="nav__link" href="cartes.html">🗺️ Cartes</a>
        <a class="nav__link" href="a-propos.html">Qui sommes-nous ?</a>
        <a class="nav__link nav__cta" href="index.html#newsletter-widget">Newsletter</a>
      </nav>
    </div>
  </header>

  <div class="container tool-page" style="max-width:960px">
    <main>
      <div class="tool-chapeau">
        <nav class="breadcrumb" aria-label="Fil d'Ariane">
          <a href="index.html">Accueil</a> <span>›</span> <span aria-current="page">Coloriages</span>
        </nav>
        <h1>Coloriages à imprimer</h1>
        <p class="tool-preambule">${escCard(galerieMeta)}</p>
      </div>

      <div id="galerie-mount"></div>
    </main>
  </div>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-disclaimer">
        ⚕️ <strong>Avertissement :</strong> Le contenu de ce site est fourni à titre informatif uniquement
        et ne remplace pas l'avis d'un professionnel de santé. En cas de détresse, appelez le
        <strong>3114</strong> (24h/24, gratuit).
      </div>
      <div class="footer-bottom">
        <span>© ${YEAR} Oui Psycho!. Tous droits réservés.</span>
        <span>Fait avec ❤️ pour la santé mentale</span>
      </div>
    </div>
  </footer>

  <div id="cookie-banner" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
    <div class="cookie-modal">
      <span class="cookie-emoji">🍪</span>
      <h2 id="cookie-title">Votre vie privée, votre choix</h2>
      <p class="cookie-text">Nous utilisons des cookies analytiques pour mieux comprendre votre navigation et vous proposer du contenu adapté sur Oui Psycho!</p>
      <a class="cookie-privacy-link" href="politique-de-confidentialite.html">Politique de confidentialité</a>
      <button class="btn-cookie btn-cookie--accept" id="cookie-accept">✓&nbsp; Accepter et continuer</button>
      <button class="btn-cookie-decline" id="cookie-decline">Non merci, continuer sans accepter</button>
    </div>
  </div>

  <script type="application/json" id="galerie-data">${galerieDataJson}</script>
  <script src="assets/ressources-engine.js"></script>
  <script>
    RessourcesEngine.renderGalerieColoriages(document.getElementById('galerie-mount'), JSON.parse(document.getElementById('galerie-data').textContent));
  </script>
  <script src="js/main.js"></script>
</body>
</html>
`;

  const galerieOutDir = path.join(RESSOURCES_DIR, 'coloriages');
  if (!fs.existsSync(galerieOutDir)) fs.mkdirSync(galerieOutDir, { recursive: true });
  fs.writeFileSync(path.join(galerieOutDir, 'index.html'), galerieHtml, 'utf8');
  console.log(`🖼  ressources/coloriages/index.html généré (${COLORIAGES.length} coloriage(s))`);
}

// ── Page hub /boussole/ (rubrique "Ma Boussole Intérieure") ──────────────────
// Vitrine des outils pratiques de ressources.json. Construite dynamiquement à
// partir de RESSOURCES : n'affiche que ce qui existe réellement (pas de place
// réservée pour un outil pas encore créé), pas de <base> (ancres #bibliotheque
// en fragment-only — même raison que theme/{slug}/, voir plus haut).
const BOUSSOLE_DIR = path.join(__dirname, 'boussole');

const boussoleCategories = [];
RESSOURCES.filter(r => r.visible !== false).forEach(r => {
  (r.maillage.categories || []).forEach(cat => {
    let entry = boussoleCategories.find(c => c.nom === cat);
    if (!entry) { entry = { nom: cat, count: 0 }; boussoleCategories.push(entry); }
    entry.count++;
  });
});
const CATEGORY_ICONS = {
  'Bien-être': '🌿',
  'Troubles Psy': '🧠',
  'Émotions & identité': '💛',
  'Travail': '💼',
};

const roueEntries = RESSOURCES.filter(r => r.type === 'roue-emotions' && r.visible !== false);
const checklistEntries = RESSOURCES.filter(r => r.type === 'checklist' && r.visible !== false);
const boussoleTools = [];
roueEntries.forEach(r => boussoleTools.push({ kind: 'roue', ressource: r }));
checklistEntries.forEach(r => boussoleTools.push({ kind: 'checklist', ressource: r }));
if (COLORIAGES.length) boussoleTools.push({ kind: 'coloriages', count: COLORIAGES.length });

function stripHtmlDesc(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// CTA principale du hero : le premier outil réellement visible (jamais un
// lien figé — celui-ci pointait vers la roue avant l'ajout du masquage et
// serait resté un lien mort si elle passait en visible:false).
let heroCtaHtml = `<a class="boussole-hero__link" href="#bibliotheque">Voir tous nos outils</a>`;
if (boussoleTools.length) {
  const featured = boussoleTools[0];
  const heroHref = featured.kind === 'coloriages' ? '../ressources/coloriages/' : `../ressources/${featured.ressource.identite.slug}/`;
  const heroLabel = featured.kind === 'coloriages' ? 'Découvrir nos coloriages à imprimer →' : `Découvrir « ${featured.ressource.identite.titre} » →`;
  heroCtaHtml = `<a class="tool-btn tool-btn--primary" href="${heroHref}">${escCard(heroLabel)}</a>
          <a class="boussole-hero__link" href="#bibliotheque">Voir tous nos outils</a>`;
}

const boussoleToolCardsHtml = boussoleTools.map(t => {
  if (t.kind === 'roue') {
    const r = t.ressource;
    return `
      <a class="boussole-tool-card boussole-tool-card--photo" href="../ressources/${r.identite.slug}/">
        <img class="boussole-tool-card__img" src="../img/boussole/card-roue-emotions.jpg" alt="" loading="lazy">
        <div class="boussole-tool-card__body">
          <span class="badge">Émotions &amp; identité</span>
          <h3>${escCard(r.identite.titre)}</h3>
          <p>${escCard(stripHtmlDesc(r.identite.description)).slice(0, 130)}…</p>
          <span class="boussole-tool-card__link">Découvrir →</span>
        </div>
      </a>`;
  }
  if (t.kind === 'checklist') {
    const r = t.ressource;
    return `
      <a class="boussole-tool-card" href="../ressources/${r.identite.slug}/">
        <span class="boussole-tool-card__icon">✅</span>
        <div class="boussole-tool-card__body">
          <span class="badge badge--accent">${escCard((r.maillage.categories || [])[0] || '')}</span>
          <h3>${escCard(r.identite.titre)}</h3>
          <p>${escCard(stripHtmlDesc(r.identite.description)).slice(0, 130)}…</p>
          <span class="boussole-tool-card__link">Découvrir →</span>
        </div>
      </a>`;
  }
  // coloriages
  return `
      <a class="boussole-tool-card" href="../ressources/coloriages/">
        <span class="boussole-tool-card__icon">🎨</span>
        <div class="boussole-tool-card__body">
          <span class="badge">Bien-être</span>
          <h3>Coloriages à imprimer</h3>
          <p>${t.count} coloriage${t.count > 1 ? 's' : ''} calme${t.count > 1 ? 's' : ''} à imprimer, pour souffler au calme ou avant un moment qui inquiète.</p>
          <span class="boussole-tool-card__link">Découvrir →</span>
        </div>
      </a>`;
}).join('');

const boussoleThemesHtml = boussoleCategories.map(c => `
      <a class="boussole-theme-item" href="../index.html?cat=${encodeURIComponent(c.nom)}">
        <span class="boussole-theme-item__icon">${CATEGORY_ICONS[c.nom] || '🔹'}</span>
        <span class="boussole-theme-item__label">${escCard(c.nom)}</span>
      </a>`).join('');

const boussoleMeta = "Des outils courts et concrets pour mieux comprendre ce que vous ressentez : roue des émotions, checklists, coloriages à imprimer. Sans compte, sans diagnostic, rien n'est envoyé ni stocké.";

const boussoleHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ma Boussole Intérieure — Oui Psycho!</title>
  <meta name="description" content="${escCard(boussoleMeta)}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#1F4E6B">
  <link rel="canonical" href="${BASE}/boussole/">
  <meta property="og:type"        content="website">
  <meta property="og:title"       content="Ma Boussole Intérieure — Oui Psycho!">
  <meta property="og:description" content="${escCard(boussoleMeta)}">
  <meta property="og:url"         content="${BASE}/boussole/">
  <meta property="og:locale"      content="fr_FR">
  <meta property="og:site_name"   content="Oui Psycho!">
  <meta name="twitter:card"       content="summary_large_image">
  <link rel="icon" type="image/png" href="../img/logo-brain.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@400;500;600;700;800&display=swap">
  <link rel="stylesheet" href="../css/style.css">
  <!-- Pas de <base> sur cette page : href="#bibliotheque" doit rester une
       ancre locale (même raison documentée sur theme/{slug}/ plus haut). -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    var _pc = (function(){ try { return localStorage.getItem('pc_consent'); } catch(e){ return null; } })();
    if (_pc === '1') {
      gtag('consent', 'default', { 'analytics_storage': 'granted', 'ad_storage': 'denied', 'ad_user_data': 'denied', 'ad_personalization': 'denied' });
    } else {
      gtag('consent', 'default', { 'analytics_storage': 'denied', 'ad_storage': 'denied', 'ad_user_data': 'denied', 'ad_personalization': 'denied', 'wait_for_update': 2000 });
    }
    gtag('set', 'url_passthrough', true);
    gtag('set', 'ads_data_redaction', true);
  </script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-NR52DCZ6ZJ"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-NR52DCZ6ZJ');
  </script>
</head>
<body>

  <header class="site-header" id="site-header">
    <div class="header-top">
      <a href="../index.html" class="logo" aria-label="Oui Psycho! — Accueil">
        <img src="../img/logo-brain.png" alt="" class="logo__img" width="40" height="40">
        <span>Oui Psycho!</span>
      </a>
      <button class="hamburger" id="hamburger" aria-label="Menu" aria-expanded="false" aria-controls="nav-menu">
        <span></span><span></span><span></span>
      </button>
      <nav class="header-nav" id="nav-menu" aria-label="Navigation principale">
        <a class="nav__link" href="../index.html">Accueil</a>
        <a class="nav__link" href="../nos-heros-sur-le-divan.html">🛋️ Nos héros</a>
        <a class="nav__link" href="../les-monstres-sur-le-divan.html">🖤 Les monstres</a>
        <a class="nav__link" href="../tests.html">🧪 Tests</a>
        <a class="nav__link nav__link--active" href="../boussole/">🧭 Outils</a>
        <a class="nav__link" href="../cartes.html">🗺️ Cartes</a>
        <a class="nav__link" href="../a-propos.html">Qui sommes-nous ?</a>
        <a class="nav__link nav__cta" href="../index.html#newsletter-widget">Newsletter</a>
      </nav>
    </div>
  </header>

  <section class="boussole-hero">
    <div class="container boussole-hero__inner">
      <div class="boussole-hero__text">
        <span class="boussole-hero__eyebrow">🧭 Nouveau sur Oui Psycho!</span>
        <h1>Ma Boussole Intérieure</h1>
        <p>Des outils courts et concrets pour mieux comprendre ce que vous ressentez — pas un test, pas un diagnostic : juste de quoi y voir un peu plus clair, à votre rythme.</p>
        <div class="boussole-hero__ctas">
          ${heroCtaHtml}
        </div>
        <div class="boussole-hero__stats">
          <div class="boussole-hero__stat"><img src="../img/boussole/icon-1.png" alt=""><span>${boussoleTools.length} outil${boussoleTools.length > 1 ? 's' : ''} disponible${boussoleTools.length > 1 ? 's' : ''}</span></div>
          <div class="boussole-hero__stat"><img src="../img/boussole/icon-2.png" alt=""><span>100% gratuit, sans compte</span></div>
          <div class="boussole-hero__stat"><img src="../img/boussole/icon-3.png" alt=""><span>0 diagnostic, 0 étiquette</span></div>
          <div class="boussole-hero__stat"><img src="../img/boussole/icon-4.png" alt=""><span>Rien n'est envoyé ni stocké</span></div>
        </div>
      </div>
      <div class="boussole-hero__illus" aria-hidden="true">
        <img class="boussole-hero__illus-decor" src="../img/boussole/hero-decor.jpg" alt="">
        <img class="boussole-hero__illus-portrait" src="../img/boussole/hero-portrait.jpg" alt="">
      </div>
    </div>
  </section>

  <div class="container boussole-wrap">
    <section class="boussole-themes" aria-labelledby="boussole-themes-title">
      <h2 id="boussole-themes-title">Nos outils par thématique</h2>
      <div class="boussole-themes__grid">${boussoleThemesHtml}
      </div>
    </section>

    <section class="boussole-tools" id="bibliotheque" aria-labelledby="boussole-tools-title">
      <h2 id="boussole-tools-title">Tous nos outils</h2>
      <div class="boussole-tools__grid">${boussoleToolCardsHtml}
      </div>
    </section>
  </div>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-disclaimer">
        ⚕️ <strong>Avertissement :</strong> Le contenu de ce site est fourni à titre informatif uniquement
        et ne remplace pas l'avis d'un professionnel de santé. En cas de détresse, appelez le
        <strong>3114</strong> (24h/24, gratuit).
      </div>
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="../index.html" class="logo">
            <span class="logo__icon" aria-hidden="true">🧠</span>
            <span>Oui Psycho!</span>
          </a>
          <p>Blog de vulgarisation dédié à la santé mentale. Rendre la psychologie accessible à tous, avec bienveillance et rigueur.</p>
        </div>
        <div class="footer-col">
          <h4>Thématiques</h4>
          <ul class="footer-links">
            <li><a href="../index.html?cat=Bien-%C3%AAtre">Bien-être</a></li>
            <li><a href="../index.html?cat=Sommeil">Sommeil</a></li>
            <li><a href="../index.html?cat=Troubles%20Psy">Troubles Psy</a></li>
            <li><a href="../index.html?cat=Th%C3%A9rapies">Thérapies</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>À propos</h4>
          <ul class="footer-links">
            <li><a href="../a-propos.html">Qui sommes-nous ?</a></li>
            <li><a href="../politique-de-confidentialite.html">Confidentialité</a></li>
            <li><a href="../mentions-legales.html">Mentions légales</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${YEAR} Oui Psycho!. Tous droits réservés.</span>
        <span>Fait avec ❤️ pour la santé mentale</span>
      </div>
    </div>
  </footer>

  <div id="cookie-banner" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
    <div class="cookie-modal">
      <span class="cookie-emoji">🍪</span>
      <h2 id="cookie-title">Votre vie privée, votre choix</h2>
      <p class="cookie-text">Nous utilisons des cookies analytiques pour mieux comprendre votre navigation et vous proposer du contenu adapté sur Oui Psycho!</p>
      <a class="cookie-privacy-link" href="../politique-de-confidentialite.html">Politique de confidentialité</a>
      <button class="btn-cookie btn-cookie--accept" id="cookie-accept">✓&nbsp; Accepter et continuer</button>
      <button class="btn-cookie-decline" id="cookie-decline">Non merci, continuer sans accepter</button>
    </div>
  </div>

  <script src="../js/main.js"></script>
</body>
</html>
`;

if (!fs.existsSync(BOUSSOLE_DIR)) fs.mkdirSync(BOUSSOLE_DIR, { recursive: true });
fs.writeFileSync(path.join(BOUSSOLE_DIR, 'index.html'), boussoleHtml, 'utf8');
console.log(`🧭 boussole/index.html généré (${boussoleTools.length} outil(s) en vitrine, ${boussoleCategories.length} thématique(s))`);

// ── Génération du sitemap.xml ─────────────────────────────────────────────────
// Utilise newIndex (articles publiés/passés déjà filtrés) pour rester en sync
// avec les pages qui ont robots="index, follow".
const SITEMAP_FILE = path.join(__dirname, 'sitemap.xml');

// lastmod d'un article = max(date, date_modified), plafonné à aujourd'hui
function sitemapLastmod(a) {
  const candidates = [a.date, a.date_modified].filter(Boolean);
  const best = candidates.reduce((m, d) => (d > m ? d : m), '0000-00-00');
  return best > TODAY ? TODAY : best;
}

// Articles triés par lastmod décroissant
const sitemapArticles = [...newIndex].sort((a, b) =>
  sitemapLastmod(b).localeCompare(sitemapLastmod(a))
);

// Articles "orphelins" : index.html existant SANS JSON correspondant, en index, follow
// (articles créés avant le système JSON — ex: pages à HTML custom)
const jsonIds = new Set(jsonFiles.map(f => path.basename(f, '.json')));
const orphanArticles = [];
if (fs.existsSync(DIR)) {
  for (const slug of fs.readdirSync(DIR)) {
    if (jsonIds.has(slug)) continue;                         // a un JSON → déjà dans sitemapArticles
    const htmlPath = path.join(DIR, slug, 'index.html');
    if (!fs.existsSync(htmlPath)) continue;
    const html = fs.readFileSync(htmlPath, 'utf8');
    if (!html.includes('content="index, follow"')) continue; // pas indexable
    const pubM  = html.match(/article:published_time[^>]*content="([^T"]+)/);
    const modM  = html.match(/article:modified_time[^>]*content="([^T"]+)/);
    const pub   = pubM ? pubM[1] : TODAY;
    const mod   = modM ? modM[1] : pub;
    const lastmod = (mod > pub ? mod : pub) > TODAY ? TODAY : (mod > pub ? mod : pub);
    orphanArticles.push({ id: slug, lastmod });
  }
}

// Dossiers publiés : scan dossiers/*/index.html → vérifier robots="index, follow"
const DOSSIER_DIR = path.join(__dirname, 'dossiers');
const sitemapDossiers = [];
if (fs.existsSync(DOSSIER_DIR)) {
  for (const slug of fs.readdirSync(DOSSIER_DIR)) {
    const htmlPath = path.join(DOSSIER_DIR, slug, 'index.html');
    if (!fs.existsSync(htmlPath)) continue;
    const html = fs.readFileSync(htmlPath, 'utf8');
    if (!html.includes('content="index, follow"')) continue;
    const pubM = html.match(/article:published_time[^>]*content="([^T"]+)/);
    const modM = html.match(/article:modified_time[^>]*content="([^T"]+)/);
    const pub  = pubM ? pubM[1] : TODAY;
    const mod  = modM ? modM[1] : pub;
    const lastmod = (mod > pub ? mod : pub) > TODAY ? TODAY : (mod > pub ? mod : pub);
    sitemapDossiers.push({ slug, lastmod });
  }
}

let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- Pages statiques -->
  <url>
    <loc>${BASE}/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE}/a-propos.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${BASE}/contact.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>
  <url>
    <loc>${BASE}/mentions-legales.html</loc>
    <changefreq>yearly</changefreq>
    <priority>0.2</priority>
  </url>
  <url>
    <loc>${BASE}/politique-de-confidentialite.html</loc>
    <changefreq>yearly</changefreq>
    <priority>0.2</priority>
  </url>

  <!-- Pages de navigation (catégories & sections) -->
  <url>
    <loc>${BASE}/dossiers.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${BASE}/nos-heros-sur-le-divan.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${BASE}/les-monstres-sur-le-divan.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${BASE}/societe.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${BASE}/sexo.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${BASE}/tests.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${BASE}/boussole/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;

if (sitemapDossiers.length) {
  sitemapXml += `\n\n  <!-- Dossiers (${sitemapDossiers.length}) -->`;
  for (const d of sitemapDossiers) {
    sitemapXml += `
  <url>
    <loc>${BASE}/dossiers/${d.slug}/</loc>
    <lastmod>${d.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }
}

// Pages hub /theme/{slug}/ (clusters thématiques)
if (hubSitemapEntries.length) {
  sitemapXml += `\n\n  <!-- Clusters thématiques (${hubSitemapEntries.length}) -->`;
  for (const h of hubSitemapEntries) {
    sitemapXml += `
  <url>
    <loc>${BASE}/theme/${h.slug}/</loc>
    <lastmod>${h.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }
}

const totalArticles = sitemapArticles.length + orphanArticles.length;
sitemapXml += `\n\n  <!-- Articles (${totalArticles} publiés — généré automatiquement) -->`;
sitemapArticles.forEach((a, i) => {
  sitemapXml += `
  <url>
    <loc>${BASE}/articles/${a.id}/</loc>
    <lastmod>${sitemapLastmod(a)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${i === 0 && orphanArticles.length === 0 ? '0.9' : '0.8'}</priority>
  </url>`;
});

// Articles orphelins (HTML custom sans JSON) indexables
if (orphanArticles.length) {
  sitemapXml += `\n\n  <!-- Articles à HTML custom (sans JSON) -->`;
  orphanArticles.forEach(a => {
    sitemapXml += `
  <url>
    <loc>${BASE}/articles/${a.id}/</loc>
    <lastmod>${a.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });
}

sitemapXml += `\n\n</urlset>\n`;

fs.writeFileSync(SITEMAP_FILE, sitemapXml, 'utf8');
console.log(`🗺  sitemap.xml mis à jour (${sitemapArticles.length} articles JSON + ${orphanArticles.length} orphelins + ${sitemapDossiers.length} dossier(s) + ${hubSitemapEntries.length} cluster(s))`);

// ── Injection des cards statiques dans les pages de listing (SEO sans JS) ─────
// Objectif : Googlebot voit du HTML avec liens internes dès le premier octet.
// Le JS prend le relais au chargement (renderPage remplace les cards en live).
//
// Approche : balanced-div walker → fonctionne à chaque ré-exécution du script
// même si le fichier contient déjà des cards du run précédent.

function escCard(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildCloudUrl(url, gravity) {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const idx = url.indexOf('/upload/');
  if (idx === -1) return url;
  const parts    = url.slice(idx + 8).split('/');
  const publicId = parts.slice(1).join('/');
  const g = gravity === 'face' ? 'face' : 'auto';
  return `${url.slice(0, idx + 8)}c_fill,g_${g},ar_3:2,w_900/f_auto,q_auto/${publicId}`;
}

function fmtDateCard(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS[parseInt(m)]} ${y}`;
}

function dateLabelCard(a) {
  const mod = effectiveModified(a);
  if (mod === a.date) return 'Publié le ' + fmtDateCard(a.date);
  return 'Mis à jour le ' + fmtDateCard(mod);
}

function renderCardStatic(a) {
  const useIA    = a.imageGravity && a.imageGravity !== 'none';
  const imgUrl   = useIA ? buildCloudUrl(a.image, a.imageGravity) : a.image;
  const zoom     = useIA ? 1 : (parseFloat(a.imageZoom) || 1);
  const bgSize   = zoom > 1 ? `${Math.round(zoom * 100)}%` : 'cover';
  const bgPos    = useIA ? 'center center' : (a.imagePosition || 'center center');
  const imgStyle = imgUrl
    ? `background-image:url('${escCard(imgUrl)}');background-position:${bgPos};background-size:${bgSize}`
    : '';
  const cat    = CATS_CARD[a.category] || {};
  const catSty = cat.color ? ` style="color:${cat.color};background:${cat.bg}"` : '';
  const label  = dateLabelCard(a);
  const phld   = !a.image ? '<span class="card__image-placeholder" aria-hidden="true">🧠</span>' : '';
  return `
    <article class="card" data-category="${escCard(a.category || '')}">
      <a href="articles/${escCard(a.id)}/" class="card__image-link" tabindex="-1" aria-hidden="true">
        <div class="card__image" style="${imgStyle}" data-cat="${escCard(a.category || '')}">${phld}</div>
      </a>
      <div class="card__body">
        <span class="badge"${catSty}>${escCard(a.category || 'Général')}</span>
        <h2 class="card__title"><a href="articles/${escCard(a.id)}/">${escCard(a.title)}</a></h2>
        <p class="card__excerpt">${escCard(a.excerpt || '')}</p>
        <footer class="card__meta">
          <time datetime="${escCard(effectiveModified(a))}">${label}</time>
          <span class="card__meta-dot">•</span>
          <span>${a.readTime || 5} min de lecture</span>
        </footer>
      </div>
    </article>`;
}

function renderFeaturedStatic(a) {
  const useIA    = a.imageGravity && a.imageGravity !== 'none';
  const imgUrl   = useIA ? buildCloudUrl(a.image, a.imageGravity) : a.image;
  const zoom     = useIA ? 1 : (parseFloat(a.imageZoom) || 1);
  const bgSize   = zoom > 1 ? `${Math.round(zoom * 100)}%` : 'cover';
  const bgPos    = useIA ? 'center center' : (a.imagePosition || 'center center');
  const imgStyle = imgUrl
    ? `background-image:url('${escCard(imgUrl)}');background-position:${bgPos};background-size:${bgSize}`
    : '';
  const cat    = CATS_CARD[a.category] || {};
  const catSty = cat.color ? ` style="color:${cat.color};background:${cat.bg}"` : '';
  const label  = dateLabelCard(a);
  const phld   = !a.image ? '<span class="card__image-placeholder" aria-hidden="true">🧠</span>' : '';
  return `
    <article class="card card--featured" data-category="${escCard(a.category || '')}" style="margin-bottom:2rem">
      <a href="articles/${escCard(a.id)}/" class="card__image-link" tabindex="-1" aria-hidden="true">
        <div class="card__image" style="${imgStyle}" data-cat="${escCard(a.category || '')}">${phld}</div>
      </a>
      <div class="card__body">
        <div class="card--featured-label">À la une</div>
        <span class="badge"${catSty}>${escCard(a.category || 'Général')}</span>
        <h2 class="card__title"><a href="articles/${escCard(a.id)}/">${escCard(a.title)}</a></h2>
        <p class="card__excerpt">${escCard(a.excerpt || '')}</p>
        <footer class="card__meta">
          <time datetime="${escCard(effectiveModified(a))}">${label}</time>
          <span class="card__meta-dot">•</span>
          <span>${a.readTime || 5} min de lecture</span>
        </footer>
        <a href="articles/${escCard(a.id)}/" class="card__read-more">Lire l'article</a>
      </div>
    </article>`;
}

/**
 * Remplace le contenu d'une div identifiée par son ouverture de balise (regex).
 * Utilise un compteur de profondeur pour trouver le </div> correspondant,
 * ce qui fonctionne même si la div contient des articles imbriqués au run précédent.
 * Retourne le nouveau HTML ou null si la balise n'est pas trouvée.
 */
function replaceDivContent(html, openTagRegex, newOpenTag, newInnerHtml) {
  const m = html.match(openTagRegex);
  if (!m) return null;
  const tagStart    = m.index;
  const contentStart = tagStart + m[0].length;
  let depth = 1;
  let pos   = contentStart;
  while (pos < html.length && depth > 0) {
    const nextOpen  = html.indexOf('<div', pos);
    const nextClose = html.indexOf('</div>', pos);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) {
        return html.slice(0, tagStart) + newOpenTag + newInnerHtml + '\n    </div>' + html.slice(nextClose + 6);
      }
      pos = nextClose + 6;
    }
  }
  return null;
}

function injectStaticInFile(filePath, transformFn) {
  if (!fs.existsSync(filePath)) { console.warn(`  ⚠  introuvable : ${filePath}`); return; }
  const original = fs.readFileSync(filePath, 'utf8');
  const result   = transformFn(original);
  if (!result) { console.warn(`  ⚠  injection échouée : ${filePath}`); return; }
  fs.writeFileSync(filePath, result, 'utf8');
}

// ── 1. index.html ──────────────────────────────────────────────────────────────
if (newIndex.length > 0) {
  const featured  = newIndex[0];
  const gridSlice = newIndex.slice(1, 10);  // 2e au 10e article

  injectStaticInFile(path.join(__dirname, 'index.html'), html => {
    // a) Featured container
    let h = replaceDivContent(
      html,
      /<div id="featured-container"[^>]*>/,
      '<div id="featured-container">',
      '\n      ' + renderFeaturedStatic(featured) + '\n      '
    );
    if (!h) return null;

    // b) Révèle le titre "Derniers articles" (supprime style="display:none")
    h = h.replace('id="articles-section-header" style="display:none"', 'id="articles-section-header"');

    // c) Grille principale + data-static (signale au JS de sauter les squelettes)
    h = replaceDivContent(
      h,
      /<div class="articles-grid" id="articles-grid"[^>]*>/,
      '<div class="articles-grid" id="articles-grid" aria-live="polite" aria-busy="true" data-static="true">',
      gridSlice.map(renderCardStatic).join('')
    );
    return h;
  });
  console.log(`🏠 index.html → 1 featured + ${gridSlice.length} cards statiques injectées`);
}

// ── Helper : injection d'une page rubrique ─────────────────────────────────────
function injectRubriquePage(htmlFile, gridId, gridClass, articles) {
  if (!articles.length) {
    console.log(`  ⚠  ${path.basename(htmlFile)} : aucun article publié pour cette rubrique`);
    return;
  }
  const cards = articles.map(renderCardStatic).join('');
  injectStaticInFile(htmlFile, html => replaceDivContent(
    html,
    new RegExp(`<div class="${gridClass}" id="${gridId}"[^>]*>`),
    `<div class="${gridClass}" id="${gridId}" aria-live="polite" aria-busy="true" data-static="true">`,
    cards
  ));
  console.log(`📄 ${path.basename(htmlFile)} → ${articles.length} cards statiques`);
}

// ── 2. nos-heros-sur-le-divan.html ────────────────────────────────────────────
injectRubriquePage(
  path.join(__dirname, 'nos-heros-sur-le-divan.html'),
  'heros-grid', 'heros-grid',
  newIndex.filter(a => a.category === 'Nos héros sur le divan')
);

// ── 3. les-monstres-sur-le-divan.html ─────────────────────────────────────────
injectRubriquePage(
  path.join(__dirname, 'les-monstres-sur-le-divan.html'),
  'monstres-grid', 'monstres-grid',
  newIndex.filter(a => a.category === 'Les monstres sur le divan')
);

// ── 4. societe.html ───────────────────────────────────────────────────────────
injectRubriquePage(
  path.join(__dirname, 'societe.html'),
  'societe-grid', 'societe-grid',
  newIndex.filter(a => a.category === 'Société' || a.category === 'Société & psychologie politique')
);

// ── 5. sexo.html ──────────────────────────────────────────────────────────────
injectRubriquePage(
  path.join(__dirname, 'sexo.html'),
  'sexo-grid', 'sexo-grid',
  newIndex.filter(a => a.category === 'Sexo')
);

// ── Génération de data/tests.json (hub des quizzes) ──────────────────────────
// Source de vérité : les articles/*.json dont le content contient une iframe
// <iframe src="tests/{quizId}.html"> (ou src="/tests/...").
// Les entrées sans article correspondant vivent dans data/tests.manual.json.
//
// Règle d'inclusion : même filtre que articles.json
//   - status !== 'draft'
//   - date <= TODAY (articles à date future exclus jusqu'au build post-publication)
//
// Overrides : champ optionnel "quizCard" à la racine du JSON article.
//   Chaque clé présente écrase la valeur dérivée (title, desc, emoji, color,
//   catLabel, duration). Absent → tout est auto-dérivé.
const TESTS_FILE   = path.join(__dirname, 'data', 'tests.json');
const TESTS_MANUAL = path.join(__dirname, 'data', 'tests.manual.json');

// Map catégorie → emoji + couleur par défaut
const QUIZ_CAT_MAP = {
  'Thérapies':                 { emoji: '⚖️', color: '#1F4E6B' },
  'Bien-être':                 { emoji: '🌿', color: '#2f86b7' },
  'Troubles Psy':              { emoji: '🧠', color: '#6b4e9e' },
  'Relations':                 { emoji: '💬', color: '#b5546a' },
  'Sexo':                      { emoji: '❤️', color: '#b5546a' },
  'Sommeil':                   { emoji: '😴', color: '#3d5a80' },
  'Nos héros sur le divan':    { emoji: '🦸', color: '#1F4E6B' },
  'Les monstres sur le divan': { emoji: '👹', color: '#7a3b3b' },
};
const QUIZ_FALLBACK = { emoji: '🧠', color: '#1F4E6B' };

/** Tronque proprement à ~maxLen caractères sans couper un mot ni une paire de substitution UTF-16.
 *  Utilise [...str] (itération sur les points de code) pour compter les vrais caractères,
 *  ce qui évite de couper au milieu d'un emoji (ex: 🦸 = 2 code units). */
function truncateDesc(text, maxLen = 140) {
  if (!text) return '';
  const plain = text.replace(/<[^>]+>/g, '').trim();
  const codePoints = [...plain];                          // tableau de vrais caractères Unicode
  if (codePoints.length <= maxLen) return plain;
  const cut = codePoints.slice(0, maxLen).join('');
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…';
}

// Constantes pour le calcul isNew (30 jours)
const TODAY_MS   = new Date(TODAY + 'T00:00:00').getTime();
const THIRTY_MS  = 30 * 24 * 60 * 60 * 1000;

// 1. Construire les entrées auto depuis les articles
const autoTests = [];
for (const file of jsonFiles) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));

  // Même filtre que articles.json : pas de draft, pas de date future
  if ((j.status || 'published') === 'draft') continue;
  if (j.date > TODAY) continue;

  // Détecter le quiz : cherche <iframe src="tests/{quizId}.html">
  // (accepte src avec ou sans slash initial)
  const iframeMatch = j.content &&
    j.content.match(/src=["'](?:\/)?tests\/([^"']+\.html)["']/);
  if (!iframeMatch) continue;

  const quizFile = iframeMatch[1];                     // ex: "witzelsucht-quiz.html"
  const quizId   = quizFile.replace(/\.html$/i, '');   // ex: "witzelsucht-quiz"

  // Overrides optionnels (champ quizCard — 100% facultatif)
  const ov  = j.quizCard || {};
  const cat = QUIZ_CAT_MAP[j.category] || QUIZ_FALLBACK;

  const artDateMs = new Date(j.date + 'T00:00:00').getTime();

  autoTests.push({
    id:         quizId,
    title:      ov.title    || j.title,
    desc:       ov.desc     || truncateDesc(j.excerpt),
    emoji:      ov.emoji    || cat.emoji,
    color:      ov.color    || cat.color,
    catLabel:   ov.catLabel || j.category,
    duration:   ov.duration || '5 min',
    testUrl:    'tests/' + quizFile,
    articleUrl: 'articles/' + j.id + '/',
    image:      j.image     || '',
    isNew:      (TODAY_MS - artDateMs) <= THIRTY_MS,
    status:     'published',
    _date:      j.date,     // champ interne pour le tri, retiré à l'écriture
  });
}

// 2. Entrées manuelles (quizzes sans article correspondant, ex: savoir-dire-non)
let manualTests = [];
try {
  const rawManual = JSON.parse(fs.readFileSync(TESTS_MANUAL, 'utf8'));
  if (Array.isArray(rawManual)) {
    manualTests = rawManual;
  } else {
    // JSON valide mais pas un tableau → crash silencieux évité, avertissement explicite
    console.warn(`⚠ ${TESTS_MANUAL} n'est pas un tableau JSON — entrées manuelles ignorées`);
  }
} catch (e) {
  if (e.code !== 'ENOENT') {
    // Fichier présent mais JSON invalide → ne pas perdre l'entrée en silence
    console.warn(`⚠ ${TESTS_MANUAL} invalide (${e.message}) — entrées manuelles ignorées`);
  }
  /* ENOENT = fichier absent → liste vide, comportement normal */
}

// 3. Fusion : auto prioritaires ; manual conservés si l'id n'est pas auto-généré
const autoIds  = new Set(autoTests.map(t => t.id));
const merged   = [
  ...autoTests,
  ...manualTests.filter(t => !autoIds.has(t.id)),
];

// 4. Tri par date d'article décroissante (plus récent en tête du hub)
merged.sort((a, b) => (b._date || '').localeCompare(a._date || ''));

// 5. Retirer le champ interne _date avant écriture (idempotence / pas de bruit git)
const testsOutput = merged.map(({ _date, ...rest }) => rest);

fs.writeFileSync(TESTS_FILE, JSON.stringify(testsOutput, null, 2), 'utf8');
console.log(`🧪 data/tests.json mis à jour (${testsOutput.length} tests — ${autoTests.length} auto + ${merged.length - autoTests.length} manuel(s))`);

console.log(`\n✅ ${jsonFiles.length} pages statiques générées avec succès !`);
