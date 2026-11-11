/* ============================================================
   « Je fais quoi maintenant ? » — l'écran répond-il ?

   C'est la promesse du produit (CLAUDE.md §1), et rien ne la vérifiait.
   Le trou mesuré : on reçoit le fichier d'un camarade, vingt-quatre
   pistes arrivent d'un coup — le geste phare de l'app — et « Aujourd'hui »
   affichait « Rien de planifié », zéro ligne, deux portes. Il tenait
   pourtant la réponse : vingt-quatre pistes.

   Ce fichier fige les trois états réels. Le contrôle qui compte tient en
   une ligne : quand des pistes existent, l'écran en MONTRE — la règle §6
   « un écran montre les affaires de l'utilisateur, pas des portes ».

   DEPUIS LA 9.0 (docs/principes.md), « Aujourd'hui » est UNE file : une
   piste, sa prochaine étape, un bouton nommé. Les tranches « Par où
   commencer » et « Sans nouvelles » n'existent plus, mais ce qu'elles
   garantissaient tient toujours, et c'est ce que ce fichier garde :
   trois lignes proposées au plus, ce qui est engagé avant ce qui est
   proposé, une capacité absente est absente, le silence a une sortie,
   et le lien du pied mène à ce qu'il compte.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, attendre, SHOTS } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

/* huit pistes reçues, aucune planifiée — dont une SANS adresse e-mail
   (une capacité absente doit être absente, pas grisée) */
const RECUES = Array.from({ length: 8 }, (_, i) => ({
  id: 'r' + i,
  name: ['Adrastia Systèmes', 'Ostral Cyberdéfense', 'Groupe Ravenel', 'Halcyon Data',
         'Lombard Négoce', 'Vergne Assurances', 'Atelier sans mail', 'Novaquitaine Réseaux'][i],
  status: 'todo', city: 'Toulouse', domain: 'esn',
  desc: 'Description de démonstration.', website: 'exemple' + i + '.test',
  contacts: i === 6 ? [{ id: 'x' + i, name: 'Sans adresse', role: 'RH', phone: '06 39 98 00 01' }]
                    : Array.from({ length: (i % 3) + 1 }, (_, k) => ({
                        id: 'c' + i + k, name: 'Personne ' + k, role: 'RH',
                        email: `p${k}@exemple${i}.test`, phone: '06 39 98 00 0' + k })),
  updatedAt: 100 - i
}));

