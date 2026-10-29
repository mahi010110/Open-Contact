/* ============================================================
   OpenContact — e2e : L'ONGLET RÉSEAU (lot R1, docs/recadrage.md,
   décision 0002 ; ouvert à tous en 7.0.0)

   Un onglet, une question :
   ② la barre dit Aujourd'hui · Pistes · Réseau · Moi, et `#/echanger`
     — une adresse donnée avant la 7.0.0 — mène à « Réseau » (l'adresse
     se réécrit) ;
   ③ « Réseau » répond à « qui peut m'aider ? » : mes demandes en tête
     (une ligne chacune dès qu'il y en a deux, le contact donné en accent
     sur sa ligne, la carte au tap — R10), puis les
     conversations, puis « Mes amis » — et, sous le pouce, les deux
     verbes de l'échange, Donner · Recevoir (décision 0008) ;
   ④ le + crée : il ouvre « Nouvelle piste » d'un tap, le curseur dans
     l'entreprise ; « Recevoir » ouvre QR · Fichier · Texte, et « Texte »
     mène droit au champ où l'on colle ;
   ⑤ Pistes ne porte plus que des entreprises : pas de portée « Amis » ;
     « Choisir » ne fait plus qu'écrire, et « Réseau › Donner » part de
     toutes les pistes, cochées d'office ;
   ⑥ « Mes amis » cherche comme la barre : « Thales » trouve Karim,
     « cyber Lille » propose de demander ;
   ⑧ au poste aussi ;
   ⑨ (R1-b) la fiche commence par les gens — les contacts avant « Où
     j'en suis », au pouce, et en colonne de gauche au poste — et
     « Donner » part de la fiche avec cette seule piste ;
   ⑩ quelqu'un rencontré, depuis le + : sans entreprise, la personne part
     dans le bac « à rattacher », et la suivante se tape aussitôt ;
   ⑪ (R1-c, décision 0003) au poste, la barre latérale : l'en-tête
     devient une colonne à gauche — le logo, « Nouvelle piste », puis les quatre
     destinations empilées, icône et mot — à côté de l'écran, de haut en
     bas ;
   ⑫ (R1-d, décision 0003) au poste, « Liste » pose la fiche à droite de
     la liste : la première piste d'office, un clic ou ↓ la change, la
     ligne choisie le dit ; une fiche avec un changement en cours demande
     avant de céder la place, et « Annuler » la garde ; un rendu pendant
     qu'on écrit ne fait perdre ni le curseur ni le texte ; une fiche
     demandée d'ailleurs (Ctrl K) se pose dans le volet, jamais en
     double ; hors de « Mes pistes », le volet se vide ; « Tableau »
     revient aux colonnes, la fiche en fenêtre.
   Zéro erreur console. Six mutations à l'appui : l'ancienne adresse
   oubliée, l'écran sans ses demandes, le partage qui quitte « Réseau »,
   la fiche qui garde son ordre, l'en-tête qui reste une rangée, la
   fiche qui ne se pose pas.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, relaisMuets, annuaireMuet, ouvrirReglages, ROOT, SHOTS } from './outils.mjs';
import { readFile } from 'fs/promises';
import path from 'path';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

const now = Date.now(), J = 864e5;
const CLE = 'B' + 'x'.repeat(86);
const profil = { name: 'Tom Durand', email: 'tom@prive.test', formation: 'BTS SIO', recherche: 'alternance',
  amis: [{ id: 'KarimKarimKarim000001', nom: 'Karim Benali', recu: now - 9 * J, cle: CLE,
           parcours: [{ entreprise: 'Thales', quoi: 'alternance', debut: '2025-09' }] },
         { id: 'LeaLeaLeaLeaLea000001', nom: 'Léa Martin', recu: now - 4 * J, parcours: [], cle: CLE }],
  groupes: [{ code: 'abcdefghjkmnpqr', nom: 'BTS SIO Lille', at: now - 9 * J }] };
/* `updatedAt` DATÉ, jamais laissé au moteur : sans lui, la normalisation
   pose `Date.now()` à la milliseconde où chaque piste est lue, l'ordre de
   la liste devient un tirage, et ⑫ (↓ depuis Advens) tombait sur une
   liste où Advens était la dernière ligne — rouge une fois sur trois en
   CI (PR #78), vert en local. L'ordre est maintenant écrit ici :
   Aztek, Advens, Thales, Kiabi. */
