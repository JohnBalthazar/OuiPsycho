/**
 * PSYCHO CLAIR — Script principal v2
 * Chargement articles · filtres · featured · barre lecture · partage · cookies
 */
'use strict';

/* ============================================================
   CONFIG
   ============================================================ */
const CONFIG = {
  dataUrl:      'data/articles.json',
  articlesBase: 'articles/',
  perPage:      9,
  siteName:     'Oui Psycho!',
  siteUrl:      'https://ouipsycho.fr',
};

const CATEGORIES = {
  'Anxiété':                  { color: '#7C3AED', bg: '#F5F3FF' },
  'Dépression':               { color: '#1D4ED8', bg: '#EFF6FF' },
  'Bien-être':                { color: '#059669', bg: '#ECFDF5' },
  'Relations':                { color: '#BE185D', bg: '#FDF2F8' },
  'Stress':                   { color: '#B45309', bg: '#FFFBEB' },
  'Sommeil':                  { color: '#0369A1', bg: '#ECFEFF' },
  'Thérapies':                { color: '#6D28D9', bg: '#EDE9FE' },
  'Développement personnel':  { color: '#15803D', bg: '#F0FDF4' },
};

/* ============================================================
   UTILS
   ============================================================ */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { year:'numeric', month:'long', day:'numeric' });
}
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
function catStyle(cat) {
  const c = CATEGORIES[cat];
  return c ? `style="color:${c.color};background:${c.bg}"` : '';
}
function setMeta(attr, val, content) {
  let el = document.querySelector(`meta[${attr}="${val}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, val); document.head.appendChild(el); }
  el.setAttribute('content', content);
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

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
   RENDU — CARTE STANDARD
   ============================================================ */
function articleUrl(id) {
  return `articles/${esc(id)}.html`;
}

function renderCard(article) {
  const imgStyle = article.image ? `background-image:url('${esc(article.image)}')` : '';
  return `
    <article class="card" data-category="${esc(article.category || '')}">
      <a href="${articleUrl(article.id)}" class="card__image-link" tabindex="-1" aria-hidden="true">
        <div class="card__image" style="${imgStyle}" data-cat="${esc(article.category || '')}">
          ${!article.image ? `<span class="card__image-placeholder" aria-hidden="true">🧠</span>` : ''}
        </div>
      </a>
      <div class="card__body">
        <span class="badge" ${catStyle(article.category)}>${esc(article.category || 'Général')}</span>
        <h2 class="card__title">
          <a href="${articleUrl(article.id)}">${esc(article.title)}</a>
        </h2>
        <p class="card__excerpt">${esc(article.excerpt || '')}</p>
        <footer class="card__meta">
          <time datetime="${esc(article.date || '')}">${formatDate(article.date)}</time>
          <span class="card__meta-dot">•</span>
          <span>${article.readTime || 5} min de lecture</span>
        </footer>
      </div>
    </article>`;
}

/* ============================================================
   RENDU — CARTE FEATURED (premier article, pleine largeur)
   ============================================================ */
function renderFeatured(article) {
  const imgStyle = article.image ? `background-image:url('${esc(article.image)}')` : '';
  return `
    <article class="card card--featured" data-category="${esc(article.category || '')}" style="margin-bottom:2rem">
      <a href="${articleUrl(article.id)}" class="card__image-link" tabindex="-1" aria-hidden="true">
        <div class="card__image" style="${imgStyle}" data-cat="${esc(article.category || '')}">
          ${!article.image ? `<span class="card__image-placeholder" aria-hidden="true">🧠</span>` : ''}
        </div>
      </a>
      <div class="card__body">
        <div class="card--featured-label">À la une</div>
        <span class="badge" ${catStyle(article.category)}>${esc(article.category || 'Général')}</span>
        <h2 class="card__title">
          <a href="${articleUrl(article.id)}">${esc(article.title)}</a>
        </h2>
        <p class="card__excerpt">${esc(article.excerpt || '')}</p>
        <footer class="card__meta">
          <time datetime="${esc(article.date || '')}">${formatDate(article.date)}</time>
          <span class="card__meta-dot">•</span>
          <span>${article.readTime || 5} min de lecture</span>
        </footer>
        <a href="${articleUrl(article.id)}" class="card__read-more">Lire l'article</a>
      </div>
    </article>`;
}

/* ============================================================
   PAGE D'ACCUEIL
   ============================================================ */
let allArticles      = [];
let filteredArticles = [];
let currentPage      = 0;
let activeCategory   = 'all';
let searchQuery      = '';

async function initHome() {
  const grid       = document.getElementById('articles-grid');
  const featured   = document.getElementById('featured-container');
  const loadMoreBtn = document.getElementById('load-more');
  const sectionHdr = document.getElementById('articles-section-header');
  if (!grid) return;

  grid.innerHTML = skeletons(6);

  try {
    const res = await fetch(CONFIG.dataUrl);
    if (!res.ok) throw new Error('articles.json introuvable');
    allArticles = await res.json();
    allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
    filteredArticles = [...allArticles];

    // Afficher la section header si articles présents
    if (sectionHdr && allArticles.length > 1) sectionHdr.style.display = 'flex';

    renderPage(grid, featured, true);
    buildCategoryFilter();
    syncCatNavFromUrl();

  } catch (_) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🌱</div>
        <p>Les articles arrivent bientôt&nbsp;!</p>
        <small>Revenez dans quelques jours.</small>
      </div>`;
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
  }

  // Charger plus
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => renderPage(grid, null));
  }

  // Recherche
  const searchSidebar = document.getElementById('search-input');
  const searchHero    = document.getElementById('hero-search');
  function handleSearch(val) {
    searchQuery = val.trim().toLowerCase();
    applyFilters(grid, featured);
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (searchSidebar) {
    searchSidebar.addEventListener('input', debounce(() => handleSearch(searchSidebar.value), 300));
  }
  if (searchHero) {
    searchHero.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleSearch(searchHero.value);
    });
    document.querySelector('.hero-search button')?.addEventListener('click', () => handleSearch(searchHero.value));
  }

  // Filtres barre catégories (header) & sidebar
  document.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      syncActiveCat();
      applyFilters(grid, featured);
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Catégorie depuis URL param (?cat=Anxiété)
  const urlCat = getParam('cat');
  if (urlCat) {
    activeCategory = urlCat;
    syncActiveCat();
    // Attend que les articles soient chargés
    setTimeout(() => applyFilters(grid, featured), 100);
  }
}

