/* ============================================================
   OpenContact — e2e : LA REFONTE (9.0)
   (docs/decisions/0015-la-refonte-en-9-0.md, docs/principes.md)

   Sur l'app réelle, au pouce (390 × 844) puis au poste (1280 × 800) :
   ① LA COQUE AU TÉLÉPHONE : trois places en bas — mes pistes, le +,
     moi —, chacune de 44 px au moins ; le coin de l'écran où l'on est
     ramène à « Aujourd'hui » ; « Réseau » s'ouvre depuis « Moi » ;
   ② LE RANGEMENT : une piste engagée qui se tait depuis 60 jours est
     rangée au lancement — clôturée, jamais supprimée, ses notes
     intactes — ; l'accueil l'annonce ; « Annuler » la rouvre, et un
     rechargement ne la range pas de nouveau ;
   ③ LA FILE : une ligne par piste, dans l'ordre (ce qui est dû, une
     réponse sans suite, par où commencer), UN bouton nommé par ligne,
     et un seul bouton rempli sur l'écran ; « Bientôt » dit le plan
     d'une piste qui attend ;
   ④ LA BARRE : vide, elle propose ; RIEN ne part vers l'annuaire
     pendant la frappe — la question part sur « Prépare la page », une
     fois, avec les mots tapés ; un geste compris se joue d'Entrée, et
     « Annuler » remet la piste EXACTEMENT comme elle était ;
   ⑤ LA FICHE : « Prochaine étape », le bouton du pied la joue ; après
     « Décroché », la suite se coche — et ne sort pas dans un partage
     (l'état réel de l'app, les octets de `sharePayload`) ;
   ⑥ AU POSTE : la barre latérale, la pile qui se remplit, Ctrl K et
     « / » qui ouvrent la palette (« / » garde la recherche dans « Mes
     pistes »), « Aujourd'hui » en deux zones ;
   zéro erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, annuaireMuet } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const jour = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const AUJ = jour(0);
const T = Date.now();
const PISTES = [
  { id: 'adv', name: 'Advens', city: 'Lille', status: 'active', updatedAt: T,
    contacts: [{ id: 'cl', name: 'Claire Dubois', email: 'claire@exemple.test' }],
    appliedAt: jour(-9), nextAction: jour(-2), nextActionText: 'Relancer Claire',
    history: [{ d: jour(-9), t: 'Mail envoyé à Claire Dubois' }] },
  /* écrite il y a trois jours, rien de prévu : elle attend */
  { id: 'azt', name: 'Aztek', city: 'Lille', status: 'active', updatedAt: T,
    contacts: [{ id: 'ma', name: 'Marc Lefèvre', email: 'marc@exemple.test' }],
    history: [{ d: jour(-3), t: 'Mail envoyé à Marc Lefèvre' }] },
  { id: 'tha', name: 'Thales', city: 'Élancourt', status: 'todo', vecu: 'alternance', vecuQui: 'Léa', updatedAt: T },
  /* engagée, muette depuis soixante jours */
  { id: 'kia', name: 'Kiabi', city: 'Hem', status: 'active', notes: 'NOTE-KIABI', updatedAt: T - 60 * 864e5,
    contacts: [{ id: 'kc', name: 'Service RH', email: 'rh@exemple.test' }],
    history: [{ d: jour(-60), t: 'Candidature sur le site' }] },
  { id: 'ovh', name: 'OVHcloud', city: 'Roubaix', status: 'reply', updatedAt: T,
    history: [{ d: jour(-1), t: 'Réponse reçue' }] }
];
const PROFIL = { name: 'Inès Martin', formation: 'BTS SIO option SISR', recherche: 'stage', ville: 'Lille', email: 'ines@exemple.test' };
const FAUX_ANNUAIRE = { total_results: 2, results: [
  { siren: '123456789', nom_complet: 'SOPRA STERIA GROUP', nom_raison_sociale: 'SOPRA STERIA GROUP', activite_principale: '62.02A',
    tranche_effectif_salarie: '53', nature_juridique: '5599', etat_administratif: 'A', matching_etablissements: [],
    siege: { libelle_commune: 'PARIS', code_postal: '75116', est_siege: true, etat_administratif: 'A' } },
  { siren: '987654321', nom_complet: 'SOPRA BANKING SOFTWARE', nom_raison_sociale: 'SOPRA BANKING SOFTWARE', activite_principale: '58.29C',
    tranche_effectif_salarie: '42', nature_juridique: '5710', etat_administratif: 'A', matching_etablissements: [],
    siege: { libelle_commune: 'ANNECY', code_postal: '74000', est_siege: true, etat_administratif: 'A' } }] };

