/* ============================================================
   OpenContact — outil d'audit : TOUTES LES CAPTURES DU TÉLÉPHONE

   Demande du mainteneur, 6 octobre 2026 : « fais un immense audit UX sur
   smartphone, j'ai vu des immondices graphiques ». §9 : une retouche se
   termine par une capture qu'on REGARDE — ici, on regarde tout, avec des
   données qui ressemblent à la vie (douze pistes, des noms longs, des
   relances en retard, des échanges, un profil rempli).

   Ce n'est PAS un garde : il ne rougit jamais. Il produit des images.

   · OC_NAVIGATEUR=webkit : le moteur de l'iPhone (CLAUDE.md §9 — c'est
     celui de l'utilisateur, et l'environnement de développement n'a que
     Chromium). Playwright l'installe sur un runner de CI.
   · OC_AUDIT=complet : toutes les largeurs et tailles de texte ; sinon
     un jeu réduit (390 clair et sombre, 320 à 200 %).
   · OC_AUDIT_JOURNAL=1 : chaque capture part AUSSI dans le journal, en
     JPEG base64 par tranches (« CAPTURE <nom> <i>/<n> <données> ») — les
     artefacts de la CI ne se téléchargent pas d'ici, ses journaux si.

   Usage : node tests/e2e/audit-captures.mjs
   ============================================================ */
import path from 'path';
import { mkdir } from 'fs/promises';
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet } from './outils.mjs';

const WEBKIT = process.env.OC_NAVIGATEUR === 'webkit';
const COMPLET = process.env.OC_AUDIT === 'complet';
const JOURNAL = process.env.OC_AUDIT_JOURNAL === '1';
const SEUL = process.env.OC_AUDIT_SEUL ? new RegExp(process.env.OC_AUDIT_SEUL) : null;
const DOSSIER = path.join(SHOTS, 'audit', WEBKIT ? 'webkit' : 'chromium');
await mkdir(DOSSIER, { recursive: true });

const { server, base } = await serveRepo();
const browser = WEBKIT
  ? await (await import(process.env.OC_PLAYWRIGHT || 'playwright')).webkit.launch()
  : await chromium.launch({ executablePath: chromiumPath() });
console.log('MOTEUR', WEBKIT ? 'WebKit ' + browser.version() : 'Chromium ' + browser.version());

