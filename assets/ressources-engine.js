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

    // Étape 1 — roue des émotions cœur
    function stepRoue(container) {
      container.appendChild(progress('Étape 1/5 — Quelle est l’émotion la plus proche de ce que vous ressentez ?'));
      var svgNS = 'http://www.w3.org/2000/svg';
      var size = 320, cx = size / 2, cy = size / 2, r = size / 2 - 4;
      var svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
      svg.setAttribute('class', 'ressource-roue__svg');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Roue des émotions — cliquez un secteur pour continuer');

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
          state.emotion = emo;
          goTo(stepNuance);
        }
        path.addEventListener('click', select);
        path.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
        });
      });

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
