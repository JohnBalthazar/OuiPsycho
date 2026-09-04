/**
 * article-template.js — gabarit HTML des pages article, source unique
 * partagée par _gen_static.js (génération de masse, Node) et poulet.html
 * (éditeur, navigateur).
 *
 * Toute modification du rendu d'une page article doit passer par ce
 * fichier et par lui seul. C'est précisément l'existence de deux copies
 * séparées (une par système) qui a permis à poulet.html de dériver
 * silencieusement vers un gabarit obsolète — incident du 2026-09-04
 * (image hero disparue, bloc auteur générique, catégories obsolètes...).
 *
 * buildArticleHTML(j, opts) est une fonction pure : aucun accès fichier,
 * aucun appel réseau. j est un objet article (même forme que
 * articles/*.json). opts est entièrement optionnel et ne sert qu'au
 * maillage inter-articles (clusters thématiques), que seul _gen_static.js
 * sait calculer (il a besoin de voir tous les articles du site à la
 * fois pour savoir qui appartient à quel cluster) :
 *   - clusterTrailHtml   : HTML du fil de parcours sous le h1
 *   - relatedWidgetHtml  : HTML du widget sidebar (remplace "À lire aussi")
 *   - continueBlockHtml  : HTML du bloc "Pour continuer" en fin d'article
 *   - breadcrumbHref/breadcrumbLabel/breadcrumbLevel2 : fil d'Ariane +
 *     JSON-LD, quand le cluster remplace la catégorie au niveau 2
 * Sans opts (cas normal pour poulet.html, qui n'a pas connaissance des
 * clusters), le gabarit se comporte exactement comme un article hors
 * cluster — jamais de régression, jamais un champ qui casse faute d'être
 * fourni.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ArticleTemplate = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BASE = 'https://ouipsycho.fr';
  const AMAZON_TAG = 'ouipsycho-21';

  const AUTHOR_NAME      = 'John Balthazar';
  const AUTHOR_BIO_SHORT = 'Infirmier ayant exercé plusieurs années en psychiatrie, John Balthazar est l\'auteur de « Mon mari est une pantoufle, des brèves de psychiatrie ». Il écrit sous pseudonyme pour préserver la séparation entre son activité hospitalière et son travail d\'écriture.';
  const AUTHOR_PHOTO_ABS = `${BASE}/images/auteur.jpg`;
  const AUTHOR_PHOTO_REL = 'images/auteur.jpg';
  const AUTHOR_PAGE_URL  = `${BASE}/a-propos.html`;
  const AUTHOR_BOOK_ASIN = 'B08NWTCT2G';
  const AUTHOR_BOOK_URL  = AUTHOR_BOOK_ASIN ? `https://www.amazon.fr/dp/${AUTHOR_BOOK_ASIN}?tag=${AMAZON_TAG}` : '';
  const AUTHOR_BOOK_SAME_AS = AUTHOR_BOOK_ASIN ? `https://www.amazon.fr/dp/${AUTHOR_BOOK_ASIN}` : '';
  const RÉDACTION_SET = new Set(['La rédaction Oui Psycho!', 'La rédaction', 'Oui Psycho!', 'Rédaction Oui Psycho!']);

  const MONTHS = ['','janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

  const CAT = {
    'Bien-être':               { color: '#059669', bg: '#ECFDF5', enc: 'Bien-%C3%AAtre' },
    'Relations':               { color: '#BE185D', bg: '#FDF2F8', enc: 'Relations' },
    'Sommeil':                 { color: '#0369A1', bg: '#ECFEFF', enc: 'Sommeil' },
    'Troubles Psy':            { color: '#7C3AED', bg: '#F5F3FF', enc: 'Troubles%20Psy' },
    'Thérapies':               { color: '#6D28D9', bg: '#EDE9FE', enc: 'Th%C3%A9rapies' },
    'Développement personnel': { color: '#15803D', bg: '#F0FDF4', enc: 'D%C3%A9veloppement%20personnel' },
    'Sexo':                    { color: '#C2185B', bg: '#FCE4EC', enc: 'Sexo' },
  };
  const RUBRIQUE_PAGES = {
    'Société':                          'societe.html',
    'Société & psychologie politique':  'societe.html',
    'Sexo':                             'sexo.html',
    'Nos héros sur le divan':           'nos-heros-sur-le-divan.html',
    'Les monstres sur le divan':        'les-monstres-sur-le-divan.html',
  };
  const NAV_CATS = ['Bien-être','Sommeil','Troubles Psy','Thérapies','Relations'];

  function escCard(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escLd(s) { return s.replace(/<\/script>/gi, '<\\/script>'); }
  function fmtDate(d) {
    const [y, m, day] = d.split('-');
    return `${parseInt(day)} ${MONTHS[parseInt(m)]} ${y}`;
  }
  function effectiveModified(a) {
    return (a.date_modified && a.date_modified > a.date) ? a.date_modified : a.date;
  }
  function wrapTables(html) {
    let result = html.replace(/<div class="table-wrap">\s*(<table[\s\S]*?<\/table>)\s*<\/div>/g, '$1');
    result = result.replace(/(<table[\s\S]*?<\/table>)/g, '<div class="table-wrap">$1</div>');
    return result;
  }

  function buildArticleHTML(j, opts) {
    opts = opts || {};
    const TODAY = new Date().toISOString().split('T')[0];
    const YEAR  = new Date().getFullYear();

    const ci = CAT[j.category] || { color: '#555', bg: '#f5f5f5', enc: encodeURIComponent(j.category || '') };
    const fd = fmtDate(j.date);

    const displayAuthor = (!j.author || RÉDACTION_SET.has(j.author)) ? AUTHOR_NAME : j.author;
    const isJohnB = displayAuthor === AUTHOR_NAME;

    // noindex tant que la date n'est pas atteinte. Sans effet pour
    // _gen_static.js (qui ne génère jamais un article à date future) ;
    // nécessaire pour poulet.html, qui publie tout de suite le fichier
    // HTML même pour un article "scheduled".
    const robotsMeta = (j.status === 'scheduled' && j.date > TODAY) ? 'noindex, nofollow' : 'index, follow';

    const heroPos   = j.imagePosition || 'center center';
    const heroZoom  = parseFloat(j.imageZoom) || 1;
    const heroStyle = `object-position:${escCard(heroPos)}${heroZoom > 1 ? `;transform:scale(${heroZoom});transform-origin:${escCard(heroPos)}` : ''}`;
    const heroImageHtml = (j.image && (j.imageLayout || 'top') === 'top')
      ? `\n          <div class="article-hero-image">\n            <img src="${escCard(j.image)}" alt="${escCard(j.title)}" loading="lazy" style="${heroStyle}">\n          </div>`
      : '';

    let kpHtml = '';
    if (j.keypoints && j.keypoints.length) {
      const li = j.keypoints.map(k => `        <li>${k}</li>`).join('\n');
      kpHtml = `    <div class="article-keypoints">\n      <div class="article-keypoints__title">💡 Points clés de cet article</div>\n      <ul>\n${li}\n      </ul>\n    </div>\n`;
    }

    let sourcesHtml = '';
    let hasAmazon = false;
    if (j.sources && j.sources.length) {
      const srcItems = j.sources.map(s => {
        if (typeof s === 'string') {
          return `        <li>${s}</li>`;
        }
        const authYear = [s.authors, s.year ? `(${s.year})` : ''].filter(Boolean).join(' ');
        const anchor   = s.url
          ? `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${authYear}</a>`
          : authYear;
        const venue    = s.journal   ? ` <cite>${s.journal}</cite>`
                       : s.publisher ? ` <cite>${s.publisher}</cite>` : '';
        let amazonBtn  = '';
        if (s.amazon_asin) {
          hasAmazon = true;
          const amzUrl = `https://www.amazon.fr/dp/${s.amazon_asin}?tag=${AMAZON_TAG}`;
          amazonBtn = ` <a href="${amzUrl}" target="_blank" rel="noopener sponsored" class="btn-amazon">🛒 Voir sur Amazon</a>`;
        }
        return `        <li>${anchor}${s.title ? ' — ' + s.title : ''}${venue}.${amazonBtn}</li>`;
      }).join('\n');
      const affiliateNote = hasAmazon
        ? `\n          <p class="sources-affiliate-note">🛒 Liens affiliés Amazon — vous payez le même prix, une petite commission aide à financer ce site.</p>`
        : '';
      sourcesHtml = `
        <section class="article-sources" aria-label="Sources et références">
          <h2 class="article-sources__title">📚 Sources &amp; références</h2>
          <ol class="article-sources__list">
${srcItems}
          </ol>${affiliateNote}
        </section>
`;
    }

    const tagsHtml = (j.tags || []).map(t => `<span class="tag">#${t}</span>`).join(' ');

    const navHtml = NAV_CATS.map(nc => {
      const nc_enc = (CAT[nc] || {}).enc || encodeURIComponent(nc);
      const cls = nc === j.category ? 'cat-nav__btn active' : 'cat-nav__btn';
      return `        <a class="${cls}" href="index.html?cat=${nc_enc}">${nc}</a>`;
    }).join('\n');

    const clusterTrailHtml  = opts.clusterTrailHtml  || '';
    const continueBlockHtml = opts.continueBlockHtml || '';
    const relatedWidgetHtml = opts.relatedWidgetHtml || '<h2 class="widget__title">À lire aussi</h2>';

    const wordCount = (j.content || '').replace(/<[^>]+>/g,'').split(/\s+/).length;

    const authorLd = { "@type": "Person", "name": displayAuthor };
    if (isJohnB) {
      authorLd.url   = AUTHOR_PAGE_URL;
      authorLd.image = { "@type": "ImageObject", "url": AUTHOR_PHOTO_ABS, "width": 800, "height": 800 };
      if (AUTHOR_BOOK_SAME_AS) authorLd.sameAs = [AUTHOR_BOOK_SAME_AS];
    }

    const aLDobj = {
      "@context":         "https://schema.org",
      "@type":            "BlogPosting",
      "headline":         j.title,
      "description":      j.metaDescription,
      "datePublished":    `${j.date}T00:00:00+02:00`,
      "dateModified":     `${effectiveModified(j)}T00:00:00+02:00`,
      "inLanguage":       "fr-FR",
      "author":           authorLd,
      "publisher": {
        "@type": "Organization",
        "name":  "Oui Psycho!",
        "url":   `${BASE}/`,
        "logo":  { "@type": "ImageObject", "url": `${BASE}/img/logo-brain.svg` }
      },
      "mainEntityOfPage": { "@type": "WebPage", "@id": `${BASE}/articles/${j.id}/` },
      "keywords":         (j.tags || []).join(', '),
      "articleSection":   j.category,
      "wordCount":        wordCount
    };
    if (j.image) aLDobj.image = { "@type": "ImageObject", "url": j.image, "width": 1200, "height": 630 };
    const srcWithUrl = (j.sources || []).filter(s => typeof s === 'object' && s.url);
    if (srcWithUrl.length) {
      aLDobj.citation = srcWithUrl.map(s => {
        const c = { "@type": "CreativeWork", "name": s.title || '', "url": s.url };
        if (s.authors) c.author = s.authors;
        if (s.year)    c.datePublished = s.year;
        if (s.journal) c.isPartOf = { "@type": "Periodical", "name": s.journal };
        return c;
      });
    }
    const aLD = escLd(JSON.stringify(aLDobj));

    const catHref  = RUBRIQUE_PAGES[j.category] || `index.html?cat=${ci.enc}`;
    const catHrefAbs = RUBRIQUE_PAGES[j.category]
      ? `${BASE}/${RUBRIQUE_PAGES[j.category]}`
      : `${BASE}/?cat=${ci.enc}`;

    const breadcrumbHref  = opts.breadcrumbHref  || catHref;
    const breadcrumbLabel = opts.breadcrumbLabel || j.category;
    const breadcrumbLevel2 = opts.breadcrumbLevel2 || { "@type": "ListItem", "position": 2, "name": j.category, "item": catHrefAbs };

    const bLD = escLd(JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Accueil", "item": `${BASE}/` },
        breadcrumbLevel2,
        { "@type": "ListItem", "position": 3, "name": j.title, "item": `${BASE}/articles/${j.id}/` }
      ]
    }));

    const modDate = effectiveModified(j);
    const fdMod    = modDate !== j.date ? fmtDate(modDate) : null;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${j.title} — Oui Psycho!</title>
  <meta name="description" content="${j.metaDescription}">
  <meta name="author" content="${displayAuthor}">
  <meta name="robots" content="${robotsMeta}">
  <meta name="theme-color" content="#1F4E6B">
  <base href="../../">
  <link rel="canonical" href="${BASE}/articles/${j.id}/">
  <meta property="og:type"                    content="article">
  <meta property="og:title"                   content="${j.title} — Oui Psycho!">
  <meta property="og:description"             content="${j.metaDescription}">
  <meta property="og:url"                     content="${BASE}/articles/${j.id}/">
  <meta property="og:locale"                  content="fr_FR">
  <meta property="og:site_name"               content="Oui Psycho!">
  <meta property="article:published_time"     content="${j.date}T00:00:00+01:00">
  <meta property="article:modified_time"      content="${effectiveModified(j)}T00:00:00+01:00">
  <meta property="article:author"             content="${displayAuthor}">
  <meta property="article:section"            content="${j.category}">${j.image ? `
  <meta property="og:image"                   content="${j.image}">
  <meta property="og:image:alt"               content="${j.title}">
  <meta property="og:image:width"             content="1200">
  <meta property="og:image:height"            content="630">` : ''}
  <meta name="twitter:card"                   content="summary_large_image">
  <meta name="twitter:title"                  content="${j.title} — Oui Psycho!">
  <meta name="twitter:description"            content="${j.metaDescription}">${j.image ? `
  <meta name="twitter:image"                  content="${j.image}">` : ''}
  <script type="application/ld+json">${aLD}<\/script>
  <script type="application/ld+json">${bLD}<\/script>
  <link rel="icon" type="image/png" href="img/logo-brain.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@400;500;600;700;800&display=swap">
  <link rel="stylesheet" href="css/style.css">
  <!-- Google Consent Mode v2 (RGPD/Europe) -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    // Restaure le consentement depuis localStorage AVANT que GA ne charge.
    // Évite le délai wait_for_update pour les visiteurs ayant déjà accepté.
    var _pc = (function(){ try { return localStorage.getItem('pc_consent'); } catch(e){ return null; } })();
    if (_pc === '1') {
      // Déjà accepté → GA collecte immédiatement
      gtag('consent', 'default', {
        'analytics_storage':    'granted',
        'ad_storage':           'denied',
        'ad_user_data':         'denied',
        'ad_personalization':   'denied',
      });
    } else {
      // Nouveau visiteur ou refus → anonymisé, attente bannière
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
  <\/script>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-NR52DCZ6ZJ"><\/script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-NR52DCZ6ZJ');
  <\/script>
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
        <a class="nav__link" href="a-propos.html">Qui sommes-nous ?</a>
        <a class="nav__link nav__cta" href="index.html#newsletter-widget">Newsletter</a>
      </nav>
    </div>
    <nav class="cat-nav" aria-label="Catégories">
      <div class="cat-nav__inner">
        <a class="cat-nav__btn" href="index.html">← Tous les articles</a>
        <div class="cat-nav__divider" aria-hidden="true"></div>
${navHtml}
        <div class="cat-nav__divider" aria-hidden="true"></div>
        <a class="cat-nav__btn${j.category === 'Société' || j.category === 'Société & psychologie politique' ? ' active' : ''}" href="societe.html">🌍 Société</a>
        <a class="cat-nav__btn${j.category === 'Sexo' ? ' active' : ''}" href="sexo.html">❤️ Sexo</a>
        <a class="cat-nav__btn${j.category === 'Nos héros sur le divan' ? ' active' : ''}" href="nos-heros-sur-le-divan.html">🦸 Nos héros</a>
        <a class="cat-nav__btn" href="dossiers.html">📚 Dossiers</a>
      </div>
    </nav>
  </header>

  <div class="container layout article-page">
    <main>
      <article id="article-content" data-static="true" data-id="${j.id}">

        <header class="article-header">
          <nav class="breadcrumb" aria-label="Fil d'Ariane">
            <a href="index.html">Accueil</a> <span>›</span>
            <a href="${breadcrumbHref}">${breadcrumbLabel}</a>
            <span>›</span> <span aria-current="page">${j.title}</span>
          </nav>
          <span class="badge badge--large" style="color:${ci.color};background:${ci.bg}">${j.category}</span>
          <h1>${j.title}</h1>
          <div class="article-meta">
            <span class="article-meta-author">${isJohnB ? `<img src="${AUTHOR_PHOTO_REL}" alt="John Balthazar, auteur de Oui Psycho!" class="article-meta-author__avatar" width="36" height="36" loading="lazy">` : ''}Par <strong>${displayAuthor}</strong></span>
            <span class="article-meta-dot">•</span>
            <time datetime="${j.date}">Publié le ${fd}</time>${fdMod ? `<span class="article-meta-dot">•</span><time datetime="${modDate}">Mis à jour le ${fdMod}</time>` : ''}
            <span class="article-meta-dot">•</span>
            <span>⏱ ${j.readTime} min de lecture</span>
            <div class="article-meta-share" id="share-top" aria-label="Partager">
              <button class="share-icon-btn share-icon-btn--wa" data-platform="whatsapp" title="Partager sur WhatsApp" aria-label="WhatsApp">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              </button>
              <button class="share-icon-btn share-icon-btn--fb" data-platform="facebook" title="Partager sur Facebook" aria-label="Facebook">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </button>
              <button class="share-icon-btn share-icon-btn--tw" data-platform="twitter" title="Partager sur X" aria-label="X / Twitter">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </button>
              <button class="share-icon-btn share-icon-btn--copy" data-platform="copy" title="Copier le lien" aria-label="Copier le lien">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </button>
            </div>
          </div>${clusterTrailHtml}${heroImageHtml}
        </header>

${kpHtml}
        <div class="article-body">
          ${wrapTables(j.content)}${continueBlockHtml}
        </div>
${sourcesHtml}
        <div class="author-box">
          ${isJohnB
            ? `<img src="${AUTHOR_PHOTO_REL}" alt="John Balthazar, auteur de Oui Psycho!" class="author-box__avatar" width="72" height="72" loading="lazy">`
            : '<div class="author-box__avatar-placeholder" aria-hidden="true">✍️</div>'}
          <div class="author-box__content">
            <div class="author-box__name">${displayAuthor}</div>
            <p class="author-box__bio">${isJohnB ? AUTHOR_BIO_SHORT : 'Rédacteur spécialisé en santé mentale.'}</p>
            <div class="author-box__links">
              <a href="a-propos.html" class="author-box__link">En savoir plus sur l'auteur →</a>${isJohnB && AUTHOR_BOOK_URL ? `\n              <a href="${AUTHOR_BOOK_URL}" target="_blank" rel="noopener sponsored" class="author-box__link author-box__link--book">📖 Le livre</a>` : ''}
            </div>
          </div>
        </div>${(isJohnB && AUTHOR_BOOK_URL && !hasAmazon) ? `\n        <p class="sources-affiliate-note">🛒 Lien affilié Amazon — vous payez le même prix, une petite commission aide à financer ce site.</p>` : ''}

        <div class="article-tags" aria-label="Mots-clés">${tagsHtml}</div>

        <div class="article-share" id="share-buttons" aria-label="Partager cet article">
          <span class="share-label">Partager :</span>
          <button class="share-btn share-btn--fb"   data-platform="facebook">Facebook</button>
          <button class="share-btn share-btn--tw"   data-platform="twitter">Twitter / X</button>
          <button class="share-btn share-btn--wa"   data-platform="whatsapp">WhatsApp</button>
          <button class="share-btn share-btn--copy" data-platform="copy">Copier le lien</button>
        </div>

        <aside class="article-disclaimer" role="note">
          ⚕️ <em>Cet article est fourni à titre <strong>informatif uniquement</strong> et ne remplace pas
          l'avis d'un professionnel de santé. En cas de détresse, appelez le
          <strong><a href="tel:3114">3114</a></strong> (24h/24, gratuit).</em>
        </aside>

      </article>
    </main>

    <aside id="article-sidebar" aria-label="Informations complémentaires">
      <div class="widget" id="toc">
        <h2 class="widget__title">Table des matières</h2>
      </div>
      <div class="widget" id="related-articles">
        ${relatedWidgetHtml}
      </div>
      <div class="widget widget--accent" id="newsletter-widget">
        <h2 class="widget__title">Newsletter</h2>
        <div class="newsletter-form" id="nl-form">
          <p>Un article par semaine pour prendre soin de votre santé mentale.</p>
          <label for="newsletter-email" class="sr-only">Votre e-mail</label>
          <input type="email" id="newsletter-email" class="newsletter-input" placeholder="votre@email.fr"
            onkeydown="if(event.key==='Enter')subscribeNewsletter()">
          <button class="btn-newsletter" type="button" id="nl-btn" onclick="subscribeNewsletter()">
            S'abonner gratuitement
          </button>
          <p id="nl-msg" style="display:none;font-size:.8rem;margin-top:8px;font-weight:600"></p>
        </div>
      </div>
    </aside>
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

  <script src="js/main.js"><\/script>
</body>
</html>
`;
  }

  return { buildArticleHTML };
});
