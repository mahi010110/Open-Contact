/* ============================================================
   OpenContact · la nouvelle interface · les planches du lot 5
   (les états), telles que montrées au mainteneur.

   Usage : OC_AVANT=<captures de l'app actuelle> node tests/refonte/planches-lot5.mjs [dossier]
   (les captures : OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs)

   Joué comme tests/refonte/jouer-lot5.mjs, sur un relais local, en haute
   définition et sans mouvement : le code et l'écran verrouillé, le premier
   jour et le lien d'un camarade, le hors ligne et la fin de séance ; puis
   le poste.
   ============================================================ */
import path from 'path';
import { access, mkdir } from 'fs/promises';
import { lancer } from './outils.mjs';
import { ROOT } from '../e2e/outils.mjs';
import { startLocalRelay } from '../e2e/relais-local.mjs';
import { planche } from '../../design/maquettes/app/outils/planche.mjs';
import { nouvelleCle } from '../../engine/boite.js';
import { createVault, sealValue, makeVaultPhrase } from '../../engine/vault.js';

const relay = await startLocalRelay({ tls: true, garde: true });
const { OUT, ouvrir, fermer, etat } = await lancer('planches-lot5');
const P = path.join(OUT, 'propres');
await mkdir(P, { recursive: true });
const AV = process.env.OC_AVANT || path.join(ROOT, 'tests/e2e/captures/audit/chromium');
const avant = n => path.join(AV, n + '.png');
try { await access(avant('26-verrouillage--390')); } catch (e) {
  console.log('Pas de captures de l’app actuelle dans ' + AV + ' : lancer OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs'); process.exit(1);
}
const T = '.ecran ';
/* `barre` : garder la barre « Annuler », quand c'est elle qu'on montre */
const img = async (p, n, barre = false) => { await p.waitForTimeout(350); await p.evaluate(b => { const c = document.querySelector('.couche-a'); if (c && !b) c.innerHTML = '';
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }, barre);
  await p.screenshot({ path: path.join(P, n + '.png') }); };
const attendre = async (p, fn, ms = 25000) => { for (const fin = Date.now() + ms; Date.now() < fin; await p.waitForTimeout(200)) if (await p.evaluate(fn).catch(() => false)) return true; return false; };
const taper = async (p, code, ou) => { for (const d of code){ await p.click(`${ou} .touche[data-v="${d}"]`); await p.waitForTimeout(35); } await p.waitForTimeout(300); };
const pret = p => attendre(p, () => document.documentElement.classList.contains('pret') && !document.querySelector('.couche-v .verrou'));
const onglet = async (p, id) => { await p.click(`.onglets [data-id="${id}"]`); await p.waitForTimeout(350); };
const racine = async (p, id) => { await onglet(p, id); await p.click(`.onglets [data-id="${id}"]`); await p.waitForTimeout(350); };
async function coffre(pin, phrase, valeurs){
  const { meta, key } = await createVault(pin, phrase, { iter: 20000 });
  const cles = { oc_vault_v1: JSON.stringify(meta) };
  for (const [k, v] of Object.entries(valeurs)) cles[k] = await sealValue(key, k, JSON.stringify(v));
  return cles;
}
const PISTES = [
  { id: 'kia', name: 'Kiabi', city: 'Hem', status: 'todo', createdAt: 1 },
  { id: 'wor', name: 'Worldline', city: 'Seclin', status: 'todo', createdAt: 2,
    contacts: [{ id: 'c1', name: 'Claire Durand', role: 'RH', email: 'claire@worldline.test' }] },
  { id: 'bef', name: 'Beffroi Sécurité', city: 'Lille', status: 'active', appliedAt: '2026-11-10', createdAt: 3,
    contacts: [{ id: 'c2', name: 'Julie Marchand', role: 'analyste SOC', email: 'j.marchand@beffroi.test' }] },
  { id: 'ovh', name: 'OVHcloud', city: 'Roubaix', status: 'todo', createdAt: 4 }
];
const boiteK = await nouvelleCle();
const INES = { name: 'Inès Martin', formation: 'BTS SIO SISR', recherche: 'alternance', ville: 'Lille', rayon: 15, updatedAt: Date.now() - 864e5,
  amiId: 'InesInesInesInes01', boite: await nouvelleCle(),
  amis: [{ id: 'KarimKarimKarim01', nom: 'Karim Benali', cle: boiteK.pub, parcours: [{ entreprise: 'Thales', quoi: 'alternance', debut: '2025-09', fin: '' }] }] };