/* ---------- des données qui ressemblent à la vie ---------- */
const J = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const P = (id, o) => ({ id, updatedAt: Date.now() - Math.floor(Math.random() * 9e8), contacts: [], positions: [], history: [], ...o });
const DATA = [
  P('a', { name: 'Orange Cyberdefense', city: 'Lille', domain: 'cyber', status: 'active', positions: ['alternance'],
    desc: 'SOC et réponse à incident pour de grands comptes', techs: 'SOC, EDR, Splunk, Fortinet',
    contacts: [{ id: 'c1', name: 'Nadia Rahmani', role: 'Chargée de recrutement', email: 'nadia.rahmani@exemple.fr', phone: '06 12 34 56 78' }],
    nextAction: J(-4), nextActionText: 'Relancer Nadia', history: [{ d: J(-12), t: 'Candidature envoyée' }], vecu: 'stage', vecuQui: 'Léa' }),
  P('b', { name: 'Société Générale Global Solution Centre — Direction des systèmes d’information', city: 'Villeneuve-d’Ascq', domain: 'dsi', status: 'todo',
    positions: ['alternance', 'stage'], contacts: [] }),
  P('c', { name: 'OVHcloud', city: 'Roubaix', domain: 'cloud', status: 'reply', positions: ['alternance'],
    contacts: [{ id: 'c2', name: 'Théo Vasseur', role: 'Team lead infra', email: 'theo.vasseur@exemple.fr' }],
    nextAction: J(2), nextActionText: 'Préparer l’entretien technique', notes: 'Entretien jeudi 14 h, apporter le portfolio' }),
  P('d', { name: 'Damart — DSI', city: 'Roubaix', domain: 'dsi', status: 'todo', siren: '326820065',
    contacts: [{ id: 'c3', name: 'Julien Leroy', role: 'DSI adjoint' }] }),
  P('e', { name: 'Advens', city: 'Lille', domain: 'cyber', status: 'active', siren: '812345678',
    contacts: [{ id: 'c4', name: 'Thomas Leroy', role: 'Président', email: 'tleroy@advens.exemple' }],
    history: [{ d: J(-30), t: 'Candidature envoyée' }] }),
  P('f', { name: 'Cegid', city: 'Lyon', domain: 'esn', status: 'todo', positions: ['stage'] }),
  P('g', { name: 'Worldline', city: 'Seclin', domain: 'esn', status: 'active', nextAction: J(0), nextActionText: 'Appeler le standard',
    contacts: [{ id: 'c5', name: 'Service RH', email: 'rh@worldline.exemple' }] }),
  P('h', { name: 'Métropole Européenne de Lille', city: 'Lille', domain: 'public', status: 'todo', vecu: 'connait', vecuQui: 'Hugo' }),
  P('i', { name: 'Kiabi', city: 'Hem', domain: 'commerce', status: 'active', history: [{ d: J(-60), t: 'Candidature envoyée' }] }),
  P('j', { name: 'Decathlon Digital', city: 'Villeneuve-d’Ascq', domain: 'dsi', status: 'todo', recuDe: 'Léa' }),
  P('k', { name: 'Capgemini', city: 'Lille', domain: 'esn', status: 'todo', closedReason: 'rejected', closedAt: J(-5) }),
  P('l', { name: 'Ankama', city: 'Roubaix', domain: 'startup', status: 'todo', closedReason: 'won', closedAt: J(-2) })
];
const PROFIL = { name: 'Inès Martin', formation: 'BTS SIO SISR 2e année', ecole: 'Lycée Gustave Eiffel', recherche: 'alternance',
  debut: J(30), fin: J(760), rythme: '3 jours en entreprise, 2 à l’école', ville: 'Lille', rayon: 15,
  email: 'ines.martin@exemple.fr', phone: '06 98 76 54 32' };
const ORPHELINS = [{ id: 'o1', name: '', email: 'recrutement@exemple.fr', extra: {} }];
const JOURNAL_ECH = [
  { t: Date.now() - 2 * 864e5, txt: 'Donné (QR) : 4 piste(s)' },
  { t: Date.now() - 9 * 864e5, txt: 'Reçu de Léa : +6 piste(s)' },
  { t: Date.now() - 20 * 864e5, txt: 'Donné (groupe) : 12 piste(s)' }
];

/* l'annuaire répond à sa forme relevée (sonde-utile.mjs) */
const ENT = (siren, nom, ville, cp, tr, naf, lat, lng, ici) => ({ siren, nom_complet: nom, nom_raison_sociale: nom, activite_principale: naf,
  tranche_effectif_salarie: tr, categorie_entreprise: 'PME', etat_administratif: 'A', nature_juridique: '5710', complements: { liste_idcc: ['1486'] },
  siege: { est_siege: true, code_postal: cp, libelle_commune: ville, latitude: String(lat), longitude: String(lng) },
  matching_etablissements: [{ est_siege: false, numero_voie: '3', type_voie: 'RUE', libelle_voie: 'DU PORT', code_postal: cp, libelle_commune: ville,
    latitude: String(lat), longitude: String(lng), caractere_employeur: 'O', tranche_effectif_salarie: ici || 'NN', activite_principale: naf }],
  dirigeants: [{ nom: 'DURAND', prenoms: 'CLAIRE', qualite: 'Présidente', type_dirigeant: 'personne physique' }] });
const ANNUAIRE = [ENT('811111111', 'RESEAUX ET SYSTEMES DU NORD', 'LILLE', '59000', '12', '62.03Z', 50.636, 3.06),
  ENT('822222222', 'FIDUCIAL INFORMATIQUE', 'VILLENEUVE-D\'ASCQ', '59650', '41', '62.02A', 50.62, 3.14, '03'),
  ENT('833333333', 'NORD INFOGERANCE ET CYBERSECURITE DES ENTREPRISES DE LA METROPOLE', 'LAMBERSART', '59130', '11', '62.09Z', 50.65, 3.02),
  ENT('844444444', 'DATAGORA', 'ROUBAIX', '59100', '21', '62.01Z', 50.69, 3.17)];

