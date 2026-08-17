// Vérifie que le robots meta de chaque page article correspond à sa date de
// publication, et que les pages racine n'ont pas de contenu dupliqué.
// Détecte le type de régression qui a exposé 85 articles planifiés en
// "index, follow" et bloqué des articles publiés en "noindex" (août 2026).
// Usage : node .github/scripts/verify-robots-consistency.js
const fs   = require('fs');
const path = require('path');

const ROOT  = path.join(__dirname, '..', '..');
const DIR   = path.join(ROOT, 'articles');
const TODAY = new Date().toISOString().split('T')[0];

const jsonFiles = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
const errors = [];

for (const file of jsonFiles) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
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

if (errors.length) {
  console.error(`❌ ${errors.length} incohérence(s) robots/date détectée(s) :\n`);
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log(`✅ Cohérence robots/date vérifiée sur ${jsonFiles.length} articles — aucune anomalie.`);
