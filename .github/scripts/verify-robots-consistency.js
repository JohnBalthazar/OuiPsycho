// Vérifie que le robots meta de chaque page article correspond à sa date de
// publication, que les pages racine n'ont pas de contenu dupliqué, que
// date_modified n'est jamais antérieure à date, et que le rattachement des
// articles aux clusters thématiques (data/clusters.json) est cohérent.
// Détecte le type de régression qui a exposé 85 articles planifiés en
// "index, follow" et bloqué des articles publiés en "noindex" (août 2026).
// Usage : node .github/scripts/verify-robots-consistency.js
const fs   = require('fs');
const path = require('path');

const ROOT         = path.join(__dirname, '..', '..');
const DIR          = path.join(ROOT, 'articles');
const DOSSIER_DIR  = path.join(ROOT, 'dossiers');
const CLUSTERS_FILE = path.join(ROOT, 'data', 'clusters.json');
const TODAY = new Date().toISOString().split('T')[0];

const jsonFiles = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
const errors = [];
const articleById = {}; // rempli au fil de la boucle principale, réutilisé plus bas

// ── Clusters thématiques : intégrité de data/clusters.json ───────────────────
let clusters = [];
try { clusters = JSON.parse(fs.readFileSync(CLUSTERS_FILE, 'utf8')); } catch (e) {
  if (e.code !== 'ENOENT') errors.push(`data/clusters.json invalide (${e.message})`);
}

const clustersById = {};
const seenClusterIds = new Set();
for (const c of clusters) {
  if (seenClusterIds.has(c.id)) {
    errors.push(`data/clusters.json : slug de cluster "${c.id}" dupliqué`);
  }
  seenClusterIds.add(c.id);
  clustersById[c.id] = c;
}

// Un slug de cluster ne doit jamais coïncider avec un id d'article ou de dossier
// (les trois vivent potentiellement sous des URLs qui se ressemblent).
const articleIds = new Set(jsonFiles.map(f => path.basename(f, '.json')));
const dossierIds = fs.existsSync(DOSSIER_DIR)
  ? new Set(fs.readdirSync(DOSSIER_DIR).filter(f => f.endsWith('.json')).map(f => path.basename(f, '.json')))
  : new Set();
for (const id of seenClusterIds) {
  if (articleIds.has(id)) errors.push(`data/clusters.json : slug de cluster "${id}" identique à un id d'article`);
  if (dossierIds.has(id)) errors.push(`data/clusters.json : slug de cluster "${id}" identique à un slug de dossier`);
}

for (const file of jsonFiles) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  articleById[j.id] = j;

  // date_modified ne doit jamais précéder date (sinon "Mis à jour le" affiche une
  // date antérieure à "Publié le" — incident du 19/08/2026 sur argent-et-bonheur.json)
  if (j.date_modified && j.date_modified < j.date) {
    errors.push(`${j.id} : date_modified (${j.date_modified}) antérieure à date (${j.date})`);
  }

  // Rattachement cluster/étape : le cluster doit exister, et l'étape doit être
  // une des étapes déclarées pour ce cluster précis.
  if (j.cluster) {
    const cluster = clustersById[j.cluster];
    if (!cluster) {
      errors.push(`${j.id} : cluster "${j.cluster}" introuvable dans data/clusters.json`);
    } else if (!j.etape) {
      errors.push(`${j.id} : cluster "${j.cluster}" renseigné sans etape`);
    } else if (!cluster.etapes || !cluster.etapes[j.etape]) {
      errors.push(`${j.id} : etape "${j.etape}" invalide pour le cluster "${j.cluster}"`);
    }
  }

  if ((j.status || 'published') === 'draft') continue; // brouillons non concernés

  const htmlPath = path.join(DIR, j.id, 'index.html');
  if (!fs.existsSync(htmlPath)) continue; // pas encore généré

  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = html.match(/<meta name="robots" content="([^"]+)">/);
  const robots = m ? m[1] : null;
  const shouldBeIndexable = j.date <= TODAY;

  if (shouldBeIndexable && robots !== 'index, follow') {
    errors.push(`${j.id} : publié (date ${j.date}) mais robots="${robots}" — devrait être "index, follow"`);
  }
  if (!shouldBeIndexable && robots === 'index, follow') {
    errors.push(`${j.id} : planifié pour le ${j.date} (futur) mais robots="index, follow" — devrait être "noindex, nofollow"`);
  }

  // La page racine doit toujours être un simple stub de redirection, jamais une copie du contenu.
  const rootPath = path.join(ROOT, j.id, 'index.html');
  if (fs.existsSync(rootPath)) {
    const rootHtml = fs.readFileSync(rootPath, 'utf8');
    if (!rootHtml.includes('http-equiv="refresh"')) {
      errors.push(`${j.id} : la page racine ${j.id}/index.html n'est pas un stub de redirection (contenu dupliqué ?)`);
    }
  }
}

