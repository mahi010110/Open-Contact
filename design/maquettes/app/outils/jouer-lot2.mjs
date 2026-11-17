/* Rejouer le lot 2 de la maquette : Pistes, la page d’une piste, écrire par quatre canaux.
   Usage : node design/maquettes/app/outils/jouer-lot2.mjs [dossier des captures]
   Il parcourt les gestes du lot au téléphone et à l’ordinateur, écrit ses captures,
   et finit par « ERREURS 0 » quand rien n’a cassé. */
import { mkdir } from 'fs/promises';
import os from 'os';
import path from 'path';
import { lancer } from './maquette.mjs';
const OUT = process.argv[2] || path.join(os.tmpdir(), 'oc-maquette', 'lot2');
await mkdir(OUT, { recursive: true });
const { ouvrir: ouvrirM, fermer, etat } = await lancer();
const ouvrir = (w, h, sombre, mobile) => ouvrirM(w, h, sombre, mobile, { calme: false });
const deb = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const T = '#tel ';
const bas = p => p.evaluate(() => { const d = document.querySelector('#tel .defile'); if (d) d.scrollTop = d.scrollHeight; });
const haut = p => p.evaluate(() => { const d = document.querySelector('#tel .defile'); if (d) d.scrollTop = 0; });
const remplacer = (p, texte) => p.evaluate(t => { const ta = document.querySelector('#tel .e-m'); ta.value = ta.value.replace(/\[[^\]]*\]/, t); ta.dispatchEvent(new Event('input', { bubbles: true })); }, texte);
const petites = p => p.evaluate(() => [...document.querySelectorAll('#tel button, #tel a, #tel [role="button"], #tel label.champ, #tel .fld input, #tel summary')]
  .filter(e => e.offsetParent && !e.classList.contains('lien-t')).map(e => { const b = e.getBoundingClientRect(); return { t: (e.textContent || e.className).trim().slice(0, 28), w: Math.round(b.width), h: Math.round(b.height) }; })
  .filter(x => x.h < 44 || x.w < 44));
const vues = new Set();
const noter = async p => (await petites(p)).forEach(x => vues.add(JSON.stringify(x)));