/* ---------- les écrans et les feuilles ---------- */
const route = h => p => p.evaluate(h => { location.hash = h; }, h);
const piste = (id, f) => p => p.evaluate(new Function(`return (async () => { const { S } = await import('./ui/state.js');
  const c = S.companies.find(x => x.id === '${id}'); ${f} })()`));
const ECRANS = [
  ['01-aujourdhui', route('#/aujourdhui')],
  ['02-pistes', route('#/pistes')],
  ['03-pistes-recherche', async p => { await route('#/pistes')(p); await p.fill('#piQ', 'alternance Lile'); await p.waitForTimeout(400); }],
  ['04-decouvrir', async p => { await route('#/pistes')(p); await p.fill('#piQ', 'alternance'); await p.click('#piPortee [data-portee="decouvrir"]');
    await p.waitForSelector('#piDec .dc-row', { timeout: 5000 }).catch(() => {}); await p.evaluate(() => document.activeElement.blur()); }],
  ['05-decouvrir-apercu', async p => { await ECRAN('04-decouvrir')(p); await p.click('#piDec .dc-row .dc-main').catch(() => {}); }],
  ['06-fiche', piste('a', `(await import('./ui/fiche.js')).openFiche(c);`)],
  ['07-fiche-bas', async p => { await piste('e', `(await import('./ui/fiche.js')).openFiche(c);`)(p); await p.waitForTimeout(500);
    await p.evaluate(() => { const b = document.querySelector('.overlay:last-of-type .modal-b'); if (b) b.scrollTop = b.scrollHeight; }); }],
  ['08-ecrire', piste('a', `(await import('./ui/mail.js')).openMail(c, {});`)],
  ['09-modifier', piste('b', `(await import('./ui/edit.js')).openEditPiste(c);`)],
  ['10-capture', p => p.evaluate(() => import('./ui/capture.js').then(m => m.openCapture()))],
  ['11-echanger', route('#/echanger')],
  ['12-donner', p => p.evaluate(() => import('./ui/donner.js').then(m => m.openDonner()))],
  ['13-recevoir', p => p.evaluate(() => import('./ui/recevoir.js').then(m => m.openRecevoir()))],
  ['14-moi', route('#/moi')],
  ['15-profil', p => p.evaluate(() => import('./ui/profil.js').then(m => m.openProfil()))],
  ['16-reglages', async p => { await route('#/moi')(p); await p.waitForTimeout(300); await p.click('#moiReglages').catch(() => {}); }],
  ['17-contact', piste('a', `(await import('./ui/contact.js')).openContactEditor({ company: c });`)],
  ['18-cloturer', piste('g', `(await import('./ui/actions.js')).askClose(c, {});`)],
  ['19-planifier', piste('f', `(await import('./ui/actions.js')).askNextAction(c, {});`)],
  ['20-affiner', async p => { await route('#/pistes')(p); await p.waitForTimeout(300); await p.click('#piAffiner').catch(() => {}); }],
  ['21-prospecter', p => p.evaluate(() => import('./ui/prospect.js').then(m => m.openProspect()))],
  ['22-modeles', p => p.evaluate(() => import('./ui/profil.js').then(m => m.openTemplates()))],
  ['23-annuler', async p => { await route('#/pistes')(p); await p.waitForTimeout(300);
    await p.evaluate(async () => { const { S, deletePiste } = await import('./ui/state.js'); const { showUndo } = await import('./ui/dom.js');
      const c = S.companies.find(x => x.id === 'i'); deletePiste(c); showUndo('« Kiabi » supprimée.', () => {}); }); }],
  ['24-rattacher', p => p.evaluate(async () => { const { S } = await import('./ui/state.js'); (await import('./ui/contact.js')).openAttach(S.orphans[0]); })],
  ['25-mes-appareils', p => p.evaluate(() => import('./ui/direct.js').then(m => m.openAppareils()))],
  ['26-verrouillage', p => p.evaluate(() => import('./ui/verrou.js').then(m => m.openProtectFlow()))]
];
const ECRAN = n => ECRANS.find(e => e[0] === n)[1];
const VIDES = [
  ['30-vide-aujourdhui', route('#/aujourdhui')],
  ['31-vide-pistes', route('#/pistes')],
  ['32-vide-echanger', route('#/echanger')],
  ['33-vide-moi', route('#/moi')]
];

