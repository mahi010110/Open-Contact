/* ============================================================
   OpenContact · la nouvelle interface · rejouer le lot 5
   (les états ; docs/refonte-reprendre.md §8)

   Usage : node tests/refonte/jouer-lot5.mjs [dossier des captures]

   Joué sur un relais local qui garde les événements comme les relais
   publics (tests/e2e/relais-local.mjs). Huit appareils : Inès au
   téléphone, un téléphone neuf, Karim qui donne des pistes, un nouveau
   venu qui les reçoit par un lien, un téléphone qu'on laisse, le poste
   verrouillé, le poste vide, la fin de séance.

   ① LE CODE : il se choisit au pavé, deux fois le même, jamais un code
     qu'on devine ; puis la phrase de secours (créée, deux mots à
     retaper). Les données sont scellées sur le disque, la phrase n'est
     écrite nulle part, la copie se dépose — LA FUITE D'ABORD : le relais
     ne voit ni nom, ni entreprise, ni note ;
   ② VERROUILLÉ : rien ne se voit ni ne se touche derrière (« Annuler »
     attend, et sert encore au déverrouillage) ; un code faux se dit ;
     cinq, et une attente, retenue au rechargement ;
   ③ CODE OUBLIÉ : la phrase (chaque erreur sous le champ, la saisie
     gardée), l'effacement proposé, puis un nouveau code ; l'ancien ne
     rouvre plus rien ;
   ④ PROTÉGÉ, le code se redemande : changer de phrase (le coffre suit la
     nouvelle), effacer (renoncer ne fait rien), retirer le code
     (« Annuler » le remet, scellé) ;
   ⑤ SANS TOI : quatre minutes, rien ; plus de cinq, l'app se verrouille ;
   ⑥ LE PREMIER JOUR : « J'ai déjà OpenContact », un fichier qui n'est pas
     une copie, la phrase, l'aperçu, « Tout ramener », l'app s'ouvre sur
     ses pistes ; « Annuler » rend les questions ; l'autre appareil ;
   ⑦ ARRIVER PAR QUELQU'UN : le texte de Karim porte un lien et rien
     d'autre (ni son prénom, ni ses notes, ni son suivi) ; le lien ouvre
     « On te donne 3 pistes », chacune avec la personne à qui écrire ;
     l'adresse s'efface ; « À faire » propose d'écrire ; collé dans
     « Recevoir », le même texte se lit ;
   ⑧ HORS LIGNE : Trouver cherche dans tes pistes, un mot LinkedIn se
     copie, une demande « partira » — et part au retour du réseau ; la
     copie déposée attend le réseau ; au poste, « Hors ligne » ;
   ⑨ LA FIN DE SÉANCE : « C'est tout pour aujourd'hui. » ;
   ⑩ AU POSTE : la fenêtre verrouillée, le clavier suffit, la tabulation
     y reste ; une liste vide n'ouvre pas de colonnes vides ;
   ⑪ 360 et 390, clair et sombre : rien ne déborde, les touches font
     44 px. Finit par « ÉCHECS 0 · ERREURS 0 ».
   ============================================================ */
import path from 'path';
import { lancer, deborde, petites, lireCle, glisser } from './outils.mjs';
import { startLocalRelay } from '../e2e/relais-local.mjs';
import { nouvelleCle, LETTRE_KIND } from '../../engine/boite.js';
import { createVault, sealValue, makeVaultPhrase } from '../../engine/vault.js';
import { extraireOCQ, decodeOCQ } from '../../engine/exchange.js';
import { MOI_KIND } from '../../engine/moi.js';

const vus = [];
const relay = await startLocalRelay({ tls: true, garde: true, filtre: ev => { vus.push(ev); return null; } });
const { OUT, ouvrir, verifier, fermer, etat } = await lancer('lot5');
/* la barre « Annuler » d'un geste précédent s'efface avant la photo ; `barre` : la garder */
const img = async (p, nom, barre = false) => { await p.waitForTimeout(300); if (!barre) await p.evaluate(() => { const c = document.querySelector('.couche-a'); if (c) c.innerHTML = ''; });
  await p.screenshot({ path: path.join(OUT, nom + '.png') }); };
const T = '.ecran ';
const attendre = async (p, fn, arg, ms = 15000) => {
  for (const fin = Date.now() + ms; Date.now() < fin; await p.waitForTimeout(200))
    if (await p.evaluate(fn, arg).catch(() => false)) return true;
  return false;
};
const attendreN = async (fn, ms = 15000) => { for (const fin = Date.now() + ms; Date.now() < fin; await new Promise(r => setTimeout(r, 200))) if (fn()) return true; return false; };
const lire = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/ /g, ' ').replace(/\s+/g, ' ') : ''; }, sel);
const tout = p => lire(p, '.ecran');
const feuille = p => lire(p, '.couche-f');
const verrou = p => lire(p, '.couche-v');
const barreA = p => lire(p, '.couche-a');
const pret = p => attendre(p, () => document.documentElement.classList.contains('pret') && !document.querySelector('.couche-v .verrou'), null, 25000);
const onglet = async (p, id) => { await p.click(`.onglets [data-id="${id}"]`); await p.waitForTimeout(350); };
const racine = async (p, id) => { await onglet(p, id); await p.click(`.onglets [data-id="${id}"]`); await p.waitForTimeout(350); };
const page = async (p, id) => { await p.click(T + `[data-a="m-ouvrir"][data-id="${id}"]`); await p.waitForTimeout(450); };
/* le pavé : `ou` dit lequel (la feuille du code, ou l'écran verrouillé) */
const taper = async (p, code, ou) => { for (const d of code){ await p.click(`${ou} .touche[data-v="${d}"]`); await p.waitForTimeout(35); } await p.waitForTimeout(250); };
/* un code faux : on attend qu'il soit jugé (le pavé se rouvre, ou se tient fermé) */
const faux = async (p, code) => {
  await taper(p, code, '.couche-v');
  await attendre(p, () => { const v = document.querySelector('.couche-v'); return /Trop d’essais/.test(v.innerText) || (/Code faux/.test(v.innerText) && !v.querySelector('.touche:disabled')); });
};
/* ce que le disque garde vraiment sous une clé (IndexedDB, sinon le repli) */
const brut = (p, k) => p.evaluate(k => new Promise(res => {
  const r = indexedDB.open('oc_kv_v1');
  r.onerror = () => res(localStorage.getItem(k));
  r.onsuccess = () => { try { const q = r.result.transaction('kv').objectStore('kv').get(k);
    q.onsuccess = () => res(q.result == null ? localStorage.getItem(k) : String(q.result)); q.onerror = () => res(null); } catch (e) { res(localStorage.getItem(k)); } };
}), k);
/* les touches de l'écran verrouillé et de la feuille, au doigt */
const petitesCouches = p => p.evaluate(() => [...document.querySelectorAll('.couche-v button, .couche-f button')]
  .filter(b => b.offsetParent && b.getBoundingClientRect().height < 43.5).map(b => (b.textContent || b.getAttribute('aria-label')).trim().slice(0, 24) + ' ' + Math.round(b.getBoundingClientRect().height)));
