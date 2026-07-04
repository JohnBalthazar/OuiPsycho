/**
 * PSYCHO CLAIR — Script principal v2
 * Chargement articles · filtres · featured · barre lecture · partage · cookies · commentaires
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

// Version de cache horaire — change toutes les heures, stable dans la session.
// Permet au cache HTTP de fonctionner intra-heure tout en garantissant
// que les articles publiés par la CI sont visibles en moins de 60 min.
const CACHE_H = Math.floor(Date.now() / 3600000);

const CATEGORIES = {
  'Bien-être':                { color: '#059669', bg: '#ECFDF5' },
  'Relations':                { color: '#BE185D', bg: '#FDF2F8' },
  'Sommeil':                  { color: '#0369A1', bg: '#ECFEFF' },
  'Troubles Psy':             { color: '#7C3AED', bg: '#F5F3FF' },
  'Thérapies':                { color: '#6D28D9', bg: '#EDE9FE' },
  'Développement personnel':  { color: '#15803D', bg: '#F0FDF4' },
  'Nos héros sur le divan':   { color: '#EA580C', bg: '#FFF7ED' },
  'Sexo':                     { color: '#C2185B', bg: '#FCE4EC' },
};

/* ============================================================
   CLOUDINARY SMART CROP
   Reconstruit l'URL avec centrage automatique (g_face / g_auto)
   ============================================================ */
function buildCloudinaryUrl(url, gravity) {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const uploadIdx = url.indexOf('/upload/');
  if (uploadIdx === -1) return url;
  const parts    = url.slice(uploadIdx + 8).split('/');
  const publicId = parts.slice(1).join('/');
  const g = gravity === 'face' ? 'face' : 'auto';
  return `${url.slice(0, uploadIdx + 8)}c_fill,g_${g},ar_3:2,w_900/f_auto,q_auto/${publicId}`;
}

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
// "Publié le X" ou "Mis à jour le Y" selon date_modified
// "Mis à jour" uniquement si date_modified est POSTÉRIEURE à la date de publication
function dateLabel(a) {
  const pub = a.date;
  const mod = a.date_modified;
  if (!mod || mod <= pub) return 'Publié le ' + formatDate(pub);
  return 'Mis à jour le ' + formatDate(mod);
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
  return `articles/${esc(id)}/`;
}

function renderCard(article) {
  const useIA  = article.imageGravity && article.imageGravity !== 'none';
  const imgUrl = useIA ? buildCloudinaryUrl(article.image, article.imageGravity) : article.image;
  const zoom   = useIA ? 1 : (parseFloat(article.imageZoom) || 1);
  const bgSize = zoom > 1 ? `${Math.round(zoom * 100)}% ${Math.round(zoom * 100)}%` : 'cover';
  const bgPos  = useIA ? 'center center' : esc(article.imagePosition || 'center center');
  const imgStyle = imgUrl
    ? `background-image:url('${esc(imgUrl)}');background-position:${bgPos};background-size:${bgSize}`
    : '';
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
          <time datetime="${esc(article.date_modified || article.date || '')}">${dateLabel(article)}</time>
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
  const useIA  = article.imageGravity && article.imageGravity !== 'none';
  const imgUrl = useIA ? buildCloudinaryUrl(article.image, article.imageGravity) : article.image;
  const zoom   = useIA ? 1 : (parseFloat(article.imageZoom) || 1);
  const bgSize = zoom > 1 ? `${Math.round(zoom * 100)}% ${Math.round(zoom * 100)}%` : 'cover';
  const bgPos  = useIA ? 'center center' : esc(article.imagePosition || 'center center');
  const imgStyle = imgUrl
    ? `background-image:url('${esc(imgUrl)}');background-position:${bgPos};background-size:${bgSize}`
    : '';
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
          <time datetime="${esc(article.date_modified || article.date || '')}">${dateLabel(article)}</time>
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
let _nextDataStart   = 0;      // pointeur exact vers le prochain article à rendre dans la grille
let activeCategory   = 'all';
let searchQuery      = '';
let _scrollObserver  = null;   // IntersectionObserver instance
let _rendering       = false;  // garde anti-double-déclenchement

async function initHome() {
  const grid       = document.getElementById('articles-grid');
  const featured   = document.getElementById('featured-container');
  const sectionHdr = document.getElementById('articles-section-header');
  if (!grid) return;

  // data-static="true" = cards HTML déjà injectées par _gen_static.js → pas de squelettes
  if (!grid.dataset.static) grid.innerHTML = skeletons(6);

  try {
    const res = await fetch(CONFIG.dataUrl + '?v=' + CACHE_H);
    if (!res.ok) throw new Error('articles.json introuvable');
    allArticles = await res.json();

    // Ne pas afficher les brouillons ni les articles planifiés dont la date n'est pas encore arrivée
    const todayStr = new Date().toISOString().split('T')[0];
    allArticles = allArticles.filter(a => {
      if (a.status === 'draft') return false;                          // brouillon → jamais visible
      if (a.status === 'scheduled') return a.date <= todayStr;        // planifié → visible seulement à partir de la date
      return true;                                                     // publié (ou pas de statut) → toujours visible
    });

    allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
    filteredArticles = [...allArticles];

    // Afficher la section header si articles présents
    if (sectionHdr && allArticles.length > 1) sectionHdr.style.display = 'flex';

    renderPage(grid, featured, true);
    buildCategoryFilter();
    syncCatNavFromUrl();
    loadPopularArticles();

  } catch (_) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🌱</div>
        <p>Les articles arrivent bientôt&nbsp;!</p>
        <small>Revenez dans quelques jours.</small>
      </div>`;
    const s = document.getElementById('scroll-sentinel');
    if (s) s.style.display = 'none';
  }

  // ── Scroll infini ──────────────────────────────────────────
  const sentinel = document.getElementById('scroll-sentinel');
  const fallback = document.getElementById('load-more-fallback');

  function loadNext() {
    if (_rendering) return;
    if (!filteredArticles.length || _nextDataStart >= filteredArticles.length) return;
    _rendering = true;
    try {
      renderPage(grid, null);
    } catch(e) {
      console.error('[scroll] renderPage error:', e);
    } finally {
      _rendering = false;
    }
  }

  if (sentinel) {
    if ('IntersectionObserver' in window) {
      // IntersectionObserver : déclenche 300px avant d'atteindre le sentinel
      _scrollObserver = new IntersectionObserver(
        (entries) => { if (entries[0].isIntersecting) loadNext(); },
        { rootMargin: '300px 0px', threshold: 0 }
      );
      _scrollObserver.observe(sentinel);
    } else {
      // Fallback : bouton visible si IntersectionObserver indisponible
      if (fallback) {
        fallback.style.display = 'inline-block';
        fallback.addEventListener('click', loadNext);
      }
    }
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
      // Scroll instantané en haut AVANT de mettre à jour le contenu.
      // On désactive momentanément scroll-behavior:smooth (CSS global) pour
      // éviter que l'animation async soit interrompue par applyFilters.
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, 0);
      document.documentElement.style.scrollBehavior = '';
      applyFilters(grid, featured);
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
  renderPage(grid, featured, true); // reset=true remet _nextDataStart à 0

  const sectionHdr = document.getElementById('articles-section-header');
  if (sectionHdr) {
    sectionHdr.style.display = filteredArticles.length > 1 ? 'flex' : 'none';
  }
}

function renderPage(grid, featured, reset = false) {
  // Remise à zéro du pointeur sur reset
  if (reset) _nextDataStart = 0;

  // Mode "à la une" : seulement sur la toute première passe, sans filtre actif
  const isFeatured = (_nextDataStart === 0) && !searchQuery && activeCategory === 'all'
                     && filteredArticles.length > 0;

  // Calcul des indices à rendre — isFeatured saute l'index 0 (déjà dans featured)
  const dataStart = isFeatured ? 1 : _nextDataStart;
  const dataEnd   = dataStart + CONFIG.perPage;
  const slice     = filteredArticles.slice(dataStart, dataEnd);

  // Sentinel + loader
  const sentinel = document.getElementById('scroll-sentinel');
  const loader   = document.getElementById('scroll-loader');
  const fallback = document.getElementById('load-more-fallback');

  function setSentinelVisible(visible) {
    if (!sentinel) return;
    sentinel.style.display = visible ? 'flex' : 'none';
    if (loader)   loader.style.display   = visible && 'IntersectionObserver' in window ? 'flex' : 'none';
    if (fallback) fallback.style.display = visible && !('IntersectionObserver' in window) ? 'inline-block' : 'none';
  }

  if (reset) {
    grid.innerHTML = '';
    if (featured) {
      featured.innerHTML = isFeatured
        ? renderFeatured(filteredArticles[0])
        : '';
    }
  }

  // État vide
  if (filteredArticles.length === 0 || (slice.length === 0 && _nextDataStart === 0)) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🔍</div>
        <p>Aucun article trouvé.</p>
        <small>Essayez un autre mot-clé ou une autre catégorie.</small>
      </div>`;
    setSentinelVisible(false);
    return;
  }

  // Ajouter le fragment DOM en une seule opération (perf)
  if (slice.length > 0) {
    const frag = document.createDocumentFragment();
    const tmp  = document.createElement('div');
    tmp.innerHTML = slice.map(renderCard).join('');
    while (tmp.firstChild) frag.appendChild(tmp.firstChild);
    grid.appendChild(frag);
    // Avancer le pointeur du nombre exact d'articles rendus
    _nextDataStart = dataStart + slice.length;
  }

  // Afficher le sentinel s'il reste des articles
  setSentinelVisible(_nextDataStart < filteredArticles.length);
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
        // Injecter l'image si ajoutée après la génération de la page statique
        injectArticleImage(article);
        // Section commentaires
        initComments(id);
        // Tracking vues + widget "Les plus lus"
        trackPageView(id);
        loadPopularArticles();
      } else {
        buildTOC();
      }
    } catch (_) { buildTOC(); }
    return;
  }

  const id = getParam('id');
  if (!id) { window.location.href = '404.html'; return; }

  // Rediriger directement vers la page statique canonique (1 seul saut)
  window.location.replace(`/articles/${encodeURIComponent(id)}/`);
}

