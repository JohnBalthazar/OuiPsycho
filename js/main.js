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
          <time datetime="${esc(article.date || '')}">Mis à jour le ${formatDate(article.date)}</time>
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
          <time datetime="${esc(article.date || '')}">Mis à jour le ${formatDate(article.date)}</time>
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
        // Injecter l'image si ajoutée après la génération de la page statique
        injectArticleImage(article);
        // Section commentaires
        initComments(id);
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
    // Section commentaires
    initComments(id);

  } catch (_) {
    window.location.href = '404.html';
  }
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
        <time datetime="${esc(a.date || '')}">Mis à jour le ${formatDate(a.date)}</time>
        <span class="article-meta-dot">•</span>
        <span>⏱ ${a.readTime || 5} min de lecture</span>
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
              <div class="related-item__meta">Mis à jour le ${formatDate(a.date)}</div>
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

  // Première visite : affiche le bandeau
  banner.style.display = 'flex';

  document.getElementById('cookie-accept')?.addEventListener('click', () => {
    localStorage.setItem('pc_consent', '1');
    banner.style.display = 'none';
    updateGAConsent(true);  // ✅ Active le tracking GA
  });
  document.getElementById('cookie-decline')?.addEventListener('click', () => {
    localStorage.setItem('pc_consent', '0');
    banner.style.display = 'none';
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
    const res = await fetch('data/config.json?t=' + Date.now());
    if (!res.ok) return;
    const cfg = await res.json();
    if (cfg.firebaseProjectId) _fbProjectId = cfg.firebaseProjectId;
    if (cfg.firebaseApiKey)    _fbApiKey    = cfg.firebaseApiKey;
  } catch (_) {}
}

async function _fbFetchComments(articleId) {
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
      orderBy: [{ field: { fieldPath: 'created_at' }, direction: 'ASCENDING' }],
    },
  };
  const res = await fetch(`${_FBBASE()}:runQuery?key=${_fbApiKey}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(query),
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return rows.filter(r => r.document).map(r => _fbDoc(r.document));
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
  if (document.getElementById('articles-grid'))  initHome();
  if (document.getElementById('article-content')) initArticle();
});
