/* ============================================================
   OpenContact · la nouvelle interface · les planches du lot 2
   (Pistes, une piste, écrire), telles que montrées au mainteneur.

   Usage : OC_AVANT=<captures de l'app actuelle> node tests/refonte/planches-lot2.mjs [dossier]
   (les captures : OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs)
   ============================================================ */
import path from 'path';
import { access, mkdir } from 'fs/promises';
import { lancer, PROFIL } from './outils.mjs';
import { ROOT } from '../e2e/outils.mjs';
import { planche } from '../../design/maquettes/app/outils/planche.mjs';

const { OUT, ouvrir, fermer, etat } = await lancer('planches-lot2');
const P = path.join(OUT, 'propres');
await mkdir(P, { recursive: true });
const AV = process.env.OC_AVANT || path.join(ROOT, 'tests/e2e/captures/audit/chromium');
const avant = n => path.join(AV, n + '.png');
try { await access(avant('01-aujourdhui--390')); } catch (e) {
  console.log('Pas de captures de l’app actuelle dans ' + AV + ' : lancer OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs'); process.exit(1);
}
const T = '.ecran ';
const img = async (p, n) => { await p.waitForTimeout(260); await p.screenshot({ path: path.join(P, n + '.png') }); };
const J = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const PISTES = [
  { id: 'hdf', name: 'Hauts-de-France Télécom', city: 'Wasquehal', siren: '812000009', status: 'reply', nextAction: J(1), nextActionText: 'Entretien',
    contacts: [{ id: 'k1', name: 'Élodie Carpentier', role: 'présidente', email: 'e.carpentier@hdf-telecom.fr' }],
    history: [{ d: J(7), t: 'Gardée' }, { d: J(7), t: 'Écrit à Élodie Carpentier, par mail' }, { d: J(5), t: 'Réponse : un entretien' }] },
  { id: 'sep', name: 'Septentrion Cloud', city: 'Marcq-en-Barœul', siren: '812000004', status: 'active', appliedAt: J(7),
    contacts: [{ id: 'k2', name: 'Hugo Vasseur', role: 'directeur général', email: 'h.vasseur@septentrion-cloud.fr' }],
    history: [{ d: J(7), t: 'Gardée' }, { d: J(7), t: 'Écrit à Hugo Vasseur, par mail' }] },
  { id: 'nor', name: 'Nord Infogérance', city: 'Lambersart', siren: '812000002', status: 'todo', createdAt: 1,
    contacts: [{ id: 'k3', name: 'Marc Delattre', role: 'gérant' }], history: [{ d: J(2), t: 'Gardée' }] },
  { id: 'rsn', name: 'Réseaux et Systèmes du Nord', city: 'Lille', siren: '812000001', status: 'todo', createdAt: 2, history: [{ d: J(1), t: 'Gardée' }] },
  { id: 'dat', name: 'Datagora', city: 'Roubaix', siren: '812000006', status: 'active', appliedAt: J(3),
    contacts: [{ id: 'k4', name: 'Sophie Marchal', role: 'gérante' }], history: [{ d: J(3), t: 'Écrit à Sophie Marchal, sur LinkedIn' }] },
  { id: 'wor', name: 'Worldline', city: 'Seclin', status: 'reply', closedReason: 'rejected', history: [{ d: J(2), t: 'Refus' }] }
];
const INTERCEPTER = () => {
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href]');
    if (a && (/^(mailto|tel):/.test(a.href) || a.target === '_blank')) e.preventDefault(); }, true);
  window.open = () => null;
};

{ const { ctx, p } = await ouvrir(390, 844, { mobile: true, echelle: 2, calme: true, profil: PROFIL, pistes: PISTES, adresse: '#/pistes' });
  await p.evaluate(INTERCEPTER);
  await img(p, 't1-pistes');
  await p.click(T + '.s-afaire .r-c[data-id="hdf"]');
  await img(p, 't2-piste');
  await p.goBack(); await p.waitForTimeout(150);
  await p.click(T + '.s-afaire [data-a="ecrire"][data-id="nor"]');
  await p.waitForSelector(T + '.ecr');
  await p.click(T + '.canaux [data-v="mail"]');
  await p.fill(T + '.e-a', 'm.delattre@nord-infogerance.fr');
  await p.click(T + '.pied [data-a="envoyer"]');
  await img(p, 't3-crochet');
  await p.keyboard.type('Vous dépannez les PME de Lambersart depuis quinze ans.');
  await p.click(T + '.pied [data-a="envoyer"]');
  await p.waitForSelector(T + '.suite-b');
  await img(p, 't4-parti');
  await p.click(T + '[data-a="envoye"]');
  await img(p, 't5-suivante');
  await p.click(T + '.onglets [data-id="pistes"]').catch(() => {});
  await p.click('.onglets [data-id="pistes"]');
  await p.click(T + '.s-afaire .r-c[data-id="hdf"]');
  await p.click(T + '[data-a="ev"][data-v="oui"]');
  await p.click(T + '.ck[data-v="contrat"]');
  await p.click('.couche-a [data-a="fermer-annule"]').catch(() => {});
  await img(p, 't6-oui');
  await ctx.close(); }
{ const { ctx, p } = await ouvrir(1440, 900, { echelle: 1, calme: true, profil: PROFIL, pistes: PISTES, adresse: '#/pistes' });
  await p.waitForTimeout(400);
  await img(p, 'p1-pistes');
  await p.click('.pc1 .r-c[data-id="hdf"]');
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(300);
  await img(p, 'p2-relance');
  await ctx.close(); }
await fermer();
const A = n => path.join(P, n + '.png');
await planche({ sortie: path.join(OUT, 'lot2-telephone.png'), reelle: true,
  titre: 'Code, lot 2 au téléphone : Pistes, une piste, écrire',
  sousTitre: 'À gauche l’app d’aujourd’hui. À droite la nouvelle : chaque piste dit quoi faire, et le geste le fait.',
  avant: [[avant('01-aujourdhui--390'), 'Aujourd’hui'], [avant('06-fiche--390'), 'La fiche d’une piste'], [avant('08-ecrire--390'), 'Écrire, par mail seulement']],
  apres: [[A('t1-pistes'), '1. « À faire » : trois lignes, un bouton'], [A('t2-piste'), '2. Une piste : la suite, puis le reste'],
    [A('t3-crochet'), '3. Écrire : le crochet bloque, il se sélectionne'], [A('t4-parti'), '4. Au retour : « C’est parti ? »'],
    [A('t5-suivante'), '5. Puis le rappel et « Suivante »'], [A('t6-oui'), '6. C’est oui : les étapes du contrat']] });
await planche({ sortie: path.join(OUT, 'lot2-ordinateur.png'), poste: true, pile: true,
  titre: 'Code, lot 2 à l’ordinateur : la liste, la piste et le message côte à côte',
  sousTitre: 'Avant : le tableau à trois colonnes et la fiche en fenêtre. Après : on choisit à gauche, on lit au milieu, on écrit à droite.',
  avant: [[avant('02-pistes--1280'), 'Mes pistes : le tableau'], [avant('06-fiche--1280'), 'La fiche d’une piste']],
  apres: [[A('p1-pistes'), '1. Le merci d’après l’entretien, déjà écrit à droite'], [A('p2-relance'), '2. ↓ : la relance de la piste suivante']] });
console.log('planches dans ' + OUT + ' · ERREURS ' + etat.erreurs.length);
