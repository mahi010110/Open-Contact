/* E2E « Signaler un problème » — le seul chemin de retour d'une bêta
   sans serveur (docs/roadmap.md §3). Ce que ce scénario prouve, et qui
   ne se voit pas dans les auto-tests du moteur :

   · la ligne existe dans Réglages, au pouce comme au poste, et porte
     la version — celle qui flottait seule en bas de l'écran a disparu,
     elle ne se dit plus deux fois ;
   · le texte est MONTRÉ avant de partir, et ce qu'on lit est ce qui
     part : le presse-papier reçoit exactement le bloc affiché ;
   · aucune donnée personnelle réellement enregistrée n'y entre — le
     test unitaire le vérifie sur des données fabriquées, celui-ci sur
     l'app chargée avec un vrai suivi. */
import { chromium, chromiumPath, SHOTS, serveRepo, attendre, ouvrirReglages } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const watchErrors = target => {
  target.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  target.on('pageerror', e => errors.push(String(e)));
};
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

/* du privé partout : entreprise, contact, adresse, journal, profil */
const SECRETS = ['Dassault Systèmes', 'Jean Dupont', 'jean.dupont@exemple.fr',
  '12 rue des Lilas', '06 12 34 56 78', 'Relance envoyée', 'Mahi Étudiant',
  'mahi@exemple.fr', 'Ma relance type'];

const seed = async page => {
  await page.goto(base, { waitUntil: 'load' });
  await page.evaluate(async () => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify([
      { id: 'pi-a', name: 'Dassault Systèmes', address: '12 rue des Lilas, 31000 Toulouse',
        status: 'active', updatedAt: 2,
        contacts: [{ id: 'ct-1', name: 'Jean Dupont', email: 'jean.dupont@exemple.fr', phone: '06 12 34 56 78' }] },
      { id: 'pi-b', name: 'WebAgence', status: 'todo', updatedAt: 1, contacts: [] }
    ]));
    await st.kvSet(st.ORPHANS_KEY, JSON.stringify([{ id: 'or-1', name: 'Jean Dupont' }]));
    await st.kvSet(st.JOURNAL_KEY, JSON.stringify([{ t: 1, txt: 'Relance envoyée' }]));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify({
      name: 'Mahi Étudiant', email: 'mahi@exemple.fr', formation: 'BTS SIO',
      templates: [{ name: 'Ma relance type', subject: 'Suite', body: 'Bonjour' }]
    }));
  });
  await page.goto(base + '/#/moi');
  await page.reload({ waitUntil: 'load' });
  await attendre(page, async () => (await import('./ui/state.js')).S.companies.length === 2);
  await ouvrirReglages(page);
};

const ouvrirDiag = async page => {
  await page.click('#moiDiag');
  await page.waitForSelector('.diag');
  return page.evaluate(() => document.querySelector('.diag').textContent);
};

/* ---------- téléphone : la porte, le texte, la copie ----------
   L'agent d'un Chromium sans écran se lit « HeadlessChrome » : il
   ne ressemble à AUCUN appareil d'étudiant, et le rapport dirait
   « inconnu ». On donne donc l'agent d'un vrai téléphone — le
   rapport lu ici est celui que le mainteneur recevra. */
const UA_TEL = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const mCtx = await browser.newContext({
  viewport: { width: 390, height: 844 }, hasTouch: true, userAgent: UA_TEL,
  locale: 'fr-FR', permissions: ['clipboard-read', 'clipboard-write']
});
const mPage = await mCtx.newPage();
watchErrors(mPage);
await seed(mPage);

/* la ligne porte la version — et elle est la SEULE à la porter */
const ligne = await mPage.evaluate(() => {
  const b = document.querySelector('#moiDiag');
  if (!b) return null;
  return {
    nom: b.querySelector('.rg-n').textContent.trim(),
    etat: b.querySelector('.rg-s').textContent.trim(),
    h: Math.round(b.getBoundingClientRect().height),
    ver: !!document.querySelector('.moi-ver')
  };
});
if (!ligne) fail('pas de ligne « Signaler un problème » dans Réglages');
else {
  if (ligne.nom !== 'Signaler un problème') fail('libellé inattendu : ' + ligne.nom);
  if (!/^\d+\.\d+\.\d+$/.test(ligne.etat)) fail('la ligne doit porter la version : ' + ligne.etat);
  if (ligne.h < 44) fail('cible sous 44 px au pouce : ' + ligne.h);
  if (ligne.ver) fail('la version se dit deux fois — la ligne seule doit la porter');
}

