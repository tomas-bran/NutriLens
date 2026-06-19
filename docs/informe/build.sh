#!/usr/bin/env bash
# Regenera el Informe Final (PDF + DOCX) desde report.html + arch.svg.
# Requisitos: node + Playwright (ya en node_modules del repo) y pandoc + librsvg.
# Uso: bash docs/informe/build.sh   (desde cualquier lado)
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$DIR/../.." && pwd)"

# --- PDF (Chromium de Playwright del repo; header/footer + numeración) ---
cat > /tmp/_build_informe.js <<JS
const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://${DIR}/report.html', { waitUntil: 'networkidle' });
  await p.pdf({
    path: '${DIR}/NutriLens-Informe-Final.pdf', format: 'A4', printBackground: true,
    margin: { top: '20mm', bottom: '16mm', left: '15mm', right: '15mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:8px;color:#94a3b8;width:100%;text-align:center;padding-top:6px;">NutriLens — Informe Final</div>',
    footerTemplate: '<div style="font-size:8px;color:#94a3b8;width:100%;text-align:center;">IA Aplicada (01-5900) · UNLaM 2026 — Página <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
  await b.close(); console.log('PDF OK');
})().catch(e => { console.error(e); process.exit(1); });
JS
NODE_PATH="${REPO}/node_modules" node /tmp/_build_informe.js

# --- DOCX (pandoc; embebe arch.svg vía librsvg) ---
cd "${DIR}"
pandoc report.html -o "NutriLens-Informe-Final.docx" --metadata title="NutriLens — Informe Final"
echo "DOCX OK"
echo "→ ${DIR}/NutriLens-Informe-Final.pdf"
echo "→ ${DIR}/NutriLens-Informe-Final.docx"
