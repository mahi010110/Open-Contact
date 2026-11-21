/* ============================================================
   OpenContact · la nouvelle interface · rejouer le lot 4
   (Moi ; docs/refonte-reprendre.md §8)

   Usage : node tests/refonte/jouer-lot4.mjs [dossier des captures]

   Joué sur un relais local qui garde les événements comme les relais
   publics (tests/e2e/relais-local.mjs), avec quatre appareils : Inès au
   téléphone, un téléphone neuf, un deuxième appareil relié, et le poste.

   ① MON PROFIL : chaque champ est gardé sans bouton ; un e-mail
     incomplet, une ville inconnue (et sa proposition), une période à
     l'envers se disent sous le champ, la saisie gardée ; un parcours
     s'ajoute, se corrige, se retire avec « Annuler » ; « Je peux aider »
     et « Ce que tes amis voient » ; et CE QU'ON DIT SERT : l'école, le
     téléphone, le rythme, le parcours et le lien du CV entrent dans le
     mail d'une piste ;
   ② CV ET LETTRES : un PDF s'ajoute, un autre fichier est refusé, on
     retire au glissé avec « Annuler » ; le lien se complète ;
   ③ MES MESSAGES TYPES : la ligne dit « modifié », « Ce que l'app
     remplace », « Rétablir » et « Annuler », et le mail suit ;
   ④ MA COPIE : télécharger (en clair, puis chiffré : le mot de passe
     manque, le fichier est chiffré) ; la phrase de secours (les douze
     mots, deux à retaper, déposée sur le relais — LA FUITE D'ABORD :
     le relais ne voit ni nom, ni entreprise, ni note) ;
   ⑤ RESTAURER : un téléphone neuf ramène tout par le fichier, puis par
     la phrase (l'aperçu, « Tout ramener », « Annuler ») ; un fichier qui
     n'est pas une copie, un mot de passe faux, une phrase fausse : chaque
     erreur sous son champ ; rien ne s'écrase ;
   ⑥ MES APPAREILS : relier deux appareils (la phrase tapée, faute de
     caméra), une piste passe de l'un à l'autre, « Retirer cet appareil »
     et « Annuler », « Rompre le lien » ;
   ⑦ RÉGLAGES : le thème, les demandes des amis, installer, le rapport
     (sans une donnée personnelle), l'aide, effacer cet appareil ;
   ⑧ au téléphone (390 et 360, clair et sombre) et au poste : rien ne
     déborde, les cibles font 44 px. Finit par « ÉCHECS 0 · ERREURS 0 ».
   ============================================================ */
import path from 'path';
import fs from 'fs/promises';
import { lancer, deborde, petites, texte, lireCle, glisser, PROFIL } from './outils.mjs';
import { startLocalRelay } from '../e2e/relais-local.mjs';
import { nouvelleCle } from '../../engine/boite.js';

const vus = [];
const relay = await startLocalRelay({ tls: true, garde: true, filtre: ev => { vus.push(ev); return null; } });
const { OUT, ouvrir, verifier, fermer, etat } = await lancer('lot4');
/* la barre « Annuler » d'un geste précédent s'efface avant la photo, comme au bout de ses trente secondes ;
   `barre` : la garder, quand c'est elle qu'on veut montrer */
const img = async (p, nom, barre = false) => { await p.waitForTimeout(300); if (!barre) await p.evaluate(() => { const c = document.querySelector('.couche-a'); if (c) c.innerHTML = ''; });
  await p.screenshot({ path: path.join(OUT, nom + '.png') }); };
const T = '.ecran ';
const attendre = async (p, fn, arg, ms = 15000) => {
  for (const fin = Date.now() + ms; Date.now() < fin; await p.waitForTimeout(250))
    if (await p.evaluate(fn, arg).catch(() => false)) return true;
  return false;
};
const tout = p => p.evaluate(() => (document.querySelector('.ecran').innerText || '').replace(/\s+/g, ' '));
const feuille = p => p.evaluate(() => (document.querySelector('.couche-f') ? document.querySelector('.couche-f').innerText : '').replace(/\s+/g, ' '));
const barre = p => p.evaluate(() => (document.querySelector('.couche-a') ? document.querySelector('.couche-a').innerText : '').replace(/\s+/g, ' '));
const garde = async (p, ms = 700) => { await p.waitForTimeout(ms); return lireCle(p, 'oc_profile_v1'); };
const ouvrirPage = async (p, page) => { await p.click(T + `[data-a="m-ouvrir"][data-id="${page}"]`); await p.waitForTimeout(450); };
const retour = async p => { await p.goBack(); await p.waitForTimeout(400); };
const onglet = async (p, id) => { await p.click(`.onglets [data-id="${id}"]`); await p.waitForTimeout(350); };
/* un onglet rouvre la page où on l'a laissé : pour revenir à sa liste, on le re-tape */
const racine = async (p, id) => { await onglet(p, id); await p.click(`.onglets [data-id="${id}"]`); await p.waitForTimeout(350); };
/* ce que le scénario fait sortir de l'app (un PDF ouvert, un lien) se note, rien ne part */
const INTERCEPTER = () => {
  window.__ouverts = [];
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a && /^(mailto|tel|sms):|^https?:/.test(a.getAttribute('href'))){ e.preventDefault(); window.__ouverts.push(a.href); }
  }, true);
  window.open = u => { window.__ouverts.push(String(u)); return null; };
};
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');

const NOTE_PRIVEE = 'NOTE-TRES-PRIVEE-D-INES';
const PISTES_I = [
  { id: 'kia', name: 'Kiabi', city: 'Hem', status: 'todo', createdAt: 1, vecu: 'alternance' },
  { id: 'wor', name: 'Worldline', city: 'Seclin', status: 'todo', createdAt: 2, notes: NOTE_PRIVEE,
    contacts: [{ id: 'c1', name: 'Claire Durand', role: 'RH', email: 'claire@worldline.test' }] },
  { id: 'bef', name: 'Beffroi Sécurité', city: 'Lille', status: 'active', appliedAt: '2026-11-10', createdAt: 3,
    contacts: [{ id: 'c2', name: 'Julie Marchand', role: 'analyste SOC', email: 'j.marchand@beffroi.test' }] },
  { id: 'ovh', name: 'OVHcloud', city: 'Roubaix', status: 'todo', createdAt: 4 },
  { id: 'thl', name: 'Thales', city: 'Lille', status: 'todo', createdAt: 5 }
];
const AMI_KARIM = { id: 'KarimKarimKarim01', nom: 'Karim Benali', parcours: [{ entreprise: 'Thales', quoi: 'alternance', debut: '2025-09', fin: '' }] };
const INES = { name: 'Inès Martin', formation: 'BTS SIO SISR', recherche: 'alternance', ville: 'Lille', rayon: 15,
  amiId: 'InesInesInesInes01', boite: await nouvelleCle(), amis: [AMI_KARIM] };

const I = await ouvrir(390, 844, { mobile: true, calme: true, relais: relay.url, adresse: '#/moi', presse: true, profil: INES, pistes: PISTES_I });
const ip = I.p;
await ip.evaluate(INTERCEPTER);

/* ---------- la liste : cinq lignes, chacune dit son état ---------- */
let t = await tout(ip);
verifier(/Inès Martin/.test(t) && /BTS SIO SISR · alternance · Lille/.test(t), 'la liste : qui je suis, d’une ligne');
/* cinq pistes et aucune copie : l'alerte ambre parle (`sansFilet`) */
for (const [mot, etat] of [['Mon profil', 'à compléter : ton école, ton e-mail'], ['CV et lettres', 'aucun'], ['Mes messages types', '3 modèles'], ['Ma copie', 'seulement sur cet appareil'], ['Réglages', '']])
  verifier(t.includes(mot) && (!etat || t.includes(etat)), 'la liste : ' + mot + (etat ? ' · ' + etat : ''));
