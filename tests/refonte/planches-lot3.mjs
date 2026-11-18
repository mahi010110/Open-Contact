/* ============================================================
   OpenContact · la nouvelle interface · les planches du lot 3
   (Réseau), telles que montrées au mainteneur.

   Usage : OC_AVANT=<captures de l'app actuelle> node tests/refonte/planches-lot3.mjs [dossier]
   (les captures : OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs)

   Joué à deux sur un relais local, comme tests/refonte/jouer-lot3.mjs,
   en haute définition et sans mouvement.
   ============================================================ */
import path from 'path';
import { access, mkdir } from 'fs/promises';
import { lancer, PROFIL } from './outils.mjs';
import { ROOT } from '../e2e/outils.mjs';
import { startLocalRelay } from '../e2e/relais-local.mjs';
import { planche } from '../../design/maquettes/app/outils/planche.mjs';

const relay = await startLocalRelay({ tls: true, garde: true });
const { OUT, ouvrir, fermer, etat } = await lancer('planches-lot3');
const P = path.join(OUT, 'propres');
await mkdir(P, { recursive: true });
const AV = process.env.OC_AVANT || path.join(ROOT, 'tests/e2e/captures/audit/chromium');
const avant = n => path.join(AV, n + '.png');
try { await access(avant('11-reseau--390')); } catch (e) {
  console.log('Pas de captures de l’app actuelle dans ' + AV + ' : lancer OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs'); process.exit(1);
}
const T = '.ecran ';
/* la barre « Annuler » d'un geste précédent s'efface avant la photo,
   comme au bout de ses trente secondes */
const img = async (p, n) => { await p.waitForTimeout(300); await p.evaluate(() => { document.querySelector('.couche-a').innerHTML = ''; });
  await p.screenshot({ path: path.join(P, n + '.png') }); };
const attendre = async (p, fn, ms = 15000) => { for (const fin = Date.now() + ms; Date.now() < fin; await p.waitForTimeout(250)) if (await p.evaluate(fn).catch(() => false)) return true; return false; };
const relever = p => p.evaluate(() => Promise.all([import('/ecrans/boite.js').then(m => m.relever()), import('/ecrans/groupes.js').then(m => m.releverGroupes())]));
const PISTES_I = [
  { id: 'kia', name: 'Kiabi', city: 'Hem', status: 'todo', createdAt: 1, history: [{ d: '2026-11-15', t: 'Gardée' }] },
  { id: 'wor', name: 'Worldline', city: 'Seclin', status: 'todo', createdAt: 2, contacts: [{ id: 'c1', name: 'Claire Durand', role: 'RH', email: 'claire@worldline.test' }] },
  { id: 'bef', name: 'Beffroi Sécurité', city: 'Lille', status: 'active', appliedAt: '2026-11-10', createdAt: 3,
    contacts: [{ id: 'c2', name: 'Julie Marchand', role: 'analyste SOC', email: 'j.marchand@beffroi.test' }] }
];
const PROFIL_K = { name: 'Karim Benali', email: 'karim@prive.test', recherche: 'alternance', formation: 'BTS SIO SLAM', ville: 'Lille',
  parcours: [{ entreprise: 'Kiabi', quoi: 'alternance', debut: '2025-09' }] };
const tel = { mobile: true, echelle: 2, calme: true, relais: relay.url, adresse: '#/reseau', presse: true };
const I = await ouvrir(390, 844, { ...tel, profil: PROFIL, pistes: PISTES_I });
const K = await ouvrir(390, 844, { ...tel, profil: PROFIL_K, pistes: [] });
const ip = I.p, kp = K.p;

/* la classe : créer, rejoindre, s'écrire, donner */
await ip.click(T + '[data-a="r-rejoindre"]');
await ip.click('.couche-f [data-a="f-creer-mode"]');
await ip.fill('.couche-f .r-nomg', 'BTS SIO Lille');
await ip.click('.couche-f [data-a="f-creer"]');
await ip.waitForSelector(T + '.code-g', { timeout: 8000 });
const code = (await ip.textContent(T + '.code-g')).trim();
await kp.click(T + '[data-a="r-rejoindre"]');
await kp.fill('.couche-f .r-code', code);
await kp.click('.couche-f [data-a="f-rejoindre"]');
await kp.waitForSelector('.ecran.conv', { timeout: 8000 });
await kp.fill(T + '.m-in', 'Salut la classe ! Forum alternance jeudi à la CCI, on y va ?');
await kp.click(T + '[data-a="r-envoyer"]');
await kp.waitForTimeout(500);
await kp.goBack(); await kp.waitForTimeout(250);
await ip.goBack(); await ip.waitForTimeout(250);
await relever(ip);
await ip.click(T + '[data-a="r-conv"]');
await ip.waitForSelector('.ecran.conv');
await ip.fill(T + '.m-in', 'Oui ! On s’y retrouve à 14 h, @Karim');
await ip.click(T + '[data-a="r-envoyer"]');
await ip.waitForTimeout(400);
await ip.click(T + '[data-a="r-donner"]');
await ip.waitForSelector(T + '[data-a="r-don-ok"]');
await ip.click(T + '[data-a="r-don-sel"][data-v="bef"]');
await img(ip, 'i-donner');
await ip.click(T + '[data-a="r-don-ok"]');
await ip.waitForSelector('.ecran.conv', { timeout: 8000 });
await ip.goBack(); await ip.waitForTimeout(250);
await relever(kp);
await kp.click(T + '[data-a="r-conv"]');
await kp.waitForSelector(T + '[data-a="r-voir"]', { timeout: 8000 });
await img(kp, 'k-conv');
await kp.click(T + '[data-a="r-voir"]');
await kp.waitForSelector(T + '[data-a="r-prendre"]');
await img(kp, 'k-apercu');
await kp.click(T + '[data-a="r-prendre"]');
await kp.waitForTimeout(300);
await kp.goBack(); await kp.waitForTimeout(250);