async function ecran(largeur, seed){
  const ctx = await browser.newContext({ viewport: { width: largeur, height: largeur > 900 ? 800 : 844 },
    hasTouch: largeur < 901 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/aujourdhui', { waitUntil: 'load' });
  await p.evaluate(async d => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
  }, seed);
  await p.reload({ waitUntil: 'load' });
  await attendre(p, async d => (await import('./ui/state.js')).S.companies.length === d,
    { message: 'les pistes chargées' }).catch(() => {});
  await p.waitForFunction(n => document.querySelectorAll('#view-aujourdhui .page-inner').length === 1);
  await p.waitForTimeout(400);
  return { ctx, p };
}
const ENGAGE = ['retard', 'jour', 'contrat'];
const lire = p => p.evaluate(() => {
  const v = document.querySelector('#view-aujourdhui');
  const cible = n => (n.textContent || n.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
  const rangs = [...v.querySelectorAll('.aj-rang')];
  const icone = n => n ? (n.style.maskImage || n.style.webkitMaskImage || '').replace(/^.*icons\/|\.svg.*$/g, '') : '';
  return {
    lignes: v.querySelectorAll('.act-row').length,
    /* les pistes jamais contactées que l'app propose de démarrer */
    demarrage: v.querySelectorAll('.aj-rang[data-genre="demarrer"]').length,
    genres: rangs.map(r => r.dataset.genre),
    ids: rangs.map(r => r.dataset.id),
    /* LE geste de chaque ligne : un bouton, un mot — c'est lui qui fait
       avancer la recherche, pas « ouvrir » */
    gestes: rangs.map(r => [...r.querySelectorAll('[data-geste]')].map(b => b.textContent.trim())),
    remplis: v.querySelectorAll('.aj-rang .btn-primary').length,
    premierRempli: !!(rangs[0] && rangs[0].querySelector('.btn-primary')),
    /* ce qu'une ligne datée offre au glissé : « Fait » et « Reporter » */
    glisser: rangs.map(r => ({ genre: r.dataset.genre, fait: !!r.querySelector('.act-under-done'),
      reporter: !!r.querySelector('.act-under-report'), icone: icone(r.querySelector('.act-under-report .ic')) })),
    cibles: [...v.querySelectorAll('button, a[href], [role="button"]')]
      .filter(n => n.getClientRects().length).map(cible).filter(Boolean),
    largeur: rangs[0] ? Math.round(rangs[0].getBoundingClientRect().width) : 0,
    zones: [...v.querySelectorAll('.aj-cols > *')].filter(n => n.getClientRects().length).map(n => n.className.split(' ')[0]),
    bientot: [...v.querySelectorAll('.tr-soon .aj-tard')].map(r => ({ id: r.dataset.id,
      t: (r.querySelector('.act-do') || {}).textContent || '' })),
    rangees: [...v.querySelectorAll('.aj-range')].map(r => ({ id: r.dataset.id, annuler: !!r.querySelector('[data-annuler]') })),
    texte: v.innerText.replace(/\s+/g, ' ').trim()
  };
});
const plat = g => g.flat();

/* ---------- A · app neuve : la promesse, la cible, et un seul geste ---------- */
{
  const { ctx, p } = await ecran(390, []);
  const a = await lire(p);
  if (a.lignes) fail('app neuve : des lignes de piste alors qu’il n’y en a aucune');
  /* depuis la 7.1.0 (R5), « J'ai déjà OpenContact » : sur un téléphone
     neuf, c'est ici qu'on ramène tout avec sa phrase de secours. Depuis
     la 9.0, la CIBLE ouvre l'écran (« Tu cherches » : trois puces) :
     l'app accompagne du début, et le début est de dire ce qu'on cherche. */
  const attendu = ['Stage', 'Alternance', 'Emploi', 'Ajouter une piste', 'Voir un exemple', 'J’ai déjà OpenContact'];
  if (a.cibles.join(' · ') !== attendu.join(' · '))
    fail(`app neuve : ${a.cibles.join(' · ')} au lieu de ${attendu.join(' · ')}`);
  /* la promesse, puis le geste qui la MONTRE — « Voir un exemple » ;
     « Ajouter ma première piste » est devenu « Ajouter une piste », le
     même mot que partout ailleurs (30 septembre 2026) */
  if (!/un jour à la fois/i.test(a.texte) || !/Voir un exemple/.test(a.texte))
    fail('app neuve : l’état vide n’enseigne plus le produit');
  else console.log(`app neuve : la promesse + ${a.cibles.length} gestes (${a.cibles.join(' · ')}) ✓`);
  /* la cible dite, le premier geste change : l'app sait quoi proposer */
  await p.click('.aj-cible-vide [data-cherche="alternance"]');
  await p.waitForSelector('#tdeTrouver');
  const b = await lire(p);
  if (b.cibles[1] !== 'Trouver des entreprises' || await p.$$eval('#view-aujourdhui .btn-primary', n => n.length) !== 1)
    fail('la cible dite, « Trouver des entreprises » doit devenir LE geste : ' + b.cibles.join(' · '));
  else console.log('   la cible dite : « Trouver des entreprises » devient le seul bouton rempli ✓');
  await ctx.close();
}

/* ---------- B · le cas qui manquait : des pistes, rien de planifié ---------- */
{
  const { ctx, p } = await ecran(390, RECUES);
  const b = await lire(p);
  /* LE contrôle. Une seule ligne, et c'est tout le défaut. */
  if (!b.demarrage)
    fail('des pistes en réserve et l’écran n’en montre AUCUNE — il est redevenu un menu');
  if (b.demarrage > 3)
    fail(`${b.demarrage} pistes proposées : au-delà de trois, ce n’est plus un choix, c’est la liste`);
  /* chaque ligne porte UN geste nommé, qui fait avancer */
  if (b.gestes.some(g => g.length !== 1))
    fail('une ligne, un geste : ' + JSON.stringify(b.gestes));
  if (!plat(b.gestes).includes('Écrire'))
    fail('aucune ligne ne propose d’écrire alors que des pistes ont une adresse');
  /* une seule emphase : le premier bouton est le seul rempli */
  if (b.remplis !== 1 || !b.premierRempli)
    fail(`un seul bouton rempli, celui de la première ligne — ${b.remplis} rempli(s)`);
  /* une ligne sans action ne peut être ni « faite » ni « reportée » */
  const faux = plat(b.gestes).filter(g => g === 'Fait' || g === 'Reporter');
  if (faux.length || b.glisser.some(g => g.fait || g.reporter))
    fail('une piste non planifiée propose « Fait » ou « Reporter » — il n’y a rien à finir ni à repousser');
  /* et il reste un chemin vers TOUTES les autres */
  if (!b.cibles.some(t => /^8 pistes à contacter/.test(t)))
    fail('pas de chemin vers les pistes non montrées : ' + JSON.stringify(b.cibles.filter(t => /piste/.test(t))));
  console.log(`rien de planifié : ${b.demarrage} pistes montrées, gestes ${[...new Set(plat(b.gestes))].join('+')}, `
    + 'un seul rempli, et la route vers les autres ✓');

  /* au pouce, toute cible reste tapable */
  const petites = await p.evaluate(() => [...document.querySelectorAll('.aj-rang [data-geste], .aj-rang .act-main')]
    .map(n => ({ t: n.textContent.trim().slice(0, 12), h: Math.round(n.getBoundingClientRect().height),
                 w: Math.round(n.getBoundingClientRect().width) }))
    .filter(x => x.h < 44 || x.w < 44));
  if (petites.length) fail('cibles sous 44 px : ' + JSON.stringify(petites));
  else console.log('   toutes les cibles de la file ≥ 44 px ✓');
  await p.screenshot({ path: SHOTS + '/90-commencer-pouce.png' });
  await ctx.close();
}

/* ---------- B bis · aucune piste n'a d'adresse ----------
   La piste sans adresse ne monte jamais dans les trois quand d'autres
   sont joignables — c'est le tri qui le veut, et c'est bien. Résultat :
   le contrôle « pas d'adresse, pas de bouton Écrire » ne s'exécutait
   jamais. Il lui faut son propre état, où PERSONNE n'a d'adresse — mais
   où chacun a un numéro : le geste devient « Appeler » (9.0). */
{
  const muettes = RECUES.slice(0, 4).map(c => ({ ...c,
    contacts: [{ id: 'z' + c.id, name: 'Sans adresse', role: 'RH', phone: '06 39 98 00 09' }] }));
  const { ctx, p } = await ecran(390, muettes);
  const m = await lire(p);
  if (!m.demarrage) fail('aucune piste joignable par mail : l’écran ne montre plus rien');
  if (plat(m.gestes).includes('Écrire'))
    fail('aucune piste n’a d’adresse et « Écrire » est pourtant proposé — une capacité absente doit être ABSENTE');
  if (!plat(m.gestes).every(g => g === 'Appeler'))
    fail('un numéro et pas d’adresse : le geste est « Appeler » — ' + JSON.stringify(m.gestes));
  else console.log(`aucune adresse : ${m.demarrage} pistes montrées, seul « Appeler » ✓`);

  /* ni adresse ni numéro : il reste à trouver quelqu'un */
  const nues = RECUES.slice(0, 2).map(c => ({ ...c, contacts: [] }));
  const { ctx: c2, p: p2 } = await ecran(390, nues);
  const n = await lire(p2);
  if (!plat(n.gestes).length || !plat(n.gestes).every(g => g === 'Trouver'))
    fail('personne à joindre : le geste est « Trouver » — ' + JSON.stringify(n.gestes));
  else console.log('   personne à joindre : « Trouver » ✓');
  await c2.close();
  await ctx.close();
}

/* ---------- B au poste : deux zones, et le travail reste une colonne lisible ---------- */
{
  const { ctx, p } = await ecran(1280, RECUES);
  const w = await lire(p);
  if (!w.demarrage) fail('au poste, rien de planifié n’affiche aucune piste');
  if (w.largeur > 720)
    fail(`une ligne étirée sur ${w.largeur} px — le bouton part à l’autre bout de son nom`);
  else if (w.zones.join('+') !== 'aj-travail+aj-contexte')
    fail('au poste, « Aujourd’hui » tient deux zones, le travail et le contexte : ' + w.zones.join('+'));
  else console.log(`au poste : ${w.demarrage} pistes montrées, en colonne lisible (${w.largeur} px), le contexte à droite ✓`);
  await p.screenshot({ path: SHOTS + '/91-commencer-poste.png' });
  await ctx.close();
}

/* ---------- B ter · une piste déjà écrite n'est pas à recommencer ----------
   Joué le 30 septembre 2026 : on écrit à Aztek, on ferme « Envoyé ✓ — et
   ensuite ? » sans rien prévoir, et Aztek revient ici avec l'icône mail,
   comme si on ne lui avait jamais écrit. Les deux pistes les mieux
   classées de la graine passent donc « En cours » sans prochaine action :
   elles sortent de ce qui est à démarrer. Depuis la 9.0 elles ne sont
   plus « sans suite » : l'app leur tient un plan — « Relancer si pas de
   réponse », dans « Bientôt » — et le pied ne compte que ce qui reste à
   contacter. */
{
  /* écrites AUJOURD'HUI : une trace du jour, sinon elles passeraient pour
     silencieuses depuis des années — ce ne serait plus le cas joué */
  const jour = new Date().toISOString().slice(0, 10);
  const ecrites = RECUES.map((c, i) => i < 2
    ? { ...c, status: 'active', history: [{ d: jour, t: 'Email envoyé — Personne 0' }] } : c);
  const { ctx, p } = await ecran(390, ecrites);
  await p.evaluate(() => { document.querySelectorAll('#view-aujourdhui details').forEach(d => { d.open = true; }); });
  const e = await lire(p);
  const montrees = await p.evaluate(() =>
    [...document.querySelectorAll('#view-aujourdhui .aj-rang[data-genre="demarrer"] .act-verb')].map(n => n.textContent.trim()));
  const pied = await p.evaluate(() => (document.querySelector('#tdNoAct') || {}).textContent || '');
  if (!montrees.length) fail('plus aucune piste à démarrer alors que six n’ont jamais été contactées');
  else if (montrees.some(n => n === ecrites[0].name || n === ecrites[1].name))
    fail('une piste déjà écrite revient parmi celles à démarrer : ' + JSON.stringify(montrees));
  else if (e.bientot.length !== 2 || !e.bientot.every(b => b.t === 'Relancer si pas de réponse'))
    fail('les deux pistes écrites doivent attendre dans « Bientôt », avec leur plan : ' + JSON.stringify(e.bientot));
  else if (!/^6 pistes à contacter/.test(pied.trim()))
    fail('le lien du pied compte ce qui reste à contacter, et rien d’autre : ' + JSON.stringify(pied));
  else console.log(`déjà écrites : hors de la file (${montrees.join(', ')}), leur plan dans « Bientôt », six restent à contacter ✓`);

  /* ET CE CHEMIN MÈNE À CE QU'IL NOMME. Il ouvrait « Mes pistes » entière.
     On pose donc un filtre d'« Affiner » qui écarterait ce qu'il compte
     (le statut « En cours » : il ne laisse que les deux pistes écrites),
     puis on suit le lien — il doit arriver sur l'étiquette « À contacter »,
     avec les six et rien d'autre. */
  await p.evaluate(() => { location.hash = '#/pistes'; });
  await p.waitForSelector('#view-pistes:not([hidden]) #piAffiner');
  await p.click('#piAffiner');
  await p.waitForSelector('.overlay:not(.ov-out) [data-st="active"]');
  await p.click('.overlay:not(.ov-out) [data-st="active"]');
  await p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out)')].pop().querySelector('.modal-h button.x').click());
  await p.waitForTimeout(400);
  const filtrees = await p.evaluate(() => [...document.querySelectorAll('#view-pistes .row-item')].filter(n => n.getClientRects().length).length);
  if (filtrees !== 2) fail(`le filtre « En cours » devait laisser 2 pistes, il en laisse ${filtrees} — le contrôle ne mesurerait rien`);
  const suivre = async () => {
    await p.evaluate(() => { location.hash = '#/aujourdhui'; });
    await p.waitForSelector('#tdNoAct');
    await p.click('#tdNoAct');
    await p.waitForSelector('#view-pistes:not([hidden])');
    await p.waitForTimeout(400);
    return p.evaluate(() => ({
      route: location.hash,
      etiquettes: [...document.querySelectorAll('#view-pistes .et-chip')]
        .map(n => n.textContent.replace(/\s+/g, ' ').trim()),
      barre: document.querySelector('#piQ')?.value || '',
      lignes: [...document.querySelectorAll('#view-pistes .row-item')].filter(n => n.getClientRects().length).length,
      haut: document.querySelector('#view-pistes').scrollTop
    }));
  };
  const arrivee = await suivre();
  if (!/pistes/.test(arrivee.route)) fail('le lien du pied ne mène pas à « Mes pistes » : ' + arrivee.route);
  else if (arrivee.etiquettes.join('|') !== 'À contacter')
    fail('le lien du pied ouvre « Mes pistes » sans dire ce qu’on y regarde : ' + JSON.stringify(arrivee));
  else if (arrivee.lignes !== 6)
    fail(`« 6 pistes à contacter » mène à ${arrivee.lignes} lignes — le lien doit montrer ce qu'il compte`);
  else console.log('« 6 pistes à contacter → » : « Mes pistes » sur « À contacter », les six, le filtre tombé ✓');

  /* et il arrive EN HAUT. Une liste qui défile VRAIMENT, sinon « en haut »
     ne prouve rien : la première version gardait 844 px de haut, six
     lignes y tenaient, et la mutation qui garde la place restait verte */
  await p.setViewportSize({ width: 390, height: 480 });
  await p.fill('#piQ', '');
  await p.waitForTimeout(300);
  const descendu = await p.evaluate(() => {
    const v = document.querySelector('#view-pistes'); v.scrollTop = 9999; return v.scrollTop; });
  if (descendu < 60) fail(`la liste ne défile que de ${descendu} px — l'arrivée « en haut » ne mesurerait rien`);
  const retour = await suivre();
  if (retour.haut > 2)
    fail(`l'arrivée garde la place d'une autre liste (${retour.haut} px) — elle part du haut`);
  else console.log('   et l’arrivée part du haut, même quand la liste était descendue ✓');
  await ctx.close();
}

/* ---------- B quater · tout ce qu'il compterait est déjà à l'écran ----------
   Joué le 13 octobre 2026, première piste ajoutée : « Advens » dans la
   file, et au pied « 1 piste sans prochaine action → » — la même piste,
   redite. Un lien qui n'ajoute rien n'est pas un chemin. */
{
  const { ctx, p } = await ecran(390, RECUES.slice(0, 2));
  const c = await lire(p);
  if (c.demarrage !== 2) fail('deux pistes neuves : la file doit les montrer toutes les deux');
  else if (c.cibles.some(t => /contacter →|planifier →|prochaine action/.test(t)))
    fail('les deux pistes sont à l’écran et le pied les redit : ' + JSON.stringify(c.cibles.filter(t => /→/.test(t))));
  else console.log('deux pistes, toutes deux montrées : aucun lien au pied pour les redire ✓');
  await ctx.close();
}

/* ---------- C · ce qui est engagé passe avant ce qui est proposé ---------- */
{
  const jour = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const planifiees = RECUES.map((c, i) => i < 3
    ? { ...c, nextAction: jour(i - 1), nextActionText: 'Relancer', status: 'contacted' } : c);
  const { ctx, p } = await ecran(390, planifiees);
  const c = await lire(p);
  const dernierEngage = Math.max(...c.genres.map((g, i) => ENGAGE.includes(g) ? i : -1));
  const premierPropose = c.genres.findIndex(g => !ENGAGE.includes(g));
  if (!c.lignes) fail('les actions planifiées ne s’affichent plus');
  else if (c.genres.filter(g => ENGAGE.includes(g)).length !== 2)
    fail('deux actions sont dues (hier, aujourd’hui) : ' + JSON.stringify(c.genres));
  else if (premierPropose !== -1 && premierPropose < dernierEngage)
    fail('une proposition passe DEVANT le travail engagé : ' + JSON.stringify(c.genres));
  else if (c.genres.length > 3)
    fail(`${c.genres.length} lignes : ce que l'app propose complète jusqu'à trois, pas au-delà`);
  else if (plat(c.gestes).slice(0, 2).join('+') !== 'Relancer+Relancer')
    fail('une action « Relancer » prévue se joue de son nom : ' + JSON.stringify(c.gestes));
  else if (!c.glisser.filter(g => ENGAGE.includes(g.genre)).every(g => g.fait && g.reporter))
    fail('les lignes planifiées ont perdu « Fait » / « Reporter » au glissé');
  else if (c.glisser[0].icone !== 'calendar')
    fail(`« Reporter » doit porter le calendrier de « Planifier » — même question, même dessin : ${c.glisser[0].icone}`);
  else console.log(`travail planifié : ${c.genres.join(' · ')} — l'engagé d'abord, « Fait » et « Reporter » au glissé ✓`);
  await ctx.close();

  /* et au poste, ce qui vient plus tard se lit à droite, ouvert */
  const { ctx: c2, p: p2 } = await ecran(1280, planifiees);
  const d = await lire(p2);
  const ouvert = await p2.evaluate(() => !!document.querySelector('#view-aujourdhui .aj-contexte section.tr-soon'));
  if (d.zones.join('+') !== 'aj-travail+aj-contexte' || !ouvert || d.bientot.length !== 1)
    fail('au poste, « Bientôt » se lit dans le contexte, ouvert : ' + JSON.stringify({ zones: d.zones, ouvert, bientot: d.bientot }));
  else console.log('   au poste, « Bientôt » est ouvert dans le contexte, à droite du travail ✓');
  await c2.close();
}

/* ---------- D · les pistes SANS NOUVELLES ----------
   Le trou suivant, et c'est là que la plupart des recherches s'arrêtent :
   une piste contactée, sans réponse, à qui on n'a pas donné de suite.
   Mesuré avant : 0 ligne sur « Aujourd'hui », et dans « Mes pistes » le
   même « à planifier » qu'elle dorme depuis 5 jours ou depuis 90.
   Depuis la 9.0 : avant sept jours l'app tient le plan (« Relancer si
   pas de réponse ») ; ensuite elle propose de relancer ; passé 45 jours
   elle range la piste elle-même, le dit, et « Annuler » la rend. */
const jourISO = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const MUETTES = [
  /* du travail prévu : la suggestion doit passer APRÈS lui */
  { id: 'plan', name: 'Adrastia Systèmes', status: 'active', city: 'Toulouse', domain: 'esn',
    nextAction: jourISO(0), nextActionText: 'Relancer Nadia',
    contacts: [{ id: 'k0', name: 'N', role: 'RH', email: 'n@a.test' }], updatedAt: Date.now() },
  /* engagées puis lâchées, à 5 / 21 / 90 jours */
  ...[['fraiche', 5, 'active'], ['mure', 21, 'active'], ['perdue', 90, 'reply']].map(([id, d, st]) => ({
    id, name: { fraiche: 'Vireo', mure: 'Lombard Négoce', perdue: 'Atos' }[id],
    status: st, city: 'Toulouse', domain: 'esn',
    contacts: [{ id: 'k' + id, name: 'P', role: 'RH', email: id + '@x.test' }],
    history: [{ d: jourISO(-d), t: 'Statut → En cours' }], updatedAt: Date.now() - d * 86400000 })),
  /* jamais engagée : elle est à démarrer, pas « sans nouvelles » */
  { id: 'jamais', name: 'Halcyon Data', status: 'todo', city: 'Toulouse', domain: 'esn',
    contacts: [{ id: 'kj', name: 'P', role: 'RH', email: 'j@x.test' }],
    history: [{ d: jourISO(-60), t: 'Piste créée' }], updatedAt: Date.now() - 60 * 86400000 }
];
{
  const { ctx, p } = await ecran(390, MUETTES);
  await p.evaluate(() => { document.querySelectorAll('#view-aujourdhui details').forEach(d => { d.open = true; }); });
  const q = await lire(p);
  const marque = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#view-aujourdhui .aj-rang')]
    .map(r => [r.dataset.id, (r.querySelector('.mark') || {}).textContent || ''])));
  const rang = id => q.ids.indexOf(id);
  const geste = id => (q.gestes[rang(id)] || [])[0] || '';
  if (rang('mure') < 0 || q.genres[rang('mure')] !== 'silence')
    fail('une piste se tait depuis 21 jours et l’écran n’en dit rien : ' + JSON.stringify(q.ids));
  if (rang('fraiche') >= 0)
    fail('une piste silencieuse depuis 5 jours est signalée — trop tôt, c’est du harcèlement');
  if (!q.bientot.some(b => b.id === 'fraiche' && b.t === 'Relancer si pas de réponse'))
    fail('à 5 jours, l’app tient le plan : « Relancer si pas de réponse », dans « Bientôt » — ' + JSON.stringify(q.bientot));
  if (rang('jamais') >= 0 && q.genres[rang('jamais')] === 'silence')
    fail('une piste JAMAIS contactée est comptée comme « sans nouvelles »');
  if (rang('plan') !== 0) fail('la suggestion est passée DEVANT le travail engagé : ' + JSON.stringify(q.ids));
  if (rang('jamais') >= 0 && rang('jamais') < rang('mure'))
    fail('ranimer une piste engagée vaut mieux qu’en démarrer une froide : le silence passe avant — ' + JSON.stringify(q.ids));
  /* la sortie : passé le dernier seuil, ce n'est plus « relance encore ».
     Sans ça la pile grandit sans fin — le défaut qui fait abandonner les
     outils de suivi. La 9.0 ne demande plus de décider : elle range, le
     dit, et rend la piste d'un tap. */
  const etat = await p.evaluate(async () => {
    const c = (await import('./ui/state.js')).S.companies.find(x => x.id === 'perdue');
    return c ? { clos: c.closedReason, auto: !!c.rangeAuto, contacts: (c.contacts || []).length } : null;
  });
  if (rang('perdue') >= 0)
    fail('90 jours de silence et l’app propose encore un geste — aucune sortie, la pile enfle');
  if (!etat || etat.clos !== 'dropped' || !etat.auto || etat.contacts !== 1)
    fail('90 jours : la piste se range seule, entière, jamais supprimée — ' + JSON.stringify(etat));
  if (!q.rangees.some(r => r.id === 'perdue' && r.annuler))
    fail('ce que l’app fait seule, elle le dit : l’annonce et son « Annuler » manquent — ' + JSON.stringify(q.rangees));
  if (geste('mure') !== 'Relancer')
    fail('21 jours de silence : c’est le moment de relancer — « ' + geste('mure') + ' »');
  console.log(`sans nouvelles : ${(marque.mure || '').trim()} → relancer, après le travail ; 5 jours → le plan dans « Bientôt » ; `
    + '90 jours → rangée, annoncée, « Annuler » ✓');

  /* « Mes pistes » : la durée du silence, là où on scanne */
  await p.evaluate(() => { location.hash = '#/pistes'; });
  await p.waitForTimeout(600);
  const li = await p.evaluate(() => {
    const t = {};
    document.querySelectorAll('#view-pistes .row-item').forEach(n => {
      t[n.dataset.id] = { txt: n.innerText.replace(/\s+/g, ' '),
                          mark: (n.querySelector('.mark') || {}).textContent || '' };
    });
    return t;
  });
  if (!/sans nouvelles/.test(li.mure?.txt || '') || !/21 j/.test(li.mure?.mark || ''))
    fail('« Mes pistes » ne dit pas depuis combien de temps une piste se tait : ' + JSON.stringify(li.mure));
  if (/sans nouvelles/.test(li.fraiche?.txt || ''))
    fail('une piste de 5 jours est marquée « sans nouvelles » dans la liste');
  if (li.jamais?.mark) fail('une piste jamais engagée porte une marque de silence');
  console.log(`« Mes pistes » : ${(li.mure?.mark || '').trim()} sur la muette, `
    + 'rien sur la fraîche ni sur celle jamais engagée ✓');
  await p.screenshot({ path: SHOTS + '/92-sans-nouvelles.png' });
  await ctx.close();
}