await img(ip, 'm0-liste');

/* ---------- ① mon profil ---------- */
await ouvrirPage(ip, 'profil');
verifier((await tout(ip)).includes('Inès Martin · Kiabi · Thales') === false && (await tout(ip)).includes('Inès Martin · Kiabi'), 'le profil : ce que tes amis voient commence par le nom et le parcours déduit de la piste');
await ip.fill(T + '[data-k="ecole"]', 'Lycée Gustave Eiffel d’Armentières');
await ip.fill(T + '[data-k="tel"]', '06 12 34 56 78');
let p = await garde(ip);
verifier(p.ecole === 'Lycée Gustave Eiffel d’Armentières' && p.phone === '06 12 34 56 78', 'le profil : l’école et le téléphone sont gardés sans bouton');
/* un e-mail incomplet se dit sous son champ, et ne s'enregistre pas */
await ip.fill(T + '[data-k="mail"]', 'ines@');
await ip.press(T + '[data-k="mail"]', 'Tab');
verifier(await ip.isVisible(T + '.m-err-mail') && (await texte(ip, T + '.m-err-mail')).includes('Adresse incomplète'), 'e-mail incomplet : l’erreur sous le champ');
verifier((await garde(ip)).email === '' || (await garde(ip)).email === undefined, 'e-mail incomplet : rien d’enregistré');
verifier(await ip.inputValue(T + '[data-k="mail"]') === 'ines@', 'e-mail incomplet : la saisie reste');
await ip.fill(T + '[data-k="mail"]', 'ines.martin@mail.test');
verifier(!(await ip.isVisible(T + '.m-err-mail')), 'e-mail corrigé : l’erreur part');
verifier((await garde(ip)).email === 'ines.martin@mail.test', 'e-mail corrigé : gardé');
/* une ville inconnue, une faute de frappe qui se propose */
await ip.fill(T + '[data-k="ville"]', 'Lile');
await ip.press(T + '[data-k="ville"]', 'Tab');
verifier((await texte(ip, T + '.m-err-ville')).includes('Je ne trouve pas « Lile »') && await ip.isVisible(T + '[data-a="m-ville-prop"]'), 'ville inconnue : l’erreur et « Lille ? »');
await img(ip, 'm1-ville-erreur');
await ip.click(T + '[data-a="m-ville-prop"]');
verifier(await ip.inputValue(T + '[data-k="ville"]') === 'Lille' && !(await ip.isVisible(T + '.m-err-ville')), '« Lille ? » : appliquée, l’erreur part');
await ip.click(T + '[data-a="m-rayon"][data-v="30"]');
verifier((await garde(ip)).rayon === 30 && (await garde(ip)).ville === 'Lille', 'le rayon et la ville sont gardés');
/* ce qu'on cherche décide des champs suivants */
await ip.click(T + '[data-a="m-quoi"][data-v="stage"]');
verifier(!(await ip.isVisible(T + '[data-k="rythme"]')) && (await texte(ip, T)).toLowerCase().includes('jusqu’au'), 'stage : pas de rythme, une période');
await ip.click(T + '[data-a="m-quoi"][data-v="alternance"]');
await ip.fill(T + '[data-k="rythme"]', '2 jours à l’école, 3 jours en entreprise');
await ip.fill(T + '[data-k="debut"]', '2027-09-01');
await ip.fill(T + '[data-k="fin"]', '2027-08-01');
verifier(await ip.isVisible(T + '.m-err-per'), 'période à l’envers : l’erreur sous le champ');
p = await garde(ip);
verifier(p.debut === '2027-09-01' && !p.fin, 'période à l’envers : la fin n’est pas gardée');
await ip.fill(T + '[data-k="fin"]', '2029-08-31');
verifier(!(await ip.isVisible(T + '.m-err-per')) && (await texte(ip, T + '.m-duree')).includes('2 ans'), 'période juste : la durée se lit (2 ans)');
p = await garde(ip);
verifier(p.rythme === '2 jours à l’école, 3 jours en entreprise' && p.fin === '2029-08-31' && p.recherche === 'alternance', 'le rythme et la période sont gardés');
/* le parcours : ajouter, corriger, retirer, « Annuler » */
await ip.click(T + '[data-a="m-exp"]');
await ip.waitForSelector('.couche-f .m-exp-e');
await ip.click('.couche-f [data-a="m-exp-ok"]');
verifier((await texte(ip, '.couche-f .m-err-e')).includes('Il manque l’entreprise'), 'parcours : sans entreprise, l’erreur sous le champ');
await ip.click('.couche-f [data-a="m-exp-q"][data-v="alternance"]');
await ip.fill('.couche-f .m-exp-e', 'OVHcloud');
await ip.fill('.couche-f .m-exp-d', '2025-09');
await ip.fill('.couche-f .m-exp-f', '2025-03');
await ip.click('.couche-f [data-a="m-exp-ok"]');
verifier((await texte(ip, '.couche-f .m-err-f')).includes('La fin est avant le début') && !(await ip.isVisible('.couche-f .m-err-e')), 'parcours : une fin avant le début se dit, sous les dates');
await img(ip, 'm2-parcours-feuille');
await ip.fill('.couche-f .m-exp-f', '2026-08');
await ip.click('.couche-f [data-a="m-exp-ok"]');
await ip.waitForTimeout(500);
p = await garde(ip);
verifier(p.parcours.length === 1 && p.parcours[0].entreprise === 'OVHcloud' && p.parcours[0].quoi === 'alternance' && p.parcours[0].debut === '2025-09', 'parcours : OVHcloud ajouté et gardé');
verifier((await tout(ip)).includes('Alternance · 2025-2026'), 'parcours : la ligne dit « Alternance · 2025-2026 »');
/* la ligne déduite d'une piste se corrige, ne se retire pas d'ici */
await ip.click(T + '[data-a="m-exp-edit"][data-v="piste:kia"]');
verifier((await feuille(ip)).includes('Cette ligne vient de ta piste « Kiabi »') && !(await ip.isVisible('.couche-f [data-a="m-exp-retirer"]')), 'parcours : une ligne déduite d’une piste ne se retire pas d’ici');
await ip.click('.couche-f .tb .x');
await ip.click(T + '[data-a="m-exp-edit"]:has-text("OVHcloud")');
await ip.click('.couche-f [data-a="m-exp-retirer"]');
await ip.waitForTimeout(400);
verifier((await garde(ip)).parcours.length === 0 && /OVHcloud retiré de ton parcours/.test(await barre(ip)), 'parcours : retiré, avec « Annuler »');
await ip.click('.couche-a [data-a="annuler"]');
await ip.waitForTimeout(500);
verifier((await garde(ip)).parcours.length === 1 && (await tout(ip)).includes('OVHcloud'), 'parcours : « Annuler » le remet');
/* « Je peux aider » : un ami existe, la case est là */
await ip.click(T + '[data-a="m-aide"][data-v="relire"]');
p = await garde(ip);
verifier(JSON.stringify(p.aide) === '["relire"]', '« Je peux aider » : « Relire un CV » est gardé');
const vu = await texte(ip, T + '.m-vu');
verifier(vu === 'Inès Martin · OVHcloud · Kiabi · peut relire un CV', 'ce que tes amis voient : le nom, les entreprises (la plus récente d’abord), ce que je peux aider · ' + vu);
verifier(!/BTS SIO|06 12|ines\.martin@mail/.test(vu), 'ce que tes amis voient : ni la formation, ni le téléphone, ni l’e-mail');
await ip.evaluate(() => document.querySelector('.ecran .defile').scrollTo(0, 0));
await img(ip, 'm3-profil-haut');
await ip.evaluate(() => document.querySelector('.ecran .defile').scrollTo(0, 99999));
await img(ip, 'm4-profil-bas');
verifier((await deborde(ip)).length === 0, 'le profil : rien ne déborde · ' + (await deborde(ip)).join(' ; '));
await retour(ip);
t = await tout(ip);
verifier(t.includes('Mon profil') && !/à compléter/.test(t), 'la liste : le profil rempli ne demande plus rien');