function applyFilters(grid, featured) {
  filteredArticles = allArticles.filter(a => {
    const matchCat = activeCategory === 'all' || a.category === activeCategory;
    const matchQ   = !searchQuery ||
      (a.title   && a.title.toLowerCase().includes(searchQuery)) ||
      (a.excerpt && a.excerpt.toLowerCase().includes(searchQuery)) ||
      (a.category && a.category.toLowerCase().includes(searchQuery));
    return matchCat && matchQ;
  });
  currentPage = 0;
  renderPage(grid, featured, true);

  const sectionHdr = document.getElementById('articles-section-header');
  if (sectionHdr) {
    sectionHdr.style.display = filteredArticles.length > 1 ? 'flex' : 'none';
  }
}

function renderPage(grid, featured, reset = false) {
  const start       = currentPage * CONFIG.perPage;
  const isFeatured  = reset && currentPage === 0 && !searchQuery && activeCategory === 'all';
  const dataStart   = isFeatured ? 1 : start;
  const dataEnd     = isFeatured ? 1 + CONFIG.perPage : start + CONFIG.perPage;
  const slice       = filteredArticles.slice(dataStart, dataEnd);
  const loadMoreBtn = document.getElementById('load-more');

  if (reset) {
    grid.innerHTML = '';
    if (featured) {
      featured.innerHTML = isFeatured && filteredArticles.length > 0
        ? renderFeatured(filteredArticles[0])
        : '';
    }
  }

  if (slice.length === 0 && currentPage === 0 && (!isFeatured || filteredArticles.length === 0)) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🔍</div>
        <p>Aucun article trouvé.</p>
        <small>Essayez un autre mot-clé ou une autre catégorie.</small>
      </div>`;
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    return;
  }

  grid.innerHTML += slice.map(renderCard).join('');
  currentPage++;

  const total = isFeatured ? filteredArticles.length - 1 : filteredArticles.length;
  if (loadMoreBtn) {
    loadMoreBtn.style.display = currentPage * CONFIG.perPage >= total ? 'none' : 'block';
  }
}

function buildCategoryFilter() {
  const catList = document.getElementById('category-list');
  if (!catList) return;
  const counts = {};
  allArticles.forEach(a => { if (a.category) counts[a.category] = (counts[a.category] || 0) + 1; });
  catList.innerHTML = `
    <li><button class="cat-filter-btn active" data-cat="all">
      <span>Tous les articles</span><span class="count">${allArticles.length}</span>
    </button></li>
    ${Object.entries(counts).sort(([,a],[,b])=>b-a).map(([cat,n])=>`
      <li><button class="cat-filter-btn" data-cat="${esc(cat)}">
        <span>${esc(cat)}</span><span class="count">${n}</span>
      </button></li>`).join('')}`;
  catList.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      syncActiveCat();
      applyFilters(document.getElementById('articles-grid'), document.getElementById('featured-container'));
    });
  });
}

function syncActiveCat() {
  document.querySelectorAll('[data-cat]').forEach(b =>
    b.classList.toggle('active', b.dataset.cat === activeCategory)
  );
}

function syncCatNavFromUrl() {
  const urlCat = getParam('cat');
  if (urlCat) {
    activeCategory = urlCat;
    syncActiveCat();
  }
}

/* ============================================================
   PAGE ARTICLE
   ============================================================ */
async function initArticle() {
  const container = document.getElementById('article-content');
  if (!container) return;

  // Page statique pré-rendue (articles/xxx.html) : contenu déjà dans le HTML
  if (container.dataset.static === 'true') {
    const id = container.dataset.id;
    try {
      const res = await fetch(`${CONFIG.articlesBase}${encodeURIComponent(id)}.json`);
      if (res.ok) {
        const article = await res.json();
        initShareButtons(article);
        buildTOC();
        loadRelated(article);
      } else {
        buildTOC();
      }
    } catch (_) { buildTOC(); }
    return;
  }

  const id = getParam('id');
  if (!id) { window.location.href = '404.html'; return; }

  // Rediriger vers la page statique si elle existe
  const staticUrl = `articles/${encodeURIComponent(id)}.html`;
  if (window.location.pathname.indexOf('/articles/') === -1) {
    window.location.replace(staticUrl);
    return;
  }

  try {
    const res = await fetch(`${CONFIG.articlesBase}${encodeURIComponent(id)}.json`);
    if (!res.ok) throw new Error('Article non trouvé');
    const article = await res.json();

    // Meta SEO
    document.title = `${article.title} — ${CONFIG.siteName}`;
    setMeta('name',     'description',    article.metaDescription || article.excerpt || '');
    setMeta('property', 'og:title',       article.title);
    setMeta('property', 'og:description', article.metaDescription || article.excerpt || '');
    setMeta('property', 'og:url',         window.location.href);
    if (article.image) setMeta('property', 'og:image', article.image);
    setMeta('name', 'twitter:title',       article.title);

    // Marquer catégorie active dans barre
    document.querySelectorAll('.cat-nav__btn').forEach(b => {
      if (b.textContent.trim().includes(article.category)) b.classList.add('active');
    });

    container.innerHTML = buildArticleHTML(article);

    initShareButtons(article);
    buildTOC();
    injectJSONLD(article);
    loadRelated(article);

  } catch (_) {
    window.location.href = '404.html';
  }
}

function buildArticleHTML(a) {
  const keypoints = a.keypoints?.length ? `
    <div class="article-keypoints">
      <div class="article-keypoints__title">💡 Points clés de cet article</div>
      <ul>${a.keypoints.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
    </div>` : '';

  return `
    <header class="article-header">
      <nav class="breadcrumb" aria-label="Fil d'Ariane">
        <a href="index.html">Accueil</a> <span>›</span>
        <a href="index.html?cat=${esc(a.category || '')}">${esc(a.category || 'Articles')}</a>
        <span>›</span> <span>${esc(a.title)}</span>
      </nav>
      <span class="badge badge--large" ${catStyle(a.category)}>${esc(a.category || 'Général')}</span>
      <h1>${esc(a.title)}</h1>
      <div class="article-meta">
        <span>Par <strong>${esc(a.author || 'La rédaction')}</strong></span>
        <span class="article-meta-dot">•</span>
        <time datetime="${esc(a.date || '')}">${formatDate(a.date)}</time>
        <span class="article-meta-dot">•</span>
        <span>⏱ ${a.readTime || 5} min de lecture</span>
      </div>
      ${a.image ? `
        <div class="article-hero-image">
          <img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy">
        </div>` : ''}
    </header>

    <aside class="article-disclaimer" role="note">
      ⚕️ <em>Cet article est fourni à titre <strong>informatif uniquement</strong> et ne remplace pas
      l'avis d'un professionnel de santé. En cas de détresse, appelez le
      <strong><a href="tel:3114">3114</a></strong> (24h/24, gratuit).</em>
    </aside>

    ${keypoints}

    <div class="article-body">
      ${a.content || '<p>Contenu en cours de rédaction…</p>'}
    </div>

    <div class="article-author">
      <div class="article-author__avatar" aria-hidden="true">✍️</div>
      <div>
        <div class="article-author__name">${esc(a.author || 'La rédaction Oui Psycho!')}</div>
        <div class="article-author__role">Rédacteur spécialisé en santé mentale</div>
      </div>
    </div>

    <div class="article-tags" aria-label="Mots-clés">
      ${(a.tags || []).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}
    </div>

    <div class="article-share" id="share-buttons" aria-label="Partager cet article">
      <span class="share-label">Partager :</span>
      <button class="share-btn share-btn--fb"   data-platform="facebook">Facebook</button>
      <button class="share-btn share-btn--tw"   data-platform="twitter">Twitter / X</button>
      <button class="share-btn share-btn--wa"   data-platform="whatsapp">WhatsApp</button>
      <button class="share-btn share-btn--copy" data-platform="copy">Copier le lien</button>
    </div>`;
}

function injectJSONLD(a) {
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Article',
    headline: a.title,
    description: a.metaDescription || a.excerpt || '',
    datePublished: a.date,
    inLanguage: 'fr',
    author: { '@type': 'Person', name: a.author || 'La rédaction Oui Psycho!' },
    publisher: { '@type': 'Organization', name: CONFIG.siteName, url: CONFIG.siteUrl },
    mainEntityOfPage: { '@type': 'WebPage', '@id': window.location.href },
    ...(a.image ? { image: a.image } : {}),
  });
  document.head.appendChild(s);
}

function initShareButtons(article) {
  const c = document.getElementById('share-buttons');
  if (!c) return;
  const url   = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(article.title);
  c.addEventListener('click', e => {
    const btn = e.target.closest('[data-platform]');
    if (!btn) return;
    const urls = {
      facebook:  `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter:   `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      whatsapp:  `https://wa.me/?text=${title}%20→%20${url}`,
    };
    if (btn.dataset.platform === 'copy') {
      navigator.clipboard.writeText(window.location.href).then(() => {
        btn.textContent = '✓ Copié !';
        setTimeout(() => btn.textContent = 'Copier le lien', 2500);
      });
    } else if (urls[btn.dataset.platform]) {
      window.open(urls[btn.dataset.platform], '_blank', 'width=620,height=450,noopener');
    }
  });
}

