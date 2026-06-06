/**
 * Génère sitemap.xml automatiquement depuis data/articles.json
 * Usage : node _gen_sitemap.js
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const BASE     = 'https://ouipsycho.fr';
const allArticles = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'articles.json'), 'utf8'));

// Seuls les articles publiés (pas planifiés ni brouillons)
const today = new Date().toISOString().split('T')[0];
const articles = allArticles.filter(a => {
  if (a.status === 'draft') return false;
  if (a.status === 'scheduled' && a.date > today) return false;
  return true;
});

// Trier par date décroissante (date_modified en priorité)
articles.sort((a, b) => {
  const da = a.date_modified || a.date;
  const db = b.date_modified || b.date;
  return db.localeCompare(da);
});

const newestDate = articles[0]?.date_modified || articles[0]?.date || '2026-01-01';

const staticPages = [
  { loc: `${BASE}/`,                                   lastmod: newestDate,    changefreq: 'daily',   priority: '1.0' },
  { loc: `${BASE}/a-propos.html`,                      changefreq: 'monthly',  priority: '0.5' },
  { loc: `${BASE}/contact.html`,                       changefreq: 'monthly',  priority: '0.4' },
  { loc: `${BASE}/mentions-legales.html`,              changefreq: 'yearly',   priority: '0.2' },
  { loc: `${BASE}/politique-de-confidentialite.html`,  changefreq: 'yearly',   priority: '0.2' },
];

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

const articleEntries = articles.map((a, i) => urlEntry({
  loc:        `${BASE}/articles/${a.id}/`,
  lastmod:    a.date_modified || a.date,
  changefreq: 'monthly',
  priority:   i === 0 ? '0.9' : '0.8',
}));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- Pages statiques -->
${staticPages.map(urlEntry).join('\n')}

  <!-- Articles (${articles.length} articles publiés — généré automatiquement) -->
${articleEntries.join('\n')}

</urlset>
`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), xml, 'utf8');
console.log(`✅ sitemap.xml généré — ${articles.length} articles publiés + ${staticPages.length} pages statiques`);
