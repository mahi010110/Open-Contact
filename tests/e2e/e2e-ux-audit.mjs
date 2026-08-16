/* E2E corrections prioritaires de l'audit UX : aucune action primaire morte,
   parcours Compagnon mobile honnête, relais avancés accessibles, cibles au
   pouce, contact sans doublon et fournisseurs IA non livrés non activables. */
import { readFileSync } from 'fs';
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
await page.click('#view-pistes h1');
await page.keyboard.press('/');
const focus = await page.evaluate(() => document.activeElement && document.activeElement.id);
if (focus !== 'piQ') fail('« / » ne ramène pas au champ de recherche (focus : ' + focus + ')');
/* « n » ouvre une piste de plus, de n'importe où — et JAMAIS quand on
   tape : un raccourci qui s'invite dans un champ de saisie est un bug,
   pas un raccourci. */
await page.keyboard.type('nn');
if (await page.$('.overlay')) fail('« n » tapé dans la recherche ouvre une feuille');
await page.fill('#piQ', '');
await page.click('#view-pistes h1');
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
/* LE FIL EST UN JOURNAL, PAS UN TITRE. Il portait le même gras qu'un
   nom de piste et pesait donc autant que les deux gestes qu'il
   surplombe — alors qu'il raconte ce qui est DÉJÀ fait. Deux ou trois
   niveaux au maximum : les gestes, le fil, la date.
   Et une ligne se retire, avec le motif de l'app — glisser au pouce,
   poubelle au survol, « Annuler » à la place d'une confirmation. */
const poids = await page.evaluate(() => {
  const b = document.querySelector('.ec-row b');
  const g = document.querySelector('.hero2 .btn.hero span, .hero2 .btn.hero');
  return { fil: +getComputedStyle(b).fontWeight,
           geste: g ? +getComputedStyle(g).fontWeight : 0,
           poubelle: !!document.querySelector('.ec-l .hov-del') };
});
if (poids.fil >= 600)
  fail(`le fil pèse ${poids.fil} — un journal ne porte pas le gras d'un titre, il raconte ce qui est fait`);
else if (poids.fil >= poids.geste)
  fail(`le fil (${poids.fil}) pèse autant que les gestes (${poids.geste}) qu'il surplombe`);
else if (!poids.poubelle)
  fail('aucune façon de retirer une ligne du fil');
else {
  const avant = await page.evaluate(() => document.querySelectorAll('.ec-l').length);
  /* les DEUX premières : c'est le seul moyen de vérifier que la ligne
     qui disparaît est bien celle qu'on a désignée. Une mutation qui
     faisait pointer toutes les lignes sur la même entrée du journal
     passait sans broncher — on supprimait une ligne, c'en était une
     autre qui partait, et le compte tombait quand même de un. */
  const [premier, second] = await page.evaluate(() =>
    [...document.querySelectorAll('.ec-row b')].slice(0, 2).map(b => b.textContent.trim()));
  await page.evaluate(() => document.querySelector('.ec-l .hov-del').click());
  await page.waitForFunction(n => document.querySelectorAll('.ec-l').length === n - 1, avant);
  const tete = await page.evaluate(() => document.querySelector('.ec-row b').textContent.trim());
  if (tete !== second)
    fail(`la ligne supprimée n'est pas celle qu'on a désignée : « ${premier} » visée, `
      + `« ${tete} » en tête au lieu de « ${second} »`);
  const undo = await page.evaluate(() =>
    [...document.querySelectorAll('button')].find(b => /Annuler/i.test(b.textContent)) ? 1 : 0);
  if (!undo) fail('une ligne retirée sans « Annuler » — le geste est irréversible');
  await page.evaluate(() =>
    [...document.querySelectorAll('button')].find(b => /Annuler/i.test(b.textContent)).click());
  await page.waitForFunction(n => document.querySelectorAll('.ec-l').length === n, avant);
  /* « Annuler » remet la ligne À SA PLACE, pas à la fin : sinon le fil
     se réordonnerait tout seul sous les yeux */
  const rendu = await page.evaluate(() => document.querySelector('.ec-row b').textContent.trim());
  if (rendu !== premier)
    fail(`« Annuler » a remis la ligne ailleurs (« ${rendu} » au lieu de « ${premier} »)`);
  else console.log(`fil : poids ${poids.fil} contre ${poids.geste} aux gestes, `
    + 'une ligne se retire et « Annuler » la remet à sa place ✓');
}
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
  /* des noms et des villes de la vraie vie : c'est leur LONGUEUR qui fait
     replier une ligne de liste, et un jeu d'essai en « Alpha / Beta »
     laisse passer exactement le défaut qu'on veut attraper */
  await dPage.evaluate(d => localStorage.setItem('oc_data_v3', JSON.stringify(d)),
    [['Orange Cyberdefense', 'Villeneuve-d’Ascq', 'todo'], ['Capgemini', 'Valenciennes', 'todo'],
     ['Worldline', 'Seclin', 'active'], ['Sopra Steria', 'Valenciennes', 'reply']]
      .map(([name, city, status], i) =>
        ({ id: 'bc' + i, name, city, domain: 'esn', status, contacts: [], updatedAt: Date.now() - i })));
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
    const carte = [...document.querySelectorAll('.bcard')].find(c => c.textContent.includes('Orange Cyberdefense'));
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
    (await import('./ui/state.js')).S.companies.find(c => c.name === 'Orange Cyberdefense')?.status === 'reply',
    { message: 'la carte lâchée en bas de colonne change de statut' });

  /* « Aujourd'hui » : le pied est un pied, il se pose en bas.
     Ce bloc a pour sujet le TABLEAU à trois colonnes — il faut donc du
     travail planifié pour qu'il existe : sans aucune action, l'écran
     montre désormais « Par où commencer » à la place (trois colonnes
     vides ne sont pas une bonne nouvelle, c'est un mur de rien). La
     nouvelle tranche a son propre garde, `e2e-commencer.mjs`. */
  await dPage.evaluate(async () => {
    /* par le MAGASIN, pas par la clé brute : écrire dans `oc_data_v3` à
       la main ignore le scellement éventuel et se fait écraser par le
       premier `saveData()` de la page */
    const { S, saveData } = await import('./ui/state.js');
    const { isClosed } = await import('./ui/state.js');
    const c = S.companies.find(x => !isClosed(x)) || S.companies[0];
    c.nextAction = new Date().toISOString().slice(0, 10);
    c.nextActionText = 'Relancer';
    saveData();
  });
  await dPage.goto(base + '/#/aujourdhui', { waitUntil: 'load' });
  await attendre(dPage, () => !!document.querySelector('.td-board'), {
    message: 'le tableau du jour — il lui faut du travail planifié pour exister, '
           + 'sinon l’écran montre « Par où commencer » (garde : e2e-commencer.mjs)' });
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

  /* Une liste se BALAIE : ses lignes ont toutes la même hauteur et le
     chevron tombe toujours au même endroit. `.pk-m` ne portait sa
     structure que sous `.pk` (les listes à cocher) ; sous `.pick` seul,
     ses deux enfants coulaient en ligne comme du texte — « Capgemini À
     contacter · » puis « Valenciennes » à la ligne, le chevron chassé au
     bas d'une boîte deux fois trop haute, et une hauteur par longueur de
     nom. On le vérifie au pouce ET au poste : c'est la même liste. */
  for (const [lw, lh] of [[360, 640], [1280, 800]]){
    await dPage.setViewportSize({ width: lw, height: lh });
    await dPage.goto(base + '/#/echanger', { waitUntil: 'load' });
    await dPage.evaluate(async () => {
      const st = await import('./engine/storage.js');
      const { S } = await import('./ui/state.js');
      await st.kvSet(st.JOURNAL_KEY, JSON.stringify([{ t: Date.now() - 3600e3, sens: 'donne',
        canal: 'fichier', txt: 'Donné (fichier) : 4 piste(s)', ids: S.companies.map(c => c.id) }]));
    });
    await dPage.reload({ waitUntil: 'load' });
    await attendre(dPage, () => !!document.querySelector('button.ec-row'), { message: 'le fil' });
    await dPage.click('button.ec-row');
    await attendre(dPage, () => document.querySelectorAll('.modal-b .pick').length >= 4,
      { message: 'les lignes de l’échange' });
    const reg = await dPage.evaluate(() => {
      const rows = [...document.querySelectorAll('.modal-b .pick')];
      return {
        n: rows.length,
        hauteurs: [...new Set(rows.map(r => Math.round(r.getBoundingClientRect().height)))],
        chevrons: [...new Set(rows.map(r => {
          const c = r.querySelector('.ic');
          return c ? Math.round(r.getBoundingClientRect().right - c.getBoundingClientRect().right) : null;
        }))],
        deborde: rows.some(r => {
          const m = r.querySelector('.pk-m'), b = m && m.querySelector('b');
          return b && b.getBoundingClientRect().width > m.getBoundingClientRect().width + 1;
        })
      };
    });
    if (reg.hauteurs.length !== 1)
      fail(`@${lw} les lignes d'une liste n'ont pas la même hauteur : ${JSON.stringify(reg.hauteurs)}`);
    if (reg.chevrons.length !== 1)
      fail(`@${lw} le chevron ne tombe pas au même endroit : ${JSON.stringify(reg.chevrons)}`);
    if (reg.deborde) fail(`@${lw} un nom déborde de son bloc au lieu de se couper`);
    console.log(`   liste d'échange @${lw} : ${reg.n} lignes × ${reg.hauteurs[0]} px, chevron à ${reg.chevrons[0]} px ✓`);
    if (lw === 360) await dPage.screenshot({ path: SHOTS + '/86-ux-lignes-pouce.png' });
  }
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

/* F12 : la largeur dit le DESSIN, le pointeur dit la MAIN.
   `--ctl` basculait de 44 à 32 px sur la seule largeur : une tablette
   tactile en paysage (1024-1366 px) recevait donc l'ergonomie souris —
   10 cibles sur 11 sous 44 px, la plus petite à 30 px, pour un doigt.
   Et `--input-fs` retombait à 14 px, ce qui rouvre le zoom automatique
   d'iOS au focus d'un champ, exactement ce que le 16 px évite au pouce.
   On vérifie les deux mains sur la MÊME largeur : c'est le pointeur, et
   lui seul, qui doit faire la différence. */
