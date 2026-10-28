/* ============================================================
   E2E — À GRANDE ÉCHELLE, ET SANS NOTIFICATIONS (lot R10, ouvert en 7.0.0)
   (docs/propositions/R10-grand-nombre-et-calme.md)

   Les autres scénarios sèment trois pistes et un groupe de quatre
   messages. Celui-ci sème un étudiant AU BOUT de ce que l'app accepte
   (`jeu-massif.mjs` : 400 pistes, 200 amis, 5 groupes et 1 480 messages,
   120 conversations, 60 demandes reçues, 28 envoyées) et garde ce qui
   cassait :
   ① le plus gros groupe (640 messages) ne rend qu'une FENÊTRE : 120
     bulles au plus, « Voir les N messages d'avant » en tête — un tap en
     ouvre soixante de plus, et ce qu'on lisait ne bouge pas d'un pixel ;
     la conversation de 300 messages aussi ;
   ② un visage est UN tracé, jamais un `<rect>` par case ;
   ③ « Tes amis » montre trois lignes, le contact donné en tête, et
     « Voir les N autres » ouvre le reste ;
   ④ au calme : aucun chiffre sur un onglet ni sur une conversation, un
     point à la place ; « Aujourd'hui » dit qui t'a écrit, et ce tap
     ouvre la boîte sur « Non lus » ; plusieurs demandes tiennent une
     ligne chacune, la carte s'ouvre au tap ;
   ⑥ « Choisir » (la liste à cocher d'où partent Écrire et Donner)
     s'ouvre sur soixante pistes et « Voir les N autres » (porte
     « Performance ») : le tap montre la suite et pose le focus sur la
     première ligne révélée ;
   pouce ; zéro erreur console.
   Quatre mutations : la fenêtre ouverte en grand, « Tes amis » sans
   plafond, un compte rendu aux conversations, la liste à cocher sans
   plafond.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, annuaireMuet, ROOT, SHOTS } from './outils.mjs';
import { jeuMassif, semerMassif } from './jeu-massif.mjs';
import { readFile } from 'fs/promises';
import path from 'path';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };
const jeu = await jeuMassif();
const GROS = Object.entries(jeu.groupes).sort((a, b) => b[1].fil.length - a[1].fil.length)[0][0];
const LONG = jeu.profil.amis[0].id;           /* 300 messages */
const pose = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

