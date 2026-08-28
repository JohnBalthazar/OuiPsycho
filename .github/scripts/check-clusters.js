// Script de contrôle du maillage thématique (clusters) — appelé par
// auto-publish.yml et deploy-pages.yml juste après verify-robots-consistency.js.
// Vérifie la sortie générée par _gen_static.js (articles/*/index.html,
// theme/*/index.html) à partir de la vérité terrain (articles/*.json,
// data/clusters.json), pas juste la logique du générateur — donc capable de
// détecter une régression même si _gen_static.js lui-même est modifié plus
// tard. Tolère l'absence de data/clusters.json et l'absence de tout cluster
// (aucun check spécifique à un cluster ne s'exécute alors, sans planter).
// Usage : node .github/scripts/check-clusters.js
const fs   = require('fs');
const path = require('path');

const ROOT           = path.join(__dirname, '..', '..');
const ARTICLES_DIR   = path.join(ROOT, 'articles');
const THEME_DIR      = path.join(ROOT, 'theme');
const CLUSTERS_FILE  = path.join(ROOT, 'data', 'clusters.json');
const SITEMAP_FILE   = path.join(ROOT, 'sitemap.xml');
const BASE           = 'https://ouipsycho.fr';
const TODAY          = new Date().toISOString().split('T')[0];

const checks = []; // { name, ok, detail }
function report(name, ok, detail) {
  checks.push({ name, ok, detail: detail || '' });
}

// ── Vérité terrain ────────────────────────────────────────────────────────
// data/clusters.json absent (aucun cluster défini pour l'instant) → liste
// vide, pas une erreur. Présent mais invalide → échec explicite (pas un
// crash silencieux ni un exit code trompeur).
let clusters = [];
try {
  clusters = JSON.parse(fs.readFileSync(CLUSTERS_FILE, 'utf8'));
} catch (e) {
  if (e.code !== 'ENOENT') {
    console.error(`❌ data/clusters.json invalide : ${e.message}`);
    process.exit(1);
  }
}