for (const [nom, ptr] of [['doigt', true], ['souris', false]]){
  const tCtx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: ptr });
  const tPage = await tCtx.newPage();
  watchErrors(tPage);
  await tPage.goto(base + '/#/pistes', { waitUntil: 'load' });
  await tPage.evaluate(async () => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify([
      { id: 'tt', name: 'Sopra Steria', city: 'Lille', domain: 'esn', status: 'todo', contacts: [] }]));
  });
  await tPage.reload({ waitUntil: 'load' });
  await attendre(tPage, async () => (await import('./ui/state.js')).S.companies.length === 1);
  const erg = await tPage.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const petites = [...document.querySelectorAll('button, a[href], input, select')]
      .filter(n => n.getClientRects().length && !n.closest('.bottomnav'))
      .map(n => ({ t: (n.textContent || n.getAttribute('aria-label') || n.tagName).trim().slice(0, 22),
                   h: Math.round(n.getBoundingClientRect().height) }))
      .filter(c => c.h < 44);
    /* la taille CALCULÉE d'un vrai champ, pas le token : depuis que
       `--input-fs` vaut `max(16px, 1rem)`, lire la variable rend une
       expression que `parseInt` transforme en NaN — et `NaN < 16` étant
       faux, le contrôle passait au vert sans rien vérifier. */
    const champ = document.querySelector('#piQ, input, textarea');
    return { ctl: cs.getPropertyValue('--ctl').trim(),
             fs: champ ? Math.round(parseFloat(getComputedStyle(champ).fontSize)) : 0,
             fin: matchMedia('(pointer:fine)').matches, petites,
             colonnes: document.querySelectorAll('.bcol').length };
  });
  if (erg.fin !== !ptr)
    console.log(`   (le contexte « ${nom} » rend pointer:${erg.fin ? 'fine' : 'coarse'} — contrôle ignoré)`);
  else if (ptr){
    if (erg.ctl !== '44px') fail(`tablette au doigt : --ctl vaut ${erg.ctl}, la main veut 44 px`);
    if (erg.fs < 16)
      fail(`tablette au doigt : champ rendu à ${erg.fs}px — iOS zoomera à la mise au point`);
    if (erg.petites.length)
      fail(`tablette au doigt : ${erg.petites.length} cible(s) sous 44 px — ` +
        erg.petites.map(c => `${c.h}px « ${c.t} »`).join(' · '));
  } else if (erg.ctl !== '32px')
    fail(`tablette à la souris : --ctl vaut ${erg.ctl}, la souris veut 32 px`);
  /* et le DESSIN, lui, ne bouge pas : 1180 px reste le tableau */
  if (erg.colonnes !== 3)
    fail(`à 1180 px le tableau doit rester en 3 colonnes (${nom}) — vu ${erg.colonnes}`);
  await tCtx.close();
  console.log(`   ergonomie « ${nom} » @1180 : --ctl ${erg.ctl}, champs ${erg.fs}px, tableau 3 colonnes ✓`);
}

/* F13 : l'app suit la police choisie par l'utilisateur.
   Toute l'échelle était en px : quelqu'un qui agrandit la police par
   défaut de son navigateur pour y voir — la première chose que fait une
   vision basse — n'obtenait RIEN. Mesuré : racine à 24 px, tout restait
   à 20 / 14 / 13. En `rem`, l'échelle suit. Ce qui se vérifie ici, c'est
   les deux moitiés : que ça grandisse, ET que la page tienne quand même
   (l'avertissement d'Apple : ce qui rentre à taille normale déborde à
   taille accessible). */
{
  const mesures = [];
  for (const racine of [16, 24]){
    const zCtx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true });
    const zPage = await zCtx.newPage();
    watchErrors(zPage);
    await zPage.addInitScript(px => {
      addEventListener('DOMContentLoaded', () =>
        document.documentElement.style.setProperty('font-size', px + 'px'));
    }, racine);
    await zPage.goto(base + '/#/pistes', { waitUntil: 'load' });
    await zPage.evaluate(async () => {
      const st = await import('./engine/storage.js');
      await st.kvInit();
      await st.kvSet(st.DATA_KEY, JSON.stringify([
        { id: 'z1', name: 'Orange Cyberdefense', city: 'Villeneuve-d’Ascq', domain: 'cyber',
          status: 'active', nextActionText: 'Relancer Awa', nextAction: '2026-08-03', contacts: [] }]));
    });
    await zPage.reload({ waitUntil: 'load' });
    await attendre(zPage, async () => (await import('./ui/state.js')).S.companies.length === 1);
    /* Attendre l'écran AVANT de le mesurer. Vu une fois : « Mes pistes »
       pas encore dessiné, `px()` rendait 0 partout — le contrôle du champ
       criait « 0 px, iOS zoomera » (faux) pendant que le rapport d'échelle
       (grand > petit × 1,3) devenait toujours vrai, donc aveugle. Un écran
       absent doit se DIRE, jamais se laisser mesurer à zéro. */
    await zPage.waitForSelector('#view-pistes:not([hidden]) h1');
    await zPage.waitForSelector('#piQ');
    const z = await zPage.evaluate(() => {
      const px = s => { const n = document.querySelector(s); return n ? parseFloat(getComputedStyle(n).fontSize) : null; };
      /* un libellé coupé AUX DEUX BOUTS : le début part avec la fin */
      const coupes = [...document.querySelectorAll('.bottomnav .bn-l')]
        .filter(n => n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).textOverflow !== 'ellipsis')
        .map(n => n.textContent);
      return { titre: px('#view-pistes h1'), champ: px('#piQ'),
        deborde: document.documentElement.scrollWidth > innerWidth + 1, coupes };
    });
    if (z.titre == null || z.champ == null)
      fail(`racine ${racine}px : « Mes pistes » n'était pas dessiné — rien n'a été mesuré`);
    if (z.deborde) fail(`racine ${racine}px : la page déborde en largeur`);
    if (z.coupes.length) fail(`racine ${racine}px : libellé coupé aux deux bouts — ${z.coupes.join(', ')}`);
    /* le champ ne descend JAMAIS sous 16 px, sinon iOS zoome au focus */
    if (z.champ != null && z.champ < 16)
      fail(`racine ${racine}px : champ à ${z.champ}px — iOS zoomera à la mise au point`);
    mesures.push({ racine, titre: z.titre });
    if (racine === 24) await zPage.screenshot({ path: SHOTS + '/87-ux-texte-agrandi.png' });
    await zCtx.close();
  }
  const [petit, grand] = mesures;
  if (!petit.titre || !grand.titre)
    fail(`échelle non mesurable : titre ${petit.titre} à racine 16, ${grand.titre} à racine 24`);
  else if (!(grand.titre > petit.titre * 1.3))
    fail(`l'échelle ne suit pas la police de l'utilisateur : ${petit.titre}px à racine 16, ` +
      `${grand.titre}px à racine 24 — une échelle en px ignore ce réglage`);
  console.log(`   police de l'utilisateur suivie : titre ${petit.titre}px → ${grand.titre}px, ` +
    `page tenue, aucun libellé coupé aux deux bouts ✓`);
}

/* F14 : deux critères WCAG nommés, que rien ne vérifiait.
   · 1.4.10 Reflow — à 320 px de large, aucun défilement horizontal.
     C'est l'équivalent d'un zoom à 400 % sur un écran de 1280.
   · 1.4.12 Text Spacing — l'utilisateur peut imposer interligne 1,5×,
     lettres 0,12em, mots 0,16em, paragraphes 2× ; rien ne doit se
     couper. Une feuille de style personnelle fait exactement ça.
   Le `-webkit-line-clamp` est EXCLU du compte : il pose des points de
   suspension, c'est une troncature annoncée et le texte entier reste à
   un tap. Sans cette exclusion l'instrument criait au loup sur les deux
   lignes tronquées de « Mes pistes », qui vont très bien. */
{
  const ESPACEMENT = `* { line-height:1.5 !important; letter-spacing:0.12em !important;
    word-spacing:0.16em !important; } p { margin-bottom:2em !important; }`;
  for (const [quoi, largeur, css] of [
    ['1.4.10 reflow à 320 px', 320, ''],
    ['1.4.10 reflow à 320 px, police 24 px', 320, ':root{font-size:24px}'],
    ['1.4.12 espacement du texte', 390, ESPACEMENT]
  ]){
    const wCtx = await browser.newContext({ viewport: { width: largeur, height: 640 }, hasTouch: true });
    const wPage = await wCtx.newPage();
    watchErrors(wPage);
    await wPage.goto(base + '/#/pistes', { waitUntil: 'load' });
    await wPage.evaluate(async () => {
      const st = await import('./engine/storage.js');
      await st.kvInit();
      await st.kvSet(st.DATA_KEY, JSON.stringify([
        { id: 'w1', name: 'Orange Cyberdefense', city: 'Villeneuve-d’Ascq', domain: 'cyber',
          status: 'active', nextActionText: 'Relancer Madame Bertrand', nextAction: '2026-08-03', contacts: [] },
        { id: 'w2', name: 'Capgemini', city: 'Valenciennes', domain: 'esn', status: 'todo', contacts: [] }]));
    });
    await wPage.reload({ waitUntil: 'load' });
    await attendre(wPage, async () => (await import('./ui/state.js')).S.companies.length === 2);
    for (const r of ['aujourdhui', 'pistes', 'echanger', 'moi']){
      await wPage.goto(base + '/#/' + r, { waitUntil: 'load' });
      if (css) await wPage.addStyleTag({ content: css });
      await wPage.waitForTimeout(300);
      const m = await wPage.evaluate(() => {
        const coupes = [];
        for (const n of document.querySelectorAll('main *')){
          if (!n.getClientRects().length) continue;
          const s = getComputedStyle(n);
          if (!/hidden|clip/.test(s.overflowY)) continue;
          if (s.webkitLineClamp && s.webkitLineClamp !== 'none') continue;
          if (n.scrollHeight > n.clientHeight + 2 &&
              [...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()))
            coupes.push(`${(n.id ? '#' + n.id : n.className || n.tagName).toString().slice(0, 24)} ` +
              `« ${n.textContent.trim().slice(0, 22)} »`);
        }
        /* Le document n'est PAS le conteneur qui défile ici : `.view` a
           `overflow-y:auto`, ce qui rend son axe X « auto » lui aussi.
           Un contenu trop large y défile donc EN SILENCE, sans jamais
           faire grandir `documentElement.scrollWidth`. Vérifié en
           cassant : un `min-width:400px` sur `.page-inner` passait le
           contrôle au vert. On interroge tous les scrollers. */
        const boites = [document.documentElement, ...document.querySelectorAll('.view, main, .modal-b')];
        const trop = boites
          .filter(n => n.getClientRects?.().length !== 0 && n.scrollWidth > n.clientWidth + 1)
          .map(n => `${(n.id ? '#' + n.id : n.className || n.tagName).toString().slice(0, 20)} ` +
            `${n.scrollWidth}>${n.clientWidth}`);
        return { defile: trop.length > 0, ou: trop, coupes: [...new Set(coupes)] };
      });
      if (m.defile) fail(`${quoi} — ${r} : défilement horizontal — ${m.ou.join(' · ')}`);
      for (const c of m.coupes.slice(0, 3))
        fail(`${quoi} — ${r} : texte rogné en hauteur, sans ellipsis — ${c}`);
    }
    await wCtx.close();
    console.log(`   ${quoi} ✓`);
  }
}

/* F15 : les deux déplacements entre états qui sautaient (#38).
   ① Une carte lâchée dans une autre colonne se téléportait.
   ② Une section repliée s'ouvrait d'un coup.
   Les deux sont « le déplacement entre états » que CLAUDE.md §4 autorise
   à être doux — et les deux doivent redevenir instantanés dès que le
   système demande moins d'animation.

   ATTENTION en modifiant ce bloc : ne lisez PAS la géométrie de la
   section juste avant de la cliquer. Cette lecture force un calcul de
   mise en page, ce qui suffit à faire démarrer la transition — un garde
   écrit comme ça passe au vert même quand l'animation est cassée. C'est
   exactement ce défaut-là qui a été trouvé ici. */