async function jouer({ nom, mutations = {}, captures = false }){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
    /* les modules mutés sont importés tard : le service worker les
       servirait de son cache */
    serviceWorkers: 'block' });
  await annuaireMuet(ctx);
  for (const [f, body] of Object.entries(mutations))
    await ctx.route('**/' + f, r => r.fulfill({ contentType: 'text/javascript', body }));
  const p = await ctx.newPage();
  p.setDefaultTimeout(15000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error' && !/WebSocket|ERR_/.test(m.text())) errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/aujourdhui');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await semerMassif(p, jeu);
  /* la boîte aux lettres se lit après l'écran : on attend ses lignes, pas
     seulement la première venue */
  await p.waitForSelector('.tr-amis .act-row[data-sorte="don"]');
  await p.waitForTimeout(600);
  const x = { nom };
  const boite = 'reseau';

  /* ---------- les onglets, « Tes amis » ---------- */
  const lire = () => p.evaluate(b => {
    /* un chiffre au coin d'un onglet, quelle que soit sa classe */
    const n = r => (document.querySelector(`.bottomnav [data-r="${r}"]`)?.textContent || '').replace(/\D/g, '');
    const rows = [...document.querySelectorAll('.tr-amis .act-row')];
    return { ongletJour: n('aujourdhui'), ongletBoite: n(b),
             aria: document.querySelector(`.bottomnav [data-r="${b}"]`).getAttribute('aria-label'),
             amis: rows.length, premiere: rows[0] ? rows[0].dataset.sorte : '', deuxieme: rows[1] ? rows[1].dataset.sorte : '', premiereTxt: rows[0] ? rows[0].querySelector('.act-verb').textContent : '',
             plus: (document.querySelector('.tr-amis .tr-more') || {}).textContent || '' };
  }, boite);
  Object.assign(x, await lire());
  if (captures) await p.screenshot({ path: `${SHOTS}/echelle-${nom}-aujourdhui.png` });
  if (x.plus){
    await p.click('.tr-amis .tr-more');
    await p.waitForTimeout(300);
    x.amisTous = await p.evaluate(() => document.querySelectorAll('.tr-amis .act-row').length);
  }
  /* au calme, la ligne « t'ont écrit » mène à la boîte, sur « Non lus » */
  if (x.premiere === 'ecrits'){
    await p.click('.tr-amis .act-row[data-sorte="ecrits"] .act-main');
    await p.waitForFunction(b => location.hash.includes(b), boite);
    await p.waitForSelector('.bx-liste .bx-l');
    x.filtre = await p.evaluate(() => (document.querySelector('[data-filtre][aria-pressed="true"]') || {}).textContent || '');
    x.lignesNonLues = await p.evaluate(() => [...document.querySelectorAll('.bx-liste .bx-l')].every(b => b.classList.contains('bx-nonlu')));
  } else {
    await p.click(`.bottomnav [data-r="${boite}"]`);
    await p.waitForSelector('.bx-liste .bx-l');
  }

  /* ---------- la boîte ---------- */
  Object.assign(x, await p.evaluate(() => ({ bxc: document.querySelectorAll('.bx-c').length, bxpt: document.querySelectorAll('.bx-pt').length,
    rect: document.querySelectorAll('.vz svg rect').length, path: document.querySelectorAll('.vz svg path').length,
    vz: document.querySelectorAll('.vz svg').length, rz: document.querySelectorAll('.rz-l').length })));
  if (captures) await p.screenshot({ path: `${SHOTS}/echelle-${nom}-boite.png` });
  if (x.rz){
    await p.click('.rz-l');
    x.carte = await p.waitForSelector('.modal #rzCarte', { timeout: 4000 }).then(() => true, () => false);
    await p.keyboard.press('Escape'); await p.waitForTimeout(350);
  }

  /* ---------- ① le plus gros groupe ---------- */
  await p.click('[data-filtre="tout"]').catch(() => {});
  /* les visages se comptent sur TOUTE la boîte, pas sur « Non lus » */
  await p.waitForTimeout(200);
  Object.assign(x, await p.evaluate(() => ({ rect: document.querySelectorAll('.vz svg rect').length,
    path: document.querySelectorAll('.vz svg path').length, vz: document.querySelectorAll('.vz svg').length })));
  await p.waitForSelector(`.bx-l[data-groupe="${GROS}"]`);
  const t = Date.now();
  await p.click(`.bx-l[data-groupe="${GROS}"]`);
  await p.waitForSelector('#grFil .gr-m');
  await pose(p);
  x.msGroupe = Date.now() - t;
  Object.assign(x, await p.evaluate(() => ({ bulles: document.querySelectorAll('#grFil .gr-m').length,
    noeuds: document.querySelector('#grFil').getElementsByTagName('*').length,
    avant: (document.querySelector('#grFil [data-avant]') || {}).textContent || '' })));
  if (captures) await p.screenshot({ path: `${SHOTS}/echelle-${nom}-groupe.png` });
  if (x.avant){
    /* ce qu'on lit ne bouge pas : la première bulle rendue garde sa place */
    /* le bouton en vue, puis un tap SANS défilement : Playwright fait
       défiler jusqu'à ce qu'il clique, ce qui fausserait la mesure */
    const repere = await p.evaluate(() => { document.querySelector('#grFil [data-avant]').scrollIntoView({ block: 'start' });
      return document.querySelector('#grFil [data-retirable]').dataset.retirable; });
    await pose(p);
    const y0 = await p.evaluate(id => document.querySelector(`#grFil [data-retirable="${id}"]`).getBoundingClientRect().top, repere);
    await p.evaluate(() => document.querySelector('#grFil [data-avant]').click());
    await pose(p);
    Object.assign(x, await p.evaluate(([id, y]) => ({ bulles2: document.querySelectorAll('#grFil .gr-m').length,
      decalage: Math.round(document.querySelector(`#grFil [data-retirable="${id}"]`).getBoundingClientRect().top - y) }), [repere, y0]));
  }
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);

  /* ---------- la conversation de 300 messages ---------- */
  await p.waitForSelector(`.bx-l[data-ami="${LONG}"]`);
  await p.click(`.bx-l[data-ami="${LONG}"]`);
  await p.waitForSelector('#msFil');
  Object.assign(x, await p.evaluate(() => ({ msgs: document.querySelectorAll('#msFil .ms-m').length,
    avantConv: (document.querySelector('#msFil [data-avant]') || {}).textContent || '' })));
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);

  /* ---------- ⑥ « Choisir » : soixante lignes, puis la suite d'un tap ---------- */
  await p.evaluate(() => { location.hash = '#/pistes'; });
  if (await p.waitForSelector('#piProspect').then(() => true, () => false)){
    await p.click('#piProspect');
    await p.waitForSelector('.modal .pk');
    Object.assign(x, await p.evaluate(() => ({ dnLignes: document.querySelectorAll('.modal .pk').length,
      dnPlus: (document.querySelector('.modal [data-plus]') || {}).textContent || '' })));
    if (x.dnPlus){
      await p.evaluate(() => document.querySelector('.modal [data-plus]').click());
      await p.waitForTimeout(300);
      Object.assign(x, await p.evaluate(() => {
        const pk = [...document.querySelectorAll('.modal .pk')];
        return { dnTous: pk.length, dnFocus: pk.indexOf(document.activeElement), dnPlusApres: !!document.querySelector('.modal [data-plus]') };
      }));
    }
  }
  await ctx.close();
  return x;
}

