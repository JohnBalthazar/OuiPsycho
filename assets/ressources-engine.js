/**
 * ressources-engine.js — moteur de rendu client pour les entrées de
 * ressources.json (coloriage, roue-emotions, checklist). Distinct de
 * tool-engine.js : aucune notion d'item/réponse/score/palier ici, ces
 * contenus n'évaluent rien chez le lecteur. Calcul 100% client : aucun
 * appel réseau, aucun stockage. La page hôte fournit les données d'une
 * entrée unique et un point de montage ; ce fichier ne va jamais chercher
 * ressources.json lui-même.
 *
 * Usage : RessourcesEngine.render(mountEl, ressource)
 */
(function () {
  'use strict';

  function el(tag, className, html) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function notify() {
    if (typeof window.notifyResize === 'function') window.notifyResize();
  }

  // Réseaux de partage proposés sur une page coloriage — voir décision du
  // 2026-09-07 (Facebook, WhatsApp, Pinterest, X). Chaque href est un lien
  // d'intention de partage standard de la plateforme, pas d'appel API.
  function shareLinks(pageUrl, title, imgUrl) {
    var u = encodeURIComponent(pageUrl);
    var t = encodeURIComponent(title);
    var i = encodeURIComponent(imgUrl);
    return [
      { label: 'Facebook', cls: 'fb', href: 'https://www.facebook.com/sharer/sharer.php?u=' + u },
      { label: 'WhatsApp', cls: 'wa', href: 'https://api.whatsapp.com/send?text=' + t + '%20' + u },
      { label: 'Pinterest', cls: 'pin', href: 'https://www.pinterest.com/pin/create/button/?url=' + u + '&media=' + i + '&description=' + t },
      { label: 'X', cls: 'x', href: 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u }
    ];
  }

  function renderColoriage(mountEl, ressource) {
    mountEl.innerHTML = '';
    var wrap = el('div', 'ressource-coloriage');
    var img = el('img', 'ressource-coloriage__img');
    img.src = ressource.contenu.image;
    img.alt = ressource.identite.titre;
    img.loading = 'lazy';
    wrap.appendChild(img);

    var actions = el('div', 'ressource-coloriage__actions');
    var dl = el('a', 'tool-btn tool-btn--primary', '⬇️ Télécharger');
    dl.href = ressource.contenu.image;
    dl.setAttribute('download', '');
    dl.target = '_blank';
    dl.rel = 'noopener';
    actions.appendChild(dl);

    var printBtn = el('button', 'tool-btn tool-btn--ghost', '🖨️ Imprimer');
    printBtn.type = 'button';
    printBtn.addEventListener('click', function () { window.print(); });
    actions.appendChild(printBtn);
    wrap.appendChild(actions);

    // document.baseURI (pas window.location.href) : la page déclare <base
    // href="../../">, resoudre contre l'URL du document ignorerait ce <base>
    // et pointerait vers un chemin qui n'existe pas (ex. .../ressources/
    // <slug>/img/... au lieu de la racine du site).
    var imgAbsUrl;
    try { imgAbsUrl = new URL(ressource.contenu.image, document.baseURI).href; }
    catch (e) { imgAbsUrl = ressource.contenu.image; }

    var shareWrap = el('div', 'ressource-share');
    shareWrap.appendChild(el('span', 'ressource-share__label', 'Partager :'));
    shareLinks(window.location.href, ressource.identite.titre, imgAbsUrl).forEach(function (n) {
      var a = el('a', 'ressource-share__btn ressource-share__btn--' + n.cls, n.label);
      a.href = n.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      shareWrap.appendChild(a);
    });
    wrap.appendChild(shareWrap);

    mountEl.appendChild(wrap);
    notify();
  }

  // Galerie /ressources/coloriages/ : recherche texte (titre) + filtre par
  // thème (identite.themes), combinés en ET. Purement client, aucun état ne
  // survit au rechargement (pas de query string, pas de localStorage).
  function renderGalerieColoriages(mountEl, coloriages) {
    mountEl.innerHTML = '';
    var wrap = el('div', 'coloriage-galerie');

    var searchInput = el('input', 'coloriage-search');
    searchInput.type = 'search';
    searchInput.placeholder = 'Rechercher un coloriage…';
    searchInput.setAttribute('aria-label', 'Rechercher un coloriage par titre');
    wrap.appendChild(searchInput);

    var allThemes = [];
    coloriages.forEach(function (r) {
      (r.identite.themes || []).forEach(function (t) { if (allThemes.indexOf(t) === -1) allThemes.push(t); });
    });
    allThemes.sort(function (a, b) { return a.localeCompare(b, 'fr'); });

    var activeThemes = [];
    var filtersWrap = el('div', 'coloriage-filters');
    var chipEls = {};
    allThemes.forEach(function (theme) {
      var chip = el('button', 'coloriage-filter-chip', theme);
      chip.type = 'button';
      chip.addEventListener('click', function () {
        var i = activeThemes.indexOf(theme);
        if (i === -1) { activeThemes.push(theme); chip.classList.add('is-active'); }
        else { activeThemes.splice(i, 1); chip.classList.remove('is-active'); }
        applyFilters();
      });
      chipEls[theme] = chip;
      filtersWrap.appendChild(chip);
    });
    wrap.appendChild(filtersWrap);

    var grid = el('div', 'coloriage-grid');
    var cardEls = coloriages.map(function (r) {
      var card = el('a', 'coloriage-card');
      card.href = 'ressources/' + r.identite.slug + '/';
      var img = el('img', 'coloriage-card__img');
      img.src = r.contenu.image;
      img.alt = '';
      img.loading = 'lazy';
      card.appendChild(img);
      card.appendChild(el('span', 'coloriage-card__title', r.identite.titre));
      var themesEl = el('span', 'coloriage-card__themes');
      (r.identite.themes || []).forEach(function (t) {
        themesEl.appendChild(el('span', 'coloriage-card__theme', t));
      });
      card.appendChild(themesEl);
      grid.appendChild(card);
      return { el: card, titre: r.identite.titre.toLowerCase(), themes: r.identite.themes || [] };
    });
    wrap.appendChild(grid);

    var emptyMsg = el('p', 'coloriage-empty', 'Aucun coloriage ne correspond à votre recherche.');
    emptyMsg.style.display = 'none';
    wrap.appendChild(emptyMsg);

    function applyFilters() {
      var query = searchInput.value.trim().toLowerCase();
      var visibleCount = 0;
      cardEls.forEach(function (c) {
        var matchesText = !query || c.titre.indexOf(query) !== -1;
        var matchesThemes = activeThemes.length === 0 || activeThemes.every(function (t) { return c.themes.indexOf(t) !== -1; });
        var visible = matchesText && matchesThemes;
        c.el.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });
      emptyMsg.style.display = visibleCount === 0 ? '' : 'none';
      notify();
    }
    searchInput.addEventListener('input', applyFilters);

    mountEl.appendChild(wrap);
    notify();
  }

  // Roue en secteurs égaux (SVG) — un clic/Entrée sur un secteur affiche ses
  // nuances dans un panneau texte. Aucun état ne survit au rechargement.
  function renderRoueEmotions(mountEl, ressource) {
    mountEl.innerHTML = '';
    var wrap = el('div', 'ressource-roue');
    var emotions = ressource.contenu.emotions;
    var n = emotions.length;

    var svgNS = 'http://www.w3.org/2000/svg';
    var size = 320, cx = size / 2, cy = size / 2, r = size / 2 - 4;
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('class', 'ressource-roue__svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Roue des émotions — cliquez un secteur pour voir ses nuances');

    var detailBox = el('div', 'ressource-roue__detail');
    detailBox.setAttribute('aria-live', 'polite');

    function angleToPoint(angleDeg, radius) {
      var rad = (angleDeg - 90) * Math.PI / 180;
      return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
    }

    emotions.forEach(function (emo, i) {
      var startAngle = (360 / n) * i;
      var endAngle = (360 / n) * (i + 1);
      var p1 = angleToPoint(startAngle, r);
      var p2 = angleToPoint(endAngle, r);
      var largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
      var d = 'M ' + cx + ' ' + cy +
        ' L ' + p1[0] + ' ' + p1[1] +
        ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + p2[0] + ' ' + p2[1] + ' Z';

      var path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', emo.couleur);
      path.setAttribute('class', 'ressource-roue__secteur');
      path.setAttribute('tabindex', '0');
      path.setAttribute('role', 'button');
      path.setAttribute('aria-label', emo.nom);
      svg.appendChild(path);

      var midAngle = (startAngle + endAngle) / 2;
      var labelPt = angleToPoint(midAngle, r * 0.65);
      var label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', labelPt[0]);
      label.setAttribute('y', labelPt[1]);
      label.setAttribute('class', 'ressource-roue__label');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'middle');
      label.textContent = emo.nom;
      svg.appendChild(label);

      function select() {
        var secteurs = svg.querySelectorAll('.ressource-roue__secteur');
        for (var k = 0; k < secteurs.length; k++) secteurs[k].classList.remove('is-active');
        path.classList.add('is-active');
        var items = emo.nuances.map(function (nu) {
          return '<li><strong>' + nu.mot + '</strong> — ' + nu.definition + '</li>';
        }).join('');
        detailBox.innerHTML = '<h3>' + emo.nom + '</h3><ul>' + items + '</ul>';
        notify();
      }
      path.addEventListener('click', select);
      path.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
      });
    });

    wrap.appendChild(svg);
    detailBox.innerHTML = '<p class="ressource-roue__hint">Cliquez une émotion pour voir ses nuances.</p>';
    wrap.appendChild(detailBox);
    mountEl.appendChild(wrap);
    notify();
  }

  // Pas de sauvegarde de l'état coché : réinitialisée à chaque chargement,
  // par choix (voir ressources.json _format) — pas un oubli.
  function renderChecklist(mountEl, ressource) {
    mountEl.innerHTML = '';
    var wrap = el('div', 'ressource-checklist');
    var list = el('ul', 'ressource-checklist__list');
    var counter = el('p', 'ressource-checklist__counter');

    function updateCounter() {
      var total = ressource.contenu.items.length;
      var checked = list.querySelectorAll('input:checked').length;
      counter.textContent = checked + ' / ' + total + ' coché(s)';
    }

    ressource.contenu.items.forEach(function (texte, i) {
      var li = el('li', 'ressource-checklist__item');
      var id = 'cl-item-' + i;
      var input = el('input');
      input.type = 'checkbox';
      input.id = id;
      input.addEventListener('change', updateCounter);
      var label = el('label', null, texte);
      label.setAttribute('for', id);
      li.appendChild(input);
      li.appendChild(label);
      list.appendChild(li);
    });

    wrap.appendChild(list);
    wrap.appendChild(counter);
    updateCounter();
    mountEl.appendChild(wrap);
    notify();
  }

  function render(mountEl, ressource) {
    if (ressource.type === 'coloriage') return renderColoriage(mountEl, ressource);
    if (ressource.type === 'roue-emotions') return renderRoueEmotions(mountEl, ressource);
    if (ressource.type === 'checklist') return renderChecklist(mountEl, ressource);
    mountEl.innerHTML = '<p>Type de ressource inconnu.</p>';
  }

  window.RessourcesEngine = { render: render, renderGalerieColoriages: renderGalerieColoriages };
})();