const debordeCouche = p => p.evaluate(() => { const W = document.documentElement.clientWidth;
  return [...document.querySelectorAll('.couche-v *, .couche-f *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > W + 1; }).map(e => e.className).slice(0, 4); });
/* ce qui sort de l'app (un lien, un mail) se note, rien ne part */
const INTERCEPTER = () => {
  window.__ouverts = [];
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a && /^(mailto|tel|sms):|^https?:/.test(a.getAttribute('href'))){ e.preventDefault(); window.__ouverts.push(a.href); }
  }, true);
  window.open = u => { window.__ouverts.push(String(u)); return null; };
};
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
/* un coffre déjà fait, pour un appareil qu'on ouvre verrouillé : les mêmes
   enveloppes que l'app, des valeurs scellées sous les mêmes noms */
async function coffre(pin, phrase, valeurs){
  const { meta, key } = await createVault(pin, phrase, { iter: 20000 });
  const cles = { oc_vault_v1: JSON.stringify(meta) };
  for (const [k, v] of Object.entries(valeurs)) cles[k] = await sealValue(key, k, JSON.stringify(v));
  return cles;
}

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
const boiteKarim = await nouvelleCle();
const AMI_KARIM = { id: 'KarimKarimKarim01', nom: 'Karim Benali', cle: boiteKarim.pub,
  parcours: [{ entreprise: 'Thales', quoi: 'alternance', debut: '2025-09', fin: '' }] };
const INES = { name: 'Inès Martin', formation: 'BTS SIO SISR', recherche: 'alternance', ville: 'Lille', rayon: 15,
  amiId: 'InesInesInesInes01', boite: await nouvelleCle(), amis: [AMI_KARIM], updatedAt: Date.now() - 864e5 };
let t;

/* =================== ① LE CODE =================== */
const A = await ouvrir(390, 844, { mobile: true, calme: true, relais: relay.url, adresse: '#/moi', presse: true, profil: INES, pistes: PISTES_I });
const ap = A.p;
await ap.evaluate(INTERCEPTER);
await page(ap, 'reglages');
verifier(/Code de verrouillage aucun/.test(await tout(ap)), 'réglages : « Code de verrouillage · aucun », en tête');
await ap.click(T + '[data-a="m-code-f"]');
await ap.waitForSelector('.couche-f .pave');
t = await feuille(ap);
verifier(/Choisis ton code/.test(t) && await ap.$$eval('.couche-f .cases i', l => l.length) === 6 && await ap.$$eval('.couche-f .touche', l => l.length) === 11
  && await ap.$$eval('.couche-f .etapes-b i', l => l.length) === 3, 'choisir son code : trois étapes, six cases, le pavé');
verifier(await ap.evaluate(() => document.activeElement && document.activeElement.textContent === 'Choisis ton code'), 'la feuille prend la main sur son titre (un lecteur d’écran entend la question)');
await img(ap, '01-choisir');
await taper(ap, '123456', '.couche-f');
verifier((await feuille(ap)).includes('Trop facile à deviner. Choisis-en un autre.'), 'un code qu’on devine se refuse, sous le pavé');
await taper(ap, '280941', '.couche-f');
verifier(/Encore une fois/.test(await feuille(ap)) && await ap.$$eval('.couche-f .etapes-b i.on', l => l.length) === 2, 'deux fois le même : « Encore une fois », deuxième étape');
await taper(ap, '280942', '.couche-f');
t = await feuille(ap);
verifier(t.includes('Les deux codes ne sont pas les mêmes. Recommence.') && /Choisis ton code/.test(t), 'deux codes différents : on recommence, et l’écran le dit');
await taper(ap, '280941', '.couche-f');
await taper(ap, '280941', '.couche-f');
await attendre(ap, () => !!document.querySelector('.couche-f .mots'));
const mots = await ap.evaluate(() => [...document.querySelectorAll('.couche-f .mots li')].map(x => x.lastChild.textContent.trim()));
t = await feuille(ap);
verifier(mots.length === 12 && /Code oublié, c’est elle qui rouvre l’app\. Écris-la sur papier, dans l’ordre\./.test(t), 'sans phrase de secours, le code la crée : douze mots, et ce qu’elle rouvre');
await img(ap, '02-phrase');
await ap.click('.couche-f [data-a="c-notee"]');
await ap.waitForTimeout(300);
const demandes = async p => p.evaluate(() => [...document.querySelectorAll('.couche-f .c-vw, .ecran .m-vw')].map(x => Number(x.closest('label').querySelector('.et').textContent.match(/\d+/)[0]) - 1));
let idx = await demandes(ap);
for (const c of await ap.$$('.couche-f .c-vw')) await c.fill('zzz');
await ap.click('.couche-f [data-a="c-verif"]');
await ap.waitForTimeout(200);
verifier((await feuille(ap)).includes('Ce n’est pas ça : reprends ton papier.'), 'la phrase se vérifie : deux mots faux, l’erreur sous les champs');
const vw = await ap.$$('.couche-f .c-vw');
await vw[0].fill(mots[idx[0]]); await vw[1].fill(mots[idx[1]]);
await ap.click('.couche-f [data-a="c-verif"]');
await attendre(ap, () => !document.querySelector('.couche-f .sheet'), null, 20000);
verifier(/Code de verrouillage protégé/.test(await tout(ap)), 'protégé : la ligne le dit');
const d3 = await brut(ap, 'oc_data_v3'), pr = await brut(ap, 'oc_profile_v1'), vm = await brut(ap, 'oc_vault_v1');
verifier(String(d3).startsWith('OCV1.') && String(pr).startsWith('OCV1.') && !/Kiabi|Inès|NOTE-TRES/.test(d3 + pr), 'les pistes et le profil sont scellés sur le disque');
verifier(vm && !mots.some(m => vm.includes(m)) && !vm.includes('280941'), 'ni la phrase ni le code ne sont écrits : le coffre n’en garde que des enveloppes');
verifier(await attendreN(() => vus.some(e => e.kind === MOI_KIND)), 'la phrase créée avec le code dépose la copie, scellée');
verifier(!vus.some(e => /Kiabi|Inès|Martin|NOTE-TRES|Worldline/.test(JSON.stringify(e))), 'LA FUITE D’ABORD : le relais ne voit ni nom, ni entreprise, ni note');
await ap.click(T + '[data-a="m-code-f"]');
await ap.waitForTimeout(300);
t = await feuille(ap);
verifier(/Cet appareil est protégé par un code\./.test(t) && /Il se verrouille au bout de 5 minutes sans toi\./.test(t) && /Retirer le code/.test(t) && /Verrouiller maintenant/.test(t),
  'protégé, la feuille dit l’état, le délai, et deux gestes · ' + t.slice(0, 160));
await img(ap, '03-protege');
await ap.click('.couche-f .x');
await ap.waitForTimeout(300);

/* =================== ② VERROUILLÉ =================== */
await racine(ap, 'pistes');
/* une piste rangée dans ses étapes (celles d'« À faire » ne se glissent pas) */
const suppr = await ap.evaluate(() => { const g = document.querySelector('.ecran .gl[data-g="supprimer"]'); return g ? g.getAttribute('data-id') : ''; });
const nomSuppr = (PISTES_I.find(x => x.id === suppr) || {}).name || '?';
await glisser(ap, T + `.gl[data-id="${suppr}"] .rang`, -150);
await ap.waitForTimeout(350);
verifier(new RegExp(nomSuppr + ' supprimée').test(await barreA(ap)), 'une piste supprimée : « Annuler » est là · ' + nomSuppr);
await racine(ap, 'moi'); await page(ap, 'reglages');
await ap.click(T + '[data-a="m-code-f"]'); await ap.waitForTimeout(250);
await ap.click('.couche-f [data-a="c-maintenant"]');
await ap.waitForSelector('.couche-v .verrou');
const cache = await ap.evaluate(() => ({ inert: document.querySelector('#oc').inert, vis: getComputedStyle(document.querySelector('.couche-a')).visibility,
  barre: !!document.querySelector('.couche-a .annule'), nom: document.querySelector('.couche-v [role="dialog"]').getAttribute('aria-label') }));
verifier(cache.inert && cache.vis === 'hidden' && cache.barre && cache.nom === 'OpenContact est verrouillé', 'verrouillé : l’app derrière est inerte, « Annuler » ne se voit pas mais attend · ' + JSON.stringify(cache));
t = await verrou(ap);
verifier(/Verrouillé/.test(t) && /Code oublié \?/.test(t) && !/Thales|Kiabi|Inès|OVHcloud|Worldline|Beffroi/.test(t), 'l’écran verrouillé ne montre rien de ce qu’il cache');
await img(ap, '04-verrouille');
await faux(ap, '111111');
verifier((await verrou(ap)).includes('Code faux.') && !(await ap.$('.couche-v .touche:disabled')), 'un code faux se dit, le pavé se rouvre');
await img(ap, '05-faux');
await taper(ap, '280941', '.couche-v');
await attendre(ap, () => !document.querySelector('.couche-v .verrou'), null, 20000);
verifier(new RegExp(nomSuppr + ' supprimée').test(await barreA(ap)) && await ap.evaluate(() => !document.querySelector('#oc').inert), 'déverrouillé : l’app revient, et « Annuler » sert encore');
await ap.click('.couche-a [data-a="annuler"]');
await ap.waitForTimeout(300);
verifier(((await lireCle(ap, 'oc_data_v3')) || []).some(c => c.id === suppr), '« Annuler » après le verrou : la piste est revenue');
/* cinq codes faux : une attente, retenue au rechargement */
await ap.click(T + '[data-a="m-code-f"]'); await ap.waitForTimeout(250);
await ap.click('.couche-f [data-a="c-maintenant"]');
await ap.waitForSelector('.couche-v .verrou');
for (const c of ['111111', '111112', '111113', '111114', '111115']) await faux(ap, c);
t = await verrou(ap);
verifier(/Trop d’essais\. Réessaie dans (30|29|28) s\./.test(t) && await ap.$$eval('.couche-v .touche:disabled', l => l.length) === 11, 'cinq codes faux : une attente, le pavé tenu fermé · ' + t.slice(0, 80));
await img(ap, '06-attente');
await ap.reload();
await ap.waitForSelector('.couche-v .verrou');
verifier(/Trop d’essais/.test(await verrou(ap)) && !!(await ap.$('.couche-v .touche:disabled')), 'rechargée, l’attente est retenue');
verifier(await attendre(ap, () => !document.querySelector('.couche-v .touche:disabled'), null, 40000), 'l’attente finie, le pavé se rouvre');
await taper(ap, '280941', '.couche-v');
verifier(await pret(ap), 'le bon code rouvre l’app');
verifier(/réglages/i.test(await tout(ap)), 'l’app rouvre là où on était');

/* =================== ③ CODE OUBLIÉ =================== */
await ap.reload();
await ap.waitForSelector('.couche-v .verrou');
await ap.click('.couche-v [data-a="v-oublie"]');
await ap.waitForTimeout(250);
t = await verrou(ap);
verifier(/code oublié/i.test(t) && /ta phrase de secours/i.test(t) && /Sans code ni phrase, ce qui est ici ne se rouvre pas\./.test(t) && /Effacer cet appareil/.test(t) && /Retour/.test(t),
  'code oublié : la phrase, et la seule sortie sans elle · ' + t.slice(0, 160));
verifier(await ap.evaluate(() => document.activeElement && document.activeElement.matches('.v-phrase')), 'code oublié : le champ de la phrase a la main');
await img(ap, '07-oublie');
const essai = async txt => {
  await ap.fill('.couche-v .v-phrase', txt);
  await ap.click('.couche-v [data-a="v-phrase-ok"]');
  await attendre(ap, () => { const e = document.querySelector('.couche-v .v-err-p'); return e && !e.hidden; }, null, 15000);
  return lire(ap, '.couche-v .v-err-p');
};
verifier((await essai('aigle ancre')) === 'Il faut les douze mots : tu en as 2.', 'deux mots : « Il faut les douze mots : tu en as 2. »');
verifier((await essai(mots.slice(0, 11).join(' ') + ' zorglub')) === '« zorglub » n’est pas dans la liste des mots. Vérifie l’orthographe.', 'un mot hors de la liste se nomme');
const envers = mots.slice().reverse().join(' ');
verifier((await essai(envers)) === 'Ces douze mots ne vont pas ensemble dans cet ordre. Vérifie l’ordre.', 'les douze mots dans le désordre : l’ordre se dit');
verifier((await ap.inputValue('.couche-v .v-phrase')) === envers, 'la saisie reste sous l’erreur');
await ap.click('.couche-v [data-a="v-effacer"]');
await ap.waitForTimeout(200);
t = await verrou(ap);
verifier(/Effacer cet appareil \?/.test(t) && /Tu repars de zéro\./.test(t), 'effacer, depuis le verrou : la question, et ce qui ramène le reste');
await img(ap, '08-effacer');
await ap.click('.couche-v [data-a="v-retour"]');
await ap.waitForTimeout(200);
verifier((await ap.inputValue('.couche-v .v-phrase')) === envers, '« Retour » : la phrase tapée est encore là');
await ap.fill('.couche-v .v-phrase', mots.join(' '));
await ap.click('.couche-v [data-a="v-phrase-ok"]');
await attendre(ap, () => /Choisis un nouveau code/.test(document.querySelector('.couche-v').innerText), null, 20000);
verifier(/Choisis un nouveau code/.test(await verrou(ap)) && !/Code oublié \?/.test(await verrou(ap)), 'la bonne phrase : un nouveau code, au même pavé');
await img(ap, '09-nouveau');
await taper(ap, '111111', '.couche-v');
verifier((await verrou(ap)).includes('Trop facile à deviner. Choisis-en un autre.'), 'le nouveau code non plus ne se devine pas');
await taper(ap, '246813', '.couche-v');
verifier(/Encore une fois/.test(await verrou(ap)), 'nouveau code : « Encore une fois »');
await taper(ap, '246813', '.couche-v');
verifier(await pret(ap), 'le nouveau code choisi, l’app s’ouvre');
await ap.reload();
await ap.waitForSelector('.couche-v .verrou');
await faux(ap, '280941');
verifier((await verrou(ap)).includes('Code faux.'), 'l’ancien code ne rouvre plus rien');
await taper(ap, '246813', '.couche-v');
verifier(await pret(ap), 'le nouveau, si');

/* =================== ④ PROTÉGÉ : le code se redemande =================== */
await racine(ap, 'moi'); await page(ap, 'copie');
await ap.click(T + '[data-a="m-ouvrir"][data-id="phrase"]');
await ap.waitForSelector('.couche-f .pave');
verifier(/Ton code, pour changer de phrase/.test(await feuille(ap)), 'changer de phrase, protégé : le code d’abord');
await img(ap, '10-code-redemande');
await taper(ap, '999998', '.couche-f');
await attendre(ap, () => /Code faux/.test(document.querySelector('.couche-f').innerText));
verifier((await feuille(ap)).includes('Code faux.'), 'le code redemandé : faux, il se dit');
await taper(ap, '246813', '.couche-f');
await attendre(ap, () => !!document.querySelector('.ecran .mots'), null, 15000);
const mots2 = await ap.evaluate(() => [...document.querySelectorAll('.ecran .mots li')].map(x => x.lastChild.textContent.trim()));
verifier(mots2.length === 12 && /ni ta copie déposée ni l’app, code oublié, ne se rouvrent/.test(await tout(ap)), 'protégé, la phrase dit aussi qu’elle rouvre l’app');
await ap.click(T + '[data-a="m-phrase-noter"]');
await ap.waitForTimeout(350);
idx = await demandes(ap);
const mv = await ap.$$(T + '.m-vw');
await mv[0].fill(mots2[idx[0]]); await mv[1].fill(mots2[idx[1]]);
await ap.click(T + '[data-a="m-phrase-verif"]');
await attendre(ap, () => !document.querySelector('.ecran .m-vw'), null, 20000);
await ap.waitForTimeout(1500);
const suit = await ap.evaluate(async ([a, b]) => { const m = await import('/ecrans/verrou.js'); return [await m.estPhraseDuCoffre(a), await m.estPhraseDuCoffre(b)]; }, [mots2.join(' '), mots.join(' ')]);
verifier(suit[0] === true && suit[1] === false, 'changer de phrase : le coffre suit la nouvelle, l’ancienne ne rouvre plus rien · ' + suit);
await racine(ap, 'moi'); await page(ap, 'reglages');
await ap.click(T + '[data-a="m-effacer"]'); await ap.waitForTimeout(250);
await ap.click('.couche-f [data-a="m-effacer-ok"]');
await ap.waitForSelector('.couche-f .pave');
verifier(/Ton code, pour effacer/.test(await feuille(ap)), 'effacer, protégé : le code d’abord');
await ap.click('.couche-f .x');
await ap.waitForTimeout(400);
verifier(((await lireCle(ap, 'oc_data_v3')) || []).length === 5, 'renoncer au code : rien n’est effacé');
await ap.click(T + '[data-a="m-code-f"]'); await ap.waitForTimeout(250);
await ap.click('.couche-f [data-a="c-retirer"]'); await ap.waitForTimeout(250);
verifier(/Ton code/.test(await feuille(ap)), 'retirer le code : il se redemande');
await taper(ap, '246813', '.couche-f');
await attendre(ap, () => !document.querySelector('.couche-f .sheet'), null, 20000);
await ap.waitForTimeout(300);
verifier(/Code de verrouillage aucun/.test(await tout(ap)) && /Code retiré/.test(await barreA(ap)) && String(await brut(ap, 'oc_data_v3')).startsWith('['),
  'code retiré : la ligne le dit, « Annuler », les données redeviennent lisibles');
await img(ap, '11-retire', true);
await ap.click('.couche-a [data-a="annuler"]');
await attendre(ap, () => /Code de verrouillage protégé/.test(document.querySelector('.ecran').innerText));
await ap.waitForTimeout(500);
verifier(String(await brut(ap, 'oc_data_v3')).startsWith('OCV1.'), '« Annuler » : le code revient, tout est rescellé');
await ap.click(T + '[data-a="m-code-f"]'); await ap.waitForTimeout(250);
await ap.click('.couche-f [data-a="c-retirer"]'); await ap.waitForTimeout(200);
await taper(ap, '246813', '.couche-f');
await attendre(ap, () => /Code de verrouillage aucun/.test(document.querySelector('.ecran').innerText), null, 20000);
verifier(/Code de verrouillage aucun/.test(await tout(ap)), 'retiré pour de bon');

/* =================== ⑤ SANS TOI =================== */
const PH = makeVaultPhrase();
const PROFIL_E = { name: 'Lou Petit', formation: 'BTS SIO SLAM', recherche: 'stage', ville: 'Lille', rayon: 15 };
const E = await ouvrir(390, 844, { mobile: true, calme: true, horloge: true, verrouille: true, relais: relay.url,
  cles: await coffre('280941', PH, { oc_profile_v1: PROFIL_E, oc_data_v3: [{ id: 'k', name: 'Kiabi', city: 'Hem', status: 'todo', createdAt: 1 }] }) });
await taper(E.p, '280941', '.couche-v');
verifier(await pret(E.p), 'un appareil protégé s’ouvre sur le verrou, et le code le rouvre');
verifier(/Kiabi/.test(await (async () => { await onglet(E.p, 'pistes'); return tout(E.p); })()), 'ce qui était scellé se lit, une fois le code tapé');
await E.p.clock.fastForward('04:00');
await E.p.waitForTimeout(400);
verifier(!(await E.p.$('.couche-v .verrou')), 'quatre minutes sans toi : rien ne se verrouille');
await E.p.clock.fastForward('01:40');
await E.p.waitForTimeout(400);
verifier(!!(await E.p.$('.couche-v .verrou')), 'plus de cinq minutes sans toi : l’app se verrouille seule');
await E.ctx.close();

/* =================== ⑥ LE PREMIER JOUR =================== */
const B = await ouvrir(390, 844, { mobile: true, calme: true, relais: relay.url, presse: true });
const bp = B.p;
t = await tout(bp);
verifier(/tu cherches/i.test(t) && /J’ai déjà OpenContact/.test(t), 'le premier jour : les trois questions, et dessous « J’ai déjà OpenContact »');
await img(bp, '12-premier-jour');
await bp.click(T + '[data-a="retrouver"]');
await bp.waitForTimeout(300);
t = await feuille(bp);
verifier(/Avec ma phrase de secours.*Depuis un fichier.*Depuis mon autre appareil/.test(t), 'retrouver : la phrase, un fichier, l’autre appareil · ' + t);
await img(bp, '13-retrouver');
await bp.setInputFiles('.couche-f .m-rfichier', { name: 'cv.pdf', mimeType: 'application/pdf', buffer: PDF });
await attendre(bp, () => /n’est pas une copie/.test(document.querySelector('.couche-f').innerText));
t = await feuille(bp);
verifier(/Ce fichier n’est pas une copie d’OpenContact/.test(t) && /Depuis mon autre appareil/.test(t), 'un fichier qui n’est pas une copie : dit sous les choix, qui restent');
await bp.click('.couche-f [data-a="m-restaurer-phrase"]');
await bp.waitForTimeout(250);
await bp.fill('.couche-f .m-phrase', 'zorglub');
await bp.click('.couche-f [data-a="m-restaurer-ok"]');
await bp.waitForTimeout(300);
verifier((await feuille(bp)).includes('« zorglub » n’est pas dans la liste des mots. Vérifie l’orthographe.'), 'restaurer : la même erreur de phrase que l’écran verrouillé');
await bp.fill('.couche-f .m-phrase', mots2.join(' '));
await bp.click('.couche-f [data-a="m-restaurer-ok"]');
verifier(await attendre(bp, () => !!document.querySelector('.ecran [data-a="m-restaurer-ajouter"]'), null, 30000), 'la phrase retrouve la copie déposée');
t = await tout(bp);
verifier(/Ta copie déposée/.test(t) && /Tes pistes 5, avec leur suivi et tes notes/.test(t) && /Ton profil Inès Martin/.test(t) && await bp.$eval('.onglets [data-id="trouver"]', a => a.classList.contains('on')),
  'l’aperçu dit ce qui revient, dans Trouver · ' + t.slice(0, 200));
await img(bp, '14-apercu');
await bp.click(T + '[data-a="m-restaurer-ajouter"]');
await attendre(bp, () => document.querySelector('.onglets [data-id="pistes"]').classList.contains('on'), null, 15000);
await bp.waitForTimeout(400);
verifier(/Tout est revenu/.test(await barreA(bp)) && /Kiabi/.test(await tout(bp)), '« Tout ramener » : l’app s’ouvre sur ses pistes, « Tout est revenu » et « Annuler »');
const profB = await lireCle(bp, 'oc_profile_v1');
verifier(profB && profB.name === 'Inès Martin' && profB.ville === 'Lille', 'le profil revient avec la copie · ' + JSON.stringify(profB && { n: profB.name, v: profB.ville, u: profB.updatedAt }));
await img(bp, '15-tout-revenu', true);
await bp.goBack();
await bp.waitForTimeout(500);
t = await tout(bp);
verifier(await bp.$eval('.onglets [data-id="trouver"]', a => a.classList.contains('on')) && !/tu cherches/i.test(t) && !/J’ai déjà OpenContact/.test(t),
  'le retour ramène à Trouver, qui a ses réponses : plus de questions · ' + t.slice(0, 120));
await bp.click('.couche-a [data-a="annuler"]');
await bp.waitForTimeout(600);
verifier(((await lireCle(bp, 'oc_data_v3')) || []).length === 0 && /J’ai déjà OpenContact/.test(await tout(bp)), '« Annuler » : le téléphone redevient neuf, les questions reviennent');
await bp.click(T + '[data-a="retrouver"]'); await bp.waitForTimeout(250);
await bp.click('.couche-f [data-a="m-retrouver-appareil"]');
await bp.waitForTimeout(800);
t = await tout(bp);
verifier(/Relier/.test(t) && await bp.$eval('.onglets [data-id="trouver"]', a => a.classList.contains('on')) && !!(await bp.$('.ecran .m-code')),
  'depuis mon autre appareil : la page qui relie, ouverte là où l’on est · ' + t.slice(0, 120));
await img(bp, '16-autre-appareil');
await bp.goBack(); await bp.waitForTimeout(400);
verifier(/J’ai déjà OpenContact/.test(await tout(bp)), 'le retour : les questions');

/* =================== ⑦ ARRIVER PAR QUELQU'UN =================== */
const NOTE_K = 'NOTE-PRIVEE-DE-KARIM';
const KARIM = { name: 'Karim Benali', formation: 'BTS SIO SISR', recherche: 'alternance', ville: 'Lille', rayon: 15,
  amiId: 'KarimKarimKarim01', boite: boiteKarim, amis: [{ id: 'InesInesInesInes01', nom: 'Inès Martin', cle: INES.boite.pub, parcours: [] }] };
const PISTES_K = [
  { id: 'ovh', name: 'OVHcloud', city: 'Roubaix', status: 'active', appliedAt: '2026-11-18', notes: NOTE_K, createdAt: 1,
    contacts: [{ id: 'k1', name: 'Julien Roussel', role: 'responsable de l’équipe réseau', email: 'j.roussel@ovh.test' }] },
  { id: 'nor', name: 'Nord Infogérance', city: 'Lille', status: 'todo', createdAt: 2,
    contacts: [{ id: 'k2', name: 'Marc Delattre', role: 'gérant', email: 'm.delattre@nord.test' }] },
  { id: 'hdf', name: 'HDF Télécom', city: 'Lille', status: 'todo', createdAt: 3,
    contacts: [{ id: 'k3', name: 'Élodie Carpentier', role: 'présidente', email: 'e.carpentier@hdf.test' }] }
];
const K = await ouvrir(390, 844, { mobile: true, calme: true, presse: true, relais: relay.url, adresse: '#/reseau', profil: KARIM, pistes: PISTES_K });
const kp = K.p;
await kp.click(T + '[data-a="r-donner"]'); await kp.waitForTimeout(400);
await kp.click(T + '[data-a="r-don-canal"][data-v="texte"]'); await kp.waitForTimeout(250);
await kp.click(T + '[data-a="r-don-ok"]'); await kp.waitForTimeout(600);
const envoye = await kp.evaluate(() => navigator.clipboard.readText());
const m = envoye.match(/^3 pistes pour toi sur OpenContact : (http\S+#OCQ1\.[A-Za-z0-9_-]+)$/);
verifier(!!m && m[1].includes('/refonte.html#OCQ1.'), 'le texte donné porte un lien, et une phrase · ' + envoye.slice(0, 90));
const recu = await decodeOCQ(extraireOCQ(envoye));
const dit = JSON.stringify(recu);
verifier(recu.companies.length === 3 && !/Karim|Benali|NOTE-PRIVEE|active|appliedAt|2026-11-18/.test(dit) && /Julien Roussel/.test(dit),
  'LA FUITE D’ABORD : le lien porte les pistes et leurs contacts, ni le prénom de Karim, ni ses notes, ni son suivi');
await kp.click(T + '[data-a="r-don-canal"][data-v="qr"]'); await kp.waitForTimeout(250);
await kp.click(T + '[data-a="r-don-ok"]'); await kp.waitForTimeout(900);
verifier(/Il se scanne, même sans l’app : on voit les pistes avant de les prendre\./.test(await tout(kp)), 'le QR porte le lien : il se scanne même sans l’app');
await K.ctx.close();
const lienK = m ? m[1] : '';
const D = await ouvrir(390, 844, { mobile: true, calme: true, presse: true, relais: relay.url, adresse: lienK.slice(lienK.indexOf('#')) });
const dp = D.p;
await dp.waitForSelector('.couche-f .sheet');
t = await feuille(dp);
verifier(/On te donne 3 pistes/.test(t) && /Julien Roussel, responsable de l’équipe réseau/.test(t) && /Marc Delattre, gérant/.test(t) && /Ajouter les 3 pistes/.test(t),
  'le lien ouvre « On te donne 3 pistes », chacune avec la personne à qui écrire · ' + t.slice(0, 200));
verifier(!/OCQ1/.test(await dp.evaluate(() => location.href)), 'l’adresse s’efface dès qu’elle est lue');
await img(dp, '17-lien');
await dp.click('.couche-f [data-a="r-lien-ok"]');
await attendre(dp, () => document.querySelector('.onglets [data-id="pistes"]').classList.contains('on'));
await dp.waitForTimeout(400);
t = await tout(dp);
verifier(/3 pistes ajoutées/.test(await barreA(dp)) && /à faire/i.test(t) && /HDF Télécom|Nord Infogérance|OVHcloud/.test(t)
  && await dp.$$eval('.ecran .s-afaire [data-a="ecrire"]', l => l.length) > 0, '« Ajouter » : Pistes, « À faire » propose d’écrire, « Annuler » · ' + t.slice(0, 160));
await img(dp, '18-a-faire', true);
await dp.click('.couche-a [data-a="annuler"]');
await dp.waitForTimeout(400);
verifier(((await lireCle(dp, 'oc_data_v3')) || []).length === 0, '« Annuler » : les trois pistes repartent');
await racine(dp, 'reseau');
await dp.click(T + '[data-a="r-recevoir"]'); await dp.waitForTimeout(300);
await dp.click('.couche-f [data-a="rc-coller"]'); await dp.waitForTimeout(250);
await dp.fill('.couche-f .r-texte', envoye);
await dp.click('.couche-f [data-a="rc-lire"]');
await attendre(dp, () => /3 pistes reçues/.test(document.querySelector('.ecran').innerText));
verifier(/3 pistes reçues/.test(await tout(dp)), 'le même texte collé dans « Recevoir » : l’aperçu');
await D.ctx.close();

/* =================== ⑧ HORS LIGNE =================== */
await A.ctx.setOffline(true);
await ap.waitForTimeout(300);
await racine(ap, 'trouver');
t = await tout(ap);
verifier(/Pas de réseau\./.test(t) && /L’annuaire revient avec lui\. Tes pistes, elles, restent là\./.test(t), 'Trouver, sans réseau : l’annuaire attendra, tes pistes restent · ' + t.slice(0, 120));
await img(ap, '19-hl-trouver');
await racine(ap, 'pistes');
await ap.click(T + '[data-a="piste"][data-id="wor"]'); await ap.waitForTimeout(450);
const ecrire = await ap.$(T + '[data-a="ecrire"], ' + T + '[data-a="ecrire-p"]');
if (ecrire){ await ecrire.click(); await ap.waitForTimeout(450); }
const li = await ap.$(T + '[data-a="canal"][data-v="linkedin"], .couche-f [data-a="canal"][data-v="linkedin"]');
if (li){ await li.click(); await ap.waitForTimeout(300); }
verifier(/Pas de réseau : copie ton mot, tu le colleras dans LinkedIn plus tard\./.test(await tout(ap)), 'un mot pour LinkedIn, sans réseau : il se copie, il se collera plus tard');
await racine(ap, 'reseau');
await ap.click(T + '[data-a="r-demander"]'); await ap.waitForTimeout(300);
await ap.click('.couche-f [data-a="f-demander"]');
await attendre(ap, () => /partira avec le réseau/.test(document.querySelector('.ecran').innerText));
t = await tout(ap);
verifier(/Envoyée\s*partira avec le réseau/.test(t) && !/n’est pas partie/.test(await feuille(ap)), 'une demande sans réseau : elle partira, l’écran le dit · ' + t.slice(0, 200));
await img(ap, '20-hl-demande');
await ap.goBack(); await ap.waitForTimeout(400);
verifier(/Partira dès que le réseau revient/.test(await tout(ap)), 'Réseau, « Mes demandes » : « Partira dès que le réseau revient »');
await racine(ap, 'moi'); await page(ap, 'copie');
await ap.click(T + '[data-a="m-restaurer"]'); await ap.waitForTimeout(250);
await ap.click('.couche-f [data-a="m-restaurer-phrase"]'); await ap.waitForTimeout(200);
await ap.fill('.couche-f .m-phrase', mots2.join(' '));
await ap.click('.couche-f [data-a="m-restaurer-ok"]'); await ap.waitForTimeout(300);
verifier((await feuille(ap)).includes('Pas de réseau : la copie déposée revient avec lui. Un fichier, lui, marche sans.'), 'restaurer par la phrase, sans réseau : ce qui attend, et ce qui marche sans');
await ap.click('.couche-f .x'); await ap.waitForTimeout(250);
const avantLettres = vus.filter(e => e.kind === LETTRE_KIND).length;
await A.ctx.setOffline(false);
verifier(await attendreN(() => vus.filter(e => e.kind === LETTRE_KIND).length > avantLettres, 20000), 'le réseau revient : la demande part d’elle-même');
await racine(ap, 'reseau');
verifier(await attendre(ap, () => /Envoyée aujourd’hui/.test(document.querySelector('.ecran').innerText), null, 10000), 'partie, la ligne dit « Envoyée aujourd’hui »');

/* =================== ⑨ LA FIN DE SÉANCE =================== */
const auj = new Date().toISOString().slice(0, 10);
const F = await ouvrir(390, 844, { mobile: true, calme: true, relais: relay.url, adresse: '#/pistes', profil: { ...PROFIL_E },
  pistes: [{ id: 'a1', name: 'Kiabi', city: 'Hem', status: 'active', appliedAt: auj, createdAt: 1 }] });
verifier(/à faire C’est tout pour aujourd’hui\./i.test(await tout(F.p)), 'quand rien n’attend : « C’est tout pour aujourd’hui. »');
await img(F.p, '21-fin-de-seance');
await F.ctx.close();

/* =================== ⑩ AU POSTE =================== */
const G = await ouvrir(1280, 800, { verrouille: true, relais: relay.url,
  cles: await coffre('280941', PH, { oc_profile_v1: PROFIL_E, oc_data_v3: [{ id: 'k', name: 'Kiabi', city: 'Hem', status: 'todo', createdAt: 1 }] }) });
const gp = G.p;
const fen = await gp.evaluate(() => { const r = document.querySelector('.couche-v .v-win').getBoundingClientRect(); return { w: Math.round(r.width), x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
verifier(fen.w === 400 && Math.abs(fen.x - 640) < 3 && Math.abs(fen.y - 400) < 40, 'au poste, le verrou est une fenêtre au milieu · ' + JSON.stringify(fen));
await img(gp, '22-poste-verrou');
for (let i = 0; i < 16; i++) await gp.keyboard.press('Tab');
verifier(await gp.evaluate(() => document.querySelector('.couche-v').contains(document.activeElement)), 'la tabulation reste dans l’écran verrouillé');
await gp.keyboard.press('Escape');
await gp.keyboard.type('280941');
verifier(await pret(gp), 'au poste, le clavier suffit : six chiffres tapés, l’app s’ouvre');
await G.ctx.setOffline(true);
await gp.waitForTimeout(300);
verifier(/Hors ligne/.test(await lire(gp, '.p-etat')), 'au poste, sans réseau, la barre d’état dit « Hors ligne »');
await G.ctx.close();
const H = await ouvrir(1280, 800, { profil: PROFIL_E, adresse: '#/pistes', relais: relay.url });
const vide = await H.p.evaluate(() => ({ zero: document.querySelector('.ecran').classList.contains('zero'),
  cols: [...document.querySelectorAll('.ecran .p-col')].filter(c => c.offsetWidth > 0).length }));
verifier(vide.zero && vide.cols === 1, 'au poste, Pistes vide : une colonne, pas trois · ' + JSON.stringify(vide));
await img(H.p, '23-poste-pistes-vide');
await onglet(H.p, 'reseau');
const videR = await H.p.evaluate(() => [...document.querySelectorAll('.ecran .p-col')].filter(c => c.offsetWidth > 0).length);
verifier(videR === 1, 'au poste, Réseau vide : une colonne · ' + videR);
await H.ctx.close();

/* =================== ⑪ 360 et 390, clair et sombre =================== */
for (const [w, h, sombre] of [[390, 844, false], [360, 640, true], [360, 640, false]]){
  const X = await ouvrir(w, h, { mobile: true, calme: true, sombre, verrouille: true, relais: relay.url,
    cles: await coffre('280941', PH, { oc_profile_v1: PROFIL_E }) });
  const nom = `${w}${sombre ? '-sombre' : ''}`;
  verifier(!(await debordeCouche(X.p)).length && !(await petitesCouches(X.p)).length, `${nom} : l’écran verrouillé tient, ses touches font 44 px · ${await petitesCouches(X.p)}`);
  await img(X.p, '24-verrou-' + nom);
  await X.p.click('.couche-v [data-a="v-oublie"]'); await X.p.waitForTimeout(250);
  verifier(!(await debordeCouche(X.p)).length && !(await petitesCouches(X.p)).length, `${nom} : code oublié tient · ${await petitesCouches(X.p)}`);
  await img(X.p, '25-oublie-' + nom);
  await X.p.click('.couche-v [data-a="v-retour"]'); await X.p.waitForTimeout(200);
  await taper(X.p, '280941', '.couche-v');
  await pret(X.p);
  await racine(X.p, 'moi'); await page(X.p, 'reglages');
  await X.p.click(T + '[data-a="m-code-f"]'); await X.p.waitForTimeout(300);
  verifier(!(await debordeCouche(X.p)).length && !(await petitesCouches(X.p)).length && !(await deborde(X.p)).length, `${nom} : la feuille du code tient · ${await petitesCouches(X.p)}`);
  await img(X.p, '26-code-' + nom);
  await X.ctx.close();
}
const Y = await ouvrir(360, 640, { mobile: true, calme: true, sombre: true, relais: relay.url });
await Y.p.click(T + '[data-a="retrouver"]'); await Y.p.waitForTimeout(300);
verifier(!(await debordeCouche(Y.p)).length && !(await petitesCouches(Y.p)).length && !(await petites(Y.p)).length, '360 sombre : retrouver tient');
await img(Y.p, '27-retrouver-360-sombre');
await Y.ctx.close();

await fermer();
relay.close();
console.log(`\nÉCHECS ${etat.echecs.length} · ERREURS ${etat.erreurs.length}`);
if (etat.erreurs.length) console.log(etat.erreurs.slice(0, 8).join('\n'));
console.log('captures dans ' + OUT);
process.exit(etat.echecs.length || etat.erreurs.length ? 1 : 0);
