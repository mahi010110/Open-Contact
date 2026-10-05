/* ============================================================
   « À découvrir » — l'annuaire, sans qu'un mot privé ne sorte
   (docs/recherche.md, lot 2 ; docs/presentation-recherche.md)

   La barre interroge l'annuaire public des entreprises toute seule,
   après une pause dans la frappe. C'est la première fois que l'app
   envoie quelque chose SANS qu'on appuie sur un bouton pour ça : ce
   fichier lit donc chaque requête qui sort, octet par octet, en partant
   de l'état RÉEL de l'app (§8 : « un contrôle de fuite part de l'état
   réel et lit les octets qui sortent par le vrai chemin »).

   ① aucun mot privé ne sort : le nom d'un contact, un mot de note, un
     prénom du groupe, le profil, l'état d'une piste — et une question
     qui ne contient que ça ne part PAS ;
   ② une entreprise = une ligne : ce qui est déjà dans tes pistes ne se
     redit pas ;
   ③ ajouter se fait d'un geste, et se défait (Annuler 30 s) ; l'aperçu
     montre ce que l'annuaire sait AVANT d'en faire une piste ;
   ④ hors ligne, une erreur, la limite de débit (429, relevée en vrai par
     `sonde-annuaire.mjs`) : chaque cas se dit, et se répare ;
   ⑤ sans aucune piste, la recherche amorce la liste — c'est là que
     l'annuaire sert le plus ;
   ⑥ au poste, la liste et l'aperçu côte à côte (liste-détail) : choisir
     une ligne, au clic ou au clavier, met l'aperçu à jour sans fenêtre ;
   ⑦ « À découvrir » est une VUE, visible dès l'ouverture (la barre de
     portée), son compte se remplit pendant qu'on tape, et RIEN ne part
     au démarrage.

   L'annuaire est REMPLACÉ par une réponse fabriquée à sa forme réelle :
   aucun réseau requis. La CSP de l'app, elle, est la vraie — si elle
   bloquait l'appel, le navigateur le refuserait avant toute interception.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const E = (siren, nom, ville, cp, lat, naf, tranche, rue) => ({
  siren, nom_complet: nom, nom_raison_sociale: nom, sigle: null, activite_principale: naf,
  categorie_entreprise: 'PME', tranche_effectif_salarie: tranche, date_creation: '2009-03-12',
  nombre_etablissements_ouverts: 2,
  siege: { est_siege: true, numero_voie: rue[0], type_voie: rue[1], libelle_voie: rue[2], code_postal: cp,
           libelle_commune: ville, latitude: String(lat), longitude: '3.06', etat_administratif: 'A' },
  matching_etablissements: [{ adresse: `${rue.join(' ')} ${cp} ${ville}`, code_postal: cp, libelle_commune: ville,
           latitude: String(lat), longitude: '3.06', etat_administratif: 'A' }],
  dirigeants: [{ nom: 'LEROY', prenoms: 'THOMAS', qualite: 'Président', type_dirigeant: 'personne physique' }]
});
const REPONSE = { total_results: 6, page: 1, per_page: 10, results: [
  E('812345678', 'ADVENS', 'LILLE', '59000', 50.637, '62.02A', '22', ['38', 'RUE', 'DE LA BASSEE']),
  E('823456789', 'NOVALINK SOLUTIONS', "VILLENEUVE-D'ASCQ", '59650', 50.62, '62.01Z', '12', ['2', 'AV', 'DE LA CREATIVITE']),
  E('834567890', 'DATAFLOW NORD', 'ROUBAIX', '59100', 50.69, '63.11Z', '11', ['15', 'RUE', 'DE L EPEULE']),
  /* déjà dans les pistes : ne doit PAS sortir dans « À découvrir » */
  E('845678901', 'ADVALYS CYBER', 'LILLE', '59000', 50.63, '62.02A', '03', ['12', 'RUE', 'NATIONALE'])
]};

