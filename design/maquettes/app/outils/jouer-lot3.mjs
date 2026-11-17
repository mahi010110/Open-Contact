/* Rejouer le lot 3 de la maquette : Réseau, la classe, les amis, les demandes, donner et recevoir.
   Usage : node design/maquettes/app/outils/jouer-lot3.mjs [dossier des captures]
   Il parcourt les gestes du lot au téléphone et à l’ordinateur, écrit ses captures,
   et finit par « ERREURS 0 » quand rien n’a cassé. */
import { mkdir } from 'fs/promises';
import os from 'os';
import path from 'path';
import { lancer } from './maquette.mjs';
const OUT = process.argv[2] || path.join(os.tmpdir(), 'oc-maquette', 'lot3');
await mkdir(OUT, { recursive: true });
const { ouvrir: ouvrirM, fermer, etat } = await lancer();
const ouvrir = (w, h, sombre, mobile) => ouvrirM(w, h, sombre, mobile, { calme: true });
const deb = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const T = '#tel ';
const petites = p => p.evaluate(() => [...document.querySelectorAll('#tel button, #tel a, #tel [role="button"], #tel label.champ, #tel .fld input, #tel summary')]
  .filter(e => e.offsetParent && !e.classList.contains('lien-t') && !e.closest('.regie')).map(e => { const b = e.getBoundingClientRect(); return { t: (e.textContent || e.className).trim().slice(0, 28), w: Math.round(b.width), h: Math.round(b.height) }; })
  .filter(x => x.h < 44 || x.w < 44));
const vues = new Set();
const txt = (p, s) => p.textContent(s).then(t => t.replace(/\s+/g, ' ').trim());

