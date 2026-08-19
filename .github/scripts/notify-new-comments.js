#!/usr/bin/env node
/**
 * notify-new-comments.js
 * Vérifie les commentaires Firestore en attente de modération et envoie
 * un mail de notification (via Brevo) pour ceux pas encore notifiés.
 *
 * Variables d'environnement requises :
 *   BREVO_API_KEY            — clé API Brevo (GitHub Secrets)
 *   FIREBASE_ADMIN_EMAIL     — email du compte admin Firebase (GitHub Secrets)
 *   FIREBASE_ADMIN_PASSWORD  — mot de passe du compte admin Firebase (GitHub Secrets)
 */

'use strict';
const fs    = require('fs');
const path  = require('path');
const https = require('https');

const BREVO_API_KEY  = process.env.BREVO_API_KEY;
const ADMIN_EMAIL    = process.env.FIREBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.FIREBASE_ADMIN_PASSWORD;

const cfg = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'config.json'), 'utf8')
);
const PROJECT_ID   = cfg.firebaseProjectId;
const API_KEY      = cfg.firebaseApiKey;
const NOTIFY_EMAIL = cfg.contactEmail;
const SITE         = 'https://ouipsycho.fr';
const SENDER       = { name: 'Oui Psycho! — Commentaires', email: 'contact@ouipsycho.fr' };

/* ── Requête HTTPS JSON générique ────────────────────────── */
function httpsJson(method, hostname, pathName, body, headers) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname,
      path: pathName,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers,
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

/* ── Connexion admin Firebase Auth ───────────────────────── */
async function signIn() {
  const res = await httpsJson(
    'POST', 'identitytoolkit.googleapis.com',
    `/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }
  );
  if (res.status !== 200) {
    throw new Error(`Connexion Firebase échouée (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.idToken;
}

/* ── Helpers Firestore ↔ JS ──────────────────────────────── */
function fbVal(v) {
  if (!v) return null;
  if ('stringValue'    in v) return v.stringValue;
  if ('integerValue'   in v) return parseInt(v.integerValue, 10);
  if ('booleanValue'   in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  return null;
}
function fbDoc(doc) {
  const id  = (doc.name || '').split('/').pop();
  const obj = { id };
  for (const [k, v] of Object.entries(doc.fields || {})) obj[k] = fbVal(v);
  return obj;
}

/* ── Commentaires en attente ─────────────────────────────── */
async function fetchPendingComments(idToken) {
  const query = {
    structuredQuery: {
      from:  [{ collectionId: 'comments' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'status' },
          op:    'EQUAL',
          value: { stringValue: 'pending' },
        },
      },
    },
  };
  const res = await httpsJson(
    'POST', 'firestore.googleapis.com',
    `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    query,
    { Authorization: `Bearer ${idToken}` }
  );
  if (res.status !== 200 || !Array.isArray(res.body)) {
    throw new Error(`Requête Firestore échouée (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.filter(r => r.document).map(r => fbDoc(r.document));
}

async function markNotified(idToken, commentId) {
  await httpsJson(
    'PATCH', 'firestore.googleapis.com',
    `/v1/projects/${PROJECT_ID}/databases/(default)/documents/comments/${commentId}?updateMask.fieldPaths=notified`,
    { fields: { notified: { booleanValue: true } } },
    { Authorization: `Bearer ${idToken}` }
  );
}

/* ── Construction du mail ────────────────────────────────── */
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function buildEmailHtml(comments) {
  const items = comments.map(c => `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;margin-bottom:14px;box-shadow:0 2px 6px rgba(0,0,0,.06);">
      <tr><td style="padding:16px 18px;">
        <p style="margin:0 0 6px;font-size:13px;color:#888;">Article : <strong>${esc(c.article_id)}</strong></p>
        <p style="margin:0 0 6px;font-size:15px;color:#1a1a2e;"><strong>${esc(c.author_name)}</strong>${c.author_email ? ` (${esc(c.author_email)})` : ''}</p>
        <p style="margin:0;font-size:14px;color:#444;line-height:1.6;">${esc(c.content)}</p>
      </td></tr>
    </table>`).join('');

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="padding-bottom:18px;">
    <div style="font-size:20px;font-weight:900;color:#1F4E6B;">💬 Nouveau${comments.length > 1 ? 'x' : ''} commentaire${comments.length > 1 ? 's' : ''} à modérer</div>
    <div style="font-size:13px;color:#888;margin-top:4px;">${comments.length} commentaire${comments.length > 1 ? 's' : ''} en attente sur Oui Psycho!</div>
  </td></tr>
  <tr><td>${items}</td></tr>
  <tr><td align="center" style="padding:10px 0;">
    <a href="${SITE}/poulet.html" style="display:inline-block;background:#1F4E6B;color:#fff;padding:10px 22px;border-radius:20px;text-decoration:none;font-size:14px;font-weight:700;">Modérer maintenant →</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function sendNotificationEmail(comments) {
  const subject = comments.length === 1
    ? '💬 1 nouveau commentaire à modérer — Oui Psycho!'
    : `💬 ${comments.length} nouveaux commentaires à modérer — Oui Psycho!`;

  const res = await httpsJson('POST', 'api.brevo.com', '/v3/smtp/email', {
    sender:      SENDER,
    to:          [{ email: NOTIFY_EMAIL }],
    subject,
    htmlContent: buildEmailHtml(comments),
  }, { 'api-key': BREVO_API_KEY });

  if (res.status !== 201) {
    throw new Error(`Envoi Brevo échoué (${res.status}): ${JSON.stringify(res.body)}`);
  }
}

/* ── Main ─────────────────────────────────────────────────── */
async function main() {
  if (!BREVO_API_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌ Variables manquantes (BREVO_API_KEY / FIREBASE_ADMIN_EMAIL / FIREBASE_ADMIN_PASSWORD).');
    process.exit(1);
  }

  const idToken = await signIn();
  const pending = await fetchPendingComments(idToken);
  const toNotify = pending.filter(c => !c.notified);

  if (toNotify.length === 0) {
    console.log('ℹ️  Aucun nouveau commentaire à notifier.');
    return;
  }

  console.log(`📬 ${toNotify.length} nouveau(x) commentaire(s) à notifier.`);
  await sendNotificationEmail(toNotify);
  for (const c of toNotify) {
    await markNotified(idToken, c.id);
  }
  console.log('✅ Notification envoyée et commentaires marqués comme notifiés.');
}

main().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
