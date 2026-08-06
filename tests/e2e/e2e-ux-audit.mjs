/* E2E corrections prioritaires de l'audit UX : aucune action primaire morte,
   parcours Compagnon mobile honnête, relais avancés accessibles, cibles au
   pouce, contact sans doublon et fournisseurs IA non livrés non activables. */
import { chromium, chromiumPath, SHOTS, serveRepo, attendre } from './outils.mjs';
import { COMPAGNON, IA } from '../../ui/perimetre.js';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
const watchErrors = target => {
  target.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  target.on('pageerror', e => errors.push(String(e)));
};
watchErrors(page);
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const tapIn = async (target, scope, code) => {
  for (const d of code) await target.click(`${scope} .pad-k[data-d="${d}"]`);
};
const closeSheet = () => page.evaluate(async () => (await import('./ui/dom.js')).topSheet()?.close());

/* Deux pistes (dont une sans e-mail), un contact orphelin sans nom et une
   messagerie simulée : aucun appel externe ne part dans ce scénario. */
await page.goto(base, { waitUntil: 'load' });
await page.evaluate(async () => {
  const st = await import('./engine/storage.js');
  await st.kvInit();
  await st.kvSet(st.DATA_KEY, JSON.stringify([
    { id: 'sans-mail', name: 'Atelier local', status: 'todo',
      contacts: [{ id: 'ct-sans', name: 'Camille', role: 'RH' }], updatedAt: 2 },
    { id: 'avec-mail', name: 'Entreprise test', status: 'todo',
      contacts: [{ id: 'ct-avec', name: 'Nadia', role: 'RH', email: 'nadia@exemple.fr' }], updatedAt: 1 }
  ]));
  await st.kvSet(st.ORPHANS_KEY, JSON.stringify([
    { id: 'orphelin', name: '', role: '', email: 'recrutement@exemple.fr', phone: '', extra: {} }
  ]));
  await st.kvSet(st.MAIL_KEY, JSON.stringify({
    gmail: { token: 'FAKE', exp: Date.now() + 3600000, email: 'moi@exemple.fr' }
  }));
  await st.kvSet(st.RELAYS_KEY, '[]');
});
await page.reload({ waitUntil: 'load' });
await attendre(page, async () => (await import('./ui/state.js')).S.companies.length === 2);

/* F1 : connecté ne signifie pas « envoyable » si la piste n'a pas d'adresse.
   Depuis #16, l'indisponible est ABSENT (loi #6) : ni « Envoyer » ni
   « Ouvrir dans Mail » — « Copier » devient LE bouton. */
await page.evaluate(async () => {
  const { openMail } = await import('./ui/mail.js');
  const { S } = await import('./ui/state.js');
  openMail(S.companies.find(c => c.id === 'sans-mail'));
});
await page.waitForSelector('#mHint');
const mailState = await page.evaluate(() => {
  const send = [...document.querySelectorAll('.modal-f button')].find(b => /Envoyer/.test(b.textContent));
  const ouvre = [...document.querySelectorAll('.modal-f .btn, .modal-f button')].find(b => /Ouvrir dans Mail/.test(b.textContent));
  const copy = [...document.querySelectorAll('.modal-f button')].find(b => /Copier/.test(b.textContent));
  return { sendAbsent: !send, ouvreAbsent: !ouvre,
    copyPrimary: copy?.classList.contains('btn-primary'), hint: document.querySelector('#mHint').textContent };
});
if (!mailState.sendAbsent || !mailState.ouvreAbsent || !mailState.copyPrimary)
  fail('pied sans e-mail incohérent : ' + JSON.stringify(mailState));
if (!/Pas d.email/.test(mailState.hint)) fail('aide sans e-mail absente : ' + mailState.hint);
console.log('Écrire sans e-mail : Envoyer absent (loi #6), Copier devient primaire ✓');
await page.screenshot({ path: SHOTS + '/80-ux-ecrire-sans-email.png' });
await closeSheet();

/* F1 bis : un bouton qui est un LIEN garde son libellé quand on le touche.
   `a:hover` (0,1,1) bat `.btn-primary` (0,1,0) : l'encre passait à
   `--text-link-hover`, soit exactement `--accent-hover`, mesuré à 1.00:1
   sur son propre fond. iOS colle le survol après un tap — « Ouvrir dans
   Mail » se vidait au moment du geste et le restait. */
await page.evaluate(async () => {
  const { openMail } = await import('./ui/mail.js');
  const { S } = await import('./ui/state.js');
  openMail(S.companies.find(c => c.id === 'avec-mail'));
});
await page.waitForSelector('.modal-f a.btn');
const lum = ([r, g, b]) => {
  const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  return .2126 * f(r) + .7152 * f(g) + .0722 * f(b);
};
const rgb = s => (String(s).match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number);
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
for (const theme of ['light', 'dark']){
  await page.evaluate(t => document.documentElement.dataset.theme = t, theme);
  const aM = await page.$('.modal-f a.btn');
  const box = await aM.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(60);
  const [fg, bg] = await aM.evaluate(n => { const s = getComputedStyle(n); return [s.color, s.backgroundColor]; });
  const c = contraste(rgb(fg), rgb(bg));
  if (c < 4.5) fail(`« Ouvrir dans Mail » survolé en ${theme} : ${c.toFixed(2)}:1 — ${fg} sur ${bg}`);
  await page.mouse.move(2, 2);
}
console.log('bouton-lien survolé : le libellé garde son encre, clair et sombre ✓');
await page.evaluate(() => document.documentElement.dataset.theme = 'light');
await closeSheet();

