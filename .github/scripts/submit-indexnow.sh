#!/usr/bin/env bash
# Soumet une liste d'URLs à IndexNow (Bing, Yandex, Seznam, Naver…).
# Usage : URLS="https://ouipsycho.fr/articles/slug/ …" bash .github/scripts/submit-indexnow.sh
# La clé IndexNow est publique par conception (elle doit être servie à la racine du site).
set -euo pipefail

HOST="ouipsycho.fr"
KEY="1b7bf7acf5f04447a7d1e07fe8cc1a42"
ENDPOINT="https://api.indexnow.org/indexnow"

if [ -z "${URLS:-}" ]; then
  echo "Aucune URL à soumettre — rien à faire."
  exit 0
fi

# Déduplique, limite à 500 URLs (l'API en accepte 10 000 max)
LIST=$(printf '%s\n' $URLS | sort -u | head -n 500)
COUNT=$(printf '%s\n' "$LIST" | wc -l)

BODY=$(printf '%s\n' "$LIST" | jq -R . | jq -s --arg host "$HOST" --arg key "$KEY" \
  '{host: $host, key: $key, keyLocation: ("https://" + $host + "/" + $key + ".txt"), urlList: .}')

echo "Soumission de $COUNT URL(s) à IndexNow :"
printf '%s\n' "$LIST" | sed 's/^/  - /'

CODE=$(curl -s -o /tmp/indexnow-resp.txt -w '%{http_code}' -X POST \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d "$BODY" "$ENDPOINT")

if [ "$CODE" = "200" ] || [ "$CODE" = "202" ]; then
  echo "✓ IndexNow : HTTP $CODE — URLs acceptées."
else
  echo "::warning::IndexNow a répondu HTTP $CODE : $(cat /tmp/indexnow-resp.txt)"
  # Non bloquant : l'échec d'IndexNow ne doit pas faire échouer la publication.
fi
