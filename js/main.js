/**
 * PSYCHO CLAIR — Script principal
 * Gestion du chargement dynamique des articles, filtres, recherche, partage.
 *
 * ⚠️  Avant mise en production :
 *   1. Remplacer CONFIG.siteUrl par votre vraie URL
 *   2. Remplacer "ca-pub-XXXXXXXXXXXXXXXX" par votre Publisher ID AdSense
 *   3. Remplacer les data-ad-slot="XXXXXXXXXX" par vos vrais IDs de blocs pub
 */

'use strict';

/* ============================================================
   CONFIGURATION
   ============================================================ */
const CONFIG = {
  dataUrl:      'data/articles.json',
  articlesBase: 'articles/',
  perPage:      9,
  siteName:     'Psycho Clair',
  siteUrl:      'https://johnbalthazar.github.io/Esprit-Clair',
};

/* ============================================================
   CATÉGORIES (couleur badge)
   ============================================================ */
const CATEGORIES = {
  'Anxiété':                  { color: '#7C3AED', bg: '#F5F3FF' },
  'Dépression':               { color: '#2563EB', bg: '#EFF6FF' },
  'Bien-être':                { color: '#059669', bg: '#ECFDF5' },
  'Relations':                { color: '#DB2777', bg: '#FDF2F8' },
  'Stress':                   { color: '#D97706', bg: '#FFFBEB' },
  'Sommeil':                  { color: '#0891B2', bg: '#ECFEFF' },
  'Thérapies':                { color: '#6D28D9', bg: '#EDE9FE' },
  'Développement personnel':  { color: '#16A34A', bg: '#F0FDF4' },
};

/* ============================================================
   UTILITAIRES
   ============================================================ */

/** Échappe les caractères HTML dangereux */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Formate une date ISO en français */
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

/** Lit un paramètre de l'URL */
function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** Retourne les attributs de style pour la couleur d'une catégorie */
function catStyle(category) {
  const c = CATEGORIES[category];
  return c ? `style="color:${c.color};background:${c.bg}"` : '';
}