{
  const x = await jouer({ nom: 'plafond', captures: true });
  console.log(JSON.stringify(x));
  ok(x.bulles <= 120 && x.bulles >= 60 && /^Voir les \d+ messages d’avant$/.test(x.avant),
    `① le groupe de 640 messages ne rend qu’une fenêtre : ${x.bulles} bulles, « ${x.avant} »`);
  ok(x.bulles2 > x.bulles && x.bulles2 - x.bulles <= 60 && Math.abs(x.decalage) <= 2,
    `① « Voir les messages d’avant » en ouvre ${x.bulles2 - x.bulles} de plus, et ce qu’on lisait bouge de ${x.decalage} px`);
  ok(x.noeuds < 2500 && x.msGroupe < 5000, `① ${x.noeuds} nœuds dans le fil, ouvert en ${x.msGroupe} ms`);
  ok(x.msgs <= 120 && /^Voir les \d+ messages d’avant$/.test(x.avantConv),
    `① la conversation de 300 messages aussi : ${x.msgs} bulles, « ${x.avantConv} »`);
  ok(x.rect === 0 && x.path === x.vz && x.vz > 50, `② ${x.vz} visages, un tracé chacun, aucun <rect>`);
  ok(x.amis === 3 && x.deuxieme === 'don' && /^Voir les \d+ autres$/.test(x.plus) && x.amisTous > 30,
    `③ « Tes amis » : 3 lignes, le contact donné juste après « t’ont écrit », « ${x.plus} » → ${x.amisTous}`);
  const reste = +((/^Voir les (\d+) autres$/.exec(x.dnPlus || '') || [])[1] || 0);
  ok(x.dnLignes === 60 && reste > 0, `⑥ « Choisir » s’ouvre sur ${x.dnLignes} lignes, « ${x.dnPlus} »`);
  ok(x.dnTous === 60 + reste && x.dnFocus === 60 && !x.dnPlusApres,
    `⑥ le tap montre les ${x.dnTous}, et le focus se pose sur la première révélée (ligne ${x.dnFocus + 1})`);
  ok(!x.ongletJour && !x.ongletBoite && !/\d/.test(x.aria), `④ aucun chiffre sur les onglets (« ${x.aria} »)`);
  ok(!x.bxc && x.bxpt > 0, `④ aucun compteur sur une conversation, ${x.bxpt} points`);
  ok(x.premiere === 'ecrits' && /t’ont écrit$/.test(x.premiereTxt) && x.amis === 3,
    `④ « Aujourd’hui » dit qui t’a écrit : « ${x.premiereTxt} »`);
  ok(x.lignesNonLues && /Non lus/.test(x.filtre), `④ le tap ouvre la boîte sur « ${x.filtre} »`);
  ok(x.rz === 3 && x.carte, `④ trois demandes, trois lignes, la carte s’ouvre au tap`);
}

/* ---------- ⑦ au poste, le plus gros groupe tient dans son volet ----------
   La ligne des prénoms (« Adam · Arthur · … · toi », 30 à 45 membres)
   est insécable et s'élide ; mais un enfant flex garde la largeur
   MINIMALE de son contenu, et le volet de la boîte, sans `min-width:0`,
   faisait 2 003 px dans un écran de 1 280 : le champ et « Envoyer »
   dehors, le jour du fil centré hors de vue (28 octobre 2026). */