const txt = await ouvrirDiag(mPage);
const lignes = txt.split('\n');
if (lignes.length !== 6) fail('le rapport doit tenir 6 lignes stables : ' + lignes.length);
if (!lignes[0].startsWith('OpenContact ')) fail('la version ouvre le rapport : ' + lignes[0]);
if (lignes[1] !== 'Appareil : Chrome 130 · Android · 390×844 · fr-FR')
  fail('l’appareil réel doit figurer, tel quel : ' + lignes[1]);
if (!/2 piste\(s\) · 1 contact\(s\) · 1 à rattacher/.test(txt)) fail('comptes faux : ' + txt);
if (!/1 modèle\(s\) · journal 1 ligne\(s\)/.test(txt)) fail('modèles / journal faux : ' + txt);

/* l'invariant, sur l'app chargée d'un vrai suivi */
for (const s of SECRETS)
  if (txt.includes(s)) fail('« ' + s + ' » a fui dans le diagnostic affiché');

/* on lit TOUT : le bloc replie ses lignes plutôt que d'en cacher la
   moitié derrière un défilement — sinon « lis avant d'envoyer » est
   une phrase, pas une possibilité */
const coupe = await mPage.evaluate(() => {
  const p = document.querySelector('.diag');
  return p.scrollWidth - p.clientWidth;
});
if (coupe > 1) fail('le bloc cache ' + coupe + ' px sur la droite au pouce');

/* ce qu'on lit est ce qui part */
await mPage.click('.modal-f .btn-primary');
const presse = await mPage.evaluate(() => navigator.clipboard.readText());
if (presse !== txt) fail('le presse-papier ne rend pas le bloc affiché');
if (!/Copié/.test(await mPage.locator('#toast').innerText())) fail('aucun retour après la copie');
console.log('téléphone : ligne à 44 px, 6 lignes, rien de personnel, copie fidèle ✓');

await mPage.evaluate(async () => (await import('./ui/dom.js')).topSheet()?.close());

/* sombre : la feuille se relit, le bloc mono garde son contraste */
await mPage.emulateMedia({ colorScheme: 'dark' });
await mPage.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
await ouvrirDiag(mPage);
await mPage.waitForTimeout(350);          /* fin du fondu d'entrée de la feuille */
await mPage.screenshot({ path: SHOTS + '/90-diagnostic-mobile-sombre.png' });
await mCtx.close();

/* ---------- ordinateur : la même porte, colonne déjà dépliée ---------- */
const dCtx = await browser.newContext({
  viewport: { width: 1280, height: 800 }, locale: 'fr-FR',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  permissions: ['clipboard-read', 'clipboard-write']
});
const dPage = await dCtx.newPage();
watchErrors(dPage);
await seed(dPage);

const dTxt = await ouvrirDiag(dPage);
/* Edge se déclare aussi « Chrome » : c'est l'ordre des motifs qui
   tranche, et il se vérifie sur un vrai navigateur, pas seulement en
   unitaire — un rapport d'Edge lu « Chrome » enverrait chercher un
   bug sur le mauvais moteur */
if (dTxt.split('\n')[1] !== 'Appareil : Edge 130 · Windows · 1280×800 · fr-FR')
  fail('l’appareil du poste doit figurer, tel quel : ' + dTxt.split('\n')[1]);
/* au large, aucune ligne n'a besoin d'être repliée : le rapport se lit
   ligne à ligne, comme il sera lu dans l'issue. On compte les lignes
   RENDUES (une boîte par ligne visuelle), pas la hauteur du bloc — un
   repli s'y noierait dans l'arrondi. */
const rendues = await dPage.evaluate(() => {
  const r = document.createRange();
  r.selectNodeContents(document.querySelector('.diag'));
  return new Set([...r.getClientRects()].map(x => Math.round(x.top))).size;
});
if (rendues !== 6) fail('au poste, le rapport doit tenir six lignes : ' + rendues);

/* la sortie vers GitHub existe et vise bien un formulaire d'issue —
   on l'inspecte, on ne la suit pas : un test ne part pas sur le réseau */
const issues = await dPage.evaluate(async () => (await import('./ui/diagnostic.js')).ISSUES_URL);
if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/new$/.test(issues))
  fail('adresse de dépôt d’issue inattendue : ' + issues);
await dPage.waitForTimeout(350);
await dPage.screenshot({ path: SHOTS + '/91-diagnostic-desktop.png' });
console.log('ordinateur : même porte, six lignes non repliées, sortie vers ' + issues + ' ✓');
await dCtx.close();

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E diagnostic : ÉCHEC' : 'E2E diagnostic : OK');