/* F5 + F4 : l'adresse orpheline n'est visible qu'une fois et les petites
   actions atteignent 44 px dans le contexte mobile. Le bac « à rattacher »
   est replié par défaut (#13) : on l'ouvre d'abord. */
await page.goto(base + '/#/pistes');
await page.waitForSelector('.tr-orph summary');
await page.click('.tr-orph summary');
await page.waitForSelector('.orow');
const orphan = await page.locator('.orow').innerText();
if ((orphan.match(/recrutement@exemple\.fr/g) || []).length !== 1)
  fail('adresse orpheline répétée : ' + orphan);
const sizes = await page.evaluate(() => {
  const small = document.querySelector('.orow .btn-sm').getBoundingClientRect();
  const icon = document.createElement('button');
  icon.className = 'abtn abtn-sm';
  icon.style.position = 'fixed'; icon.style.left = '0'; icon.style.top = '0';
  document.body.append(icon);
  const ir = icon.getBoundingClientRect(); icon.remove();
  return { small: small.height, iconW: ir.width, iconH: ir.height };
});
if (sizes.small < 44 || sizes.iconW < 44 || sizes.iconH < 44)
  fail('cibles tactiles trop petites : ' + JSON.stringify(sizes));
console.log('orphelin lisible + cibles tactiles 44 px ✓');

/* F1 ter : « Donner » sans rien à donner était une action MORTE — un
   toast de trois secondes, et l'écran ne bougeait pas. Loi #6 : ce qui
   ne peut pas marcher n'est pas là, et « Recevoir » (le seul des deux
   qui marche à zéro piste) prend l'accent. */
/* les deux pistes du décor, réécrites telles quelles après le contrôle :
   plus sûr que relire la clé, et le décor reste lisible sur place */
const DECOR = JSON.stringify([
  { id: 'sans-mail', name: 'Atelier local', status: 'todo',
    contacts: [{ id: 'ct-sans', name: 'Camille', role: 'RH' }], updatedAt: 2 },
  { id: 'avec-mail', name: 'Entreprise test', status: 'todo',
    contacts: [{ id: 'ct-avec', name: 'Nadia', role: 'RH', email: 'nadia@exemple.fr' }], updatedAt: 1 }
]);
await page.evaluate(async () => {
  const st = await import('./engine/storage.js');
  await st.kvInit();
  await st.kvSet(st.DATA_KEY, '[]');
});
await page.reload({ waitUntil: 'load' });
await page.goto(base + '/#/echanger');
await page.waitForSelector('.hero2');
const ech0 = await page.evaluate(() => ({
  donner: !!document.querySelector('#ecGive'),
  recevoirPrim: !!document.querySelector('#ecRecv')?.classList.contains('btn-primary')
}));
if (ech0.donner) fail('« Donner » présent alors qu’il n’y a rien à donner (action morte)');
if (!ech0.recevoirPrim) fail('« Recevoir » ne prend pas l’accent quand « Donner » disparaît');
console.log('Échanger à zéro piste : « Donner » absent, « Recevoir » devient le bouton ✓');
/* les deux pistes reviennent : la suite du scénario compte dessus */
await page.evaluate(async d => {
  const st = await import('./engine/storage.js');
  await st.kvInit();
  await st.kvSet(st.DATA_KEY, d);
}, DECOR);
/* un `goto` qui ne change que le fragment ne RECHARGE pas le document :
   l'état en mémoire garderait ses zéro piste. On recharge, puis on
   revient sur l'écran d'où l'on vient. */
await page.reload({ waitUntil: 'load' });
await page.evaluate(() => { location.hash = '#/pistes'; });
await attendre(page, async () => (await import('./ui/state.js')).S.companies.length === 2);

/* F7 : la recherche. Trois pannes silencieuses — elles rendaient ZÉRO
   résultat sans jamais dire pourquoi, ce qui se lit comme « je n'ai
   pas cette piste » : le mot tapé sans accent, les deux mots venus de
   deux champs, et le bac « à rattacher » qui ignorait la recherche.
   On ajoute une piste accentuée le temps du contrôle, puis on rend
   les données d'origine — la suite du scénario compte deux pistes. */
const DEUX = await page.evaluate(async () => {
  const st = await import('./engine/storage.js');
  const avant = await st.kvGet(st.DATA_KEY);
  const d = JSON.parse(avant);
  d.push({ id: 'accent', name: 'Cyberdéfense Lyon', status: 'todo', city: 'Lyon',
    techs: 'SOC managé, Fortinet', updatedAt: 3, contacts: [] });
  await st.kvSet(st.DATA_KEY, JSON.stringify(d));
  return avant;
});
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('#piQ');
const chercher = async txt => {
  await page.fill('#piQ', txt);
  await page.waitForTimeout(260);                       /* la frappe est amortie (180 ms) */
  return page.evaluate(() => ({
    noms: [...document.querySelectorAll('#piBody .row-item h3')].map(n => n.textContent),
    compte: document.querySelector('#piCount')?.textContent || '',
    marques: [...document.querySelectorAll('#piBody .ri-hit mark')].map(n => n.textContent),
    hits: [...document.querySelectorAll('#piBody .ri-hit')].map(n => n.textContent),
    bacOuvert: document.querySelector('.tr-orph')?.open || false,
    bacLignes: document.querySelectorAll('.tr-orph .orow').length,
    vide: document.querySelector('.empty-list')?.textContent.trim().split('\n')[0] || ''
  }));
};
const sansAccent = await chercher('cyberdefense');
if (!sansAccent.noms.includes('Cyberdéfense Lyon'))
  fail('« cyberdefense » sans accent ne trouve pas « Cyberdéfense Lyon » : ' + JSON.stringify(sansAccent.noms));