function buildArticleHTML(a) {
  const layout   = a.imageLayout || 'top';
  const zoom     = parseFloat(a.imageZoom) || 1;
  const zoomStyle = zoom > 1 ? `;transform:scale(${zoom});transform-origin:${esc(a.imagePosition || 'center center')}` : '';
  const objPos   = `object-position:${esc(a.imagePosition || 'center center')}${zoomStyle}`;

  // Image selon layout
  const imgTop = (a.image && layout === 'top') ? `
    <div class="article-hero-image">
      <img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy" style="${objPos}">
    </div>` : '';

  const imgFloat = a.image && (layout === 'left' || layout === 'right') ? `
    <div style="float:${layout};${layout==='left'?'margin:0 1.6rem 1rem 0':'margin:0 0 1rem 1.6rem'};max-width:42%;border-radius:10px;overflow:hidden;clear:${layout}">
      <img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy" style="width:100%;display:block;${objPos}">
    </div>` : '';

  const imgBottom = (a.image && layout === 'bottom') ? `
    <div class="article-hero-image" style="margin-top:2rem">
      <img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy" style="${objPos}">
    </div>` : '';

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
        <time datetime="${esc(a.date_modified || a.date || '')}">${dateLabel(a)}</time>
        <span class="article-meta-dot">•</span>
        <span>⏱ ${a.readTime || 5} min de lecture</span>
      </div>

      <!-- Partage haut — icônes circulaires -->
      <div class="share-top" id="share-top" aria-label="Partager cet article">
        <button class="share-icon-btn share-icon-btn--fb" data-platform="facebook" title="Partager sur Facebook" aria-label="Facebook">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        </button>
        <button class="share-icon-btn share-icon-btn--tw" data-platform="twitter" title="Partager sur X" aria-label="X / Twitter">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </button>
        <button class="share-icon-btn share-icon-btn--pi" data-platform="pinterest" title="Épingler sur Pinterest" aria-label="Pinterest">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
        </button>
        <button class="share-icon-btn share-icon-btn--tg" data-platform="telegram" title="Partager sur Telegram" aria-label="Telegram">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
        </button>
        <button class="share-icon-btn share-icon-btn--li" data-platform="linkedin" title="Partager sur LinkedIn" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        </button>
        <button class="share-icon-btn share-icon-btn--copy" data-platform="copy" title="Copier le lien" aria-label="Copier le lien" id="share-copy-top">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </button>
      </div>

      ${imgTop}
    </header>

    ${keypoints}

    <div class="article-body" ${imgFloat ? 'style="overflow:hidden"' : ''}>
      ${imgFloat}
      ${a.content || '<p>Contenu en cours de rédaction…</p>'}
    </div>
    ${imgBottom}

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
    </div>

    <aside class="article-disclaimer" role="note">
      ⚕️ <em>Cet article est fourni à titre <strong>informatif uniquement</strong> et ne remplace pas
      l'avis d'un professionnel de santé. En cas de détresse, appelez le
      <strong><a href="tel:3114">3114</a></strong> (24h/24, gratuit).</em>
    </aside>`;
}

/* Injecte l'image hero dans une page statique si elle n'y est pas baked-in */
function injectArticleImage(article) {
  if (!article.image) return;
  if (document.querySelector('.article-hero-image, [data-img-injected]')) return;

  const layout    = article.imageLayout || 'top';
  const zoom      = parseFloat(article.imageZoom) || 1;
  const zoomStyle = zoom > 1 ? `;transform:scale(${zoom});transform-origin:${esc(article.imagePosition || 'center center')}` : '';
  const objPos    = `object-position:${esc(article.imagePosition || 'center center')}${zoomStyle}`;
  const div    = document.createElement('div');
  div.setAttribute('data-img-injected', '1');
  div.className = 'article-hero-image';

  if (layout === 'left' || layout === 'right') {
    div.removeAttribute('class');
    div.style.cssText = `float:${layout};${layout==='left'?'margin:0 1.6rem 1rem 0':'margin:0 0 1rem 1.6rem'};max-width:42%;border-radius:10px;overflow:hidden`;
    div.innerHTML = `<img src="${esc(article.image)}" alt="${esc(article.title)}" loading="lazy" style="width:100%;display:block;${objPos}">`;
    const body = document.querySelector('.article-body');
    if (body) { body.style.overflow = 'hidden'; body.prepend(div); }
  } else if (layout === 'bottom') {
    div.style.marginTop = '2rem';
    div.innerHTML = `<img src="${esc(article.image)}" alt="${esc(article.title)}" loading="lazy" style="${objPos}">`;
    const body = document.querySelector('.article-body');
    if (body) body.after(div);
  } else {
    // top (défaut)
    div.innerHTML = `<img src="${esc(article.image)}" alt="${esc(article.title)}" loading="lazy" style="${objPos}">`;
    const header = document.querySelector('.article-header');
    if (header) header.appendChild(div);
  }
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
  const url   = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(article.title);
  const imgUrl = encodeURIComponent(article.image || '');

  const shareUrls = {
    facebook:  `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    twitter:   `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${url}&media=${imgUrl}&description=${title}`,
    telegram:  `https://t.me/share/url?url=${url}&text=${title}`,
    linkedin:  `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    whatsapp:  `https://wa.me/?text=${title}%20→%20${url}`,
  };

  function handleShareClick(e) {
    const btn = e.target.closest('[data-platform]');
    if (!btn) return;
    const platform = btn.dataset.platform;
    if (platform === 'copy') {
      navigator.clipboard.writeText(window.location.href).then(() => {
        // Feedback visuel sur le bouton cliqué
        btn.classList.add('copied');
        const svg = btn.querySelector('svg');
        const originalSvg = svg ? svg.outerHTML : '';
        if (svg) btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="white"><polyline points="20 6 9 17 4 12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
        setTimeout(() => {
          btn.classList.remove('copied');
          if (svg) btn.innerHTML = originalSvg;
        }, 2500);
        // Feedback bouton bas aussi
        const copyBtns = document.querySelectorAll('[data-platform="copy"]');
        copyBtns.forEach(b => {
          if (b !== btn) {
            const orig = b.textContent;
            b.textContent = '✓ Copié !';
            setTimeout(() => b.textContent = orig, 2500);
          }
        });
      }).catch(() => {
        // Fallback si clipboard API non disponible
        const ta = document.createElement('textarea');
        ta.value = window.location.href;
        document.body.appendChild(ta);
        ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
      });
    } else if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=620,height=480,noopener,noreferrer');
    }
  }

  // Écouter sur les deux barres de partage
  ['share-top', 'share-buttons'].forEach(id => {
    const container = document.getElementById(id);
    if (container) container.addEventListener('click', handleShareClick);
  });
}