async function ecran({ vp = { width: 390, height: 844 }, sombre = false } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, colorScheme: sombre ? 'dark' : 'light', locale: 'fr-FR' });
  await annuaireMuet(ctx);
  /* l'annuaire : on COMPTE ce qui part (posée après `annuaireMuet`, cette route passe devant) */
  const parties = [];
  await ctx.route(/recherche-entreprises\.api\.gouv\.fr/, r => {
    parties.push(r.request().url());
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(FAUX_ANNUAIRE) });
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource|WebSocket/.test(m.text())) errors.push(m.text()); });
  await p.goto(base + '/#/aujourdhui', { waitUntil: 'load' });
  await p.evaluate(async d => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d.pistes));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(d.profil));
  }, { pistes: PISTES, profil: PROFIL });
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui h1');
  await p.waitForTimeout(500);
  return { ctx, p, parties };
}
const piste = (p, id) => p.evaluate(async i => {
  const { S } = await import('./ui/state.js');
  const c = S.companies.find(x => x.id === i);
  return c ? JSON.parse(JSON.stringify(c)) : null;
}, id);
const route = p => p.evaluate(async () => (await import('./ui/state.js')).S.route);
const visible = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s)].filter(n => n.getClientRects().length && getComputedStyle(n).visibility !== 'hidden').length, sel);
const fermerFeuilles = async p => { for (let i = 0; i < 4 && await p.$('.overlay.open:not(.ov-out)'); i++){ await p.keyboard.press('Escape'); await p.waitForTimeout(350); } };
const sansDate = c => { const { updatedAt, ...r } = c; return JSON.stringify(r); };

