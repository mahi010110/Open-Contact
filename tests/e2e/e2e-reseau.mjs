/* ============================================================
   OpenContact — e2e : L'ONGLET RÉSEAU, en préversion (lot R1-a,
   docs/recadrage.md, décision 0002)

   Un onglet, une question — et pendant la préversion, les DEUX chemins
   se jouent (décision 0004) :
   ① éteinte, rien ne bouge : « Échanger » et ses deux verbes, le + qui
     ouvre une piste, « Amis » dans Pistes, « Prospecter » ;
     `#/reseau` (une adresse donnée depuis un appareil en préversion)
     mène à « Échanger » ;
   ② allumée, la barre dit Aujourd'hui · Pistes · Réseau · Moi, et
     `#/echanger` mène à « Réseau » (l'adresse se réécrit) ;
   ③ « Réseau » répond à « qui peut m'aider ? » : mes demandes en tête
     (la carte, et le contact donné juste dessous), puis les
     conversations, puis « Mes amis » — ni Donner ni Recevoir ;
   ④ le + fait tout entrer : « Ajouter », QR · Fichier · Texte sous
     « Recevoir », et « Une piste » au pied, qui ouvre la capture ;
   ⑤ Pistes ne porte plus que des entreprises : pas de portée « Amis »,
     et « Choisir » mène à « Donner » avec les pistes cochées, et
     elles seules ;
   ⑥ « Mes amis » cherche comme la barre : « Thales » trouve Karim,
     « cyber Lille » propose de demander ;
   ⑦ éteinte depuis Réglages pendant qu'on regarde « Réseau » : on
     revient à « Échanger », sur place ;
   ⑧ au poste aussi ;
   ⑨ (R1-b) la fiche commence par les gens — les contacts avant « Où
     j'en suis », au pouce, et en colonne de gauche au poste — et
     « Donner » part de la fiche avec cette seule piste ; éteinte, la
     fiche d'avant ;
   ⑩ (R1-b) « Un contact », depuis le + : la personne d'abord,
     l'entreprise ensuite ; sans entreprise, elle part dans le bac
     « à rattacher » ;
   ⑪ (R1-c, décision 0003) au poste, la barre latérale : l'en-tête
     devient une colonne à gauche — le logo, « Ajouter », puis les quatre
     destinations empilées, icône et mot — à côté de l'écran, de haut en
     bas ; éteinte, la rangée d'avant.
   Zéro erreur console. Quatre mutations à l'appui : la barre qui ne
   suit pas le lot, l'écran qui ne se recadre pas, la fiche qui garde
   son ordre, l'en-tête qui reste une rangée.
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
const pistes = [{ id: 'az', name: 'Aztek', city: 'Roubaix', status: 'todo' },
                { id: 'adv', name: 'Advens', city: 'Lille', status: 'active',
                  contacts: [{ id: 'c1', name: 'Nadia Rahmani', email: 'nadia@advens.test' }] },
                { id: 'th', name: 'Thales', city: 'Lille', status: 'todo' },
                { id: 'ki', name: 'Kiabi', city: 'Hem', status: 'todo' }];
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
async function ecran(nom, { vp = { width: 390, height: 844 }, sombre = false, hash = '#/aujourdhui', preversion = true, mutations = {} } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, colorScheme: sombre ? 'dark' : 'light' });
  await relaisMuets(ctx); await annuaireMuet(ctx);
  for (const [f, body] of Object.entries(mutations))
    await ctx.route('**/' + f, r => r.fulfill({ contentType: 'text/javascript', body }));
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/aujourdhui');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  /* semer APRÈS le démarrage, puis recharger : l'app lit son état à
     l'ouverture (§5) */
  await p.evaluate(async ([pr, ps, rs, pv]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RESEAU_KEY, JSON.stringify(rs));
    if (pv) await st.kvSet(st.PREVERSION_KEY, '1'); else await st.kvDel(st.PREVERSION_KEY);
  }, [profil, pistes, reseau, preversion]);
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
    demandes: v ? [...v.querySelectorAll('#rzDemandes .dmc-t')].map(t => t.firstChild.textContent.trim()) : [],
    don: v?.querySelector('#rzDemandes [data-don] b')?.textContent.trim() || '',
    /* l'ordre de la colonne : la tranche des demandes, puis la boîte */
    ordre: v ? [...v.querySelectorAll('#rzDemandes, .bx-liste')].map(e => e.id || 'boite') : [],
    amis: v?.querySelector('#bxAmis')?.innerText.replace(/\s+/g, ' ').trim() || '',
    verbes: v ? [...v.querySelectorAll('#ecGive, #ecRecv')].length : -1,
    echangerVide: !document.querySelector('#view-echanger')?.children.length
  };
});