const pistes = [{ id: 'az', name: 'Aztek', city: 'Roubaix', status: 'todo', updatedAt: now - 1 * J },
                { id: 'adv', name: 'Advens', city: 'Lille', status: 'active', updatedAt: now - 2 * J,
                  contacts: [{ id: 'c1', name: 'Nadia Rahmani', email: 'nadia@advens.test' }] },
                { id: 'th', name: 'Thales', city: 'Lille', status: 'todo', updatedAt: now - 3 * J },
                { id: 'ki', name: 'Kiabi', city: 'Hem', status: 'todo', updatedAt: now - 4 * J }];
const reseau = { v: 1, depuis: 0, recues: [], mercis: [], lus: [], envois: [], entrees: [], attentes: [],
  demandes: [
    { id: 'demandeAz0001', pisteId: 'az', at: now - 2 * J, exp: now + 12 * J, vers: 2, groupes: ['BTS SIO Lille'],
      cherche: 'alternance', entreprise: { nom: 'Aztek' } },
    { id: 'demandeTh0001', pisteId: 'th', at: now - 3 * J, exp: now + 11 * J, vers: 1,
      cherche: 'alternance', entreprise: { nom: 'Thales' }, trouve: { at: now - 2 * J, cercle: 1 } }],
  dons: [{ id: 'donThales0001', demande: 'demandeTh0001', de: { prenom: 'Karim', cle: CLE }, entreprise: { nom: 'Thales' },
           contact: { name: 'Julie Marchand', role: 'RH', email: 'julie@thales.test' }, at: now - 60000, statut: 'nouveau' }] };

/* `mutations` : des fichiers servis modifiés — la preuve que le scénario
   sait encore échouer */
async function ecran(nom, { vp = { width: 390, height: 844 }, sombre = false, hash = '#/aujourdhui', mutations = {} } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, colorScheme: sombre ? 'dark' : 'light' });
  await relaisMuets(ctx); await annuaireMuet(ctx);
  for (const [f, body] of Object.entries(mutations))
    await ctx.route('**/' + f, r => r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body }));
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/aujourdhui');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  /* semer APRÈS le démarrage, puis recharger : l'app lit son état à
     l'ouverture (§5) */
  await p.evaluate(async ([pr, ps, rs]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RESEAU_KEY, JSON.stringify(rs));
  }, [profil, pistes, reseau]);
  await p.evaluate(h => { location.hash = h; }, hash);
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async () => { await (await import('./ui/reseau.js')).chargerReseau(); (await import('./ui/state.js')).bus.refresh(); });
  await p.waitForTimeout(350);
  return { ctx, p };
}
const allerA = async (p, h) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(400); };
const dessus = p => p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out)')].pop()?.querySelector('.mh-t')?.textContent.trim() || '');
const fermer = async p => {
  await p.evaluate(async () => { const { topSheet } = await import('./ui/dom.js'); let s, n = 0;
    while ((s = topSheet()) && n++ < 5){ s.close(null, true); await new Promise(r => setTimeout(r, 120)); } });
  await p.waitForTimeout(250);
};
/* la barre telle qu'on la lit : chaque onglet, son mot et son adresse */
const barre = p => p.evaluate(() => {
  const nav = matchMedia('(min-width:901px)').matches ? '.topnav' : '.bottomnav';
  return [...document.querySelectorAll(nav + ' a[data-r]')].map(a => a.innerText.replace(/\s+/g, ' ').trim() + '→' + a.getAttribute('href')).join(' | ');
});
const ici = p => p.evaluate(() => ({
  hash: location.hash, titre: document.title,
  vue: [...document.querySelectorAll('[id^="view-"]')].find(v => !v.hidden)?.id.replace('view-', ''),
  h1: [...document.querySelectorAll('[id^="view-"]')].find(v => !v.hidden)?.querySelector('h1')?.textContent.trim()
}));
const reseauLu = p => p.evaluate(() => {
  const v = document.querySelector('#view-reseau');
  return {
    /* deux demandes : une ligne chacune, l'entreprise en tête (R10) */
    demandes: v ? [...v.querySelectorAll('#rzDemandes .rz-l .rz-m b')].map(t => t.textContent.trim()) : [],
    don: v?.querySelector('#rzDemandes .rz-s-don')?.textContent.trim() || '',
    /* l'ordre de la colonne : la tranche des demandes, puis la boîte */
    ordre: v ? [...v.querySelectorAll('#rzDemandes, .bx-liste')].map(e => e.id || 'boite') : [],
    amis: v?.querySelector('#bxAmis')?.innerText.replace(/\s+/g, ' ').trim() || '',
    /* les deux verbes de l'échange, et où ils tombent : sous la boîte,
       dans le bas de l'écran au pouce (§5) */
    verbes: v ? [...v.querySelectorAll('#rzDonner, #rzRecevoir')].map(b => b.textContent.trim()).join(' · ') : '',
    basVerbes: (() => { const b = v?.querySelector('#rzRecevoir'); return b ? Math.round(b.getBoundingClientRect().top / innerHeight * 100) : -1; })(),
    echangerParti: !document.querySelector('#view-echanger')
  };
});