const tel = { mobile: true, echelle: 2, calme: true, relais: relay.url, presse: true };

/* ---------- le code, et l'écran verrouillé ---------- */
const I = await ouvrir(390, 844, { ...tel, adresse: '#/moi', profil: INES, pistes: PISTES });
const ip = I.p;
await ip.click(T + '[data-a="m-ouvrir"][data-id="reglages"]'); await ip.waitForTimeout(450);
await ip.click(T + '[data-a="m-code-f"]'); await ip.waitForSelector('.couche-f .pave');
await img(ip, 'a1-choisir');
await taper(ip, '280941', '.couche-f'); await taper(ip, '280941', '.couche-f');
await attendre(ip, () => !!document.querySelector('.couche-f .mots'));
const mots = await ip.evaluate(() => [...document.querySelectorAll('.couche-f .mots li')].map(x => x.lastChild.textContent.trim()));
await img(ip, 'a2-phrase');
await ip.click('.couche-f [data-a="c-notee"]'); await ip.waitForTimeout(300);
const idx = await ip.evaluate(() => [...document.querySelectorAll('.couche-f .c-vw')].map(x => Number(x.closest('label').querySelector('.et').textContent.match(/\d+/)[0]) - 1));
const vw = await ip.$$('.couche-f .c-vw');
await vw[0].fill(mots[idx[0]]); await vw[1].fill(mots[idx[1]]);
await ip.click('.couche-f [data-a="c-verif"]');
await attendre(ip, () => !document.querySelector('.couche-f .sheet'));
await ip.click(T + '[data-a="m-code-f"]'); await ip.waitForTimeout(350);
await img(ip, 'a3-protege');
await ip.click('.couche-f [data-a="c-maintenant"]');
await ip.waitForSelector('.couche-v .verrou');
await img(ip, 'a4-verrouille');
await taper(ip, '111111', '.couche-v');
await attendre(ip, () => /Code faux/.test(document.querySelector('.couche-v').innerText) && !document.querySelector('.couche-v .touche:disabled'));
await img(ip, 'a5-faux');
await ip.click('.couche-v [data-a="v-oublie"]'); await ip.waitForTimeout(300);
await ip.fill('.couche-v .v-phrase', mots.slice(0, 11).join(' ') + ' zorglub');
await ip.click('.couche-v [data-a="v-phrase-ok"]'); await ip.waitForTimeout(400);
await img(ip, 'a6-oublie');
await ip.fill('.couche-v .v-phrase', mots.join(' '));
await ip.click('.couche-v [data-a="v-phrase-ok"]');
await attendre(ip, () => /Choisis un nouveau code/.test(document.querySelector('.couche-v').innerText));
await taper(ip, '246813', '.couche-v'); await taper(ip, '246813', '.couche-v');
await pret(ip);

/* ---------- le premier jour : retrouver ce qu'on avait ---------- */
const N = await ouvrir(390, 844, { ...tel });
const np = N.p;
await img(np, 'b1-premier-jour');
await np.click(T + '[data-a="retrouver"]'); await np.waitForTimeout(350);
await img(np, 'b2-retrouver');
await np.click('.couche-f [data-a="m-restaurer-phrase"]'); await np.waitForTimeout(250);
await np.fill('.couche-f .m-phrase', mots.join(' '));
await np.click('.couche-f [data-a="m-restaurer-ok"]');
await attendre(np, () => !!document.querySelector('.ecran [data-a="m-restaurer-ajouter"]'), 30000);
await img(np, 'b3-apercu');
await np.click(T + '[data-a="m-restaurer-ajouter"]');
await attendre(np, () => document.querySelector('.onglets [data-id="pistes"]').classList.contains('on'));
await img(np, 'b4-tout-revenu', true);