function buildTOC() {
  const body = document.querySelector('.article-body');
  const toc  = document.getElementById('toc');
  if (!body || !toc) return;
  const headings = body.querySelectorAll('h2, h3');
  if (headings.length < 3) { toc.style.display = 'none'; return; }
  toc.classList.add('visible');
  let html = '<h3 class="widget__title">Table des matières</h3><ol>';
  headings.forEach((h, i) => {
    const id = `s${i}`;
    h.id = id;
    html += `<li${h.tagName==='H3' ? ' class="sub"' : ''}><a href="#${id}">${h.textContent}</a></li>`;
  });
  toc.innerHTML += html + '</ol>';
}

async function loadRelated(current) {
  const c = document.getElementById('related-articles');
  if (!c) return;
  try {
    const res = await fetch(CONFIG.dataUrl);
    if (!res.ok) return;
    const list = await res.json();
    const related = list.filter(a => a.id !== current.id && a.category === current.category).slice(0, 4);
    if (!related.length) { c.style.display = 'none'; return; }
    c.innerHTML = `<h3 class="widget__title">À lire aussi</h3>
      <div class="related-list">
        ${related.map(a => `
          <a href="${articleUrl(a.id)}" class="related-item">
            <div class="related-item__img" style="${a.image ? `background-image:url('${esc(a.image)}')` : ''}" data-cat="${esc(a.category||'')}">
              ${!a.image ? '🧠' : ''}
            </div>
            <div class="related-item__info">
              <div class="related-item__title">${esc(a.title)}</div>
              <div class="related-item__meta">${formatDate(a.date)}</div>
            </div>
          </a>`).join('')}
      </div>`;
  } catch (_) {}
}

