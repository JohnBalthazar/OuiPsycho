/**
 * Génère sitemap.xml automatiquement depuis data/articles.json
 * Usage : node _gen_sitemap.js
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const BASE     = 'https://ouipsycho.fr';
const articles = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'articles.json'), 'utf8'));

// Trier par date décroissante
articles.sort((a, b) => b.date.localeCompare(a.date));

const staticPages = [
  { loc: `${BASE}/`,                                   lastmod: articles[0]?.date || '2026-01-01', changefreq: 'daily',   priority: '1.0' },
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
  loc:        `${BASE}/articles/${a.id}.html`,
  lastmod:    a.date,
  changefreq: 'monthly',
  priority:   i === 0 ? '0.9' : '0.8',
}));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- Pages statiques -->
${staticPages.map(urlEntry).join('\n')}

  <!-- Articles (${articles.length} articles — généré automatiquement) -->
${articleEntries.join('\n')}

</urlset>
`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), xml, 'utf8');
console.log(`✅ sitemap.xml généré — ${articles.length} articles + ${staticPages.length} pages statiques`);