const deuxMots = await chercher('atelier camille');
if (deuxMots.noms.join() !== 'Atelier local')
  fail('« atelier camille » (nom + contact) : ' + JSON.stringify(deuxMots.noms));
if (!/1 sur 3/.test(deuxMots.compte)) fail('le compte ne dit pas la part filtrée : « ' + deuxMots.compte + ' »');
if (!deuxMots.marques.some(m => /Camille/i.test(m)))
  fail('le mot trouvé n’est pas montré sur la ligne : ' + JSON.stringify(deuxMots.hits));
/* le nom répond déjà : pas de deuxième ligne pour redire la même chose */
const deja = await chercher('atelier');
if (deja.hits.length) fail('la ligne explique ce que le nom montre déjà : ' + JSON.stringify(deja.hits));
/* le bac suit, et s'ouvre — sinon l'écran se contredit tout seul */
const bac = await chercher('recrutement');
if (!bac.bacOuvert || bac.bacLignes !== 1) fail('le bac « à rattacher » ne suit pas la recherche');
if (!/Aucune piste/.test(bac.vide)) fail('l’écran vide ne nomme pas l’objet : « ' + bac.vide + ' »');
/* Échap vide le champ ; « / » y ramène le curseur */
await page.keyboard.press('Escape');
await page.waitForTimeout(260);
const vide = await page.evaluate(() => document.querySelector('#piQ').value);
if (vide !== '') fail('Échap ne vide pas la recherche');
await page.click('#view-pistes h2');
await page.keyboard.press('/');
const focus = await page.evaluate(() => document.activeElement && document.activeElement.id);
if (focus !== 'piQ') fail('« / » ne ramène pas au champ de recherche (focus : ' + focus + ')');
/* « n » ouvre une piste de plus, de n'importe où — et JAMAIS quand on
   tape : un raccourci qui s'invite dans un champ de saisie est un bug,
   pas un raccourci. */
await page.keyboard.type('nn');
if (await page.$('.overlay')) fail('« n » tapé dans la recherche ouvre une feuille');
await page.fill('#piQ', '');
await page.click('#view-pistes h2');
await page.keyboard.press('n');
await page.waitForSelector('.overlay .modal', { timeout: 4000 });
if (!/Nouvelle piste/.test(await page.textContent('.mh-t'))) fail('« n » n’ouvre pas la capture');
await closeSheet();
await page.waitForTimeout(200);
/* Un raccourci invisible ne sert que ceux qui devinent : la touche
   s'annonce DANS le champ qu'elle ouvre, et seulement là où il y a un
   clavier. On le vérifie au poste, pas au pouce. */
const badge = await page.evaluate(() => !!document.querySelector('.kbd-hint'));
if (badge) fail('la pastille de raccourci ne doit pas exister au pouce');
/* la poubelle NOMME sa cible : sans ça un lecteur d'écran entend
   « Supprimer » quarante fois sans jamais savoir quoi */
const poubelles = await page.evaluate(() =>
  [...document.querySelectorAll('#piBody .hov-del')].map(b => b.getAttribute('aria-label')));
if (poubelles.length && poubelles.some(l => !/ /.test(String(l))))
  fail('une poubelle ne nomme pas ce qu’elle supprime : ' + JSON.stringify(poubelles));
await page.evaluate(async avant => {
  const st = await import('./engine/storage.js');
  await st.kvSet(st.DATA_KEY, avant);
}, DEUX);
console.log('recherche : accents pliés, deux mots, le pourquoi montré, le bac qui suit, « / » et Échap ✓');

/* F8 : « Tes échanges » menait nulle part — « 3 pistes reçues · Marco »
   disait qu'il s'était passé quelque chose, et rien d'autre. Une ligne
   qui a gardé les identifiants de ses pistes s'ouvre dessus ; une
   entrée d'avant ce champ n'en a pas, et NE promet rien : un chevron
   qui n'ouvre pas coûte plus cher qu'un chevron absent. */
await page.evaluate(async () => {
  const st = await import('./engine/storage.js');
  const h = 3600000, now = Date.now();
  const j = [{ t: now - 40 * h, txt: 'Donné (QR) : 3 piste(s)' }];   /* ancienne : sans ids */
  for (let i = 0; i < 8; i++)
    j.push({ t: now - (30 - i) * h, txt: 'Donné (fichier) : 1 piste(s)', ids: ['avec-mail'] });
  j.push({ t: now - h, txt: 'Reçu de Marco : +2 piste(s), 0 complétée(s)',
    ids: ['sans-mail', 'disparue-depuis'] });
  await st.kvSet(st.JOURNAL_KEY, JSON.stringify(j));
});
await page.goto(base + '/#/echanger');
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.ec-row');
const fil = await page.evaluate(() => ({
  lignes: document.querySelectorAll('.ec-row').length,
  ouvrables: document.querySelectorAll('button.ec-row').length,
  badge: document.querySelector('.ec-fil .tr-n')?.textContent || '',
  more: document.querySelector('#ecMore')?.textContent || '',
  hauteur: Math.round(document.querySelector('.ec-row').getBoundingClientRect().height)
}));
if (fil.lignes !== 8 || !/Voir les 2 autres/.test(fil.more))
  fail('le fil ne se plafonne pas à 8 avec sa suite : ' + JSON.stringify(fil));
