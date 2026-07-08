// Génération des pages HTML statiques SEO — Oui Psycho!
const fs   = require('fs');
const path = require('path');

const BASE  = 'https://ouipsycho.fr';
const DIR   = path.join(__dirname, 'articles');
const YEAR  = new Date().getFullYear();
const TODAY = new Date().toISOString().split('T')[0];  // YYYY-MM-DD, pour filtrer les articles planifiés

// ── Affiliation Amazon ───────────────────────────────────────────────────────
const AMAZON_TAG  = 'ouipsycho-21';

// ── Identité auteur & E-E-A-T ────────────────────────────────────────────────
const AUTHOR_NAME      = 'John Balthazar';
const AUTHOR_BIO_SHORT = 'Infirmier ayant exercé plusieurs années en psychiatrie, John Balthazar est l\'auteur de « Mon mari est une pantoufle, des brèves de psychiatrie ». Il écrit sous pseudonyme pour préserver la séparation entre son activité hospitalière et son travail d\'écriture.';
const AUTHOR_PHOTO_ABS = `${BASE}/images/auteur.jpg`;  // URL absolue (JSON-LD, OG)
const AUTHOR_PHOTO_REL = 'images/auteur.jpg';           // chemin relatif (base href="../../" sur les pages articles)
const AUTHOR_PAGE_URL  = `${BASE}/a-propos.html`;
// Livre de l'auteur — renseigner l'ASIN Amazon ; laisser vide pour masquer tous les liens
const AUTHOR_BOOK_ASIN = 'B08NWTCT2G';
const AUTHOR_BOOK_URL  = AUTHOR_BOOK_ASIN
  ? `https://www.amazon.fr/dp/${AUTHOR_BOOK_ASIN}?tag=${AMAZON_TAG}`
  : '';  // vide = aucun lien livre affiché nulle part
const AUTHOR_BOOK_SAME_AS = AUTHOR_BOOK_ASIN
  ? `https://www.amazon.fr/dp/${AUTHOR_BOOK_ASIN}`  // URL propre pour JSON-LD sameAs (sans tag)
  : '';
// Noms génériques à remplacer par AUTHOR_NAME
const RÉDACTION_SET    = new Set(['La rédaction Oui Psycho!', 'La rédaction', 'Oui Psycho!', 'Rédaction Oui Psycho!']);