/* ============ AU POUCE ============ */
{
  const { ctx, p, parties } = await ecran();

  /* ---------- ② le rangement (il a lieu au lancement) ---------- */
  let kia = await piste(p, 'kia');
  const n = await p.evaluate(async () => (await import('./ui/state.js')).S.companies.length);
  ok(kia.closedReason === 'dropped' && kia.rangeAuto === AUJ && kia.closedAt === AUJ, '② muette depuis 60 jours : rangée au lancement, clôturée « Abandonné », datée du jour');
  ok(n === PISTES.length && kia.notes === 'NOTE-KIABI' && kia.contacts.length === 1, '② rien n’est supprimé : la piste est là, avec ses notes et son contact');
  ok(kia.history[kia.history.length - 1].t === 'Rangée : 60 jours sans réponse', '② son historique le dit — ' + kia.history[kia.history.length - 1].t);
  const annonce = await p.textContent('#view-aujourdhui .aj-range');
  ok(/Kiabi/.test(annonce) && /60 jours sans réponse/.test(annonce), '② l’accueil l’annonce — ' + annonce.replace(/\s+/g, ' ').trim());

  /* ---------- ① la coque ---------- */
  const places = await p.evaluate(() => [...document.querySelectorAll('.bottomnav a, .bottomnav button')]
    .filter(x => x.getClientRects().length).map(x => ({ r: x.dataset.r || x.id, nom: x.getAttribute('aria-label'),
      h: Math.round(x.getBoundingClientRect().height), w: Math.round(x.getBoundingClientRect().width) })));
  ok(places.map(x => x.r).join() === 'pistes,bnAdd,moi', '① trois places en bas : mes pistes, le +, moi — ' + places.map(x => x.nom).join(' · '));
  ok(places.every(x => x.h >= 44 && x.w >= 44), '① chacune fait 44 px au moins — ' + places.map(x => x.w + '×' + x.h).join(' '));
  ok(await visible(p, '.bottomnav a[data-r="reseau"]') === 0, '① plus d’onglet « Réseau » dans la barre');
  await p.click('.bottomnav a[data-r="pistes"]');
  await p.waitForTimeout(300);
  ok(await route(p) === 'pistes' && await visible(p, '.bottomnav .bn-g a[data-r="pistes"]') === 0
    && await visible(p, '.bottomnav .bn-g a[data-r="aujourdhui"]') === 1, '① dans « Mes pistes », le même coin ramène à « Aujourd’hui »');
  await p.click('.bottomnav .bn-g a[data-r="aujourdhui"]');
  await p.waitForTimeout(300);
  ok(await route(p) === 'aujourdhui', '① … et il y ramène');
  await p.click('.bottomnav a[data-r="moi"]');
  await p.waitForSelector('#moiReseau');
  await p.click('#moiReseau');
  await p.waitForTimeout(300);
  ok(await route(p) === 'reseau' && (await p.textContent('#view-reseau h1')).trim() === 'Réseau', '① « Réseau » s’ouvre depuis « Moi »');
  await p.click('.bottomnav .bn-d a[data-r="aujourdhui"]');
  await p.waitForTimeout(300);

  /* ---------- ② « Annuler » ---------- */
  await p.click('#view-aujourdhui .aj-range [data-annuler]');
  await p.waitForTimeout(300);
  kia = await piste(p, 'kia');
  ok(!kia.closedReason && !kia.rangeAuto && kia.history[kia.history.length - 1].t === 'Rouverte', '② « Annuler » la rouvre');
  ok(await visible(p, '#view-aujourdhui .aj-range') === 0, '② l’annonce part avec elle');
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui h1');
  await p.waitForTimeout(400);
  kia = await piste(p, 'kia');
  ok(!kia.closedReason, '② rechargée : elle n’est pas rangée de nouveau — le silence repart de zéro');

  /* ---------- ③ la file et la fenêtre « Maintenant » ---------- */
  const lireFile = () => p.evaluate(() => ({
    rangs: [...document.querySelectorAll('#view-aujourdhui .aj-rang')].map(r => ({ id: r.dataset.id,
      nom: r.querySelector('.act-verb').textContent.trim(), sous: r.querySelector('.act-sub').textContent.replace(/\s+/g, ' ').trim(),
      ici: r.classList.contains('aj-ici'), bouton: !!r.querySelector('button') })),
    fenetre: (m => m ? { titre: m.querySelector('.mt-t').textContent.trim(), nom: (m.querySelector('.mt-nom b') || {}).textContent || '',
      geste: m.querySelector('[data-geste]') ? m.querySelector('[data-geste]').textContent.trim() : '',
      plein: !!m.querySelector('[data-geste].btn-primary'), plusTard: !!m.querySelector('[data-plus-tard]'),
      h: m.querySelector('[data-geste]') ? Math.round(m.querySelector('[data-geste]').getBoundingClientRect().height) : 0,
      bas: m.querySelector('.mt-f') ? Math.round(innerHeight - m.querySelector('.mt-f').getBoundingClientRect().bottom) : -1 } : null)(document.querySelector('#ajMaint')) }));
  let f = await lireFile();
  ok(f.rangs.map(x => x.nom).join() === 'Advens,OVHcloud,Thales', '③ la file, dans l’ordre : ce qui est dû, une réponse sans suite, par où commencer — ' + f.rangs.map(x => x.nom).join(' · '));
  ok(f.rangs[0].ici && !f.rangs[1].ici && !f.rangs[2].ici && f.rangs.every(x => !x.bouton), '③ la première ligne est choisie ; aucune ligne ne porte de bouton');
  ok(f.fenetre && ['Maintenant', 'Pour reprendre'].includes(f.fenetre.titre) && f.fenetre.nom === 'Advens' && f.fenetre.geste === 'Relancer' && f.fenetre.plein && f.fenetre.plusTard,
    '③ la fenêtre « Maintenant » la porte : son geste NOMMÉ, rempli, et « Plus tard » — ' + JSON.stringify(f.fenetre));
  ok(await visible(p, '#view-aujourdhui .btn-primary') === 1, '③ un seul bouton rempli sur l’écran');
  ok(f.fenetre.h >= 44 && f.fenetre.bas >= 0 && f.fenetre.bas <= 844 * 0.4, '③ le geste fait 44 px et tient sous le pouce, à ' + f.fenetre.bas + ' px du bas de l’écran');
  /* toucher une ligne la charge dans la fenêtre */
  await p.click(`#view-aujourdhui .aj-rang[data-id="${f.rangs[1].id}"] .act-main`);
  let g = await lireFile();
  ok(g.rangs[1].ici && !g.rangs[0].ici && g.fenetre.nom === 'OVHcloud' && g.fenetre.geste === 'Planifier', '③ toucher une ligne la charge dans la fenêtre — ' + g.fenetre.nom + ' · ' + g.fenetre.geste);
  await p.click(`#view-aujourdhui .aj-rang[data-id="${f.rangs[2].id}"] .act-main`);
  g = await lireFile();
  ok(g.fenetre.nom === 'Thales' && g.fenetre.geste === 'Demander' && /Léa y a été en alternance/.test(g.rangs[2].sous), '③ la raison se lit sur la ligne, le geste dans la fenêtre — ' + g.rangs[2].sous + ' · ' + g.fenetre.geste);
  /* la retoucher ouvre la fiche : le même geste, un cran plus loin */
  await p.click(`#view-aujourdhui .aj-rang[data-id="${f.rangs[2].id}"] .act-main`);
  ok(!!(await p.waitForSelector('.modal-fiche', { timeout: 3000 }).catch(() => null)), '③ retoucher la ligne choisie ouvre la fiche');
  await fermerFeuilles(p);
  await p.click(`#view-aujourdhui .aj-rang[data-id="${f.rangs[0].id}"] .act-main`);
  const tard = (await p.textContent('#view-aujourdhui .tr-soon')).replace(/\s+/g, ' ');
  ok(/Aztek/.test(tard) && /Relancer si pas de réponse/.test(tard) && /Kiabi/.test(tard), '③ « Bientôt » dit le plan d’une piste qui attend : « Relancer si pas de réponse »');

  /* ---------- ④ la barre ---------- */
  await p.click('#bnAdd');
  await p.waitForSelector('.modal-barre #brQ');
  await p.waitForTimeout(400);
  const vide = await p.evaluate(() => ({ focus: document.activeElement && document.activeElement.id,
    labels: [...document.querySelectorAll('.modal-barre .br-lbl')].map(x => x.textContent.trim()),
    essais: [...document.querySelectorAll('.modal-barre .br-essai')].map(x => x.textContent.trim()),
    pied: [...document.querySelectorAll('.modal-barre .modal-f button')].map(x => x.textContent.trim()) }));
  ok(vide.focus === 'brQ', '④ le + ouvre la barre, le curseur dans le champ');
  ok(vide.labels.includes('À faire') && vide.labels.includes('Essaie') && vide.essais.length >= 2, '④ vide, elle propose : ' + vide.labels.join(' · ') + ' — ' + vide.essais.join(' | '));
  ok(vide.pied.join() === 'Nouvelle piste', '④ « Nouvelle piste » tient le pied');
  /* une phrase proposée a une réponse */
  await p.click('.modal-barre .br-essai');
  await p.waitForTimeout(200);
  ok(await visible(p, '.modal-barre .br-rang') >= 1, '④ une phrase proposée a une réponse');

  /* rien ne part pendant la frappe */
  parties.length = 0;
  await p.fill('#brQ', '');
  await p.type('#brQ', 'sopra', { delay: 40 });
  await p.waitForTimeout(1300);
  const inconnu = await p.evaluate(() => [...document.querySelectorAll('.modal-barre .br-rang .br-t b')].map(x => x.textContent.trim()));
  ok(parties.length === 0, '④ RIEN ne part vers l’annuaire pendant la frappe — ' + parties.length + ' requête');
  ok(inconnu.join(' | ') === 'Prépare la page de « sopra » | Ajouter « sopra » à mes pistes', '④ un nom qu’on n’a pas : ' + inconnu.join(' | '));
  await p.click('.modal-barre .br-rang');
  await p.waitForFunction(() => document.querySelectorAll('.modal-barre .br-rang').length >= 3, null, { timeout: 5000 }).catch(() => {});
  const trouve = await p.evaluate(() => [...document.querySelectorAll('.modal-barre .br-rang .br-t b')].map(x => x.textContent.trim()));
  const q = parties.length === 1 ? new URL(parties[0]).searchParams.get('q') : null;
  ok(parties.length === 1 && q === 'sopra', '④ « Prépare la page » pose UNE question, avec les mots tapés — q=' + q);
  ok(trouve.length === 3 && /Sopra Steria/i.test(trouve[0]) && /Ajouter « sopra »/.test(trouve[2]), '④ l’annuaire répond dans la barre — ' + trouve.join(' | '));

  /* un geste compris, joué d'Entrée, annulé */
  const avant = await piste(p, 'azt');
  await p.fill('#brQ', 'entretien aztek jeudi 14h');
  await p.waitForTimeout(200);
  const lu = await p.evaluate(() => { const r = document.querySelector('.modal-barre .br-actif');
    return r ? { titre: r.querySelector('.br-t b').textContent.trim(), ou: r.querySelector('.br-s').textContent.trim(), geste: r.querySelector('.br-geste').textContent.trim() } : null; });
  ok(lu && lu.titre === 'Entretien à 14 h' && /^Aztek · (jeudi |demain)/.test(lu.ou) && lu.geste === 'Planifier', '④ la barre dit ce qu’elle a compris — ' + JSON.stringify(lu));
  ok(sansDate(await piste(p, 'azt')) === sansDate(avant), '④ comprendre ne change rien');
  await p.keyboard.press('Enter');
  await p.waitForSelector('.undo-bar');
  const apres = await piste(p, 'azt');
  const jeudi = (() => { const d = new Date(); d.setDate(d.getDate() + (((4 - d.getDay() + 7) % 7) || 7)); return iso(d); })();
  ok(apres.nextActionText === 'Entretien à 14 h' && apres.nextAction === jeudi && apres.status === 'reply', '④ Entrée le fait : l’action, le jour, et le statut suit — ' + apres.nextAction);
  await p.waitForTimeout(500);
  ok(await visible(p, '.overlay.open:not(.ov-out) .modal-barre') === 0, '④ la barre se range');
  await p.click('.undo-bar button');
  await p.waitForTimeout(300);
  ok(sansDate(await piste(p, 'azt')) === sansDate(avant), '④ « Annuler » remet la piste EXACTEMENT comme elle était');

  /* une note */
  await p.click('#bnAdd');
  await p.waitForSelector('.modal-barre #brQ');
  await p.fill('#brQ', 'note thales : voir avec Léa');
  await p.keyboard.press('Enter');
  await p.waitForSelector('.undo-bar');
  ok((await piste(p, 'tha')).notes === 'voir avec Léa', '④ « note thales : … » s’ajoute aux notes');
  await p.click('.undo-bar button');
  await p.waitForTimeout(200);
  ok(!(await piste(p, 'tha')).notes, '④ … et s’annule');

  /* un lieu de l'app */
  await p.click('#bnAdd');
  await p.waitForSelector('.modal-barre #brQ');
  await p.fill('#brQ', 'réglages');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => /Réglages/.test((document.querySelector('#view-moi h1') || {}).textContent || ''), null, { timeout: 4000 }).catch(() => {});
  ok(await route(p) === 'moi' && /Réglages/.test(await p.textContent('#view-moi h1')), '④ « réglages » y mène');
  await p.click('.bottomnav .bn-d a[data-r="aujourdhui"]');
  await p.waitForTimeout(300);

  /* ---------- ⑤ la fiche ---------- */
  await p.click('#view-aujourdhui .aj-rang[data-id="adv"] .act-main');
  await p.waitForSelector('.modal-fiche #fiEtape');
  const fiche = await p.evaluate(() => ({ label: [...document.querySelectorAll('.modal-fiche .field>label')].map(x => x.textContent.trim()),
    etape: document.querySelector('.modal-fiche .na-cur b').textContent.trim(), pied: document.querySelector('#fiEtape').textContent.trim(),
    pleins: document.querySelectorAll('.modal-fiche .modal-f .btn-primary').length }));
  ok(fiche.label.includes('Prochaine étape') && fiche.etape === 'Relancer Claire', '⑤ la fiche dit la prochaine étape — ' + fiche.etape);
  ok(fiche.pied === 'Relancer' && fiche.pleins === 1, '⑤ le bouton rempli du pied la joue, du même mot que l’accueil — ' + fiche.pied);
  await p.click('#fiEtape');
  await p.waitForSelector('.modal-compose');
  ok(true, '⑤ … et ouvre le mail');
  await fermerFeuilles(p);

  /* « Décroché », par la barre */
  await p.click('#bnAdd');
  await p.waitForSelector('.modal-barre #brQ');
  await p.fill('#brQ', 'décroché ovh');
  await p.keyboard.press('Enter');
  await p.waitForSelector('.undo-bar');
  await fermerFeuilles(p);
  ok((await piste(p, 'ovh')).closedReason === 'won', '⑤ « décroché ovh » clôture la piste');
  if (!(await p.$('#view-aujourdhui .aj-rang.aj-ici[data-id="ovh"]'))) await p.click('#view-aujourdhui .aj-rang[data-id="ovh"] .act-main');
  const suiteLigne = await p.evaluate(() => { const r = document.querySelector('#view-aujourdhui .aj-rang[data-id="ovh"]');
    const b = document.querySelector('#ajMaint[data-id="ovh"] [data-geste]');
    return r && b ? { quoi: r.querySelector('.act-do').textContent.trim(), bouton: b.textContent.trim(),
      plusTard: !!document.querySelector('#ajMaint [data-plus-tard]') } : null; });
  ok(suiteLigne && suiteLigne.quoi === 'Demander la convention à ton école' && suiteLigne.bouton === 'Fait' && !suiteLigne.plusTard,
    '⑤ la suite entre dans la file, la fenêtre la porte (« Fait », sans « Plus tard ») — ' + JSON.stringify(suiteLigne));
  await p.click('#ajMaint [data-ouvrir]');
  await p.waitForSelector('.modal-fiche .fi-suite');
  const etapes = await p.evaluate(() => [...document.querySelectorAll('.modal-fiche .fi-suite [data-suite]')].map(b => b.dataset.suite));
  ok(etapes.join() === 'convention,signee,debut', '⑤ après « Décroché », la suite d’un stage — ' + etapes.join(' · '));
  await p.click('.modal-fiche .fi-suite [data-suite="convention"]');
  await p.waitForTimeout(300);
  const ovh = await piste(p, 'ovh');
  ok(ovh.suite && ovh.suite.t === 'stage' && ovh.suite.f.convention === AUJ, '⑤ cocher l’enregistre — ' + JSON.stringify(ovh.suite));
  const note = await p.evaluate(() => (document.querySelector('.modal-fiche .fi-suite-n') || {}).textContent || '');
  ok(/Avant le premier jour/.test(note), '⑤ la phrase qui prévient accompagne l’étape en cours — ' + note.trim());
  /* la fuite : l'état réel, les octets qui partiraient */
  const sorti = await p.evaluate(async () => {
    const { S } = await import('./ui/state.js');
    const { sharePayload } = await import('./engine/exchange.js');
    return JSON.stringify(sharePayload(S.companies, null, S.profile.name));
  });
  ok(/OVHcloud/.test(sorti) && !/suite|convention|rangeAuto|NOTE-KIABI/.test(sorti), '⑤ LA FUITE : ni la suite, ni la marque du rangement, ni une note ne sortent dans un partage');
  await fermerFeuilles(p);
  await ctx.close();
}