function buildTOC() {
  const body = document.querySelector('.article-body');
  const toc  = document.getElementById('toc');
  if (!body || !toc) return;
  const headings = body.querySelectorAll('h2, h3');
  if (headings.length < 3) { toc.style.display = 'none'; return; }
  toc.classList.add('visible');
  // Préfixer avec l'URL absolue de la page courante pour contourner la balise
  // <base href="../../"> présente dans les pages statiques d'articles :
  // sans préfixe, href="#s0" serait résolu en ../../#s0 (= page d'accueil).
  const pageBase = window.location.href.split('#')[0];
  let html = '<h3 class="widget__title">Table des matières</h3><ol>';
  headings.forEach((h, i) => {
    const id = `s${i}`;
    h.id = id;
    html += `<li${h.tagName==='H3' ? ' class="sub"' : ''}><a href="${pageBase}#${id}">${h.textContent}</a></li>`;
  });
  toc.innerHTML = html + '</ol>';
}

/* ============================================================
   ARTICLES LES PLUS LUS — Firebase Firestore
   ============================================================ */

/**
 * Incrémente atomiquement le compteur de vues d'un article.
 * Utilise l'API Firestore commit (field transform "increment") pour
 * éviter les races conditions. Une seule vue comptabilisée par session.
 */
async function trackPageView(articleId) {
  await loadFirebaseConfig();
  if (!_fbProjectId || !_fbApiKey) return;

  // Anti-spam : une seule vue comptée par session de navigation
  const sessionKey = `pv_${articleId}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, '1');

  const docName = `projects/${_fbProjectId}/databases/(default)/documents/pageviews/${articleId}`;
  const url = `https://firestore.googleapis.com/v1/projects/${_fbProjectId}/databases/(default)/documents:commit?key=${_fbApiKey}`;
  try {
    await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        writes: [{
          transform: {
            document: docName,
            fieldTransforms: [{
              fieldPath: 'count',
              increment: { integerValue: '1' }
            }]
          }
        }]
      })
    });
  } catch (_) {}
}

/**
 * Charge les articles les plus vus depuis Firestore et les affiche
 * dans le widget #popular-widget / #popular-list.
 * Requiert que allArticles soit déjà chargé ou le charge lui-même.
 */
