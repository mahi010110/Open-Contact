/* Les planches du lot 5 (les états), telles que montrées au mainteneur.
   Usage : node design/maquettes/app/outils/planches-lot5.mjs [dossier]
   « Avant » vient de l'app actuelle (voir planches-lot4.mjs). */
import { mkdir, access } from 'fs/promises';
import os from 'os';
import path from 'path';
import { lancer, ROOT } from './maquette.mjs';
import { planche } from './planche.mjs';
const OUT = process.argv[2] || path.join(os.tmpdir(), 'oc-maquette', 'planches-lot5');
const P = path.join(OUT, 'propres');
await mkdir(P, { recursive: true });
const AV = process.env.OC_AVANT || path.join(ROOT, 'tests/e2e/captures/audit/chromium');
const avant = n => path.join(AV, n + '.png');
try { await access(avant('30-vide-aujourdhui--390')); } catch (e) {
  console.log('Pas de captures de l’app actuelle dans ' + AV + ' : lancer OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs'); process.exit(1);
}
const { ouvrir, fermer, etat } = await lancer();
const T = '#tel ';
const img = async (p, n) => { await p.waitForTimeout(250); await p.screenshot({ path: path.join(P, n + '.png') }); };
const scene = async (p, s) => { await p.click('#scenes'); await p.click(`.r-menu [data-scene="${s}"]`); await p.waitForTimeout(150); };
{ const { ctx, p } = await ouvrir(390, 844, false, true, { calme: true });
  await p.click('[data-jour="1"]'); await img(p, 'c1-premier-jour');
  await p.click(T + '[data-a="e-retrouver"]'); await p.click(T + '[data-a="e-retrouver-phrase"]'); await p.click(T + '[data-a="m-phrase-coller"]');
  await p.click(T + '[data-a="m-restaurer-ok"]'); await img(p, 'c2-tout-ramener');
  await scene(p, 'lien'); await img(p, 'c3-lien');
  await p.click('[data-jour="8"]'); await p.click('#horsligne'); await p.click(T + '.nav [data-id="reseau"]'); await p.click(T + '[data-a="r-conv"][data-id="bts"]');
  await p.fill(T + '.m-in', 'Je passe au forum jeudi.'); await p.press(T + '.m-in', 'Enter'); await img(p, 'c4-hors-ligne');
  await p.click('#horsligne'); await p.click(T + '[data-a="retour"]'); await p.click(T + '.nav [data-id="trouver"]');
  await scene(p, 'panne'); await img(p, 'c5-panne'); await scene(p, 'panne');
  await scene(p, 'verrou'); await img(p, 'c6-verrou');
  await ctx.close(); }
{ const { ctx, p } = await ouvrir(1440, 900, false, false, { calme: true });
  const cadre = await p.$('.poste-cadre'); await cadre.scrollIntoViewIfNeeded();
  await scene(p, 'verrou'); await cadre.screenshot({ path: path.join(P, 'p-verrou.png') });
  await ctx.close(); }
await fermer();
const A = n => path.join(P, n + '.png');
await planche({ sortie: path.join(OUT, 'lot5-telephone.png'), titre: 'Lot 5 au téléphone : les états',
  sousTitre: 'À gauche l’app d’aujourd’hui. À droite la maquette : le premier jour, le hors ligne, la panne, le verrou.',
  avant: [[avant('30-vide-aujourdhui--390'), 'Le premier jour'], [avant('26-verrouillage--390'), 'Le code']],
  apres: [[A('c1-premier-jour'), '1. Le premier jour, et « J’ai déjà OpenContact »'], [A('c2-tout-ramener'), '2. Un téléphone neuf retrouve tout'],
    [A('c3-lien'), '3. Arriver par le lien d’un ami'], [A('c4-hors-ligne'), '4. Hors ligne : « pas encore parti »'],
    [A('c5-panne'), '5. L’annuaire en panne : réessayer'], [A('c6-verrou'), '6. Verrouillé : le pavé sous le pouce']] });
await planche({ sortie: path.join(OUT, 'lot5-ordinateur.png'), poste: true, titre: 'Lot 5 à l’ordinateur',
  sousTitre: 'Avant : le code se choisit dans une feuille. Après : l’app verrouillée, une fenêtre au milieu, les chiffres au clavier.',
  avant: [[avant('26-verrouillage--1280'), '']], apres: [[A('p-verrou'), '']] });
console.log('planches dans ' + OUT + ' · ERREURS', etat.erreurs);