const jsonFiles = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.json'));
const articles  = jsonFiles.map(f => JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf8')));
const byId      = Object.fromEntries(articles.map(a => [a.id, a]));

const isPublishedStrict = a => (a.status || 'published') === 'published' && a.date <= TODAY;
const isLive            = a => (a.status || 'published') !== 'draft' && a.date <= TODAY; // règle utilisée par le fil de parcours / widget / bloc de fin

function readPage(p) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function articleHtmlPath(id)    { return path.join(ARTICLES_DIR, id, 'index.html'); }
function hubHtmlPath(clusterId) { return path.join(THEME_DIR, clusterId, 'index.html'); }
function fileExistsOnDisk(relFromRoot) { return fs.existsSync(path.join(ROOT, relFromRoot)); }

function extractBlock(html, openTagRegex) {
  const m = html.match(openTagRegex);
  if (!m) return null;
  // capture jusqu'à la fermeture de la balise englobante correspondante (nav/div)
  // — suffisant ici car ces blocs ne contiennent pas de sous-balise du même type imbriquée.
  const tag = m[0].startsWith('<nav') ? 'nav' : 'div';
  const closeTag = `</${tag}>`;
  const start = m.index;
  const closeIdx = html.indexOf(closeTag, start);
  return closeIdx === -1 ? null : html.slice(start, closeIdx + closeTag.length);
}

function extractHrefs(htmlFragment) {
  if (!htmlFragment) return [];
  return [...htmlFragment.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
}

// Résout un href root-relative (site généré avec <base href="../../"> sur les
// pages à un niveau de profondeur) vers un chemin de fichier + un id d'ancre.
function resolveInternalHref(href) {
  if (/^https?:\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')) return null;
  const [pathPart, anchor] = href.split('#');
  return { pathPart, anchor: anchor || null };
}

/* ════════════════════════════════════════════════════════════════════════
   Checks spécifiques à UN cluster (1 à 5 + la partie hub de 8) — exécutés
   pour chaque cluster présent dans data/clusters.json. Si la liste est
   vide, cette section ne produit simplement aucun check.
   ════════════════════════════════════════════════════════════════════════ */
for (const cluster of clusters) {
  const clusterId  = cluster.id;
  const stageOrder = Object.keys(cluster.etapes || {});
  const tag = `[${clusterId}]`;

  // Membres du cluster par étape, recalculés indépendamment du générateur.
  const liveMembers      = {}; // étape -> [article] — règle "en ligne" (fil de parcours / widget / bloc de fin)
  const publishedMembers = {}; // étape -> [article] — règle stricte (hub)
  for (const a of articles) {
    if (a.cluster !== clusterId || !a.etape || !cluster.etapes[a.etape]) continue;
    if (isLive(a))            (liveMembers[a.etape]      ??= []).push(a);
    if (isPublishedStrict(a)) (publishedMembers[a.etape] ??= []).push(a);
  }
  const publishedClusterArticles = articles.filter(a => a.cluster === clusterId && isPublishedStrict(a));

  // 1. Aucun lien interne (dans nos composants) pointant vers une page inexistante
  (function checkNoBrokenLinks() {
    const broken = [];
    for (const a of publishedClusterArticles) {
      const html = readPage(articleHtmlPath(a.id));
      if (!html) { broken.push(`${a.id} : page HTML introuvable`); continue; }
      const trail   = extractBlock(html, /<nav class="cluster-trail"/);
      const widget  = extractBlock(html, /<div class="widget-links">/);
      const continu = extractBlock(html, /<div class="article-continue">/);
      for (const frag of [trail, widget, continu]) {
        for (const href of extractHrefs(frag)) {
          const r = resolveInternalHref(href);
          if (!r) continue;
          if (r.pathPart.startsWith('theme/')) {
            const slug = r.pathPart.replace(/^theme\//, '').replace(/\/$/, '');
            if (!fileExistsOnDisk(path.join('theme', slug, 'index.html'))) broken.push(`${a.id} → ${href} (page hub introuvable)`);
            else if (r.anchor) {
              const hubHtml = readPage(hubHtmlPath(slug));
              if (!hubHtml || !hubHtml.includes(`id="${r.anchor}"`)) broken.push(`${a.id} → ${href} (ancre #${r.anchor} absente du hub)`);
            }
          } else if (r.pathPart.startsWith('articles/')) {
            const id = r.pathPart.replace(/^articles\//, '').replace(/\/$/, '');
            if (!fileExistsOnDisk(path.join('articles', id, 'index.html'))) broken.push(`${a.id} → ${href} (article introuvable)`);
          }
        }
      }
    }

    const hubHtml = readPage(hubHtmlPath(clusterId));
    if (hubHtml) {
      for (const href of extractHrefs(hubHtml).filter(h => h.startsWith('articles/'))) {
        const id = href.replace(/^articles\//, '').replace(/\/$/, '');
        if (!fileExistsOnDisk(path.join('articles', id, 'index.html'))) broken.push(`hub → ${href} (article introuvable)`);
      }
    } else if (publishedClusterArticles.length) {
      // Une page hub est attendue dès qu'au moins un article du cluster est publié.
      broken.push('page hub introuvable sur le disque');
    }

    report(`1. Aucun lien interne mort ${tag}`, broken.length === 0, broken.join(' | '));
  })();

  // 2. Aucune étape vide affichée (hub + fil de parcours)
  (function checkNoEmptyStages() {
    const problems = [];
    const hubHtml = readPage(hubHtmlPath(clusterId));

    if (hubHtml) {
      for (const s of stageOrder) {
        const sectionMatch = hubHtml.match(new RegExp(`<section class="theme-stage" id="etape-${s}"[\\s\\S]*?</section>`));
        const hasPublished = publishedMembers[s] && publishedMembers[s].length > 0;
        if (sectionMatch && !hasPublished) problems.push(`hub : section etape-${s} affichée sans article publié`);
        if (sectionMatch && !sectionMatch[0].includes('class="card"')) problems.push(`hub : section etape-${s} affichée mais sans aucune card`);
        if (!sectionMatch && hasPublished) problems.push(`hub : section etape-${s} absente alors qu'un article publié existe`);
      }
    }

    for (const a of publishedClusterArticles) {
      const html = readPage(articleHtmlPath(a.id));
      const trail = html && extractBlock(html, /<nav class="cluster-trail"/);
      if (!trail) continue;
      for (const s of stageOrder) {
        const label = cluster.etapes[s];
        const shown = trail.includes(`>${label}<`);
        const hasLive = liveMembers[s] && liveMembers[s].length > 0;
        if (shown && !hasLive) problems.push(`${a.id} : fil de parcours affiche "${label}" sans article en ligne`);
        if (!shown && hasLive) problems.push(`${a.id} : fil de parcours n'affiche pas "${label}" alors qu'un article en ligne existe`);
      }
    }

    report(`2. Aucune étape vide affichée ${tag}`, problems.length === 0, problems.join(' | '));
  })();

  // 3. Aucun lien vers un article scheduled (hub / Pour continuer)
  (function checkNoScheduledLinks() {
    const problems = [];

    function checkArticleLinks(frag, sourceLabel) {
      for (const href of extractHrefs(frag).filter(h => h.startsWith('articles/'))) {
        const id = href.replace(/^articles\//, '').replace(/\/$/, '');
        const target = byId[id];
        if (!target) continue; // déjà signalé par le check des liens morts
        if ((target.status || 'published') === 'scheduled' || target.date > TODAY) {
          problems.push(`${sourceLabel} → ${id} (status=${target.status || 'published'}, date=${target.date})`);
        }
      }
    }

    const hubHtml = readPage(hubHtmlPath(clusterId));
    if (hubHtml) checkArticleLinks(hubHtml, 'hub');

    for (const a of publishedClusterArticles) {
      const html = readPage(articleHtmlPath(a.id));
      if (!html) continue;
      const continu = extractBlock(html, /<div class="article-continue">/);
      checkArticleLinks(continu, `${a.id} (Pour continuer)`);
      // Le fil de parcours ne pointe jamais vers un article scheduled : soit
      // l'ancre du hub, soit (étape à 1 seul article) l'article lui-même —
      // qui est alors forcément "en ligne" pour apparaître dans le fil.
    }

    report(`3. Aucun lien vers un article scheduled ${tag}`, problems.length === 0, problems.join(' | '));
  })();

  // 4. Chaque article publié du cluster a son lien montant vers le hub
  (function checkUpwardLinkToHub() {
    const missing = [];
    const hubHref = `theme/${clusterId}/`;
    for (const a of publishedClusterArticles) {
      const html = readPage(articleHtmlPath(a.id));
      if (!html || !html.includes(`href="${hubHref}"`)) missing.push(a.id);
    }
    report(`4. Lien montant vers le hub présent ${tag}`, missing.length === 0, missing.join(', '));
  })();

  // 5. JSON-LD BreadcrumbList présent et valide sur les articles publiés du cluster
  (function checkBreadcrumbJsonLd() {
    const problems = [];
    for (const a of publishedClusterArticles) {
      const html = readPage(articleHtmlPath(a.id));
      if (!html) { problems.push(`${a.id} : page introuvable`); continue; }
      const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]);
      let bcObj = null;
      for (const s of scripts) {
        try { const parsed = JSON.parse(s); if (parsed['@type'] === 'BreadcrumbList') { bcObj = parsed; break; } }
        catch (e) { problems.push(`${a.id} : bloc JSON-LD invalide (${e.message})`); }
      }
      if (!bcObj) { problems.push(`${a.id} : BreadcrumbList absent`); continue; }
      const items = bcObj.itemListElement || [];
      if (items.length !== 3) { problems.push(`${a.id} : BreadcrumbList à ${items.length} niveaux (3 attendus)`); continue; }
      const lvl2 = items[1];
      if (lvl2.name !== cluster.title || lvl2.item !== `${BASE}/theme/${clusterId}/`) {
        problems.push(`${a.id} : niveau 2 incorrect (name="${lvl2.name}", item="${lvl2.item}")`);
      }
    }
    report(`5. BreadcrumbList JSON-LD valide ${tag}`, problems.length === 0, problems.join(' | '));
  })();
}

if (clusters.length === 0) {
  report('1-5. Checks par cluster', true, 'aucun cluster défini dans data/clusters.json — rien à vérifier');
}

/* ════════════════════════════════════════════════════════════════════════
   6. Aucun article publié hors cluster n'affiche fil de parcours / Pour continuer
   7. Widget #related-articles reste un shell vide hors cluster
   (Globaux : s'exécutent même si aucun cluster n'existe — dans ce cas, tous
   les articles sont "hors cluster" par définition et doivent rester intacts.)
   ════════════════════════════════════════════════════════════════════════ */
(function checkNonClusterUntouched() {
  const leakTrail = [];
  const leakContinue = [];
  const leakWidget = [];
  const nonClusterPublished = articles.filter(a => !a.cluster && isPublishedStrict(a));

  for (const a of nonClusterPublished) {
    const html = readPage(articleHtmlPath(a.id));
    if (!html) continue; // pas encore généré (rare, hors périmètre)
    if (html.includes('class="cluster-trail"'))    leakTrail.push(a.id);
    if (html.includes('class="article-continue"')) leakContinue.push(a.id);

    const widgetBlock = extractBlock(html, /<div class="widget" id="related-articles">/);
    const expected = '<h2 class="widget__title">À lire aussi</h2>';
    if (!widgetBlock || widgetBlock.replace(/\s+/g, ' ').indexOf(expected) === -1 || widgetBlock.includes('widget-links')) {
      leakWidget.push(a.id);
    }
  }

  report('6. Pas de fil de parcours / Pour continuer hors cluster', leakTrail.length === 0 && leakContinue.length === 0,
    [...leakTrail.map(i => `${i} (trail)`), ...leakContinue.map(i => `${i} (continue)`)].join(', '));
  report('7. Widget #related-articles = shell vide hors cluster', leakWidget.length === 0, leakWidget.join(', '));
})();

/* ════════════════════════════════════════════════════════════════════════
   8. Sitemap : chaque hub de cluster y figure, aucun scheduled n'y a été ajouté
   (La partie "aucun scheduled" est globale, indépendante des clusters.)
   ════════════════════════════════════════════════════════════════════════ */
(function checkSitemap() {
  const xml = readPage(SITEMAP_FILE);
  if (!xml) { report('8. Sitemap cohérent', false, 'sitemap.xml introuvable'); return; }

  const problems = [];
  for (const cluster of clusters) {
    if (!fileExistsOnDisk(path.join('theme', cluster.id, 'index.html'))) continue; // pas de hub généré, rien à exiger dans le sitemap
    if (!xml.includes(`<loc>${BASE}/theme/${cluster.id}/</loc>`)) problems.push(`hub ${cluster.id} absent du sitemap`);
  }

  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  for (const loc of locs) {
    const m = loc.match(/^https:\/\/ouipsycho\.fr\/articles\/([^/]+)\/$/);
    if (!m) continue;
    const target = byId[m[1]];
    if (target && ((target.status || 'published') === 'scheduled' || target.date > TODAY)) {
      problems.push(`${m[1]} (status=${target.status}, date=${target.date}) présent dans le sitemap`);
    }
  }

  report('8. Sitemap cohérent (hub(s) présent(s), rien de scheduled)', problems.length === 0, problems.join(' | '));
})();

/* ── Rapport ─────────────────────────────────────────────────────────────── */
let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? '✅' : '❌'} ${c.name}${c.ok ? '' : '\n   ' + c.detail}`);
  if (!c.ok) failed++;
}
console.log(`\n${failed === 0 ? '✅' : '❌'} ${checks.length - failed}/${checks.length} contrôles passés.`);
process.exit(failed === 0 ? 0 : 1);
