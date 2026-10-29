/* ============================================================
   LE CONTENU SANS CADRE (décision 0010, 29 octobre 2026 — le
   mainteneur : « les cadres restreignent et empêchent d'utiliser
   l'espace vide », « un gros travail de minimalisme »)

   L'écran d'un onglet EST la fenêtre de l'app : il prend la face claire
   des feuilles, et ce qui s'y range se pose en LIGNES séparées d'un
   pointillé. Le châssis (barres, fenêtres, champs, boutons) et les
   objets qu'on prend en entier gardent leur cadre ; une ligne de liste,
   une liste, un groupe nommé, un compte, non.

   Le scénario part de l'app réelle, semée d'un jeu nourri (30 pistes,
   des amis, deux groupes, des conversations), et mesure au pouce et au
   poste, en clair et en sombre :
   ① la vue d'un onglet a la face de la fenêtre (`--surface-window`) ;
   ② aucune LIGNE (piste, ligne du jour, conversation, demande, rangée
     de réglage, ligne à cocher, pas de « Premiers pas ») ne porte un
     cadre — un trait sur ses quatre côtés — ni une ombre ;
   ③ aucune LISTE qui les porte non plus (la boîte, les tranches, les
     groupes de « Moi », les réglages d'un groupe…), et un compte de
     tranche n'a pas de pastille ;
   ④ ce qui garde son cadre se NOMME : la carte du tableau de « Mes
     pistes » (on la prend et on la dépose), et on vérifie qu'elle l'a
     toujours — une exemption qui n'exempte plus rien se dit.
   Chaque mesure vérifie d'abord qu'elle a mesuré quelque chose. Trois
   sondes remettent l'ancien dessin (une carte par piste, un cadre
   autour de la boîte, la vue beige) et doivent rougir.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet, ouvrirReglages, ouvrirDonner, vueTableau } from './outils.mjs';
import { jeuMassif, semerMassif } from './jeu-massif.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let echecs = 0;
const fail = m => { console.error('ÉCHEC :', m); echecs++; process.exitCode = 1; };
const ok = (c, m) => { if (c) console.log('  ✓', m); else fail(m); };
const jeu = await jeuMassif({ pistes: 30, amis: 6, groupes: 2, conversations: 4, motsParGroupe: [30, 12] });

/* ce qui est une LIGNE, ce qui est une LISTE : des sélecteurs, passés en
   données (une fonction ne se sérialise pas en argument d'`evaluate`) */
const LIGNES = ['.row-item', '.act-row', '.bx-l', '.rz-l', '.rg-row', '.pick.pk', '.pk-duo', '.pp-et', '.td-triage', '.ec-l'];
const LISTES = ['.rows', '.tr-rows', '.bx-liste', '.rz-liste', '.pp-liste', '.fset', '.gr-regl', '.gr-actions',
  '.td-board .bcol', '.modal-b .pick-list', '.td-semaine'];
const COMPTES = ['.tr-n'];

/* la mesure : ce qui porte un cadre (un trait sur les quatre côtés) ou
   une ombre, parmi ce qui est visible */