for (const [nom, motion] of [['normal', 'no-preference'], ['mouvement réduit', 'reduce']]){
  const doux = motion === 'no-preference';
  const mCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: motion });
  const mPage = await mCtx.newPage();
  watchErrors(mPage);
  await mPage.goto(base + '/#/pistes', { waitUntil: 'load' });
  await mPage.evaluate(async () => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    /* la date se CALCULE. Elle était écrite en dur (« 2026-08-14 ») pour
       tomber dans « Bientôt » — jusqu'au jour où le calendrier l'a
       rattrapée : la piste est passée dans « Aujourd'hui », la section
       « Bientôt » a disparu, et la garde a échoué sans que rien n'ait
       bougé dans l'app. Une garde ne doit pas se périmer toute seule. */
    const dans5j = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
    await st.kvSet(st.DATA_KEY, JSON.stringify([
      { id: 'mv1', name: 'Capgemini', city: 'Valenciennes', domain: 'esn', status: 'todo', contacts: [] },
      { id: 'mv2', name: 'Worldline', city: 'Seclin', domain: 'esn', status: 'active', contacts: [] },
      { id: 'mv3', name: 'Atos', city: 'Paris', domain: 'esn', status: 'todo', contacts: [],
        nextAction: dans5j, nextActionText: 'Relancer le service RH' }]));
  });
  await mPage.reload({ waitUntil: 'load' });
  await attendre(mPage, () => document.querySelectorAll('.bcard').length >= 3, { message: 'le tableau' });

  /* ① la carte : combien d'images portent une transformée ? */
  const img = await mPage.evaluate(async () => {
    const carte = [...document.querySelectorAll('.bcard')].find(c => c.textContent.includes('Capgemini'));
    const col = document.querySelector('.bcol[data-st="reply"]');
    const r = col.getBoundingClientRect();
    const dt = new DataTransfer();
    carte.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    for (const t of ['dragover', 'drop'])
      col.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt,
        clientX: r.left + r.width / 2, clientY: r.bottom - 40 }));
    const vus = []; const t0 = performance.now();
    await new Promise(res => {
      const tick = () => {
        const c = [...document.querySelectorAll('.bcard')].find(x => x.textContent.includes('Capgemini'));
        if (c) vus.push(getComputedStyle(c).transform);
        if (performance.now() - t0 < 420) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    return vus.filter(t => t && t !== 'none').length;
  });
  if (doux && img < 3) fail(`la carte déposée se téléporte encore (${img} images animées)`);
  if (!doux && img > 0) fail(`mouvement réduit demandé, la carte glisse quand même (${img} images)`);

  /* ② la section repliée, au pouce */
  await mPage.setViewportSize({ width: 390, height: 844 });
  await mPage.goto(base + '/#/aujourdhui', { waitUntil: 'load' });
  await attendre(mPage, () => !!document.querySelector('details.tr-soon summary'),
    { message: 'la section « Bientôt »' });
  const pli = await mPage.evaluate(async () => {
    const d = document.querySelector('details.tr-soon');
    const hs = []; const t0 = performance.now();
    d.querySelector('summary').click();
    await new Promise(res => {
      const tick = () => {
        hs.push(Math.round(d.getBoundingClientRect().height));
        if (performance.now() - t0 < 420) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    const deb = hs[0], fin = hs[hs.length - 1];
    return { ouvert: d.open, deb, fin, inter: hs.filter(h => h > deb + 2 && h < fin - 2).length };
  });
  if (!pli.ouvert) fail('la section « Bientôt » ne s’ouvre plus');
  if (doux && pli.inter < 3)
    fail(`la section s'ouvre encore d'un coup (${pli.deb}→${pli.fin} px, ${pli.inter} images)`);
  if (!doux && pli.inter > 1)
    fail(`mouvement réduit demandé, la section s'anime quand même (${pli.inter} images)`);
  await mCtx.close();
  console.log(`   mouvements [${nom}] : carte ${img} images · section ${pli.deb}→${pli.fin} px, ${pli.inter} images ✓`);
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
/* ---------- LES DEUX FEUILLES À COCHER PARLENT LE MÊME LANGAGE ----------
   Trois versions. La ligne cochée a porté le NAVY (la couleur qui dit
   « tu es sur cet onglet »), puis un lavis teal + liseré — pendant que
   « Donner », lui, ne remplissait rien et dithérait seulement la ligne
   écartée. À chaque fois, deux écrans qui ne se ressemblaient pas pour
   le même geste : cocher une piste. Et sur une carte à deux étages,
   l'aplat ne couvrait que le haut, coupant l'objet en deux.
   Verdict : la carte reste entière et calme, et c'est la CASE qui porte
   l'état. On vérifie donc l'inverse d'avant — qu'aucun aplat n'habille
   la ligne cochée, dans les DEUX feuilles, et que la case, elle, prend
   bien l'accent. */
const nCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const nPage = await nCtx.newPage();
nPage.on('pageerror', e => errors.push(String(e)));
await nPage.goto(base, { waitUntil: 'load' });
await attendre(nPage, async () => !!(await import('./ui/state.js')).S.profile, 'profil chargé');
const teintes = await nPage.evaluate(async () => {
  const { S, saveData } = await import('./ui/state.js');
  const { normalizeCompany } = await import('./engine/model.js');
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  await new Promise(r => setTimeout(r, 250));
  S.companies = ['Alpha', 'Beta', 'Gamma'].map((n, i) => normalizeCompany({
    name: n, city: 'Toulouse', status: 'todo',
    contacts: [{ name: 'C' + i, email: 'c' + i + '@x.test' }] }));
  saveData();
  const fond = e => e ? getComputedStyle(e).backgroundColor : '';
  const nav = fond(document.querySelector('.bottomnav a.on') || document.querySelector('.topnav a.on'));
  const chrome = fond(document.querySelector('.modal-h'));
  const releve = async ouvrir => {
    document.querySelectorAll('.overlay .x').forEach(x => x.click());
    await new Promise(r => setTimeout(r, 280));
    await ouvrir();
    await new Promise(r => setTimeout(r, 450));
    /* on met la liste dans l'état MIXTE : au moins une cochée, au moins
       une pas cochée — c'est le seul état où la comparaison a un sens */
    const tous = [...document.querySelectorAll('.pk')];
    const auDepart = tous.filter(b => b.classList.contains('on')).length;
    (auDepart ? tous[0] : tous[0])?.click();
    await new Promise(r => setTimeout(r, 250));
    const on = document.querySelector('.pk.on');
    const off = document.querySelector('.pk:not(.on)');
    const cs = e => e ? getComputedStyle(e) : null;
    const co = cs(on), cf = cs(off);
    /* `.ic` peint son masque avec `currentColor` : la couleur de la case
       se lit donc dans son `background-color` calculé */
    const teinte = e => e ? getComputedStyle(e).backgroundColor : '';
    return {
      cocheFond: co ? co.backgroundColor : '', cocheOmbre: co ? co.boxShadow : '',
      libreFond: cf ? cf.backgroundColor : '',
      puce: teinte(on && on.querySelector('.ic-on')),
      puceLibre: teinte(off && off.querySelector('.ic-off')),
      dither: cf ? cf.backgroundImage : '',
      /* la SOUS-LIGNE : le même objet doit se décrire pareil d'un écran
         à l'autre. « Prospecter » disait le statut seul quand « Donner »
         disait « statut · ville » — on réapprenait à lire une piste en
         passant d'une feuille à sa voisine. */
      sous: (document.querySelector('.pk .pk-m span') || {}).textContent || ''
    };
  };
  const pro = await releve(async () => (await import('./ui/prospect.js')).openProspect());
  const don = await releve(async () => {
    (await import('./ui/donner.js')).openDonner();
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('dnPick')?.click();
  });
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  await new Promise(r => setTimeout(r, 250));
  /* la couleur de référence, lue dans les tokens : puisque la carte ne
     se peint plus, la case est le SEUL porteur de l'état, et elle doit
     porter l'accent — pas une teinte quelconque */
  const sonde = document.createElement('span');
  sonde.style.color = 'var(--accent)';
  document.body.appendChild(sonde);
  const accent = getComputedStyle(sonde).color;
  sonde.remove();
  return { nav, chrome: chrome || nav, accent, pro, don };
});
const rien = c => !c || c === 'rgba(0, 0, 0, 0)';
const t = teintes;
if (!rien(t.pro.cocheFond) || !rien(t.don.cocheFond))
  fail(`une ligne cochée se peint un aplat (Prospecter ${t.pro.cocheFond}, Donner ${t.don.cocheFond}) — ` +
       `sur une carte à deux étages il ne couvre que le haut, et les deux feuilles cessent de se ressembler`);
else if (t.pro.cocheFond !== t.don.cocheFond || t.pro.cocheOmbre !== t.don.cocheOmbre)
  fail('les deux feuilles à cocher n’habillent pas la ligne cochée de la même façon');
else if (t.pro.cocheFond === t.nav || t.pro.cocheFond === t.chrome)
  fail('une ligne cochée porte une couleur de châssis');
else if (t.don.puce !== t.accent || t.pro.puce !== t.accent)
  fail(`la case cochée ne porte pas l’accent (${t.pro.puce} / ${t.don.puce}, attendu ${t.accent}) — ` +
       `la carte ne se peignant plus, la case est le SEUL porteur de l’état`);
else if (t.don.puce === t.don.puceLibre)
  fail('la case cochée et la case vide ont la même couleur — rien ne distingue les deux états');
else if (/none/.test(t.don.dither))
  fail('« Donner » ne marque plus la ligne ÉCARTÉE — c’est le seul état en propre de cette liste');
else if (!/Toulouse/.test(t.pro.sous) || !/Toulouse/.test(t.don.sous))
  fail(`la ville manque à la sous-ligne (Prospecter « ${t.pro.sous.trim()} », Donner « ${t.don.sous.trim()} ») — ` +
       `deux pistes du même statut ne se distinguent souvent que par elle`);
else if (!/À contacter/.test(t.pro.sous) || !/À contacter/.test(t.don.sous))
  fail(`le statut manque à la sous-ligne (Prospecter « ${t.pro.sous.trim()} », Donner « ${t.don.sous.trim()} »)`);
else console.log('à cocher : même dessin, même sous-ligne (« ' + t.pro.sous.trim().slice(0, 30)
  + ' »), l’état dans la case, l’écart dithéré ✓');

/* ---------- chaque onglet garde sa place ----------
   Une barre d'onglets promet qu'on retrouve les choses où on les a
   laissées ; c'est ce qui distingue un onglet d'un lien. Mesuré avant :
   trente pistes, on descend, on change d'onglet, on revient — tout en
   haut. Et retaper l'onglet où l'on est doit, lui, remonter. */
const garde = await nPage.evaluate(async () => {
  const { S, saveData } = await import('./ui/state.js');
  const { normalizeCompany } = await import('./engine/model.js');
  S.companies = Array.from({ length: 30 }, (_, i) => normalizeCompany({
    name: 'Piste ' + String(i + 1).padStart(2, '0'), city: 'Toulouse', status: 'todo' }));
  saveData();
  const onglet = r => document.querySelector(`.bottomnav [data-r="${r}"]`);
  const v = () => document.querySelector('#view-pistes');
  const pause = ms => new Promise(r => setTimeout(r, ms));
  /* on tape les onglets, on n'écrit pas le hash : c'est le geste réel, et
     lui seul passe par le lien (donc par la forme « #/pistes ») */
  onglet('pistes').click();
  await pause(450);
  v().scrollTop = 700;
  await pause(150);
  const pose = v().scrollTop;
  onglet('moi').click();
  await pause(350);
  onglet('pistes').click();
  await pause(450);
  const revenu = v().scrollTop;
  /* ① re-taper l'onglet où l'on est déjà : le hash ne change même pas,
     donc rien ne se re-rend — seul `auSommet` peut remonter */
  onglet('pistes').click();
  await pause(600);
  const apresRetap = v().scrollTop;
  /* ② et la remontée doit TENIR : on repart, on revient. Si `auSommet`
     n'avait pas oublié la place, on redescendrait à 700 px. */
  onglet('moi').click();
  await pause(350);
  onglet('pistes').click();
  await pause(450);
  const apresAllerRetour = v().scrollTop;
  /* ③ le même écran atteint par une AUTRE écriture du hash (« #pistes »,
     que le routeur accepte) : la route ne change pas, donc rien ne doit
     ressusciter l'ancienne position. C'est ce chemin-là qui, avant, lisait
     le défilement en cours et le réécrivait par-dessus la remontée. */
  v().scrollTop = 700;
  await pause(150);
  onglet('pistes').click();          /* auSommet : on remonte */
  location.hash = '#pistes';         /* et un hashchange arrive par-dessus */
  await pause(600);
  return { pose, revenu, apresRetap, apresAllerRetour, apresHashJumeau: v().scrollTop };
});
if (!garde.pose) fail('la liste ne défile pas — mesure impossible');
else if (garde.revenu !== garde.pose)
  fail(`la place n'est pas gardée : ${garde.pose}px avant, ${garde.revenu}px en revenant`);
else if (garde.apresRetap > 4)
  fail(`retaper l'onglet courant ne remonte pas : ${garde.apresRetap}px`);
else if (garde.apresAllerRetour > 4)
  fail(`la remontée ne tient pas : on repart, on revient, et on retombe à ${garde.apresAllerRetour}px`);
else if (garde.apresHashJumeau > 4)
  fail(`un hashchange sur la même route ressuscite l'ancienne position : ${garde.apresHashJumeau}px`);
else console.log(`onglets : la place tient (${garde.pose}px), re-taper remonte, et la remontée tient ✓`);

/* ---------- changer d'onglet s'annonce ----------
   Le titre du document ne bougeait pas d'une zone à l'autre (quatre
   entrées identiques dans l'historique) et le focus restait sur l'onglet
   tapé : au lecteur d'écran, l'écran entier changeait en silence.
   Un VRAI tap, pas un `.click()` de script : le contour se décide sur la
   nature du geste (`:focus-visible`), et un clic synthétique est traité
   comme du clavier. Mesurer avec le mauvais geste ferait croire à un
   cadre autour du titre à chaque changement d'onglet. */
await nPage.tap('.bottomnav [data-r="echanger"]');
await nPage.waitForTimeout(450);
const dit = await nPage.evaluate(() => {
  const a = document.activeElement;
  return { titre: document.title, focus: (a?.textContent || '').trim().slice(0, 20),
           dansNav: !!a?.closest?.('nav'),
           vu: a?.matches?.(':focus-visible') ?? false,
           evite: document.querySelector('#main')?.getAttribute('tabindex') };
});
if (!/Échanger/.test(dit.titre))
  fail(`le titre du document ne suit pas la route : « ${dit.titre} »`);
else if (dit.dansNav || dit.focus !== 'Échanger')
  fail(`le focus ne suit pas la route : resté sur « ${dit.focus} »`);
else if (dit.vu)
  fail('un contour de focus s’allume sur le titre après un TAP — le focus doit s’entendre, pas se voir');
else if (dit.evite !== '-1')
  fail('« Aller au contenu » vise un <main> non focalisable — il ne déplace pas le focus');
else console.log(`route : titre « ${dit.titre} », focus posé sur le titre d’écran sans contour au doigt ✓`);

/* ---------- ce qui COMMANDE la liste reste avec la liste ----------
   Mesuré, 40 pistes en 360×640 : à 1200 px de défilement il ne restait à
   l'écran ni titre, ni recherche, ni état de filtre. Au pouce c'est la
   barre de commande qui se colle ; au poste c'est le titre de colonne,
   parce que « / » y ramène déjà le champ de recherche en une touche.
   Deux réponses, un seul défaut. (Un élément collant s'arrête sur la
   boîte de CONTENU du défileur : d'où les 16 px de padding dans
   l'ancrage attendu.) */
async function colleTop(p, sel){
  return p.evaluate(async s => {
    const v = document.querySelector('#view-pistes');
    v.scrollTop = 1200;
    await new Promise(r => setTimeout(r, 300));
    const e = v.querySelector(s);
    if (!e) return null;
    const pad = parseFloat(getComputedStyle(v).paddingTop) || 0;
    return { y: Math.round(e.getBoundingClientRect().top),
             attendu: Math.round(v.getBoundingClientRect().top + pad),
             hautVue: Math.round(v.getBoundingClientRect().top) };
  }, sel);
}
await nPage.evaluate(async () => {
  const { S, saveData } = await import('./ui/state.js');
  const { normalizeCompany } = await import('./engine/model.js');
  S.companies = Array.from({ length: 40 }, (_, i) => normalizeCompany({
    name: 'Piste ' + String(i + 1).padStart(2, '0'), city: 'Toulouse',
    status: ['todo', 'active', 'reply', 'todo'][i % 4] }));
  saveData();
  document.querySelector('.bottomnav [data-r="pistes"]').click();
  await new Promise(r => setTimeout(r, 450));
});
/* au repos, l'objet n'existe pas : ni fond, ni trait, ni relief. Une
   barre collante ne se justifie qu'au-delà de trois écrans (NN/g) ; son
   décor ne doit donc rien coûter à une liste de trois lignes. */
const nu = e => e.fond === 'rgba(0, 0, 0, 0)' && e.trait === '0px' && e.ombre === 'none';
const peau = p => p.evaluate(() => {
  const cs = getComputedStyle(document.querySelector('#view-pistes .search-wrap'));
  return { fond: cs.backgroundColor, trait: cs.borderBottomWidth, ombre: cs.boxShadow };
});
/* le décor de décrochage ne doit pas prendre de place : une bordure
   pousserait le contenu d'un pixel, et l'ancrage du défilement le
   rattraperait — la liste dérivait d'un pixel par décrochage */
const traitEnDur = await nPage.evaluate(() =>
  getComputedStyle(document.querySelector('#view-pistes .search-wrap')).borderBottomWidth);
const auRepos = await peau(nPage);
const collePouce = await colleTop(nPage, '.search-wrap');
const decrochee = await peau(nPage);
if (!collePouce) fail('pas de barre de commande sur « Mes pistes »');
else if (collePouce.y !== collePouce.attendu)
  fail(`au pouce, la barre de commande part avec la liste (y=${collePouce.y}, attendu ${collePouce.attendu})`);
else if (!nu(auRepos))
  fail(`au repos la barre de commande pose du décor permanent : fond ${auRepos.fond}, trait ${auRepos.trait}, ombre ${auRepos.ombre}`);
else if (nu(decrochee))
  fail('décrochée, la barre de commande ne se distingue pas de la page — rien ne dit qu’on n’est plus en haut');
else if (decrochee.trait !== traitEnDur)
  fail(`le décrochage ajoute une bordure (${decrochee.trait}) : elle pousse le contenu et fait dériver la liste — passer par l’ombre`);
else console.log(`liste au pouce : rien au repos, barre d’outils à y=${collePouce.y} une fois décrochée ✓`);

/* le même défaut vit dans les feuilles à cocher : « Donner » et
   « Prospecter » ouvrent ~3,5 écrans de liste, et « Tout » comme
   « Affiner » — les deux gestes qu'on cherche une fois descendu —
   partaient avec la première ligne. Même motif, mêmes règles. */
for (const [quoi, titre] of [['donner', 'Donner'], ['prospect', 'Prospecter']]){
  const b = await nPage.evaluate(async q => {
    document.querySelectorAll('.overlay .x').forEach(x => x.click());
    await new Promise(r => setTimeout(r, 300));
    if (q === 'donner'){
      (await import('./ui/donner.js')).openDonner();
      await new Promise(r => setTimeout(r, 400));
      document.getElementById('dnPick')?.click();
    } else (await import('./ui/prospect.js')).openProspect();
    await new Promise(r => setTimeout(r, 500));
    const bar = document.querySelector('.overlay:not(.ov-out) .listbar');
    if (!bar) return null;
    const sc = bar.closest('.modal-b');
    const peau = () => { const c = getComputedStyle(bar);
      return { fond: c.backgroundColor, trait: c.borderBottomWidth, ombre: c.boxShadow }; };
    const repos = peau();
    const pad = parseFloat(getComputedStyle(sc).paddingTop) || 0;
    sc.scrollTop = 900;
    await new Promise(r => setTimeout(r, 350));
    const r = bar.getBoundingClientRect();
    const dessus = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top - 3));
    return { deborde: sc.scrollHeight > sc.clientHeight + 200,
             y: Math.round(r.top), attendu: Math.round(sc.getBoundingClientRect().top + pad),
             repos, apres: peau(), fuite: !!dessus?.closest?.('.pk-duo') };
  }, quoi);
  if (!b) fail(`« ${titre} » : pas de barre « Tout / Affiner »`);
  else if (!b.deborde) fail(`« ${titre} » : la liste ne déborde pas — mesure impossible`);
  else if (b.y !== b.attendu)
    fail(`« ${titre} » : « Tout / Affiner » part avec la liste (y=${b.y}, attendu ${b.attendu})`);
  else if (!nu(b.repos))
    fail(`« ${titre} » : la barre pose du décor au repos (fond ${b.repos.fond})`);
  else if (nu(b.apres))
    fail(`« ${titre} » : décrochée, la barre ne se distingue pas de la liste`);
  else if (b.apres.trait !== b.repos.trait)
    fail(`« ${titre} » : le décrochage ajoute une bordure — elle pousse la liste, passer par l’ombre`);
  else if (b.fuite)
    fail(`« ${titre} » : une ligne défile à découvert au-dessus de la barre`);
  else console.log(`feuille « ${titre} » : « Tout / Affiner » tient à y=${b.y}, rien au repos ✓`);
}

/* ---------- UNE PUCE FAIT LA TAILLE DE SON MOT ----------
   Les sources se rejoignent : GOV.UK dit de ne jamais cacher un petit
   jeu d'options dans une liste déroulante (donc : elles restent
   visibles), et Material 3 dit qu'au-delà de trois options, ou dès
   qu'un libellé s'allonge, le bouton segmenté ne tient plus — c'est une
   grappe de puces qui se replient qui devient la réponse lisible.
   L'app avait les puces, mais en `flex:1 1 auto` : seule sur son rang,
   une puce s'étirait sur toute la largeur. Mesuré à police agrandie —
   celle que règle quelqu'un qui veut y voir — « J'y suis passé »
   rendait quatre blocs pleine largeur empilés, 197 px pour quatre mots.
   On vérifie donc à police AGRANDIE, seule taille où le défaut sort. */
{
  const gCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const gPage = await gCtx.newPage();
  gPage.on('pageerror', e => errors.push(String(e)));
  await gPage.goto(base, { waitUntil: 'load' });
  await attendre(gPage, async () => !!(await import('./ui/state.js')).S.profile, 'profil chargé');
  await gPage.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
  const mesure = await gPage.evaluate(async () => {
    const { S, saveData } = await import('./ui/state.js');
    const { normalizeCompany } = await import('./engine/model.js');
    S.companies = [normalizeCompany({ name: 'Adrastia Systèmes', city: 'Toulouse', status: 'active' })];
    saveData();
    (await import('./ui/edit.js')).openEditPiste(S.companies[0]);
    await new Promise(r => setTimeout(r, 600));
    const L = document.querySelector('.overlay .modal-b').getBoundingClientRect().width;
    /* la case à cocher DOIT suivre sa police. En `px` elle restait à
       18 pendant que son libellé grandissait — la plus petite chose de
       l'écran pour qui a justement agrandi pour y voir. On mesure le
       RAPPORT à la police du libellé, pas une taille absolue : c'est ce
       rapport qui doit tenir aux deux tailles. */
    const { topSheet } = await import('./ui/dom.js');
    let sh; let ns = 0;
    while ((sh = topSheet()) && ns++ < 4){ sh.close(null, true); await new Promise(r => setTimeout(r, 120)); }
    (await import('./ui/contact.js')).openContactEditor(null);
    await new Promise(r => setTimeout(r, 450));
    const ck = document.querySelector('#ceConf');
    const cke = ck && ck.closest('label');
    const caseSuit = ck ? Math.round(ck.getBoundingClientRect().height)
      / parseFloat(getComputedStyle(cke).fontSize) : 0;
    (await import('./ui/edit.js')).openEditPiste(S.companies[0]);
    await new Promise(r => setTimeout(r, 600));
    /* la garde dit sous quelle police elle mesure : sans ça, on pouvait
       retirer l'agrandissement sans qu'elle bronche, et elle aurait
       continué à passer en ne vérifiant plus le cas qui l'a motivée */
    const police = getComputedStyle(document.documentElement).fontSize;
    return { police, caseSuit, groupes: [...document.querySelectorAll('.overlay .datechips')].map(g => {
      const b = [...g.querySelectorAll('.dchip')];
      return { titre: (document.getElementById(g.getAttribute('aria-labelledby')) || {}).textContent || '?',
               n: b.length,
               rangs: new Set(b.map(x => Math.round(x.getBoundingClientRect().top))).size,
               h: Math.round(g.getBoundingClientRect().height),
               large: Math.round(Math.max(...b.map(x => x.getBoundingClientRect().width / L * 100))) };
    }) };
  });
  await gCtx.close();
  const puces = mesure.groupes;
  const etiree = puces.find(g => g.large >= 70);
  const empilee = puces.find(g => g.n > 2 && g.rangs === g.n);
  if (parseFloat(mesure.police) < 20)
    fail(`la garde des puces mesure à ${mesure.police} — elle doit mesurer à police AGRANDIE, ` +
         `c'est la seule taille où le défaut sort`);
  else if (!puces.length) fail('plus aucun groupe de puces dans « Modifier »');
  else if (mesure.caseSuit < 1.2)
    fail(`la case « J'ai vérifié » ne fait plus que ${mesure.caseSuit.toFixed(2)} fois la hauteur de sa police ` +
         `à ${mesure.police} — elle est figée en pixels pendant que son libellé grandit`);
  else if (etiree)
    fail(`« ${etiree.titre.trim()} » : une puce prend ${etiree.large} % de la largeur — ` +
         `un bouton large annonce une action lourde, ce sont des étiquettes`);
  else if (empilee)
    fail(`« ${empilee.titre.trim()} » : ${empilee.n} puces sur ${empilee.n} rangs (${empilee.h} px) — ` +
         `elles se sont étirées au lieu de se replier`);
  else console.log(`puces à ${mesure.police} : ${puces.map(g => g.n + ' sur ' + g.rangs + ' rang(s)').join(', ')}, ` +
                   `la plus large ${Math.max(...puces.map(g => g.large))} % ✓`);
}

/* ---------- LE CLAVIER QUI S'OUVRE ----------
   Ce qu'un champ coûte au pouce ne se compte pas en pixels. Mesuré :
   « Son email ou son téléphone », le champ le plus tapé du produit,
   ouvrait un clavier alphabétique — l'arobase à une page de distance, et
   surtout la majuscule automatique d'iOS qui transforme `s@b.test` en
   `S@b.test`, une adresse fausse que personne ne relit. La correction
   automatique faisait le reste sur les noms propres.
   On vérifie donc, champ par champ, que le clavier correspond à ce que
   le champ EST. Et que la PROSE garde son correcteur : un mail part
   chez un recruteur, une faute y coûte plus qu'une majuscule. */
const clav = await nPage.evaluate(async () => {
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  await new Promise(r => setTimeout(r, 300));
  const { S } = await import('./ui/state.js');
  const lire = () => [...document.querySelectorAll('.overlay:not(.ov-out) input, .overlay:not(.ov-out) textarea')]
    .filter(e => e.offsetParent !== null && !['checkbox', 'radio', 'file'].includes(e.type))
    .map(e => ({ id: e.id, balise: e.tagName,
      type: e.getAttribute('type') || '', im: e.getAttribute('inputmode') || '',
      cap: e.getAttribute('autocapitalize') || '', cor: e.getAttribute('autocorrect') || '',
      sp: e.getAttribute('spellcheck') || '' }));
  const out = {};
  (await import('./ui/capture.js')).openCapture();
  await new Promise(r => setTimeout(r, 450));
  out.capture = lire();
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  await new Promise(r => setTimeout(r, 300));
  (await import('./ui/contact.js')).openContactEditor(S.companies[0]);
  await new Promise(r => setTimeout(r, 450));
  out.contact = lire();
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  await new Promise(r => setTimeout(r, 300));
  (await import('./ui/mail.js')).openMail(S.companies[0]);
  await new Promise(r => setTimeout(r, 500));
  out.ecrire = lire();
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  await new Promise(r => setTimeout(r, 300));
  return out;
});
const trouve = (l, id) => (l || []).find(e => e.id === id);
const propre = e => e && e.cor === 'off' && e.sp === 'false';
const coord = trouve(clav.capture, 'cpCtCoord');
const nomE = trouve(clav.capture, 'cpName');
const mail = trouve(clav.contact, 'ceEmail');
const lien = trouve(clav.contact, 'ceLink');
const corps = (clav.ecrire || []).find(e => e.balise === 'TEXTAREA');
if (!coord || coord.im !== 'email' || coord.cap !== 'off')
  fail(`« email ou téléphone » n'ouvre pas le bon clavier (inputmode=${coord && coord.im}, ` +
       `majuscule auto=${coord && coord.cap}) — iOS majuscule le premier caractère et casse l'adresse`);
else if (!propre(nomE))
  fail('un nom d’entreprise reste soumis à la correction automatique — elle le réécrit, une fois, pour toujours');
else if (!propre(mail) || mail.cap !== 'off')
  fail('le champ e-mail d’un contact garde majuscule ou correction automatique');
else if (!lien || lien.im !== 'url')
  fail(`un champ lien n'a pas inputmode="url" (${lien && lien.im}) — le type seul ne suffit pas partout`);
else if (corps && (corps.sp === 'false' || corps.cor === 'off'))
  fail('le corps du mail a perdu son correcteur — c’est le seul endroit où il doit rester');
else console.log('claviers : coordonnée en clavier e-mail, noms propres protégés de la correction, prose corrigée ✓');

/* et la touche Entrée de la recherche range le clavier : au pouce il
   mange la moitié de l'écran, et la liste est déjà filtrée à la frappe */
const entree = await nPage.evaluate(async () => {
  document.querySelector('.bottomnav [data-r="pistes"]').click();
  await new Promise(r => setTimeout(r, 450));
  const i = document.querySelector('#piQ');
  const hint = i.getAttribute('enterkeyhint');
  i.focus();
  const avant = document.activeElement === i;
  i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 200));
  return { hint, avant, apres: document.activeElement === i };
});
if (entree.hint !== 'search')
  fail(`la recherche n'annonce pas sa touche Entrée (enterkeyhint=${entree.hint})`);
