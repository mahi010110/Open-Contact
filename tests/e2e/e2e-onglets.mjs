/* E2E onglets — le composant de `ui/dom.js` avant qu'on branche Donner et
   Recevoir dessus. Ce qui est vérifié n'est pas « ça s'affiche » mais les
   promesses qui coûtent cher quand elles cassent :
   · l'onglet actif est annoncé (ARIA) et lui seul est atteignable au Tab ;
   · ← → changent d'onglet, comme le glissé au pouce ;
   · les chevrons n'apparaissent que du côté où il reste quelque chose ;
   · quitter un onglet rend ses ressources (`onHide`) — une caméra ne
     tourne jamais sous un onglet caché ;
   · la cible tactile de l'onglet fait 44 px ;
   · la barre d'état de la feuille apparaît et disparaît sur commande.
   Et la détection de caméra, qui décide si « Scanner » existe. */
import { chromium, chromiumPath, serveRepo } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
await page.goto(base, { waitUntil: 'load' });

/* une feuille à trois onglets, montée à la main : le composant est jugé
   seul, sans dépendre d'un écran qui bougera */
await page.evaluate(async () => {
  const d = await import('./ui/dom.js');
  window.__vus = [];
  window.__quittes = [];
  const sh = d.openSheet({ title: 'Essai', icon: 'share' });
  window.__sh = sh;
  sh.body.innerHTML = '<div id="tz"></div>';
  window.__tb = d.tabsUI(sh.body.querySelector('#tz'), [
    { label: 'QR', render: z => { z.innerHTML = '<p id="pQR">qr</p>'; window.__vus.push('QR'); },
      onHide: () => window.__quittes.push('QR') },
    { label: 'Fichier', render: z => { z.innerHTML = '<p id="pF">fichier</p>'; window.__vus.push('Fichier'); } },
    { label: 'Texte', render: z => { z.innerHTML = '<textarea id="pT"></textarea>'; window.__vus.push('Texte'); } }
  ]);
});
await page.waitForSelector('#pQR');

const etat = () => page.evaluate(() => ({
  actif: document.querySelector('.tab[aria-selected="true"]')?.textContent,
  tabbables: Array.from(document.querySelectorAll('.tab')).filter(t => t.tabIndex === 0).length,
  gauche: !document.querySelector('.sw-l').hidden,
  droite: !document.querySelector('.sw-r').hidden,
  role: document.querySelector('.tabpage')?.getAttribute('role'),
  lie: document.querySelector('.tabpage')?.getAttribute('aria-labelledby')
       === document.querySelector('.tab[aria-selected="true"]')?.id
}));

let e = await etat();
if (e.actif !== 'QR') fail('le premier onglet devrait être actif : ' + e.actif);
if (e.tabbables !== 1) fail('un seul onglet doit être atteignable au Tab, trouvé ' + e.tabbables);
if (e.role !== 'tabpanel') fail('la page n’est pas un tabpanel');
if (!e.lie) fail('la page n’est pas reliée à son onglet (aria-labelledby)');
if (e.gauche) fail('un chevron gauche sur le PREMIER onglet');
if (!e.droite) fail('pas de chevron droit alors qu’il reste des onglets');
console.log('ARIA + chevrons du premier onglet ✓');

/* la cible tactile : 44 px au pouce, sans exception */
const h = await page.evaluate(() => Math.round(document.querySelector('.tab').getBoundingClientRect().height));
if (h < 44) fail('onglet sous 44 px au pouce : ' + h);
console.log('cible tactile de l’onglet : ' + h + ' px ✓');

/* le chevron droit avance ; le gauche apparaît alors */
await page.click('.sw-r');
await page.waitForSelector('#pF');
e = await etat();
if (e.actif !== 'Fichier') fail('le chevron droit n’a pas avancé : ' + e.actif);
if (!e.gauche || !e.droite) fail('au milieu, les deux chevrons doivent être là');
if ((await page.evaluate(() => window.__quittes)).join() !== 'QR')
  fail('onHide n’a pas été appelé en quittant « QR » — une ressource resterait ouverte');
console.log('chevron → onglet suivant, et « QR » a bien rendu ses ressources ✓');

/* ← → au clavier : le même comportement que le glissé */
await page.focus('.tab[aria-selected="true"]');
await page.keyboard.press('ArrowRight');
await page.waitForSelector('#pT');
e = await etat();
if (e.actif !== 'Texte') fail('ArrowRight n’a pas changé d’onglet : ' + e.actif);
if (e.droite) fail('un chevron droit sur le DERNIER onglet');
await page.keyboard.press('ArrowLeft');
await page.waitForSelector('#pF');
if ((await etat()).actif !== 'Fichier') fail('ArrowLeft n’a pas reculé');
console.log('← → au clavier : même comportement que le glissé ✓');

/* la page ne se re-rend pas quand on retape l'onglet déjà actif */
const avant = (await page.evaluate(() => window.__vus)).length;
await page.click('.tab[aria-selected="true"]');
if ((await page.evaluate(() => window.__vus)).length !== avant)
  fail('retaper l’onglet actif le re-rend inutilement');
console.log('retaper l’onglet actif ne fait rien ✓');

/* la barre d'état : présente sur commande, absente sinon */
let st = await page.evaluate(() => document.querySelector('.modal-s').hidden);
if (!st) fail('la barre d’état devrait être absente tant qu’on n’a rien à dire');
await page.evaluate(() => window.__sh.setStatus('connexion…'));
st = await page.evaluate(() => ({
  cache: document.querySelector('.modal-s').hidden,
  txt: document.querySelector('.modal-s').textContent
}));
if (st.cache || !/connexion/.test(st.txt)) fail('barre d’état non posée : ' + JSON.stringify(st));
await page.evaluate(() => window.__sh.setStatus('envoyé', 'ok'));
if (!await page.evaluate(() => document.querySelector('.modal-s').classList.contains('modal-s-ok')))
  fail('le ton « ok » ne colore pas la barre d’état');
await page.evaluate(() => window.__sh.setStatus(null));
if (!await page.evaluate(() => document.querySelector('.modal-s').hidden))
  fail('setStatus(null) devrait faire disparaître la barre');
console.log('barre d’état : posée, colorée, retirée ✓');

/* la caméra se compte sans demander la permission — c'est ce qui décide
   si l'onglet « Scanner » existe. Chromium de test n'en a aucune. */
const cam = await page.evaluate(async () => {
  const q = await import('./ui/qr.js');
  const n = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput').length;
  return { n, dit: await q.hasCamera() };
});
if (cam.n !== 0) fail('le navigateur de test ne devrait pas avoir de caméra : ' + cam.n);
if (cam.dit !== false) fail('hasCamera() devrait répondre non ici : ' + cam.dit);
const permis = await page.evaluate(() => navigator.permissions
  ? navigator.permissions.query({ name: 'camera' }).then(p => p.state, () => 'inconnu') : 'inconnu');
if (permis === 'granted') fail('la détection ne doit pas avoir demandé la caméra');
console.log('caméra comptée sans permission (0 → hasCamera = non, état « ' + permis + ' ») ✓');

if (errors.length){ fail('erreurs console : ' + errors.join(' | ')); }
else console.log('Zéro erreur console.');
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E onglets : ÉCHEC' : 'E2E onglets : OK');