const PISTES = [
  { id: 'a', name: 'Advalys Cyber', city: 'Lille', address: '12 rue Nationale\n59000 Lille', domain: 'cyber',
    positions: ['alternance'], status: 'todo', vecu: 'stage', vecuQui: 'Léa', updatedAt: 5,
    notes: 'rappeler Bertrand lundi',
    contacts: [{ id: 'c1', name: 'Julie Marchand', role: 'RH', email: 'julie@advalys.test' }] },
  { id: 'b', name: 'Lumen Data', city: 'Lille', domain: 'startup', status: 'reply', updatedAt: 4 }
];
const PROFIL = { name: 'Inès Martin', formation: 'BTS SIO', recherche: 'alternance', email: 'ines@exemple.test' };

/* l'annuaire fabriqué : on note CHAQUE requête, et on choisit la réponse */
function annuaire(ctx){
  const journal = [];
  let mode = { statut: 200 };
  ctx.route('https://recherche-entreprises.api.gouv.fr/**', async route => {
    journal.push(route.request().url());
    const m = typeof mode === 'function' ? mode() : mode;
    if (m.statut !== 200)
      return route.fulfill({ status: m.statut, contentType: 'text/plain',
        headers: { 'access-control-allow-origin': '*' }, body: 'non' });
    return route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(REPONSE) });
  });
  return { journal, regler: m => { mode = m; } };
}
const pliees = s => decodeURIComponent(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function ecran(vp, touch, seed){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch });
  const an = annuaire(ctx);
  const p = await ctx.newPage();
  /* les erreurs que CE fichier provoque exprès (500, 429) s'affichent en
     console : elles ne comptent pas comme des fautes de l'app */
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !/status of (500|429)/.test(m.text())) errors.push(m.text()); });
  await p.goto(base + '/#/pistes', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
  }, [seed, PROFIL]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#piQ');
  return { ctx, p, an };
}
const taper = async (p, txt) => {
  await p.fill('#piQ', '');
  await p.click('#piQ');
  await p.keyboard.type(txt, { delay: 6 });
};
/* la question part après une pause : on attend que la section ait FINI
   (ni « attente » ni « charge ») — sinon on lirait l'état d'avant */
const lireDec = async (p, ms = 3500) => {
  await p.waitForTimeout(150);
  await p.waitForFunction(() => !document.querySelector('#piDec [aria-busy="true"], #piPortee [aria-busy="true"]'),
    null, { timeout: ms }).catch(() => {});
  return p.evaluate(() => {
    const s = document.querySelector('#piDec');
    return {
      present: !!(s && s.querySelector('.dc-vue')),
      noms: [...document.querySelectorAll('#piDec .dc-nom')].map(n => n.textContent.trim()),
      pris: [...document.querySelectorAll('#piDec .dc-row.dc-pris .dc-nom')].map(n => n.textContent.trim()),
      etat: (s && s.querySelector('.dc-etat')?.textContent.replace(/\s+/g, ' ').trim()) || '',
      compte: document.querySelector('#piPortee [data-portee="decouvrir"] .pt-n')?.textContent.trim() || '',
      mesPistes: document.querySelector('#piPortee [data-portee="pistes"] .pt-n')?.textContent.trim() || ''
    };
  });
};
/* ouvrir la vue « À découvrir » — le segment sous la barre */
const versDecouvrir = async p => {
  await p.click('#piPortee [data-portee="decouvrir"]');
  await p.waitForSelector('#piDec .dc-vue', { timeout: 3000 }).catch(() => {});
};

