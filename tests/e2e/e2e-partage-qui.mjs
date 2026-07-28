/* E2E « → qui » (#2) : choisir les personnes qui partent, piste par
   piste, et vérifier ce qui sort VRAIMENT du fichier .oc — pas
   seulement ce que l'écran affiche. Le libellé suit la règle calibrée
   (nom seul / nom +N / N sur M / rien), le défaut reste « tout part »,
   et le suivi privé ne sort jamais. Joué au pouce, thème sombre. */
import { chromium, chromiumPath, SHOTS, serveRepo, attendre } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const errors = [];

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

await page.goto(base, { waitUntil: 'load' });
await page.evaluate(async () => {
  const st = await import('./engine/storage.js');
  await st.kvInit();
  await st.kvSet(st.THEME_KEY, 'dark');
  await st.kvSet(st.DATA_KEY, JSON.stringify([
    { id: 'pi-a', name: 'Capgemini', city: 'Lille', domain: 'esn', status: 'active', updatedAt: 3,
      notes: 'PRIVÉ — ne doit jamais sortir', contacts: [
        { id: 'ct1', name: 'Léa Fontaine', role: 'RH', email: 'lea@cap.fr' },
        { id: 'ct2', name: 'Marc Dubois', role: 'Manager', email: 'marc@cap.fr' },
        { id: 'ct3', name: 'Sofia Ben', phone: '06 11 22 33 44' }] },
    { id: 'pi-b', name: 'OVHcloud', city: 'Roubaix', domain: 'cloud', status: 'todo', updatedAt: 2,
      contacts: [{ id: 'ct4', name: 'Nadia K.', email: 'nadia@ovh.fr' }] },
    { id: 'pi-c', name: 'Sopra', city: 'Paris', domain: 'esn', status: 'todo', updatedAt: 1, contacts: [] }
  ]));
});
await page.goto(base + '/#/echanger');
await page.reload({ waitUntil: 'load' });
await attendre(page, async () => (await import('./ui/state.js')).S.companies.length === 3,
  { timeout: 8000, message: 'pistes semées' });

/* ---------- la ligne « → qui » dit la bonne chose d'emblée ---------- */
await page.evaluate(async () => (await import('./ui/donner.js')).openDonner());
await page.waitForSelector('#dnPick');
await page.click('#dnPick');
await page.waitForSelector('.pk-duo');
const lignes = () => page.evaluate(() =>
  Object.fromEntries([...document.querySelectorAll('.pk-duo')].map(d => [
    d.querySelector('.pk-m b').textContent,
    (d.querySelector('.pk-who')?.textContent || '').replace(/\s+/g, ' ').trim()
  ])));
const l0 = await lignes();
if (l0.Capgemini !== '→ Léa Fontaine +2 ▾') fail('3 personnes toutes retenues : ' + l0.Capgemini);
if (l0.OVHcloud !== '→ Nadia K.') fail('une seule personne = son nom, ligne inerte : ' + l0.OVHcloud);
if (l0.Sopra !== '') fail('aucune personne = rien affiché (Donner) : ' + JSON.stringify(l0.Sopra));
if (await page.$('.pk-duo:has-text("OVHcloud") .pk-who:not([disabled])'))
  fail('une seule personne : la ligne ne doit pas s’ouvrir');
console.log('la ligne « → qui » : nom seul, nom +N, rien — selon le cas ✓');

/* ---------- écarter quelqu'un : une case, aucune validation ---------- */
await page.click('.pk-duo:has-text("Capgemini") .pk-who');
await page.waitForSelector('.overlay:last-of-type .pick[data-ct]');
const titre = await page.textContent('.overlay:last-of-type .modal-h h2');
if (!/Qui part, chez Capgemini/.test(titre)) fail('titre du verbe « donner » : ' + titre);
if (await page.$('.overlay:last-of-type .modal-f:not([hidden])'))
  fail('la sous-feuille ne valide rien — la croix referme (R2)');
const hauteurs = await page.evaluate(() =>
  [...document.querySelectorAll('.overlay:last-of-type .pick[data-ct]')]
    .map(p => Math.round(p.getBoundingClientRect().height)));
if (hauteurs.some(h => h < 44)) fail('cibles tactiles sous 44 px : ' + JSON.stringify(hauteurs));
await page.screenshot({ path: SHOTS + '/partage-qui-sousfeuille.png' });
await page.click('.overlay:last-of-type .pick[data-ct="ct2"]');       /* Marc sort */
await page.click('.overlay:last-of-type .modal-h .x');
await page.waitForTimeout(250);
const l1 = await lignes();
if (l1.Capgemini !== '→ 2 sur 3 ▾') fail('quelqu’un d’écarté = le compte : ' + l1.Capgemini);
const compte = (await page.textContent('#dnCount')).replace(/\s+/g, ' ').trim();
if (!/1 personne écartée/.test(compte)) fail('l’écran doit dire ce qui manque : ' + compte);
console.log('écarter quelqu’un : « 2 sur 3 », et le compteur le dit ✓');

/* ---------- ce qui sort RÉELLEMENT du fichier ---------- */
await page.evaluate(() => {
  window.__copie = null;
  navigator.clipboard.writeText = t => { window.__copie = t; return Promise.resolve(); };
});
/* « Copier » vit sous l'onglet « Texte » : un fichier et un texte collé
   ne vont pas au même endroit, ils ne partagent plus le même écran */
await page.click('#dnText');
await page.waitForSelector('#dnCopy');
await page.click('#dnCopy');
await attendre(page, () => !!window.__copie, { timeout: 6000, message: 'fichier copié' });
const paye = await page.evaluate(() => JSON.parse(window.__copie));
const parNom = Object.fromEntries(paye.companies.map(c => [c.name, c]));
const cap = parNom.Capgemini.contacts.map(t => t.name);
if (String(cap) !== 'Léa Fontaine,Sofia Ben') fail('Marc ne devait pas partir : ' + cap);
if (String(parNom.OVHcloud.contacts.map(t => t.name)) !== 'Nadia K.')
  fail('une piste non touchée part entière : ' + parNom.OVHcloud.contacts.length);
if (parNom.Sopra.contacts.length) fail('Sopra n’a personne à faire partir');
/* « Chiffrer » est UN réglage : à la souris les deux cadres sont visibles
   en même temps, un par cadre aurait dupliqué l'identifiant */
const cryptDoublons = await page.evaluate(() => document.querySelectorAll('#dnCrypt').length);
if (cryptDoublons !== 1) fail('« Chiffrer » présent ' + cryptDoublons + ' fois');
/* la fiche, elle, reste entière — on écarte des personnes, pas des champs */
if (parNom.Capgemini.city !== 'Lille' || parNom.Capgemini.domain !== 'esn')
  fail('la fiche doit partir entière : ' + JSON.stringify(parNom.Capgemini));
/* et le privé ne suit jamais, même pour les personnes retenues */
if (JSON.stringify(paye).includes('PRIVÉ')) fail('note privée dans le partage !');
if ('id' in parNom.Capgemini.contacts[0]) fail('id local dans le partage');
console.log('le fichier .oc ne contient que les personnes retenues, fiche entière, zéro privé ✓');

if (errors.length) fail('erreurs console : ' + JSON.stringify(errors.slice(0, 6)));
else console.log('Zéro erreur console.');
console.log(process.exitCode ? 'E2E partage « → qui » : ÉCHEC' : 'E2E partage « → qui » : OK');
await browser.close();
server.close();
process.exit(process.exitCode || 0);