/* ---------- D bis · rien de prévu ET des pistes qui se taisent ----------
   « Tout est à jour » serait un mensonge : des pistes se taisent depuis
   trois semaines. La file les montre à la place du vide. */
{
  const sansPlan = MUETTES.filter(c => c.id !== 'plan');
  const { ctx, p } = await ecran(390, sansPlan);
  const r = await lire(p);
  if (/Tout est à jour/.test(r.texte)) fail('« Tout est à jour » alors que des pistes se taisent');
  if (!r.genres.includes('silence')) fail('rien de prévu, des pistes muettes, et l’écran ne montre rien');
  else console.log(`rien de prévu : ${r.genres.join(' · ')} à la place du vide, `
    + 'et plus de « Tout est à jour » mensonger ✓');
  await ctx.close();
}

/* ---------- D ter · plus de trois pistes se taisent ----------
   Trois d'abord — un choix, pas la liste. Mais les suivantes n'avaient
   plus d'autre chemin que le lien du pied, qui ouvrait « Mes pistes »
   entière : elles se tapent maintenant comme dans toute tranche. */
{
  const cinq = [10, 15, 21, 30, 40].map((d, i) => ({
    id: 'q' + i, name: ['Vireo', 'Lombard Négoce', 'Atos', 'Halcyon Data', 'Ostral'][i],
    status: 'active', city: 'Toulouse', domain: 'esn',
    contacts: [{ id: 'kq' + i, name: 'P', role: 'RH', email: 'q' + i + '@x.test' }],
    history: [{ d: jourISO(-d), t: 'Statut → En cours' }], updatedAt: Date.now() - d * 86400000 }));
  const { ctx, p } = await ecran(390, cinq);
  const avant = await p.evaluate(() => ({
    lignes: document.querySelectorAll('#view-aujourdhui .aj-rang[data-genre="silence"]').length,
    plus: (document.querySelector('#view-aujourdhui .tr-faire .tr-more') || {}).textContent || '',
    pied: (document.querySelector('#tdNoAct') || {}).textContent || ''
  }));
  if (avant.lignes !== 3) fail(`cinq pistes muettes : ${avant.lignes} lignes au lieu de trois`);
  if (avant.plus.trim() !== 'Voir les 2 autres')
    fail('les deux autres pistes muettes n’ont aucun chemin : « ' + avant.plus + ' »');
  if (avant.pied) fail('le pied compte des pistes muettes, qui sont dans la file : « ' + avant.pied + ' »');
  if (avant.plus) await p.click('#view-aujourdhui .tr-faire .tr-more');
  await p.waitForTimeout(300);
  const apres = await p.evaluate(() => document.querySelectorAll('#view-aujourdhui .aj-rang[data-genre="silence"]').length);
  if (apres !== 5) fail(`« Voir les 2 autres » ne montre pas les cinq : ${apres}`);
  else if (avant.lignes === 3 && !avant.pied)
    console.log('cinq pistes muettes : trois, puis « Voir les 2 autres » les montre toutes ; le pied ne les compte pas ✓');
  await ctx.close();
}