const MONTHS = ['','janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

function fmtDate(d) {
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS[parseInt(m)]} ${y}`;
}

const CAT = {
  'Bien-être':               { color: '#059669', bg: '#ECFDF5', enc: 'Bien-%C3%AAtre' },
  'Relations':               { color: '#BE185D', bg: '#FDF2F8', enc: 'Relations' },
  'Sommeil':                 { color: '#0369A1', bg: '#ECFEFF', enc: 'Sommeil' },
  'Troubles Psy':            { color: '#7C3AED', bg: '#F5F3FF', enc: 'Troubles%20Psy' },
  'Thérapies':               { color: '#6D28D9', bg: '#EDE9FE', enc: 'Th%C3%A9rapies' },
  'Développement personnel': { color: '#15803D', bg: '#F0FDF4', enc: 'D%C3%A9veloppement%20personnel' },
  'Sexo':                    { color: '#C2185B', bg: '#FCE4EC', enc: 'Sexo' },
};

// Catégories qui ont leur propre page rubrique (pas de filtre homepage)
const RUBRIQUE_PAGES = {
  'Société':                          'societe.html',
  'Société & psychologie politique':  'societe.html',
  'Sexo':                             'sexo.html',
  'Nos héros sur le divan':           'nos-heros-sur-le-divan.html',
  'Les monstres sur le divan':        'les-monstres-sur-le-divan.html',
};

const NAV_CATS = ['Bien-être','Sommeil','Troubles Psy','Thérapies','Relations'];

const jsonFiles = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));

for (const file of jsonFiles) {
  const j   = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  const ci  = CAT[j.category] || { color: '#555', bg: '#f5f5f5', enc: encodeURIComponent(j.category) };
  const fd  = fmtDate(j.date);

  // Auteur affiché : John Balthazar si rédaction générique, sinon respect du nom JSON
  const displayAuthor = (!j.author || RÉDACTION_SET.has(j.author)) ? AUTHOR_NAME : j.author;
  const isJohnB       = displayAuthor === AUTHOR_NAME;

  // Article dont la date n'est pas encore arrivée → on ne génère rien du tout
  // (couvre status=scheduled ET status=published avec date future)
  if (j.date > TODAY) {
    console.log(`⏳ articles/${j.id}/ ignoré — date future (${j.date})`);
    continue;
  }
  const robotsMeta = 'index, follow';

  // Keypoints
  let kpHtml = '';
  if (j.keypoints && j.keypoints.length) {
    const li = j.keypoints.map(k => `        <li>${k}</li>`).join('\n');
    kpHtml = `    <div class="article-keypoints">\n      <div class="article-keypoints__title">💡 Points clés de cet article</div>\n      <ul>\n${li}\n      </ul>\n    </div>\n`;
  }

  // Sources & références
  let sourcesHtml = '';
  if (j.sources && j.sources.length) {
    let hasAmazon = false;
    const srcItems = j.sources.map(s => {
      if (typeof s === 'string') {
        // Format legacy : chaîne brute
        return `        <li>${s}</li>`;
      }
      // Format structuré : { authors, year, title, journal|publisher, url, amazon_asin }
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

  // Tags
  const tagsHtml = j.tags.map(t => `<span class="tag">#${t}</span>`).join(' ');

  // Nav
  const navHtml = NAV_CATS.map(nc => {
    const nc_enc = (CAT[nc] || {}).enc || encodeURIComponent(nc);
    const cls = nc === j.category ? 'cat-nav__btn active' : 'cat-nav__btn';
    return `        <a class="${cls}" href="index.html?cat=${nc_enc}">${nc}</a>`;
  }).join('\n');

  // JSON-LD ───────────────────────────────────────────────────────────────────
  const esc = s => String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  // Sécurise l'injection dans <script>…</script> (séquence </script> interdite)
  const escLd = s => s.replace(/<\/script>/gi, '<\\/script>');
  const wordCount = j.content.replace(/<[^>]+>/g,'').split(/\s+/).length;

  // Auteur JSON-LD
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
    "dateModified":     `${j.date_modified || j.date}T00:00:00+02:00`,
    "inLanguage":       "fr-FR",
    "author":           authorLd,
    "publisher": {
      "@type": "Organization",
      "name":  "Oui Psycho!",
      "url":   `${BASE}/`,
      "logo":  { "@type": "ImageObject", "url": `${BASE}/img/logo-brain.svg` }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": `${BASE}/articles/${j.id}/` },
    "keywords":         j.tags.join(', '),
    "articleSection":   j.category,
    "wordCount":        wordCount
  };
  if (j.image) aLDobj.image = { "@type": "ImageObject", "url": j.image, "width": 1200, "height": 630 };
  // Schema.org citation (sources structurées avec URL uniquement)
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

  // Lien de catégorie : page rubrique dédiée ou filtre homepage
  const catHref  = RUBRIQUE_PAGES[j.category] || `index.html?cat=${ci.enc}`;
  const catHrefAbs = RUBRIQUE_PAGES[j.category]
    ? `${BASE}/${RUBRIQUE_PAGES[j.category]}`
    : `${BASE}/?cat=${ci.enc}`;

  const bLD = escLd(JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Accueil", "item": `${BASE}/` },
      { "@type": "ListItem", "position": 2, "name": j.category, "item": catHrefAbs },
      { "@type": "ListItem", "position": 3, "name": j.title, "item": `${BASE}/articles/${j.id}/` }
    ]
  }));

  // Label de date : "Publié le" ou "Mis à jour le"
  const fdMod = j.date_modified && j.date_modified !== j.date
    ? (() => { const [my,mm,md] = j.date_modified.split('-'); return `${parseInt(md)} ${MONTHS[parseInt(mm)]} ${my}`; })()
    : null;
  const dateLabel   = fdMod ? `Mis à jour le ${fdMod}` : `Publié le ${fd}`;
  const dateDatetime = j.date_modified || j.date;

  const outDir  = path.join(__dirname, 'articles', j.id);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const html = `<!DOCTYPE html>
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
  <meta property="article:modified_time"      content="${j.date_modified || j.date}T00:00:00+01:00">
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
  <script type="application/ld+json">${aLD}</script>
  <script type="application/ld+json">${bLD}</script>
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
  </script>
  <!-- Google tag (gtag.js) -->
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
            <a href="${catHref}">${j.category}</a>
            <span>›</span> <span aria-current="page">${j.title}</span>
          </nav>
          <span class="badge badge--large" style="color:${ci.color};background:${ci.bg}">${j.category}</span>
          <h1>${j.title}</h1>
          <div class="article-meta">
            <span class="article-meta-author">${isJohnB ? `<img src="${AUTHOR_PHOTO_REL}" alt="John Balthazar, auteur de Oui Psycho!" class="article-meta-author__avatar" width="36" height="36" loading="lazy">` : ''}Par <strong>${displayAuthor}</strong></span>
            <span class="article-meta-dot">•</span>
            <time datetime="${j.date}">Publié le ${fd}</time>${fdMod ? `<span class="article-meta-dot">•</span><time datetime="${j.date_modified}">Mis à jour le ${fdMod}</time>` : ''}
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
          </div>
        </header>

${kpHtml}
        <div class="article-body">
          ${j.content}
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
              <a href="a-propos.html" class="author-box__link">En savoir plus sur l'auteur →</a>${isJohnB && AUTHOR_BOOK_URL ? `\n              <a href="${AUTHOR_BOOK_URL}" target="_blank" rel="noopener" class="author-box__link author-box__link--book">📖 Le livre</a>` : ''}
            </div>
          </div>
        </div>

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
        <h2 class="widget__title">À lire aussi</h2>
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

  <script src="js/main.js"></script>
</body>
</html>
`;

  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  console.log(`✓ articles/${j.id}/index.html`);

  // ── Redirection depuis la racine /slug/ → /articles/slug/ ──
  const rootDir = path.join(__dirname, j.id);
  if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir, { recursive: true });
  const redirectHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
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
console.log(`🗺  sitemap.xml mis à jour (${sitemapArticles.length} articles JSON + ${orphanArticles.length} orphelins + ${sitemapDossiers.length} dossier(s))`);

// ── Injection des cards statiques dans les pages de listing (SEO sans JS) ─────
// Objectif : Googlebot voit du HTML avec liens internes dès le premier octet.
// Le JS prend le relais au chargement (renderPage remplace les cards en live).
//
// Approche : balanced-div walker → fonctionne à chaque ré-exécution du script
// même si le fichier contient déjà des cards du run précédent.

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
};

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
  const pub = a.date, mod = a.date_modified;
  if (!mod || mod <= pub) return 'Publié le ' + fmtDateCard(pub);
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
          <time datetime="${escCard(a.date_modified || a.date || '')}">${label}</time>
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
          <time datetime="${escCard(a.date_modified || a.date || '')}">${label}</time>
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

console.log(`\n✅ ${jsonFiles.length} pages statiques générées avec succès !`);
