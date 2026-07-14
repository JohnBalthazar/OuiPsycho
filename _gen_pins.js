'use strict';

/**
 * _gen_pins.js — Générateur d'épingles Pinterest pour ouipsycho.fr
 *
 * Génère des PNG 1000×1500 px (ratio 2:3) à partir des articles publiés.
 * Lit data/articles.json, rend pin-template.html via Puppeteer, écrit dans /pins/.
 *
 * Usage :
 *   node _gen_pins.js                        → tous les articles publiés
 *   node _gen_pins.js --slug=mon-article     → un seul article
 */

const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');

// ─── Chemins & constantes ─────────────────────────────────────────────────────

const DATA_FILE     = path.join(__dirname, 'data', 'articles.json');
const TEMPLATE_FILE = path.join(__dirname, 'pin-template.html');
const OUTPUT_DIR    = path.join(__dirname, 'pins');
const PIN_WIDTH     = 1000;
const PIN_HEIGHT    = 1500;

// ─── Argument CLI --slug= ─────────────────────────────────────────────────────

const slugArg    = process.argv.slice(2).find(a => a.startsWith('--slug='));
const targetSlug = slugArg ? slugArg.slice(7) : null;

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/**
 * Transforme une URL Cloudinary pour obtenir une image 1000×1500 recadrée.
 * Remplace le bloc de transformation existant (ex. f_auto,q_auto,w_1200).
 * Retourne une chaîne vide si l'URL est absente.
 */
function adaptCloudinaryUrl(url) {
  if (!url) return '';
  return url.replace(
    /\/upload\/[^/]+\//,
    '/upload/f_auto,q_auto,w_1000,h_1500,c_fill/'
  );
}

/**
 * Échappe les caractères spéciaux HTML pour éviter toute injection dans le template.
 */
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  })[c]);
}

/**
 * Remplit le template HTML avec les données d'un article.
 * Substitue tous les {{PLACEHOLDERS}} et applique la classe has-image/no-image.
 */
function buildHtml(template, article) {
  const imageUrl      = adaptCloudinaryUrl(article.image);
  const hasImage      = imageUrl.length > 0;
  const imagePosition = article.imagePosition || '50% 50%';

  return template
    .replace(/\{\{TITLE\}\}/g,          escapeHtml(article.title))
    .replace(/\{\{CATEGORY\}\}/g,       escapeHtml(article.category || 'Psychologie'))
    .replace(/\{\{IMAGE_URL\}\}/g,      imageUrl)
    .replace(/\{\{IMAGE_POSITION\}\}/g, imagePosition)
    .replace(/\{\{HAS_IMAGE\}\}/g,      hasImage ? 'has-image' : 'no-image');
}

// ─── Génération ───────────────────────────────────────────────────────────────

async function main() {
  // Lecture des articles et filtrage sur "published"
  const tous      = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  let   articles  = tous.filter(a => a.status === 'published');

  // Mode --slug : un seul article
  if (targetSlug) {
    articles = articles.filter(a => a.id === targetSlug);
    if (articles.length === 0) {
      console.error(`\n❌  Article introuvable ou non publié : "${targetSlug}"`);
      console.log('\nSlugs disponibles (status: published) :');
      tous.filter(a => a.status === 'published').forEach(a => console.log(`   - ${a.id}`));
      process.exit(1);
    }
  }

  if (articles.length === 0) {
    console.log('\nAucun article publié trouvé dans data/articles.json.');
    process.exit(0);
  }

  console.log(`\n📌  Génération de ${articles.length} épingle(s) Pinterest...\n`);

  // Lecture du template et création du dossier de sortie
  const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Une seule instance Chromium pour tous les rendus (bien plus rapide)
  const browser = await puppeteer.launch({ headless: true });

  let ok     = 0;
  const errs = [];

  for (const article of articles) {
    try {
      if (!article.title) throw new Error('titre manquant');

      const html = buildHtml(template, article);
      const page = await browser.newPage();

      await page.setViewport({ width: PIN_WIDTH, height: PIN_HEIGHT, deviceScaleFactor: 1 });

      // networkidle2 : attend que les fonts Google et l'image Cloudinary soient chargées
      await page.setContent(html, { waitUntil: 'networkidle2', timeout: 20000 });

      const outPath = path.join(OUTPUT_DIR, `${article.id}.png`);
      await page.screenshot({
        path: outPath,
        type: 'png',
        clip: { x: 0, y: 0, width: PIN_WIDTH, height: PIN_HEIGHT }
      });

      await page.close();
      console.log(`   ✅  ${article.id}.png`);
      ok++;

    } catch (err) {
      const msg = `${article.id} — ${err.message}`;
      errs.push(msg);
      console.error(`   ❌  ${msg}`);
    }
  }

  // Fermeture propre du navigateur
  await browser.close();

  // Résumé final
  console.log(`\n🏁  ${ok} épingle(s) générée(s) → dossier /pins/`);
  if (errs.length > 0) {
    console.error(`⚠️   ${errs.length} erreur(s) :`);
    errs.forEach(e => console.error(`     • ${e}`));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n❌  Erreur fatale :', err.message);
  process.exit(1);
});