// ── data/articles-all.json : pas de fuite de contenu non publié ──────────────
// excerpt, metaDescription et hasImage y sont des champs DÉRIVÉS du JSON source
// (calculés par _gen_static.js — voir la même règle dans poulet.html,
// computeAdminIndexFields) : excerpt/metaDescription doivent rester masqués
// (chaîne vide) tant que l'article n'est pas public (draft, ou scheduled avec
// une date future), et hasImage doit refléter la présence réelle d'une image.
// Un chemin d'écriture qui recopie ces champs sans repasser par ce calcul (ex.
// un point d'entrée de poulet.html oublié) les fait diverger silencieusement —
// et peut faire fuiter le contenu éditorial d'un article non publié via ce
// fichier admin. Incident du 2026-09-06 (voir aussi pushAllToGitHub, saveArticle,
// publishImportedArticle dans poulet.html).
const ALL_INDEX_FILE = path.join(ROOT, 'data', 'articles-all.json');
let allIndex = [];
try { allIndex = JSON.parse(fs.readFileSync(ALL_INDEX_FILE, 'utf8')); } catch (e) {
  if (e.code !== 'ENOENT') errors.push(`data/articles-all.json invalide (${e.message})`);
}
for (const entry of allIndex) {
  const j = articleById[entry.id];
  if (!j) {
    errors.push(`data/articles-all.json : entrée "${entry.id}" sans fichier source articles/${entry.id}.json`);
    continue;
  }
  const isPublic = (j.status || 'published') === 'published' ||
                   (j.status === 'scheduled' && j.date <= TODAY);
  const expectedExcerpt = isPublic ? (j.excerpt || '') : '';
  const expectedMetaDescription = isPublic ? (j.metaDescription || '') : '';
  const expectedHasImage = !!(j.image && j.image.trim());

  if ((entry.excerpt || '') !== expectedExcerpt) {
    errors.push(`data/articles-all.json : "${entry.id}" excerpt ne correspond pas au JSON source (status=${j.status || 'published'}, date=${j.date}) — fuite possible de contenu non publié`);
  }
  if ((entry.metaDescription || '') !== expectedMetaDescription) {
    errors.push(`data/articles-all.json : "${entry.id}" metaDescription ne correspond pas au JSON source (status=${j.status || 'published'}, date=${j.date}) — fuite possible de contenu non publié`);
  }
  if (entry.hasImage !== expectedHasImage) {
    errors.push(`data/articles-all.json : "${entry.id}" hasImage=${JSON.stringify(entry.hasImage)} ne correspond pas à l'image source (attendu ${expectedHasImage})`);
  }
}

if (errors.length) {
  console.error(`❌ ${errors.length} incohérence(s) robots/date détectée(s) :\n`);
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log(`✅ Cohérence robots/date vérifiée sur ${jsonFiles.length} articles — aucune anomalie.`);