/* ---------- les appareils ---------- */
const TELS = COMPLET
  ? [['390', 390, 844], ['360', 360, 640], ['320', 320, 568], ['430', 430, 932]]
  : [['390', 390, 844]];
const JEUX = [];
for (const [t, w, h] of TELS) for (const sombre of [false, true]) JEUX.push({ nom: `${t}${sombre ? '-sombre' : ''}`, w, h, sombre, texte: 16 });
JEUX.push({ nom: '320-200', w: 320, h: 568, sombre: false, texte: 32 });
if (COMPLET) JEUX.push({ nom: '390-125', w: 390, h: 844, sombre: false, texte: 20 }, { nom: '390-200-sombre', w: 390, h: 844, sombre: true, texte: 32 });

async function contexte(jeu, vide){
  const ctx = await browser.newContext({ viewport: { width: jeu.w, height: jeu.h }, hasTouch: true, isMobile: !WEBKIT ? true : undefined,
    deviceScaleFactor: JOURNAL ? 1 : 2, colorScheme: jeu.sombre ? 'dark' : 'light',
    userAgent: WEBKIT ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : undefined });
  const cors = { 'access-control-allow-origin': '*' };
  await annuaireMuet(ctx);
  await ctx.route('https://recherche-entreprises.api.gouv.fr/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: cors,
    body: JSON.stringify({ results: ANNUAIRE, total_results: ANNUAIRE.length }) }));
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERREUR PAGE', jeu.nom, String(e)));
  await p.goto(base + '/#/aujourdhui', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr, o, j]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.ORPHANS_KEY, JSON.stringify(o));
    await st.kvSet(st.JOURNAL_KEY, JSON.stringify(j));
  }, vide ? [[], {}, [], []] : [DATA, PROFIL, ORPHELINS, JOURNAL_ECH]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(500);
  if (jeu.texte !== 16) await p.addStyleTag({ content: `html{font-size:${jeu.texte}px !important}` });
  return { ctx, p };
}
const fermer = p => p.evaluate(async () => {
  const { topSheet } = await import('./ui/dom.js'); let s, n = 0;
  while ((s = topSheet()) && n++ < 6){ s.close(null, true); await new Promise(r => setTimeout(r, 120)); }
}).catch(() => {});

async function capturer(p, nom){
  const f = path.join(DOSSIER, nom + '.png');
  await p.screenshot({ path: f });
  if (JOURNAL){
    const b = (await p.screenshot({ type: 'jpeg', quality: 45 })).toString('base64');
    const n = Math.ceil(b.length / 4000);
    for (let i = 0; i < n; i++) console.log(`CAPTURE ${nom} ${i + 1}/${n} ${b.slice(i * 4000, (i + 1) * 4000)}`);
  }
}

let total = 0;
for (const jeu of JEUX){
  for (const [lot, vide] of [[ECRANS, false], [VIDES, true]]){
    if (vide && jeu.nom !== '390' && jeu.nom !== '390-sombre' && jeu.nom !== '320-200') continue;
    const { ctx, p } = await contexte(jeu, vide);
    for (const [nom, ouvre] of lot){
      const id = `${nom}--${jeu.nom}`;
      if (SEUL && !SEUL.test(id)) continue;
      try {
        await fermer(p);
        await p.evaluate(() => { location.hash = '#/aujourdhui'; });
        await p.waitForTimeout(150);
        await ouvre(p);
        await p.waitForTimeout(900);     /* une feuille a fini de monter */
        await capturer(p, id);
        total++;
      } catch (e){ console.log('ÉCHEC CAPTURE', id, String(e).slice(0, 200)); }
    }
    await ctx.close();
  }
}
console.log(`CAPTURES ${total} dans ${DOSSIER}`);
await browser.close();
server.close();