/** Debounce simple */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Met à jour ou crée un meta tag */
function setMeta(attr, attrVal, content) {
  let el = document.querySelector(`meta[${attr}="${attrVal}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/* ============================================================
   SKELETONS
   ============================================================ */
function skeletons(n) {
  return Array(n).fill('').map(() => `
    <div class="card card--skeleton">
      <div class="card__image skeleton-box"></div>
      <div class="card__body">
        <div class="skeleton-line w-20"></div>
        <div class="skeleton-line w-80 h-large mt-8"></div>
        <div class="skeleton-line w-60 h-large"></div>
        <div class="skeleton-line w-40 mt-8"></div>
      </div>
    </div>`).join('');
}

/* ============================================================
   RENDU D'UNE CARTE D'ARTICLE
   ============================================================ */
function renderCard(article, featured = false) {
  const imgStyle = article.image
    ? `background-image:url('${esc(article.image)}')`
    : '';
  return `
    <article class="card${featured ? ' card--featured' : ''}" data-category="${esc(article.category || '')}">
      <a href="article.html?id=${esc(article.id)}" class="card__image-link" aria-label="${esc(article.title)}">
        <div class="card__image" style="${imgStyle}">
          ${!article.image ? '<span class="card__image-placeholder" aria-hidden="true">🧠</span>' : ''}
        </div>
      </a>
      <div class="card__body">
        <span class="badge" ${catStyle(article.category)}>${esc(article.category || 'Général')}</span>
        <h2 class="card__title">
          <a href="article.html?id=${esc(article.id)}">${esc(article.title)}</a>
        </h2>
        <p class="card__excerpt">${esc(article.excerpt || '')}</p>
        <footer class="card__meta">
          <time datetime="${esc(article.date || '')}">${formatDate(article.date)}</time>
          <span>·</span>
          <span>${article.readTime || 5} min de lecture</span>
        </footer>
        <a href="article.html?id=${esc(article.id)}" class="card__read-more">Lire l'article</a>
      </div>
    </article>`;
}

/* ============================================================
   PAGE D'ACCUEIL
   ============================================================ */
let allArticles    = [];
let filteredArticles = [];
let currentPage    = 0;
let activeCategory = 'all';
let searchQuery    = '';

async function initHome() {
  const grid       = document.getElementById('articles-grid');
  const loadMoreBtn = document.getElementById('load-more');
  const searchInput = document.getElementById('search-input');
  if (!grid) return;

  // Skeletons pendant le chargement
  grid.innerHTML = skeletons(6);

  try {
    const res = await fetch(CONFIG.dataUrl);
    if (!res.ok) throw new Error('Fichier articles.json introuvable');
    allArticles = await res.json();

    // Tri : plus récent en premier
    allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredArticles = [...allArticles];
    renderPage(grid, true);
    buildCategoryFilter();

  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>Aucun article disponible pour le moment.<br>
           Revenez bientôt&nbsp;!</p>
      </div>`;
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
  }

  // Bouton « Charger plus »
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => renderPage(grid));
  }

  // Recherche (debounce 300 ms)
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      searchQuery = searchInput.value.trim().toLowerCase();
      applyFilters(grid);
    }, 300));
    // Sync avec hero search
    const heroInput = document.getElementById('hero-search');
    if (heroInput) {
      heroInput.addEventListener('input', debounce(() => {
        searchQuery = heroInput.value.trim().toLowerCase();
        searchInput.value = heroInput.value;
        applyFilters(grid);
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300));
    }
  }

  // Filtres catégories hero
  document.querySelectorAll('.cat-pill[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      applyFilters(grid);
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function applyFilters(grid) {
  filteredArticles = allArticles.filter(a => {
    const matchCat    = activeCategory === 'all' || a.category === activeCategory;
    const matchSearch = !searchQuery ||
      (a.title  && a.title.toLowerCase().includes(searchQuery))  ||
      (a.excerpt && a.excerpt.toLowerCase().includes(searchQuery)) ||
      (a.category && a.category.toLowerCase().includes(searchQuery));
    return matchCat && matchSearch;
  });
  currentPage = 0;
  renderPage(grid, true);
}

function renderPage(grid, reset = false) {
  const start       = currentPage * CONFIG.perPage;
  const end         = start + CONFIG.perPage;
  const slice       = filteredArticles.slice(start, end);
  const loadMoreBtn = document.getElementById('load-more');

  if (reset) grid.innerHTML = '';

  if (slice.length === 0 && currentPage === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>Aucun article ne correspond à votre recherche.</p>
      </div>`;
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    return;
  }

  // Première carte : featured
  const featured = reset && currentPage === 0 && slice.length > 0;
  grid.innerHTML += slice.map((a, i) =>
    renderCard(a, featured && i === 0)
  ).join('');

  currentPage++;

  if (loadMoreBtn) {
    loadMoreBtn.style.display = currentPage * CONFIG.perPage >= filteredArticles.length ? 'none' : 'block';
  }
}

function buildCategoryFilter() {
  const catList = document.getElementById('category-list');
  if (!catList) return;

  const counts = {};
  allArticles.forEach(a => {
    if (a.category) counts[a.category] = (counts[a.category] || 0) + 1;
  });

  const total = allArticles.length;
  catList.innerHTML = `
    <li>
      <button class="cat-filter-btn active" data-cat="all">
        <span>Tous les articles</span>
        <span class="count">${total}</span>
      </button>
    </li>
    ${Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, count]) => `
        <li>
          <button class="cat-filter-btn" data-cat="${esc(cat)}">
            <span>${esc(cat)}</span>
            <span class="count">${count}</span>
          </button>
        </li>`).join('')}`;

  catList.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      applyFilters(document.getElementById('articles-grid'));
    });
  });
}

/* ============================================================
   PAGE ARTICLE
   ============================================================ */
async function initArticle() {
  const container = document.getElementById('article-content');
  const sidebar   = document.getElementById('article-sidebar');
  if (!container) return;

  const id = getUrlParam('id');
  if (!id) { window.location.href = '404.html'; return; }

  container.innerHTML = `<div class="article-loading">${skeletons(1)}</div>`;

  try {
    const res = await fetch(`${CONFIG.articlesBase}${encodeURIComponent(id)}.json`);
    if (!res.ok) throw new Error('Article introuvable');
    const article = await res.json();

    // SEO — meta & title
    document.title = `${article.title} — ${CONFIG.siteName}`;
    setMeta('name',       'description',    article.metaDescription || article.excerpt || '');
    setMeta('property',   'og:title',       article.title);
    setMeta('property',   'og:description', article.metaDescription || article.excerpt || '');
    setMeta('property',   'og:url',         window.location.href);
    setMeta('property',   'og:type',        'article');
    if (article.image) setMeta('property', 'og:image', article.image);
    setMeta('name', 'twitter:card',  'summary_large_image');
    setMeta('name', 'twitter:title', article.title);

    // Rendu
    container.innerHTML = buildArticleHTML(article);

    // Fonctionnalités
    initShareButtons(article);
    buildTOC();
    injectStructuredData(article);
    loadRelatedArticles(article, sidebar);

    // AdSense : déclencher le remplissage des emplacements
    pushAds();

  } catch (err) {
    window.location.href = '404.html';
  }
}

function buildArticleHTML(article) {
  return `
    <header class="article-header">
      <nav class="breadcrumb" aria-label="Fil d'Ariane">
        <a href="index.html">Accueil</a>
        <span aria-hidden="true">›</span>
        <a href="index.html?cat=${esc(article.category || '')}">${esc(article.category || 'Articles')}</a>
        <span aria-hidden="true">›</span>
        <span>${esc(article.title)}</span>
      </nav>
      <span class="badge badge--large" ${catStyle(article.category)}>${esc(article.category || 'Général')}</span>
      <h1>${esc(article.title)}</h1>
      <div class="article-meta">
        <span>Par <strong>${esc(article.author || 'La rédaction')}</strong></span>
        <span aria-hidden="true">·</span>
        <time datetime="${esc(article.date || '')}">${formatDate(article.date)}</time>
        <span aria-hidden="true">·</span>
        <span>${article.readTime || 5} min de lecture</span>
      </div>
      ${article.image ? `
        <div class="article-hero-image">
          <img src="${esc(article.image)}" alt="${esc(article.title)}" loading="lazy">
        </div>` : ''}
    </header>

    <aside class="article-disclaimer" role="note">
      ⚕️ <em>Cet article est fourni à titre <strong>informatif uniquement</strong> et ne remplace pas
      l'avis d'un professionnel de santé. En cas de détresse, appelez le
      <strong><a href="tel:3114" style="color:inherit">3114</a></strong>
      (numéro national de prévention du suicide, disponible 24h/24).</em>
    </aside>

    <!-- 📢 PUB : en-tête article — remplacer les valeurs XXXX -->
    <div class="ad-container ad-container--inline" aria-hidden="true">
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
           data-ad-slot="1111111111"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>

    <div class="article-body">
      ${article.content || '<p>Contenu en cours de rédaction…</p>'}
    </div>

    <!-- 📢 PUB : bas article -->
    <div class="ad-container ad-container--inline" aria-hidden="true">
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
           data-ad-slot="2222222222"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>

    <div class="article-tags" aria-label="Mots-clés">
      ${(article.tags || []).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}
    </div>

    <div class="article-share" id="share-buttons" aria-label="Partager cet article">
      <span>Partager :</span>
      <button class="share-btn share-btn--fb"   data-platform="facebook">Facebook</button>
      <button class="share-btn share-btn--tw"   data-platform="twitter">Twitter / X</button>
      <button class="share-btn share-btn--wa"   data-platform="whatsapp">WhatsApp</button>
      <button class="share-btn share-btn--copy" data-platform="copy">Copier le lien</button>
    </div>`;
}

/* Injecter le JSON-LD pour le SEO */
function injectStructuredData(article) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline:        article.title,
    description:     article.metaDescription || article.excerpt || '',
    datePublished:   article.date,
    dateModified:    article.updatedAt || article.date,
    inLanguage:      'fr',
    author: { '@type': 'Person', name: article.author || 'La rédaction Psycho Clair' },
    publisher: {
      '@type': 'Organization',
      name: CONFIG.siteName,
      url:  CONFIG.siteUrl,
      logo: { '@type': 'ImageObject', url: `${CONFIG.siteUrl}/img/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': window.location.href },
  };
  if (article.image) schema.image = article.image;

  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(schema);
  document.head.appendChild(s);
}