if (fil.badge !== '10') fail('le compte de l’en-tête ne dit pas le total : ' + fil.badge);
if (fil.hauteur < 44) fail('une ligne qui s’ouvre doit faire 44 px au pouce : ' + fil.hauteur);
await page.click('#ecMore');
await page.waitForFunction(() => document.querySelectorAll('.ec-row').length === 10);
const apres = await page.evaluate(() => ({
  ouvrables: document.querySelectorAll('button.ec-row').length,
  muettes: [...document.querySelectorAll('div.ec-row')].map(n => n.textContent.replace(/\s+/g, ' ').trim())
}));
if (apres.ouvrables !== 9 || apres.muettes.length !== 1)
  fail('une entrée sans identifiants ne doit pas promettre une ouverture : ' + JSON.stringify(apres));
await page.evaluate(() =>
  [...document.querySelectorAll('button.ec-row')].find(n => /Marco/.test(n.textContent)).click());
await page.waitForSelector('.modal-b .pick-list');
const feuille = await page.evaluate(() => ({
  titre: document.querySelector('.mh-t')?.textContent || '',
  pistes: [...document.querySelectorAll('.modal-b .pick b')].map(n => n.textContent),
  note: document.querySelector('.modal-b .hint')?.textContent || ''
}));
if (!/reçu/i.test(feuille.titre) || feuille.pistes.join() !== 'Atelier local')
  fail('la feuille d’un échange ne montre pas ce qui a circulé : ' + JSON.stringify(feuille));
if (!/plus dans ton suivi/.test(feuille.note))
  fail('une piste supprimée depuis doit être dite, pas escamotée : ' + feuille.note);
await page.click('.modal-b .pick');
await attendre(page, async () => /Atelier local/.test(document.querySelector('.mh-t')?.textContent || ''),
  { message: 'taper une piste de l’échange ouvre sa fiche' });
await closeSheet();
await page.evaluate(async () => (await import('./engine/storage.js')).kvSet('oc_journal_v1', '[]'));
await page.goto(base + '/#/pistes');
console.log('Tes échanges : le fil se déplie, une ligne s’ouvre sur ses pistes, une vieille entrée ne promet rien ✓');

/* F9 : le poste de commandement — deux choses qui se reperdent seules.
   ① Le papier peint : « complète à 37 % » vivait sur CHAQUE carte du
   tableau, à la même valeur d'une carte à l'autre. §6.1 : une encre qui
   ne varie pas ne signale rien.
   ② La région sans propriétaire : les colonnes s'arrêtaient sur leur
   dernière carte (605 / 725 / 310 px côte à côte) et « Aujourd'hui »
   s'arrêtait à 53 % de la hauteur, le pied flottant sous un trou.
   Étirées, elles se partagent la région — et la cible de dépôt d'une
   colonne courte triple au passage, ce qui se vérifie ici. */
{
  const dCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const dPage = await dCtx.newPage();
  watchErrors(dPage);
  await dPage.goto(base + '/#/pistes', { waitUntil: 'load' });
  await dPage.evaluate(d => localStorage.setItem('oc_data_v3', JSON.stringify(d)),
    [['Alpha', 'todo'], ['Beta', 'todo'], ['Gamma', 'active'], ['Delta', 'reply']].map(([name, status], i) =>
      ({ id: 'bc' + i, name, city: 'Lille', domain: 'esn', status, contacts: [], updatedAt: Date.now() - i })));
  await dPage.reload({ waitUntil: 'load' });
  await attendre(dPage, () => document.querySelectorAll('.bcol').length === 3, { message: 'le tableau' });

  const board = await dPage.evaluate(() => ({
    pubs: [...document.querySelectorAll('.bcard')].filter(c => /complète à/.test(c.textContent)).length,
    cartes: document.querySelectorAll('.bcard').length,
    hauteurs: [...document.querySelectorAll('.bcol')].map(c => Math.round(c.getBoundingClientRect().height))
  }));
  if (board.pubs) fail(`« complète à N % » de retour sur ${board.pubs}/${board.cartes} cartes du tableau`);
  if (new Set(board.hauteurs).size !== 1)
    fail('les colonnes du tableau ne se partagent plus la région : ' + JSON.stringify(board.hauteurs));

  /* on lâche une carte tout en bas d'une colonne d'UNE seule carte :
     ce point n'appartenait à rien avant l'étirement */
  const pose = await dPage.evaluate(() => {
    const carte = [...document.querySelectorAll('.bcard')].find(c => c.textContent.includes('Alpha'));
    const col = document.querySelector('.bcol[data-st="reply"]');
    const r = col.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.bottom - 40;
    if (document.elementFromPoint(x, y)?.closest('.bcol') !== col) return 'le bas de la colonne ne vise rien';
    const dt = new DataTransfer();
    carte.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    for (const t of ['dragover', 'drop'])
      col.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y }));
    return 'ok';
  });
  if (pose !== 'ok') fail('dépôt en bas de colonne : ' + pose);
  await attendre(dPage, async () =>
    (await import('./ui/state.js')).S.companies.find(c => c.name === 'Alpha')?.status === 'reply',
    { message: 'la carte lâchée en bas de colonne change de statut' });

  /* « Aujourd'hui » : le pied est un pied, il se pose en bas */
  await dPage.goto(base + '/#/aujourdhui', { waitUntil: 'load' });
  await dPage.waitForSelector('.td-board');
  const jour = await dPage.evaluate(() => {
    const v = document.querySelector('#view-aujourdhui');
    const p = document.querySelector('.td-under');
    return { rempli: p ? Math.round(100 * p.getBoundingClientRect().bottom / v.getBoundingClientRect().bottom) : null,
             comprime: [...document.querySelectorAll('.bcol-rows')].some(c => c.scrollHeight > c.clientHeight + 1) };
  });
  if (jour.rempli !== null && jour.rempli < 85)
    fail(`le pied d'« Aujourd'hui » flotte à ${jour.rempli} % de la hauteur — la région n'est pas prise`);
  if (jour.comprime) fail('une colonne du jour est comprimée sous son contenu');
  await dPage.screenshot({ path: SHOTS + '/83-ux-poste-region.png' });
  await dCtx.close();
  console.log('poste : plus de « complète à N % », les colonnes se partagent la région, le pied se pose en bas ✓');
}