/* ============ AU POSTE ============ */
{
  const { ctx, p } = await ecran({ vp: { width: 1280, height: 800 } });
  const coque = await p.evaluate(() => { const h = document.querySelector('.hdr').getBoundingClientRect();
    return { l: Math.round(h.width), h: Math.round(h.height), bas: getComputedStyle(document.querySelector('.bottomnav')).display,
      liens: [...document.querySelectorAll('.topnav a')].map(a => a.textContent.trim()),
      barre: !!document.querySelector('#cmdOuvrir').getClientRects().length }; });
  ok(coque.l >= 200 && coque.l <= 280 && coque.h > 600 && coque.bas === 'none', '⑥ au poste, une barre latérale (' + coque.l + ' × ' + coque.h + '), plus de barre du bas');
  ok(coque.liens.join() === 'Aujourd’hui,Mes pistes,Réseau,Moi' && coque.barre, '⑥ elle porte la barre et les quatre lieux — ' + coque.liens.join(' · '));
  const zones = await p.evaluate(() => { const t = document.querySelector('.aj-travail').getBoundingClientRect(), c = document.querySelector('.aj-contexte').getBoundingClientRect();
    return { t: Math.round(t.width), c: Math.round(c.width), aDroite: c.left >= t.right,
      fenetre: !!document.querySelector('.aj-contexte #ajMaint .mt-f [data-geste]'), contacts: document.querySelectorAll('#ajMaint .mt-ct').length,
      /* la file en colonnes : le nom et l'étape sur un même rang */
      enLigne: (r => r ? Math.abs(r.querySelector('.act-verb').getBoundingClientRect().top - r.querySelector('.act-sub').getBoundingClientRect().top) < 8 : false)(document.querySelector('#view-aujourdhui .aj-rang')) }; });
  ok(zones.aDroite && zones.t > zones.c && zones.t <= 720 && zones.fenetre, '⑥ « Aujourd’hui » en deux zones : la file (' + zones.t + ' px), la fenêtre « Maintenant » à droite (' + zones.c + ' px)');
  ok(zones.enLigne && zones.contacts >= 1, '⑥ la file en colonnes, et la fenêtre montre les contacts de la piste : on agit sans ouvrir la fiche');
  /* la pile */
  ok(await visible(p, '#cotePile .cote-p') === 0, '⑥ rien d’ouvert : pas de pile');
  await p.click('#view-aujourdhui .aj-rang[data-id="adv"] .act-main');
  await p.waitForSelector('.modal-fiche');
  await fermerFeuilles(p);
  const pile = await p.evaluate(() => [...document.querySelectorAll('#cotePile .cote-p b')].map(x => x.textContent.trim()));
  ok(pile.join() === 'Advens', '⑥ une fiche ouverte entre dans la pile — ' + pile.join(' · '));
  await p.click('#cotePile .cote-p');
  await p.waitForSelector('.modal-fiche');
  ok((await p.getAttribute('.modal-fiche', 'aria-label')) === 'Fiche — Advens', '⑥ … et la pile la rouvre');
  await fermerFeuilles(p);
  /* la palette */
  await p.keyboard.press('Control+k');
  await p.waitForSelector('.modal-barre #brQ');
  const pal = await p.evaluate(() => { const r = document.querySelector('.modal-barre').getBoundingClientRect();
    return { l: Math.round(r.width), haut: Math.round(r.top), focus: document.activeElement.id }; });
  ok(pal.focus === 'brQ' && pal.l <= 660 && pal.haut < 200, '⑥ Ctrl K ouvre la palette : étroite (' + pal.l + ' px), posée haut (' + pal.haut + ' px)');
  await p.keyboard.type('relancer adv');
  await p.waitForTimeout(150);
  await p.keyboard.press('Enter');
  await p.waitForSelector('.modal-compose');
  ok(true, '⑥ « relancer adv », Entrée : le mail s’ouvre');
  await fermerFeuilles(p);
  await p.keyboard.press('/');
  await p.waitForSelector('.modal-barre #brQ');
  ok(true, '⑥ « / » l’ouvre aussi');
  await fermerFeuilles(p);
  await p.click('.topnav a[data-r="pistes"]');
  await p.waitForSelector('#piQ');
  await p.keyboard.press('/');
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.activeElement.id) === 'piQ' && await visible(p, '.modal-barre') === 0, '⑥ dans « Mes pistes », « / » garde la recherche de la liste');
  await ctx.close();
}

ok(!errors.length, 'zéro erreur console' + (errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''));
await browser.close();
server.close();
console.log(ko ? `\n${ko} ÉCHEC(S)` : '\nTout est vert.');
process.exit(ko ? 1 : 0);
