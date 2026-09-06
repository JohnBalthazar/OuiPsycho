/**
 * tool-engine.js — moteur de rendu client pour les entrées de tools.json.
 * Calcul 100% client : aucun appel réseau, aucun stockage (pas de
 * localStorage/sessionStorage/cookie). La page hôte fournit les données
 * d'une entrée unique (JSON.parse d'un <script type="application/json">
 * inline) et un point de montage ; ce fichier ne va jamais chercher
 * tools.json lui-même.
 *
 * Usage : ToolEngine.render(mountEl, outil)
 */
(function () {
  'use strict';

  var NOMBRES_LETTRES = {
    3: 'Trois', 4: 'Quatre', 5: 'Cinq', 6: 'Six', 7: 'Sept', 8: 'Huit',
    9: 'Neuf', 10: 'Dix', 11: 'Onze', 12: 'Douze', 13: 'Treize',
    14: 'Quatorze', 15: 'Quinze', 16: 'Seize', 17: 'Dix-sept',
    18: 'Dix-huit', 19: 'Dix-neuf', 20: 'Vingt'
  };

  function nombreEnLettres(n) {
    return NOMBRES_LETTRES[n] || String(n);
  }

  // Liste d'items → "« a », « b » et « c »" (convention française : "et"
  // devant le dernier, virgules ailleurs, un seul élément = pas de "et").
  function joindreItems(textes) {
    var cites = textes.map(function (t) { return '« ' + t + ' »'; });
    if (cites.length <= 1) return cites.join('');
    return cites.slice(0, -1).join(', ') + ' et ' + cites[cites.length - 1];
  }

  function notify() {
    if (typeof window.notifyResize === 'function') window.notifyResize();
  }

  // Fisher-Yates — copie mélangée, ne mute jamais le tableau d'origine.
  function melange(tableau) {
    var copie = tableau.slice();
    for (var i = copie.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copie[i]; copie[i] = copie[j]; copie[j] = tmp;
    }
    return copie;
  }

  function trackComplete(slug) {
    if (typeof gtag === 'function') {
      gtag('event', 'tool_complete', { tool_slug: slug });
    }
  }

  function render(mountEl, outil) {
    // Ordre des réponses : brassé à chaque chargement pour la famille
    // reperes-maison (contenu.ordreReponses === "aleatoire"), figé sinon —
    // l'ordre des items eux-mêmes n'est jamais concerné, seulement celui des
    // réponses à l'intérieur de chaque item. Copie locale : outil.contenu.items
    // (la donnée source embarquée dans la page) n'est jamais mutée.
    var brasser = outil.contenu.ordreReponses === 'aleatoire';
    var items = outil.contenu.items.map(function (item) {
      if (!brasser) return item;
      return { id: item.id, texte: item.texte, renvoiArticle: item.renvoiArticle, reponses: melange(item.reponses) };
    });

    // Deux mécaniques mutuellement exclusives (contenu.bareme XOR contenu.paliers
    // — voir tools.json _format) : mode (palier qualitatif, reperes-maison) ou
    // somme (score chiffré + tranche, echelle-validee).
    var paliersListe = outil.contenu.paliers ? outil.contenu.paliers.liste : null;
    var restitutionParPalier = {};
    if (outil.restitution.paliers) {
      outil.restitution.paliers.forEach(function (p) { restitutionParPalier[p.id] = p; });
    }
    var restitutionParTranche = {};
    if (outil.restitution.tranches) {
      outil.restitution.tranches.forEach(function (t) { restitutionParTranche[t.id] = t; });
    }

    // Options partagées (echelleReponse.nature === "libelles-generiques-partages")
    // quand un item ne porte pas ses propres reponses — voir tools.json _format.
    function optionsPour(item) {
      return item.reponses || outil.contenu.echelleReponse.options;
    }

    var idx = 0;
    var reponses = []; // { itemId, palier, points }

    function el(tag, className, html) {
      var e = document.createElement(tag);
      if (className) e.className = className;
      if (html !== undefined) e.innerHTML = html;
      return e;
    }

    function renderIntro() {
      mountEl.innerHTML = '';
      var wrap = el('div', 'tool-intro');
      var btn = el('button', 'tool-btn tool-btn--primary', 'Commencer →');
      btn.type = 'button';
      btn.addEventListener('click', function () { idx = 0; reponses = []; renderQuestion(); });
      var lead = outil.contenu.consigne || (String(items.length) + ' questions. Répondez spontanément.');
      wrap.appendChild(el('p', 'tool-intro__lead', lead));
      wrap.appendChild(btn);
      mountEl.appendChild(wrap);
      notify();
    }

    function renderQuestion() {
      var item = items[idx];
      mountEl.innerHTML = '';

      var wrap = el('div', 'tool-question-screen');

      var progress = el('div', 'tool-progress');
      var bar = el('span', null, '');
      bar.style.width = Math.round((idx / items.length) * 100) + '%';
      progress.appendChild(bar);
      wrap.appendChild(progress);

      wrap.appendChild(el('div', 'tool-step', 'Question ' + (idx + 1) + ' / ' + items.length));
      wrap.appendChild(el('div', 'tool-question', item.texte));

      var options = el('div', 'tool-options');
      optionsPour(item).forEach(function (r) {
        var b = el('button', 'tool-opt', r.texte);
        b.type = 'button';
        b.addEventListener('click', function () { answer(item.id, r); });
        options.appendChild(b);
      });
      wrap.appendChild(options);

      mountEl.appendChild(wrap);
      notify();
    }

    function answer(itemId, option) {
      reponses.push({ itemId: itemId, palier: option.palier, points: option.points });
      idx++;
      if (idx < items.length) {
        renderQuestion();
      } else {
        renderResult();
      }
    }

    // Palier majoritaire (mode). Égalité : le palier le plus loin dans
    // paliersListe l'emporte (convention de site — voir tools.json _format).
    function palierDominant() {
      var comptes = {};
      paliersListe.forEach(function (p) { comptes[p] = 0; });
      reponses.forEach(function (r) { comptes[r.palier]++; });
      var meilleur = paliersListe[0];
      paliersListe.forEach(function (p) {
        if (comptes[p] >= comptes[meilleur]) meilleur = p;
      });
      return meilleur;
    }

    // Score chiffré (echelle-validee) : somme des points des réponses, puis
    // tranche publiée dans contenu.bareme.tranches qui le contient.
    function scoreTotal() {
      return reponses.reduce(function (somme, r) { return somme + (r.points || 0); }, 0);
    }
    function trancheForScore(score) {
      var tranches = outil.contenu.bareme.tranches;
      for (var i = 0; i < tranches.length; i++) {
        if (score >= tranches[i].min && score <= tranches[i].max) return tranches[i];
      }
      return tranches[tranches.length - 1];
    }

    // Bloc complémentaire (axe "severite" uniquement) : nomme les items dont
    // la réponse tombe dans un palier déclencheur, même minoritaire face au
    // mode. Retourne null si l'outil n'a pas de complement, si aucun palier
    // ne déclenche, ou si le nombre d'items qualifiants est sous le seuil.
    function texteComplement() {
      var complement = outil.restitution.complement;
      if (!complement) return null;
      var declencheurs = complement.paliersDeclencheurs || [];
      if (!declencheurs.length) return null;

      var qualifiants = reponses.filter(function (r) {
        return declencheurs.indexOf(r.palier) !== -1;
      });
      if (qualifiants.length < complement.seuilItems) return null;

      var textesItems = qualifiants.map(function (r) {
        var item = items.filter(function (i) { return i.id === r.itemId; })[0];
        return item ? item.texte : '';
      });

      var gabaritKey = qualifiants.length === 1 ? 'un' : (qualifiants.length === 2 ? 'deux' : 'plusieurs');
      var gabarit = complement.gabarits[gabaritKey];
      var texte = gabarit.replace('{{items}}', joindreItems(textesItems));
      if (gabaritKey === 'plusieurs') {
        texte = texte.replace('{{nombre}}', nombreEnLettres(qualifiants.length));
      }
      return texte;
    }

    // Résultat "palier" (mode) : reperes-maison et assimilées.
    function renderResultPalier(wrap) {
      var palierId = palierDominant();
      var p = restitutionParPalier[palierId];

      var badge = el('div', 'tool-result__badge');
      badge.style.color = p.couleur;
      badge.style.background = p.couleur + '1a';
      badge.innerHTML = '<span class="tool-result__emoji">' + p.emoji + '</span><span>' + p.label + '</span>';
      wrap.appendChild(badge);

      wrap.appendChild(el('div', 'tool-result__desc', p.texte));

      if (outil.identite.axe === 'severite') {
        var complementTexte = texteComplement();
        if (complementTexte) {
          wrap.appendChild(el('div', 'tool-complement', complementTexte));
        }
      }
    }

    // Résultat "score" (somme) : echelle-validee. Affiche le score chiffré ET
    // la tranche — pas seulement un palier (voir tools.json _format /
    // rapport de tâche : le format ne savait faire que du palier avant PHQ-8).
    // complement n'existe pas pour cette famille (absent de restitution),
    // rien à appeler ici : le score fait le travail que complement faisait
    // ailleurs pour un résultat qualitatif.
    function renderResultScore(wrap) {
      var score = scoreTotal();
      var tranche = trancheForScore(score);
      var rt = restitutionParTranche[tranche.id];

      var badge = el('div', 'tool-result__badge');
      badge.style.color = rt.couleur;
      badge.style.background = rt.couleur + '1a';
      badge.innerHTML = '<span class="tool-result__emoji">' + rt.emoji + '</span><span>' + rt.label + '</span>';
      wrap.appendChild(badge);

      wrap.appendChild(el('div', 'tool-result__score', 'Score : ' + score + ' / ' + outil.contenu.bareme.echelle.max));
      wrap.appendChild(el('div', 'tool-result__desc', rt.texte));
    }

    function renderResult() {
      mountEl.innerHTML = '';
      var wrap = el('div', 'tool-result');

      if (outil.contenu.bareme) {
        renderResultScore(wrap);
      } else {
        renderResultPalier(wrap);
      }

      // Ressources : uniquement après le résultat, jamais avant ; rien si le
      // champ est vide ou absent — commun aux deux mécaniques.
      var ressources = outil.restitution.ressources;
      if (ressources && ressources.length) {
        var resBox = el('div', 'tool-resources');
        var items_ = ressources.map(function (r) {
          return '<li><strong>' + r.contact + '</strong> — ' + r.label + '</li>';
        }).join('');
        resBox.innerHTML = '<p>Si ce sujet touche quelque chose de plus lourd pour vous :</p><ul>' + items_ + '</ul>';
        wrap.appendChild(resBox);
      }

      var restart = el('button', 'tool-btn tool-btn--ghost', '↺ Recommencer');
      restart.type = 'button';
      restart.addEventListener('click', renderIntro);
      wrap.appendChild(restart);

      mountEl.appendChild(wrap);
      notify();
      trackComplete(outil.identite.slug);
    }

    renderIntro();
  }

  window.ToolEngine = { render: render };
})();
