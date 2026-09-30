/* ============================================================
   La taille dit le rang, le mot dit le geste.

   Le mainteneur, le 30 septembre 2026 : « les boutons beaucoup trop
   gros, ou avec trop d'écriture et d'explication — c'est tout ce que je
   déteste ». Il avait raison sur pièces : « Télécharger » faisait 235 px
   pour un mot, « Donner » et « Recevoir » 95 px de haut, et chaque
   feuille d'options empilait des briques pleine largeur, avec un
   sous-titre qui expliquait chacune (« sur le premier appareil »,
   « à sa prochaine connexion », « coller le texte »).

   L'app n'a plus que trois formes de bouton, et ce scénario les garde :
   ① LE PRIMAIRE — rempli, un par vue ; dans une feuille il tient le pied.
     C'est le seul qui a le droit de s'étirer. Tout autre bouton est
     taillé à son mot : aucun ne dépasse 60 % de sa boîte.
   ② LA RANGÉE — une liste d'actions est UN cadre et des rangées sans
     relief, comme « Réglages » ou « Modèles d'emails ». Une rangée qui
     reprend cadre ou ombre redevient une brique.
   ③ UN GESTE SEUL n'est pas une rangée : une liste d'un seul geste est
     la brique d'avant sous un autre nom — c'est un bouton à sa taille.
   Et deux règles de mots :
   ④ pas de sous-titre qui EXPLIQUE — une rangée ne porte à droite qu'un
     état d'un mot ou une donnée chiffrée (« non », « 3 pistes ») ;
   ⑤ un libellé court : au-delà de quatre mots, il se compte, sous un
     plafond tenu à la baisse.
   ⑥ au doigt, LE VISUEL N'EST PAS LA CIBLE (« ça reste trop gros », le
     même jour) : un bouton se dessine à 40 px au plus, l'action compacte,
     la puce et la croix à 32, et sa zone de 44 px est une marge
     invisible — que `e2e-ux-audit.mjs` prouve en la touchant. Rien ne
     se dessine plus haut que 40, sauf ce qui se NOMME ci-dessous.

   La sonde se vérifie elle-même : une brique, une rangée habillée, une
   liste d'un geste et un sous-titre bavard sont plantés, et chaque
   critère doit les voir — sinon il rendrait zéro, et zéro se lit comme
   une réussite (§5).
   ============================================================ */
import { chromium, chromiumPath, serveRepo, ouvrirReglages } from './outils.mjs';

/* ⑤ — les libellés de plus de quatre mots, NOMMÉS. Zéro au 30 septembre
   2026 : « Refaire ma phrase de secours » est devenu « Changer ma
   phrase », « Activer l'empreinte / le visage » une ligne d'état
   « Empreinte ou visage · non ». Un libellé long qui revient doit monter
   ce plafond ICI, en disant pourquoi aucun mot ne peut partir. */
const PLAFOND_LONGS = 0;

/* ⑥ — ce qui a le droit de se dessiner à 44 px au doigt, et pourquoi.
   Une exception se NOMME, avec sa raison, jamais en silence. */
const HAUTS = {
  '#piAffiner': 'posé sur la ligne du champ de recherche, il en prend la hauteur — deux hauteurs sur une même ligne se liraient comme un défaut'
};

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const fail = m => { console.error('ÉCHEC :', m); ko = 1; };
const j = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const DATA = [
  { id: 'p1', name: 'Sopra Steria', city: 'Lille', status: 'active', nextAction: j(0), nextActionText: 'Relancer Julie',
    desc: 'ESN', contacts: [{ id: 'k1', name: 'Julie Martin', role: 'RH', email: 'julie@exemple.fr' }] },
  { id: 'p2', name: 'Orange Cyberdefense', city: 'Lille', status: 'todo', vecu: 'stage', vecuQui: 'Léa',
    contacts: [{ id: 'k2', name: 'Karim Benali', email: 'k@exemple.fr' }] },
  { id: 'p3', name: 'Thales', city: 'Vélizy', status: 'todo' }
];