async function mesurer(p){
  return p.evaluate(({ LIGNES, LISTES, COMPTES }) => {
    const vu = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    const cadre = e => {
      const cs = getComputedStyle(e);
      const cotes = ['Top', 'Right', 'Bottom', 'Left'].filter(c => cs['border' + c + 'Style'] !== 'none' && parseFloat(cs['border' + c + 'Width']) > 0).length;
      return { cotes, ombre: cs.boxShadow !== 'none' };
    };
    const nom = e => (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : e.tagName)
      + ' « ' + (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30) + ' »';
    const fautes = [];
    let lignes = 0, listes = 0, comptes = 0;
    for (const s of LIGNES) for (const e of document.querySelectorAll(s)){
      if (!vu(e)) continue; lignes++;
      const c = cadre(e);
      if (c.cotes === 4) fautes.push('ligne encadrée : ' + nom(e));
      if (c.ombre) fautes.push('ligne en relief : ' + nom(e));
    }
    for (const s of LISTES) for (const e of document.querySelectorAll(s)){
      if (!vu(e)) continue; listes++;
      const c = cadre(e);
      if (c.cotes === 4) fautes.push('liste encadrée : ' + nom(e));
      if (c.ombre) fautes.push('liste en relief : ' + nom(e));
    }
    for (const s of COMPTES) for (const e of document.querySelectorAll(s)){
      if (!vu(e)) continue; comptes++;
      if (cadre(e).cotes) fautes.push('compte en pastille : ' + nom(e));
    }
    /* ① la vue d'un onglet a la face de la fenêtre */
    const v = document.querySelector('.view:not([hidden])');
    const t = document.createElement('div'); t.style.background = 'var(--surface-window)'; document.body.append(t);
    const face = getComputedStyle(t).backgroundColor; t.remove();
    const fond = v ? getComputedStyle(v).backgroundColor : '';
    if (v && fond !== face) fautes.push(`vue ${v.id} : fond ${fond}, la fenêtre est ${face}`);
    return { fautes, lignes, listes, comptes };
  }, { LIGNES, LISTES, COMPTES });
}

const fermer = async p => {
  for (let i = 0; i < 6; i++){
    const f = await p.evaluate(() => { const ov = [...document.querySelectorAll('.overlay:not(.ov-out)')].pop();
      if (!ov) return false; ov.querySelector('.modal-h button.x')?.click(); return true; });
    if (!f) break;
    await p.waitForTimeout(300);
  }
};
const aller = async (p, r) => { await fermer(p); await p.evaluate(r => { location.hash = '#/' + r; }, r); await p.waitForTimeout(450); };

async function ecran({ vp, sombre }){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, isMobile: vp.width < 901, colorScheme: sombre ? 'dark' : 'light' });
  await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !/WebSocket|net::ERR/.test(m.text())) errors.push(m.text()); });
  await p.goto(base + '/#/aujourdhui', { waitUntil: 'load' });
  await p.evaluate(async () => { const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.RELAYS_KEY, JSON.stringify(['wss://127.0.0.1:9'])); });
  await semerMassif(p, jeu);
  await p.waitForSelector('#view-aujourdhui:not([hidden]) .act-row');
  return { ctx, p };
}

/* les écrans où l'on range du contenu, et les feuilles qui en portent */
const PARCOURS = [
  ['Aujourd’hui', async p => { await aller(p, 'aujourdhui'); }],
  ['Mes pistes', async p => { await aller(p, 'pistes'); await p.waitForSelector('#view-pistes .row-item'); }],
  ['Réseau', async p => { await aller(p, 'reseau'); await p.waitForSelector('.bx-l'); }],
  ['Moi', async p => { await aller(p, 'moi'); await p.evaluate(async () => (await import('./ui/moi.js')).closeReglages?.()); await p.waitForTimeout(250); }],
  ['Réglages', async p => { await aller(p, 'moi'); await ouvrirReglages(p); }],
  ['Modèles d’emails', async p => { await aller(p, 'moi'); await p.evaluate(async () => (await import('./ui/moi.js')).closeReglages?.());
    await p.waitForTimeout(250); await p.click('#moiTpl'); await p.waitForSelector('.modal .rg-row'); }],
  ['Choisir', async p => { await aller(p, 'pistes'); await p.click('#piProspect'); await p.waitForSelector('.modal .pk'); }],
  ['Donner', async p => { await aller(p, 'reseau'); await ouvrirDonner(p); await p.waitForSelector('.modal .pk'); }],
  ['Groupe', async p => { await aller(p, 'reseau'); await p.click('.bx-l[data-groupe]'); await p.waitForSelector('#grMembres');
    await p.click('#grMembres'); await p.waitForSelector('.gr-noms'); }],
];

