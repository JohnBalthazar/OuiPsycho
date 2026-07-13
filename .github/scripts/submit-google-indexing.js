#!/usr/bin/env node
/**
 * Soumet une liste d'URLs à la Google Indexing API (URL_UPDATED).
 *
 * Usage :
 *   URLS="https://ouipsycho.fr/slug/ https://ouipsycho.fr/autre/" \
 *   GOOGLE_INDEXING_SA_KEY='<JSON du compte de service (raw ou base64)>' \
 *   node .github/scripts/submit-google-indexing.js
 *
 * - URLS : liste d'URLs séparées par des espaces ou des sauts de ligne.
 * - GOOGLE_INDEXING_SA_KEY : JSON du compte de service Google (raw ou encodé base64).
 *
 * Ce script est volontairement NON BLOQUANT : il sort toujours avec le code 0,
 * même si l'API Google répond avec une erreur (quota dépassé, permission, etc.).
 * Les erreurs sont remontées en annotations ::warning:: dans GitHub Actions.
 *
 * ── Mise en place du compte de service (une seule fois) ──────────────────────
 * 1. https://console.cloud.google.com → créer (ou choisir) un projet.
 * 2. "API et services" → "Bibliothèque" → activer "Web Search Indexing API".
 * 3. "IAM et administration" → "Comptes de service" → créer un compte de service
 *    (aucun rôle projet nécessaire) → onglet "Clés" → "Ajouter une clé" → JSON.
 * 4. Google Search Console → propriété ouipsycho.fr → "Paramètres" →
 *    "Utilisateurs et autorisations" → ajouter l'e-mail du compte de service
 *    (xxx@yyy.iam.gserviceaccount.com) avec le rôle "Propriétaire".
 * 5. GitHub → repo → Settings → Secrets and variables → Actions →
 *    créer le secret GOOGLE_INDEXING_SA_KEY avec le contenu du fichier JSON.
 */

'use strict';

const crypto = require('crypto');

const ENDPOINT = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/indexing';
const MAX_URLS = 200; // quota par défaut de l'API : 200 requêtes/jour

function warn(msg) {
  // Annotation GitHub Actions (une seule ligne)
  console.log(`::warning::${String(msg).replace(/\r?\n/g, ' ')}`);
}

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Accepte le JSON du compte de service en clair ou encodé base64. */
function parseServiceAccount(raw) {
  const attempts = [raw, Buffer.from(raw, 'base64').toString('utf8')];
  for (const text of attempts) {
    try {
      const sa = JSON.parse(text);
      if (sa && sa.client_email && sa.private_key) return sa;
    } catch (_) {
      /* essai suivant */
    }
  }
  return null;
}

/** Génère un JWT RS256 et l'échange contre un access token OAuth2. */
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(`${header}.${claims}`)
    .sign(sa.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const jwt = `${header}.${claims}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(
      `échec de l'obtention du token OAuth2 (HTTP ${res.status}) : ${JSON.stringify(body)}`
    );
  }
  return body.access_token;
}

async function submitUrl(token, url) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url, type: 'URL_UPDATED' }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  const rawUrls = (process.env.URLS || '').trim();
  if (!rawUrls) {
    console.log('Aucune URL à soumettre à Google — rien à faire.');
    return;
  }

  const key = (process.env.GOOGLE_INDEXING_SA_KEY || '').trim();
  if (!key) {
    warn(
      'Google Indexing : secret GOOGLE_INDEXING_SA_KEY absent — étape ignorée. ' +
        'Voir les instructions dans .github/scripts/submit-google-indexing.js'
    );
    return;
  }

  const sa = parseServiceAccount(key);
  if (!sa) {
    warn(
      'Google Indexing : GOOGLE_INDEXING_SA_KEY illisible (JSON attendu, raw ou base64, ' +
        'avec client_email et private_key) — étape ignorée.'
    );
    return;
  }

  const urls = [...new Set(rawUrls.split(/\s+/).filter(Boolean))].slice(0, MAX_URLS);
  console.log(`Soumission de ${urls.length} URL(s) à la Google Indexing API :`);
  urls.forEach((u) => console.log(`  - ${u}`));

  let token;
  try {
    token = await getAccessToken(sa);
  } catch (err) {
    warn(`Google Indexing : ${err.message}`);
    return;
  }

  let okCount = 0;
  for (const url of urls) {
    try {
      const r = await submitUrl(token, url);
      if (r.ok) {
        console.log(`✓ ${url} → HTTP ${r.status}`);
        okCount++;
      } else {
        warn(`Google Indexing : ${url} → HTTP ${r.status} : ${r.body}`);
      }
    } catch (err) {
      warn(`Google Indexing : ${url} → ${err.message}`);
    }
  }
  console.log(`Google Indexing : ${okCount}/${urls.length} URL(s) acceptée(s).`);
}

main().catch((err) => {
  // Non bloquant : jamais de code de sortie non nul.
  warn(`Google Indexing : erreur inattendue — ${err.message}`);
});