/* ---------- ②-⑥ au pouce (clair, puis sombre) ---------- */
for (const sombre of [false, true]){
  const nom = sombre ? 'pouce-sombre' : 'pouce';
  const { ctx, p } = await ecran(nom, { sombre, hash: '#/echanger' });
  const a = await ici(p);
  ok(a.vue === 'reseau' && a.hash === '#/reseau' && a.titre === 'Réseau — OpenContact' && a.h1 === 'Réseau',
    `② ${nom} : « #/echanger » mène à « Réseau », l'adresse et le titre suivent — ${JSON.stringify(a)}`);
  ok(await barre(p) === 'Aujourd’hui→#/aujourdhui | Pistes→#/pistes | Réseau→#/reseau | Moi→#/moi'
    && await p.evaluate(() => document.querySelector('#bnAdd').getAttribute('aria-label')) === 'Nouvelle piste',
    `② ${nom} : la barre dit Réseau, le + dit « Nouvelle piste » — ${await barre(p)}`);
  const r = await reseauLu(p);
  ok(r.demandes.join(' / ') === 'Aztek / Thales'
    && r.don === 'Karim t’a donné Julie Marchand' && r.ordre.join(',') === 'rzDemandes,boite',
    `③ ${nom} : mes demandes en tête, une ligne chacune, la plus récente d'abord, le contact donné sur sa ligne — ${JSON.stringify(r)}`);
  /* la carte entière, au tap */
  await p.click('#rzDemandes .rz-l');
  const carte = await p.waitForSelector('.modal #rzCarte .dmc-t').then(e => e.evaluate(t => t.firstChild.textContent.trim()), () => '');
  ok(carte === 'Tu cherches quelqu’un chez Aztek pour une alternance', `③ ${nom} : la ligne ouvre sa carte (« ${carte} »)`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(350);
  ok(r.amis === 'Mes amis 2' && r.verbes === 'Donner · Recevoir' && r.basVerbes >= 75 && r.echangerParti,
    `③ ${nom} : « Mes amis » dans la liste, Donner · Recevoir sous le pouce, et plus d'écran « Échanger » — ${JSON.stringify(r)}`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-${nom}.png` });
  if (sombre){ await ctx.close(); continue; }

  /* ④ le + crée ; « Recevoir » vit dans Réseau */
  await p.click('#bnAdd');
  await p.waitForTimeout(400);
  ok(await dessus(p) === 'Nouvelle piste' && await p.evaluate(() => document.activeElement?.id) === 'cpName',
    `④ le + ouvre « Nouvelle piste » d'un tap, le curseur dans l'entreprise — ${await dessus(p)}`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-ajouter.png` });
  await fermer(p);
  await allerA(p, '#/reseau');
  await p.click('#rzRecevoir');
  await p.waitForTimeout(350);
  const rc = await p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .pick')].map(b => b.textContent.trim()).join(' · '));
  ok(await dessus(p) === 'Recevoir' && rc === 'QR · Fichier · Texte', `④ « Recevoir » : ${rc}`);
  await p.click('#rcPaste');
  await p.waitForTimeout(350);
  ok(await dessus(p) === 'Texte' && await p.evaluate(() => document.activeElement?.id) === 'rcTxt',
    `④ « Texte » mène droit au champ où l'on colle — ${await dessus(p)}`);
  await fermer(p);

  /* ⑤ Pistes : des entreprises ; « Choisir » écrit, « Réseau › Donner » donne */
  await allerA(p, '#/pistes');
  ok(await p.evaluate(() => [...document.querySelectorAll('#piPortee [data-portee]')].map(b => b.dataset.portee).join(',')) === 'pistes,decouvrir'
    && await p.evaluate(() => document.querySelector('#piProspect')?.textContent.trim()) === 'Choisir',
    '⑤ Pistes : plus de portée « Amis », et « Choisir »');
  await p.click('#piProspect');
  await p.waitForTimeout(350);
  await p.click('.pk[data-id="az"]');
  await p.waitForTimeout(200);
  const pied1 = await p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .modal-f button')]
    .map(b => b.textContent.trim() + (b.disabled ? '(off)' : '')).join(' · '));
  ok(await dessus(p) === 'Choisir' && pied1 === 'Écrire(off)',
    `⑤ « Choisir » n'a plus qu'un geste, « Écrire » — ${pied1}`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-choisir.png` });
  await fermer(p);
  await allerA(p, '#/reseau');
  await p.click('#rzDonner');
  await p.waitForTimeout(450);
  const dn = await p.evaluate(() => [...document.querySelectorAll('.modal-donner .pk')].map(b => b.dataset.id + (b.classList.contains('on') ? '*' : '')).sort().join(','));
  ok(await dessus(p) === 'Donner' && dn === 'adv*,az*,ki*,th*', `⑤ « Réseau › Donner » part de toutes les pistes, cochées — ${dn}`);
  await fermer(p);

  /* ⑥ Mes amis */
  await allerA(p, '#/reseau');
  await p.click('#bxAmis');
  await p.waitForTimeout(350);
  const amis = () => p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .am-row h3')].map(h => h.textContent.trim()).join(', '));
  const tous = await amis();
  await p.fill('#amQ', 'Thales');
  await p.waitForTimeout(250);
  const th = await amis();
  await p.fill('#amQ', 'cyber Lille');
  await p.waitForTimeout(250);
  const dem = await p.evaluate(() => document.querySelector('.overlay:not(.ov-out) #avDemander')?.textContent.trim());
  ok(await dessus(p) === 'Amis' && tous === 'Karim Benali, Léa Martin' && th === 'Karim Benali' && dem === 'Demander à mes amis',
    `⑥ « Mes amis » : ${tous} ; « Thales » → ${th} ; « cyber Lille » → ${dem}`);
  await p.fill('#amQ', '');
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${SHOTS}/161-reseau-amis.png` });
  await fermer(p);

  await ctx.close();
}