async function poste({ nom, css = null }){
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await annuaireMuet(ctx);
  if (css) await ctx.route('**/styles/app.css', r => r.fulfill({ contentType: 'text/css', body: css }));
  const p = await ctx.newPage();
  p.setDefaultTimeout(15000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error' && !/WebSocket|ERR_/.test(m.text())) errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/reseau');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await semerMassif(p, jeu);
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.locator('#view-reseau button.bx-l', { hasText: jeu.groupes[GROS].nom }).first().click();
  await p.waitForSelector('.bx-volet .modal #grFil');
  await pose(p);
  const r = await p.evaluate(() => {
    const m = document.querySelector('.bx-volet .modal'), b = m.getBoundingClientRect();
    const jours = [...m.querySelectorAll('.fil-jour span')].map(s => s.getBoundingClientRect());
    const go = m.querySelector('.modal-f button:last-child, .gr-pied button:last-child');
    return { droite: Math.round(b.right), ecran: innerWidth, jours: jours.length,
             joursDehors: jours.filter(j => j.left < b.left || j.right > b.right).length,
             envoyer: go ? Math.round(go.getBoundingClientRect().right) : null };
  });
  await ctx.close();
  return r;
}
{
  const r = await poste({ nom: 'poste' });
  ok(r.droite <= r.ecran && r.jours > 0 && !r.joursDehors && r.envoyer !== null && r.envoyer <= r.ecran,
    `⑦ au poste, le plus gros groupe tient dans son volet (bord à ${r.droite}/${r.ecran} px, ${r.jours} jour(s) lisibles, envoyer à ${r.envoyer})`);
  const css = await readFile(path.join(ROOT, 'styles/app.css'), 'utf8');
  const avant = '.bx-volet>.dock{flex:1;min-width:0;';
  if (!css.includes(avant)){ ko++; console.log('ÉCHEC — mutation ⑦ : le texte visé n’existe plus dans styles/app.css'); }
  else {
    console.log('mutation ⑦ le volet sans min-width:0 : le fichier servi est bien modifié ✓');
    const m = await poste({ nom: 'mut-volet', css: css.split(avant).join('.bx-volet>.dock{flex:1;') });
    ok(m.droite > m.ecran || m.joursDehors > 0, `mutation ⑦ : la garde rougit (bord à ${m.droite}/${m.ecran} px)`);
  }
}

/* ---------- les mutations : chaque garde doit rougir ---------- */
async function muter(nom, f, avant, apres, rejouer, rougit){
  const src = await readFile(path.join(ROOT, f), 'utf8');
  if (!src.includes(avant)){ ko++; console.log(`ÉCHEC — mutation ${nom} : le texte visé n’existe plus dans ${f}`); return; }
  console.log(`mutation ${nom} : le fichier servi est bien modifié ✓`);
  const x = await rejouer({ [f]: src.split(avant).join(apres) });
  ok(rougit(x), `mutation ${nom} : la garde rougit`);
}
await muter('① la fenêtre ouverte en grand', 'ui/fil.js',
  'export const FENETRE = 60, FENETRE_MAX = 120, PAS_AVANT = 60;',
  'export const FENETRE = 100000, FENETRE_MAX = 100000, PAS_AVANT = 60;',
  m => jouer({ nom: 'mut-fenetre', mutations: m }), x => x.bulles > 120 && !x.avant);
await muter('③ « Tes amis » sans plafond', 'ui/today.js', 'const CAP_AMIS = 3;', 'const CAP_AMIS = 999;',
  m => jouer({ nom: 'mut-amis', mutations: m }), x => x.amis !== 3);
await muter('⑥ la liste à cocher sans plafond', 'ui/affiner.js', 'export const CAP_COCHER = 60;', 'export const CAP_COCHER = 100000;',
  m => jouer({ nom: 'mut-donner', mutations: m }), x => x.dnLignes !== 60 || !x.dnPlus);
await muter('④ un compte rendu aux conversations', 'ui/conversations.js',
  `r.n ? '<span class="bx-pt" aria-hidden="true"></span>' : ''`, `r.n ? '<span class="bx-c">' + r.n + '</span>' : ''`,
  m => jouer({ nom: 'mut-compte', mutations: m }), x => x.bxc > 0);

ok(!errors.length, 'Zéro erreur console' + (errors.length ? ' — ' + errors.slice(0, 4).join(' | ') : ''));
await browser.close();
server.close();
console.log(ko ? `\nE2E échelle : ${ko} ÉCHEC(S)` : '\nE2E échelle : OK');
process.exit(ko ? 1 : 0);