// ---------- au téléphone, jour 8 ----------
{
  const { ctx, p } = await ouvrir(390, 844, false, true);
  const shot = async n => { (await petites(p)).forEach(x => vues.add(JSON.stringify(x))); await p.screenshot({ path: `${OUT}/t-${n}.png` }); };
  console.log('onglet Réseau signale du nouveau :', await p.$eval(T + '.nav [data-id="reseau"]', b => b.classList.contains('attend') && b.getAttribute('aria-label')));
  await p.click(T + '.nav [data-id="reseau"]'); await shot('01-reseau');
  await p.click(T + '[data-a="r-demande"][data-id="d1"]'); await shot('02-demande');
  await p.click(T + '[data-a="r-ajouter-recu"]'); await shot('03-demande-ajoutee');
  await p.click(T + '.suite-b, ' + T + '[data-a="ecrire"]'); await p.waitForTimeout(150); await shot('04-ecrire-julie');
  console.log('ligne de l’ami dans le message :', /Karim m’a conseillé de vous écrire/.test(await p.$eval(T + '.e-m', t => t.value)), '· canal :', await txt(p, T + '.canaux .on'));
  await p.click(T + '.nav [data-id="reseau"]');
  await p.click(T + '[data-a="r-conv"][data-id="bts"]'); await shot('05-conv');
  console.log('barre d’onglets cachée dans la conversation :', await p.$eval(T + '.nav', n => getComputedStyle(n).display === 'none'));
  await p.click(T + '.carte-don'); await shot('06-apercu');
  await p.click(T + '[data-a="r-prendre"]'); await shot('07-conv-apres');
  await p.click(T + '[data-a="r-repondre"]'); await p.waitForTimeout(150); await shot('08-repondre');
  await p.click(T + '[data-a="r-suivre"]'); await shot('09-suivi');
  await p.fill(T + '.m-in', 'Oui, j’y serai !'); await p.press(T + '.m-in', 'Enter'); await shot('10-message');
  console.log('champ toujours en main après l’envoi :', await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('m-in')));
  await p.click(T + '.conv-t'); await shot('11-groupe');
  await p.click(T + '[data-a="r-inviter"]'); await shot('12-inviter');
  await p.click(T + '[data-a="r-copier-inv"]'); await p.waitForTimeout(100);
  console.log('invitation copiée :', JSON.stringify((await p.evaluate(() => navigator.clipboard.readText())).slice(0, 70)));
  await p.click(T + '[data-a="retour"]'); await p.click(T + '[data-a="retour"]'); await p.click(T + '[data-a="retour"]');
  await p.click(T + '[data-a="r-ami"][data-id="karim"]'); await shot('13-ami');
  await p.click(T + '[data-a="r-garder"][data-id="esc"]'); await shot('14-ami-garde');
  await p.click(T + '.pied [data-a="r-conv"]'); await shot('15-conv-karim');
  await p.click(T + '[data-a="retour"]'); await p.click(T + '[data-a="retour"]');
  await p.click(T + '[data-a="r-demander"]'); await p.waitForTimeout(150); await shot('16-demander');
  await p.click(T + '[data-a="r-dm-m"][data-v="cloud"]'); await shot('16b-demander-cloud');
  await p.click(T + '[data-a="r-dm-envoyer"]'); await shot('17-demande-envoyee');
  await p.click(T + '[data-a="retour"]');
  await p.click(T + '.s-bas [data-a="r-donner"]'); await shot('18-donner');
  await p.click(T + '[data-a="r-don-sel"]:nth-child(2)'); await p.click(T + '[data-a="r-don-canal"][data-v="qr"]'); await shot('18b-donner-qr');
  await p.click(T + '[data-a="r-don-ok"]'); await shot('19-qr');
  await p.click(T + '.pied [data-a="retour"]'); await p.click(T + '[data-a="r-don-canal"][data-v="groupe"]'); await p.click(T + '[data-a="r-don-ok"]'); await shot('20-donne');
  await p.click(T + '.s-bas [data-a="r-recevoir"]'); await p.waitForTimeout(150); await shot('21-recevoir');
  await p.click(T + '[data-a="r-coller"]'); await shot('22-coller');
  await p.click(T + '[data-a="r-lire"]'); await shot('23-rien-de-neuf');
  await p.click(T + '[data-a="retour"]');
  await p.click(T + '.rang.plus-r[data-a="r-ajami"]'); await p.waitForTimeout(150); await shot('24-ajami');
  await p.click(T + '[data-a="r-scan-ami"]'); await shot('25-ami-apercu');
  await p.click(T + '[data-a="r-ajouter-ami"]'); await shot('26-amis');
  await p.click(T + '.nav [data-id="pistes"]'); await p.click(T + '.rang.l[data-id="kia"] .r-c'); await p.evaluate(() => { const d = document.querySelector('#tel .defile'); d.scrollTop = 500; }); await shot('27-kia-sofia');
  await p.click(T + '[data-a="retour"]');
  await p.click(T + '.s-afaire .rang[data-id="ocd"] [data-a="demande"]'); await p.click(T + '[data-a="demander"]');
  await p.click(T + '.nav [data-id="reseau"]'); await shot('28-reseau-demandes');
  console.log('demandes :', (await p.$$eval(T + '[data-a="r-demande"] b', x => x.map(e => e.textContent))).join(' | '));
  console.log('débordement horizontal', await deb(p));
  await ctx.close();
}
// ---------- au téléphone, jour 1 ----------
{
  const { ctx, p } = await ouvrir(390, 844, false, true);
  const shot = async n => { (await petites(p)).forEach(x => vues.add(JSON.stringify(x))); await p.screenshot({ path: `${OUT}/t-${n}.png` }); };
  await p.click('[data-jour="1"]'); await p.click(T + '.nav [data-id="reseau"]'); await shot('30-j1-vide');
  await p.click(T + '.panneau [data-a="r-rejoindre"]'); await p.waitForTimeout(150); await shot('31-j1-rejoindre');
  await p.click(T + '[data-a="r-rejoindre-ok"]'); await shot('31b-j1-sans-prenom');
  await p.fill(T + '.r-prenom', 'Inès'); await p.click(T + '[data-a="r-scan-code"]'); await p.click(T + '[data-a="r-rejoindre-ok"]'); await shot('32-j1-conv');
  await p.click(T + '[data-a="retour"]'); await shot('33-j1-reseau');
  await p.click(T + '.rang.plus-r[data-a="r-rejoindre"]'); await p.click(T + '[data-a="r-creer-mode"]'); await p.fill(T + '.r-nomg', 'Projet Lycée Baggio'); await p.click(T + '[data-a="r-creer-ok"]'); await shot('34-j1-inviter');
  console.log('débordement horizontal', await deb(p));
  await ctx.close();
}
// ---------- sombre ----------
{
  const { ctx, p } = await ouvrir(390, 844, true, true);
  await p.click(T + '.nav [data-id="reseau"]'); await p.screenshot({ path: `${OUT}/t-40-sombre-reseau.png` });
  await p.click(T + '[data-a="r-conv"][data-id="bts"]'); await p.screenshot({ path: `${OUT}/t-41-sombre-conv.png` });
  await p.click(T + '[data-a="retour"]'); await p.click(T + '[data-a="r-demande"][data-id="d1"]'); await p.screenshot({ path: `${OUT}/t-42-sombre-demande.png` });
  await ctx.close();
}
// ---------- petit téléphone ----------
{
  const { ctx, p } = await ouvrir(360, 640, false, true);
  await p.click(T + '.nav [data-id="reseau"]'); await p.screenshot({ path: `${OUT}/t-50-360-reseau.png` });
  await p.click(T + '[data-a="r-conv"][data-id="bts"]'); await p.screenshot({ path: `${OUT}/t-51-360-conv.png` });
  console.log('débordement en 360', await deb(p));
  await ctx.close();
}
// ---------- au poste ----------
for (const sombre of [false, true]){
  const { ctx, p } = await ouvrir(1440, 900, sombre);
  const cadre = await p.$('.poste-cadre'); await cadre.scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
  const s = sombre ? '-sombre' : '';
  await p.click('#poste .p-onglets [data-id="reseau"]'); await p.waitForTimeout(100);
  await cadre.screenshot({ path: `${OUT}/p-reseau${s}.png` });
  if (!sombre){
    await p.click('#poste [data-a="r-conv"][data-id="bts"]'); await p.waitForTimeout(100); await cadre.screenshot({ path: `${OUT}/p-conv.png` });
    await p.click('#poste [data-a="r-fermer-conv"]'); await p.click('#poste [data-a="r-ami"][data-id="karim"]'); await cadre.screenshot({ path: `${OUT}/p-ami.png` });
    await p.click('#poste .r-bas [data-a="r-donner"]'); await cadre.screenshot({ path: `${OUT}/p-donner.png` });
  }
  console.log('débordement horizontal au poste', await deb(p));
  await ctx.close();
}
console.log('cibles sous 44 px au téléphone :', [...vues].join(' '));
console.log('ERREURS', etat.erreurs);
await fermer();