/* ---------- au pouce ---------- */
{
  const { ctx, p, an } = await ecran({ width: 390, height: 844 }, true, PISTES);
  /* ⑦ la vue se voit avant d'avoir servi, et rien ne part au démarrage */
  const depart = await p.evaluate(() => {
    const b = document.querySelector('#piPortee [data-portee="decouvrir"]');
    return b ? { y: Math.round(b.getBoundingClientRect().bottom), txt: b.textContent.trim() } : null;
  });
  if (!depart) fail('la barre de portée n’existe pas : « À découvrir » ne se voit pas avant d’avoir servi');
  else if (depart.y > 300) fail(`le segment « À découvrir » est à ${depart.y} px : sous le clavier`);
  if (an.journal.length) fail('une requête est partie vers l’annuaire au DÉMARRAGE (invariant ④)');
  await taper(p, 'alternance Lille');
  await p.waitForTimeout(900);
  const avantVue = await lireDec(p);
  if (!/^\d+\+?$/.test(avantVue.compte)) fail(`pendant la frappe, le segment « À découvrir » ne dit pas son compte (« ${avantVue.compte} »)`);
  else console.log(`pouce · ⑦ le segment « À découvrir » est là dès l’ouverture (y=${depart && depart.y}), rien ne part au démarrage, et il dit « ${avantVue.compte} » pendant la frappe ✓`);
  await versDecouvrir(p);
  const d = await lireDec(p);
  if (!d.present) fail('« alternance Lille » : la vue « À découvrir » ne s’ouvre pas');
  if (d.noms.join('|') !== 'Advens|Novalink Solutions|Dataflow Nord')
    fail(`« À découvrir » montre ${JSON.stringify(d.noms)}`);
  if (d.noms.includes('Advalys Cyber')) fail('une piste déjà suivie revient dans « À découvrir »');
  const u = new URL(an.journal[an.journal.length - 1] || 'http://x/');
  if (u.searchParams.get('departement') !== '59' || !u.searchParams.get('activite_principale'))
    fail('la question ne dit pas le lieu et le métier : ' + u.search);
  if (u.searchParams.has('q')) fail('« alternance » est parti en texte vers l’annuaire : ' + u.search);
  console.log(`pouce · « alternance Lille » : ${d.noms.length} à découvrir, la piste déjà suivie écartée ✓`);
  await p.evaluate(() => document.activeElement.blur());
  await p.screenshot({ path: `${SHOTS}/96-decouvrir-pouce.png` });

  /* ① aucun mot privé ne sort — et une question vidée par le tri ne part pas */
  /* Chaque question vise un lieu DIFFÉRENT de la précédente. Sinon la
     requête serait identique à celle d'avant, rien ne repartirait, et la
     garde passerait au vert sans avoir rien mesuré — c'est exactement ce
     qu'une mutation a montré (« l'état envoyé » passait inaperçu). */
  for (const [q, mots] of [['julie lille', ['julie']], ['Marchand alternance Lyon', ['marchand']],
                           ['bertrand', ['bertrand']], ['Léa Bordeaux', ['lea']], ['ines martin Nantes', ['ines', 'martin']],
                           ['sans nouvelles Rennes', []], ['en cours Toulouse', []]]){
    /* la question d'avant doit avoir FINI — sa jumelle comprise (lot 4
       des sources : deux questions par recherche, espacées) : sinon sa
       seconde requête tombe dans la fenêtre de celle-ci et l'accuse */
    await lireDec(p);
    const avant = an.journal.length;
    await taper(p, q);
    await p.waitForTimeout(1100);
    await lireDec(p);
    const sortis = an.journal.slice(avant).map(pliees);
    const fuite = sortis.find(x => mots.some(m => x.includes(m)));
    if (fuite) fail(`« ${q} » emporte un mot privé vers l’annuaire : ${fuite}`);
    if (['bertrand', 'Léa Bordeaux', 'sans nouvelles Rennes', 'en cours Toulouse'].includes(q) && sortis.length)
      fail(`« ${q} » ne contient rien qui décrive une entreprise et une requête est partie : ${sortis[0]}`);
  }
  console.log('pouce · contact, note, prénom, profil, état : rien ne sort, et rien ne part pour rien ✓');

  /* ③ ajouter, d'un geste — puis Annuler */
  await taper(p, 'alternance Lille');
  await p.waitForTimeout(900);
  await lireDec(p);
  const n0 = await p.evaluate(async () => (await import('./ui/state.js')).S.companies.length);
  const ordre0 = (await lireDec(p)).noms;
  await p.click('#piDec .dc-row:has-text("Advens") .dc-add');
  await p.waitForTimeout(400);
  const ap = await lireDec(p);
  const ajout = await p.evaluate(async () => {
    const S = (await import('./ui/state.js')).S;
    const c = S.companies.find(x => x.name === 'Advens');
    const b = document.querySelector('#piDec .dc-row.dc-pris .dc-add');
    return { n: S.companies.length, siren: c && c.siren, city: c && c.city, contacts: c && c.contacts.length,
             annuler: !!document.querySelector('.undo-bar'), presse: b && b.getAttribute('aria-pressed'),
             focus: document.activeElement === b };
  });
  if (ajout.n !== n0 + 1 || ajout.siren !== '812345678' || ajout.city !== 'Lille')
    fail('« Ajouter » ne crée pas la piste attendue : ' + JSON.stringify(ajout));
  if (ajout.contacts) fail('le dirigeant a été importé comme contact — aucune personne d’office');
  /* la ligne RESTE, cochée, à sa place : on voit où est partie l'entreprise */
  if (ap.noms.join('|') !== ordre0.join('|') || ap.pris.join('|') !== 'Advens' || ajout.presse !== 'true')
    fail('la bascule ne garde pas sa ligne cochée à sa place : ' + JSON.stringify({ avant: ordre0, apres: ap.noms, pris: ap.pris }));
  if (ap.mesPistes !== String(Number(d.mesPistes) + 1)) fail(`le compte de « Mes pistes » ne suit pas l’ajout (${d.mesPistes} → ${ap.mesPistes})`);
  if (!ajout.annuler) fail('pas de barre « Annuler » après l’ajout');
  await p.click('.undo-bar button:has-text("Annuler")');
  await p.waitForTimeout(400);
  const an2 = await lireDec(p);
  const nAnnule = await p.evaluate(async () => (await import('./ui/state.js')).S.companies.length);
  if (nAnnule !== n0 || !an2.noms.includes('Advens') || an2.pris.length) fail('« Annuler » ne rend pas l’état d’avant');
  else console.log('pouce · « + » : la piste arrive avec son SIREN, sans personne importée, la ligne reste cochée à sa place, et Annuler la rend ✓');
  /* la bascule dans l'autre sens : ✓ retire, et Annuler la remet */
  await p.click('#piDec .dc-row:has-text("Advens") .dc-add');
  await p.waitForTimeout(300);
  await p.click('#piDec .dc-row:has-text("Advens") .dc-add');
  await p.waitForTimeout(300);
  const retire = await p.evaluate(async () => (await import('./ui/state.js')).S.companies.some(c => c.name === 'Advens'));
  if (retire) fail('« ✓ » ne retire pas la piste qu’on vient d’ajouter');
  else console.log('pouce · « ✓ » : la bascule retire ce qu’elle vient d’ajouter ✓');

  /* l'aperçu, AVANT d'en faire une piste */
  await p.click('#piDec .dc-row:has-text("Dataflow") .dc-main');
  await p.waitForSelector('.overlay .modal', { timeout: 3000 }).catch(() => {});
  const fiche = await p.evaluate(() => ({
    titre: document.querySelector('.overlay .ap-nom')?.textContent || '',
    texte: document.querySelector('.overlay .modal-b')?.textContent.replace(/\s+/g, ' ') || '',
    pied: [...document.querySelectorAll('.overlay .modal-f button')].map(b => b.textContent.trim())
  }));
  if (!/Dataflow Nord/.test(fiche.titre) || !/834567890/.test(fiche.texte) || !/Thomas Leroy/.test(fiche.texte))
    fail('l’aperçu ne montre pas ce que l’annuaire sait : ' + JSON.stringify(fiche));
  if (!fiche.pied.some(t => /Ajouter à mes pistes/.test(t))) fail('l’aperçu n’offre pas d’ajouter');
  await p.screenshot({ path: `${SHOTS}/96-decouvrir-apercu.png` });
  /* trois niveaux : le nom en titre, l'activité et les faits, puis les liens */
  const niveaux = await p.evaluate(() => {
    const y = s => document.querySelector('.overlay ' + s)?.getBoundingClientRect().top ?? -1;
    return [y('.ap-nom'), y('.ap-act'), y('.ap-faits'), y('.ap-liens'), y('.ap-plus')];
  });
  if (niveaux.some(v => v < 0) || niveaux.some((v, i) => i && v < niveaux[i - 1]))
    fail('l’aperçu ne dit pas d’abord qui, puis quoi et où, puis comment y entrer : ' + JSON.stringify(niveaux));
  await p.click('.overlay .modal-f button:has-text("Ajouter à mes pistes")');
  await p.waitForTimeout(400);
  if (!(await p.evaluate(async () => (await import('./ui/state.js')).S.companies.some(c => c.siren === '834567890'))))
    fail('« Ajouter à mes pistes » depuis l’aperçu n’ajoute rien');
  else console.log('pouce · aperçu : activité, adresse, effectif, dirigeant, SIREN, puis « Ajouter à mes pistes » ✓');

  /* ④ hors ligne : ça se dit, rien ne part, et ça repart avec le réseau */
  await ctx.setOffline(true);
  await p.evaluate(() => dispatchEvent(new Event('offline')));
  const avantHL = an.journal.length;
  await taper(p, 'cloud Roubaix');
  await p.waitForTimeout(1000);
  const hl = await lireDec(p);
  if (hl.etat !== 'Hors ligne.') fail(`hors ligne, la section dit « ${hl.etat} »`);
  if (an.journal.length !== avantHL) fail('hors ligne, une requête est quand même partie');
  await ctx.setOffline(false);
  await p.evaluate(() => dispatchEvent(new Event('online')));
  await p.waitForTimeout(500);
  const re = await lireDec(p);
  if (!re.noms.length) fail('le réseau revient et « À découvrir » ne repart pas');
  else console.log('pouce · hors ligne : « Hors ligne. », rien ne part, et ça repart avec le réseau ✓');

  /* l'annuaire en panne : on le dit, et « Réessayer » répare */
  an.regler({ statut: 500 });
  await taper(p, 'data Lille');
  await p.waitForTimeout(1000);
  const er = await lireDec(p);
  if (!/^L’annuaire ne répond pas\./.test(er.etat)) fail(`panne : la section dit « ${er.etat} »`);
  an.regler({ statut: 200 });
  await p.click('#piDec [data-dc-encore]');
  await p.waitForTimeout(500);
  if (!(await lireDec(p)).noms.length) fail('« Réessayer » ne répare pas');
  /* la limite de débit, relevée EN VRAI : une seconde tentative passe… */
  let coups = 0;
  an.regler(() => (++coups === 1 ? { statut: 429 } : { statut: 200 }));
  await taper(p, 'support Lille');
  await p.waitForTimeout(800);
  const l1 = await lireDec(p, 5000);
  if (!l1.noms.length) fail('un 429 isolé n’est pas rattrapé par la seconde tentative');
  /* … et deux refus de suite se disent, sans accuser le réseau */
  an.regler({ statut: 429 });
  await taper(p, 'dev Lille');
  await p.waitForTimeout(800);
  const l2 = await lireDec(p, 6000);
  if (!/^L’annuaire est très demandé\./.test(l2.etat)) fail(`deux 429 : la section dit « ${l2.etat} »`);
  else console.log('pouce · panne → « Réessayer » ; 429 → seconde tentative, puis « très demandé » ✓');
  an.regler({ statut: 200 });
  const large = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  if (large) fail('la page défile latéralement');
  await ctx.close();
}