/* F10 : le mot de passe facultatif, un seul objet aux deux endroits.
   « Ma copie » ouvrait une ligne SOUS le bouton (+52 px), « Fichier »
   empilait case + libellé + champ + note (+100 px). Le cadenas s'étire
   maintenant en champ sur place. Trois choses se vérifient ici, parce
   que ce sont celles qui cassent en silence : la ligne ne grandit pas,
   le fichier produit est VRAIMENT chiffré quand la serrure est ouverte,
   et un mot de passe tapé puis renoncé ne repart pas avec le fichier. */
{
  const lCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true });
  const lPage = await lCtx.newPage();
  watchErrors(lPage);
  await lPage.goto(base + '/#/moi', { waitUntil: 'load' });
  await lPage.evaluate(() => localStorage.setItem('oc_data_v3', JSON.stringify(
    [{ id: 'lr1', name: 'Piste Témoin', city: 'Lille', status: 'active', contacts: [] }])));
  await lPage.reload({ waitUntil: 'load' });
  await lPage.waitForSelector('#moiBkLock');

  const hFset = () => lPage.evaluate(() => Math.round(
    document.querySelector('#moiBk').closest('.fset').getBoundingClientRect().height));
  const hRepos = await hFset();
  await lPage.click('#moiBkLock');
  await lPage.waitForTimeout(400);
  const hOuvert = await hFset();
  if (hOuvert !== hRepos)
    fail(`« Ma copie » grandit à l'ouverture (${hRepos} → ${hOuvert} px) : la saisie doit tenir dans la ligne`);
  const memeLigne = await lPage.evaluate(() => Math.abs(
    document.querySelector('#moiBkDo').getBoundingClientRect().top -
    document.querySelector('#moiBkPass').getBoundingClientRect().top) < 6);
  if (!memeLigne) fail('la saisie n’est pas sur la ligne de « Télécharger »');

  /* le fichier produit est-il chiffré pour de bon ? */
  const lire = async () => {
    const [dl] = await Promise.all([lPage.waitForEvent('download'), lPage.click('#moiBkDo')]);
    const flux = await dl.createReadStream();
    let t = ''; for await (const c of flux) t += c;
    return t.slice(0, 6);
  };
  await lPage.fill('#moiBkPass', 'colibri-1789');
  if (!(await lire()).startsWith('OC2.'))
    fail('serrure ouverte, la copie téléchargée n’est pas chiffrée');
  /* renoncer doit VRAIMENT oublier : re-taper le cadenas vide le champ */
  await lPage.click('#moiBkLock');
  await lPage.waitForTimeout(300);
  const oubli = await lPage.evaluate(() => document.querySelector('#moiBkPass').value);
  if (oubli !== '') fail('un mot de passe renoncé survit dans le champ : ' + JSON.stringify(oubli));
  if ((await lire()).startsWith('OC2.'))
    fail('serrure refermée, la copie sort quand même chiffrée');

  /* le même objet dans « Donner → Fichier » */
  await lPage.goto(base + '/#/echanger', { waitUntil: 'load' });
  await lPage.waitForSelector('#ecGive');
  await lPage.click('#ecGive');
  await attendre(lPage, () => [...document.querySelectorAll('.modal button, .modal .pick')]
    .some(b => /fichier/i.test(b.textContent)), { message: 'le choix du canal' });
  await lPage.evaluate(() => [...document.querySelectorAll('.modal button, .modal .pick')]
    .find(b => /fichier/i.test(b.textContent)).click());
  await lPage.waitForSelector('#dnCryptLock');
  const memeMotif = await lPage.evaluate(() => !!document.querySelector('#dnCrypt.lockrow')
    && !!document.querySelector('#dnCryptPass.lr-pass'));
  if (!memeMotif) fail('« Fichier » n’emploie pas le motif partagé du cadenas');
  const avertAvant = await lPage.evaluate(() => document.querySelector('#dnWarn').hidden);
  await lPage.click('#dnCryptLock');
  await lPage.waitForTimeout(300);
  const avertApres = await lPage.evaluate(() => document.querySelector('#dnWarn').hidden);
  if (!avertAvant || avertApres)
    fail('« Perdu = irrécupérable » doit paraître à l’ouverture de la serrure, et seulement là');
  await lPage.fill('#dnCryptPass', 'colibri-1789');
  const [dl2] = await Promise.all([lPage.waitForEvent('download'), lPage.click('#dnDl')]);
  const flux2 = await dl2.createReadStream();
  let t2 = ''; for await (const c of flux2) t2 += c;
  if (!t2.startsWith('OC2.')) fail('« Fichier » : serrure ouverte, le .oc n’est pas chiffré');
  /* et il se relit — un chiffrement qu'on ne sait pas rouvrir est une perte */
  const relu = await lPage.evaluate(async txt => {
    try { return (await (await import('./engine/crypto.js')).decryptOC2(txt, 'colibri-1789')) ? 'ok' : 'vide'; }
    catch (e) { return String(e); }
  }, t2);
  if (relu !== 'ok') fail('le .oc chiffré ne se rouvre pas avec son mot de passe : ' + relu);
  await lPage.screenshot({ path: SHOTS + '/84-ux-cadenas.png' });

  /* F11 : deux finitions qui se défont toutes seules.
     ① Une donnée se coupe à sa FIN. Jointes par <br> dans un bloc en
     `overflow-wrap:anywhere`, formation et adresse se brisaient n'importe
     où : sur un 360, « …ounchiouene@example » puis « .fr » seul.
     ② Un cadre ne porte pas de jeton dans sa légende : `tag-priv` y
     apportait bordure et trame, le filet lui passait derrière, et ça se
     lisait comme un contrôle (§6 : la bordure appartient à ce qui se tape). */
  /* la feuille « Donner » est encore ouverte : elle couvrirait la vue */
  await lPage.evaluate(async () => (await import('./ui/dom.js')).topSheet()?.close());
  await lPage.setViewportSize({ width: 360, height: 640 });
  await lPage.goto(base + '/#/moi', { waitUntil: 'load' });
  /* le profil vit dans IndexedDB une fois l'app démarrée : localStorage
     n'est plus qu'une source de migration, écrire dedans ne fait rien */
  await lPage.evaluate(async () => {
    const st = await import('./engine/storage.js');
    await st.kvSet(st.PROFILE_KEY, JSON.stringify({
      name: 'Maheydine Ounchiouene', formation: 'BTS SIO — option SISR',
      email: 'maheydine.ounchiouene@example.fr' }));
  });
  await lPage.reload({ waitUntil: 'load' });
  await lPage.waitForSelector('.obj-l');
  const identite = await lPage.evaluate(() => {
    const lignes = [...document.querySelectorAll('.obj-l')].map(n => {
      const une = parseFloat(getComputedStyle(n).lineHeight) || 16;
      return { txt: n.textContent, hauteur: n.getBoundingClientRect().height, une,
               coupe: n.scrollWidth > n.clientWidth + 1 };
    });
    const jeton = document.querySelector('.fset>legend .tag-priv, .fset>legend .tag-share');
    return { lignes, jeton: !!jeton };
  });
  for (const l of identite.lignes)
    if (l.hauteur > l.une * 1.6)
      fail(`« ${l.txt.slice(0, 24)} » se replie sur ${Math.round(l.hauteur / l.une)} lignes : une donnée se coupe à sa fin`);
  if (!identite.lignes.some(l => l.coupe))
    console.log('   (note : à 360 px rien ne dépassait — le garde ne prouve que le non-repli)');
  if (identite.jeton) fail('un jeton bordé est revenu dans une légende de cadre');
  await lPage.screenshot({ path: SHOTS + '/85-ux-identite.png' });
  await lCtx.close();
  console.log('cadenas : la ligne ne grandit pas, le fichier sort chiffré, un mot de passe renoncé s’oublie ✓');
  console.log('identité : une donnée se coupe à sa fin, aucun jeton bordé en légende ✓');
}