async function loadPopularArticles() {
  const widget = document.getElementById('popular-widget');
  const list   = document.getElementById('popular-list');
  if (!widget || !list) return;

  await loadFirebaseConfig();
  if (!_fbProjectId || !_fbApiKey) return;

  try {
    // Récupérer les compteurs de vues triés par count décroissant
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'pageviews' }],
        orderBy: [{ field: { fieldPath: 'count' }, direction: 'DESCENDING' }],
        limit: 10
      }
    };
    const res = await fetch(`${_FBBASE()}:runQuery?key=${_fbApiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(query)
    });
    if (!res.ok) return;
    const rows = await res.json();
    const views = rows
      .filter(r => r.document)
      .map(r => ({
        id:    (r.document.name || '').split('/').pop(),
        count: _fbVal(r.document.fields?.count) || 0
      }))
      .filter(v => v.count > 0);

    if (views.length < 2) return; // Pas encore assez de données

    // Croiser avec le catalogue d'articles
    let articles = allArticles; // déjà chargé sur la home
    if (!articles || !articles.length) {
      // Sur la page article, allArticles peut être vide — on fetch
      const r2 = await fetch(CONFIG.dataUrl);
      if (!r2.ok) return;
      articles = await r2.json();
    }

    const today = new Date().toISOString().split('T')[0];
    const popular = views
      .map(v => articles.find(a => a.id === v.id))
      .filter(Boolean)
      .filter(a => {
        if (a.status === 'draft') return false;
        if (a.status === 'scheduled') return a.date <= today;
        return true;
      })
      .slice(0, 5);

    if (popular.length < 2) return;

    list.innerHTML = popular.map((a, i) => {
      const cat   = CATEGORIES[a.category] || {};
      const catHtml = a.category
        ? `<span class="popular-item__cat" style="color:${cat.color||'var(--color-primary)'};background:${cat.bg||'var(--color-primary-light)'}">${esc(a.category)}</span>`
        : '';
      const imgStyle = a.image
        ? `background-image:url('${esc(a.image)}');background-size:cover;background-position:center`
        : '';
      return `
        <a href="${articleUrl(a.id)}" class="popular-item">
          <span class="popular-item__rank" aria-label="Rang ${i + 1}">${i + 1}</span>
          <div class="popular-item__img" style="${imgStyle}" aria-hidden="true">
            ${!a.image ? '🧠' : ''}
          </div>
          <div>
            <div class="popular-item__title">${esc(a.title)}</div>
            ${catHtml}
          </div>
        </a>`;
    }).join('');

    widget.style.display = 'block';
  } catch (_) {}
}

async function loadRelated(current) {
  const c = document.getElementById('related-articles');
  if (!c) return;
  try {
    const res = await fetch(CONFIG.dataUrl);
    if (!res.ok) return;
    const raw = await res.json();

    // Filtrer les articles non encore publiés (brouillons et planifiés futurs)
    const today = new Date().toISOString().split('T')[0];
    const list = raw.filter(a => {
      if (a.status === 'draft') return false;
      if (a.status === 'scheduled') return a.date <= today;
      return true;
    });

    // Priorité 1 : articles_lies définis manuellement dans l'admin
    let related = [];
    if (current.articles_lies && current.articles_lies.length) {
      related = current.articles_lies
        .map(id => list.find(a => a.id === id))
        .filter(Boolean)
        .slice(0, 3);
    }

    // Priorité 2 : même catégorie (fallback)
    if (!related.length) {
      related = list.filter(a => a.id !== current.id && a.category === current.category).slice(0, 4);
    }

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
              <div class="related-item__meta">${dateLabel(a)}</div>
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
   CONSENT MODE v2 — met à jour Google Analytics selon le choix
   ============================================================ */
function updateGAConsent(accepted) {
  if (typeof gtag === 'undefined') return;
  gtag('consent', 'update', {
    'analytics_storage':  accepted ? 'granted' : 'denied',
    'ad_storage':         'denied', // toujours refusé (pas de pub pour l'instant)
    'ad_user_data':       'denied',
    'ad_personalization': 'denied',
  });
}

/* ============================================================
   BANNIÈRE COOKIES
   ============================================================ */
function initCookies() {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  const stored = localStorage.getItem('pc_consent');
  if (stored !== null) {
    banner.style.display = 'none';
    updateGAConsent(stored === '1'); // restaure le consentement au chargement
    return;
  }

  // Première visite : affiche l'overlay + bloque le scroll
  banner.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  function closeBanner() {
    banner.style.display = 'none';
    document.body.style.overflow = '';
  }

  document.getElementById('cookie-accept')?.addEventListener('click', () => {
    localStorage.setItem('pc_consent', '1');
    closeBanner();
    updateGAConsent(true);  // ✅ Active le tracking GA
  });
  document.getElementById('cookie-decline')?.addEventListener('click', () => {
    localStorage.setItem('pc_consent', '0');
    closeBanner();
    updateGAConsent(false); // ❌ GA collecte anonymement (sans cookies)
  });
}

/* ============================================================
   COMMENTAIRES (Firebase Firestore REST — sans SDK)
   ============================================================ */
let _fbProjectId = '';
let _fbApiKey    = '';

/** Base URL de l'API Firestore REST */
const _FBBASE = () =>
  `https://firestore.googleapis.com/v1/projects/${_fbProjectId}/databases/(default)/documents`;

/* ── Helpers de conversion Firestore ↔ JS ── */
function _fbVal(v) {
  if (!v) return null;
  if ('stringValue'    in v) return v.stringValue;
  if ('integerValue'   in v) return parseInt(v.integerValue, 10);
  if ('doubleValue'    in v) return v.doubleValue;
  if ('booleanValue'   in v) return v.booleanValue;
  if ('nullValue'      in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  return null;
}
function _fbDoc(doc) {
  const id  = (doc.name || '').split('/').pop();
  const obj = { id };
  for (const [k, v] of Object.entries(doc.fields || {})) obj[k] = _fbVal(v);
  return obj;
}
function _fbFV(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean')        return { booleanValue: v };
  if (typeof v === 'number' && Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === 'number')         return { doubleValue: v };
  return { stringValue: String(v) };
}
function _fbFields(obj) {
  const f = {};
  for (const [k, v] of Object.entries(obj)) f[k] = _fbFV(v);
  return f;
}

/** Charge projectId + apiKey depuis data/config.json */
async function loadFirebaseConfig() {
  if (_fbProjectId) return;
  try {
    const res = await fetch('data/config.json?t=' + CACHE_H);
    if (!res.ok) return;
    const cfg = await res.json();
    if (cfg.firebaseProjectId) _fbProjectId = cfg.firebaseProjectId;
    if (cfg.firebaseApiKey)    _fbApiKey    = cfg.firebaseApiKey;
  } catch (_) {}
}

async function _fbFetchComments(articleId) {
  // Note : pas de orderBy dans la requête Firestore pour éviter d'exiger un
  // index composite (article_id + status + created_at). Le tri est fait côté JS.
  const query = {
    structuredQuery: {
      from: [{ collectionId: 'comments' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            { fieldFilter: { field: { fieldPath: 'article_id' }, op: 'EQUAL', value: { stringValue: articleId } } },
            { fieldFilter: { field: { fieldPath: 'status' },     op: 'EQUAL', value: { stringValue: 'approved' } } },
          ],
        },
      },
    },
  };
  const res = await fetch(`${_FBBASE()}:runQuery?key=${_fbApiKey}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(query),
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return rows
    .filter(r => r.document)
    .map(r => _fbDoc(r.document))
    .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
}

async function _fbSubmitComment(articleId, name, email, content) {
  const res = await fetch(`${_FBBASE()}/comments?key=${_fbApiKey}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      fields: _fbFields({
        article_id:       articleId,
        author_name:      name,
        author_email:     email || '',
        content,
        status:           'pending',
        flagged:          false,
        flag_count:       0,
        admin_reply:      '',
        admin_reply_date: '',
        created_at:       new Date().toISOString(),
      }),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erreur ' + res.status);
  }
}

async function _fbReportComment(commentId) {
  // Lecture du document (autorisée si status === 'approved' par les règles Firestore)
  const getRes = await fetch(`${_FBBASE()}/comments/${commentId}?key=${_fbApiKey}`);
  if (!getRes.ok) return;
  const doc     = await getRes.json();
  const current = _fbDoc(doc);
  if (current.status !== 'approved') return;

  const newCount = (current.flag_count || 0) + 1;
  const mask     = 'updateMask.fieldPaths=flag_count&updateMask.fieldPaths=flagged';
  await fetch(`${_FBBASE()}/comments/${commentId}?key=${_fbApiKey}&${mask}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ fields: _fbFields({ flag_count: newCount, flagged: true }) }),
  });
}

/** Injecte la section commentaires après les boutons de partage */
async function initComments(articleId) {
  await loadFirebaseConfig();
  if (!_fbProjectId || !_fbApiKey) return; // Firebase non configuré → pas de section

  const shareSection = document.getElementById('share-buttons');
  if (!shareSection || document.getElementById('comments-section')) return;

  const section = document.createElement('section');
  section.id        = 'comments-section';
  section.className = 'comments-section';
  section.innerHTML = `
    <h2 class="comments-section__title">
      Commentaires
      <span class="comments-count" id="comments-count"></span>
    </h2>
    <div id="comments-list">
      <div class="comment-empty">Chargement des commentaires…</div>
    </div>
    <div class="comment-form">
      <div class="comment-form__title">💬 Laisser un commentaire</div>
      <div class="comment-form__row">
        <div class="comment-form__group">
          <label for="cf-name">Votre prénom *</label>
          <input type="text" id="cf-name" placeholder="Marie" required maxlength="80" autocomplete="given-name">
        </div>
        <div class="comment-form__group">
          <label for="cf-email">E-mail <small style="font-weight:400">(non publié)</small></label>
          <input type="email" id="cf-email" placeholder="marie@exemple.fr" autocomplete="email">
        </div>
      </div>
      <div class="comment-form__group">
        <label for="cf-content">Votre commentaire *</label>
        <textarea id="cf-content" placeholder="Partagez votre ressenti ou votre expérience…" maxlength="2000" required></textarea>
      </div>
      <p class="comment-form__hint">⏳ Votre commentaire sera affiché après modération.</p>
      <button class="comment-form__submit" id="cf-submit">Envoyer ✓</button>
      <div class="comment-form__msg" id="cf-msg" aria-live="polite"></div>
    </div>`;

  shareSection.after(section);

  // Soumettre le formulaire
  document.getElementById('cf-submit').addEventListener('click', () => handleCommentSubmit(articleId));
  document.getElementById('cf-content')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) handleCommentSubmit(articleId);
  });

  // Charger les commentaires
  try {
    const comments = await _fbFetchComments(articleId);
    _renderComments(comments);
  } catch (_) {
    document.getElementById('comments-list').innerHTML =
      '<div class="comment-empty">Impossible de charger les commentaires pour l\'instant.</div>';
  }
}

function _renderComments(comments) {
  const list    = document.getElementById('comments-list');
  const countEl = document.getElementById('comments-count');
  if (!list) return;
  if (countEl) countEl.textContent = comments.length ? `(${comments.length})` : '';

  if (!comments.length) {
    list.innerHTML = '<div class="comment-empty">Soyez le premier à commenter cet article&nbsp;💬</div>';
    return;
  }

  const reported = JSON.parse(localStorage.getItem('pc_reported_comments') || '[]');

  list.innerHTML = comments.map(c => {
    const initials = (c.author_name || '?')
      .trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';
    const dateStr = new Date(c.created_at).toLocaleDateString('fr-FR',
      { day: 'numeric', month: 'long', year: 'numeric' });
    const alreadyReported = reported.includes(c.id);

    return `
    <div class="comment-item" id="comment-${esc(c.id)}">
      <div class="comment-header">
        <div class="comment-avatar" aria-hidden="true">${initials}</div>
        <div class="comment-author">${esc(c.author_name)}</div>
        <time class="comment-date" datetime="${esc(c.created_at)}">${dateStr}</time>
      </div>
      <div class="comment-body">${esc(c.content)}</div>
      ${c.admin_reply ? `
      <div class="comment-reply">
        <div class="comment-reply__label">✦ Réponse de la rédaction</div>
        <div class="comment-reply__text">${esc(c.admin_reply)}</div>
      </div>` : ''}
      <div class="comment-actions">
        ${alreadyReported
          ? `<span class="comment-report-btn comment-report-btn--done" aria-label="Déjà signalé">⚑ Signalé</span>`
          : `<button class="comment-report-btn" aria-label="Signaler ce commentaire" onclick="handleReport('${esc(c.id)}')">⚑ Signaler</button>`}
      </div>
    </div>`;
  }).join('');
}

async function handleCommentSubmit(articleId) {
  const btn     = document.getElementById('cf-submit');
  const msgEl   = document.getElementById('cf-msg');
  const nameEl  = document.getElementById('cf-name');
  const emailEl = document.getElementById('cf-email');
  const bodyEl  = document.getElementById('cf-content');

  const name    = nameEl?.value.trim() || '';
  const email   = emailEl?.value.trim() || '';
  const content = bodyEl?.value.trim() || '';

  msgEl.className    = 'comment-form__msg';
  msgEl.style.display = 'none';

  if (!name) {
    msgEl.textContent = '⚠️ Veuillez indiquer votre prénom.';
    msgEl.className   = 'comment-form__msg comment-form__msg--error';
    nameEl?.focus();
    return;
  }
  if (!content || content.length < 5) {
    msgEl.textContent = '⚠️ Le commentaire est trop court (5 caractères minimum).';
    msgEl.className   = 'comment-form__msg comment-form__msg--error';
    bodyEl?.focus();
    return;
  }

  btn.disabled     = true;
  btn.textContent  = '⏳ Envoi en cours…';

  try {
    await _fbSubmitComment(articleId, name, email, content);
    msgEl.textContent = '✅ Merci ! Votre commentaire est en attente de modération et sera visible prochainement.';
    msgEl.className   = 'comment-form__msg comment-form__msg--success';
    if (nameEl)  nameEl.value  = '';
    if (emailEl) emailEl.value = '';
    if (bodyEl)  bodyEl.value  = '';
  } catch (e) {
    msgEl.textContent = '❌ Une erreur est survenue. Veuillez réessayer.';
    msgEl.className   = 'comment-form__msg comment-form__msg--error';
    console.error('Comment submit error:', e);
  }

  btn.disabled    = false;
  btn.textContent = 'Envoyer ✓';
}

async function handleReport(commentId) {
  if (!confirm('Signaler ce commentaire comme inapproprié ?')) return;
  try {
    await _fbReportComment(commentId);
    // Mémoriser pour éviter les doubles signalements
    const reported = JSON.parse(localStorage.getItem('pc_reported_comments') || '[]');
    if (!reported.includes(commentId)) {
      reported.push(commentId);
      localStorage.setItem('pc_reported_comments', JSON.stringify(reported));
    }
    // Mettre à jour le bouton dans la page
    const btn = document.querySelector(`#comment-${commentId} .comment-report-btn`);
    if (btn) {
      btn.outerHTML = `<span class="comment-report-btn comment-report-btn--done" aria-label="Déjà signalé">⚑ Signalé</span>`;
    }
  } catch (_) {}
}

/* ============================================================
   DÉMARRAGE
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHeaderScroll();
  initCookies();
  initReadingProgress();
  injectNewsletterConsent(); // RGPD : injecte la case sur toutes les pages
  if (document.getElementById('articles-grid'))  initHome();
  if (document.getElementById('article-content')) initArticle();
  if (document.getElementById('dossier-list-grid')) initDossierList();
  if (document.getElementById('dossier-content'))   initDossierPage();
  if (document.getElementById('heros-grid'))        initHerosRubrique();
  if (document.getElementById('societe-grid'))      initSocieteRubrique();
  if (document.getElementById('sexo-grid'))         initSexoRubrique();
  if (document.getElementById('monstres-grid'))     initMonstresRubrique();
  if (document.getElementById('tests-grid'))        initTestsRubrique();

  // Fallback : insère une espace insécable avant le dernier mot des titres
  // pour éviter la ponctuation orpheline (complète text-wrap:balance)
  document.querySelectorAll('h1, h2, h3, .card__title').forEach(el => {
    el.innerHTML = el.innerHTML.replace(/\s(\S+)\s*$/, ' $1');
  });
});

/* ============================================================
   NEWSLETTER — consentement RGPD + inscription (Brevo + Firebase)
   ============================================================ */

/** Injecte la case de consentement RGPD dans les widgets newsletter des articles */
function injectNewsletterConsent() {
  const form = document.getElementById('nl-form');
  if (!form || form.querySelector('#nl-consent')) return; // déjà présent
  const btn = form.querySelector('#nl-btn');
  if (!btn) return;

  const prefix = '/'; // chemin absolu, valide quelle que soit la profondeur de l'URL

  const wrapper = document.createElement('div');
  wrapper.className = 'nl-consent';
  wrapper.innerHTML = `
    <input type="checkbox" id="nl-consent">
    <label for="nl-consent">J'accepte de recevoir la newsletter hebdomadaire d'Oui Psycho! et confirme avoir lu la
      <a href="${prefix}politique-de-confidentialite.html">politique de confidentialité</a>.
      Désinscription possible à tout moment.</label>`;
  btn.parentNode.insertBefore(wrapper, btn);
}

/** Charge config.json une fois et met en cache */
let _nlCfg = null;
async function _loadNlCfg() {
  if (_nlCfg) return _nlCfg;
  const prefix = '/';
  try {
    _nlCfg = await fetch(`${prefix}data/config.json?t=${CACHE_H}`).then(r => r.ok ? r.json() : {});
  } catch(_) { _nlCfg = {}; }
  return _nlCfg;
}

async function subscribeNewsletter() {
  const input  = document.getElementById('newsletter-email');
  const btn    = document.getElementById('nl-btn');
  const msgEl  = document.getElementById('nl-msg');
  if (!input || !btn) return;

  // ── Vérification consentement RGPD ──────────────────────────
  const consent = document.getElementById('nl-consent');
  if (consent && !consent.checked) {
    // Afficher message d'erreur sous la case
    let errEl = document.getElementById('nl-consent-err');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.id = 'nl-consent-err';
      errEl.className = 'nl-consent-error';
      consent.closest('.nl-consent').insertAdjacentElement('afterend', errEl);
    }
    errEl.textContent = 'Veuillez cocher la case pour continuer.';
    return;
  }
  const errEl = document.getElementById('nl-consent-err');
  if (errEl) errEl.remove();

  // ── Validation email ─────────────────────────────────────────
  const email = input.value.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    _nlMsg('Adresse e-mail invalide.', 'error'); return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Inscription…';

  await loadFirebaseConfig();
  const cfg = await _loadNlCfg();
  let ok = false;

  // ── 1. Brevo via formulaire public (sibforms.com) ────────────
  // Aucune clé API : on POST vers l'endpoint public du formulaire Brevo.
  // mode:'no-cors' = réponse opaque mais la requête arrive bien chez Brevo.
  if (cfg.brevoFormUrl) {
    try {
      await fetch(cfg.brevoFormUrl, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({
          EMAIL:               email,
          email_address_check: '',   // honeypot anti-spam (doit rester vide)
          locale:              'fr'
        }).toString()
      });
      ok = true; // no-cors = pas de statut lisible, mais la requête est envoyée
    } catch (_) {}
  }

  // ── 2. Firebase (sauvegarde) ─────────────────────────────────
  if (_fbProjectId && _fbApiKey) {
    try {
      const id  = email.replace(/[^a-z0-9]/g, '_');
      const url = `${_FBBASE()}/newsletter/${id}?key=${_fbApiKey}`;
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          email:      { stringValue: email },
          created_at: { timestampValue: new Date().toISOString() },
          source:     { stringValue: 'ouipsycho.fr' },
          consent:    { booleanValue: true },
          active:     { booleanValue: true }
        }})
      });
      ok = true;
    } catch (_) {}
  }

  if (ok) {
    document.getElementById('nl-form').innerHTML = `
      <p style="font-weight:700;font-size:.95rem;line-height:1.5">
        ✅ Inscription enregistrée !<br>
        <span style="font-weight:400;font-size:.85rem;opacity:.9">
          Vérifiez votre boîte mail pour confirmer votre abonnement.
        </span>
      </p>`;
  } else {
    btn.disabled = false;
    btn.textContent = "S'abonner gratuitement";
    _nlMsg('Une erreur est survenue. Réessayez dans quelques instants.', 'error');
  }
}