/* ---------- arriver par quelqu'un ---------- */
const PISTES_K = [
  { id: 'ovh', name: 'OVHcloud', city: 'Roubaix', status: 'active', appliedAt: '2026-11-18', notes: 'note privée', createdAt: 1,
    contacts: [{ id: 'k1', name: 'Julien Roussel', role: 'responsable de l’équipe réseau', email: 'j.roussel@ovh.test' }] },
  { id: 'nor', name: 'Nord Infogérance', city: 'Lille', status: 'todo', createdAt: 2, contacts: [{ id: 'k2', name: 'Marc Delattre', role: 'gérant', email: 'm.delattre@nord.test' }] },
  { id: 'hdf', name: 'HDF Télécom', city: 'Lille', status: 'todo', createdAt: 3, contacts: [{ id: 'k3', name: 'Élodie Carpentier', role: 'présidente', email: 'e.carpentier@hdf.test' }] }
];
const KARIM = { name: 'Karim Benali', formation: 'BTS SIO SISR', recherche: 'alternance', ville: 'Lille', rayon: 15, amiId: 'KarimKarimKarim01', boite: boiteK,
  amis: [{ id: 'InesInesInesInes01', nom: 'Inès Martin', cle: INES.boite.pub, parcours: [] }] };
const K = await ouvrir(390, 844, { ...tel, adresse: '#/reseau', profil: KARIM, pistes: PISTES_K });
await K.p.click(T + '[data-a="r-donner"]'); await K.p.waitForTimeout(400);
await K.p.click(T + '[data-a="r-don-canal"][data-v="texte"]'); await K.p.waitForTimeout(250);
await K.p.click(T + '[data-a="r-don-ok"]'); await K.p.waitForTimeout(600);
const texte = await K.p.evaluate(() => navigator.clipboard.readText());
await K.ctx.close();
const L = await ouvrir(390, 844, { ...tel, adresse: texte.slice(texte.indexOf('#')) });
await L.p.waitForSelector('.couche-f .sheet');
await img(L.p, 'b5-lien');
await L.p.click('.couche-f [data-a="r-lien-ok"]');
await attendre(L.p, () => document.querySelector('.onglets [data-id="pistes"]').classList.contains('on'));
await img(L.p, 'b6-a-faire', true);
await L.ctx.close();

/* ---------- hors ligne, et la fin de séance ---------- */
await I.ctx.setOffline(true);
await racine(ip, 'trouver');
await img(ip, 'c1-hl-trouver');
await racine(ip, 'pistes');
await ip.click(T + '[data-a="piste"][data-id="wor"]'); await ip.waitForTimeout(450);
const ec = await ip.$(T + '[data-a="ecrire"]');
if (ec){ await ec.click(); await ip.waitForTimeout(450); }
const li = await ip.$(T + '[data-a="canal"][data-v="linkedin"]');
if (li){ await li.click(); await ip.waitForTimeout(350); }
await img(ip, 'c2-hl-linkedin');
await racine(ip, 'reseau');
await ip.click(T + '[data-a="r-demander"]'); await ip.waitForTimeout(300);
await ip.click('.couche-f [data-a="f-demander"]');
await attendre(ip, () => /partira avec le réseau/.test(document.querySelector('.ecran').innerText));
await img(ip, 'c3-hl-demande');
await I.ctx.setOffline(false);
const auj = new Date().toISOString().slice(0, 10);
const F = await ouvrir(390, 844, { ...tel, adresse: '#/pistes', profil: { name: 'Lou Petit', formation: 'BTS SIO SLAM', recherche: 'stage', ville: 'Lille', rayon: 15 },
  pistes: [{ id: 'a1', name: 'Kiabi', city: 'Hem', status: 'active', appliedAt: auj, createdAt: 1 }, { id: 'a2', name: 'Decathlon Digital', city: 'Villeneuve-d’Ascq', status: 'active', appliedAt: auj, createdAt: 2 }] });
await img(F.p, 'c4-fin');
await F.ctx.close();

/* ---------- le poste ---------- */
const PH = makeVaultPhrase();
const G = await ouvrir(1280, 800, { relais: relay.url, calme: true, verrouille: true,
  cles: await coffre('280941', PH, { oc_profile_v1: INES, oc_data_v3: PISTES }) });
