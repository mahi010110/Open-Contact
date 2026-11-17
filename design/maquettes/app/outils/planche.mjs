/* ============================================================
   Une planche « avant / après », la forme montrée au mainteneur
   à chaque lot (CLAUDE.md §0 : un changement qui se voit se montre
   AVANT d'arriver dans main, l'avant à côté de l'après).

   await planche({
     sortie: '/tmp/lot5-telephone.png',
     titre: 'Lot 5 au téléphone : …', sousTitre: 'À gauche… À droite…',
     avant: [[fichier, légende], …],          // captures de l'app actuelle
     apres: [[fichier, légende], …],          // images propres de la maquette
     poste: false,                            // true : une image d'ordinateur de chaque côté
     largeur: 1700,
   });

   Au téléphone, les images font 390 × 844 : elles sont posées à 250 px
   de large, la régie de la maquette (les 32 premiers px) coupée.
   ============================================================ */
import { writeFile, mkdtemp } from 'fs/promises';
import os from 'os';
import path from 'path';
import { chromium, chromiumPath } from './maquette.mjs';

const CSS = `*{box-sizing:border-box}body{margin:0;background:#CBC8BB;color:#1D242C;font:15px/1.4 system-ui,sans-serif;padding:28px}
h1{margin:0 0 4px;font-size:26px}p.s{margin:0 0 22px;color:#5C6672;font-size:16px}
.rang{display:flex;gap:18px;align-items:flex-start}.bloc{display:flex;gap:14px;padding:14px;background:#E7E5DD;border:1px solid #1D242C;box-shadow:4px 4px 0 rgba(29,36,44,.16)}
.bloc.apres{background:#F7F6F1}.tag{font:600 13px/1 ui-monospace,monospace;letter-spacing:.08em;margin:0 0 8px;text-transform:uppercase}
.tag.av{color:#8F5A00}.tag.ap{color:#0B7268}figure{margin:0}figcaption{font-size:14px;font-weight:600;margin:8px 0 0;max-width:250px}
.tel{width:250px;height:509px;overflow:hidden;border:1px solid #1D242C;background:#fff}.tel img{width:250px;display:block}.tel.m img{margin-top:-32px}
.poste img{display:block;width:860px;border:1px solid #1D242C}`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export async function planche({ sortie, titre, sousTitre = '', avant = [], apres = [], poste = false, largeur = poste ? 1900 : 1700 }){
  const fig = ([f, t], maquette) => poste ? `<img src="file://${f}">`
    : `<figure><div class="tel${maquette ? ' m' : ''}"><img src="file://${f}"></div><figcaption>${esc(t)}</figcaption></figure>`;
  const bloc = (l, maq) => `<div class="bloc${maq ? ' apres' : ''}${poste ? ' poste' : ''}">${l.map(x => fig(x, maq)).join('')}</div>`;
  const corps = poste
    ? `<div class="rang"><div><div class="tag av">Avant</div>${bloc(avant)}</div><div><div class="tag ap">Après</div>${bloc(apres, true)}</div></div>`
    : `<div class="rang"><div><div class="tag av">Avant</div>${bloc(avant)}</div></div><div class="rang" style="margin-top:22px"><div><div class="tag ap">Après</div>${bloc(apres, true)}</div></div>`;
  const dir = await mkdtemp(path.join(os.tmpdir(), 'oc-planche-'));
  const f = path.join(dir, 'planche.html');
  await writeFile(f, `<!doctype html><meta charset="utf-8"><style>${CSS}</style><h1>${esc(titre)}</h1><p class="s">${esc(sousTitre)}</p>${corps}`);
  const b = await chromium.launch({ executablePath: chromiumPath() });
  const pg = await b.newPage({ viewport: { width: largeur, height: 700 }, deviceScaleFactor: 2 });
  await pg.goto(`file://${f}`); await pg.waitForTimeout(300);
  await pg.screenshot({ path: sortie, fullPage: true });
  await b.close();
}