else if (!entree.avant || entree.apres)
  fail('Entrée ne range pas le clavier dans la recherche — la touche promet « Rechercher » et ne fait rien');
else console.log('recherche : la touche dit « Rechercher », et elle range le clavier ✓');

/* ---------- une page possède sa région, pied compris ----------
   « Moi » rempli ne fait que 456 px sur 745 : la ligne de version
   tombait à 60 % de la hauteur au pouce, c'est-à-dire au milieu d'un
   vide sans propriétaire. Un pied posé là ne se lit pas comme du calme,
   il se lit comme un oubli (§5-2). */
const pied = await nPage.evaluate(async () => {
  const { S, saveProfile } = await import('./ui/state.js');
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  await new Promise(r => setTimeout(r, 300));
  S.profile.name = 'Maheydine Oun'; S.profile.email = 'm@x.test';
  S.profile.formation = 'BTS SIO'; saveProfile();
  document.querySelector('.bottomnav [data-r="moi"]').click();
  await new Promise(r => setTimeout(r, 550));
  const v = document.querySelector('#view-moi');
  const inner = v.querySelector('.page-inner');
  const der = inner.lastElementChild;
  return { remplit: inner.getBoundingClientRect().height >= v.clientHeight - 60,
           pct: Math.round(der.getBoundingClientRect().top / innerHeight * 100),
           quoi: der.textContent.replace(/\s+/g, ' ').trim().slice(0, 24) };
});
if (!pied.remplit)
  fail('« Moi » ne prend pas sa région : le vide du bas n’appartient à personne');