const MAINS = [
  ['pouce', { width: 390, height: 844 }],
  ['poste', { width: 1280, height: 800 }],
];
for (const sombre of [false, true]) for (const [main, vp] of MAINS){
  console.log(`— ${main}, ${sombre ? 'sombre' : 'clair'}`);
  const { ctx, p } = await ecran({ vp, sombre });
  let total = 0;
  for (const [nom, aller2] of PARCOURS){
    try { await aller2(p); } catch (e) { fail(`${main} : « ${nom} » ne s'ouvre pas — ${e.message.split('\n')[0]}`); continue; }
    await p.waitForTimeout(200);
    const m = await mesurer(p);
    total += m.lignes;
    if (!m.lignes && !m.listes) { fail(`${main} : « ${nom} » — rien mesuré (aucune ligne, aucune liste)`); continue; }
    ok(!m.fautes.length, `${main} : « ${nom} » — ${m.lignes} lignes, ${m.listes} listes, ${m.comptes} comptes, sans cadre`
      + (m.fautes.length ? ' — ' + m.fautes.slice(0, 4).join(' | ') : ''));
    if (!sombre && (nom === 'Aujourd’hui' || nom === 'Réseau' || nom === 'Moi'))
      await p.screenshot({ path: `${SHOTS}/cadres-${main}-${nom.replace(/[^a-zA-Zé]/g, '')}.png` });
  }
  ok(total > 50, `${main} : la mesure a porté sur ${total} lignes`);

  /* ④ l'exemption nommée : la carte du tableau de « Mes pistes » garde
     son cadre — on la prend, on la dépose */
  if (main === 'poste' && !sombre){
    await aller(p, 'pistes');
    await vueTableau(p);
    await p.waitForSelector('.bcard');
    const carte = await p.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('.bcard'));
      return ['Top', 'Right', 'Bottom', 'Left'].filter(c => cs['border' + c + 'Style'] !== 'none' && parseFloat(cs['border' + c + 'Width']) > 0).length;
    });
    ok(carte === 4, '④ la carte du tableau de « Mes pistes » garde son cadre (on la prend, on la dépose)');
    await p.click('#view-pistes [data-vue="liste"]');
    await p.waitForSelector('#view-pistes .row-item:not(.row-closed)');
  }

  /* les sondes : l'ancien dessin remis doit rougir */
  if (!sombre){
    await aller(p, 'pistes');
    await p.waitForSelector('#view-pistes .row-item:not(.row-closed)');
    const s1 = await p.addStyleTag({ content: '.row-item{border:1px solid #000;box-shadow:2px 2px 0 #000}' });
    const m1 = await mesurer(p);
    ok(m1.fautes.some(f => /ligne (encadrée|en relief) : \.row-item/.test(f)), `${main} : sonde — une carte par piste est vue (${m1.fautes.length} fautes)`);
    await s1.evaluate(n => n.remove());
    await aller(p, 'reseau');
    await p.waitForSelector('.bx-l');
    const s2 = await p.addStyleTag({ content: '.bx-liste{border:1px solid #000}' });
    const m2 = await mesurer(p);
    ok(m2.fautes.some(f => /liste encadrée : \.bx-liste/.test(f)), `${main} : sonde — un cadre autour de la boîte est vu`);
    await s2.evaluate(n => n.remove());
    const s3 = await p.addStyleTag({ content: '.view{background:var(--surface-desktop)}' });
    const m3 = await mesurer(p);
    ok(m3.fautes.some(f => /^vue /.test(f)), `${main} : sonde — la vue beige d'avant est vue`);
    await s3.evaluate(n => n.remove());
  }
  await ctx.close();
}

ok(!errors.length, 'zéro erreur console' + (errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''));
await browser.close(); server.close();
console.log(echecs ? `E2E le contenu sans cadre : ${echecs} échec(s)` : 'E2E le contenu sans cadre : OK');