/* ============================================================
   BARRE DE LECTURE (article)
   ============================================================ */
function initReadingProgress() {
  const bar = document.getElementById('reading-progress');
  if (!bar) return;
  function update() {
    const body = document.querySelector('.article-body');
    if (!body) return;
    const scrolled  = window.scrollY;
    const docHeight = body.offsetTop + body.offsetHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(100, Math.max(0, (scrolled / docHeight) * 100)) : 0;
    bar.style.width = pct + '%';
    bar.setAttribute('aria-valuenow', Math.round(pct));
  }
  window.addEventListener('scroll', update, { passive: true });
}

/* ============================================================
   HEADER SCROLL EFFECT
   ============================================================ */
function initHeaderScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        header.classList.toggle('scrolled', window.scrollY > 40);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ============================================================
   NAVIGATION MOBILE
   ============================================================ */
function initNav() {
  const burger  = document.getElementById('hamburger');
  const navMenu = document.getElementById('nav-menu');
  if (burger && navMenu) {
    burger.addEventListener('click', () => {
      const open = navMenu.classList.toggle('nav--open');
      burger.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', e => {
      if (!burger.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('nav--open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }
  // Lien actif
  const path = window.location.pathname;
  document.querySelectorAll('.nav__link').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (path.endsWith(href.split('?')[0])) a.classList.add('nav__link--active');
  });
}

/* ============================================================
   BANNIÈRE COOKIES
   ============================================================ */
function initCookies() {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;
  if (localStorage.getItem('pc_consent')) { banner.style.display = 'none'; return; }
  banner.style.display = 'flex';
  document.getElementById('cookie-accept')?.addEventListener('click', () => {
    localStorage.setItem('pc_consent', '1');
    banner.style.display = 'none';
  });
  document.getElementById('cookie-decline')?.addEventListener('click', () => {
    localStorage.setItem('pc_consent', '0');
    banner.style.display = 'none';
  });
}

/* ============================================================
   DÉMARRAGE
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHeaderScroll();
  initCookies();
  initReadingProgress();
  if (document.getElementById('articles-grid'))  initHome();
  if (document.getElementById('article-content')) initArticle();
});