/* ---------- ① éteinte : rien ne bouge ---------- */
{
  const { ctx, p } = await ecran('eteinte', { preversion: false, hash: '#/reseau' });
  const a = await ici(p);
  ok(a.vue === 'echanger' && a.hash === '#/echanger' && a.h1 === 'Échanger',
    `① éteinte : « #/reseau » mène à « Échanger », l'adresse se réécrit — ${JSON.stringify(a)}`);
  ok(await barre(p) === 'Aujourd’hui→#/aujourdhui | Pistes→#/pistes | Échanger→#/echanger | Moi→#/moi',
    `① éteinte : la barre d'avant — ${await barre(p)}`);
  ok(await p.evaluate(() => !!document.querySelector('#view-echanger #ecGive') && !!document.querySelector('#view-echanger #ecRecv')
    && !document.querySelector('#bxAmis') && !document.querySelector('#rzDemandes')),
    '① éteinte : Donner et Recevoir sous le pouce, ni « Mes amis » ni « Mes demandes »');
  await p.click('#bnAdd');
  await p.waitForTimeout(350);
  ok(await dessus(p) === 'Nouvelle piste', `① éteinte : le + ouvre la piste, directement — ${await dessus(p)}`);
  await fermer(p);
  await allerA(p, '#/pistes');
  ok(await p.evaluate(() => [...document.querySelectorAll('#piPortee [data-portee]')].map(b => b.dataset.portee).join(',')) === 'pistes,decouvrir,amis'
    && await p.evaluate(() => document.querySelector('#piProspect')?.textContent.trim()) === 'Prospecter',
    '① éteinte : « Amis » reste une portée de Pistes, et « Prospecter » garde son nom');
  await ctx.close();
}