else if (pied.pct < 70)
  fail(`le pied de « Moi » (« ${pied.quoi} ») flotte à ${pied.pct} % de la hauteur au lieu de se poser en bas`);
else console.log(`« Moi » au pouce : la page tient sa région, le pied se pose à ${pied.pct} % ✓`);
await nCtx.close();

const wCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const wPage = await wCtx.newPage();
wPage.on('pageerror', e => errors.push(String(e)));
await wPage.goto(base, { waitUntil: 'load' });
await attendre(wPage, async () => !!(await import('./ui/state.js')).S.profile, 'profil chargé');
await wPage.evaluate(async () => {
  const { S, saveData } = await import('./ui/state.js');
  const { normalizeCompany } = await import('./engine/model.js');
  S.companies = Array.from({ length: 40 }, (_, i) => normalizeCompany({
    name: 'Piste ' + String(i + 1).padStart(2, '0'), city: 'Toulouse',
    status: ['todo', 'active', 'reply', 'todo'][i % 4] }));
  saveData();
  document.querySelector('.topnav [data-r="pistes"]').click();
  await new Promise(r => setTimeout(r, 450));
});
const collePoste = await colleTop(wPage, '.bcol-h');
if (!collePoste) fail('pas de tableau en colonnes sur « Mes pistes » au poste');
else if (collePoste.y !== collePoste.hautVue)
  fail(`au poste, le titre de colonne part avec la liste (y=${collePoste.y}, attendu ${collePoste.hautVue})`);