/* ---------- L'ENCRE VA À L'ENTREPRISE ----------
   Mesuré sur huit lignes d'action : le verbe portait l'encre (14 px,
   gras, en tête) pour UNE seule valeur distincte, pendant que
   l'entreprise — seule chose qui varie toujours — tenait 11 px de gris
   en seconde position. Et sur le MÊME écran, « Par où commencer » et
   « Sans nouvelles » mettaient déjà le nom en tête : la même place
   portait tantôt une action, tantôt une entreprise. La file de la 9.0
   n'a plus qu'une forme de ligne ; le contrôle la tient dans ses trois
   états.
   Deux contrôles, et le second est celui qui compte : ① sur une ligne,
   le plus gros texte est le nom de la piste ; ② deux lignes voisines
   n'ont jamais le même texte en tête — c'est la définition d'un attribut
   distinctif, et c'est ce qui aurait échoué AVANT. */
{
  const PLANIFIEES = ['Adrastia Systèmes', 'Ostral Cyberdéfense', 'Groupe Ravenel', 'Halcyon Data']
    .map((name, i) => ({
      id: 'pl' + i, name, city: 'Toulouse', status: 'active',
      /* le même verbe partout : c'est le cas réel, une journée de relances */
      nextActionText: 'Relancer le service RH',
      nextAction: new Date(Date.now() + (i - 2) * 864e5).toISOString().slice(0, 10),
      contacts: [{ id: 'c' + i, name: 'Léa', email: 'l' + i + '@x.test' }],
      createdAt: Date.now(), updatedAt: Date.now()
    }));
  for (const largeur of [390, 1280]){
    const { ctx, p } = await ecran(largeur, PLANIFIEES);
    await encre(p, `planifiées ${largeur}px`, 4);
    await ctx.close();
  }
  /* Les DEUX autres formes de ligne — « Par où commencer » et « Sans
     nouvelles » — mettaient déjà le nom en tête, et c'est justement
     l'argument du lot. Un contrôle qui ne les regarde pas laisse
     partir la moitié de la cohérence : une mutation posée sur
     « Par où commencer » est passée sans le faire broncher. */
  {
    const { ctx, p } = await ecran(390, RECUES);
    await encre(p, 'par où commencer', 3);
    await ctx.close();
  }
  {
    const muettes = RECUES.slice(0, 4).map(c => ({ ...c, status: 'active',
      /* 30 jours, pas 90 : passé 45, la piste se range seule (9.0) et
         il n'y aurait plus une ligne à mesurer */
      history: [{ t: 'Email envoyé', d: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10) }] }));
    const { ctx, p } = await ecran(390, muettes);
    await encre(p, 'sans nouvelles', 2);
    await ctx.close();
  }
}
async function encre(p, etiquette, minimum){
  {
    /* « Bientôt » est replié au pouce : on l'ouvre, sinon la moitié des
       lignes n'est pas mesurée et le contrôle se félicite trop vite */
    await p.evaluate(() => { document.querySelectorAll('#view-aujourdhui details').forEach(d => { d.open = true; }); });
    await p.waitForTimeout(250);
    const r = await p.evaluate(() => {
      /* seulement ce qui est VISIBLE. Une tranche repliée garde ses
         lignes dans le DOM, avec une police calculable ET des boîtes
         non nulles — `getClientRects()` ne suffit donc pas à les
         écarter, et le contrôle se félicitait de mesurer ce que
         personne ne voit. Le repli se lit sur le `<details>`. */
      const vues = [...document.querySelectorAll('#view-aujourdhui .act-row')]
        .filter(r => r.getBoundingClientRect().height > 0 && !r.closest('details:not([open])'));
      const lignes = vues.map(row => {
        const t = row.querySelector('.act-verb');
        const s = row.querySelector('.act-sub');
        const px = e => e ? parseFloat(getComputedStyle(e).fontSize) : 0;
        return { tete: (t.textContent || '').trim(), tetePx: px(t),
                 sousPx: px(s && s.querySelector('.act-do, .act-who')) };
      });
      const noms = vues.map(r =>
        (r.querySelector('.act-main').getAttribute('aria-label') || '').replace(/^Ouvrir\s+/, ''));
      return { lignes, noms };
    });
    if (r.lignes.length < minimum){
      fail(`encre (${etiquette}) : ${r.lignes.length} ligne(s) mesurée(s) pour ${minimum} attendues — ` +
           `l’instrument ne voit pas l’écran`);
      return;
    }
    const pasLeNom = r.lignes.filter((l, i) => l.tete !== r.noms[i]);
    const petit = r.lignes.filter(l => l.tetePx <= l.sousPx);
    const tetes = r.lignes.map(l => l.tete);
    const jumelles = tetes.filter((t, i) => i && t === tetes[i - 1]);
    if (pasLeNom.length)
      fail(`encre (${etiquette}) : ${pasLeNom.length} ligne(s) ne mettent pas la piste en tête — ` +
           `« ${pasLeNom[0].tete} » au lieu de « ${r.noms[r.lignes.indexOf(pasLeNom[0])]} »`);
    else if (petit.length)
      fail(`encre (${etiquette}) : la tête de ligne (${petit[0].tetePx}px) ne domine pas sa sous-ligne (${petit[0].sousPx}px)`);
    else if (jumelles.length)
      fail(`encre (${etiquette}) : deux lignes voisines portent la même tête « ${jumelles[0]} » — ` +
           `l’attribut distinctif n’est pas celui qui est mis en avant`);
    else console.log(`encre (${etiquette}) : ${r.lignes.length} lignes, la piste en tête, aucune tête répétée ✓`);
  }
}

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E commencer : ÉCHEC' : 'E2E commencer : OK');