/* Effet miroir F1 : sans messagerie, le contrôle de campagne explique le
   prérequis et ne laisse pas Valider promettre une action impossible. */
await page.evaluate(async () => {
  const st = await import('./engine/storage.js');
  await st.kvSet(st.MAIL_KEY, '');
});
await page.reload({ waitUntil: 'load' });
await attendre(page, async () => (await import('./ui/state.js')).S.companies.length === 2);
await page.evaluate(async () => {
  const { openCampaignWizard } = await import('./ui/campagnes.js');
  const { S } = await import('./ui/state.js');
  openCampaignWizard([S.companies.find(c => c.id === 'avec-mail')]);
});
await page.click('.modal-f button:has-text("Vérifier la campagne")');
await page.waitForSelector('#czCx');
const campaignDisabled = await page.locator('.modal-f button:has-text("Valider la campagne")').isDisabled();
if (!campaignDisabled) fail('Valider la campagne devrait attendre la messagerie');
console.log('campagne sans canal : validation désactivée, lien Connecter présent ✓');
await closeSheet();

/* F2 + F3 + F6 toast : le téléphone ne tombe plus dans une impasse ; les
   relais sont réglables dans un volet avancé, et un ancien toast s'efface
   quand une nouvelle feuille s'ouvre. */
await page.evaluate(async () => (await import('./ui/dom.js')).toast('Ancien retour'));
await page.waitForSelector('#toast.on');
await page.evaluate(async () => (await import('./ui/direct.js')).openAppareils());
await page.waitForSelector('.sy-relays');
if (await page.$('#toast.on')) fail('un ancien toast recouvre la nouvelle feuille');
/* Le correctif F2 (la copie honnête du Compagnon sur téléphone) ne se
   vérifie que si le Compagnon est à l'écran. Hors périmètre (CLAUDE.md §0),
   c'est SON ABSENCE qui est la règle — on vérifie donc l'inverse, plutôt
   que de sauter en silence : rien ne doit nommer le Compagnon ici. */
