#!/usr/bin/env node
/**
 * notify-security-events.js
 * Vérifie la collection Firestore `security_events` et envoie un mail
 * d'alerte à l'admin en cas de blocage de connexion sur poulet.html
 * (3 échecs de mot de passe consécutifs → tentative suspecte).
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
const SENDER       = { name: 'Oui Psycho! — Sécurité', email: 'contact@ouipsycho.fr' };

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

/* ── Événements de sécurité non notifiés ─────────────────── */
async function fetchPendingEvents(idToken) {
  const query = {
    structuredQuery: {
      from:  [{ collectionId: 'security_events' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'notified' },
          op:    'EQUAL',
          value: { booleanValue: false },
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

async function markNotified(idToken, eventId) {
  await httpsJson(
    'PATCH', 'firestore.googleapis.com',
    `/v1/projects/${PROJECT_ID}/databases/(default)/documents/security_events/${eventId}?updateMask.fieldPaths=notified`,
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

function buildEmailHtml(events) {
  const items = events.map(e => `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;margin-bottom:14px;box-shadow:0 2px 6px rgba(0,0,0,.06);">
      <tr><td style="padding:16px 18px;">
        <p style="margin:0 0 6px;font-size:13px;color:#888;">${esc(e.created_at)}</p>
        <p style="margin:0 0 6px;font-size:15px;color:#1a1a2e;"><strong>${e.attempts_total || '?'}</strong> tentative(s) de mot de passe échouées avant blocage</p>
        <p style="margin:0;font-size:13px;color:#666;word-break:break-all;">Navigateur : ${esc(e.user_agent)}</p>
      </td></tr>
    </table>`).join('');

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="padding-bottom:18px;">
    <div style="font-size:20px;font-weight:900;color:#b00020;">🚨 Tentative(s) de connexion suspecte(s)</div>
    <div style="font-size:13px;color:#888;margin-top:4px;">Le panneau admin (poulet.html) a bloqué l'accès après plusieurs mots de passe incorrects — ${events.length} blocage${events.length > 1 ? 's' : ''} depuis la dernière alerte.</div>
  </td></tr>
  <tr><td>${items}</td></tr>
  <tr><td style="padding:10px 0;font-size:12px;color:#999;">
    Si c'est vous (mot de passe oublié, autre appareil…), rien à faire. Sinon, envisagez de changer le mot de passe admin dès que possible.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function sendAlertEmail(events) {
  const subject = events.length === 1
    ? '🚨 Tentative de connexion suspecte — Oui Psycho!'
    : `🚨 ${events.length} tentatives de connexion suspectes — Oui Psycho!`;

  const res = await httpsJson('POST', 'api.brevo.com', '/v3/smtp/email', {
    sender:      SENDER,
    to:          [{ email: NOTIFY_EMAIL }],
    subject,
    htmlContent: buildEmailHtml(events),
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
  const events  = await fetchPendingEvents(idToken);

  if (events.length === 0) {
    console.log('ℹ️  Aucun événement de sécurité à notifier.');
    return;
  }

  console.log(`🚨 ${events.length} événement(s) de sécurité à notifier à l'admin.`);
  await sendAlertEmail(events);
  for (const e of events) {
    await markNotified(idToken, e.id);
  }
  console.log('✅ Admin alerté.');
}

main().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