await img(G.p, 'p1-verrou');
await G.p.keyboard.type('280941');
await pret(G.p);
await G.ctx.close();
const H = await ouvrir(1280, 800, { relais: relay.url, calme: true, adresse: '#/pistes', profil: { name: 'Lou Petit', formation: 'BTS SIO SLAM', recherche: 'stage', ville: 'Lille', rayon: 15 } });
await img(H.p, 'p2-pistes-vide');
await H.ctx.close();
await fermer();
relay.close();

const A = n => path.join(P, n + '.png');
await planche({ sortie: path.join(OUT, 'lot5-verrou.png'), reelle: true,
  titre: 'Code, lot 5 au téléphone : le code et l’écran verrouillé',
  sousTitre: 'À gauche l’app d’aujourd’hui. À droite la nouvelle : le pavé que tu as validé, pour de vrai — le même coffre que l’app actuelle.',
  avant: [[avant('26-verrouillage--390'), 'Choisir son code']],
  apres: [[A('a1-choisir'), '1. Moi › Réglages : choisir son code'], [A('a2-phrase'), '2. Puis la phrase de secours'],
    [A('a3-protege'), '3. Protégé : verrouiller, retirer'], [A('a4-verrouille'), '4. Verrouillé : rien ne se voit derrière'],
    [A('a5-faux'), '5. Un code faux se dit (cinq, puis une attente)'], [A('a6-oublie'), '6. Code oublié : la phrase, le mot qui cloche']] });
await planche({ sortie: path.join(OUT, 'lot5-premier-jour.png'), reelle: true,
  titre: 'Code, lot 5 au téléphone : le premier jour',
  sousTitre: 'Avant : « J’ai déjà OpenContact » dans un écran vide. Après : sous les trois questions, et le lien d’un camarade ouvre ses pistes.',
  avant: [[avant('30-vide-aujourdhui--390'), 'Le premier jour'], [avant('42-retrouver--390'), 'Retrouver']],
  apres: [[A('b1-premier-jour'), '1. Les questions, et « J’ai déjà OpenContact »'], [A('b2-retrouver'), '2. La phrase, un fichier, l’autre appareil'],
    [A('b3-apercu'), '3. L’aperçu de ce qui revient'], [A('b4-tout-revenu'), '4. Tout est revenu (« Annuler »)'],
    [A('b5-lien'), '5. Le lien de Karim : 3 pistes, et à qui écrire'], [A('b6-a-faire'), '6. « À faire » propose d’écrire']] });
await planche({ sortie: path.join(OUT, 'lot5-hors-ligne.png'), reelle: true,
  titre: 'Code, lot 5 au téléphone : sans réseau, et quand tout est fait',
  sousTitre: 'Chaque écran dit ce qui attend le réseau, là où on le cherche. Une demande faite dans le métro part toute seule au retour du réseau.',
  avant: [[avant('31-vide-pistes--390'), 'Pistes vide']],
  apres: [[A('c1-hl-trouver'), '1. Trouver : l’annuaire attendra'], [A('c2-hl-linkedin'), '2. Un mot LinkedIn se copie'],
    [A('c3-hl-demande'), '3. Une demande partira'], [A('c4-fin'), '4. « C’est tout pour aujourd’hui. »']] });
await planche({ sortie: path.join(OUT, 'lot5-ordinateur.png'), poste: true, pile: true,
  titre: 'Code, lot 5 à l’ordinateur : le verrou en fenêtre, le clavier suffit',
  sousTitre: 'Six chiffres tapés, l’app s’ouvre. Une liste vide n’ouvre plus deux colonnes vides.',
  avant: [[avant('26-verrouillage--1280'), 'Choisir son code']],
  apres: [[A('p1-verrou'), '1. Verrouillé'], [A('p2-pistes-vide'), '2. Pistes, sans piste : une colonne']] });
console.log('planches dans ' + OUT + ' · ERREURS ' + etat.erreurs.length);
if (etat.erreurs.length) console.log(etat.erreurs.slice(0, 5).join('\n'));
