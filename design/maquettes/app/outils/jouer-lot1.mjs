/* Rejouer le lot 1 de la maquette : Trouver, la page d’une entreprise, garder ou écarter.
   Usage : node design/maquettes/app/outils/jouer-lot1.mjs [dossier des captures]
   Il parcourt les gestes du lot au téléphone et à l’ordinateur, écrit ses captures,
   et finit par « ERREURS 0 » quand rien n’a cassé. */
import { mkdir } from 'fs/promises';
import os from 'os';
import path from 'path';
import { lancer } from './maquette.mjs';
const OUT = process.argv[2] || path.join(os.tmpdir(), 'oc-maquette', 'lot1');
await mkdir(OUT, { recursive: true });
const { ouvrir: ouvrirM, fermer, etat } = await lancer();
const ouvrir = (w, h, sombre, mobile) => ouvrirM(w, h, sombre, mobile, { calme: false });
const deb = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// ---------- au téléphone, jour 1 ----------
{
  const { ctx, p } = await ouvrir(390, 844, false, true);
  const T = '#tel ';
  const shot = n => p.screenshot({ path: `${OUT}/t-${n}.png` });
  await p.click('[data-jour="1"]'); await p.waitForTimeout(150);
  await shot('01-accueil');
  await p.click(T + '[data-a="voir"]'); await shot('02-manque');
  await p.click(T + '.puce:has-text("Alternance")'); await p.click(T + '.puce:has-text("BTS SIO SISR")'); await p.fill(T + '.f-ville', 'lille'); await shot('03-rempli');
  await p.click(T + '[data-a="voir"]'); await p.waitForTimeout(450); await shot('04-charge');
  await p.waitForTimeout(900); await shot('05-liste');
  await p.click(T + '.gl[data-id="adv"] [data-a="garder"]');
  await p.click(T + '.gl[data-id="nor"] [data-a="garder"]'); await shot('06-gardees');
  await p.click(T + '.gl[data-id="rsn"] .r-c'); await p.waitForTimeout(250); await shot('07-entreprise');
  await p.evaluate(() => { const d = document.querySelector('#tel .defile'); d.scrollTop = d.scrollHeight; }); await shot('08-entreprise-bas');
  await p.click(T + '.pied [data-a="garder"]'); await shot('09-entreprise-gardee');
  await p.click(T + '[data-a="retour"]');
  await p.evaluate(() => { const d = document.querySelector('#tel .defile'); d.scrollTop = d.scrollHeight; }); await shot('10-liste-bas');
  await p.click(T + '[data-a="suite"]'); await p.evaluate(() => { const d = document.querySelector('#tel .defile'); d.scrollTop = d.scrollHeight; }); await shot('11-liste-suite');
  await p.evaluate(() => { document.querySelector('#tel .defile').scrollTop = 0; });
  // glisser pour écarter
  await p.evaluate(() => { const r = document.querySelector('#tel .gl[data-id="chu"] .rang'); const b = r.getBoundingClientRect();
    const t = (x) => new Touch({ identifier: 1, target: r, clientX: x, clientY: b.top + 20 });
    r.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [t(300)], changedTouches: [t(300)] }));
    r.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [t(250)], changedTouches: [t(250)] }));
    r.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [t(170)], changedTouches: [t(170)] })); });
  await shot('14-glisse');
  await p.evaluate(() => { const r = document.querySelector('#tel .gl[data-id="chu"] .rang'); r.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [] })); });
  await shot('15-ecartee');
  console.log('CHU écarté :', await p.$(T + '.gl[data-id="chu"]') === null, '· barre :', (await p.textContent(T + '.annule')).trim());
  await p.click(T + '[data-a="annuler"]');
  console.log('Annulé, CHU revenu :', await p.$(T + '.gl[data-id="chu"]') !== null);
  // la barre
  await p.click(T + '.q'); await shot('16-recherche-vide');
  await p.click(T + '[data-a="coller"]'); await shot('17-lien-colle');
  await p.fill(T + '.q', 'cyber'); await shot('18-cyber');
  await p.fill(T + '.q', 'Thales'); await shot('19-thales');
  await p.click(T + '[data-a="tel-quel"]'); await p.waitForTimeout(250); await shot('20-a-la-main');
  await p.click(T + '.nav [data-id="pistes"]'); await shot('21-pistes');
  await p.click(T + '.nav [data-id="trouver"]');
  await p.click(T + '.s-tags button'); await shot('22-changer');
  await p.click(T + '.puce:has-text("BTS SIO SLAM")'); await p.click(T + '[data-a="voir"]'); await p.waitForTimeout(1200); await shot('24-liste-slam');
  await p.click('#horsligne'); await shot('25-hors-ligne'); await p.click('#horsligne');
  console.log('débordement horizontal au téléphone', await deb(p));
  const petites = await p.evaluate(() => [...document.querySelectorAll('#tel button, #tel a, #tel [role="button"], #tel label.champ')].filter(e => e.offsetParent).map(e => { const b = e.getBoundingClientRect(); return { t: (e.textContent || e.className).trim().slice(0, 24), w: Math.round(b.width), h: Math.round(b.height) }; }).filter(x => x.h < 44 || x.w < 44));
  console.log('cibles sous 44 px (liste)', JSON.stringify(petites));
  await ctx.close();
}
// ---------- au téléphone, jour 8, sombre ----------
{
  const { ctx, p } = await ouvrir(390, 844, true, true);
  const T = '#tel ';
  await p.click('[data-jour="8"]'); await p.screenshot({ path: `${OUT}/t-30-j8-sombre.png` });
  await p.click(T + '.gl[data-id="ovh"] .r-c'); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/t-31-j8-ovh-sombre.png` });
  await ctx.close();
}
// ---------- au téléphone, jour 8, clair ----------
{
  const { ctx, p } = await ouvrir(390, 844, false, true);
  await p.click('[data-jour="8"]'); await p.screenshot({ path: `${OUT}/t-33-j8.png` });
  await p.click('#tel .gl[data-id="ovh"] .r-c'); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/t-34-j8-ovh.png` });
  await ctx.close();
}
// ---------- petit téléphone 360 × 640, jour 8 clair ----------
{
  const { ctx, p } = await ouvrir(360, 640, false, true);
  await p.click('[data-jour="8"]'); await p.screenshot({ path: `${OUT}/t-40-j8-360.png` });
  await p.click('#tel .gl[data-id="rsn"] .r-c'); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/t-41-j8-360-ent.png` });
  console.log('débordement horizontal en 360', await deb(p));
  await ctx.close();
}
// ---------- au poste ----------
for (const sombre of [false, true]){
  const { ctx, p } = await ouvrir(1440, 900, sombre);
  const s = sombre ? '-sombre' : '';
  await p.click('[data-jour="8"]'); await p.waitForTimeout(150);
  await p.click('#poste .p-onglets [data-id="trouver"]'); await p.waitForTimeout(150);
  await p.screenshot({ path: `${OUT}/p-page-j8${s}.png`, fullPage: true });
  const cadre = await p.$('.poste-cadre'); await cadre.scrollIntoViewIfNeeded();
  await cadre.screenshot({ path: `${OUT}/p-poste-j8${s}.png` });
  if (!sombre){
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('g');
    console.log('au clavier : choisie =', (await p.textContent('#poste .rang.ent.on b')).trim(), '· gardée =', await p.$('#poste .rang.ent.on .s-ok') !== null);
    await cadre.screenshot({ path: `${OUT}/p-poste-j8-clavier.png` });
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('x'); await cadre.screenshot({ path: `${OUT}/p-poste-j8-ecartee.png` });
    await p.keyboard.press('/'); await p.keyboard.type('cyber'); await cadre.screenshot({ path: `${OUT}/p-poste-j8-cyber.png` });
    await p.click('[data-jour="1"]'); await p.waitForTimeout(150); await cadre.screenshot({ path: `${OUT}/p-poste-j1.png` });
  }
  console.log('débordement horizontal au poste', await deb(p));
  await ctx.close();
}
console.log('ERREURS', etat.erreurs);
await fermer();