/* devenir amis ; demander à Karim depuis la piste */
await kp.click(T + '[data-a="r-ajami"]');
await kp.waitForSelector('.couche-f [data-a="f-envoyer-profil"]', { timeout: 8000 });
await kp.waitForTimeout(400);
await kp.click('.couche-f [data-a="f-envoyer-profil"]');
const profilK = await kp.evaluate(() => navigator.clipboard.readText());
await kp.click('.couche-f .tb .x');
await ip.click(T + '[data-a="r-recevoir"]');
await ip.click('.couche-f [data-a="rc-coller"]');
await ip.fill('.couche-f .r-texte', profilK);
await ip.click('.couche-f [data-a="rc-lire"]');
await ip.waitForSelector('.couche-f [data-a="f-ajouter-ami"]');
await img(ip, 'i-apercu-ami');
await ip.click('.couche-f [data-a="f-ajouter-ami"]');
await ip.click('.onglets [data-id="pistes"]');
await ip.waitForTimeout(300);
await img(ip, 'i-afaire');
await ip.click(T + '.s-afaire [data-a="demande"][data-id="kia"]');
await ip.waitForSelector(T + '[data-a="demander"]');
await img(ip, 'i-recevra');
await ip.click(T + '[data-a="demander"]');
await attendre(ip, () => /Demande envoyée à Karim/.test(document.querySelector('.ecran').innerText));
await relever(kp);
await kp.click('.onglets [data-id="reseau"]').catch(() => {});
await attendre(kp, () => /On te demande/.test(document.querySelector('.ecran').innerText));
await img(kp, 'k-on-te-demande');
await kp.click(T + '[data-a="r-recue"]');
await kp.click('.couche-f [data-a="f-rep-donner"]');
await kp.click('.couche-f [data-a="f-donner"]');
await attendre(kp, () => !document.querySelector('.couche-f .sheet'));
await relever(ip);
await attendre(ip, () => /Karim te donne son contact/.test(document.querySelector('.ecran').innerText));
await img(ip, 'i-recu');
await ip.click(T + '.suite-b [data-a="don"]');
await ip.waitForTimeout(400);
await ip.click('.onglets [data-id="reseau"]');
await ip.waitForTimeout(400);
await img(ip, 'i-reseau');

/* au poste : les mêmes données qu'Inès, dans une fenêtre d'ordinateur */
const cles = await ip.evaluate(async () => {
  const m = await import('/engine/storage.js');
  const out = {};
  for (const k of [m.DATA_KEY, m.PROFILE_KEY, m.RESEAU_KEY, m.GROUPES_KEY, m.MESSAGES_KEY, m.FILS_KEY, m.JOURNAL_KEY]){
    const v = await m.kvGet(k);
    if (v != null) out[k] = v;
  }
  return out;
});
const D = await ouvrir(1440, 900, { echelle: 1, calme: true, relais: relay.url, adresse: '#/reseau', cles });
await D.p.waitForTimeout(600);
await D.p.click('.ecran .rc1 [data-a="r-ami"]');
await D.p.click('.ecran .rc1 .rang.conv[data-id^="g:"]');
await D.p.waitForSelector('.ecran .conv-w');
await img(D.p, 'p-poste');
await D.p.keyboard.press('Escape');
await D.p.click('.ecran .rc1 [data-a="r-demande"]');
await img(D.p, 'p-demande');
await fermer();
relay.close();
const A = n => path.join(P, n + '.png');
await planche({ sortie: path.join(OUT, 'lot3-telephone.png'), reelle: true,
  titre: 'Code, lot 3 au téléphone : Réseau',
  sousTitre: 'À gauche l’app d’aujourd’hui. À droite la nouvelle : les gens, et ce qu’ils t’ouvrent, mènent chacun à un geste.',
  avant: [[avant('11-reseau--390'), 'Réseau'], [avant('36-groupe--390'), 'Un groupe'], [avant('29-amis--390'), 'Mes amis']],
  apres: [[A('i-reseau'), '1. Réseau : mes demandes, les conversations, mes amis'], [A('k-conv'), '2. La classe : on s’écrit, on se donne des pistes'],
    [A('k-apercu'), '3. Des pistes données : l’aperçu, puis « Annuler »'], [A('i-afaire'), '4. « Karim y est en alternance » : lui demander'],
    [A('k-on-te-demande'), '5. Chez Karim : « On te demande »'], [A('i-recu'), '6. Sa réponse revient sur la piste']] });
await planche({ sortie: path.join(OUT, 'lot3-ordinateur.png'), poste: true, pile: true,
  titre: 'Code, lot 3 à l’ordinateur : les gens à gauche, la conversation en fenêtre',
  sousTitre: 'Avant : la boîte des conversations et le groupe en fenêtre. Après : la liste à gauche, ce qu’on ouvre à droite, la conversation posée par-dessus.',
  avant: [[avant('11-reseau--1280'), 'Réseau'], [avant('36-groupe--1280'), 'Un groupe']],
  apres: [[A('p-poste'), '1. Un ami à droite, la classe en fenêtre'], [A('p-demande'), '2. Une demande suivie comme un colis']] });
console.log('planches dans ' + OUT + ' · ERREURS ' + etat.erreurs.length);
if (etat.erreurs.length) console.log(etat.erreurs.slice(0, 5).join('\n'));
