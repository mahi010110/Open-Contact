/* ============================================================
   OpenContact — e2e : « CE QUI BOUGE », LA TABLE DEVENUE SCÉNARIO
   (docs/recadrage.md : « Cette table deviendra un scénario automatique
   avec R1 : chaque ligne doit être atteinte depuis son onglet en peu de
   gestes. »)

   Le scénario lit la table DANS le document, garde les lignes de R1, et
   joue chacune, préversion allumée, depuis l'onglet qu'elle nomme :
   ① chaque ligne R1 du document a son parcours ici, et chaque parcours
     d'ici a sa ligne là-bas — une fonction qui déménage sans scénario,
     ou un scénario qui garde une ligne disparue, rougit ;
   ② chaque fonction s'atteint en TROIS gestes au plus depuis son
     onglet (un geste = un tap), et l'écran d'arrivée est le bon ;
   ③ au téléphone, et au poste pour les lignes qui en parlent.
   Une mutation à l'appui : une ligne R1 ajoutée au document, servie
   modifiée, sans parcours — le ① doit la nommer.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, relaisMuets, annuaireMuet, ROOT, SHOTS } from './outils.mjs';
import { readFile } from 'fs/promises';
import path from 'path';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

/* ---- la table, lue dans le document ---- */
function lignesR1(md){
  const i = md.indexOf('## Ce qui bouge');
  const j = md.indexOf('\n## ', i + 5);
  const bloc = md.slice(i, j < 0 ? undefined : j);
  return bloc.split('\n')
    .filter(l => l.startsWith('|') && !/^\|\s*-/.test(l))
    .map(l => l.split('|').slice(1, -1).map(x => x.trim()))
    .filter(c => c.length >= 4 && c[0] !== 'Fonction' && /\bR1\b/.test(c[3]))
    .map(c => c[0]);
}

const now = Date.now(), J = 864e5;
const CLE = 'B' + 'x'.repeat(86);
const profil = { name: 'Tom Durand', email: 'tom@prive.test', formation: 'BTS SIO', recherche: 'alternance',
  amis: [{ id: 'KarimKarimKarim000001', nom: 'Karim Benali', recu: now - 9 * J, cle: CLE, parcours: [] }],
  groupes: [{ code: 'abcdefghjkmnpqr', nom: 'BTS SIO Lille', at: now - 9 * J }] };
const pistes = [{ id: 'az', name: 'Aztek', city: 'Roubaix', status: 'todo' },
                { id: 'th', name: 'Thales', city: 'Lille', status: 'todo' }];
const reseau = { v: 1, depuis: 0, recues: [], mercis: [], lus: [], envois: [], entrees: [], attentes: [], dons: [],
  demandes: [{ id: 'demandeTh0001', pisteId: 'th', at: now - 2 * J, exp: now + 12 * J, vers: 1,
               cherche: 'alternance', entreprise: { nom: 'Thales' } }] };
/* une trace d'échange : « Historique » n'existe que s'il y a de quoi relire */
const journal = [{ t: now - J, txt: 'Donné (QR) : 2 pistes', ids: ['az', 'th'] }];

async function ecran(nom, vp){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901 });
  await relaisMuets(ctx); await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/aujourdhui');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async ([pr, ps, rs, jn]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RESEAU_KEY, JSON.stringify(rs));
    await st.kvSet(st.JOURNAL_KEY, JSON.stringify(jn));
    await st.kvSet(st.PREVERSION_KEY, '1');
  }, [profil, pistes, reseau, journal]);
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async () => { await (await import('./ui/reseau.js')).chargerReseau(); (await import('./ui/state.js')).bus.refresh(); });
  await p.waitForTimeout(300);
  return { ctx, p };
}
const dessus = p => p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out)')].pop()?.querySelector('.mh-t')?.textContent.trim() || '');
const fermer = async p => {
  await p.evaluate(async () => { const { topSheet } = await import('./ui/dom.js'); let s, n = 0;
    while ((s = topSheet()) && n++ < 5){ s.close(null, true); await new Promise(r => setTimeout(r, 120)); } });
  await p.waitForTimeout(250);
};

/* ---- les parcours : depuis quel onglet, quels gestes, quel écran au bout ----
   `gestes` : une liste de sélecteurs à taper, dans l'ordre (≤ 3) ;
   `arrive` : ce qui doit être vrai au bout, lu dans la page. */