else {
  /* et rien ne défile à découvert au-dessus de lui */
  const fuite = await wPage.evaluate(() => {
    const h = document.querySelector('#view-pistes .bcol-h').getBoundingClientRect();
    const e = document.elementFromPoint(Math.round(h.left + h.width / 2), Math.round(h.top - 3));
    return e ? (e.closest('.bcard') ? 'une carte' : '') : '';
  });
  if (fuite) fail(`au poste, ${fuite} défile à découvert au-dessus du titre de colonne`);
  else console.log(`tableau au poste : les trois titres de colonne tiennent à y=${collePoste.y}, sans fuite ✓`);
}
/* et au poste, la version ne se dit qu'une fois : la barre d'état la
   porte déjà, en bas, en permanence. La répéter dans la page, c'était
   la dire deux fois — la seconde au milieu d'un vide. */
const versions = await wPage.evaluate(async () => {
  document.querySelector('.topnav [data-r="moi"]').click();
  await new Promise(r => setTimeout(r, 550));
  /* on compte les FEUILLES du DOM : la barre d'état imbrique
     « OpenContact <span>6.17.1</span> », compter les ancêtres ferait
     voir double là où il n'y a qu'un seul endroit */
  return [...document.querySelectorAll('body *')]
    .filter(e => e.offsetParent !== null && !e.children.length
                 && /\d+\.\d+\.\d+/.test(e.textContent))
    .map(e => (e.id || e.className || e.tagName) + ' « ' + e.textContent.trim().slice(0, 24) + ' »');
});
if (versions.length !== 1)
  fail(`la version est affichée ${versions.length} fois au poste (${versions.join(' + ')}) — la barre d’état suffit`);
else console.log(`poste : la version se dit une seule fois (${versions[0]}) ✓`);
await wCtx.close();

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


/* ---------- LE SURVOL NE COLLE PAS AU DOIGT ----------
   Sur un téléphone, `:hover` ne se lève pas : iOS l'applique au tap et
   le LAISSE jusqu'à ce qu'on tape ailleurs. Chaque règle de survol non
   protégée devient donc une trace qui reste — une ligne blanche au
   milieu d'une liste, un fond gris sous un bouton. Signalé sur photo,
   et décrit comme « général, sur tout le site » : c'était 30 règles sur
   34 qui n'étaient pas gardées.
   Deux contrôles, parce qu'aucun des deux ne suffit : le TEXTE de la
   feuille de style (une règle non protégée se voit à la lecture, même
   si aucun test ne la déclenche), et le COMPORTEMENT réel dans les deux
   ergonomies (la règle peut être protégée et le média mal écrit). */
{
  /* TOUTES les feuilles, pas seulement `app.css` : les deux dernières
     règles nues vivaient dans les tokens, et une première passe les a
     manquées pour cette seule raison.
     Et la lecture doit ignorer les COMMENTAIRES : ce fichier en contient
     qui CITENT des sélecteurs de survol, et les compter faisait rendre
     32 fautes là où il n'y en avait aucune. */
  const feuilles = ['../../styles/app.css', '../../styles/tokens/base.css',
    '../../styles/tokens/colors.css', '../../styles/tokens/typography.css'];
  const nues = []; let total = 0;
  for (const f of feuilles){
    let css;
    try { css = readFileSync(new URL(f, import.meta.url), 'utf8'); } catch (e) { continue; }
    total += (css.match(/:hover/g) || []).length;
    const lignes = css.split('\n');
    let commentaire = false; let prof = 0; const gardes = [];
    for (const l of lignes){
      const debutEnCommentaire = commentaire;
      for (let k = 0; k < l.length; k++){
        if (!commentaire && l.startsWith('/*', k)){ commentaire = true; k++; }
        else if (commentaire && l.startsWith('*/', k)){ commentaire = false; k++; }
      }
      if (!debutEnCommentaire && /hover\s*:\s*hover/.test(l) && l.includes('{')) gardes.push(prof);
      const sel = l.split('{')[0];
      if (!debutEnCommentaire && l.includes('{') && /:hover/.test(sel) && !gardes.length)
        nues.push(f.split('/').pop() + ' · ' + sel.trim().slice(0, 52));
      prof += (l.match(/{/g) || []).length - (l.match(/}/g) || []).length;
      while (gardes.length && prof <= gardes[gardes.length - 1]) gardes.pop();
    }
  }
  if (total < 20)
    fail(`survol : ${total} règles trouvées dans la feuille de style — le contrôle ne lit plus rien`);
  else if (nues.length)
    fail(`survol : ${nues.length} règle(s) hors de \`@media (hover:hover)\` — elles resteront collées `
      + `après un tap sur un téléphone —\n      ` + nues.join('\n      '));
  else {
    /* et sur pièces : au doigt le survol est inerte, à la souris il vit */
    const hBrowser = await chromium.launch({ executablePath: chromiumPath() });
    const lire = async (tactile) => {
      const c = await hBrowser.newContext({ viewport: { width: tactile ? 393 : 1280, height: 800 },
        hasTouch: tactile, isMobile: tactile });
      const pg = await c.newPage();
      await pg.goto(base, { waitUntil: 'load' });
      await pg.waitForSelector('#view-aujourdhui:not([hidden])');
      await pg.evaluate(async () => {
        const { S, saveData } = await import('./ui/state.js');
        const { normalizeCompany } = await import('./engine/model.js');
        S.companies = [normalizeCompany({ id: 'ch', name: 'Survol', city: 'Toulouse', status: 'todo' })];
        saveData(); location.hash = '#/pistes';
      });
      /* un `.btn` ordinaire : présent aux deux ergonomies, et c'est la
         règle de survol la plus répandue de l'app */
      await pg.waitForSelector('#piProspect');
      const cible = await pg.$('#piProspect');
      const av = await cible.evaluate(n => getComputedStyle(n).backgroundColor);
      await cible.hover();
      await pg.waitForTimeout(200);
      const ap = await cible.evaluate(n => getComputedStyle(n).backgroundColor);
      await c.close();
      return av !== ap;
    };
    const auDoigt = await lire(true);
    const aLaSouris = await lire(false);
    /* `:active` NE PART PAS avec le survol. Il voyage souvent dans la
       même liste de sélecteurs (`:hover,:active{…}`), et l'envelopper
       tout entier supprime le SEUL retour d'appui qui reste sur un
       téléphone : on tape, rien ne bouge. Les règles se scindent. */
    const cActif = await hBrowser.newContext({ viewport: { width: 393, height: 800 },
      hasTouch: true, isMobile: true });
    const pActif = await cActif.newPage();
    await pActif.goto(base, { waitUntil: 'load' });
    await pActif.waitForSelector('#view-aujourdhui:not([hidden])');
    /* `#tdeAdd` et pas `.btn-primary` : au pouce, le premier
       `.btn-primary` du document est celui du bandeau de bureau, caché */
    await pActif.waitForSelector('#tdeAdd');
    const bp = await pActif.$('#tdeAdd');
    const repos = await bp.evaluate(n => getComputedStyle(n).backgroundColor);
    const boite = await bp.boundingBox();
    await pActif.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
    await pActif.mouse.down();
    await pActif.waitForTimeout(120);
    const presse = await bp.evaluate(n => getComputedStyle(n).backgroundColor);
    await pActif.mouse.up();
    await cActif.close();
    await hBrowser.close();
    if (repos === presse)
      fail('au doigt, presser le bouton principal ne change rien — `:active` est parti avec le survol, '
        + 'et c’est le seul retour d’appui qui reste sur un téléphone');
    else
    if (auDoigt) fail('survol : au doigt, survoler une ligne la peint quand même — la trace restera collée');
    else if (!aLaSouris) fail('survol : à la souris, plus rien ne réagit — la garde a tué le survol au lieu de le borner');
    else console.log(`survol : ${total} règles, toutes sous \`@media (hover:hover)\` — `
      + 'inerte au doigt, vivant à la souris ✓');
  }
}

/* ---------- LE TEXTE DOUBLÉ (WCAG 1.4.4, AA) ----------
   Le droit d'agrandir le texte de 200 % sans perdre ni contenu ni
   fonction. Jamais mesuré ici, et c'est ce qui a rendu l'outillage
   AVEUGLE à un défaut photographié sur un vrai téléphone : le libellé
   d'onglet coupé. Les contrôles de police agrandie s'arrêtaient à
   125 %, où tout tient encore.
   Ce qu'on exige : ce qui porte une IDENTITÉ ne se coupe jamais — le
   nom d'une piste, le libellé d'un bouton. Une piste qu'on ne reconnaît
   plus ne sert à rien, et un bouton dont le verbe déborde du cadre est
   cassé. Ce qui porte une DONNÉE garde le droit de s'élider : la
   sous-ligne dit la ville, le statut, l'échéance — la ligne reste
   compréhensible sans sa fin.
   Les exceptions se NOMMENT, avec leur mesure. */