/** Désinscription depuis la page se-desinscrire.html */
async function unsubscribeNewsletter(email) {
  // La désinscription via l'endpoint sibforms n'est pas possible côté client.
  // On passe par l'API Brevo si une clé est disponible, sinon on redirige vers Brevo.
  const cfg = await _loadNlCfg();
  const brevoKey = cfg.brevoApiKey || '';
  if (brevoKey && cfg.brevoListId) {
    try {
      const r = await fetch(`https://api.brevo.com/v3/contacts/lists/${cfg.brevoListId}/contacts/remove`, {
        method:  'POST',
        headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ emails: [email] })
      });
      return r.ok || r.status === 404;
    } catch(_) {}
  }
  // Fallback : retour true (l'utilisateur a été informé, Brevo gère la désinscription via email)
  return true;
}

function _nlMsg(text, type) {
  const el = document.getElementById('nl-msg');
  if (!el) return;
  el.textContent = text;
  el.style.color = type === 'error' ? '#ffb3a7' : '#a8e6cf';
  el.style.display = 'block';
}

/* ============================================================
   NOS HÉROS SUR LE DIVAN — page rubrique
   ============================================================ */

async function initHerosRubrique() {
  const grid = document.getElementById('heros-grid');
  if (!grid) return;
  if (!grid.dataset.static) grid.innerHTML = skeletons(6);

  try {
    const today = new Date().toISOString().split('T')[0];
    const isOk  = a => a.status !== 'draft' && (a.status !== 'scheduled' || a.date <= today);

    const res  = await fetch('data/articles.json?t=' + CACHE_H);
    const all  = res.ok ? await res.json() : [];
    const list = all.filter(a => a.category === 'Nos héros sur le divan' && isOk(a))
                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (!list.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state__icon">🛋️</div>
          <p>Aucun article pour l'instant — revenez bientôt !</p>
        </div>`;
      return;
    }
    grid.innerHTML = list.map(renderCard).join('');
  } catch(_) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Erreur de chargement.</p></div>`;
  }
}

/* ============================================================
   TESTS — page rubrique (charge data/tests.json)
   ============================================================ */

async function initTestsRubrique() {
  const grid = document.getElementById('tests-grid');
  if (!grid) return;

  // Skeleton placeholder
  grid.innerHTML = Array(4).fill(0).map(() => `
    <div class="test-card" style="--card-color:#ccc">
      <div class="test-card__head" style="background:#e5e7eb;min-height:140px"></div>
      <div class="test-card__body">
        <div style="height:1rem;background:#e5e7eb;border-radius:4px;margin-bottom:.5rem"></div>
        <div style="height:.75rem;background:#f3f4f6;border-radius:4px;width:75%"></div>
      </div>
    </div>`).join('');

  try {
    const res  = await fetch('data/tests.json?t=' + CACHE_H);
    const list = res.ok ? await res.json() : [];
    const published = list.filter(t => t.status !== 'draft');

    if (!published.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state__icon">🧪</div>
          <p>Aucun test disponible pour l'instant — revenez bientôt !</p>
        </div>`;
      return;
    }

    grid.innerHTML = published.map(t => {
      const imgHtml = t.image
        ? `<img class="test-card__img" src="${t.image}" alt="${t.title}" loading="lazy">`
        : '';
      const newBadge = t.isNew
        ? `<span class="test-card__badge-new">Nouveau</span>` : '';
      const articleLink = t.articleUrl
        ? `<a class="test-card__link" href="${t.articleUrl}">Lire l'article</a>` : '';
      return `
        <article class="test-card" style="--card-color:${t.color || '#1F4E6B'}">
          <div class="test-card__head">
            ${imgHtml}
            ${newBadge}
            <span class="test-card__emoji">${t.emoji || '🧠'}</span>
          </div>
          <div class="test-card__body">
            <h2 class="test-card__title">${t.title}</h2>
            <p class="test-card__desc">${t.desc || ''}</p>
            <div class="test-card__meta">
              <span class="test-card__cat">${t.catLabel || ''}</span>
              <span class="test-card__time">⏱ ${t.duration || '5 min'}</span>
            </div>
            <div class="test-card__actions">
              <a class="test-card__btn" href="${t.testUrl}">Faire le test →</a>
              ${articleLink}
            </div>
          </div>
        </article>`;
    }).join('');
  } catch(_) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Erreur de chargement.</p></div>`;
  }
}

/* ============================================================
   SOCIÉTÉ — page rubrique
   ============================================================ */

async function initSocieteRubrique() {
  const grid = document.getElementById('societe-grid');
  if (!grid) return;
  if (!grid.dataset.static) grid.innerHTML = skeletons(6);

  try {
    const today = new Date().toISOString().split('T')[0];
    const isOk  = a => a.status !== 'draft' && (a.status !== 'scheduled' || a.date <= today);

    const res  = await fetch('data/articles.json?t=' + CACHE_H);
    const all  = res.ok ? await res.json() : [];
    const list = all.filter(a => (a.category === 'Société' || a.category === 'Société & psychologie politique') && isOk(a))
                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (!list.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state__icon">🌍</div>
          <p>Aucun article pour l'instant — revenez bientôt !</p>
        </div>`;
      return;
    }
    grid.innerHTML = list.map(renderCard).join('');
  } catch(_) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Erreur de chargement.</p></div>`;
  }
}

/* ============================================================
   SEXO — page rubrique
   ============================================================ */

async function initSexoRubrique() {
  const grid = document.getElementById('sexo-grid');
  if (!grid) return;
  if (!grid.dataset.static) grid.innerHTML = skeletons(6);

  try {
    const today = new Date().toISOString().split('T')[0];
    const isOk  = a => a.status !== 'draft' && (a.status !== 'scheduled' || a.date <= today);

    const res  = await fetch('data/articles.json?t=' + CACHE_H);
    const all  = res.ok ? await res.json() : [];
    const list = all.filter(a => a.category === 'Sexo' && isOk(a))
                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (!list.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state__icon">❤️</div>
          <p>Aucun article pour l'instant — revenez bientôt !</p>
        </div>`;
      return;
    }
    grid.innerHTML = list.map(renderCard).join('');
  } catch(_) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Erreur de chargement.</p></div>`;
  }
}

/* ============================================================
   LES MONSTRES SUR LE DIVAN — page rubrique
   ============================================================ */

async function initMonstresRubrique() {
  const grid = document.getElementById('monstres-grid');
  if (!grid) return;
  if (!grid.dataset.static) grid.innerHTML = skeletons(4);

  try {
    const today = new Date().toISOString().split('T')[0];
    const isOk  = a => a.status !== 'draft' && (a.status !== 'scheduled' || a.date <= today);

    const res  = await fetch('data/articles.json?t=' + CACHE_H);
    const all  = res.ok ? await res.json() : [];
    const list = all.filter(a => a.category === 'Les monstres sur le divan' && isOk(a))
                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (!list.length) {
      grid.innerHTML = `
        <div class="monstres-coming" style="grid-column:1/-1">
          <div class="monstres-coming__icon">🖤</div>
          <h3>Prochainement</h3>
          <p>Les premiers portraits arrivent bientôt — Hitler, Staline, serial killers…<br>Abonnez-vous à la newsletter pour ne rien manquer.</p>
          <a href="index.html#newsletter-widget" style="display:inline-block;margin-top:1.2rem;background:#3b0f0f;color:#fca5a5;padding:.6rem 1.4rem;border-radius:8px;text-decoration:none;font-weight:600;font-size:.9rem;border:1px solid #7f1d1d;">S'abonner à la newsletter →</a>
        </div>`;
      return;
    }
    grid.innerHTML = list.map(renderCard).join('');
  } catch(_) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Erreur de chargement.</p></div>`;
  }
}

