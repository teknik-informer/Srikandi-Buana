#!/bin/bash
set -Eeuo pipefail
cd "$(dirname "$0")"
echo "SRIKANDI BUANA — Deploy PREVIEW (bukan produksi)"
if ! command -v vercel >/dev/null 2>&1; then
 echo "Vercel CLI belum ditemukan. Pasang secara resmi: npm install -g vercel"
 exit 1
fi
if ! command -v npm >/dev/null 2>&1; then echo "Node.js/npm diperlukan."; exit 1; fi
if [[ ! -d node_modules ]]; then npm ci; fi
npm run test:navigation:compat
npm run test:terminology
npm run typecheck
npm run build
# Link to the existing production project, but perform PREVIEW deployment only.
vercel link --project admin-dashboard --scope teknik-informer
vercel deploy
echo "Preview dibuat. Periksa tautan yang dicetak Vercel dan uji login, DB, dan seluruh form sebelum promosi produksi."
