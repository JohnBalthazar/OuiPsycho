#!/usr/bin/env node
/**
 * send-newsletter.js
 * Lit data/articles.json, filtre les articles de la semaine,
 * crée une campagne Brevo et l'envoie à la liste abonnés.
 *
 * Variables d'environnement requises :
 *   BREVO_API_KEY  — clé API Brevo (stockée dans GitHub Secrets)
 */

'use strict';
const fs    = require('fs');
const path  = require('path');
const https = require('https');

/* ── Config ─────────────────────────────────────────────── */
const API_KEY = process.env.BREVO_API_KEY;
const LIST_ID = 2;                               // brevoListId dans config.json
const SITE    = 'https://ouipsycho.fr';
const SENDER  = { name: 'Oui Psycho!', email: 'contact@ouipsycho.fr' };
const DAYS_BACK = 7;                             // articles des 7 derniers jours

/* ── Helpers ─────────────────────────────────────────────── */
function isoDate(d) { return d.toISOString().split('T')[0]; }

function weekAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - DAYS_BACK);
  return isoDate(d);
}

/* ── Filtre articles de la semaine ───────────────────────── */
function getWeekArticles() {
  const raw  = fs.readFileSync(
    path.join(process.cwd(), 'data', 'articles.json'), 'utf8'
  );
  const all  = JSON.parse(raw);
  const today  = isoDate(new Date());
  const since  = weekAgoStr();

  return all.filter(a => {
    if (a.status === 'draft') return false;
    if (a.status === 'scheduled' && a.date > today) return false;
    return a.date >= since && a.date <= today;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

/* ── Construction du HTML email ──────────────────────────── */
function buildHtml(articles) {
  const formatDate = str =>
    new Date(str).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    });

  const cards = articles.map(a => {
    const url  = `${SITE}/articles/${a.id}/`;
    const img  = a.image
      ? `<img src="${a.image}" alt="" width="100%" style="width:100%;height:170px;object-fit:cover;border-radius:8px 8px 0 0;display:block;">`
      : '';
    const cat  = a.category
      ? `<span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#1F4E6B;letter-spacing:.8px;">${a.category}</span><br>`
      : '';
    const read = a.readTime ? `<span style="font-size:12px;color:#999;">⏱ ${a.readTime} min de lecture</span>` : '';
    const excerpt = (a.excerpt || '').substring(0, 160).replace(/\s\S*$/, '') + '…';

    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,.07);">
      <tr><td>${img}</td></tr>
      <tr><td style="padding:18px 20px 20px;">
        ${cat}
        <h2 style="margin:6px 0 10px;font-size:18px;color:#1a1a2e;line-height:1.35;font-family:Georgia,serif;">${a.title}</h2>
        <p style="margin:0 0 14px;font-size:14px;color:#555;line-height:1.6;">${excerpt}</p>
        <table cellpadding="0" cellspacing="0"><tr>
          <td><a href="${url}" style="display:inline-block;background:#1F4E6B;color:#fff;padding:9px 20px;border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;">Lire l'article →</a></td>
          <td style="padding-left:14px;vertical-align:middle;">${read}</td>
        </tr></table>
      </td></tr>
    </table>`;
  }).join('');

  const count = articles.length;
  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Oui Psycho! — Newsletter</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:30px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr><td align="center" style="padding-bottom:24px;">
    <a href="${SITE}" style="text-decoration:none;">
      <img src="${SITE}/img/logo-brain.png" alt="Oui Psycho!" width="52" height="52" style="display:block;margin:0 auto 10px;border-radius:12px;">
      <div style="font-size:26px;font-weight:900;color:#1F4E6B;letter-spacing:-0.5px;">Oui Psycho!</div>
      <div style="font-size:13px;color:#888;margin-top:4px;">La psychologie expliquée, simplement.</div>
    </a>
  </td></tr>

  <!-- INTRO BANNER -->
  <tr><td style="background:#1F4E6B;color:#fff;border-radius:14px;padding:22px 28px;text-align:center;margin-bottom:24px;">
    <p style="margin:0;font-size:16px;line-height:1.6;">
      📬 Votre récap de la semaine du <strong>${dateLabel}</strong><br>
      <strong>${count} nouvel${count > 1 ? 's' : ''} article${count > 1 ? 's' : ''}</strong> pour mieux vous comprendre 🌱
    </p>
  </td></tr>
  <tr><td style="height:20px;"></td></tr>

  <!-- ARTICLES -->
  <tr><td>${cards}</td></tr>

  <!-- CTA SITE -->
  <tr><td align="center" style="padding:10px 0 30px;">
    <a href="${SITE}" style="font-size:14px;color:#1F4E6B;font-weight:600;text-decoration:none;">
      Voir tous les articles sur ouipsycho.fr →
    </a>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="border-top:1px solid #dce4ec;padding:20px 0;text-align:center;">
    <p style="margin:0 0 8px;font-size:12px;color:#aaa;">
      Vous recevez cet email car vous êtes abonné(e) à la newsletter d'Oui Psycho!
    </p>
    <a href="{UNSUB_LINK}" style="font-size:12px;color:#888;text-decoration:underline;">
      Se désinscrire
    </a>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/* ── Requête HTTPS vers Brevo API ────────────────────────── */
function brevoRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req  = https.request({
      hostname: 'api.brevo.com',
      path:     `/v3${apiPath}`,
      method,
      headers: {
        'api-key':      API_KEY,
        'Content-Type': 'application/json',
        'Accept':       'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

/* ── Créer la campagne Brevo ─────────────────────────────── */
async function createCampaign(html, count) {
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const subject = count === 1
    ? `🧠 1 nouvel article cette semaine sur Oui Psycho!`
    : `🧠 ${count} nouveaux articles cette semaine sur Oui Psycho!`;

  const res = await brevoRequest('POST', '/emailCampaigns', {
    name:         `Newsletter Oui Psycho! — ${today}`,
    subject,
    sender:       SENDER,
    type:         'classic',
    htmlContent:  html,
    recipients:   { listIds: [LIST_ID] }
  });

  if (res.status !== 201) {
    throw new Error(`Création campagne échouée (${res.status}): ${JSON.stringify(res.body)}`);
  }
  console.log(`✅ Campagne créée — ID: ${res.body.id}`);
  return res.body;
}

/* ── Envoyer immédiatement ───────────────────────────────── */
async function sendCampaign(id) {
  const res = await brevoRequest('POST', `/emailCampaigns/${id}/sendNow`, null);
  if (res.status !== 204) {
    throw new Error(`Envoi échoué (${res.status}): ${JSON.stringify(res.body)}`);
  }
  console.log('🚀 Campagne envoyée avec succès !');
}

/* ── Main ────────────────────────────────────────────────── */
async function main() {
  if (!API_KEY) {
    console.error('❌ BREVO_API_KEY manquant dans les variables d\'environnement.');
    process.exit(1);
  }

  const articles = getWeekArticles();
  console.log(`📰 Articles de la semaine trouvés : ${articles.length}`);

  if (articles.length === 0) {
    console.log('ℹ️  Aucun article publié cette semaine — newsletter annulée.');
    process.exit(0);
  }

  articles.forEach(a => console.log(`   • [${a.date}] ${a.title}`));

  const html     = buildHtml(articles);
  const campaign = await createCampaign(html, articles.length);
  await sendCampaign(campaign.id);
}

main().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
