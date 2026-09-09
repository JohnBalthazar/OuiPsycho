/**
 * ressource-template.js — gabarits HTML des pages issues de ressources.json
 * (page individuelle /ressources/{slug}/, galerie /ressources/coloriages/,
 * hub /boussole/), source unique partagée par _gen_static.js (génération de
 * masse, Node) et poulet.html (tableau de bord Boussole, navigateur).
 *
 * Même raison d'être que js/article-template.js : éviter qu'une page
 * modifiée depuis poulet.html s'écarte silencieusement de ce que produit
 * _gen_static.js. Avant ce fichier, poulet.html écrivait ressources.json
 * mais ne régénérait jamais les pages qui en dérivent — un changement
 * d'image ou de visibilité restait invisible sur le site tant que
 * node _gen_static.js n'était pas relancé manuellement (incident du
 * 2026-09-08).
 *
 * Trois fonctions pures : aucun accès fichier, aucun appel réseau.
 *   - buildRessourceHTML(ressource)        → page /ressources/{slug}/
 *   - buildColoriagesGalerieHTML(coloriages) → galerie /ressources/coloriages/
 *     (coloriages : tableau déjà filtré par l'appelant — type "coloriage"
 *     ET visible !== false)
 *   - buildBoussoleHTML(ressources)        → hub /boussole/
 *     (ressources : le tableau COMPLET, filtré en interne — a besoin de
 *     voir tous les types à la fois pour construire thématiques/vitrine)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RessourceTemplate = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BASE = 'https://ouipsycho.fr';
  const YEAR = new Date().getFullYear();

  function escCard(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escLd(s) { return s.replace(/<\/script>/gi, '<\\/script>'); }
  function stripHtmlDesc(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const CATEGORY_ICONS = {
    'Bien-être': '🌿',
    'Troubles Psy': '🧠',
    'Émotions & identité': '💛',
    'Travail': '💼',
  };

  // Page individuelle /ressources/{slug}/ : bloc multi-lignes (repris tel
  // quel du gabarit d'origine). Galerie et hub utilisent la variante compacte
  // HEAD_CONSENT_COMPACT — deux styles distincts déjà présents avant cette
  // extraction, préservés à l'identique (vérifié par diff byte-à-byte).
  const HEAD_CONSENT_VERBOSE = `
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
  </script>`;

  const HEAD_CONSENT_COMPACT = `
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
  </script>`;

  const COOKIE_BANNER = (privacyHref) => `
  <div id="cookie-banner" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
    <div class="cookie-modal">
      <span class="cookie-emoji">🍪</span>
      <h2 id="cookie-title">Votre vie privée, votre choix</h2>
      <p class="cookie-text">Nous utilisons des cookies analytiques pour mieux comprendre votre navigation et vous proposer du contenu adapté sur Oui Psycho!</p>
      <a class="cookie-privacy-link" href="${privacyHref}">Politique de confidentialité</a>
      <button class="btn-cookie btn-cookie--accept" id="cookie-accept">✓&nbsp; Accepter et continuer</button>
      <button class="btn-cookie-decline" id="cookie-decline">Non merci, continuer sans accepter</button>
    </div>
  </div>`;

  function headerNav(prefix) {
    return `
  <header class="site-header" id="site-header">
    <div class="header-top">
      <a href="${prefix}index.html" class="logo" aria-label="Oui Psycho! — Accueil">
        <img src="${prefix}img/logo-brain.png" alt="" class="logo__img" width="40" height="40">
        <span>Oui Psycho!</span>
      </a>
      <button class="hamburger" id="hamburger" aria-label="Menu" aria-expanded="false" aria-controls="nav-menu">
        <span></span><span></span><span></span>
      </button>
      <nav class="header-nav" id="nav-menu" aria-label="Navigation principale">
        <a class="nav__link" href="${prefix}index.html">Accueil</a>
        <a class="nav__link" href="${prefix}nos-heros-sur-le-divan.html">🛋️ Nos héros</a>
        <a class="nav__link" href="${prefix}les-monstres-sur-le-divan.html">🖤 Les monstres</a>
        <a class="nav__link" href="${prefix}tests.html">🧪 Tests</a>
        <a class="nav__link" href="${prefix}boussole/">🧭 Outils</a>
        <a class="nav__link" href="${prefix}cartes.html">🗺️ Cartes</a>
        <a class="nav__link" href="${prefix}a-propos.html">Qui sommes-nous ?</a>
        <a class="nav__link nav__cta" href="${prefix}index.html#newsletter-widget">Newsletter</a>
      </nav>
    </div>
  </header>`;
  }

  function footerSite(prefix) {
    return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-disclaimer">
        ⚕️ <strong>Avertissement :</strong> Le contenu de ce site est fourni à titre informatif uniquement
        et ne remplace pas l'avis d'un professionnel de santé. En cas de détresse, appelez le
        <strong>3114</strong> (24h/24, gratuit).
      </div>
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="${prefix}index.html" class="logo">
            <span class="logo__icon" aria-hidden="true">🧠</span>
            <span>Oui Psycho!</span>
          </a>
          <p>Blog de vulgarisation dédié à la santé mentale. Rendre la psychologie accessible à tous, avec bienveillance et rigueur.</p>
        </div>
        <div class="footer-col">
          <h4>Thématiques</h4>
          <ul class="footer-links">
            <li><a href="${prefix}index.html?cat=Bien-%C3%AAtre">Bien-être</a></li>
            <li><a href="${prefix}index.html?cat=Sommeil">Sommeil</a></li>
            <li><a href="${prefix}index.html?cat=Troubles%20Psy">Troubles Psy</a></li>
            <li><a href="${prefix}index.html?cat=Th%C3%A9rapies">Thérapies</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>À propos</h4>
          <ul class="footer-links">
            <li><a href="${prefix}a-propos.html">Qui sommes-nous ?</a></li>
            <li><a href="${prefix}politique-de-confidentialite.html">Confidentialité</a></li>
            <li><a href="${prefix}mentions-legales.html">Mentions légales</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${YEAR} Oui Psycho!. Tous droits réservés.</span>
        <span>Fait avec ❤️ pour la santé mentale</span>
      </div>
    </div>
  </footer>`;
  }

  // Footer réduit (disclaimer + mentions légales seulement, pas de
  // footer-grid) — utilisé uniquement par la galerie coloriages dans le
  // gabarit d'origine, jamais par la page individuelle ni le hub.
  function footerSimple() {
    return `
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
  </footer>`;
  }

  // ── Page individuelle /ressources/{slug}/ ───────────────────────────────
  function buildRessourceHTML(ressource) {
    const { identite } = ressource;
    const slug = identite.slug;
    const resDataJson = escLd(JSON.stringify(ressource));
    const metaDesc = identite.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escCard(identite.titre)} — Oui Psycho!</title>
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
  <!-- Google Consent Mode v2 (RGPD/Europe) -->${HEAD_CONSENT_VERBOSE}
</head>
<body class="ressource-page">

  <div id="reading-progress" role="progressbar" aria-label="Progression de lecture" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
${headerNav('')}

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
${footerSite('')}
${COOKIE_BANNER('politique-de-confidentialite.html')}

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
  }

  // ── Galerie /ressources/coloriages/ ─────────────────────────────────────
  // "coloriages" est un slug réservé à ce niveau : un coloriage individuel
  // ne doit jamais prendre ce slug (collision avec cette page).
  function buildColoriagesGalerieHTML(coloriages) {
    const galerieDataJson = escLd(JSON.stringify(coloriages));
    const galerieMeta = `${coloriages.length} coloriage(s) à imprimer, classés par thème (anxiété, sommeil, se recentrer...), à colorier au calme ou avant un moment qui inquiète.`;

    return `<!DOCTYPE html>
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
  <link rel="stylesheet" href="css/style.css">${HEAD_CONSENT_COMPACT}
</head>
<body>
${headerNav('')}

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
${footerSimple()}
${COOKIE_BANNER('politique-de-confidentialite.html')}

  <script type="application/json" id="galerie-data">${galerieDataJson}</script>
  <script src="assets/ressources-engine.js"></script>
  <script>
    RessourcesEngine.renderGalerieColoriages(document.getElementById('galerie-mount'), JSON.parse(document.getElementById('galerie-data').textContent));
  </script>
  <script src="js/main.js"></script>
</body>
</html>
`;
  }

  // ── Hub /boussole/ (rubrique "Ma Boussole Intérieure") ──────────────────
  // Construit dynamiquement à partir de TOUTES les ressources (filtrées en
  // interne par visible !== false) : n'affiche que ce qui existe vraiment.
  // Pas de <base> : href="#bibliotheque" doit rester une ancre locale.
  function buildBoussoleHTML(ressources) {
    const visibles = ressources.filter(r => r.visible !== false);

    const boussoleCategories = [];
    visibles.forEach(r => {
      (r.maillage.categories || []).forEach(cat => {
        let entry = boussoleCategories.find(c => c.nom === cat);
        if (!entry) { entry = { nom: cat, count: 0 }; boussoleCategories.push(entry); }
        entry.count++;
      });
    });

    const coloriages = visibles.filter(r => r.type === 'coloriage');
    const roueEntries = visibles.filter(r => r.type === 'roue-emotions');
    const checklistEntries = visibles.filter(r => r.type === 'checklist');
    const boussoleTools = [];
    roueEntries.forEach(r => boussoleTools.push({ kind: 'roue', ressource: r }));
    checklistEntries.forEach(r => boussoleTools.push({ kind: 'checklist', ressource: r }));
    if (coloriages.length) boussoleTools.push({ kind: 'coloriages', count: coloriages.length });

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

    const navHeader = `
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
  </header>`;

    return `<!DOCTYPE html>
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
       ancre locale (même raison documentée sur theme/{slug}/ plus haut). -->${HEAD_CONSENT_COMPACT}
</head>
<body>
${navHeader}

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
${footerSite('../')}
${COOKIE_BANNER('../politique-de-confidentialite.html')}

  <script src="../js/main.js"></script>
</body>
</html>
`;
  }

  return { buildRessourceHTML, buildColoriagesGalerieHTML, buildBoussoleHTML };
});