/* ---------- ⑧ au poste ---------- */
{
  const { ctx, p } = await ecran('poste', { vp: { width: 1280, height: 800 }, hash: '#/reseau' });
  const a = await ici(p);
  const r = await reseauLu(p);
  /* le MOT du bouton : la touche N (lot R8) vit à côté, dans son <kbd>,
     muette pour le lecteur d'écran */
  const top = await p.evaluate(() => [...(document.querySelector('#btnAddTop')?.childNodes || [])]
    .filter(n => !n.classList?.contains('kbd-btn')).map(n => n.textContent).join('').trim());
  /* au poste, les deux verbes se posent à droite du titre */
  const tete = await p.evaluate(() => [...document.querySelectorAll('#view-reseau .td-head .btn')].map(b => b.textContent.trim()).join(' · '));
  ok(a.vue === 'reseau' && a.h1 === 'Réseau' && r.ordre.join(',') === 'rzDemandes,boite' && tete === 'Donner · Recevoir' && top === 'Nouvelle piste'
    && await barre(p) === 'Aujourd’hui→#/aujourdhui | Mes pistes→#/pistes | Réseau→#/reseau | Moi→#/moi',
    `⑧ poste : Réseau, mes demandes en tête, Donner · Recevoir à droite du titre, « Nouvelle piste » en haut — ${tete} — ${await barre(p)}`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-poste.png` });
  await p.click('#btnAddTop');
  await p.waitForTimeout(350);
  ok(await dessus(p) === 'Nouvelle piste', '⑧ poste : « Nouvelle piste » ouvre la capture');
  await ctx.close();
}

/* ---------- ⑨ la fiche commence par les gens ---------- */
const ouvrirFiche = async (p, id) => {
  await p.evaluate(async i => { const { S } = await import('./ui/state.js');
    (await import('./ui/fiche.js')).openFiche(S.companies.find(c => c.id === i)); }, id);
  await p.waitForSelector('.modal-fiche .fi-contacts');
  await p.waitForTimeout(300);
};
/* l'ordre des blocs de la fiche, tels qu'on les lit de haut en bas (au
   pouce) ou colonne par colonne (au poste) */
const ordreFiche = p => p.evaluate(() => {
  const b = document.querySelector('.modal-fiche .modal-b');
  const blocs = [...b.querySelectorAll('.fi-contacts, .seg3-statut, #fiNotes, #fiKnow')];
  const r = e => e.getBoundingClientRect();
  return {
    ordre: blocs.map(e => e.matches('.fi-contacts') ? 'gens' : e.matches('.seg3-statut') ? 'statut' : e.id === 'fiNotes' ? 'notes' : 'savoir'),
    gauche: blocs.map(e => Math.round(r(e).left)),
    haut: blocs.map(e => Math.round(r(e).top)),
    donner: !!b.querySelector('#fiDonner')
  };
});
const lisible = o => o.ordre.map((x, i) => `${x}@${o.gauche[i]},${o.haut[i]}`).join(' ');
for (const [nom, vp] of [['pouce', { width: 390, height: 844 }], ['poste', { width: 1280, height: 800 }]]){
  const { ctx, p } = await ecran('fiche-' + nom, { vp });
  await ouvrirFiche(p, 'adv');
  const o = await ordreFiche(p);
  const i = k => o.ordre.indexOf(k);
  if (vp.width < 901)
    ok(o.haut[i('gens')] < o.haut[i('statut')] && o.haut[i('statut')] < o.haut[i('notes')] && o.donner,
      `⑨ ${nom} : les contacts avant « Où j'en suis », et « Donner » sur la fiche — ${lisible(o)}`);
  else
    ok(o.gauche[i('gens')] < o.gauche[i('statut')] && o.donner,
      `⑨ ${nom} : les gens en colonne de gauche, le suivi à droite — ${lisible(o)}`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-fiche-${nom}.png` });
  await p.click('#fiDonner');
  await p.waitForTimeout(450);
  const dn = await p.evaluate(() => [...document.querySelectorAll('.modal-donner .pk')].map(b => b.dataset.id + (b.classList.contains('on') ? '*' : '')).join(','));
  ok(await dessus(p) === 'Donner' && dn === 'adv*', `⑨ ${nom} : « Donner » depuis la fiche ne montre que cette piste — ${dn}`);
  await ctx.close();
}

/* ---------- ⑩ quelqu'un rencontré, depuis le + ---------- */
{
  const { ctx, p } = await ecran('contact');
  await p.click('#bnAdd');
  await p.waitForTimeout(400);
  const avant = await p.evaluate(async () => (await import('./ui/state.js')).S.orphans.length);
  await p.fill('#cpCtName', 'Sarah Lemoine');
  await p.fill('#cpCtCoord', 'sarah@forum.test');
  await p.click('.overlay:not(.ov-out) .modal-f .btn-primary');
  await p.waitForTimeout(350);
  const apres = await p.evaluate(async () => (await import('./ui/state.js')).S.orphans.map(o => o.name));
  ok(await dessus(p) === 'Nouvelle piste' && apres.length === avant + 1 && apres.includes('Sarah Lemoine')
    && await p.evaluate(() => document.activeElement?.id) === 'cpName',
    `⑩ sans entreprise, la personne part dans le bac, et la suivante se tape aussitôt — ${apres.join(', ')}`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-contact.png` });
  await ctx.close();
}

