/* ============================================================
   OpenContact · la nouvelle interface · les planches du lot 1
   (la coque et Trouver), telles que montrées au mainteneur.

   Usage : node tests/refonte/planches-lot1.mjs [dossier]
   « Avant » vient de l'app actuelle :
     OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs
   (ou OC_AVANT=<dossier de ces captures>). « Après » est la nouvelle
   interface, pour de vrai, sur l'annuaire fictif.
   ============================================================ */
import path from 'path';
import { access, mkdir } from 'fs/promises';
import { lancer, glisser, PROFIL } from './outils.mjs';
import { ROOT } from '../e2e/outils.mjs';
import { planche } from '../../design/maquettes/app/outils/planche.mjs';

const { OUT, ouvrir, fermer, etat } = await lancer('planches-lot1');
const P = path.join(OUT, 'propres');
await mkdir(P, { recursive: true });
const AV = process.env.OC_AVANT || path.join(ROOT, 'tests/e2e/captures/audit/chromium');
const avant = n => path.join(AV, n + '.png');
try { await access(avant('04-decouvrir--390')); } catch (e) {
  console.log('Pas de captures de l’app actuelle dans ' + AV + ' : lancer OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs'); process.exit(1);
}
const T = '.ecran ';
const img = async (p, n) => { await p.waitForTimeout(250); await p.screenshot({ path: path.join(P, n + '.png') }); };

{ const { ctx, p } = await ouvrir(390, 844, { mobile: true, echelle: 2, calme: true });
  await img(p, 't1-questions');
  await p.click('[data-a="b-quoi"][data-id="alternance"]');
  await p.click('[data-a="b-form"][data-id="BTS SIO SISR"]');
  await p.fill('.f-ville', 'Lille');
  await p.click('[data-a="voir"]');
  await p.waitForSelector(T + '.s-liste .rang.ent');
  await img(p, 't2-liste');
  await p.click(T + '.s-liste .r-c[data-id="812000001"]');
  await p.waitForTimeout(400);
  await img(p, 't3-entreprise');
  await p.click(T + '.pied [data-a="garder"]');
  await p.goBack();
  await p.waitForSelector(T + '.t-corps');
  await glisser(p, T + '.gl[data-id="812000002"] .rang', -140);
  await img(p, 't4-gardee');
  await p.click('.couche-a [data-a="annuler"]');
  await p.click(T + '.q');
  await p.fill(T + '.q', 'Boulangerie Martin');
  await p.waitForTimeout(900);
  await img(p, 't5-barre');
  await ctx.close(); }
{ const { ctx, p } = await ouvrir(1440, 900, { echelle: 1, calme: true, profil: PROFIL });
  await p.waitForSelector('.c1 .s-liste .rang.ent');
  await p.waitForTimeout(400);
  await img(p, 'p1-liste');
  await p.click('.c1 .rang.ent.on .r-c');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('g');
  await p.waitForTimeout(300);
  await img(p, 'p2-clavier');
  await ctx.close(); }
await fermer();
const A = n => path.join(P, n + '.png');
await planche({ sortie: path.join(OUT, 'lot1-telephone.png'), reelle: true,
  titre: 'Code, lot 1 au téléphone : Trouver, pour de vrai',
  sousTitre: 'À gauche l’app d’aujourd’hui. À droite la nouvelle, branchée sur l’annuaire : la maquette validée, devenue l’app.',
  avant: [[avant('04-decouvrir--390'), 'À découvrir, sous Mes pistes'], [avant('05-decouvrir-apercu--390'), 'L’aperçu d’une entreprise']],
  apres: [[A('t1-questions'), '1. Le premier jour : trois questions'], [A('t2-liste'), '2. La liste, « Garder » sur chaque ligne'],
    [A('t3-entreprise'), '3. La page d’une entreprise'], [A('t4-gardee'), '4. Gardée ; glissée : « Pas pour moi », « Annuler »'],
    [A('t5-barre'), '5. Hors de l’annuaire : gardée telle quelle']] });
await planche({ sortie: path.join(OUT, 'lot1-ordinateur.png'), poste: true, pile: true,
  titre: 'Code, lot 1 à l’ordinateur : la liste et l’entreprise côte à côte',
  sousTitre: 'Avant : À découvrir dans Mes pistes. Après : la fenêtre, ses quatre onglets, et le clavier (↑ ↓, G, X, « / »).',
  avant: [[avant('04-decouvrir--1280'), 'À découvrir'], [avant('05-decouvrir-apercu--1280'), 'L’aperçu d’une entreprise']],
  apres: [[A('p1-liste'), '1. Trouver : la liste, l’entreprise ouverte à droite'], [A('p2-clavier'), '2. ↓ ↓ puis G : gardée, sans la souris']] });
console.log('planches dans ' + OUT + ' · ERREURS ' + etat.erreurs.length);