/* Boutons de partage */
function initShareButtons(article) {
  const container = document.getElementById('share-buttons');
  if (!container) return;

  const url   = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(article.title);

  container.addEventListener('click', e => {
    const btn = e.target.closest('[data-platform]');
    if (!btn) return;
    let shareUrl;
    switch (btn.dataset.platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}&hashtags=santémentale,psychologie`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${title}%20%E2%86%92%20${url}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(window.location.href).then(() => {
          btn.textContent = '✓ Copié !';
          setTimeout(() => { btn.textContent = 'Copier le lien'; }, 2500);
        });
        return;
    }
    if (shareUrl) window.open(shareUrl, '_blank', 'width=620,height=450,noopener,noreferrer');
  });
}

/* Table des matières automatique */
function buildTOC() {
  const body = document.querySelector('.article-body');
  const toc  = document.getElementById('toc');
  if (!body || !toc) return;

  const headings = body.querySelectorAll('h2, h3');
  if (headings.length < 3) { toc.style.display = 'none'; return; }

  let html = '<h3>Table des matières</h3><nav aria-label="Table des matières"><ol>';
  headings.forEach((h, i) => {
    const id = `section-${i}`;
    h.id = id;
    const isSub = h.tagName === 'H3';
    html += `<li${isSub ? ' class="sub"' : ''}><a href="#${id}">${h.textContent}</a></li>`;
  });
  toc.innerHTML = html + '</ol></nav>';
}

/* Articles connexes */
async function loadRelatedArticles(currentArticle, sidebar) {
  const container = document.getElementById('related-articles');
  if (!container) return;
  try {
    const res = await fetch(CONFIG.dataUrl);
    if (!res.ok) return;
    const list = await res.json();
    const related = list
      .filter(a => a.id !== currentArticle.id && a.category === currentArticle.category)
      .slice(0, 4);

    if (related.length === 0) { container.style.display = 'none'; return; }
    container.innerHTML = `
      <h3 class="widget__title">À lire aussi</h3>
      <div class="related-list">
        ${related.map(a => `
          <a href="article.html?id=${esc(a.id)}" class="related-item">
            <span class="related-item__title">${esc(a.title)}</span>
            <span class="related-item__meta">${formatDate(a.date)}</span>
          </a>`).join('')}
      </div>`;
  } catch (_) { /* silencieux */ }
}

/* Déclencher AdSense sur les nouvelles balises ins */
function pushAds() {
  if (typeof window.adsbygoogle !== 'undefined') {
    document.querySelectorAll('.adsbygoogle').forEach(() => {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
    });
  }
}

/* ============================================================
   BANNIÈRE COOKIES (RGPD)
   ============================================================ */
function initCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  if (localStorage.getItem('pc_cookie_consent')) {
    banner.style.display = 'none';
    if (localStorage.getItem('pc_cookie_consent') === 'accepted') pushAds();
    return;
  }

  banner.style.display = 'flex';

  document.getElementById('cookie-accept')?.addEventListener('click', () => {
    localStorage.setItem('pc_cookie_consent', 'accepted');
    banner.style.display = 'none';
    pushAds();
  });
  document.getElementById('cookie-decline')?.addEventListener('click', () => {
    localStorage.setItem('pc_cookie_consent', 'declined');
    banner.style.display = 'none';
  });
}

/* ============================================================
   NAVIGATION (hamburger)
   ============================================================ */
function initNav() {
  const hamburger = document.getElementById('hamburger');
  const navMenu   = document.getElementById('nav-menu');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      const open = navMenu.classList.toggle('nav--open');
      hamburger.setAttribute('aria-expanded', String(open));
    });
    // Fermer au clic extérieur
    document.addEventListener('click', e => {
      if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('nav--open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Marquer le lien actif
  const path = window.location.pathname.replace(/\/$/, '') || '/index.html';
  document.querySelectorAll('.nav__link').forEach(a => {
    const href = a.getAttribute('href').replace(/\/$/, '') || '/index.html';
    if (path.endsWith(href)) a.classList.add('nav__link--active');
  });
}

/* ============================================================
   DÉMARRAGE
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initCookieBanner();

  if (document.getElementById('articles-grid')) initHome();
  if (document.getElementById('article-content'))  initArticle();
});