/* ---------- ②-⑦ allumée, au pouce (clair, puis sombre) ---------- */
for (const sombre of [false, true]){
  const nom = sombre ? 'pouce-sombre' : 'pouce';
  const { ctx, p } = await ecran(nom, { sombre, hash: '#/echanger' });
  const a = await ici(p);
  ok(a.vue === 'reseau' && a.hash === '#/reseau' && a.titre === 'Réseau — OpenContact' && a.h1 === 'Réseau',
    `② ${nom} : « #/echanger » mène à « Réseau », l'adresse et le titre suivent — ${JSON.stringify(a)}`);
  ok(await barre(p) === 'Aujourd’hui→#/aujourdhui | Pistes→#/pistes | Réseau→#/reseau | Moi→#/moi'
    && await p.evaluate(() => document.querySelector('#bnAdd').getAttribute('aria-label')) === 'Ajouter',
    `② ${nom} : la barre dit Réseau, le + dit « Ajouter » — ${await barre(p)}`);
  const r = await reseauLu(p);
  ok(r.demandes.join(' / ') === 'Tu cherches quelqu’un chez Aztek pour une alternance / Tu cherches quelqu’un chez Thales pour une alternance'
    && r.don === 'Karim t’a donné Julie Marchand' && r.ordre.join(',') === 'rzDemandes,boite',
    `③ ${nom} : mes demandes en tête, la plus récente d'abord, le contact donné dessous — ${JSON.stringify(r)}`);
  ok(r.amis === 'Mes amis 2' && r.verbes === 0 && r.echangerVide,
    `③ ${nom} : « Mes amis » dans la liste, ni Donner ni Recevoir, et « Échanger » vidé — ${JSON.stringify(r)}`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-${nom}.png` });
  if (sombre){ await ctx.close(); continue; }

  /* ④ le + fait tout entrer */
  await p.click('#bnAdd');
  await p.waitForTimeout(350);
  const aj = await p.evaluate(() => {
    const o = [...document.querySelectorAll('.overlay:not(.ov-out)')].pop();
    return { rangs: [...o.querySelectorAll('[data-mode]')].map(b => b.textContent.trim()).join(' · '),
             sous: o.querySelector('.aj-recv .tr-h')?.textContent.trim(),
             pied: [...o.querySelectorAll('.modal-f button')].map(b => b.textContent.trim() + (b.classList.contains('btn-primary') ? '*' : '')).join(' · ') };
  });
  ok(await dessus(p) === 'Ajouter' && aj.sous === 'Recevoir' && aj.rangs === 'QR · Fichier · Texte' && aj.pied === 'Un contact · Une piste*',
    `④ « Ajouter » : Recevoir (QR · Fichier · Texte), « Un contact » et « Une piste » au pied — ${JSON.stringify(aj)}`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-ajouter.png` });
  await p.click('[data-mode="texte"]');
  await p.waitForTimeout(350);
  ok(await dessus(p) === 'Coller' && await p.evaluate(() => document.activeElement?.id) === 'rcTxt',
    `④ « Texte » mène droit au champ où l'on colle — ${await dessus(p)}`);
  await fermer(p);
  await p.click('#bnAdd');
  await p.waitForTimeout(300);
  await p.click('#ajPiste');
  await p.waitForTimeout(350);
  ok(await dessus(p) === 'Nouvelle piste', `④ « Une piste » ouvre la capture — ${await dessus(p)}`);
  await fermer(p);

  /* ⑤ Pistes : des entreprises, et « Choisir » mène à « Donner » */
  await allerA(p, '#/pistes');
  ok(await p.evaluate(() => [...document.querySelectorAll('#piPortee [data-portee]')].map(b => b.dataset.portee).join(',')) === 'pistes,decouvrir'
    && await p.evaluate(() => document.querySelector('#piProspect')?.textContent.trim()) === 'Choisir',
    '⑤ Pistes : plus de portée « Amis », et « Choisir »');
  await p.click('#piProspect');
  await p.waitForTimeout(350);
  const pied0 = await p.evaluate(() => ({ donner: document.querySelector('#pkDonner')?.disabled, titre: null }));
  await p.click('.pk[data-id="az"]');
  await p.click('.pk[data-id="ki"]');
  await p.waitForTimeout(200);
  const pied1 = await p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .modal-f button')]
    .map(b => b.textContent.trim() + (b.disabled ? '(off)' : '')).join(' · '));
  ok(await dessus(p) === 'Choisir' && pied0.donner === true && pied1 === 'Donner · Écrire(off)',
    `⑤ « Choisir » : Donner s'allume dès qu'une piste est cochée — ${pied1}`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-choisir.png` });
  await p.click('#pkDonner');
  await p.waitForTimeout(450);
  const dn = await p.evaluate(() => [...document.querySelectorAll('.modal-donner .pk')].map(b => b.dataset.id + (b.classList.contains('on') ? '*' : '')).sort().join(','));
  ok(await dessus(p) === 'Donner' && dn === 'az*,ki*', `⑤ « Donner » ne montre que les pistes choisies, cochées — ${dn}`);
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

  /* ⑦ éteinte d'un geste, pendant qu'on regarde Réseau */
  await p.evaluate(async () => (await import('./ui/state.js')).choisirPreversion(false));
  await p.waitForTimeout(450);
  const b = await ici(p);
  ok(b.vue === 'echanger' && b.hash === '#/echanger' && b.h1 === 'Échanger'
    && await p.evaluate(() => !document.querySelector('#view-reseau')?.children.length && !!document.querySelector('#ecGive')),
    `⑦ éteinte sur place : on revient à « Échanger », Réseau vidé — ${JSON.stringify(b)}`);
  await ctx.close();
}

/* ---------- ⑧ au poste ---------- */
{
  const { ctx, p } = await ecran('poste', { vp: { width: 1280, height: 800 }, hash: '#/reseau' });
  const a = await ici(p);
  const r = await reseauLu(p);
  const top = await p.evaluate(() => document.querySelector('#btnAddTop')?.textContent.trim());
  ok(a.vue === 'reseau' && a.h1 === 'Réseau' && r.ordre.join(',') === 'rzDemandes,boite' && r.verbes === 0 && top === 'Ajouter'
    && await barre(p) === 'Aujourd’hui→#/aujourdhui | Mes pistes→#/pistes | Réseau→#/reseau | Moi→#/moi',
    `⑧ poste : Réseau, mes demandes en tête, « Ajouter » en haut — ${await barre(p)}`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-poste.png` });
  await p.click('#btnAddTop');
  await p.waitForTimeout(350);
  ok(await dessus(p) === 'Ajouter', '⑧ poste : « Ajouter » ouvre la même feuille');
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
for (const [nom, vp, pv] of [['pouce', { width: 390, height: 844 }, true], ['poste', { width: 1280, height: 800 }, true], ['éteinte', { width: 390, height: 844 }, false]]){
  const { ctx, p } = await ecran('fiche-' + nom, { vp, preversion: pv });
  await ouvrirFiche(p, 'adv');
  const o = await ordreFiche(p);
  const i = k => o.ordre.indexOf(k);
  if (!pv)
    ok(o.haut[i('statut')] < o.haut[i('gens')] && !o.donner, `⑨ éteinte : la fiche d'avant, le suivi d'abord, pas de « Donner » — ${lisible(o)}`);
  else if (vp.width < 901)
    ok(o.haut[i('gens')] < o.haut[i('statut')] && o.haut[i('statut')] < o.haut[i('notes')] && o.donner,
      `⑨ ${nom} : les contacts avant « Où j'en suis », et « Donner » sur la fiche — ${lisible(o)}`);
  else
    ok(o.gauche[i('gens')] < o.gauche[i('statut')] && o.donner,
      `⑨ ${nom} : les gens en colonne de gauche, le suivi à droite — ${lisible(o)}`);
  if (pv){
    await p.screenshot({ path: `${SHOTS}/161-reseau-fiche-${nom}.png` });
    await p.click('#fiDonner');
    await p.waitForTimeout(450);
    const dn = await p.evaluate(() => [...document.querySelectorAll('.modal-donner .pk')].map(b => b.dataset.id + (b.classList.contains('on') ? '*' : '')).join(','));
    ok(await dessus(p) === 'Donner' && dn === 'adv*', `⑨ ${nom} : « Donner » depuis la fiche ne montre que cette piste — ${dn}`);
  }
  await ctx.close();
}

