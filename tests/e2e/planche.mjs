/* ============================================================
   OpenContact — outil d'audit : UNE PLANCHE DE CAPTURES

   Pose plusieurs captures côte à côte sur une seule image, chacune sous
   son nom — pour regarder un écran dans ses deux thèmes et ses tailles
   d'un seul coup d'œil (§9 : une retouche se termine par une image
   qu'on regarde). Ce n'est pas un garde.

   Usage : node tests/e2e/planche.mjs sortie.png larg cap1.png cap2.png …
   ============================================================ */
import { readFile } from 'fs/promises';
import path from 'path';
import { chromium, chromiumPath } from './outils.mjs';

const [sortie, larg, ...caps] = process.argv.slice(2);
const L = +larg || 260;
const imgs = await Promise.all(caps.map(async f =>
  ({ nom: path.basename(f).replace(/\.(png|jpe?g)$/, ''), src: 'data:image/' + (/\.jpe?g$/.test(f) ? 'jpeg' : 'png') + ';base64,' + (await readFile(f)).toString('base64') })));
const html = `<body style="margin:0;background:#888;font:12px monospace;display:flex;flex-wrap:wrap;gap:8px;padding:8px;width:${(L + 8) * Math.min(imgs.length, 4) + 8}px">
  ${imgs.map(i => `<figure style="margin:0;width:${L}px"><figcaption style="color:#fff;margin-bottom:4px">${i.nom}</figcaption>
    <img src="${i.src}" style="width:${L}px;display:block"></figure>`).join('')}</body>`;
const browser = await chromium.launch({ executablePath: chromiumPath() });
const p = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await p.setContent(html);
await p.waitForTimeout(200);
await p.screenshot({ path: sortie, fullPage: true });
await browser.close();
console.log('PLANCHE', sortie);