const ZOOM_EXCEPTIONS = [
  /* La barre d'onglets. Mesuré : « Aujourd'hui » demande 120 px à 200 %
     pour 77 disponibles. Ce n'est pas une affaire de typographie —
     à 320 px de large le libellé est DÉJÀ coupé de 2 px à taille
     normale, et retirer le ⊕ de la barre (64 px rendus aux quatre
     onglets) répare 100 % et 320 px mais pas 150 %. Cinq objets ne
     tiennent pas. La sortie documentée est celle de Material 3 et
     d'iOS — à grande police, la barre garde ses icônes et lâche ses
     mots, le lecteur d'écran gardant l'`aria-label`. C'est un choix de
     dessin : il attend le mainteneur, il ne se glisse pas ici. */
  '.bn-l',
  /* Sous-lignes : données, pas identité. Elles s'élident par dessin. */
  '.act-do', '.o-sub', '.ri-sub', '.fi-sub', '.ctc-sub', '.ec-when', '.pk-m'
];
const SONDE_COUPE = () => {
  const out = [];
  for (const e of document.querySelectorAll('body *')){
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    /* seulement les éléments qui portent EUX-MÊMES du texte */
    if (![...e.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())) continue;
    const cs = getComputedStyle(e);
    const x = e.scrollWidth > e.clientWidth + 1 && /hidden|clip/.test(cs.overflowX);
    const y = e.scrollHeight > e.clientHeight + 1 && /hidden|clip/.test(cs.overflowY);
    if (!x && !y) continue;
    out.push({ cls: (typeof e.className === 'string' ? e.className : '').trim().split(/\s+/),
               q: e.id ? '#' + e.id : (typeof e.className === 'string' && e.className.trim()
                  ? '.' + e.className.trim().split(/\s+/)[0] : e.tagName),
               t: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26),
               perdu: x ? e.scrollWidth - e.clientWidth : e.scrollHeight - e.clientHeight });
  }
  /* LE DÉBORDEMENT LATÉRAL D'UNE FEUILLE, mesuré à la CAUSE.
     `scrollWidth - clientWidth` ne sert à rien ici : `.modal-b` porte
     `overflow-x:hidden` (la ceinture), donc le symptôme est toujours
     nul et le contrôle deviendrait infalsifiable — une mutation l'a
     montré. On mesure donc ce qui DÉPASSE : un enfant plus large que
     la boîte de contenu de la feuille. Ça survit à la ceinture, et
     c'est le vrai défaut.
     Et `min-width` sur les enfants de grille se lit directement : le
     bug d'origine ne se reproduit PAS sous Chromium (WebKit calcule la
     largeur minimale d'un `<select>` sur son option la plus longue,
     pas Chromium), donc la seule mesure honnête est la propriété. */
  const mb = document.querySelector('.overlay:not(.ov-out) .modal-b');
  let large = 0; let coupable = '';
  if (mb){
    const boite = mb.clientWidth;
    for (const e of mb.querySelectorAll('*')){
      const w = e.getBoundingClientRect().width;
      if (w > boite + 1 && w - boite > large){
        large = Math.round(w - boite);
        coupable = e.id ? '#' + e.id
          : (typeof e.className === 'string' && e.className.trim()
             ? '.' + e.className.trim().split(/\s+/)[0] : e.tagName);
      }
    }
  }
  const grilles = [...document.querySelectorAll('.grid2 > *')]
    .filter(e => getComputedStyle(e).minWidth !== '0px').length;
  return { coupes: out, deborde: Math.round(document.documentElement.scrollWidth - innerWidth),
           glisse: large, coupable, grilles };
};
{
  const zBrowser = await chromium.launch({ executablePath: chromiumPath() });
  const zCtx = await zBrowser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true });
  const zPage = await zCtx.newPage();
  zPage.on('pageerror', e => errors.push(String(e)));
  await zPage.goto(base, { waitUntil: 'load' });
  await zPage.waitForSelector('#view-aujourdhui:not([hidden])');
  await zPage.evaluate(async () => {
    const { S, saveData } = await import('./ui/state.js');
    const { normalizeCompany } = await import('./engine/model.js');
    S.profile.name = 'Maheydine Oun'; S.profile.formation = 'BTS SIO SISR'; S.profile.email = 'm@x.test';
    S.orphans.push({ id: 'oz', name: 'Awa Diallo', role: 'Alternante SOC', email: 'awa@x.test' });
    /* un nom LONG : c'est lui qui fait sortir le défaut */
    S.companies = [normalizeCompany({ id: 'cz', name: 'Cyberprotect Solutions Aquitaine',
      city: 'Bordeaux', status: 'active', domain: 'cyber', website: 'cyberprotect.example',
      desc: 'ESN de 40 personnes.', techs: 'Wazuh', nextActionText: 'Relancer le service RH',
      nextAction: new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10),
      contacts: [{ id: 'pz', name: 'Léa Barbaste', role: 'Responsable du SOC', email: 'lea@c.test' }] })];
    saveData();
  });
  await zPage.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  const dur = []; let vus = 0; let doublee = false; let sondeLarge = null; let mesurees = 0;
  /* LES FEUILLES AUSSI. La garde ne regardait que les quatre écrans, et
     c'est ce qui l'a laissée passer à côté d'un défaut signalé sur
     photo : la feuille « Écrire » qui se met à GLISSER latéralement,
     libellés coupés au bord. Un défilement horizontal dans une feuille
     n'est jamais voulu — et c'est le symptôme le plus déroutant qui
     soit, on croit avoir cassé l'application. */
  const surfaces = [
    ['aujourdhui', null], ['pistes', null], ['echanger', null], ['moi', null],
    ['écrire', async p => p.evaluate(async () => { const { S } = await import('./ui/state.js');
      (await import('./ui/mail.js')).openMail(S.companies[0], {}); })],
    ['fiche', async p => p.evaluate(async () => { const { S } = await import('./ui/state.js');
      (await import('./ui/fiche.js')).openFiche(S.companies[0]); })],
    ['modifier', async p => p.evaluate(async () => { const { S } = await import('./ui/state.js');
      (await import('./ui/edit.js')).openEditPiste(S.companies[0]); })],
    ['contact', async p => p.evaluate(async () =>
      (await import('./ui/contact.js')).openContactEditor(null))],
    ['capture', async p => p.evaluate(async () => (await import('./ui/capture.js')).openCapture())]
  ];
  for (const [nom, ouvrir] of surfaces){
    await zPage.evaluate(async () => {
      const { topSheet } = await import('./ui/dom.js');
      let s; let n = 0;
      while ((s = topSheet()) && n++ < 5){ s.close(null, true); await new Promise(r => setTimeout(r, 110)); }
    });
    if (ouvrir) await ouvrir(zPage);
    else await zPage.evaluate(r => { location.hash = '#/' + r; }, nom);
    await zPage.waitForTimeout(450);
    if (ouvrir && !await zPage.evaluate(() => !!document.querySelector('.overlay:not(.ov-out) .modal-b'))){
      dur.push(`${nom} : la feuille ne s'ouvre pas — le contrôle ne mesure rien`);
      continue;
    }
    /* LA SONDE SE VÉRIFIE : on plante un bloc trop large et on exige
       qu'elle le voie. Sans ça, `overflow-x:hidden` rend la mesure
       infalsifiable — tout est toujours à zéro, y compris quand on
       retire la mesure. Deux mutations l'ont montré. */
    if (ouvrir && sondeLarge === null){
      await zPage.evaluate(() => {
        const d = document.createElement('div');
        d.id = 'sondeLarge'; d.style.cssText = 'width:9999px;height:2px';
        document.querySelector('.overlay:not(.ov-out) .modal-b').append(d);
      });
      sondeLarge = (await zPage.evaluate(SONDE_COUPE)).glisse > 100;
      await zPage.evaluate(() => { document.getElementById('sondeLarge')?.remove(); });
    }
    doublee = doublee || await zPage.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize) >= 32);
    const r = await zPage.evaluate(SONDE_COUPE);
    vus += r.coupes.length; mesurees++;
    if (r.deborde > 1) dur.push(`${nom} : la page déborde de ${r.deborde}px en largeur`);
    if (r.glisse > 1)
      dur.push(`${nom} : ${r.coupable} dépasse la feuille de ${r.glisse}px — elle glissera latéralement`);
    if (r.grilles)
      dur.push(`${nom} : ${r.grilles} enfant(s) de grille sans \`min-width:0\` — un <select> à option `
        + `longue élargit sa colonne sous WebKit et fait glisser toute la feuille`);
    for (const c of r.coupes){
      if (ZOOM_EXCEPTIONS.some(x => c.cls.includes(x.slice(1)))) continue;
      dur.push(`${nom} · −${c.perdu}px ${c.q} « ${c.t} »`);
    }
  }
  await zCtx.close(); await zBrowser.close();
  /* le contrôle dit sous quelle police il mesure — sans ça, retirer
     l'agrandissement le laisserait passer au vert sans rien vérifier */
  if (!doublee) fail('texte doublé : la garde ne mesure pas à 200 % — elle ne vérifie plus rien');
  else if (mesurees < 9)
    fail(`texte doublé : ${mesurees} surfaces mesurées au lieu de 9 — écrans ET feuilles, `
      + `c'est en n'ouvrant aucune feuille que la garde a laissé passer le glissement latéral`);
  else if (!sondeLarge)
    fail('texte doublé : la sonde plantée (un bloc de 9999px dans une feuille) n’a pas été vue — '
      + 'la mesure du dépassement ne mesure plus rien');
  else if (!vus) fail('texte doublé : aucune coupure détectée nulle part, pas même les exceptions connues — la sonde est aveugle');
  else if (dur.length)
    fail(`texte doublé à 200 % : ${dur.length} perte(s) de contenu hors exceptions nommées —\n      ` + dur.join('\n      '));
  else console.log(`texte doublé à 200 % : rien d'identifiant ne se coupe, aucune feuille ne glisse, `
    + `sur ${surfaces.length} surfaces (${vus} élisions, toutes dans les exceptions nommées) ✓`);
}

/* ---------- LE PLAN DU DOCUMENT, ET SON CONTRASTE ----------
   Deux contrôles structurels, mesurés sur les quatre écrans dans les
   deux thèmes.
   ① Les TITRES. Le document n'avait aucun `h1` : chaque écran démarrait
     en `h2`, et « Mes pistes » émettait `h1 → h3 → h4` — deux rangs
     sautés d'un coup, parce que le bac « à rattacher » n'avait pour
     titre qu'un `<summary>`, qui n'en est pas un. W3C WAI (1.3.1) :
     commencer par un `h1`, ne jamais sauter de rang. Rien ne change à
     l'écran — ce sont les balises justes sous le même style.
   ② Le CONTRASTE. Un seul nœud de texte de toute l'application passait
     sous le plancher AA : la ligne de version, 2,43:1 en clair et
     3,54:1 en sombre. « C'est décoratif » n'est pas une exception que
     WCAG accorde à du texte. Le balayage part des nœuds de TEXTE et
     remonte chercher le premier fond opaque — un `color` seul ne dit
     rien sans ce sur quoi il est posé. */
const SONDE_CONTRASTE = () => {
  const lum = c => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const rgb = s => {
    const m = String(s).match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number).concat(m[3] !== undefined ? +m[3] : 1) : null;
  };
  /* une couleur translucide se juge une fois POSÉE sur son fond */
  const melange = (fg, bg) => fg[3] >= 1 ? fg : fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
  const fond = el => {
    for (let n = el; n; n = n.parentElement){
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (c && c[3] > 0.95) return c.slice(0, 3);
    }
    return [255, 255, 255];
  };
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const vus = new Set();
  let n;
  while ((n = w.nextNode())){
    if (!(n.nodeValue || '').trim()) continue;
    const el = n.parentElement;
    if (!el || vus.has(el)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (el.closest('[hidden], [aria-hidden="true"], .ov-out')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity < 0.1) continue;
    vus.add(el);
    const bg = fond(el);
    const fg = melange(rgb(cs.color) || [0, 0, 0], bg);
    const L1 = Math.max(lum(fg), lum(bg)), L2 = Math.min(lum(fg), lum(bg));
    const px = parseFloat(cs.fontSize);
    /* 1.4.3 : 3:1 suffit au « grand texte » — 24 px, ou 18,66 px en gras */
    const gros = px >= 24 || (+cs.fontWeight >= 700 && px >= 18.66);
    out.push({ t: (n.nodeValue || '').trim().slice(0, 30),
               q: el.id ? '#' + el.id
                  : (typeof el.className === 'string' && el.className.trim()
                     ? '.' + el.className.trim().split(/\s+/)[0] : el.tagName),
               r: Math.round((L1 + 0.05) / (L2 + 0.05) * 100) / 100, seuil: gros ? 3 : 4.5 });
  }
  return out;
};
const SONDE_TITRES = route => {
  const v = document.querySelector('#view-' + route);
  return [...v.querySelectorAll('h1,h2,h3,h4,h5,h6')]
    /* une tranche repliée compte : son titre est dans le plan même fermé */
    .filter(e => e.getBoundingClientRect().height > 0 || e.closest('details:not([open])'))
    .map(e => ({ n: +e.tagName[1], t: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 24) }));
};
{
  const stBrowser = await chromium.launch({ executablePath: chromiumPath() });
  for (const theme of ['light', 'dark']){
    const stCtx = await stBrowser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, colorScheme: theme });
    const stPage = await stCtx.newPage();
    stPage.on('pageerror', e => errors.push(String(e)));
    await stPage.goto(base, { waitUntil: 'load' });
    await stPage.waitForSelector('#view-aujourdhui:not([hidden])');
    await stPage.evaluate(async () => {
      const { S, saveData } = await import('./ui/state.js');
      const { normalizeCompany } = await import('./engine/model.js');
      S.profile.name = 'Maheydine'; S.profile.formation = 'BTS SIO'; S.profile.email = 'm@x.test';
      S.orphans.push({ id: 'ost', name: 'Awa Diallo', role: 'SOC', email: 'a@x.test' });
      S.companies = [normalizeCompany({ id: 'cst', name: 'Cyberprotect', city: 'Bordeaux',
        status: 'active', nextActionText: 'Relancer',
        nextAction: new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10),
        contacts: [{ name: 'Léa', email: 'l@x.test' }] })];
      saveData();
    });
    let noeuds = 0; let titres = 0;
    const bas = []; const plans = [];
    for (const route of ['aujourdhui', 'pistes', 'echanger', 'moi']){
      await stPage.evaluate(r => { location.hash = '#/' + r; }, route);
      await stPage.waitForTimeout(450);
      const txt = await stPage.evaluate(SONDE_CONTRASTE);
      noeuds += txt.length;
      for (const x of txt) if (x.r < x.seuil) bas.push(`${route} · ${x.r}:1 (min ${x.seuil}) ${x.q} « ${x.t} »`);
      const h = await stPage.evaluate(SONDE_TITRES, route);
      titres += h.length;
      const rangs = h.map(x => x.n);
      if (rangs.filter(x => x === 1).length !== 1)
        plans.push(`${route} : ${rangs.filter(x => x === 1).length} titre(s) de rang 1`);
      else if (rangs[0] !== 1) plans.push(`${route} : commence en h${rangs[0]}`);
      else for (let i = 1; i < rangs.length; i++)
        if (rangs[i] > rangs[i - 1] + 1){ plans.push(`${route} : h${rangs[i - 1]} → h${rangs[i]} « ${h[i].t} »`); break; }
    }
    await stCtx.close();
    /* les deux sondes se vérifient : un écran vide passerait tout */
    if (noeuds < 40 || titres < 8)
      fail(`structure (${theme}) : ${noeuds} nœuds de texte et ${titres} titres — l'instrument ne voit pas l'application`);
    else if (plans.length)
      fail(`plan du document (${theme}) — ` + plans.join(' · '));
    else if (bas.length)
      fail(`contraste (${theme}) : ${bas.length} texte(s) sous le plancher AA —\n      ` + bas.join('\n      '));
    else console.log(`structure ${theme} : ${titres} titres sans rang sauté, ${noeuds} textes tous au-dessus de leur plancher ✓`);
  }
  await stBrowser.close();
}

