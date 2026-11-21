/* ============================================================
   OpenContact · la nouvelle interface · les planches du lot 4
   (Moi), telles que montrées au mainteneur.

   Usage : OC_AVANT=<captures de l'app actuelle> node tests/refonte/planches-lot4.mjs [dossier]
   (les captures : OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs)

   Joué comme tests/refonte/jouer-lot4.mjs, sur un relais local, en haute
   définition et sans mouvement : le profil rempli, ce qu'il met dans le
   mail, la copie et la phrase, restaurer avec l'aperçu, les réglages ;
   puis le poste.
   ============================================================ */
import path from 'path';
import fs from 'fs/promises';
import { access, mkdir } from 'fs/promises';
import { lancer, lireCle } from './outils.mjs';
import { ROOT } from '../e2e/outils.mjs';
import { startLocalRelay } from '../e2e/relais-local.mjs';
import { planche } from '../../design/maquettes/app/outils/planche.mjs';
import { nouvelleCle } from '../../engine/boite.js';

const relay = await startLocalRelay({ tls: true, garde: true });
const { OUT, ouvrir, fermer, etat } = await lancer('planches-lot4');
const P = path.join(OUT, 'propres');
await mkdir(P, { recursive: true });
const AV = process.env.OC_AVANT || path.join(ROOT, 'tests/e2e/captures/audit/chromium');
const avant = n => path.join(AV, n + '.png');
try { await access(avant('14-moi--390')); } catch (e) {
  console.log('Pas de captures de l’app actuelle dans ' + AV + ' : lancer OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs'); process.exit(1);
}
const T = '.ecran ';
/* la barre « Annuler » d'un geste précédent s'efface avant la photo,
   comme au bout de ses trente secondes */