/* ============================================================
   DOSSIERS
   ============================================================ */

function dossierUrl(id) {
  return `dossiers/${esc(id)}/`;
}

/** Carte dossier (home + listing)
 *  d._path = 'articles' → lien vers /{SLUG}/
 *  d._path = 'dossiers' (ou absent) → lien vers dossiers/SLUG/
 */
function renderDossierCard(d) {
  const cat      = CATEGORIES[d.category] || {};
  const url      = d._path === 'articles' ? `${esc(d.id)}/` : `dossiers/${esc(d.id)}/`;
  const imgStyle = d.image
    ? `background-image:url('${esc(d.image)}');background-size:cover;background-position:center`
    : '';
  const chCount    = d.chapterCount || (d.chapters && d.chapters.length) || 0;
  const metaChapters = chCount > 0
    ? `<span>📖 ${chCount} chapitres</span><span>•</span>`
    : '';
  return `
    <a href="${url}" class="dossier-card">
      <div class="dossier-card__img" style="${imgStyle}">
        ${!d.image ? '<span class="dossier-card__emoji">📚</span>' : ''}
        <span class="dossier-card__label">Dossier</span>
      </div>
      <div class="dossier-card__body">
        <span class="badge" style="color:${cat.color||'var(--color-primary)'};background:${cat.bg||'var(--color-primary-light)'}">${esc(d.category || 'Général')}</span>
        <h3 class="dossier-card__title">${esc(d.title)}</h3>
        ${d.subtitle ? `<p class="dossier-card__subtitle">${esc(d.subtitle)}</p>` : ''}
        <p class="dossier-card__excerpt">${esc(d.excerpt || '')}</p>
        <div class="dossier-card__meta">
          ${metaChapters}
          <span>⏱ ${d.readTime || 20} min</span>
        </div>
      </div>
    </a>`;
}