/* ---------- ⑪ au poste, la barre latérale ---------- */
const coque = p => p.evaluate(() => {
  const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), l: Math.round(b.width), h: Math.round(b.height) }; };
  const liens = [...document.querySelectorAll('.topnav a[data-r]')].map(a => {
    const b = a.getBoundingClientRect(), i = a.querySelector('.ic');
    return { x: Math.round(b.left), y: Math.round(b.top), h: Math.round(b.height), icone: !!i && getComputedStyle(i).display !== 'none' };
  });
  return { laterale: document.querySelector('.app').classList.contains('nav-laterale'),
           hdr: r('.hdr'), main: r('.main'), ajouter: r('#btnAddTop'), liens };
});
const lateraleOk = c => c.laterale && c.hdr.x === 0 && c.hdr.l >= 180 && c.hdr.l <= 280
  && c.main.x >= c.hdr.l && c.hdr.h >= c.main.h - 1
  && c.liens.every((a, i) => a.x === c.liens[0].x && a.icone && a.h >= 32 && (!i || a.y > c.liens[i - 1].y))
  && c.ajouter.y < c.liens[0].y;
const enRang = c => c.liens.map(a => a.x + ',' + a.y).join(' ');
for (const [nom, vp, sombre] of [['poste', { width: 1280, height: 800 }, false], ['poste-sombre', { width: 1280, height: 800 }, true],
                                  ['poste-1024', { width: 1024, height: 700 }, false]]){
  const { ctx, p } = await ecran('lat-' + nom, { vp, sombre, hash: '#/pistes' });
  const c = await coque(p);
  ok(lateraleOk(c), `⑪ ${nom} : la barre latérale — en-tête ${c.hdr.l}×${c.hdr.h} à gauche, écran à ${c.main.x}, « Nouvelle piste » au-dessus, liens ${enRang(c)}`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-laterale-${nom}.png` });
  await ctx.close();
}

/* ---------- ⑫ au poste, la fiche à droite de la liste ---------- */
const volet = p => p.evaluate(() => ({
  split: !!document.querySelector('#view-pistes .pi-split'),
  sel: [...document.querySelectorAll('.pi-split .row-item.pi-sel')].map(r => r.dataset.id).join(','),
  fiche: document.querySelector('#piVolet .obj-n')?.textContent.trim() || '',
  foc: document.activeElement?.closest('.row-item')?.dataset.id || document.activeElement?.id || '',
  /* le pied du volet touche le bas du volet : « Écrire » toujours visible */
  pied: (() => { const v = document.querySelector('#piVolet'), f = v?.querySelector('.modal-f');
    return v && f ? Math.round(v.getBoundingClientRect().bottom - f.getBoundingClientRect().bottom) : -1; })()
}));
{
  const { ctx, p } = await ecran('liste-detail', { vp: { width: 1280, height: 800 }, hash: '#/pistes' });
  const a = await volet(p);
  ok(a.split && a.sel && a.fiche && a.pied >= 0 && a.pied <= 2,
    `⑫ « Liste » : la fiche posée à droite, la première piste d'office, le pied en bas du volet — ${JSON.stringify(a)}`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-liste-detail.png` });
  await p.click('.pi-split .row-item[data-id="adv"] .ri-main');
  await p.waitForTimeout(300);
  const b = await volet(p);
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(300);
  const c = await volet(p);
  ok(b.sel === 'adv' && b.fiche === 'Advens' && c.sel !== 'adv' && c.sel === c.foc && c.fiche !== 'Advens',
    `⑫ un clic choisit, ↓ suit le clavier — ${b.fiche} puis ${c.fiche}`);
  await p.fill('#piVolet #fiNotes', 'note en cours');
  await p.waitForTimeout(150);
  await p.click('.pi-split .row-item[data-id="adv"] .ri-main');
  await p.waitForTimeout(400);
  const garde = await dessus(p);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  const d = await volet(p);
  ok(garde === 'Quitter sans enregistrer ?' && d.fiche === c.fiche && await p.evaluate(() => document.querySelector('#piVolet #fiNotes')?.value) === 'note en cours',
    `⑫ un changement en cours : la liste demande, « Annuler » garde la fiche et le texte — ${garde}`);
  await p.focus('#piVolet #fiNotes');
  await p.evaluate(() => { const t = document.querySelector('#piVolet #fiNotes'); t.setSelectionRange(2, 6); });
  await p.evaluate(async () => (await import('./ui/state.js')).bus.refresh());
  await p.waitForTimeout(300);
  const e = await p.evaluate(() => { const t = document.activeElement; return [t?.id, t?.value, t?.selectionStart, t?.selectionEnd]; });
  ok(e.join('|') === 'fiNotes|note en cours|2|6', `⑫ un rendu pendant qu'on écrit : le curseur, le texte et la sélection restent — ${e.join('|')}`);
  /* une fiche demandée d'ailleurs pendant qu'on est ici : dans le volet,
     jamais une seconde fiche par-dessus (deux `#fiNotes`) — et le
     garde-fou de celle qui attend un « Enregistrer » joue d'abord */
  await p.evaluate(async () => { const { S } = await import('./ui/state.js');
    (await import('./ui/fiche.js')).openFiche(S.companies.find(c => c.id === 'ki')); });
  await p.waitForTimeout(400);
  const gardeK = await dessus(p);
  await p.click('.overlay:not(.ov-out) .modal-f .btn-danger');
  await p.waitForTimeout(450);
  const k = await volet(p);
  const nNotes = await p.evaluate(() => document.querySelectorAll('#fiNotes').length);
  ok(gardeK === 'Quitter sans enregistrer ?' && k.fiche === 'Kiabi' && k.sel === 'ki' && nNotes === 1 && !(await dessus(p)),
    `⑫ une fiche demandée d'ailleurs se pose dans le volet, après le garde-fou — ${JSON.stringify(k)}, ${nNotes} #fiNotes`);
  /* ailleurs, le volet se vide ; au retour, la même piste revient */
  await allerA(p, '#/aujourdhui');
  const ailleurs = await p.evaluate(() => document.querySelectorAll('#fiNotes').length);
  await allerA(p, '#/pistes');
  const retour = await volet(p);
  ok(ailleurs === 0 && retour.fiche === 'Kiabi', `⑫ hors de « Mes pistes », plus de fiche cachée ; au retour, Kiabi revient — ${ailleurs} / ${retour.fiche}`);
  await p.fill('#piVolet #fiNotes', 'encore une note');
  await p.click('[data-vue="tableau"]');
  await p.waitForTimeout(400);
  const quitter = await dessus(p);
  await p.click('.overlay:not(.ov-out) .modal-f .btn-danger');
  await p.waitForTimeout(450);
  const f = await p.evaluate(() => ({ board: !!document.querySelector('#view-pistes .board'), split: !!document.querySelector('.pi-split') }));
  await p.click('#view-pistes .bcard .bc-main');
  await p.waitForTimeout(400);
  ok(quitter === 'Quitter sans enregistrer ?' && f.board && !f.split && await dessus(p) === 'Fiche',
    `⑫ « Tableau » : on demande d'abord, puis les colonnes, la fiche en fenêtre — ${JSON.stringify(f)}`);
  await ctx.close();
}

/* ---------- les mutations : le scénario sait encore échouer ---------- */
{
  const dst = await readFile(path.join(ROOT, 'engine', 'destinations.js'), 'utf8');
  const oubli = dst.replace("alias: { echanger: 'reseau' }", 'alias: {}');
  ok(oubli !== dst, 'mutation ① l’ancienne adresse oubliée : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-adresse', { mutations: { 'engine/destinations.js': oubli }, hash: '#/echanger' });
  const a = await ici(p);
  ok(!(a.vue === 'reseau' && a.hash === '#/reseau'), `mutation ① : la garde de l'adresse rougit — ${JSON.stringify(a)}`);
  await ctx.close();
}
{
  const ech = await readFile(path.join(ROOT, 'ui', 'echanger.js'), 'utf8');
  const fige = ech.replace('const colonne = `${demandesHTML()}${b.html}', 'const colonne = `${b.html}');
  ok(fige !== ech, 'mutation ② l’écran sans ses demandes : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-ecran', { mutations: { 'ui/echanger.js': fige }, hash: '#/reseau' });
  const r = await reseauLu(p);
  ok(!(r.ordre.join(',') === 'rzDemandes,boite' && r.verbes === 'Donner · Recevoir'), `mutation ② : la garde de l'écran rougit — ${JSON.stringify(r)}`);
  await ctx.close();
}
{
  /* le partage reparti ailleurs : les deux verbes quittent le pied */
  const ech = await readFile(path.join(ROOT, 'ui', 'echanger.js'), 'utf8');
  const sans = ech.replace('<div class="rz-pied">${verbes}</div>', '');
  ok(sans !== ech, 'mutation ②b le partage qui quitte « Réseau » : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-verbes', { mutations: { 'ui/echanger.js': sans }, hash: '#/reseau' });
  const r = await reseauLu(p);
  ok(!(r.verbes === 'Donner · Recevoir' && r.basVerbes >= 75), `mutation ②b : la garde des verbes rougit — ${JSON.stringify(r)}`);
  await ctx.close();
}

{
  const fiche = await readFile(path.join(ROOT, 'ui', 'fiche.js'), 'utf8');
  const fige = fiche.replace('${vecuHTML}${gens}${travail}${savoir}`', '${vecuHTML}${travail}${gens}${savoir}`');
  ok(fige !== fiche, 'mutation ③ la fiche qui garde son ordre : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-fiche', { mutations: { 'ui/fiche.js': fige } });
  await ouvrirFiche(p, 'adv');
  const o = await ordreFiche(p);
  ok(!(o.haut[o.ordre.indexOf('gens')] < o.haut[o.ordre.indexOf('statut')] && o.donner), `mutation ③ : la garde de la fiche rougit — ${lisible(o)}`);
  await ctx.close();
}

{
  const css = await readFile(path.join(ROOT, 'styles', 'app.css'), 'utf8');
  const rang = css.split('.nav-laterale').join('.nav-oubliee');
  ok(rang !== css, 'mutation ④ l’en-tête qui reste une rangée : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-laterale', { mutations: { 'styles/app.css': rang }, vp: { width: 1280, height: 800 } });
  const c = await coque(p);
  ok(!lateraleOk(c), `mutation ④ : la garde de la barre latérale rougit — ${enRang(c)}`);
  await ctx.close();
}

{
  const pi = await readFile(path.join(ROOT, 'ui', 'pistes.js'), 'utf8');
  const sans = pi.replace("const listeDetail = () => mqWide.matches && vuePoste === 'liste';", 'const listeDetail = () => false;');
  ok(sans !== pi, 'mutation ⑤ la fiche qui ne se pose pas : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-liste', { mutations: { 'ui/pistes.js': sans }, vp: { width: 1280, height: 800 }, hash: '#/pistes' });
  const a = await volet(p);
  ok(!(a.split && a.fiche), `mutation ⑤ : la garde de la liste-détail rougit — ${JSON.stringify(a)}`);
  await ctx.close();
}

/* les mutations jettent des erreurs qui ne sont pas les nôtres */
const vraies = errors.filter(e => !e.startsWith('mutation'));
ok(!vraies.length, 'Zéro erreur console' + (vraies.length ? ' — ' + vraies.slice(0, 3).join(' | ') : ''));
await browser.close();
server.close();
console.log(ko ? `\nE2E réseau : ${ko} ÉCHEC(S)` : '\nE2E réseau : OK');
process.exit(ko ? 1 : 0);