/* le relevé d'une vue : la feuille du dessus, sinon l'écran */
const RELEVE = () => {
  const sheet = [...document.querySelectorAll('.overlay:not(.ov-out) .modal')].pop();
  const racine = sheet || document.querySelector('.view:not([hidden])');
  const vu = n => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !n.closest('[hidden]'); };
  const nom = n => {
    const c = n.cloneNode(true);
    c.querySelectorAll('svg,.ic,span').forEach(x => x.remove());
    return c.textContent.replace(/\s+/g, ' ').trim();
  };
  const out = { etires: [], habilles: [], seuls: [], bavards: [], longs: [], hauts: [], vus: 0 };
  /* ⑥ la hauteur DESSINÉE, au doigt seulement (à la souris, --ctl vaut
     déjà 32) : un bouton d'une seule ligne ne dépasse pas 40 px */
  if (matchMedia('(pointer:coarse), (max-width:900px)').matches)
    for (const b of racine.querySelectorAll('.btn, .dchip:not(.dchip-d), .fl-chip, .seg3 .seg, .x')){
      if (!vu(b) || b.closest('.modal-h')) continue;
      const h = b.getBoundingClientRect().height;
      const lignes = Math.round((h - 8) / parseFloat(getComputedStyle(b).lineHeight || 18)) || 1;
      if (h > 41 && lignes <= 1 && !(b.id && window.__HAUTS && window.__HAUTS.includes('#' + b.id)))
        out.hauts.push(`« ${nom(b) || b.getAttribute('aria-label') || b.className} » ${Math.round(h)} px`);
    }
  for (const b of racine.querySelectorAll('.btn')){
    if (!vu(b) || b.closest('.modal-f,.modal-h') || b.classList.contains('btn-primary')) continue;
    out.vus++;
    const boite = (b.closest('.modal-b,.page-inner,.fset,.pcard') || racine).getBoundingClientRect();
    const part = b.getBoundingClientRect().width / boite.width;
    if (part >= 0.6) out.etires.push(`« ${nom(b)} » ${Math.round(part * 100)} %`);
  }
  for (const p of racine.querySelectorAll('.pick:not(.pk)')){
    if (!vu(p)) continue;
    out.vus++;
    const cs = getComputedStyle(p);
    if (cs.boxShadow !== 'none' || parseFloat(cs.borderTopWidth) > 0)
      out.habilles.push(`« ${nom(p)} »`);
    for (const s of p.querySelectorAll(':scope > span')){
      const t = s.textContent.replace(/\s+/g, ' ').trim();
      if (t && !/\d/.test(t) && t.split(' ').length > 1) out.bavards.push(`« ${nom(p)} » + « ${t} »`);
    }
  }
  for (const l of racine.querySelectorAll('.pick-list')){
    if (!vu(l) || l.querySelector('.pk') || l.closest('.rg-foot')) continue;
    if (l.querySelectorAll(':scope > .pick').length < 2)
      out.seuls.push(`« ${nom(l.querySelector('.pick') || l)} »`);
  }
  for (const b of racine.querySelectorAll('.btn, .pick:not(.pk)')){
    if (!vu(b)) continue;
    const t = nom(b.querySelector(':scope > b') || b);
    if ((t.match(/[A-Za-zÀ-ÿ’'-]+/g) || []).length > 4) out.longs.push(`« ${t} »`);
  }
  return out;
};

async function ouvrir(opts){
  const ctx = await browser.newContext(opts);
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push(String(e)));
  await p.goto(base, { waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  await p.evaluate(async d => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.PROFILE_KEY, JSON.stringify({ name: 'Sam Martin' }));
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
  }, DATA);
  /* semer SANS recharger mesurerait l'état chargé à l'ouverture (§5) */
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  return p;
}
const fermer = p => p.evaluate(async () => {
  const { topSheet } = await import('./ui/dom.js'); let s, n = 0;
  while ((s = topSheet()) && n++ < 6){ s.close(null, true); await new Promise(r => setTimeout(r, 110)); }
});

const piste = i => `const { S } = await import('./ui/state.js'); const c = S.companies[${i}];`;
const SURFACES = [
  ['Aujourd’hui', p => p.evaluate(() => { location.hash = '#/aujourdhui'; })],
  ['Mes pistes', p => p.evaluate(() => { location.hash = '#/pistes'; })],
  ['Échanger', p => p.evaluate(() => { location.hash = '#/echanger'; })],
  ['Moi', p => p.evaluate(() => { location.hash = '#/moi'; })],
  ['fiche', p => p.evaluate(new Function(`return (async () => { ${piste(0)} (await import('./ui/fiche.js')).openFiche(c); })()`))],
  ['écrire', p => p.evaluate(new Function(`return (async () => { ${piste(0)} (await import('./ui/mail.js')).openMail(c, {}); })()`))],
  ['capture', p => p.evaluate(() => import('./ui/capture.js').then(m => m.openCapture()))],
  ['donner', p => p.evaluate(() => import('./ui/donner.js').then(m => m.openDonner()))],
  ['donner · fichier', async p => { await p.evaluate(() => import('./ui/donner.js').then(m => m.openDonner())); await p.click('#dnFile'); }],
  ['recevoir', p => p.evaluate(() => import('./ui/recevoir.js').then(m => m.openRecevoir()))],
  ['depuis mes e-mails', p => p.evaluate(() => import('./ui/recevoir.js').then(m => m.openImportMails()))],
  ['mes appareils', p => p.evaluate(() => import('./ui/direct.js').then(m => m.openAppareils()))],
  ['verrouillage', p => p.evaluate(() => import('./ui/verrou.js').then(m => m.openManageSheet()))],
  ['clôturer', p => p.evaluate(new Function(`return (async () => { ${piste(0)} (await import('./ui/actions.js')).askClose(c, {}); })()`))],
  ['modèles', p => p.evaluate(() => import('./ui/profil.js').then(m => m.openTemplates()))]
];

for (const [ergo, opts] of [['au doigt', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
                             ['à la souris', { viewport: { width: 1280, height: 800 } }]]){
  const p = await ouvrir(opts);
  const tout = { etires: [], habilles: [], seuls: [], bavards: [], longs: [], hauts: [] };
  await p.evaluate(ids => { window.__HAUTS = ids; }, Object.keys(HAUTS));
  let vus = 0;
  const relever = async nom => {
    await p.waitForTimeout(380);
    const r = await p.evaluate(RELEVE);
    vus += r.vus;
    for (const k of Object.keys(tout)) for (const x of r[k]) tout[k].push(`${nom} · ${x}`);
  };
  for (const [nom, ouvre] of SURFACES){ await fermer(p); await ouvre(p); await relever(nom); }
  if (ergo === 'au doigt'){
    await fermer(p);
    await p.evaluate(() => { location.hash = '#/moi'; });
    await ouvrirReglages(p);
    await relever('Réglages');
  }

  /* LA SONDE : une feuille fabriquée porte les quatre fautes */
  await fermer(p);
  await p.evaluate(async () => {
    const { openSheet } = await import('./ui/dom.js');
    const sh = openSheet({ title: 'Sonde' });
    sh.body.innerHTML =
      `<button class="btn" style="width:100%">Brique</button>
       <div class="pick-list"><button class="pick" style="box-shadow:0 2px 0 #000"><b>Habillée</b></button>
         <button class="pick"><b>Bavarde</b><span>explique quand s'en servir</span></button></div>
       <div class="pick-list"><button class="pick"><b>Seule</b></button></div>
       <button class="btn">Un libellé beaucoup trop long pour un bouton</button>
       <button class="btn" style="min-height:52px">Tuile</button>`;
  });
  const sonde = await p.evaluate(RELEVE);
  await fermer(p);
  const vue = {
    etires: sonde.etires.some(x => /Brique/.test(x)),
    habilles: sonde.habilles.some(x => /Habillée/.test(x)),
    bavards: sonde.bavards.some(x => /Bavarde/.test(x)),
    seuls: sonde.seuls.some(x => /Seule/.test(x)),
    longs: sonde.longs.some(x => /beaucoup trop long/.test(x)),
    /* à la souris, ce critère ne s'applique pas : sa sonde non plus */
    hauts: ergo !== 'au doigt' || sonde.hauts.some(x => /Tuile/.test(x))
  };
  for (const [k, ok] of Object.entries(vue))
    if (!ok) fail(`${ergo} : la sonde « ${k} » n'a pas été vue — ce critère ne mesure plus rien`);
  if (vus < 20) fail(`${ergo} : ${vus} boutons seulement relevés — le balayage ne lit plus l'app`);

  const dire = (liste, msg) => {
    if (liste.length) fail(`${ergo} : ${msg} —\n      ${liste.join('\n      ')}`);
  };
  dire(tout.etires, 'un bouton secondaire s’étire au-delà de 60 % de sa boîte (seul le primaire en a le droit)');
  dire(tout.habilles, 'une rangée d’action a repris cadre ou ombre — elle redevient une brique');
  dire(tout.seuls, 'une liste d’un seul geste — un geste seul est un bouton à sa taille');
  dire(tout.bavards, 'un sous-titre explique le bouton — à droite, seulement un état d’un mot ou un chiffre');
  dire(tout.hauts, 'au doigt, un bouton se DESSINE au-delà de 40 px — le visuel n’est pas la cible : '
    + 'dessin à 40 (32 pour le compact), zone de 44 par la marge invisible');
  if (tout.longs.length > PLAFOND_LONGS)
    fail(`${ergo} : ${tout.longs.length} libellé(s) de plus de quatre mots (plafond ${PLAFOND_LONGS}) —\n      `
      + tout.longs.join('\n      '));
  if (!ko) console.log(`${ergo} : ${vus} boutons sur ${SURFACES.length + (ergo === 'au doigt' ? 1 : 0)} vues — `
    + `aucun étiré, aucune brique, aucun sous-titre bavard, ${tout.longs.length} libellé long${ergo === 'au doigt' ? ', rien dessiné au-delà de 40 px' : ''} ✓`);
  await p.context().close();
}

if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
console.log(ko ? 'E2E boutons : ÉCHEC' : 'E2E boutons : OK');
await browser.close();
server.close();
process.exit(ko);
