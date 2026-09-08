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

  // Durée et déclencheur : options fixes de l'interface, pas du contenu
  // éditorial — volontairement codées ici plutôt que dans ressources.json
  // (voir ressources.json:_format).
  var ROUE_DUREES = [
    'Depuis quelques minutes',
    'Depuis ce matin',
    'Depuis hier',
    'Depuis plusieurs jours'
  ];
  var ROUE_DECLENCHEURS = [
    'Une personne',
    'Une situation précise',
    'Moi-même',
    'Je ne sais pas / difficile à dire'
  ];

  // Parcours en 5 étapes : émotion cœur (roue SVG) → nuance précise →
  // intensité (1-10, restituée telle quelle, jamais classée en palier) →
  // durée → déclencheur perçu → synthèse + 4 actions. Aucun état ne survit
  // au rechargement ; purement exploratoire, aucun score.
  function renderRoueEmotions(mountEl, ressource) {
    mountEl.innerHTML = '';
    var emotions = ressource.contenu.emotions;
    var n = emotions.length;
    var state = { emotion: null, nuance: null, intensite: 5, duree: null, declencheur: null };

    var wrap = el('div', 'ressource-roue');
    var stepBox = el('div', 'ressource-roue__step');
    wrap.appendChild(stepBox);
    mountEl.appendChild(wrap);

    function goTo(renderFn) {
      stepBox.innerHTML = '';
      renderFn(stepBox);
      notify();
    }

    function progress(labelText) {
      var p = el('p', 'ressource-roue__progress', labelText);
      return p;
    }

    // Éclaircit une couleur hex vers un pastel (mélange avec du blanc) sans
    // changer la teinte stockée dans ressources.json — la donnée reste la
    // couleur "pleine" de l'émotion, l'éclaircissement est un choix de rendu.
    function lightenHex(hex, amount) {
      var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!m) return hex;
      var mix = function (c) { return Math.round(parseInt(c, 16) + (255 - parseInt(c, 16)) * amount); };
      return 'rgb(' + mix(m[1]) + ',' + mix(m[2]) + ',' + mix(m[3]) + ')';
    }

    // Une icône simple (formes SVG basiques, pas de tracé complexe) par
    // émotion cœur — purement décoratif, la vraie information reste le
    // libellé texte ; construit dans le repère local (0,0) puis translaté.
    function emotionIconEls(svgNS, nom) {
      var els = [];
      function shape(tag, attrs) {
        var e = document.createElementNS(svgNS, tag);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        els.push(e);
        return e;
      }
      var STROKE = 'rgba(0,0,0,.55)';
      if (nom === 'Joie') {
        shape('circle', { cx: 0, cy: 0, r: 6, fill: STROKE });
        for (var a = 0; a < 360; a += 45) {
          var rad = a * Math.PI / 180;
          shape('line', {
            x1: 9 * Math.cos(rad), y1: 9 * Math.sin(rad),
            x2: 15 * Math.cos(rad), y2: 15 * Math.sin(rad),
            stroke: STROKE, 'stroke-width': 2, 'stroke-linecap': 'round'
          });
        }
      } else if (nom === 'Tristesse') {
        shape('polygon', { points: '0,-14 -7,-1 7,-1', fill: STROKE });
        shape('ellipse', { cx: 0, cy: 4, rx: 7, ry: 8, fill: STROKE });
      } else if (nom === 'Colère') {
        shape('path', { d: 'M0,14 L8,-6 A8,8 0 1,0 -8,-6 Z', fill: STROKE });
      } else if (nom === 'Peur') {
        shape('polygon', { points: '2,-14 -6,2 0,2 -3,14 7,-3 1,-3', fill: STROKE });
      } else if (nom === 'Surprise') {
        [0, 60, 120].forEach(function (rot) {
          shape('line', { x1: 0, y1: -13, x2: 0, y2: 13, stroke: STROKE, 'stroke-width': 2.5, 'stroke-linecap': 'round', transform: 'rotate(' + rot + ')' });
        });
      } else if (nom === 'Dégoût') {
        shape('path', { d: 'M-9,0 Q-4.5,8 0,0 Q4.5,-8 9,0', fill: 'none', stroke: STROKE, 'stroke-width': 2.5, 'stroke-linecap': 'round' });
      } else {
        shape('circle', { cx: 0, cy: 0, r: 8, fill: 'none', stroke: STROKE, 'stroke-width': 2 });
      }
      return els;
    }

    // Étape 1 — roue des émotions cœur, en anneau (donut) façon cadran :
    // couleurs pastel, icône + libellé par secteur, moyeu central avec repère
    // visuel — remplace l'ancienne roue pleine (camembert uni, sans icônes).
    function stepRoue(container) {
      container.appendChild(progress('Étape 1/5 — Quelle est l’émotion la plus proche de ce que vous ressentez ?'));
      var svgNS = 'http://www.w3.org/2000/svg';
      var size = 320, cx = size / 2, cy = size / 2, outerR = size / 2 - 34, innerR = outerR * 0.46;
      var svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
      svg.setAttribute('class', 'ressource-roue__svg');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Roue des émotions — cliquez un secteur pour continuer');

      function angleToPoint(angleDeg, radius) {
        var rad = (angleDeg - 90) * Math.PI / 180;
        return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
      }

      // Décalage de -30° : sans lui, les milieux de secteurs tombent pile à
      // l'est/l'ouest pour n=6, où icône et libellé (empilés le long du même
      // rayon) finissent côte à côte au lieu de l'un sous l'autre — collision
      // visuelle constatée à l'écran. Ce décalage évite tout angle de milieu
      // parfaitement horizontal.
      var angleOffset = -30;
      emotions.forEach(function (emo, i) {
        var startAngle = angleOffset + (360 / n) * i;
        var endAngle = angleOffset + (360 / n) * (i + 1);
        var po1 = angleToPoint(startAngle, outerR), po2 = angleToPoint(endAngle, outerR);
        var pi1 = angleToPoint(startAngle, innerR), pi2 = angleToPoint(endAngle, innerR);
        var largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
        var d = 'M ' + pi1[0] + ' ' + pi1[1] +
          ' L ' + po1[0] + ' ' + po1[1] +
          ' A ' + outerR + ' ' + outerR + ' 0 ' + largeArc + ' 1 ' + po2[0] + ' ' + po2[1] +
          ' L ' + pi2[0] + ' ' + pi2[1] +
          ' A ' + innerR + ' ' + innerR + ' 0 ' + largeArc + ' 0 ' + pi1[0] + ' ' + pi1[1] + ' Z';

        var group = document.createElementNS(svgNS, 'g');
        group.setAttribute('class', 'ressource-roue__segment');
        group.setAttribute('tabindex', '0');
        group.setAttribute('role', 'button');
        group.setAttribute('aria-label', emo.nom);

        var path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', lightenHex(emo.couleur, 0.62));
        path.setAttribute('class', 'ressource-roue__secteur');
        group.appendChild(path);

        var midAngle = (startAngle + endAngle) / 2;
        var iconPt = angleToPoint(midAngle, innerR + (outerR - innerR) * 0.38);
        var iconGroup = document.createElementNS(svgNS, 'g');
        iconGroup.setAttribute('transform', 'translate(' + iconPt[0] + ',' + iconPt[1] + ')');
        iconGroup.setAttribute('class', 'ressource-roue__icon');
        emotionIconEls(svgNS, emo.nom).forEach(function (elm) { iconGroup.appendChild(elm); });
        group.appendChild(iconGroup);

        var labelPt = angleToPoint(midAngle, innerR + (outerR - innerR) * 0.76);
        var label = document.createElementNS(svgNS, 'text');
        label.setAttribute('x', labelPt[0]);
        label.setAttribute('y', labelPt[1]);
        label.setAttribute('class', 'ressource-roue__label');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.textContent = emo.nom;
        group.appendChild(label);

        function select() {
          state.emotion = emo;
          goTo(stepNuance);
        }
        group.addEventListener('click', select);
        group.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
        });
        svg.appendChild(group);
      });

      var hub = document.createElementNS(svgNS, 'g');
      hub.setAttribute('class', 'ressource-roue__hub');
      hub.setAttribute('aria-hidden', 'true');
      var hubCircle = document.createElementNS(svgNS, 'circle');
      hubCircle.setAttribute('cx', cx); hubCircle.setAttribute('cy', cy); hubCircle.setAttribute('r', innerR - 5);
      hub.appendChild(hubCircle);
      var hubIcon = document.createElementNS(svgNS, 'text');
      hubIcon.setAttribute('x', cx); hubIcon.setAttribute('y', cy - 8);
      hubIcon.setAttribute('class', 'ressource-roue__hub-icon');
      hubIcon.setAttribute('text-anchor', 'middle');
      hubIcon.textContent = '🧭';
      hub.appendChild(hubIcon);
      var hubText = document.createElementNS(svgNS, 'text');
      hubText.setAttribute('x', cx); hubText.setAttribute('y', cy + 16);
      hubText.setAttribute('class', 'ressource-roue__hub-text');
      hubText.setAttribute('text-anchor', 'middle');
      var hubLine1 = document.createElementNS(svgNS, 'tspan');
      hubLine1.setAttribute('x', cx); hubLine1.setAttribute('dy', 0);
      hubLine1.textContent = 'Choisissez';
      var hubLine2 = document.createElementNS(svgNS, 'tspan');
      hubLine2.setAttribute('x', cx); hubLine2.setAttribute('dy', 14);
      hubLine2.textContent = 'une émotion';
      hubText.appendChild(hubLine1); hubText.appendChild(hubLine2);
      hub.appendChild(hubText);
      svg.appendChild(hub);

      container.appendChild(svg);
    }

    // Étape 2 — nuance précise au sein de l'émotion cœur choisie
    function stepNuance(container) {
      container.appendChild(progress('Étape 2/5 — Et plus précisément ?'));
      var list = el('div', 'ressource-roue__nuances');
      state.emotion.nuances.forEach(function (nu) {
        var btn = el('button', 'ressource-roue__nuance-btn');
        btn.type = 'button';
        btn.innerHTML = '<strong>' + nu.mot + '</strong><span>' + nu.definition + '</span>';
        btn.addEventListener('click', function () {
          state.nuance = nu;
          goTo(stepIntensite);
        });
        list.appendChild(btn);
      });
      container.appendChild(list);
      container.appendChild(backLink(container, stepRoue));
    }

    // Étape 3 — intensité 1-10, restituée telle quelle (jamais de palier)
    function stepIntensite(container) {
      container.appendChild(progress('Étape 3/5 — À quel point, sur 10 ?'));
      var valueEl = el('p', 'ressource-roue__intensite-value', String(state.intensite) + ' / 10');
      var slider = el('input');
      slider.type = 'range';
      slider.min = '1'; slider.max = '10'; slider.value = String(state.intensite);
      slider.className = 'ressource-roue__slider';
      slider.setAttribute('aria-label', 'Intensité ressentie, de 1 à 10');
      slider.addEventListener('input', function () {
        state.intensite = Number(slider.value);
        valueEl.textContent = state.intensite + ' / 10';
      });
      var scale = el('div', 'ressource-roue__scale');
      scale.appendChild(el('span', null, 'léger'));
      scale.appendChild(el('span', null, 'très intense'));

      var nextBtn = el('button', 'tool-btn tool-btn--primary', 'Continuer →');
      nextBtn.type = 'button';
      nextBtn.addEventListener('click', function () { goTo(stepDuree); });

      container.appendChild(valueEl);
      container.appendChild(slider);
      container.appendChild(scale);
      container.appendChild(nextBtn);
      container.appendChild(backLink(container, stepNuance));
    }

    // Étape 4 — depuis quand
    function stepDuree(container) {
      container.appendChild(progress('Étape 4/5 — Depuis quand ?'));
      container.appendChild(choiceChips(ROUE_DUREES, function (val) {
        state.duree = val;
        goTo(stepDeclencheur);
      }));
      container.appendChild(backLink(container, stepIntensite));
    }

    // Étape 5 — déclencheur perçu (optionnel)
    function stepDeclencheur(container) {
      container.appendChild(progress('Étape 5/5 — D’où ça vient, si vous le savez ?'));
      container.appendChild(choiceChips(ROUE_DECLENCHEURS, function (val) {
        state.declencheur = val;
        goTo(stepSynthese);
      }));
      container.appendChild(backLink(container, stepDuree));
    }

    // Synthèse — récapitulatif neutre + 4 actions de suite
    function stepSynthese(container) {
      var recap = el('div', 'ressource-roue__recap');
      recap.innerHTML =
        '<h3>' + state.nuance.mot + '</h3>' +
        '<p class="ressource-roue__recap-sub">Nuance de ' + state.emotion.nom + '</p>' +
        '<ul>' +
          '<li>Intensité restituée : <strong>' + state.intensite + ' / 10</strong></li>' +
          '<li>' + state.duree + '</li>' +
          '<li>Origine perçue : ' + state.declencheur + '</li>' +
        '</ul>';
      container.appendChild(recap);

      var actions = el('div', 'ressource-roue__actions');
      var detail = el('div', 'ressource-roue__detail');
      detail.setAttribute('aria-live', 'polite');

      function actionBtn(label, onClick) {
        var b = el('button', 'ressource-roue__action-btn', label);
        b.type = 'button';
        b.addEventListener('click', onClick);
        return b;
      }

      actions.appendChild(actionBtn('🔍 Comprendre cette émotion', function () {
        detail.innerHTML = '<p>' + state.nuance.mot + ' — ' + state.nuance.definition + '</p>';
        notify();
      }));
      actions.appendChild(actionBtn('💬 Explorer le besoin derrière', function () {
        detail.innerHTML = '<p>' + (state.nuance.besoin || 'Ce que ce ressenti cherche peut-être à vous dire mérite un moment d’attention.') + '</p>';
        notify();
      }));
      actions.appendChild(actionBtn('🌬️ Faire redescendre l’intensité', function () {
        detail.innerHTML = '<p>Une respiration lente peut aider à faire retomber la tension&nbsp;: inspirez 4 secondes, retenez 2 secondes, expirez 6 secondes. Répétez quelques fois, en portant votre attention sur l’air qui sort plutôt que sur ce qui vous a contrarié.</p>';
        notify();
      }));
      var articleLink = el('a', 'ressource-roue__action-btn', '📖 Lire un article lié');
      articleLink.href = 'theme/emotions/';
      actions.appendChild(articleLink);

      container.appendChild(actions);
      container.appendChild(detail);

      var restart = el('button', 'tool-btn tool-btn--ghost', '↺ Recommencer');
      restart.type = 'button';
      restart.addEventListener('click', function () {
        state = { emotion: null, nuance: null, intensite: 5, duree: null, declencheur: null };
        goTo(stepRoue);
      });
      container.appendChild(restart);
    }

    function choiceChips(options, onPick) {
      var box = el('div', 'ressource-roue__chips');
      options.forEach(function (opt) {
        var chip = el('button', 'ressource-roue__chip', opt);
        chip.type = 'button';
        chip.addEventListener('click', function () { onPick(opt); });
        box.appendChild(chip);
      });
      return box;
    }

    function backLink(container, prevStep) {
      var a = el('button', 'ressource-roue__back', '← Revenir en arrière');
      a.type = 'button';
      a.addEventListener('click', function () { goTo(prevStep); });
      return a;
    }

    goTo(stepRoue);
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