/* ---------- ⑤ sans aucune piste : la recherche amorce la liste ---------- */
{
  const { ctx, p } = await ecran({ width: 390, height: 844 }, true, []);
  await taper(p, 'cyber Lille');
  await p.waitForTimeout(900);
  const d = await lireDec(p);
  const accueil = await p.evaluate(() => !!document.querySelector('#piBody .td-empty'));
  if (!d.noms.length) fail('sans aucune piste, la recherche ne montre rien à découvrir');
  if (accueil) fail('l’accueil « Aucune piste pour l’instant » reste posé au-dessus de la recherche');
  await p.click('#piDec .dc-add >> nth=0');
  await p.waitForTimeout(400);
  const n = await p.evaluate(async () => (await import('./ui/state.js')).S.companies.length);
  if (n !== 1) fail('sans aucune piste, « Ajouter » ne crée pas la première');
  else console.log('neuf · « cyber Lille » sans aucune piste : l’annuaire amorce la liste, un geste = la première piste ✓');
  await ctx.close();
}

/* ---------- ⑥ au poste : la liste et l'aperçu côte à côte ---------- */
{
  const { ctx, p, an } = await ecran({ width: 1280, height: 800 }, false, PISTES);
  if (an.journal.length) fail('au poste, une requête est partie au DÉMARRAGE (invariant ④)');
  await taper(p, 'alternance Lille');
  await p.waitForTimeout(900);
  await versDecouvrir(p);
  await lireDec(p);
  const g = await p.evaluate(() => {
    const r = s => document.querySelector(s)?.getBoundingClientRect();
    const l = r('#piDec .dc-list'), d = r('#piDec .dc-detail');
    return { liste: l && Math.round(l.right), detail: d && Math.round(d.left), haut: d && Math.round(d.top),
             nom: document.querySelector('#piDec .dc-detail .ap-nom')?.textContent.trim(),
             choisie: document.querySelector('#piDec .dc-sel .dc-nom')?.textContent.trim(),
             fenetre: !!document.querySelector('.overlay .modal') };
  });
  if (!g.liste || !g.detail || g.detail <= g.liste) fail('au poste, l’aperçu n’est pas À CÔTÉ de la liste : ' + JSON.stringify(g));
  if (!g.nom || g.nom !== g.choisie) fail(`au poste, l’aperçu (« ${g.nom} ») ne montre pas la ligne choisie (« ${g.choisie} »)`);
  else console.log(`poste · ⑥ liste et aperçu côte à côte, la première ligne choisie d’office (« ${g.nom} ») ✓`);
  /* un clic choisit, sans fenêtre */
  await p.click('#piDec .dc-row:has-text("Dataflow") .dc-main');
  await p.waitForTimeout(200);
  const c = await p.evaluate(() => ({ nom: document.querySelector('#piDec .dc-detail .ap-nom')?.textContent.trim(),
    fenetre: !!document.querySelector('.overlay .modal') }));
  if (c.nom !== 'Dataflow Nord' || c.fenetre) fail('au poste, un clic sur une ligne ne met pas l’aperçu à jour, ou ouvre une fenêtre : ' + JSON.stringify(c));
  /* le clavier : de la barre, ↓ descend dans la liste, et l'aperçu suit le focus */
  await p.click('#piQ');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('ArrowDown');
  const k = await p.evaluate(() => ({
    focus: document.activeElement.closest('.dc-row')?.querySelector('.dc-nom')?.textContent.trim(),
    nom: document.querySelector('#piDec .dc-detail .ap-nom')?.textContent.trim() }));
  if (!k.focus || k.focus !== k.nom) fail('au poste, l’aperçu ne suit pas le clavier : ' + JSON.stringify(k));
  else console.log(`poste · ⑥ ↓ depuis la barre parcourt la liste, et l’aperçu suit (« ${k.nom} ») ✓`);
  /* le geste plein de l'aperçu ajoute, et devient « Ouvrir la fiche » */
  const n0 = await p.evaluate(async () => (await import('./ui/state.js')).S.companies.length);
  await p.click('#piDec .dc-detail [data-ap-add]');
  await p.waitForTimeout(400);
  const a = await p.evaluate(async () => ({ n: (await import('./ui/state.js')).S.companies.length,
    ouvrir: !!document.querySelector('#piDec .dc-detail [data-ap-fiche]'),
    coche: !!document.querySelector('#piDec .dc-sel.dc-pris') }));
  if (a.n !== n0 + 1 || !a.ouvrir || !a.coche) fail('au poste, « Ajouter à mes pistes » dans l’aperçu ne fait pas son travail : ' + JSON.stringify(a));
  else console.log('poste · ⑥ « Ajouter à mes pistes » dans l’aperçu : la ligne se coche, l’aperçu propose « Ouvrir la fiche » ✓');
  await p.evaluate(() => document.activeElement.blur());
  await p.screenshot({ path: `${SHOTS}/96-decouvrir-poste.png` });
  const large = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  if (large) fail('au poste, la page défile latéralement');
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E découvrir : ÉCHEC' : 'E2E découvrir : OK');
