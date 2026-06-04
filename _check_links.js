/**
 * _check_links.js — Audit complet des liens internes + externes
 * Usage : node _check_links.js
 */
const fs   = require('fs');
const path = require('path');
const http  = require('http');
const https = require('https');

const ROOT = __dirname;

// ─── Collecte tous les HTML ──────────────────────────────────────────────────
function allHtml() {
  const r = [];
  for (const f of fs.readdirSync(ROOT)) {
    if (f.endsWith('.html')) r.push({ file: f, abs: path.join(ROOT, f) });
  }
  const artDir = path.join(ROOT, 'articles');
  for (const f of fs.readdirSync(artDir)) {
    if (f.endsWith('.html')) r.push({ file: `articles/${f}`, abs: path.join(artDir, f) });
  }
  return r;
}

// ─── Extrait les href avec numéro de ligne ───────────────────────────────────
function extractLinks(absPath, relFile) {
  const lines = fs.readFileSync(absPath, 'utf8').split('\n');
  const links = [];
  const re = /href="([^"]+)"/g;
  lines.forEach((line, i) => {
    let m;
    while ((m = re.exec(line)) !== null) {
      const href = m[1];
      // Ignore ancres pures, mailto, tel, javascript
      if (href.startsWith('#') || href.startsWith('mailto:') ||
          href.startsWith('tel:') || href.startsWith('javascript:')) continue;
      links.push({ href, line: i + 1, file: relFile });
    }
  });
  return links;
}

// ─── Résolution d'un lien interne ────────────────────────────────────────────
function resolveInternal(href, sourceFile) {
  if (href.startsWith('http')) return null;          // externe
  if (href.startsWith('/')) {
    // Absolu depuis la racine
    return path.join(ROOT, href.replace(/^\//, ''));
  }
  // Relatif au fichier source
  const dir = path.dirname(path.join(ROOT, sourceFile));
  return path.resolve(dir, href.split('?')[0].split('#')[0]);
}

// ─── Vérifie un lien externe (HEAD) ─────────────────────────────────────────
function checkExternal(url) {
  return new Promise(resolve => {
    try {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request(
        { method: 'HEAD', hostname: u.hostname, path: u.pathname + u.search,
          headers: { 'User-Agent': 'Mozilla/5.0 (link-checker)' }, timeout: 8000 },
        res => resolve({ url, status: res.statusCode })
      );
      req.on('error', e => resolve({ url, status: 'ERR', err: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ url, status: 'TIMEOUT' }); });
      req.end();
    } catch(e) {
      resolve({ url, status: 'INVALID', err: e.message });
    }
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const pages = allHtml();
  const allLinks = [];
  for (const { file, abs } of pages) {
    allLinks.push(...extractLinks(abs, file));
  }

  console.log(`\n📂 ${pages.length} fichiers HTML, ${allLinks.length} liens extraits\n`);

  // ── Liens internes ──────────────────────────────────────────────────────────
  const internalBroken = [];
  const seenInternal = new Set();
  for (const { href, line, file } of allLinks) {
    if (href.startsWith('http')) continue;
    const resolved = resolveInternal(href, file);
    if (!resolved) continue;
    const key = resolved;
    if (seenInternal.has(key)) continue;
    seenInternal.add(key);
    if (!fs.existsSync(resolved)) {
      internalBroken.push({ href, file, line, resolved });
    }
  }

  if (internalBroken.length === 0) {
    console.log('✅ Liens internes : aucun cassé\n');
  } else {
    console.log(`❌ LIENS INTERNES CASSÉS (${internalBroken.length}) :`);
    for (const b of internalBroken) {
      console.log(`   ${b.file}:${b.line}  →  ${b.href}`);
    }
    console.log('');
  }

  // ── Liens externes ──────────────────────────────────────────────────────────
  const extLinks = [];
  const seenExt = new Map(); // url → first occurrence
  for (const { href, line, file } of allLinks) {
    if (!href.startsWith('http')) continue;
    // Détecte URLs clairement malformées (espaces, parenthèses, etc.)
    if (/[\s\(\),]/.test(href)) {
      extLinks.push({ url: href, status: 'MALFORMÉ', file, line });
      continue;
    }
    if (!seenExt.has(href)) seenExt.set(href, { file, line });
  }

  console.log(`🔗 Vérification de ${seenExt.size} URLs externes (HEAD)…\n`);

  // Batch par 8 en parallèle
  const urlList = [...seenExt.entries()];
  for (let i = 0; i < urlList.length; i += 8) {
    const batch = urlList.slice(i, i + 8);
    const results = await Promise.all(batch.map(([url]) => checkExternal(url)));
    for (let j = 0; j < results.length; j++) {
      const { url, status, err } = results[j];
      const { file, line } = batch[j][1];
      const ok = typeof status === 'number' && status < 400;
      extLinks.push({ url, status, file, line, err });
      if (!ok) {
        process.stdout.write(`   ❌ ${status}  ${file}:${line}  ${url}\n`);
      } else {
        process.stdout.write('.');
      }
    }
  }

  // ── Résumé ──────────────────────────────────────────────────────────────────
  const extBroken = extLinks.filter(l =>
    typeof l.status !== 'number' || l.status >= 400
  );
  const malformed = extLinks.filter(l => l.status === 'MALFORMÉ');

  console.log(`\n\n═══ RÉSUMÉ ═══`);
  console.log(`Liens internes cassés : ${internalBroken.length}`);
  console.log(`Liens externes cassés / timeout : ${extBroken.length - malformed.length}`);
  console.log(`URLs malformées : ${malformed.length}`);

  if (malformed.length) {
    console.log('\n🚨 URLs MALFORMÉES :');
    for (const m of malformed) {
      console.log(`   ${m.file}:${m.line}  →  ${m.url}`);
    }
  }

  if (extBroken.length - malformed.length > 0) {
    console.log('\n⚠️  LIENS EXTERNES EN ERREUR :');
    for (const b of extBroken.filter(l => l.status !== 'MALFORMÉ')) {
      console.log(`   [${b.status}] ${b.file}:${b.line}  →  ${b.url}`);
    }
  }
}

main().catch(console.error);