const PARCOURS = {
  'La fiche d’une piste': {
    onglet: '#/pistes', gestes: ['.row-item[data-id="az"] .ri-main'],
    arrive: () => { const b = [...document.querySelectorAll('.overlay:not(.ov-out) .modal-b, #piVolet .modal-b')].pop();
      const g = b?.querySelector('.fi-contacts'), s = b?.querySelector('.seg3-statut');
      return !!g && !!s && g.getBoundingClientRect().top < s.getBoundingClientRect().top; },
    poste: { gestes: [], arrive: () => !!document.querySelector('#piVolet .fi-contacts') }
  },
  'Mes amis': { onglet: '#/reseau', gestes: ['#bxAmis'], titre: 'Amis' },
  'Conversations et groupes': { onglet: '#/reseau', gestes: [],
    arrive: () => !!document.querySelector('#view-reseau .bx-liste [data-fil]') },
  'Mes demandes en cours': { onglet: '#/reseau', gestes: [],
    arrive: () => !!document.querySelector('#view-reseau #rzDemandes .dmc') },
  'Donner des pistes': { onglet: '#/pistes', gestes: ['#piProspect', '.pk[data-id="az"]', '#pkDonner'], titre: 'Donner' },
  'Recevoir (QR, fichier, texte)': { onglet: '#/aujourdhui', gestes: ['#bnAdd', '[data-mode="texte"]'], titre: 'Coller',
    poste: { gestes: ['#btnAddTop', '[data-mode="texte"]'], titre: 'Coller' } },
  'Ajouter une piste': { onglet: '#/aujourdhui', gestes: ['#bnAdd', '#ajPiste'], titre: 'Nouvelle piste',
    poste: { gestes: ['#btnAddTop', '#ajPiste'], titre: 'Nouvelle piste' } },
  'Ajouter quelqu’un rencontré': { onglet: '#/aujourdhui', gestes: ['#bnAdd', '#ajContact'], titre: 'Nouveau contact',
    poste: { gestes: ['#btnAddTop', '#ajContact'], titre: 'Nouveau contact' } },
  'Historique des échanges': { onglet: '#/reseau', gestes: ['#ecHisto'], titre: 'Historique' },
  'Navigation au poste': { onglet: '#/aujourdhui', seulPoste: true,
    poste: { gestes: [], arrive: () => document.querySelector('.app').classList.contains('nav-laterale') } }
};

/* ---------- ① le document et le scénario disent la même chose ---------- */
const md = await readFile(path.join(ROOT, 'docs', 'recadrage.md'), 'utf8');
/* l'apostrophe se tape droite ou courbe selon l'éditeur : elle ne doit
   pas décider qu'une ligne a disparu */
const pli = s => s.replace(/[’']/g, "'");
const ecart = (doc, ici) => ({ sansParcours: doc.filter(f => !ici.map(pli).includes(pli(f))),
                               sansLigne: ici.filter(f => !doc.map(pli).includes(pli(f))) });
{
  const doc = lignesR1(md);
  const e = ecart(doc, Object.keys(PARCOURS));
  ok(doc.length >= 8 && !e.sansParcours.length && !e.sansLigne.length,
    `① les ${doc.length} lignes R1 de la table ont chacune leur parcours, et rien de plus — ${JSON.stringify(e)}`);
  /* la mutation : une ligne R1 de plus dans le document */
  const md2 = md.replace('| Navigation au poste |', '| Exporter mes pistes | Moi | Pistes › Exporter | R1 |\n| Navigation au poste |');
  const e2 = ecart(lignesR1(md2), Object.keys(PARCOURS));
  ok(md2 !== md && e2.sansParcours.join() === 'Exporter mes pistes',
    `mutation : une ligne ajoutée au document sans parcours est nommée — ${JSON.stringify(e2)}`);
}

/* ---------- ② ③ chaque ligne, depuis son onglet, en trois gestes au plus ---------- */
async function jouer(p, nom, x){
  await fermer(p);
  await p.evaluate(h => { location.hash = h; }, x.onglet);
  await p.waitForTimeout(450);
  if (x.gestes.length > 3) return { ok: false, dit: x.gestes.length + ' gestes' };
  for (const g of x.gestes){
    await p.click(g);
    await p.waitForTimeout(380);
  }
  const titre = x.titre ? await dessus(p) : '';
  const vrai = x.arrive ? await p.evaluate(x.arrive) : titre === x.titre;
  return { ok: vrai, dit: `${x.gestes.length} geste${x.gestes.length > 1 ? 's' : ''}${x.titre ? ' → « ' + titre + ' »' : ''}` };
}
for (const [nom, vp] of [['pouce', { width: 390, height: 844 }], ['poste', { width: 1280, height: 800 }]]){
  const { ctx, p } = await ecran(nom, vp);
  for (const [f, x] of Object.entries(PARCOURS)){
    if (nom === 'pouce' && x.seulPoste) continue;
    const y = nom === 'poste' && x.poste ? { ...x, ...x.poste } : x;
    const r = await jouer(p, nom, y);
    ok(r.ok, `② ${nom} : « ${f} » depuis ${y.onglet}, ${r.dit}`);
  }
  await fermer(p);
  await p.screenshot({ path: `${SHOTS}/162-ce-qui-bouge-${nom}.png` });
  await ctx.close();
}

ok(!errors.length, 'Zéro erreur console' + (errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''));
await browser.close();
server.close();
console.log(ko ? `\nE2E ce qui bouge : ${ko} ÉCHEC(S)` : '\nE2E ce qui bouge : OK');
process.exit(ko ? 1 : 0);
