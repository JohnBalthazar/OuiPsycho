// Génération des 15 pages HTML statiques SEO — Oui Psycho!
const fs   = require('fs');
const path = require('path');

const BASE = 'https://ouipsycho.fr';
const DIR  = path.join(__dirname, 'articles');

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
  const aLD = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": j.title,
    "description": j.metaDescription,
    "datePublished": j.date,
    "dateModified": j.date,
    "inLanguage": "fr",
    "author": { "@type": "Person", "name": j.author },
    "publisher": { "@type": "Organization", "name": "Oui Psycho!", "url": `${BASE}/` },
    "mainEntityOfPage": { "@type": "WebPage", "@id": `${BASE}/articles/${j.id}.html` },
    "keywords": j.tags.join(', '),
    "articleSection": j.category,
    "wordCount": j.content.replace(/<[^>]+>/g,'').split(/\s+/).length
  });
  const bLD = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Accueil", "item": `${BASE}/` },
      { "@type": "ListItem", "position": 2, "name": j.category, "item": `${BASE}/index.html?cat=${ci.enc}` },
      { "@type": "ListItem", "position": 3, "name": j.title, "item": `${BASE}/articles/${j.id}.html` }
    ]
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${j.title} — Oui Psycho!</title>
  <meta name="description" content="${j.metaDescription}">
  <meta name="author" content="${j.author}">
  <meta name="robots" content="index, follow">
  <base href="../">
  <link rel="canonical" href="${BASE}/articles/${j.id}.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${j.title} — Oui Psycho!">
  <meta property="og:description" content="${j.metaDescription}">
  <meta property="og:url" content="${BASE}/articles/${j.id}.html">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:site_name" content="Oui Psycho!">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${aLD}</script>
  <script type="application/ld+json">${bLD}</script>
  <link rel="icon" type="image/svg+xml" href="img/favicon.svg">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>

  <div id="reading-progress" role="progressbar" aria-label="Progression de lecture" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>

  <header class="site-header" id="site-header">
    <div class="header-top">
      <a href="index.html" class="logo" aria-label="Oui Psycho! — Accueil">
        <span class="logo__icon" aria-hidden="true">🧠</span>
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
            <time datetime="${j.date}">${fd}</time>
            <span class="article-meta-dot">•</span>
            <span>⏱ ${j.readTime} min de lecture</span>
          </div>
        </header>

        <aside class="article-disclaimer" role="note">
          ⚕️ <em>Cet article est fourni à titre <strong>informatif uniquement</strong> et ne remplace pas
          l'avis d'un professionnel de santé. En cas de détresse, appelez le
          <strong><a href="tel:3114">3114</a></strong> (24h/24, gratuit).</em>
        </aside>

${kpHtml}
        <div class="article-body">
          ${j.content}
        </div>

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

      </article>
    </main>

    <aside id="article-sidebar" aria-label="Informations complémentaires">
      <div class="widget" id="toc">
        <h2 class="widget__title">Table des matières</h2>
      </div>
      <div class="widget" id="related-articles">
        <h2 class="widget__title">À lire aussi</h2>
      </div>
      <div class="widget widget--accent">
        <h2 class="widget__title">Newsletter</h2>
        <div class="newsletter-form">
          <p>Un article par semaine pour prendre soin de votre santé mentale.</p>
          <label for="nl-${j.id}" class="sr-only">Votre e-mail</label>
          <input type="email" id="nl-${j.id}" class="newsletter-input" placeholder="votre@email.fr">
          <button class="btn-newsletter" type="button">S'abonner ✓</button>
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
        <span>© 2026 Oui Psycho!. Tous droits réservés.</span>
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

  fs.writeFileSync(path.join(DIR, `${j.id}.html`), html, 'utf8');
  console.log(`✓ ${j.id}.html`);
}

console.log(`\n✅ ${jsonFiles.length} pages statiques générées avec succès !`);