const img = async (p, n) => { await p.waitForTimeout(350); await p.evaluate(() => { const c = document.querySelector('.couche-a'); if (c) c.innerHTML = '';
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  await p.screenshot({ path: path.join(P, n + '.png') }); };
const attendre = async (p, fn, ms = 20000) => { for (const fin = Date.now() + ms; Date.now() < fin; await p.waitForTimeout(250)) if (await p.evaluate(fn).catch(() => false)) return true; return false; };
const page = async (p, id) => { await p.click(T + `[data-a="m-ouvrir"][data-id="${id}"]`); await p.waitForTimeout(500); };
const retour = async p => { await p.goBack(); await p.waitForTimeout(450); };
const PISTES = [
  { id: 'kia', name: 'Kiabi', city: 'Hem', status: 'todo', createdAt: 1 },
  { id: 'wor', name: 'Worldline', city: 'Seclin', status: 'todo', createdAt: 2,
    contacts: [{ id: 'c1', name: 'Claire Durand', role: 'RH', email: 'claire@worldline.test' }] },
  { id: 'bef', name: 'Beffroi Sécurité', city: 'Lille', status: 'active', appliedAt: '2026-11-10', createdAt: 3,
    contacts: [{ id: 'c2', name: 'Julie Marchand', role: 'analyste SOC', email: 'j.marchand@beffroi.test' }] },
  { id: 'ovh', name: 'OVHcloud', city: 'Roubaix', status: 'todo', createdAt: 4 },
  { id: 'thl', name: 'Thales', city: 'Lille', status: 'todo', createdAt: 5 }
];
const INES = { name: 'Inès Martin', formation: 'BTS SIO SISR', recherche: 'alternance', ville: 'Lille', rayon: 15, rythme: '2 jours à l’école, 3 jours en entreprise',
  debut: '2027-09-01', fin: '2029-08-31', amiId: 'InesInesInesInes01', boite: await nouvelleCle(),
  amis: [{ id: 'KarimKarimKarim01', nom: 'Karim Benali', parcours: [{ entreprise: 'Thales', quoi: 'alternance', debut: '2025-09', fin: '' }] }] };
const tel = { mobile: true, echelle: 2, calme: true, relais: relay.url, adresse: '#/moi', presse: true };
const I = await ouvrir(390, 844, { ...tel, profil: INES, pistes: PISTES });
const ip = I.p;

/* mon profil : ce qu'on remplit, sans bouton */
await page(ip, 'profil');
await ip.fill(T + '[data-k="ecole"]', 'CFA du Nord');
await ip.fill(T + '[data-k="tel"]', '06 12 34 56 78');
await ip.fill(T + '[data-k="mail"]', 'ines.martin@mail.test');
await ip.waitForTimeout(700);
await ip.evaluate(() => document.querySelector('.ecran .defile').scrollTo(0, 120));
await img(ip, 'b2-profil');
await ip.evaluate(() => document.querySelector('.ecran .defile').scrollTo(0, 99999));
await ip.click(T + '[data-a="m-exp"]');
await ip.waitForSelector('.couche-f .m-exp-e');
await ip.fill('.couche-f .m-exp-e', 'Escaut Data');
await ip.fill('.couche-f .m-exp-d', '2025-09');
await ip.fill('.couche-f .m-exp-f', '2025-12');
await ip.click('.couche-f [data-a="m-exp-ok"]');
await ip.waitForTimeout(600);
await img(ip, 'b2b-profil-bas');
await retour(ip);

/* ce qu'on dit sert : le mail */
await ip.click('.onglets [data-id="pistes"]');
await ip.waitForTimeout(400);
await ip.click(T + '.s-afaire [data-a="ecrire"][data-id="wor"]');
await ip.waitForSelector(T + '.e-m');
await ip.evaluate(() => { const d = document.querySelector('.ecran .defile'); d.scrollTop = d.scrollHeight; });
await img(ip, 'b3-mail');
await retour(ip);

/* ma copie : télécharger, la phrase, déposée sur le relais */
await ip.click('.onglets [data-id="moi"]');
await ip.waitForTimeout(350);
await ip.click('.onglets [data-id="moi"]');
await page(ip, 'copie');
const [dl] = await Promise.all([ip.waitForEvent('download'), ip.click(T + '[data-a="m-copie"]')]);
const fichier = await dl.path();
const nomCopie = dl.suggestedFilename();
await ip.click(T + '[data-a="m-ouvrir"][data-id="phrase"]');
await ip.waitForTimeout(500);
const mots = await ip.evaluate(() => [...document.querySelectorAll('.ecran .mots li')].map(l => l.lastChild.textContent.trim()));
await ip.click('[data-a="m-phrase-noter"]');
await ip.waitForTimeout(400);
const nums = await ip.evaluate(() => [...document.querySelectorAll('.ecran .m-vw')].map(i => Number(i.closest('label').innerText.match(/\d+/)[0]) - 1));
await ip.fill(T + '.m-vw >> nth=0', mots[nums[0]]);
await ip.fill(T + '.m-vw >> nth=1', mots[nums[1]]);
await ip.click('[data-a="m-phrase-verif"]');
await attendre(ip, () => /Créée · copie déposée/.test(document.querySelector('.ecran').innerText));
await ip.waitForTimeout(500);
await img(ip, 'b4-copie');

/* restaurer : l'aperçu d'abord, rien n'est effacé (un autre téléphone, une piste plus récente) */
const R = await ouvrir(390, 844, { ...tel, profil: { name: 'Inès Martin', updatedAt: Date.now() + 3600e3 },
  pistes: [{ id: 'kia', name: 'Kiabi', city: 'Hem', status: 'active', createdAt: 1, updatedAt: Date.now() + 3600e3 }] });
const rp = R.p;
await page(rp, 'copie');
await rp.click(T + '[data-a="m-restaurer"]');
await rp.waitForSelector('.couche-f .m-rfichier');
await rp.setInputFiles('.couche-f .m-rfichier', fichier);
await rp.waitForSelector(T + '[data-a="m-restaurer-ajouter"]', { timeout: 10000 });
await img(rp, 'b5-restaurer');
await R.ctx.close();

/* réglages */
await retour(ip);
await page(ip, 'reglages');
await img(ip, 'b6-reglages');
await retour(ip);
await ip.waitForTimeout(600);
await img(ip, 'b1-moi');

/* au poste : la liste à gauche, la page ouverte à droite */
const cles = await ip.evaluate(async () => {
  const m = await import('/engine/storage.js');
  const out = {};
  for (const k of [m.DATA_KEY, m.PROFILE_KEY, m.JOURNAL_KEY, m.TOMBS_KEY, m.MOI_KEY]){ const v = await m.kvGet(k); if (v != null) out[k] = v; }
  return out;
});
const D = await ouvrir(1440, 900, { echelle: 1, calme: true, relais: relay.url, adresse: '#/moi', cles });
await D.p.waitForTimeout(800);
await img(D.p, 'p-profil');
await D.p.click('.ecran .m-liste [data-a="m-ouvrir"][data-id="copie"]');
await D.p.waitForTimeout(500);
await img(D.p, 'p-copie');
await fermer();
relay.close();
const A = n => path.join(P, n + '.png');
await planche({ sortie: path.join(OUT, 'lot4-telephone.png'), reelle: true,
  titre: 'Code, lot 4 au téléphone : Moi',
  sousTitre: 'À gauche l’app d’aujourd’hui. À droite la nouvelle : les cinq lignes que tu as validées, et ce que chacune ouvre, pour de vrai.',
  avant: [[avant('14-moi--390'), 'Moi'], [avant('15-profil--390'), 'Mon profil'], [avant('16-reglages--390'), 'Réglages']],
  apres: [[A('b1-moi'), '1. Cinq lignes, chacune dit son état'], [A('b2-profil'), '2. Mon profil, sans bouton Enregistrer'],
    [A('b3-mail'), '3. Ton école, ton rythme, ton parcours : déjà dans le mail'], [A('b4-copie'), '4. Ma copie : fichier, phrase, appareils'],
    [A('b5-restaurer'), '5. Restaurer : l’aperçu d’abord, rien n’est effacé'], [A('b6-reglages'), '6. Réglages : chaque ligne dit son état']] });
await planche({ sortie: path.join(OUT, 'lot4-ordinateur.png'), poste: true, pile: true,
  titre: 'Code, lot 4 à l’ordinateur : la liste à gauche, la page à droite',
  sousTitre: 'Avant : Moi sur une colonne. Après : la liste à gauche, la page ouverte à droite, et la ligne ouverte s’allume.',
  avant: [[avant('14-moi--1280'), 'Moi']],
  apres: [[A('p-profil'), '1. Mon profil'], [A('p-copie'), '2. Ma copie']] });
console.log('planches dans ' + OUT + ' · ERREURS ' + etat.erreurs.length);
if (etat.erreurs.length) console.log(etat.erreurs.slice(0, 5).join('\n'));