/** Section dossiers sur la page d'accueil
 *  Combine : dossiers manuels (data/dossiers.json)
 *          + articles marqués type:"dossier" (data/articles.json)
 */
async function loadDossierSection() {
  const section = document.getElementById('dossier-section');
  const grid    = document.getElementById('dossier-grid');
  if (!section || !grid) return;

  try {
    const today    = new Date().toISOString().split('T')[0];
    const isOk     = d => d.status !== 'draft' && (d.status !== 'scheduled' || d.date <= today);

    const [rawManual, rawArticles] = await Promise.all([
      fetch('data/dossiers.json').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('data/articles.json').then(r => r.ok ? r.json() : []).catch(() => []),
    ]);

    const manual   = rawManual.filter(isOk).map(d => ({ ...d, _path: 'dossiers' }));
    const fromArts = rawArticles.filter(a => a.type === 'dossier' && isOk(a))
                                .map(a => ({ ...a, _path: 'articles' }));

    const dossiers = [...manual, ...fromArts]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 3);

    if (!dossiers.length) return;
    grid.innerHTML = dossiers.map(renderDossierCard).join('');
    section.style.display = 'block';
  } catch (_) {}
}

/** Page listing de tous les dossiers
 *  Combine : dossiers manuels (data/dossiers.json)
 *          + articles marqués type:"dossier" (data/articles.json)
 */
async function initDossierList() {
  const grid = document.getElementById('dossier-list-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="empty-state"><div class="empty-state__icon">⏳</div><p>Chargement…</p></div>';

  try {
    const today = new Date().toISOString().split('T')[0];
    const isOk  = d => d.status !== 'draft' && (d.status !== 'scheduled' || d.date <= today);

    const [rawManual, rawArticles] = await Promise.all([
      fetch('data/dossiers.json').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('data/articles.json').then(r => r.ok ? r.json() : []).catch(() => []),
    ]);

    const manual   = rawManual.filter(isOk).map(d => ({ ...d, _path: 'dossiers' }));
    const fromArts = rawArticles.filter(a => a.type === 'dossier' && isOk(a))
                                .map(a => ({ ...a, _path: 'articles' }));

    const dossiers = [...manual, ...fromArts]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (!dossiers.length) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🌱</div><p>Les dossiers arrivent bientôt !</p></div>';
      return;
    }
    grid.innerHTML = dossiers.map(renderDossierCard).join('');
  } catch (_) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🔍</div><p>Impossible de charger les dossiers.</p></div>';
  }
}