// ---------- au téléphone, jour 8 ----------
{
  const { ctx, p } = await ouvrir(390, 844, false, true);
  const shot = async n => { await noter(p); await p.screenshot({ path: `${OUT}/t-${n}.png` }); };
  console.log('jour par défaut :', await p.evaluate(() => document.querySelector('[data-jour].on').textContent));
  await p.click(T + '.nav [data-id="pistes"]'); await shot('01-pistes');
  console.log('À faire :', (await p.$$eval(T + '.s-afaire .rang b', x => x.map(e => e.textContent))).join(' | '));
  await p.click(T + '.s-afaire .rang [data-a="ecrire"]'); await p.waitForTimeout(200); await shot('02-merci');
  await p.click(T + '.pied [data-a="envoyer"]'); await shot('03-crochet');
  console.log('crochet sélectionné :', await p.evaluate(() => { const t = document.querySelector('#tel .e-m'); return t.value.slice(t.selectionStart, t.selectionEnd); }));
  await remplacer(p, 'J’ai aimé découvrir votre chantier de fibre à Roubaix.');
  await p.click(T + '.pied [data-a="envoyer"]'); await p.waitForTimeout(150); await shot('04-parti');
  await p.click(T + '[data-a="envoye"]'); await shot('05-merci-envoye');
  await p.click(T + '[data-a="ev"][data-v="oui"]'); await shot('06-oui');
  await p.click(T + '.ck[data-v="contrat"]'); await shot('07-oui-coche');
  await p.click(T + '[data-a="retour"]'); await shot('08-pistes-apres');
  await p.click(T + '.s-afaire .rang[data-id="sep"] [data-a="ecrire"]'); await p.waitForTimeout(200); await shot('09-relance');
  await p.click(T + '[data-a="canal"][data-v="linkedin"]'); await shot('10-relance-linkedin');
  await p.click(T + '[data-a="canal"][data-v="appel"]'); await shot('11-relance-appel');
  await p.click(T + '[data-a="canal"][data-v="site"]'); await shot('12-relance-site');
  await p.click(T + '[data-a="retour"]'); await p.click(T + '[data-a="retour"]');
  await p.click(T + '.s-afaire .rang[data-id="ocd"] [data-a="demande"]'); await shot('13-demande');
  await p.click(T + '[data-a="demander"]'); await shot('14-demande-envoyee');
  await p.click(T + '[data-a="retour"]');
  await p.click(T + '.rang.l[data-id="nor"] .r-c'); await shot('15-nor');
  await p.click(T + '.suite-b [data-a="ecrire"]'); await p.waitForTimeout(200); await shot('16-nor-linkedin');
  await remplacer(p, 'Vos interventions en PME m’intéressent.');
  const [onglet] = await Promise.all([ctx.waitForEvent('page'), p.click(T + '.pied [data-a="envoyer"]')]);
  console.log('LinkedIn ouvert :', onglet.url().slice(0, 70)); await onglet.close();
  await p.waitForTimeout(200); await shot('17-nor-parti');
  console.log('presse-papier :', JSON.stringify((await p.evaluate(() => navigator.clipboard.readText())).slice(0, 60)));
  await p.click(T + '[data-a="envoye"]'); await shot('18-nor-ecrit');
  await p.click(T + '.suivante'); await p.waitForTimeout(200); await shot('19-adv-site');
  await p.click(T + '[data-a="retour"]'); await bas(p); await shot('20-adv-piste-bas');
  await p.click(T + '[data-a="contact"][data-v="-1"]'); await p.waitForTimeout(250); await shot('21-contact');
  await p.fill(T + '.c-n', 'Camille Roussel'); await p.fill(T + '.c-r', 'chargée de recrutement'); await p.fill(T + '.c-m', 'camille.roussel'); await p.click(T + '[data-a="garder-ct"]'); await shot('22-contact-erreur');
  await p.fill(T + '.c-m', 'c.roussel@exemple.fr'); await p.click(T + '[data-a="garder-ct"]'); await haut(p); await shot('23-adv-gens');
  await p.click(T + '[data-a="pm"][data-v="quoi"]'); await shot('24-quoi');
  await p.click(T + '[data-a="pm"][data-v="quand"]'); await shot('25-quand');
  await p.click(T + '.puce[data-a="quand"]:nth-child(2)'); await shot('26-entretien');
  await p.click(T + 'details[data-p="notes"] summary'); await p.fill(T + '.n-notes', 'Entretien avec Camille. Demander le rythme.'); await bas(p); await shot('27-notes');
  await p.click(T + '[data-a="retour"]'); await haut(p);
  await p.evaluate(() => { const r = document.querySelector('#tel .gl[data-id="kia"] .rang'); const b = r.getBoundingClientRect();
    const t = x => new Touch({ identifier: 1, target: r, clientX: x, clientY: b.top + 20 });
    r.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [t(300)], changedTouches: [t(300)] }));
    r.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [t(250)], changedTouches: [t(250)] }));
    r.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [t(160)], changedTouches: [t(160)] })); });
  await p.evaluate(() => document.querySelector('#tel .gl[data-id="kia"]').scrollIntoView({ block: 'center' })); await shot('28-glisse');
  await p.evaluate(() => { const r = document.querySelector('#tel .gl[data-id="kia"] .rang'); r.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [] })); });
  await shot('29-supprimee');
  console.log('Kiabi supprimée :', await p.$(T + '.gl[data-id="kia"]') === null, '· barre :', (await p.textContent('#tel .annule')).trim());
  await p.click('#tel .annule button'); console.log('Annulé, Kiabi revenue :', await p.$(T + '.gl[data-id="kia"]') !== null);
  console.log('débordement horizontal', await deb(p));
  // ---------- mois 3 ----------
  await p.click('[data-jour="90"]'); await p.click(T + '.nav [data-id="pistes"]'); await shot('30-m3');
  console.log('M3 À faire :', (await p.$$eval(T + '.s-afaire .rang b', x => x.map(e => e.textContent))).join(' | '));
  await p.click(T + '[data-a="ranger"]'); await shot('31-m3-range');
  await bas(p); await shot('32-m3-bas');
  await haut(p); await p.fill(T + '.qp', 'opa'); await shot('33-m3-cherche');
  // ---------- jour 1 ----------
  await p.click('[data-jour="1"]');
  await p.click(T + '.puce:has-text("Alternance")'); await p.click(T + '.puce:has-text("BTS SIO SISR")'); await p.fill(T + '.f-ville', 'Lille');
  await p.click(T + '[data-a="voir"]'); await p.waitForTimeout(1300);
  await p.click(T + '.gl[data-id="rsn"] .r-c'); await p.click(T + '.pied [data-a="garder"]'); await shot('40-j1-gardee');
  await p.click(T + '.pied [data-a="ecrire"]'); await p.waitForTimeout(200); await shot('41-j1-ecrire');
  await p.fill(T + '.e-nom', 'Inès Martin'); await p.press(T + '.e-nom', 'Tab');
  console.log('nom rempli dans le message :', await p.evaluate(() => /Inès Martin$/.test(document.querySelector('#tel .e-m').value.trim())));
  await shot('41b-j1-nom');
  await p.click(T + '[data-a="canal"][data-v="mail"]'); await shot('42-j1-mail');
  await p.click(T + '.pied [data-a="envoyer"]'); await shot('43-j1-mail-adresse');
  await p.click(T + '[data-a="retour"]'); await p.click(T + '[data-a="retour"]'); await shot('44-j1-pistes');
  console.log('débordement horizontal', await deb(p));
  await ctx.close();
}
// ---------- sombre ----------
{
  const { ctx, p } = await ouvrir(390, 844, true, true);
  await p.click(T + '.nav [data-id="pistes"]'); await p.screenshot({ path: `${OUT}/t-50-sombre-pistes.png` });
  await p.click(T + '.s-afaire .rang[data-id="sep"]'); await p.screenshot({ path: `${OUT}/t-51-sombre-piste.png` });
  await p.click(T + '.suite-b [data-a="ecrire"]'); await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/t-52-sombre-ecrire.png` });
  await p.click(T + '[data-a="retour"]'); await p.click(T + '[data-a="contact"][data-v="0"]'); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/t-53-sombre-contact.png` });
  await ctx.close();
}
// ---------- petit téléphone ----------
{
  const { ctx, p } = await ouvrir(360, 640, false, true);
  await p.click(T + '.nav [data-id="pistes"]'); await p.screenshot({ path: `${OUT}/t-60-360-pistes.png` });
  await p.click(T + '.rang.l[data-id="nor"] .r-c'); await p.click(T + '.suite-b [data-a="ecrire"]'); await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/t-61-360-ecrire.png` });
  console.log('régie sur une ligne en 360 :', await p.evaluate(() => document.querySelector('.regie').getBoundingClientRect().height < 60));
  console.log('débordement en 360', await deb(p));
  await ctx.close();
}
// ---------- au poste ----------
for (const sombre of [false, true]){
  const { ctx, p } = await ouvrir(1440, 900, sombre);
  const cadre = await p.$('.poste-cadre'); await cadre.scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
  const s = sombre ? '-sombre' : '';
  await p.click('#poste .p-onglets [data-id="pistes"]'); await p.waitForTimeout(100);
  await cadre.screenshot({ path: `${OUT}/p-pistes-j8${s}.png` });
  if (!sombre){
    await p.click('#poste .s-afaire .rang[data-id="sep"] .r-c'); await cadre.screenshot({ path: `${OUT}/p-relance.png` });
    await p.keyboard.press('ArrowDown'); console.log('poste, flèche bas →', (await p.textContent('#poste .pc2 h4')).trim());
    await p.click('#poste .rang.l[data-id="nor"] .r-c'); await cadre.screenshot({ path: `${OUT}/p-nor.png` });
    await p.click('[data-jour="90"]'); await p.waitForTimeout(150); await p.click('#poste .p-onglets [data-id="pistes"]'); await cadre.screenshot({ path: `${OUT}/p-m3.png` });
    await p.click('[data-jour="8"]'); await p.waitForTimeout(150); await p.click('#poste .p-onglets [data-id="pistes"]');
    await p.click('#poste [data-a="contact"][data-v="-1"]'); await p.waitForTimeout(150); await cadre.screenshot({ path: `${OUT}/p-contact.png` });
  }
  console.log('débordement horizontal au poste', await deb(p));
  await ctx.close();
}
console.log('cibles sous 44 px au téléphone :', [...vues].join(' '));
console.log('ERREURS', etat.erreurs);
await fermer();
