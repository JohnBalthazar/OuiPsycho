// Génération des pages HTML statiques SEO — Oui Psycho!
const fs   = require('fs');
const path = require('path');

const BASE = 'https://ouipsycho.fr';
const DIR  = path.join(__dirname, 'articles');
const YEAR = new Date().getFullYear();

const MONTHS = ['','janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

function fmtDate(d) {
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS[parseInt(m)]} ${y}`;
}

const CAT = {
  'Anxiété':                 { color: '#7C3AED', bg: '#F5F3FF', enc: 'Anxi%C3%A9t%C3%A9' },
  'Dépression':              { color: '#1D4ED8', bg: '#EFF6FF', enc: 'D%C3%A9pression' },
  'Bien-être':               { color: '#059669', bg: '#ECFDF5', enc: 'Bien-%C3%AAtre' },
  'Relations':               { color: '#BE185D', bg: '#FDF2F8', enc: 'Relations' },
  'Stress':                  { color: '#B45309', bg: '#FFFBEB', enc: 'Stress' },
  'Sommeil':                 { color: '#0369A1', bg: '#ECFEFF', enc: 'Sommeil' },
  'Thérapies':               { color: '#6D28D9', bg: '#EDE9FE', enc: 'Th%C3%A9rapies' },
  'Développement personnel': { color: '#15803D', bg: '#F0FDF4', enc: 'D%C3%A9veloppement%20personnel' },
};

const NAV_CATS = ['Anxiété','Dépression','Bien-être','Stress','Sommeil','Thérapies','Relations'];

const jsonFiles = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));

for (const file of jsonFiles) {
  const j   = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  const ci  = CAT[j.category] || { color: '#555', bg: '#f5f5f5', enc: encodeURIComponent(j.category) };
  const fd  = fmtDate(j.date);

  // Keypoints
  let kpHtml = '';
  if (j.keypoints && j.keypoints.length) {
    const li = j.keypoints.map(k => `        <li>${k}</li>`).join('\n');
    kpHtml = `    <div class="article-keypoints">\n      <div class="article-keypoints__title">💡 Points clés de cet article</div>\n      <ul>\n${li}\n      </ul>\n    </div>\n`;
  }

  // Sources & références
  let sourcesHtml = '';
  if (j.sources && j.sources.length) {
    const srcItems = j.sources.map(s => {
      if (typeof s === 'string') {
        // Format legacy : chaîne brute
        return `        <li>${s}</li>`;
      }
      // Format structuré : { authors, year, title, journal|publisher, url }
      const authYear = [s.authors, s.year ? `(${s.year})` : ''].filter(Boolean).join(' ');
      const anchor   = s.url
        ? `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${authYear}</a>`
        : authYear;
      const venue    = s.journal   ? ` <cite>${s.journal}</cite>`
                     : s.publisher ? ` <cite>${s.publisher}</cite>` : '';
      return `        <li>${anchor}${s.title ? ' — ' + s.title : ''}${venue}.</li>`;
    }).join('\n');
    sourcesHtml = `
        <section class="article-sources" aria-label="Sources et références">
          <h2 class="article-sources__title">📚 Sources &amp; références</h2>
          <ol class="article-sources__list">
${srcItems}
          </ol>
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

  // JSON-LD
  const esc = s => String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  const wordCount = j.content.replace(/<[^>]+>/g,'').split(/\s+/).length;
  const aLDobj = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": j.title,
    "description": j.metaDescription,
    "datePublished": j.date,
    "dateModified": j.date_modified || j.date,
    "inLanguage": "fr",
    "author": { "@type": "Person", "name": j.author },
    "publisher": {
      "@type": "Organization",
      "name": "Oui Psycho!",
      "url": `${BASE}/`,
      "logo": { "@type": "ImageObject", "url": `${BASE}/img/favicon.svg` }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": `${BASE}/articles/${j.id}/` },
    "keywords": j.tags.join(', '),
    "articleSection": j.category,
    "wordCount": wordCount
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
  const aLD = JSON.stringify(aLDobj);
  const bLD = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Accueil", "item": `${BASE}/` },
      { "@type": "ListItem", "position": 2, "name": j.category, "item": `${BASE}/?cat=${ci.enc}` },
      { "@type": "ListItem", "position": 3, "name": j.title, "item": `${BASE}/articles/${j.id}/` }
    ]
  });

  // Label de date : "Publié le" ou "Mis à jour le"
  const fdMod = j.date_modified && j.date_modified !== j.date
    ? (() => { const [my,mm,md] = j.date_modified.split('-'); return `${parseInt(md)} ${MONTHS[parseInt(mm)]} ${my}`; })()
    : null;
  const dateLabel   = fdMod ? `Mis à jour le ${fdMod}` : `Publié le ${fd}`;
  const dateDatetime = j.date_modified || j.date;

  const outDir  = path.join(DIR, j.id);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${j.title} — Oui Psycho!</title>
  <meta name="description" content="${j.metaDescription}">
  <meta name="author" content="${j.author}">
  <meta name="robots" content="index, follow">
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
  <meta property="article:author"             content="${j.author}">
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
  <link rel="stylesheet" href="css/style.css">
  <!-- Google Consent Mode v2 (RGPD/Europe) — défaut : refusé -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
      'analytics_storage':    'denied',
      'ad_storage':           'denied',
      'ad_user_data':         'denied',
      'ad_personalization':   'denied',
      'wait_for_update':      2000
    });
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
        <a class="nav__link" href="a-propos.html">À propos</a>
        <a class="nav__link" href="contact.html">Contact</a>
        <a class="nav__link nav__cta" href="index.html#newsletter-widget">Newsletter</a>
      </nav>
    </div>
    <nav class="cat-nav" aria-label="Catégories">
      <div class="cat-nav__inner">
        <a class="cat-nav__btn" href="index.html">← Tous les articles</a>
        <div class="cat-nav__divider" aria-hidden="true"></div>