/* ---------- BALAYAGE DES CIBLES : toute la surface, d'un coup ----------
   Les contrôles ponctuels de ce fichier mesuraient des cibles CHOISIES,
   une par une. Ce qui leur a échappé est précisément ce qu'on ne pense
   pas à choisir : dans le bac « à rattacher », la RANGÉE faisait bien
   44 px mais la partie tapable n'en faisait que 32 — un `<div>` en
   `role="button"`, invisible pour un sélecteur qui liste
   `button, a, input, select`.
   D'où trois règles, qui sont la valeur de ce balayage :
   ① on mesure ce qui RÉPOND au doigt, donc le plus haut ancêtre
     interactif — la cible d'une case à cocher est son étiquette entière
     (352 × 44 ici), jamais la case (18 × 18) ;
   ② `[role="button"]`, `[tabindex="0"]` et `summary` en font partie ;
   ③ un élément replié (largeur ou hauteur nulle — la serrure au repos)
     n'est pas une cible, et un lien EN LIGNE dans une phrase est exempté
     par 2.5.8 elle-même.
   Seuils : 44 px au doigt (2.5.5 AAA, la règle du produit) et 24 px à la
   souris (2.5.8 AA). Les exceptions se NOMMENT ici, jamais en silence. */
const CIBLE_EXCEPTIONS = [];      /* aucune aujourd'hui, et c'est le but */
const SONDE_CIBLES = () => {
  const INTER = 'a[href], button, input, select, textarea, summary, [role="button"], [tabindex="0"]';
  const effective = n => {
    let cible = n;
    for (let p = n.parentElement; p; p = p.parentElement){
      if (p.matches(INTER) || p.tagName === 'LABEL') cible = p;
    }
    return cible;
  };
  const vus = new Set(); const out = [];
  for (const n of document.querySelectorAll(INTER)){
    const c = effective(n);
    if (vus.has(c)) continue;
    vus.add(c);
    const r = c.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (c.tagName === 'A' && c.closest('p, .hint, .fk-v')) continue;
    const cls = typeof c.className === 'string' ? c.className.trim() : '';
    out.push({ q: c.id ? '#' + c.id
                 : (cls ? '.' + cls.split(/\s+/).slice(0, 2).join('.') : c.tagName),
               t: (c.getAttribute('aria-label') || c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26),
               w: Math.round(r.width), h: Math.round(r.height) });
  }
  return out;
};
async function balayer(P, seuil){
  const surfaces = [
    ['Aujourd’hui', 'route', 'aujourdhui'], ['Mes pistes', 'route', 'pistes'],
    ['Échanger', 'route', 'echanger'], ['Moi', 'route', 'moi'],
    ['fiche', './ui/fiche.js', 'openFiche', true], ['écrire', './ui/mail.js', 'openMail', true],
    ['modifier', './ui/edit.js', 'openEditPiste', true],
    ['contact', './ui/contact.js', 'openContactEditor', false],
    ['capture', './ui/capture.js', 'openCapture', false],
    ['donner', './ui/donner.js', 'openDonner', false],
    ['prospecter', './ui/prospect.js', 'openProspect', false],
    ['profil', './ui/profil.js', 'openProfil', false],
    ['modèles', './ui/profil.js', 'openTemplates', false]
  ];
  let total = 0; const petites = []; let sondeVue = null;
  for (const [nom, mod, fn, avecPiste] of surfaces){
    await P.evaluate(async () => {
      const { topSheet } = await import('./ui/dom.js');
      let s; let n = 0;
      while ((s = topSheet()) && n++ < 6){ s.close(null, true); await new Promise(r => setTimeout(r, 110)); }
    });
    await P.evaluate(async ([mod, fn, avecPiste]) => {
      if (mod === 'route'){ location.hash = '#/' + fn; return; }
      const { S } = await import('./ui/state.js');
      const m = await import(mod);
      const p = S.companies.find(x => x.id === 'cbal');
      if (avecPiste) m[fn](p, {}); else m[fn](null);
    }, [mod, fn, avecPiste]);
    await P.waitForTimeout(420);
    if (mod !== 'route'){
      const ouverte = await P.evaluate(() => !!document.querySelector('.overlay:not(.ov-out)'));
      if (!ouverte){ fail(`balayage : la feuille « ${nom} » ne s’ouvre pas — le contrôle ne mesure rien`); continue; }
    }
    const cibles = await P.evaluate(SONDE_CIBLES);
    total += cibles.length;
    /* LA SONDE SE VÉRIFIE ELLE-MÊME. Sans ça, retirer `[role="button"]`
       de la liste des sélecteurs fait simplement voir MOINS de choses au
       balayage — il continue de passer, en ne regardant plus le cas qui
       l'a motivé (le bac « à rattacher » est un `<div>` en
       `role="button"`). On plante donc une cible minuscule de ce type-là
       et on exige qu'elle soit vue. */
    if (sondeVue === null){
      /* en trois temps : la CSP de l'app interdit `new Function`, donc
         la sonde ne peut pas s'évaluer elle-même dans la page */
      await P.evaluate(() => {
        const t = document.createElement('div');
        t.setAttribute('role', 'button'); t.tabIndex = 0; t.id = 'sondeCible';
        t.style.cssText = 'position:fixed;left:0;top:0;width:10px;height:10px;z-index:9999';
        document.body.append(t);
      });
      sondeVue = (await P.evaluate(SONDE_CIBLES)).some(c => c.q === '#sondeCible');
      await P.evaluate(() => { document.getElementById('sondeCible')?.remove(); });
    }
    for (const c of cibles){
      if (c.h >= seuil && c.w >= seuil) continue;
      if (CIBLE_EXCEPTIONS.includes(c.q)) continue;
      petites.push(`${nom} · ${c.w}×${c.h} ${c.q} « ${c.t} »`);
    }
  }
  return { total, petites, surfaces: surfaces.length, sondeVue };
}
const cbBrowser = await chromium.launch({ executablePath: chromiumPath() });
for (const [nom, w, h, tactile, seuil] of [['au doigt', 390, 844, true, 44], ['à la souris', 1280, 800, false, 24]]){
  const cbCtx = await cbBrowser.newContext({ viewport: { width: w, height: h }, hasTouch: tactile });
  const cbPage = await cbCtx.newPage();
  cbPage.on('pageerror', e => errors.push(String(e)));
  await cbPage.goto(base, { waitUntil: 'load' });
  await cbPage.waitForSelector('#view-aujourdhui:not([hidden])');
  await cbPage.evaluate(async () => {
    const { S, saveData } = await import('./ui/state.js');
    const { normalizeCompany } = await import('./engine/model.js');
    S.profile.name = 'Maheydine Oun'; S.profile.formation = 'BTS SIO SISR'; S.profile.email = 'm@x.test';
    S.orphans.push({ id: 'obal', name: 'Awa Diallo', role: 'Alternante SOC', email: 'awa@x.test' });
    /* normalisée comme une vraie piste : un objet fabriqué à la main
       n'a ni `positions` ni `tags`, et la feuille « Modifier » explose
       sur un champ absent — le contrôle mesurerait alors sa propre
       maladresse au lieu de l'application */
    S.companies.unshift(normalizeCompany({ id: 'cbal', name: 'Cyberprotect', city: 'Bordeaux',
      status: 'active', sector: 'cyber', website: 'cyberprotect.example',
      desc: 'ESN de 40 personnes.', techs: 'Wazuh',
      next: { what: 'Relancer', when: new Date(Date.now() - 864e5).toISOString().slice(0, 10) },
      contacts: [{ id: 'pbal', name: 'Léa Barbaste', role: 'RH', email: 'lea@c.test' }] }));
    saveData();
    location.hash = '#/pistes';
    await new Promise(r => setTimeout(r, 350));
    const d = document.querySelector('.tr-orph'); if (d) d.open = true;
  });
  const bal = await balayer(cbPage, seuil);
  /* le contrôle se vérifie LUI-MÊME : un balayage qui ne trouve presque
     rien ne prouve rien. Douze cibles par surface est le plancher observé
     (« Échanger », la plus dépouillée, en compte onze). */
  if (!bal.sondeVue)
    fail(`balayage ${nom} : la sonde plantée (un \`role="button"\` de 10 px) n'a pas été vue — ` +
         `l'instrument ne couvre plus ce qu'il est censé couvrir`);
  else if (bal.total < 10 * bal.surfaces)
    fail(`balayage ${nom} : ${bal.total} cibles sur ${bal.surfaces} surfaces — l’instrument ne voit plus l’application`);
  else if (bal.petites.length)
    fail(`balayage ${nom} : ${bal.petites.length} cible(s) sous ${seuil}px —\n      ` + bal.petites.join('\n      '));
  else console.log(`cibles ${nom} : ${bal.total} sur ${bal.surfaces} surfaces, aucune sous ${seuil}px ✓`);
  await cbCtx.close();
}
await cbBrowser.close();

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await receiveBrowser.close();
server.close();
console.log(process.exitCode ? 'E2E audit UX : ÉCHEC' : 'E2E audit UX : OK');