/** Page individuelle d'un dossier */
async function initDossierPage() {
  const container = document.getElementById('dossier-content');
  if (!container) return;

  // Page statique pré-générée
  if (container.dataset.static === 'true') {
    const id = container.dataset.id;
    try {
      const res = await fetch(`dossiers/${encodeURIComponent(id)}.json`);
      if (res.ok) {
        const dossier = await res.json();
        buildDossierTOC(dossier);
        initShareButtons(dossier);
        loadRelated(dossier);
        loadPopularArticles();
        trackPageView('dossier-' + id);
      }
    } catch (_) {}
    return;
  }

  // Rendu dynamique depuis ?id=SLUG
  const id = getParam('id');
  if (!id) { window.location.href = '404.html'; return; }

  try {
    const res = await fetch(`dossiers/${encodeURIComponent(id)}.json`);
    if (!res.ok) throw new Error('Dossier non trouvé');
    const dossier = await res.json();

    document.title = `${dossier.title} — Dossier — ${CONFIG.siteName}`;
    setMeta('name',     'description',    dossier.metaDescription || dossier.excerpt || '');
    setMeta('property', 'og:title',       dossier.title + ' — Dossier');
    setMeta('property', 'og:description', dossier.metaDescription || dossier.excerpt || '');
    setMeta('property', 'og:url',         window.location.href);
    if (dossier.image) setMeta('property', 'og:image', dossier.image);
    setMeta('name', 'robots', 'index, follow');

    container.innerHTML = buildDossierHTML(dossier);
    buildDossierTOC(dossier);
    initShareButtons(dossier);
    loadRelated(dossier);
    loadPopularArticles();
    trackPageView('dossier-' + id);

    // JSON-LD
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Article',
      headline: dossier.title,
      description: dossier.metaDescription || dossier.excerpt || '',
      datePublished: dossier.date,
      inLanguage: 'fr',
      author: { '@type': 'Person', name: dossier.author || 'La rédaction Oui Psycho!' },
      publisher: { '@type': 'Organization', name: CONFIG.siteName, url: CONFIG.siteUrl },
      mainEntityOfPage: { '@type': 'WebPage', '@id': window.location.href },
      ...(dossier.image ? { image: dossier.image } : {}),
    });
    document.head.appendChild(s);

  } catch (_) {
    window.location.href = '404.html';
  }
}

/** Construit le HTML complet d'un dossier */
function buildDossierHTML(d) {
  const keypoints = d.keypoints?.length ? `
    <div class="article-keypoints">
      <div class="article-keypoints__title">💡 Ce que vous allez apprendre</div>
      <ul>${d.keypoints.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
    </div>` : '';

  const intro = d.intro ? `<div class="dossier-intro">${d.intro}</div>` : '';

  const chapters = (d.chapters || []).map(ch => `
    <section class="dossier-chapter article-body" id="chapitre-${esc(ch.id)}">
      <div class="dossier-chapter__header">
        <span class="dossier-chapter__num">${String(ch.number).padStart(2, '0')}</span>
        <div class="dossier-chapter__title-block">
          <div class="dossier-chapter__label">Chapitre ${ch.number}</div>
          <h2 class="dossier-chapter__title">${esc(ch.title)}</h2>
        </div>
      </div>
      ${ch.content || ''}
    </section>`).join('');

  const sources = d.sources?.length ? `
    <div class="dossier-sources">
      <div class="dossier-sources__title">📚 Sources &amp; références</div>
      <ol class="dossier-sources__list">
        ${d.sources.map(s => `
          <li>
            <cite>${esc(s.authors)} (${esc(s.year)}). <em>${esc(s.title)}</em>
            ${s.journal ? `. ${esc(s.journal)}` : ''}
            ${s.publisher ? `. ${esc(s.publisher)}` : ''}</cite>
            ${s.url ? ` — <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">Lien</a>` : ''}
          </li>`).join('')}
      </ol>
    </div>` : '';

  const cat = CATEGORIES[d.category] || {};

  return `
    <header class="article-header">
      <nav class="breadcrumb" aria-label="Fil d'Ariane">
        <a href="index.html">Accueil</a> <span>›</span>
        <a href="dossiers.html">Dossiers</a>
        <span>›</span> <span>${esc(d.title)}</span>
      </nav>
      <span class="dossier-badge">Dossier</span>
      <span class="badge" style="color:${cat.color||'var(--color-primary)'};background:${cat.bg||'var(--color-primary-light)'}">${esc(d.category || 'Général')}</span>
      <h1>${esc(d.title)}</h1>
      ${d.subtitle ? `<p style="font-size:var(--fs-lg);color:var(--color-text-muted);margin-top:-var(--sp-3);margin-bottom:var(--sp-4);font-family:var(--font-heading);font-style:italic">${esc(d.subtitle)}</p>` : ''}
      <div class="article-meta">
        <span>Par <strong>${esc(d.author || 'La rédaction')}</strong></span>
        <span class="article-meta-dot">•</span>
        <time datetime="${esc(d.date_modified || d.date || '')}">${formatDate(d.date_modified || d.date)}</time>
        <span class="article-meta-dot">•</span>
        <span>⏱ ${d.readTime || 20} min de lecture</span>
        <span class="article-meta-dot">•</span>
        <span>📖 ${(d.chapters || []).length} chapitres</span>
      </div>
      <div class="share-top" id="share-top" aria-label="Partager ce dossier">
        <button class="share-icon-btn share-icon-btn--fb"   data-platform="facebook"  title="Facebook"     aria-label="Facebook"><svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></button>
        <button class="share-icon-btn share-icon-btn--tw"   data-platform="twitter"   title="X / Twitter"  aria-label="X"><svg viewBox="0 0 24 24" width="17" height="17" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></button>
        <button class="share-icon-btn share-icon-btn--wa"   data-platform="whatsapp"  title="WhatsApp"     aria-label="WhatsApp"><svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg></button>
        <button class="share-icon-btn share-icon-btn--copy" data-platform="copy"      title="Copier le lien" aria-label="Copier"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
      </div>
      ${d.image ? `<div class="article-hero-image"><img src="${esc(d.image)}" alt="${esc(d.title)}" loading="lazy"></div>` : ''}
    </header>

    ${keypoints}
    ${intro}
    ${chapters}
    ${sources}

    <div class="article-author">
      <div class="article-author__avatar" aria-hidden="true">✍️</div>
      <div>
        <div class="article-author__name">${esc(d.author || 'La rédaction Oui Psycho!')}</div>
        <div class="article-author__role">Rédacteur spécialisé en santé mentale</div>
      </div>
    </div>

    <div class="article-tags" aria-label="Mots-clés">
      ${(d.tags || []).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}
    </div>

    <div class="article-share" id="share-buttons" aria-label="Partager ce dossier">
      <span class="share-label">Partager :</span>
      <button class="share-btn share-btn--fb"   data-platform="facebook">Facebook</button>
      <button class="share-btn share-btn--tw"   data-platform="twitter">Twitter / X</button>
      <button class="share-btn share-btn--wa"   data-platform="whatsapp">WhatsApp</button>
      <button class="share-btn share-btn--copy" data-platform="copy">Copier le lien</button>
    </div>

    <aside class="article-disclaimer" role="note">
      ⚕️ <em>Ce dossier est fourni à titre <strong>informatif uniquement</strong> et ne remplace pas
      l'avis d'un professionnel de santé. En cas de détresse, appelez le
      <strong><a href="tel:3114">3114</a></strong> (24h/24, gratuit).</em>
    </aside>`;
}

/** Construit la table des matières dans la sidebar */
function buildDossierTOC(dossier) {
  const toc = document.getElementById('dossier-toc-widget');
  if (!toc || !dossier.chapters?.length) { if (toc) toc.style.display = 'none'; return; }

  const pageBase = window.location.href.split('#')[0];
  toc.innerHTML = `
    <h3 class="widget__title">Au sommaire</h3>
    <nav class="dossier-toc-list" aria-label="Chapitres du dossier">
      ${dossier.chapters.map(ch => `
        <a href="${pageBase}#chapitre-${esc(ch.id)}" class="dossier-toc-item">
          <span class="dossier-toc-item__num">${ch.number}</span>
          <span>${esc(ch.title)}</span>
        </a>`).join('')}
    </nav>`;
}