${navHtml}
      </div>
    </nav>
  </header>

  <div class="container layout article-page">
    <main>
      <article id="article-content" data-static="true" data-id="${j.id}">

        <header class="article-header">
          <nav class="breadcrumb" aria-label="Fil d'Ariane">
            <a href="index.html">Accueil</a> <span>›</span>
            <a href="index.html?cat=${ci.enc}">${j.category}</a>
            <span>›</span> <span aria-current="page">${j.title}</span>
          </nav>
          <span class="badge badge--large" style="color:${ci.color};background:${ci.bg}">${j.category}</span>
          <h1>${j.title}</h1>
          <div class="article-meta">
            <span>Par <strong>${j.author}</strong></span>
            <span class="article-meta-dot">•</span>
            <time datetime="${dateDatetime}">${dateLabel}</time>
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
        <div class="article-author">
          <div class="article-author__avatar" aria-hidden="true">✍️</div>
          <div>
            <div class="article-author__name">${j.author}</div>
            <div class="article-author__role">Rédacteur spécialisé en santé mentale</div>
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
            <li><a href="index.html?cat=Anxi%C3%A9t%C3%A9">Anxiété</a></li>
            <li><a href="index.html?cat=D%C3%A9pression">Dépression</a></li>
            <li><a href="index.html?cat=Bien-%C3%AAtre">Bien-être</a></li>
            <li><a href="index.html?cat=Stress">Stress</a></li>
            <li><a href="index.html?cat=Sommeil">Sommeil</a></li>
            <li><a href="index.html?cat=Th%C3%A9rapies">Thérapies</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>À propos</h4>
          <ul class="footer-links">
            <li><a href="a-propos.html">Qui sommes-nous ?</a></li>
            <li><a href="contact.html">Contact</a></li>
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

  <div id="cookie-banner" role="dialog" aria-label="Cookies">
    <p class="cookie-text">🍪 Nous utilisons des cookies pour améliorer votre expérience.
      <a href="politique-de-confidentialite.html">En savoir plus</a>.</p>
    <div class="cookie-buttons">
      <button class="btn-cookie btn-cookie--accept" id="cookie-accept">Accepter</button>
      <button class="btn-cookie btn-cookie--decline" id="cookie-decline">Refuser</button>
    </div>
  </div>

  <script src="js/main.js"></script>
</body>
</html>
`;

  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  console.log(`✓ ${j.id}/index.html`);
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
}).sort((a, b) => b.date.localeCompare(a.date)); // tri par date décroissante

fs.writeFileSync(INDEX_FILE, JSON.stringify(newIndex, null, 2), 'utf8');
console.log(`📋 data/articles.json mis à jour (${newIndex.length} articles)`);
console.log(`\n✅ ${jsonFiles.length} pages statiques générées avec succès !`);