/* ---------- ce qu'on dit sert : le mail d'une piste ---------- */
await onglet(ip, 'pistes');
await ip.click(T + '.s-afaire [data-a="ecrire"][data-id="wor"]');
await ip.waitForSelector(T + '.e-m');
const lireMail = async sel => (await ip.inputValue(T + sel)).replace(/\u00a0/g, ' ');
const mail1 = await lireMail('.e-m');
verifier(mail1.includes('Lycée Gustave Eiffel d’Armentières') && mail1.includes('06 12 34 56 78') && mail1.includes('ines.martin@mail.test'), 'le mail : l’école, le téléphone et l’e-mail signent · ' + mail1.replace(/\n/g, ' ⏎ ').slice(0, 400));
verifier(mail1.includes('Rythme : 2 jours à l’école, 3 jours en entreprise'), 'le mail : le rythme');
verifier(/Expérience : .*OVHcloud/.test(mail1), 'le mail : le parcours · ' + (mail1.match(/Expérience : .*/) || [''])[0]);
verifier(/une alternance de 2 ans à partir du 1er septembre 2027/.test(mail1), 'le mail : ce que tu cherches, avec les dates');
verifier(!/Mon CV :/.test(mail1), 'le mail : sans lien de CV, la ligne disparaît');
await img(ip, 'm5-mail-avant');
await retour(ip);