/* ---------- ⑩ « Un contact », depuis le + ---------- */
{
  const { ctx, p } = await ecran('contact');
  await p.click('#bnAdd');
  await p.waitForTimeout(300);
  await p.click('#ajContact');
  await p.waitForTimeout(400);
  const f = await p.evaluate(() => {
    const o = [...document.querySelectorAll('.overlay:not(.ov-out)')].pop();
    return { champs: [...o.querySelectorAll('input')].map(i => i.id).join(','),
             libelles: [...o.querySelectorAll('.field > label')].map(l => l.textContent.trim()).join(' · '),
             focus: document.activeElement?.id };
  });
  ok(await dessus(p) === 'Nouveau contact' && f.champs === 'cpCtName,cpCtCoord,cpName' && f.libelles === 'Son nom · Son entreprise' && f.focus === 'cpCtName',
    `⑩ « Un contact » : la personne d'abord, l'entreprise ensuite — ${JSON.stringify(f)}`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-contact.png` });
  const avant = await p.evaluate(async () => (await import('./ui/state.js')).S.orphans.length);
  await p.fill('#cpCtName', 'Sarah Lemoine');
  await p.fill('#cpCtCoord', 'sarah@forum.test');
  await p.click('.overlay:not(.ov-out) .modal-f .btn-primary');
  await p.waitForTimeout(350);
  const apres = await p.evaluate(async () => (await import('./ui/state.js')).S.orphans.map(o => o.name));
  ok(apres.length === avant + 1 && apres.includes('Sarah Lemoine') && await p.evaluate(() => document.activeElement?.id) === 'cpCtName',
    `⑩ sans entreprise, la personne part dans le bac, et la suivante se tape aussitôt — ${apres.join(', ')}`);
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
for (const [nom, vp, pv, sombre] of [['poste', { width: 1280, height: 800 }, true, false], ['poste-sombre', { width: 1280, height: 800 }, true, true],
                                      ['poste-1024', { width: 1024, height: 700 }, true, false], ['poste-éteinte', { width: 1280, height: 800 }, false, false]]){
  const { ctx, p } = await ecran('lat-' + nom, { vp, preversion: pv, sombre, hash: '#/pistes' });
  const c = await coque(p);
  if (pv) ok(lateraleOk(c), `⑪ ${nom} : la barre latérale — en-tête ${c.hdr.l}×${c.hdr.h} à gauche, écran à ${c.main.x}, « Ajouter » au-dessus, liens ${enRang(c)}`);
  else ok(!c.laterale && c.hdr.h <= 60 && c.liens.every(a => a.y === c.liens[0].y && !a.icone),
    `⑪ ${nom} : la rangée d'avant, en haut, sans icônes — ${enRang(c)}`);
  if (pv) await p.screenshot({ path: `${SHOTS}/161-reseau-laterale-${nom}.png` });
  await ctx.close();
}

/* ---------- les mutations : le scénario sait encore échouer ---------- */
{
  const app = await readFile(path.join(ROOT, 'app.js'), 'utf8');
  const muet = app.replace('function appliquerNav(){', 'function appliquerNav(){ return;');
  ok(muet !== app, 'mutation ① la barre qui ne suit pas le lot : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-barre', { mutations: { 'app.js': muet }, hash: '#/reseau' });
  ok(await barre(p) !== 'Aujourd’hui→#/aujourdhui | Pistes→#/pistes | Réseau→#/reseau | Moi→#/moi',
    `mutation ① : la garde de la barre rougit — ${await barre(p)}`);
  await ctx.close();
}
{
  const ech = await readFile(path.join(ROOT, 'ui', 'echanger.js'), 'utf8');
  const fige = ech.replace("const R = lot('reseau');", 'const R = false;');
  ok(fige !== ech, 'mutation ② l’écran qui ne se recadre pas : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-ecran', { mutations: { 'ui/echanger.js': fige }, hash: '#/reseau' });
  const r = await reseauLu(p);
  ok(!(r.ordre.join(',') === 'rzDemandes,boite' && r.verbes === 0), `mutation ② : la garde de l'écran rougit — ${JSON.stringify(r)}`);
  await ctx.close();
}

{
  const fiche = await readFile(path.join(ROOT, 'ui', 'fiche.js'), 'utf8');
  const fige = fiche.replace("const R = lot('reseau');", 'const R = false;');
  ok(fige !== fiche, 'mutation ③ la fiche qui garde son ordre : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-fiche', { mutations: { 'ui/fiche.js': fige } });
  await ouvrirFiche(p, 'adv');
  const o = await ordreFiche(p);
  ok(!(o.haut[o.ordre.indexOf('gens')] < o.haut[o.ordre.indexOf('statut')] && o.donner), `mutation ③ : la garde de la fiche rougit — ${lisible(o)}`);
  await ctx.close();
}

{
  const app = await readFile(path.join(ROOT, 'app.js'), 'utf8');
  const rang = app.replace("$('.app').classList.toggle('nav-laterale', lot('reseau'));", '');
  ok(rang !== app, 'mutation ④ l’en-tête qui reste une rangée : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-laterale', { mutations: { 'app.js': rang }, vp: { width: 1280, height: 800 } });
  const c = await coque(p);
  ok(!lateraleOk(c), `mutation ④ : la garde de la barre latérale rougit — ${enRang(c)}`);
  await ctx.close();
}

/* les mutations jettent des erreurs qui ne sont pas les nôtres */
const vraies = errors.filter(e => !e.startsWith('mutation'));
ok(!vraies.length, 'Zéro erreur console' + (vraies.length ? ' — ' + vraies.slice(0, 3).join(' | ') : ''));
await browser.close();
server.close();
console.log(ko ? `\nE2E réseau : ${ko} ÉCHEC(S)` : '\nE2E réseau : OK');
process.exit(ko ? 1 : 0);