const deviceText = await page.locator('.modal-b').innerText();
if (COMPAGNON){
  /* la ligne dit l'ÉTAT, pas la phrase (même règle que la liste des
     Réglages) : « pas installé · voir › ». Le chemin — c'est un logiciel
     d'ordinateur — se dit sur l'écran d'après, vérifié juste en dessous. */
  if (!/Le Compagnon[\s\S]*pas installé/.test(deviceText))
    fail('la ligne Compagnon n’annonce pas son état : ' + deviceText.slice(0, 220));
  if (/depuis ton ordinateur/.test(deviceText))
    fail('la ligne Compagnon réexplique au lieu de dire son état : ' + deviceText.slice(0, 220));
  if (await page.$('#devAddComp')) fail('le téléphone ne doit pas proposer un appairage local impossible');
  /* la ligne s'ouvre : le téléphone apprend le chemin (ordinateur d'abord),
     peut s'envoyer le lien, et sait quoi faire ensuite depuis ici */
  await page.click('#devCompInfo');
  await page.waitForSelector('.modal-f .btn-primary');
  const phoneTxt = await page.locator('.modal-b').last().innerText();
  if (!/depuis ton ordinateur/.test(phoneTxt) || !/Ajouter le Compagnon/.test(phoneTxt))
    fail('feuille Compagnon téléphone : chemin absent — ' + phoneTxt.slice(0, 200));
  if (!/depuis ce téléphone/.test(phoneTxt))
    fail('feuille Compagnon téléphone : l’usage depuis le téléphone manque');
  if (!/Copier le lien/.test(await page.locator('.modal-f').last().innerText()))
    fail('feuille Compagnon téléphone : pas de lien à copier');
  await page.evaluate(async () => (await import('./ui/dom.js')).topSheet()?.close());
} else {
  if (/Compagnon/.test(deviceText))
    fail('hors périmètre, « Mes appareils » nomme encore le Compagnon : ' + deviceText.slice(0, 220));
  if (await page.$('#devAddComp') || await page.$('#devCompInfo'))
    fail('hors périmètre, une entrée Compagnon subsiste dans « Mes appareils »');
  console.log('Mes appareils : aucune trace du Compagnon (hors périmètre) ✓');
}
await page.click('.sy-relays summary');
await page.fill('#syRelays', 'https://pas-un-relais.example');
await page.click('#sySaveRelays');
await page.waitForFunction(() => /wss:\/\//.test(document.querySelector('#toast')?.textContent || ''));
await page.fill('#syRelays', 'wss://relay-one.example\nwss://relay-two.example\nwss://relay-one.example');
await page.click('#sySaveRelays');
await attendre(page, async () => {
  const st = await import('./engine/storage.js');
  return JSON.parse(await st.kvGet(st.RELAYS_KEY) || '[]').length === 2;
});
const relays = await page.evaluate(async () => {
  const st = await import('./engine/storage.js');
  return JSON.parse(await st.kvGet(st.RELAYS_KEY));
});
if (!relays.every(x => x.startsWith('wss://'))) fail('relais non sûrs enregistrés : ' + relays.join(', '));
/* le serveur TURN se règle au même endroit : mauvaise adresse refusée,
   bonne adresse rangée (urls/username/credential) sous oc_turn_v1.
   (l'enregistrement des relais a re-rendu la feuille : le volet
   « Connexion avancée » se rouvre) */
await page.click('.sy-relays summary');
await page.fill('#syTurn', 'wss://pas-un-turn.example');
await page.click('#sySaveRelays');
await page.waitForFunction(() => /TURN attendu/.test(document.querySelector('#toast')?.textContent || ''));
await page.fill('#syTurn', 'turns:turn.exemple.org:443 etudiant secret');
await page.click('#sySaveRelays');
await attendre(page, async () => {
  const st = await import('./engine/storage.js');
  const t = JSON.parse(await st.kvGet(st.TURN_KEY) || '[]');
  return t.length === 1 && t[0].urls === 'turns:turn.exemple.org:443' &&
    t[0].username === 'etudiant' && t[0].credential === 'secret';
});
console.log('Compagnon mobile honnête + relais avancés + TURN validés ✓');
await page.screenshot({ path: SHOTS + '/81-ux-appareils-mobile.png' });
await closeSheet();
await browser.close();

/* Le même message honnête est présent dans « Depuis mes e-mails ». Cette
   vérification reste isolée : elle ne dépend pas des relais factices testés
   juste avant et ne tente donc jamais de les joindre. */
const receiveBrowser = await chromium.launch({ executablePath: chromiumPath() });
const receiveCtx = await receiveBrowser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const receivePage = await receiveCtx.newPage();
watchErrors(receivePage);
await receivePage.goto(base, { waitUntil: 'load' });
await attendre(receivePage, async () => !!(await import('./ui/state.js')).S.profile);
await receivePage.evaluate(async () => (await import('./ui/recevoir.js')).openImportMails());
await receivePage.waitForSelector('#rcMailTxt');
const scanText = await receivePage.locator('.modal-b').innerText();
if (COMPAGNON){
  if (!/s.installe et s.associe depuis ton ordinateur/i.test(scanText) || /Moi → Mes appareils/.test(scanText))
    fail('copie Compagnon mobile ambiguë : ' + scanText.slice(0, 260));
} else {
  /* Hors périmètre, la source garde son chemin « je colle » — il ne demande
     ni installation ni compte — mais ne vante plus une surface absente. */
  if (/Compagnon/.test(scanText))
    fail('hors périmètre, « Depuis mes e-mails » nomme encore le Compagnon : ' + scanText.slice(0, 260));
  if (!/Copie le prompt/.test(scanText))
    fail('le chemin « je colle » a disparu alors qu\'il ne demande rien : ' + scanText.slice(0, 260));
  console.log('Depuis mes e-mails : chemin « je colle » intact, aucune surface absente vantée ✓');
}
console.log('Depuis mes e-mails : consigne mobile réalisable ✓');

/* F6 IA : le branchement par clé n'est proposé que si `IA` est allumé, et
   seules les familles JOIGNABLES y figurent — une famille qui passe par
   l'ordinateur n'apparaît qu'avec cette surface (loi #6). Éteint, ce n'est
   pas un trou à ignorer : on vérifie l'INVERSE, c'est-à-dire que la ligne a
   bien quitté les réglages. La page propre du scénario précédent reste
   indépendante du test réseau. */
const aiPage = receivePage;
await aiPage.evaluate(async () => (await import('./ui/dom.js')).topSheet()?.close());
if (IA){
  await aiPage.evaluate(async () => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    const { createVault, makeVaultPhrase } = await import('./engine/vault.js');
    const made = await createVault('280941', makeVaultPhrase(), { iter: 15000 });
    await st.kvSet(st.VAULT_KEY, JSON.stringify(made.meta));
  });
  await aiPage.reload({ waitUntil: 'load' });
  await aiPage.waitForSelector('.lock .pad-k');
  await tapIn(aiPage, '.lock', '280941');
  await aiPage.waitForFunction(() => !document.querySelector('.lock'));
  await aiPage.evaluate(() => { import('./ui/connexions.js').then(m => m.openAssistantIA()); });
  await aiPage.waitForSelector('#rqPad .pad-k');
  await tapIn(aiPage, '#rqPad', '280941');
  await aiPage.waitForSelector('[data-ai="gemini"]');
  /* Chaque famille présente dit son chemin, et aucune n'est grisée : une
     option qu'on ne peut pas activer ne s'affiche pas du tout. */
  const aiUi = await aiPage.evaluate(() => {
    const fam = {};
    for (const b of document.querySelectorAll('[data-ai]'))
      fam[b.dataset.ai] = { txt: b.textContent, off: !!b.disabled };
    return fam;
  });
  const viaPC = ['openai', 'ollama'].filter(k => aiUi[k]);
  if (!aiUi.gemini || !/Clé API · ici/.test(aiUi.gemini.txt))
    fail('famille joignable mal nommée : ' + JSON.stringify(aiUi));
  if (Object.values(aiUi).some(f => f.off) || /pas encore disponible/.test(JSON.stringify(aiUi)))
    fail('une famille est proposée sans pouvoir répondre : ' + JSON.stringify(aiUi));
  if (COMPAGNON ? viaPC.some(k => !/via ton ordinateur/.test(aiUi[k].txt))
                : viaPC.length)
    fail('familles « via ton ordinateur » incohérentes avec la surface : ' + JSON.stringify(aiUi));
  console.log('connexions IA : chaque famille dit son chemin, aucune grisée ✓');
  await aiPage.waitForTimeout(350);
  await aiPage.screenshot({ path: SHOTS + '/82-ux-ia-disponibilite.png' });
} else {
  await aiPage.goto(base + '/#/moi', { waitUntil: 'load' });
  /* sur téléphone, Réglages est le 2ᵉ écran de « Moi » (la porte #20) */
  await aiPage.click('#moiReglages');
  await aiPage.waitForSelector('#moiVerrou');
  const moiTxt = await aiPage.locator('#view-moi').innerText();
  if (await aiPage.$('#moiAi')) fail('hors périmètre, la ligne « Mon assistant IA » subsiste');
  if (/assistant IA|clé API/i.test(moiTxt))
    fail('hors périmètre, les réglages nomment encore l’IA : ' + moiTxt.slice(0, 260));
  console.log('hors périmètre : aucune ligne « Mon assistant IA » dans les réglages ✓');
}

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await receiveBrowser.close();
server.close();
console.log(process.exitCode ? 'E2E audit UX : ÉCHEC' : 'E2E audit UX : OK');
