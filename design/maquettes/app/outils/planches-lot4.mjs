/* Les planches du lot 4 (Moi), telles que montrées au mainteneur : le modèle
   à copier pour un lot suivant.
   Usage : node design/maquettes/app/outils/planches-lot4.mjs [dossier]
   « Avant » vient de l'app actuelle : lancer d'abord
     OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs
   (les captures arrivent dans tests/e2e/captures/audit/chromium ;
   OC_AVANT=<dossier> pour en prendre d'autres). */
import { mkdir, access } from 'fs/promises';
import os from 'os';
import path from 'path';
import { lancer, ROOT } from './maquette.mjs';
import { planche } from './planche.mjs';
const OUT = process.argv[2] || path.join(os.tmpdir(), 'oc-maquette', 'planches-lot4');
const P = path.join(OUT, 'propres');
await mkdir(P, { recursive: true });
const AV = process.env.OC_AVANT || path.join(ROOT, 'tests/e2e/captures/audit/chromium');
const avant = n => path.join(AV, n + '.png');
try { await access(avant('14-moi--390')); } catch (e) {
  console.log('Pas de captures de l’app actuelle dans ' + AV + ' : lancer OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs'); process.exit(1);
}
const { ouvrir, fermer, etat } = await lancer();
const T = '#tel ';
const img = async (p, n) => { await p.waitForTimeout(250); await p.screenshot({ path: path.join(P, n + '.png') }); };
const remplir = async (p, sel, v) => { await p.fill(sel, v); await p.dispatchEvent(sel, 'change'); };
{ const { ctx, p } = await ouvrir(390, 844, false, true, { calme: true });
  await p.click(T + '.nav [data-id="moi"]'); await img(p, 'b1-moi');
  await p.click(T + '[data-a="m-ouvrir"][data-v="profil"]'); await img(p, 'b2-profil');
  await remplir(p, T + '.m-f[data-k="ecole"]', 'CFA du Nord'); await remplir(p, T + '.m-f[data-k="tel"]', '06 12 34 56 78');
  await p.click(T + '[data-a="m-exp"]'); await p.waitForTimeout(150); await p.fill(T + '.m-exp-e', 'Escaut Data'); await p.fill(T + '.m-exp-d', '2025'); await p.click(T + '[data-a="m-exp-ok"]');
  await p.click(T + '.nav [data-id="pistes"]'); await p.click(T + '.rang.l[data-id="nor"] .r-c'); await p.click(T + '.suite-b [data-a="ecrire"]'); await p.click(T + '[data-a="canal"][data-v="mail"]');
  await p.evaluate(() => { document.querySelector('#tel .defile').scrollTop = 420; }); await img(p, 'b3-mail');
  await p.click(T + '.nav [data-id="moi"]'); await p.click(T + '[data-a="m-ouvrir"][data-v="copie"]'); await img(p, 'b4-copie');
  await p.click(T + '[data-a="m-restaurer"]'); await p.waitForTimeout(150);
  await p.setInputFiles(T + '.m-fichier[data-k="copie"]', { name: 'opencontact-copie-2026-10-02.oc', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await img(p, 'b5-restaurer');
  await p.click(T + '[data-a="retour"]'); await p.click(T + '[data-a="retour"]'); await p.click(T + '[data-a="m-ouvrir"][data-v="reglages"]'); await img(p, 'b6-reglages');
  await ctx.close(); }
{ const { ctx, p } = await ouvrir(1440, 900, false, false, { calme: true });
  const cadre = await p.$('.poste-cadre'); await cadre.scrollIntoViewIfNeeded();
  await p.click('#poste [data-a="m-ouvrir"][data-v="copie"]'); await p.waitForTimeout(250);
  await cadre.screenshot({ path: path.join(P, 'p-copie.png') });
  await ctx.close(); }
await fermer();
const A = n => path.join(P, n + '.png');
await planche({ sortie: path.join(OUT, 'lot4-telephone.png'), titre: 'Lot 4 au téléphone : Moi',
  sousTitre: 'À gauche l’app d’aujourd’hui. À droite la maquette : les cinq lignes que tu as validées, et ce que chacune ouvre.',
  avant: [[avant('14-moi--390'), 'Moi'], [avant('15-profil--390'), 'Mon profil'], [avant('16-reglages--390'), 'Réglages']],
  apres: [[A('b1-moi'), '1. Cinq lignes, chacune dit où tu en es'], [A('b2-profil'), '2. Mon profil, sans bouton Enregistrer'],
    [A('b3-mail'), '3. Ton école, ton rythme, ton stage : déjà dans le mail'], [A('b4-copie'), '4. Ma copie : fichier, phrase, appareils'],
    [A('b5-restaurer'), '5. Restaurer : l’aperçu d’abord, rien n’est effacé'], [A('b6-reglages'), '6. Réglages : chaque ligne dit son état']] });
await planche({ sortie: path.join(OUT, 'lot4-ordinateur.png'), poste: true, titre: 'Lot 4 à l’ordinateur',
  sousTitre: 'Avant : Moi sur une colonne. Après : la liste à gauche, la page ouverte à droite.',
  avant: [[avant('14-moi--1280'), '']], apres: [[A('p-copie'), '']] });
console.log('planches dans ' + OUT + ' · ERREURS', etat.erreurs);
