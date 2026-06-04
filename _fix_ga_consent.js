/**
 * _fix_ga_consent.js
 * Met à jour le Consent Mode v2 dans tous les fichiers HTML existants :
 *  - wait_for_update 500 → 2000
 *  - ajout url_passthrough + ads_data_redaction
 */
const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;

// Pattern exact présent dans tous les HTML existants
const OLD_BLOCK = `    gtag('consent', 'default', {
      'analytics_storage':    'denied',
      'ad_storage':           'denied',
      'ad_user_data':         'denied',
      'ad_personalization':   'denied',
      'wait_for_update':      500
    });`;

const NEW_BLOCK = `    gtag('consent', 'default', {
      'analytics_storage':    'denied',
      'ad_storage':           'denied',
      'ad_user_data':         'denied',
      'ad_personalization':   'denied',
      'wait_for_update':      2000
    });
    gtag('set', 'url_passthrough', true);
    gtag('set', 'ads_data_redaction', true);`;

// Fichiers HTML à la racine + dans articles/
const targets = [
  ...fs.readdirSync(ROOT)
    .filter(f => f.endsWith('.html'))
    .map(f => path.join(ROOT, f)),
  ...fs.readdirSync(path.join(ROOT, 'articles'))
    .filter(f => f.endsWith('.html'))
    .map(f => path.join(ROOT, 'articles', f)),
];

let updated = 0;
let skipped = 0;

for (const file of targets) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(OLD_BLOCK)) {
    fs.writeFileSync(file, content.replace(OLD_BLOCK, NEW_BLOCK), 'utf8');
    console.log(`✓ ${path.relative(ROOT, file)}`);
    updated++;
  } else if (content.includes('G-NR52DCZ6ZJ')) {
    console.log(`⚠  ${path.relative(ROOT, file)}  — tag GA présent mais pattern différent`);
    skipped++;
  } else {
    console.log(`–  ${path.relative(ROOT, file)}  — pas de tag GA`);
    skipped++;
  }
}

console.log(`\n✅ ${updated} fichier(s) mis à jour, ${skipped} ignoré(s).`);