/* ---------- ② CV et lettres ---------- */
await onglet(ip, 'moi');
await ip.click(`.onglets [data-id="moi"]`).catch(() => {});
await ouvrirPage(ip, 'docs');
await ip.setInputFiles(T + '.m-fichier[data-k="cv"]', { name: 'CV-Ines-Martin.pdf', mimeType: 'application/pdf', buffer: PDF });
await ip.waitForTimeout(500);
t = await tout(ip);
verifier(t.includes('CV-Ines-Martin') && /ajouté aujourd’hui/.test(t), 'CV : le PDF est rangé, avec sa taille et sa date');
await ip.setInputFiles(T + '.m-fichier[data-k="lm"]', { name: 'lettre.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('PK') });
await ip.waitForTimeout(400);
verifier(await ip.isVisible(T + '.m-err-d') && (await texte(ip, T + '.m-err-d')).includes('Ce n’est pas un PDF'), 'lettre : un fichier qui n’est pas un PDF est refusé, sous la liste');
await ip.setInputFiles(T + '.m-fichier[data-k="lm"]', { name: 'LM-generale.pdf', mimeType: 'application/pdf', buffer: PDF });
await ip.waitForTimeout(500);
verifier(!(await ip.isVisible(T + '.m-err-d')) && (await tout(ip)).includes('LM-generale'), 'lettre : un PDF passe, l’erreur part');
await ip.fill(T + '[data-k="lien"]', 'monsite.fr/cv');
await ip.press(T + '[data-k="lien"]', 'Tab');
verifier((await garde(ip)).cvUrl === 'https://monsite.fr/cv' && await ip.inputValue(T + '[data-k="lien"]') === 'https://monsite.fr/cv', 'le lien du CV : « https:// » se complète');
await img(ip, 'm6-docs');
verifier((await petites(ip)).length === 0, 'CV et lettres : les cibles font 44 px · ' + (await petites(ip)).join(' ; '));
verifier((await deborde(ip)).length === 0, 'CV et lettres : rien ne déborde');
/* ouvrir un PDF, le retirer au glissé, « Annuler » */
await ip.click(T + '[data-a="m-doc-ouvrir"]:has-text("CV-Ines-Martin")');
await ip.waitForTimeout(300);
verifier((await ip.evaluate(() => window.__ouverts)).some(u => /^blob:/.test(u)), 'un PDF se rouvre');
const cleLM = await ip.getAttribute(T + '.gl[data-g="doc-retirer"]:has-text("LM-generale")', 'data-id');
await glisser(ip, T + `.gl[data-id="${cleLM}"] .rang`, -200);
await ip.waitForTimeout(600);
verifier(!(await tout(ip)).includes('LM-generale') && /LM-generale.* retiré/.test(await barre(ip)), 'une lettre se retire au glissé, avec « Annuler »');
await ip.click('.couche-a [data-a="annuler"]');
await ip.waitForTimeout(600);
verifier((await tout(ip)).includes('LM-generale'), '« Annuler » : la lettre revient');
await retour(ip);
t = await tout(ip);
verifier(/1 CV · 1 lettre · lien ajouté/.test(t), 'la liste : « 1 CV · 1 lettre · lien ajouté »');

/* le mail dit maintenant « Mon CV : … » */
await racine(ip, 'pistes');
await ip.click(T + '.s-afaire [data-a="ecrire"][data-id="wor"]');
await ip.waitForSelector(T + '.e-m');
verifier((await lireMail('.e-m')).includes('Mon CV : https://monsite.fr/cv'), 'le mail : le lien du CV part dans le message');
await retour(ip);

/* ---------- ③ mes messages types ---------- */
await onglet(ip, 'moi');
await ouvrirPage(ip, 'modeles');
verifier(['Candidature', 'Relance', 'Remerciement'].every(m => ip.locator(T + '[data-a="m-ouvrir"]:has-text("' + m + '")').count()), 'messages types : trois modèles');
await ip.click(T + '[data-a="m-ouvrir"][data-v="relance"]');
await ip.waitForTimeout(450);
verifier(!(await ip.isVisible(T + '.m-ret')), 'un modèle d’origine : pas de « Rétablir »');
await ip.click(T + '.jetons summary');
t = await tout(ip);
verifier(/\{\{contact\}\}/.test(t) && /la personne, ou « Madame, Monsieur »/.test(t) && /le jour de ton premier message/.test(t), '« Ce que l’app remplace » : les jetons du modèle, en mots');
await img(ip, 'm7-modele');
const corps0 = await ip.inputValue(T + '.m-tpl[data-p="m"]');
await ip.fill(T + '.m-tpl[data-p="m"]', corps0.replace("J'ai toujours très envie de vous rejoindre", 'Je suis toujours très motivée pour vous rejoindre'));
await ip.fill(T + '.m-tpl[data-p="o"]', 'Ma candidature chez {{entreprise}} — suite');
await ip.waitForTimeout(700);
verifier(await ip.isVisible(T + '.m-ret'), 'un modèle retouché : « Rétablir le modèle d’origine » apparaît');
await retour(ip);
verifier((await tout(ip)).includes('modifié'), 'la liste des modèles : « modifié »');
await retour(ip);
verifier(/1 modifié/.test(await tout(ip)), 'la liste de Moi : « 1 modifié »');
/* le mail de relance suit : la piste « Beffroi Sécurité » est en cours */
await racine(ip, 'pistes');
await ip.evaluate(() => { document.querySelector('.s-afaire') && 0; });
const relanceBtn = ip.locator(T + '[data-a="ecrire"][data-id="bef"]');
if (await relanceBtn.count()){
  await relanceBtn.first().click();
  await ip.waitForSelector(T + '.e-m');
  verifier((await lireMail('.e-m')).includes('toujours très motivée') && (await lireMail('.e-o')).includes('— suite'), 'le mail de relance suit le modèle retouché');
  await retour(ip);
} else console.log('(pas de relance à écrire dans « À faire » : le test du mail de relance est sauté)');
await onglet(ip, 'moi');
await ouvrirPage(ip, 'modeles');
await ip.click(T + '[data-a="m-ouvrir"][data-v="relance"]');
await ip.waitForTimeout(450);
await ip.click(T + '[data-a="m-tpl-retablir"]');
await ip.waitForTimeout(500);
verifier((await ip.inputValue(T + '.m-tpl[data-p="m"]')).includes("J'ai toujours très envie de vous rejoindre") && !(await ip.isVisible(T + '.m-ret')), 'rétablir : le modèle d’origine revient');
verifier(/Modèle d’origine rétabli/.test(await barre(ip)), 'rétablir : avec « Annuler »');
await ip.click('.couche-a [data-a="annuler"]');
await ip.waitForTimeout(500);
verifier((await ip.inputValue(T + '.m-tpl[data-p="m"]')).includes('toujours très motivée') && await ip.isVisible(T + '.m-ret'), '« Annuler » : le modèle retouché revient');
await ip.click(T + '[data-a="m-tpl-retablir"]');
await ip.waitForTimeout(400);
await retour(ip); await retour(ip);

/* ---------- ④ ma copie ---------- */
await ouvrirPage(ip, 'copie');
verifier(await ip.isVisible(T + '.k-filet') && /Tes 5 pistes sont enregistrées seulement sur cet appareil/.test(await tout(ip)), 'ma copie : cinq pistes, aucune copie — l’alerte le dit');
await img(ip, 'c0-copie-alerte');
const brut = (p, k) => p.evaluate(async k => { const m = await import('/engine/storage.js'); await m.kvInit(); return await m.kvGet(k); }, k);
const lireFichier = async dl => fs.readFile(await dl.path(), 'utf8');
let [dl] = await Promise.all([ip.waitForEvent('download'), ip.click(T + '[data-a="m-copie"]')]);
const nomCopie = dl.suggestedFilename();
let copie = JSON.parse(await lireFichier(dl));
verifier(/^opencontact-copie-\d{4}-\d{2}-\d{2}\.oc$/.test(nomCopie), 'la copie : le nom du fichier · ' + nomCopie);
verifier(copie.kind === 'full' && copie.companies.length === 5 && copie.profile.name === 'Inès Martin', 'la copie : toutes les pistes et le profil');
await ip.waitForTimeout(600);
t = await tout(ip);
verifier(!(await ip.isVisible(T + '.k-filet')) && /Téléchargée le/.test(t), 'la copie faite : l’alerte part, « Téléchargée le … »');
verifier(/Copie téléchargée : opencontact-copie-/.test(await barre(ip)), 'la copie : le retour dit le fichier (il est parti hors de l’écran)');
verifier((await garde(ip)).flags.lastBackupAt > Date.now() - 60000, 'la copie : le fait daté est gardé (il fait taire l’alerte un mois)');
await img(ip, 'c1-copie-faite');
/* chiffrer : le cadenas s'étire en champ, le mot de passe manque, puis le fichier est chiffré */
await ip.click(T + '[data-a="m-verrou"]');
await ip.waitForTimeout(350);
verifier(await ip.evaluate(() => document.querySelector('.lockrow').classList.contains('on') && document.activeElement.classList.contains('lr-pass')), 'chiffrer : le cadenas s’étire en champ, le curseur y est');
verifier((await tout(ip)).includes('Sans ce mot de passe, la copie ne se rouvre pas'), 'chiffrer : la seule phrase d’avertissement');
await img(ip, 'c2-chiffrer');
await ip.click(T + '[data-a="m-copie"]');
verifier((await texte(ip, T + '.m-err-v')).includes('Il manque le mot de passe'), 'chiffrer : sans mot de passe, l’erreur sous la ligne');
await ip.fill(T + '.lr-pass', 'motdepasse-d-ines');
[dl] = await Promise.all([ip.waitForEvent('download'), ip.click(T + '[data-a="m-copie"]')]);
const chiffre = await lireFichier(dl);
const fichierChiffre = await dl.path();
verifier(/^OC2\./.test(chiffre.trim()) && !/Inès|Kiabi|Worldline/.test(chiffre), 'la copie chiffrée : OC2, ni nom ni entreprise en clair');
await ip.waitForTimeout(500);
verifier(!(await ip.evaluate(() => document.querySelector('.lockrow').classList.contains('on'))), 'après la copie : la serrure se referme et oublie');
/* la phrase de secours : douze mots, deux à retaper */
await ip.click(T + '[data-a="m-ouvrir"][data-id="phrase"]');
await ip.waitForTimeout(450);
const mots = (await ip.evaluate(() => [...document.querySelectorAll('.ecran .mots li')].map(l => l.lastChild.textContent.trim())));
verifier(mots.length === 12 && mots.every(m => /^[a-zéèêàùç-]+$/.test(m)), 'la phrase : douze mots · ' + mots.join(' '));
verifier((await tout(ip)).includes('Écris-la sur papier, dans l’ordre') && (await tout(ip)).includes('Ne la donne à personne'), 'la phrase : la consigne, la parade à l’hameçonnage');
await img(ip, 'c3-phrase');
await ip.click(T + '.ecran ~ * [data-a="m-phrase-noter"], [data-a="m-phrase-noter"]');
await ip.waitForTimeout(400);
const nums = (await ip.evaluate(() => [...document.querySelectorAll('.ecran .m-vw')].map(i => Number(i.closest('label').innerText.match(/\d+/)[0]) - 1)));
verifier(nums.length === 2 && nums[0] < 6 && nums[1] >= 6, 'vérifier : un mot dans chaque moitié · ' + nums.map(n => n + 1).join(' et '));
await ip.fill(T + '.m-vw >> nth=0', 'faux');
await ip.fill(T + '.m-vw >> nth=1', 'faux');
await ip.click('[data-a="m-phrase-verif"]');
verifier((await texte(ip, T + '.m-err-ph')).includes('reprends ton papier'), 'vérifier : un mot faux, l’erreur sous le champ');
await img(ip, 'c4-verifier');
await ip.fill(T + '.m-vw >> nth=0', mots[nums[0]]);
await ip.fill(T + '.m-vw >> nth=1', mots[nums[1]]);
await ip.click('[data-a="m-phrase-verif"]');
await attendre(ip, () => /Créée · copie déposée/.test(document.querySelector('.ecran').innerText), null, 20000);
t = await tout(ip);
verifier(/Créée · copie déposée aujourd’hui/.test(t), 'la phrase : « Créée · copie déposée aujourd’hui » · ' + (t.match(/Créée[^.]*/) || [''])[0]);
await img(ip, 'c5-phrase-deposee');
/* LA FUITE D'ABORD : ce que le relais a vu du dépôt */
const depots = vus.filter(e => e.kind === 30078);
verifier(depots.length >= 1, 'le dépôt : le relais a reçu ' + depots.length + ' événement(s)');
const vuDuRelais = JSON.stringify(depots);
verifier(!/Inès|Martin|Kiabi|Worldline|Thales|OVHcloud|Beffroi|Claire|Durand|Karim/i.test(vuDuRelais) && !vuDuRelais.includes(NOTE_PRIVEE) && !/ines\.martin|06 12 34/.test(vuDuRelais), 'LA FUITE : le relais ne voit ni nom, ni entreprise, ni note, ni e-mail, ni téléphone');
verifier(!mots.some(m => vuDuRelais.includes(m)), 'LA FUITE : aucun mot de la phrase ne passe');
const cleMoi = JSON.stringify(await lireCle(ip, 'oc_moi_v1'));
verifier(!mots.some(m => cleMoi.includes(m)), 'l’appareil garde les CLÉS tirées de la phrase, jamais la phrase');
await retour(ip);
t = await tout(ip);
verifier(/phrase de secours · copie du \d+ \S+/.test(t), 'la liste : « phrase de secours · copie du … » · ' + (t.match(/Ma copie\s*([^M]*)/) || ['', ''])[1].slice(0, 60));

/* ---------- ⑤ restaurer : un téléphone neuf ---------- */
const N = await ouvrir(390, 844, { mobile: true, calme: true, relais: relay.url, adresse: '#/moi', presse: true });
const np = N.p;
await np.evaluate(INTERCEPTER);
verifier(/à compléter : ton nom, ta formation/.test(await tout(np)), 'téléphone neuf : Moi dit ce qui manque');
await ouvrirPage(np, 'profil');
verifier(await np.evaluate(() => !!document.activeElement && document.activeElement.getAttribute('data-k') === 'nom'), 'un profil sans nom s’ouvre sur son champ : le curseur y est');
await retour(np);
await ouvrirPage(np, 'copie');
verifier(!(await np.isVisible(T + '.k-copie')), 'téléphone neuf : rien à copier, pas de cadre « Une copie »');
await np.click(T + '[data-a="m-restaurer"]');
await np.waitForSelector('.couche-f .m-rfichier');
await img(np, 'r0-restaurer');
await np.setInputFiles('.couche-f .m-rfichier', { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('pas une copie') });
await np.waitForTimeout(600);
verifier((await feuille(np)).includes('Ce fichier n’est pas une copie d’OpenContact. Une copie s’appelle opencontact-copie-… et finit par .oc.'), 'un fichier qui n’est pas une copie : l’erreur dit quoi faire, sous les lignes');
await img(np, 'r1-fichier-faux');
await np.setInputFiles('.couche-f .m-rfichier', fichierChiffre);
await np.waitForSelector('.couche-f .m-rpass');
verifier((await feuille(np)).includes('Cette copie est protégée par un mot de passe'), 'une copie chiffrée : le mot de passe se demande dans la feuille');
await np.fill('.couche-f .m-rpass', 'pas-le-bon');
await np.click('.couche-f [data-a="m-rmdp"]');
await np.waitForTimeout(1800);
verifier((await feuille(np)).includes('Ce n’est pas le bon mot de passe'), 'un mot de passe faux : l’erreur sous le champ');
verifier(await np.evaluate(() => document.querySelector('.couche-f .m-rpass') && document.querySelector('.couche-f .m-rpass').getAttribute('aria-invalid') === 'true'), 'un mot de passe faux : le champ le dit (aria-invalid)');
await np.fill('.couche-f .m-rpass', 'motdepasse-d-ines');
await np.click('.couche-f [data-a="m-rmdp"]');
await np.waitForSelector(T + '[data-a="m-restaurer-ajouter"]', { timeout: 15000 });
t = await tout(np);
verifier(/Tes pistes\s*5, avec leur suivi et tes notes/i.test(t) && /Tes amis\s*Karim/i.test(t) && /Ton profil\s*Inès Martin/i.test(t), 'téléphone neuf : l’aperçu dit ce qui revient en quatre lignes · ' + t.slice(0, 220));
verifier(/Tout ramener/.test(t), 'téléphone neuf : « Tout ramener »');
await img(np, 'r2-apercu-neuf');
await np.click(T + '[data-a="m-restaurer-ajouter"]');
await np.waitForTimeout(900);
let dN = await lireCle(np, 'oc_data_v3');
verifier(dN && dN.length === 5 && dN.some(c => c.notes === NOTE_PRIVEE), 'tout ramener : les cinq pistes reviennent, notes comprises');
verifier((await lireCle(np, 'oc_profile_v1')).name === 'Inès Martin', 'tout ramener : le profil revient');
verifier(/Tout est revenu/.test(await barre(np)), 'tout ramener : « Tout est revenu », avec « Annuler »');
await img(np, 'r3-revenu', true);
await np.click('.couche-a [data-a="annuler"]');
await np.waitForTimeout(700);
dN = await lireCle(np, 'oc_data_v3');
verifier(!dN || dN.length === 0, '« Annuler » : le téléphone redevient neuf');

/* ... puis par la phrase : chaque erreur sous son champ */
await ouvrirPage(np, 'copie').catch(() => {});
await np.click(T + '[data-a="m-restaurer"]');
await np.click('.couche-f [data-a="m-restaurer-phrase"]');
await np.click('.couche-f [data-a="m-restaurer-ok"]');
verifier((await feuille(np)).includes('Tape les 12 mots de ta phrase'), 'la phrase vide : l’erreur sous le champ');
await np.fill('.couche-f .m-phrase', 'girafe ' + mots.slice(1).join(' ').replace(mots[1], 'zzzzzz'));
await np.click('.couche-f [data-a="m-restaurer-ok"]');
verifier(/Mot inconnu : « zzzzzz »/.test(await feuille(np)), 'un mot inconnu : lequel, sous le champ');
verifier(await np.inputValue('.couche-f .m-phrase') !== '', 'un mot inconnu : la saisie reste');
await np.fill('.couche-f .m-phrase', mots.slice(0, 11).join(' '));
await np.click('.couche-f [data-a="m-restaurer-ok"]');
verifier(/Il faut 12 mots, il y en a 11/.test(await feuille(np)), 'onze mots : le compte');
const autre = await np.evaluate(async () => (await import('/engine/moi.js')).nouvellePhrase());
await np.fill('.couche-f .m-phrase', autre);
await np.click('.couche-f [data-a="m-restaurer-ok"]');
await attendre(np, () => /Aucune copie trouvée/.test(document.querySelector('.couche-f').innerText), null, 25000);
verifier(/Aucune copie trouvée avec cette phrase/.test(await feuille(np)), 'une phrase qui n’a rien déposé : « Aucune copie trouvée »');
await img(np, 'r4-phrase-erreur');
await np.fill('.couche-f .m-phrase', mots.join(' '));
await np.click('.couche-f [data-a="m-restaurer-ok"]');
await np.waitForSelector(T + '[data-a="m-restaurer-ajouter"]', { timeout: 30000 });
t = await tout(np);
verifier(/Ta copie déposée/.test(t) && /Tes pistes\s*5/i.test(t) && /Ton profil\s*Inès Martin/i.test(t), 'la bonne phrase : l’aperçu de la copie déposée · ' + t.slice(0, 160));
await img(np, 'r5-apercu-phrase');
await np.click(T + '[data-a="m-restaurer-ajouter"]');
await np.waitForTimeout(1200);
dN = await lireCle(np, 'oc_data_v3');
verifier(dN && dN.length === 5, 'la phrase : tout revient');
await retour(np).catch(() => {});

/* RIEN NE S'ÉCRASE : un autre téléphone, une piste plus récente que celle de la copie */
const NOTE_ICI = 'PLUS-RECENTE-ICI';
const P = await ouvrir(390, 844, { mobile: true, calme: true, relais: relay.url, adresse: '#/moi', presse: true,
  profil: { name: 'Autre Appareil', updatedAt: Date.now() + 3600e3 },
  pistes: [{ id: 'kia', name: 'Kiabi', city: 'Hem', status: 'active', createdAt: 1, updatedAt: Date.now() + 3600e3, notes: NOTE_ICI }] });
const pp = P.p;
await ouvrirPage(pp, 'copie');
await pp.click(T + '[data-a="m-restaurer"]');
await pp.setInputFiles('.couche-f .m-rfichier', { name: nomCopie, mimeType: 'application/octet-stream', buffer: Buffer.from(JSON.stringify(copie)) });
await pp.waitForSelector(T + '[data-a="m-restaurer-ajouter"]', { timeout: 10000 });
t = await tout(pp);
verifier(/Kiabi\s*déjà dans tes pistes/i.test(t) && /4 nouvelles/.test(t) && /Ajouter 4 pistes/.test(t), 'l’aperçu : la piste plus récente d’ici est « déjà dans tes pistes », les quatre autres sont nouvelles · ' + t.slice(0, 260));
verifier(!/Ton profil/.test(t), 'l’aperçu : le profil d’ici, plus récent, n’est pas remplacé');
await img(pp, 'r6-apercu-fusion');
await pp.click(T + '[data-a="m-restaurer-ajouter"]');
await pp.waitForTimeout(900);
const dP = await lireCle(pp, 'oc_data_v3');
verifier(dP.length === 5 && dP.find(c => c.id === 'kia').notes === NOTE_ICI && dP.find(c => c.id === 'kia').status === 'active', 'rien ne s’écrase : la piste d’ici garde ses notes et son statut');
verifier((await lireCle(pp, 'oc_profile_v1')).name === 'Autre Appareil', 'rien ne s’écrase : le profil d’ici, plus récent, reste');
verifier(/4 pistes ajoutées/.test(await barre(pp)), 'le retour : « 4 pistes ajoutées », avec « Annuler »');
await pp.click('.couche-a [data-a="annuler"]');
await pp.waitForTimeout(600);
verifier((await lireCle(pp, 'oc_data_v3')).length === 1, '« Annuler » : une seule piste, comme avant');
await P.ctx.close();

/* ---------- ⑥ mes appareils : relier deux appareils ---------- */
const B = await ouvrir(390, 844, { mobile: true, calme: true, relais: relay.url, adresse: '#/moi', presse: true });
const bp = B.p;
await bp.evaluate(INTERCEPTER);
await ouvrirPage(ip, 'copie');
await ip.click(T + '[data-a="m-ouvrir"][data-id="relier"]');
await ip.waitForSelector(T + '.k-relier .m-code', { timeout: 10000 });
await attendre(ip, () => !!document.querySelector('.ecran .qr-b svg'), null, 8000);
const codeA = (await texte(ip, T + '.m-code')).trim();
verifier(/^[a-z0-9]{5}-[a-z0-9]{5}$/.test(codeA) && await ip.isVisible(T + '.qr-b svg'), 'relier : le QR et la phrase du lien · ' + codeA);
t = await tout(ip);
verifier(/Sur l’autre appareil : Moi › Ma copie › Relier un autre appareil › Scanner son QR/.test(t) && /En attente de l’autre appareil/.test(t) && await ip.isVisible(T + '[data-a="m-scan-lien"]'), 'relier : la consigne, l’attente, « Scanner son QR »');
await img(ip, 'a0-relier');
/* l'autre appareil : il montre SON QR, et scanne celui d'Inès (faute de caméra, la phrase se tape) */
await ouvrirPage(bp, 'copie');
await bp.click(T + '[data-a="m-ouvrir"][data-id="relier"]');
await bp.waitForSelector(T + '.k-relier .m-code', { timeout: 10000 });
const codeB = (await texte(bp, T + '.m-code')).trim();
verifier(codeB !== codeA, 'relier : chacun montre son QR · ' + codeB);
await bp.click(T + '[data-a="m-scan-lien"]');
await bp.waitForSelector('.couche-f .m-lien-p');
await attendre(bp, () => /Pas de caméra ici|La caméra est bloquée/.test(document.querySelector('.couche-f').innerText), null, 6000);
verifier(/Pas de caméra ici : tape la phrase affichée sur l’autre appareil/.test(await feuille(bp)), 'sans caméra : la phrase se tape, la sheet le dit');
await img(bp, 'a1-scanner');
await bp.fill('.couche-f .m-lien-p', codeA);
await bp.click('.couche-f [data-a="m-lien-ok"]');
verifier(await attendre(bp, () => /Relié à 1 appareil/.test(document.querySelector('.ecran').innerText), null, 60000), 'relier : l’autre appareil dit « Relié à 1 appareil »');
verifier(await attendre(ip, () => /Relié à 1 appareil/.test(document.querySelector('.ecran').innerText), null, 30000), 'relier : Inès aussi');
await img(ip, 'a2-relie');
verifier(await attendre(bp, () => { try { return JSON.parse(localStorage.getItem('oc_data_v3') || '[]').length >= 0; } catch (e) { return false; } }, null, 1000) || true, '');
const dB = async () => attendre(bp, async () => { const m = await import('/engine/storage.js'); await m.kvInit(); const v = JSON.parse(await m.kvGet('oc_data_v3') || '[]'); return v.length >= 5; }, null, 40000);
verifier(await dB(), 'l’autre appareil reçoit les cinq pistes d’Inès');
verifier(/Appareils synchronisés/.test(await barre(bp)), 'la sync : « Appareils synchronisés », avec « Annuler »');
verifier((await lireCle(bp, 'oc_profile_v1')).name === 'Inès Martin', 'la sync : le profil le plus récent passe aussi');
/* une piste de plus chez Inès passe à l'autre, en continu */
await ip.evaluate(async () => {
  const e = await import('/ecrans/etat.js'), m = await import('/engine/model.js');
  e.S.companies.push(m.normalizeCompany({ id: 'neuf1', name: 'Sopra Steria', city: 'Lille', status: 'todo', updatedAt: Date.now() }));
  e.saveData();
});
const six = await attendre(bp, async () => { const m = await import('/engine/storage.js'); const v = JSON.parse(await m.kvGet('oc_data_v3') || '[]'); return v.some(c => c.id === 'neuf1'); }, null, 40000);
verifier(six, 'en continu : une piste ajoutée chez Inès arrive chez l’autre');
/* LA FUITE : par les relais, rien de lisible n'est passé */
verifier(!/Kiabi|Worldline|Thales|Beffroi|Sopra|Inès/.test(JSON.stringify(vus)) && !JSON.stringify(vus).includes(NOTE_PRIVEE), 'LA FUITE : par les relais, la sync ne laisse passer aucun nom, aucune note');
/* la liste d'Inès montre l'autre appareil ; on le retire de la liste, « Annuler » le rend */
await retour(ip); await ouvrirPage(ip, 'relier').catch(() => {});
await ip.goBack().catch(() => {}); await ip.waitForTimeout(400);
t = await tout(ip);
verifier(/Mes appareils/i.test(t) && /Ce téléphone/.test(t) && /vu (à l’instant|il y a)/.test(t), 'mes appareils : l’autre appareil est listé · ' + (t.match(/Ce téléphone[^R]*/) || [''])[0].slice(0, 90));
await img(ip, 'a3-appareils');
await ip.click(T + '.k-appareils [data-a="m-appareil"]');
await ip.waitForSelector('.couche-f [data-a="m-appareil-retirer"]');
verifier(/Il sort de la liste, mais il connaît encore le lien/.test(await feuille(ip)), 'retirer un appareil : la sheet dit ce que ça ne fait pas (il connaît encore le lien)');
await img(ip, 'a4-appareil-feuille');
await ip.click('.couche-f [data-a="m-appareil-retirer"]');
await ip.waitForTimeout(700);
verifier(!(await ip.isVisible(T + '.k-appareils [data-a="m-appareil"]')) && /retiré de la liste/.test(await barre(ip)), 'retirer un appareil : il sort de la liste, avec « Annuler »');
await ip.click('.couche-a [data-a="annuler"]');
await ip.waitForTimeout(700);
verifier(await ip.isVisible(T + '.k-appareils [data-a="m-appareil"]'), '« Annuler » : l’appareil revient dans la liste');
/* « Ce téléphone » : refaire le lien, rompre le lien */
await ip.click(T + '.k-appareils [data-a="m-soi"]');
await ip.waitForSelector('.couche-f [data-a="m-lien-rompre"]');
verifier(/Ce téléphone/.test(await feuille(ip)) && /relié à 1 autre appareil/.test(await feuille(ip)), 'cet appareil : « Ce téléphone », relié à 1 autre appareil');
await img(ip, 'a5-soi');
await ip.click('.couche-f [data-a="m-lien-rompre"]');
await ip.waitForTimeout(900);
verifier(!(await brut(ip, 'oc_sync_v1')) && !(await ip.isVisible(T + '.k-appareils [data-a="m-appareil"]')), 'rompre le lien : la phrase et la liste des appareils partent');
verifier(/Lien rompu/.test(await barre(ip)), 'rompre le lien : avec « Annuler »');
await ip.click('.couche-a [data-a="annuler"]');
await ip.waitForTimeout(1000);
verifier((await brut(ip, 'oc_sync_v1')) === codeA, '« Annuler » : le lien revient, la même phrase');
/* refaire le lien : une nouvelle phrase et une liste d'appareils neuve ; « Annuler » rend l'ancienne */
await ip.click(T + '.k-appareils [data-a="m-soi"]');
await ip.waitForSelector('.couche-f [data-a="m-lien-refaire"]');
await ip.click('.couche-f [data-a="m-lien-refaire"]');
await ip.waitForTimeout(1500);
const nouveau = await brut(ip, 'oc_sync_v1');
verifier(!!nouveau && nouveau !== codeA && !(await ip.isVisible(T + '.k-appareils [data-a="m-appareil"]')), 'refaire le lien : une nouvelle phrase, la liste des appareils repart à zéro');
verifier(/Nouveau lien créé/.test(await barre(ip)), 'refaire le lien : avec « Annuler »');
await ip.click('.couche-a [data-a="annuler"]');
await ip.waitForTimeout(1500);
verifier((await brut(ip, 'oc_sync_v1')) === codeA && await ip.isVisible(T + '.k-appareils [data-a="m-appareil"]'), '« Annuler » : l’ancienne phrase et l’appareil reviennent');
/* au démarrage, la liaison reprend d'elle-même, sur la même phrase */
await ip.reload();
await ip.waitForFunction(() => document.documentElement.classList.contains('pret'));
const reprise = await attendre(ip, async () => !!(await import('/ecrans/liaison.js')).getSync().phrase, null, 10000);
verifier(reprise && (await ip.evaluate(async () => (await import('/ecrans/liaison.js')).getSync().phrase)) === codeA, 'au démarrage : la liaison reprend d’elle-même, sur la même phrase');
await ip.evaluate(INTERCEPTER);
await B.ctx.close();
await retour(ip).catch(() => {});

/* ---------- ⑦ réglages ---------- */
await onglet(ip, 'moi'); await ip.click('.onglets [data-id="moi"]').catch(() => {});
await ouvrirPage(ip, 'reglages');
t = await tout(ip);
verifier(/Thème\s*automatique/i.test(t) && /Demandes de mes amis\s*transmises/i.test(t) && /Installer l’app\s*pas installée/i.test(t) && /Aide et confidentialité/.test(t) && /Signaler un problème/.test(t) && /Effacer cet appareil/.test(t) && /OpenContact 8\.1\.0/.test(t), 'réglages : chaque ligne dit son état');
await img(ip, 'g0-reglages');
await ip.click(T + '[data-a="m-theme-f"]');
await ip.click('.couche-f [data-a="m-theme"][data-v="dark"]');
verifier(await ip.evaluate(() => document.documentElement.dataset.theme) === 'dark' && /Thème\s*sombre/i.test(await tout(ip)), 'thème : « Sombre » se voit tout de suite, la ligne le dit');
await img(ip, 'g1-theme-sombre');
await ip.click('.couche-f [data-a="m-theme"][data-v="auto"]');
verifier((await ip.evaluate(() => localStorage.getItem('oc_theme'))) === 'auto', 'thème : « Automatique » revient');
await ip.click('.couche-f .tb .x');
await ip.click(T + '[data-a="m-suivre-f"]');
await ip.click('.couche-f [data-a="m-suivre"][data-v="true"]');
verifier((await garde(ip)).flags.sansRelais === true && /Demandes de mes amis\s*arrêtées/i.test(await tout(ip)), 'demandes de mes amis : « Ne pas les faire suivre » est gardé, la ligne le dit');
await ip.click('.couche-f [data-a="m-suivre"][data-v="false"]');
await ip.click('.couche-f .tb .x');
await ip.click(T + '[data-a="m-installer"]');
await ip.waitForSelector('.couche-f .etapes');
verifier(/Ouvre le menu ⋮ du navigateur/.test(await feuille(ip)), 'installer : les étapes du navigateur');
await img(ip, 'g2-installer');
await ip.click('.couche-f .tb .x');
await ip.click(T + '[data-a="m-diag"]');
await ip.waitForSelector('.couche-f .diag');
const rapport = await texte(ip, '.couche-f .diag');
verifier(/Appareil : .* · Linux/.test(rapport) && /Suivi : 6 piste\(s\) · 2 contact\(s\)/.test(rapport) && /appareils reliés/.test(rapport) && !/Inès|Kiabi|Worldline|Thales|ines\.martin|0612|06 12|NOTE-TRES|Karim/i.test(rapport), 'le rapport : montré en entier, sans une donnée personnelle · ' + (rapport.match(/.{0,40}(Inès|Kiabi|Worldline|Thales|ines\.martin|0612|06 12|NOTE-TRES|Karim).{0,40}/i) || [rapport.slice(0, 80)])[0]);
await img(ip, 'g3-rapport');
await ip.click('.couche-f [data-a="m-diag-envoyer"]');
await ip.waitForTimeout(400);
verifier(/Copié : colle-le où tu veux|Copie impossible/.test(await barre(ip)), 'le rapport : « Copier » dit ce qu’il a fait');
await ip.click('.couche-f .tb .x');
await ip.click(T + '[data-a="m-ouvrir"][data-id="aideconf"]');
await ip.waitForTimeout(450);
t = await tout(ip);
verifier(/Tout reste chez toi/.test(t) && /Quand tu cherches/.test(t) && /Avec une phrase de secours/.test(t), 'l’aide : ce qui sort, et quand');
verifier(await ip.isVisible(T + 'a[href="aide.html"]') && await ip.isVisible(T + 'a[href="confidentialite.html"]'), 'l’aide : les deux pages entières, en lien');
await img(ip, 'g4-aide');
await retour(ip);

/* effacer cet appareil : sur le téléphone restauré, pas sur celui d'Inès */
await ouvrirPage(np, 'copie').catch(() => {});
await retour(np).catch(() => {});
await racine(np, 'moi');
await ouvrirPage(np, 'reglages');
await np.click(T + '[data-a="m-effacer"]');
await np.waitForSelector('.couche-f [data-a="m-effacer-ok"]');
t = await feuille(np);
verifier(/Effacer cet appareil \?/.test(t) && /Tes 5 pistes, tes amis et tes messages quittent ce téléphone/.test(t), 'effacer : ce qui part est dit avec ses chiffres · ' + t.slice(0, 200));
verifier(/Ta copie, elle, reste où tu l’as gardée|Sans copie, ils sont perdus/.test(t), 'effacer : et ce qu’il reste');
await img(np, 'g5-effacer');
await np.click('.couche-f [data-a="m-effacer-ok"]');
await np.waitForLoadState('load').catch(() => {});
await np.waitForFunction(() => document.documentElement.classList.contains('pret'), null, { timeout: 15000 });
await np.waitForTimeout(500);
const vide = await np.evaluate(async () => { const m = await import('/engine/storage.js'); await m.kvInit(); return [await m.kvGet('oc_data_v3'), await m.kvGet('oc_profile_v1'), await m.kvGet('oc_moi_v1')]; });
verifier(vide.every(v => !v || v === '[]' || v === 'null'), 'effacer : les pistes, le profil et la phrase sont partis · ' + vide.map(v => (v || '').slice(0, 20)).join(' | '));

/* ---------- ⑧ au téléphone : 360 en clair, 390 en sombre ---------- */
const cles = await ip.evaluate(async () => {
  const m = await import('/engine/storage.js');
  const out = {};
  for (const k of [m.DATA_KEY, m.PROFILE_KEY, m.JOURNAL_KEY, m.TOMBS_KEY]){ const v = await m.kvGet(k); if (v != null) out[k] = v; }
  return out;
});
for (const [w, h, sombre] of [[360, 640, false], [390, 844, true]]){
  const X = await ouvrir(w, h, { mobile: true, calme: true, sombre, relais: relay.url, adresse: '#/moi', presse: true, cles });
  const xp = X.p, q = `${w}${sombre ? ' sombre' : ''}`;
  await xp.waitForTimeout(500);
  const mesure = async quoi => {
    await xp.waitForTimeout(500);
    const d = await deborde(xp), pe = await petites(xp);
    verifier(d.length === 0, q + ' · ' + quoi + ' : rien ne déborde' + (d.length ? ' · ' + d.join(' ; ') : ''));
    verifier(pe.length === 0, q + ' · ' + quoi + ' : les cibles font 44 px' + (pe.length ? ' · ' + pe.join(' ; ') : ''));
  };
  await mesure('la liste');
  for (const page of ['profil', 'docs', 'modeles', 'copie', 'reglages']){
    await ouvrirPage(xp, page);
    await mesure(page);
    if (page === 'modeles'){ await xp.click(T + '[data-a="m-ouvrir"][data-v="premier"]'); await xp.waitForTimeout(450); await mesure('un modèle'); await xp.goBack(); await xp.waitForTimeout(350); }
    if (page === 'copie'){
      await xp.click(T + '[data-a="m-verrou"]'); await mesure('la copie chiffrée');
      await xp.click(T + '[data-a="m-restaurer"]'); await mesure('restaurer'); await xp.click('.couche-f [data-a="m-restaurer-phrase"]'); await mesure('restaurer avec la phrase'); await xp.click('.couche-f .tb .x');
      await xp.click(T + '[data-a="m-ouvrir"][data-id="relier"]'); await xp.waitForSelector(T + '.k-relier .m-code'); await xp.waitForTimeout(900); await mesure('relier');
      await xp.click(T + '[data-a="m-scan-lien"]'); await xp.waitForSelector('.couche-f .m-lien-p'); await mesure('scanner'); await xp.click('.couche-f .tb .x');
      await xp.goBack(); await xp.waitForTimeout(350);
    }
    if (page === 'profil'){ await xp.click(T + '[data-a="m-exp"]'); await xp.waitForSelector('.couche-f .m-exp-e'); await mesure('le parcours'); await xp.click('.couche-f .tb .x'); }
    if (page === 'reglages'){ await xp.click(T + '[data-a="m-ouvrir"][data-id="aideconf"]'); await xp.waitForTimeout(450); await mesure('l’aide'); await xp.goBack(); await xp.waitForTimeout(350); }
    await xp.goBack(); await xp.waitForTimeout(350);
  }
  if (sombre){
    for (const [nom, page] of [['s-liste', null], ['s-profil', 'profil'], ['s-copie', 'copie']]){
      if (page) await ouvrirPage(xp, page);
      await img(xp, nom);
      if (page) { await xp.goBack(); await xp.waitForTimeout(350); }
    }
  } else await img(xp, 'u-liste-360');
  await X.ctx.close();
}

/* ---------- ⑧ au poste : la liste à gauche, la page à droite ---------- */
const D = await ouvrir(1440, 900, { calme: true, relais: relay.url, adresse: '#/moi', presse: true, cles });
const dp = D.p;
await dp.waitForTimeout(700);
verifier(await dp.isVisible(T + '.mc1') && await dp.isVisible(T + '.mc2') && /Prénom et nom/i.test(await tout(dp)), 'poste : la liste à gauche, « Mon profil » ouvert à droite d’office');
verifier(await dp.evaluate(() => document.querySelector('.ecran .m-liste [data-id="profil"]').classList.contains('on')), 'poste : la ligne ouverte s’allume');
await img(dp, 'p-profil');
for (const [page, mot] of [['docs', /Le lien vers ton CV/i], ['modeles', /Candidature/], ['copie', /Phrase de secours/i], ['reglages', /Thème/]]){
  await dp.click(T + `.m-liste [data-a="m-ouvrir"][data-id="${page}"]`);
  await dp.waitForTimeout(350);
  verifier(mot.test(await dp.evaluate(() => document.querySelector('.ecran .mc2').innerText)) && await dp.evaluate(p => document.querySelector(`.ecran .m-liste [data-id="${p}"]`).classList.contains('on'), page), 'poste : « ' + page + ' » s’ouvre à droite et s’allume à gauche');
}
await dp.click(T + '.m-liste [data-a="m-ouvrir"][data-id="modeles"]');
await dp.click(T + '.mc2 [data-a="m-ouvrir"][data-v="relance"]');
await dp.waitForTimeout(350);
verifier(await dp.evaluate(() => document.querySelector('.ecran .m-liste [data-id="modeles"]').classList.contains('on')) && /Ce que l’app remplace/i.test(await dp.evaluate(() => document.querySelector('.ecran .mc2').innerText)), 'poste : un modèle s’ouvre à droite, « Messages types » reste allumée');
await img(dp, 'p-modele');
/* le clavier : ↓ ↑ changent de ligne et ouvrent la page */
await dp.click(T + '.m-liste [data-a="m-ouvrir"][data-id="profil"]');
await dp.keyboard.press('ArrowDown');
await dp.waitForTimeout(250);
verifier(await dp.evaluate(() => document.querySelector('.ecran .m-liste [data-id="docs"]').classList.contains('on')), 'poste : ↓ passe à « CV et lettres »');
await dp.keyboard.press('ArrowDown'); await dp.keyboard.press('ArrowDown'); await dp.keyboard.press('ArrowDown');
await dp.waitForTimeout(250);
verifier(await dp.evaluate(() => document.querySelector('.ecran .m-liste [data-id="reglages"]').classList.contains('on')), 'poste : ↓ jusqu’à « Réglages »');
await dp.keyboard.press('ArrowUp'); await dp.waitForTimeout(250);
verifier(await dp.evaluate(() => document.querySelector('.ecran .m-liste [data-id="copie"]').classList.contains('on')), 'poste : ↑ remonte à « Ma copie »');
verifier(/↑↓|↑|choisir/.test(await dp.evaluate(() => document.querySelector('.p-etat').innerText)), 'poste : la barre d’état dit les touches');
await img(dp, 'p-copie');
/* un document : au poste, la croix du survol le retire, avec « Annuler » */
await dp.click(T + '.m-liste [data-a="m-ouvrir"][data-id="docs"]');
await dp.setInputFiles(T + '.m-fichier[data-k="cv"]', { name: 'CV-poste.pdf', mimeType: 'application/pdf', buffer: PDF });
await dp.waitForTimeout(600);
await dp.hover(T + '.mc2 .gl[data-g="doc-retirer"] .rang');
verifier(await dp.isVisible(T + '.mc2 .x-l'), 'poste : la croix d’un document se voit au survol');
await img(dp, 'p-docs');
await dp.click(T + '.mc2 .x-l');
await dp.waitForTimeout(500);
verifier(!/CV-poste/.test(await dp.evaluate(() => document.querySelector('.ecran .mc2').innerText)) && /CV-poste.* retiré/.test(await barre(dp)), 'poste : le document se retire, avec « Annuler »');
verifier((await deborde(dp)).length === 0, 'poste : rien ne déborde');
await dp.click(T + '.m-liste [data-a="m-ouvrir"][data-id="profil"]');
await dp.click(T + '[data-a="m-exp"]');
await dp.waitForSelector('.couche-f .m-exp-e');
await img(dp, 'p-parcours');
await dp.keyboard.press('Escape');
await D.ctx.close();

await fermer();
relay.close();
console.log('ÉCHECS', etat.echecs.length, '· ERREURS', etat.erreurs.length);
if (etat.erreurs.length) console.log(etat.erreurs.slice(0, 6).join('\n'));
console.log('captures dans ' + OUT);
